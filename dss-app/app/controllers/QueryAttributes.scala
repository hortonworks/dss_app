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
import com.hortonworks.dataplane.cs.Webservice.AtlasService
import com.hortonworks.dataplane.commons.auth.AuthenticatedAction
import utils.JsonResponses
import play.api.Logger
import play.api.libs.json.Json
import play.api.mvc.{Action, Controller}
import com.hortonworks.dataplane.commons.domain.JsonFormatters._
import com.hortonworks.dataplane.db.Webservice.ConfigService

import scala.concurrent.ExecutionContext.Implicits.global
import scala.util.Try

class QueryAttributes @Inject()(
                                 @Named("atlasService") val atlasService: AtlasService,
                                 @Named("configService") val configService: ConfigService
                               ) extends Controller {

  def checkAuditMockStatus = Action.async {
    configService
      .getConfig("asset.audit.mock.show").map { config => {
      config match {
        case None => Ok(Json.obj(
          "showMockVisualization" -> false
        ))
        case Some(config) => Ok(Json.obj(
          "showMockVisualization" -> config.configValue.toBoolean
        ))
      }
    }
    }
  }

  def list(clusterId: String) = AuthenticatedAction.async { req =>
    Logger.info("Received get cluster atlas attributes request")
    implicit val token = req.token
    atlasService
      .listQueryAttributes(clusterId)
      .map {
        case Left(errors) =>
          InternalServerError(Json.toJson(errors))
        case Right(attributes) => Ok(Json.toJson(attributes))
      }
  }

  def getAssetDetails(clusterId: String, atlasGuid: String) =
    AuthenticatedAction.async { req =>
      Logger.info("Received get properties for entity")
      implicit val token = req.token
      atlasService
        .getAssetDetails(clusterId, atlasGuid)
        .map {
          case Left(errors) =>
            InternalServerError(Json.toJson(errors))
          case Right(attributes) => Ok(Json.toJson(attributes))
        }
    }

  def getAssetsDetails(clusterId: String, guids: Seq[String]) =
    AuthenticatedAction.async { req =>
      Logger.info("Received get properties for entity")
      implicit val token = req.token
      atlasService
        .getAssetsDetails(clusterId, guids)
        .map {
          case Left(errors) =>
            InternalServerError(Json.toJson(errors))
          case Right(atlasEntities) => Ok(Json.toJson(atlasEntities))
        }
    }

  def getLineage(clusterId: String, atlasGuid: String) = AuthenticatedAction.async {
    request =>
      Logger.info("Received get lineage")
      implicit val token = request.token
      atlasService
        .getLineage(clusterId, atlasGuid, request.getQueryString("depth"))
        .map {
          case Left(errors) =>
            InternalServerError(Json.toJson(errors))
          case Right(lineage) => Ok(Json.toJson(lineage))
        }
  }

  def getTypeDefs(clusterId: String, defType: String) = AuthenticatedAction.async {
    req =>
      Logger.info(s"Received get type def for $defType")
      implicit val token = req.token
      atlasService
        .getTypeDefs(clusterId, defType)
        .map {
          case Left(errors) =>
            InternalServerError(Json.toJson(errors))
          case Right(typeDefs) => Ok(Json.toJson(typeDefs))
        }
  }
}
