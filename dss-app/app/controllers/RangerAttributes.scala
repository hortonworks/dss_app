/*
 *   HORTONWORKS DATAPLANE SERVICE AND ITS CONSTITUENT SERVICES
 *
 *   (c) 2016-2018 Hortonworks, Inc. All rights reserved.
 *
 *   This code is provided to you pursuant to your written agreement with Hortonworks, which may be the terms of the
 *   Affero General Public License version 3 (AGPLv3), or pursuant to a written agreement with a third party authorized
 *   to distribute this code.  If you do not have a written agreement with Hortonworks or with an authorized and
 *   properly licensed third party, you do not have any rights to this code.
 *
 *   If this code is provided to you under the terms of the AGPLv3:
 *   (A) HORTONWORKS PROVIDES THIS CODE TO YOU WITHOUT WARRANTIES OF ANY KIND;
 *   (B) HORTONWORKS DISCLAIMS ANY AND ALL EXPRESS AND IMPLIED WARRANTIES WITH RESPECT TO THIS CODE, INCLUDING BUT NOT
 *     LIMITED TO IMPLIED WARRANTIES OF TITLE, NON-INFRINGEMENT, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE;
 *   (C) HORTONWORKS IS NOT LIABLE TO YOU, AND WILL NOT DEFEND, INDEMNIFY, OR HOLD YOU HARMLESS FOR ANY CLAIMS ARISING
 *     FROM OR RELATED TO THE CODE; AND
 *   (D) WITH RESPECT TO YOUR EXERCISE OF ANY RIGHTS GRANTED TO YOU FOR THE CODE, HORTONWORKS IS NOT LIABLE FOR ANY
 *     DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE OR CONSEQUENTIAL DAMAGES INCLUDING, BUT NOT LIMITED TO,
 *     DAMAGES RELATED TO LOST REVENUE, LOST PROFITS, LOSS OF INCOME, LOSS OF BUSINESS ADVANTAGE OR UNAVAILABILITY,
 *     OR LOSS OR CORRUPTION OF DATA.
 */

package controllers

import javax.inject.Inject

import com.google.inject.name.Named
import com.hortonworks.dataplane.commons.domain.Entities.HJwtToken
import com.hortonworks.dataplane.cs.Webservice.{AtlasService, RangerService}
import models.{ApplicationException, JsonResponses, UnsupportedInputException, WrappedErrorsException}
import models.JsonFormatters._
import com.hortonworks.dataplane.commons.auth.AuthenticatedAction
import play.api.Logger
import play.api.libs.json.{JsObject, JsValue, Json}
import play.api.mvc.Controller
import com.hortonworks.dataplane.commons.domain.JsonFormatters._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

class RangerAttributes @Inject()(
      @Named("atlasService")
      val atlasService: AtlasService,
      @Named("rangerService")
      val rangerService: RangerService
) extends Controller {

  def getAuditDetails(clusterId: String, dbName: String, tableName: String, offset:String, limit:String, accessType:String, accessResult:String) =
    AuthenticatedAction.async { req =>
      Logger.info("Received getAuditDetails for entity")
      implicit val token = req.token
      rangerService
        .getAuditDetails(clusterId, dbName, tableName, offset, limit, accessType, accessResult)
        .map {
          case Left(errors) => {
            errors.errors.head.status match {
              case 404 => NotFound(JsonResponses.statusError(s"${Json.toJson(errors)}"))
              case  _    => InternalServerError(Json.toJson(errors))
            }
          }
          case Right(attributes) => Ok(Json.toJson(attributes))
        }
    }

  def getPolicyDetails(clusterId: String, offset: Long, limit: Long, serviceType: String, dbName: Option[String], tableName: Option[String], guid: Option[String]) =
    AuthenticatedAction.async { req =>
      Logger.info("Received getPolicyDetails for entity")
      implicit val token = req.token

      (serviceType match {
        case "hive" => getResourceBasedPolicies(clusterId, offset, limit, dbName.getOrElse(""), tableName.getOrElse(""))
        case "tag" => getTagBasedPolicies(clusterId, offset, limit, guid.getOrElse(""))
        case _ => Future.failed(UnsupportedInputException(100, "serviceType must be 'hive' or 'tag'"))
      })
        .map { policies => Ok(Json.toJson(policies)) }
        .recover {
          case exception: WrappedErrorsException =>
            exception.errors.firstMessage match {
              case 404 => NotFound(JsonResponses.statusError(s"${Json.toJson(exception)}"))
              case _ => InternalServerError(JsonResponses.statusError(s"${Json.toJson(exception)}"))
            }
          case exception: ApplicationException =>
            new Status(exception.http) (exception.toJs)
        }
    }

  private def getResourceBasedPolicies(clusterId: String, offset: Long, limit: Long, dbName: String, tableName: String)(implicit token:Option[HJwtToken]): Future[JsValue] = {
    rangerService
      .getPolicyDetails(clusterId, dbName, tableName, offset.toString, limit.toString)
      .map {
        case Left(errors) =>  throw WrappedErrorsException(errors)
        case Right(attributes) => attributes
      }
  }

  private def getTagBasedPolicies(clusterId: String, offset: Long, limit: Long, guid: String)(implicit token:Option[HJwtToken]): Future[JsValue] = {
    for {
      tags <- getAtlasTagsByGuid(clusterId, guid)
      policies <- getPoliciesByTags(clusterId, tags, offset, limit)
    } yield policies
  }

  private def getAtlasTagsByGuid(clusterId: String, guid: String)(implicit token:Option[HJwtToken]): Future[Seq[String]] = {
    atlasService
      .getAssetDetails(clusterId, guid)
      .map {
        case Left(errors) => throw WrappedErrorsException(errors)
        case Right(asset) => (asset \ "entity" \ "classifications" \\ "typeName").map(d => d.validate[String].get)
      }
  }
  private def getPoliciesByTags(clusterId: String, tags: Seq[String], offset: Long, limit: Long)(implicit token:Option[HJwtToken]): Future[JsValue] = {
    rangerService.getPolicyDetailsByTagName(clusterId.toLong, tags.mkString(","), offset, limit)
      .map {
        case Left(errors) => throw WrappedErrorsException(errors)
        case Right(policies) => policies
      }
  }

}
