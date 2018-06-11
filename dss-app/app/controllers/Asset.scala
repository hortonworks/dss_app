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
import com.hortonworks.dataplane.commons.auth.AuthenticatedAction
import com.hortonworks.dataplane.commons.domain.JsonFormatters._
import com.hortonworks.dataplane.commons.domain.Entities
import com.hortonworks.dataplane.commons.domain.Entities.BodyToModifyAssetColumnTags
import com.hortonworks.dataplane.commons.domain.JsonFormatters._
import com.hortonworks.dataplane.cs.Webservice.{AtlasService, DpProfilerService}
import com.hortonworks.dataplane.db.Webservice.DataAssetService
import play.api.Logger
import play.api.libs.json.Json
import play.api.mvc.{Action, Controller}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.util.{Failure, Success}

class Asset @Inject()(
      @Named("dataAssetService") val assetService: DataAssetService,
      @Named("dpProfilerService") val dpProfilerService: DpProfilerService,
      @Named("atlasService") val atlasService: AtlasService
                     ) extends Controller with JsonAPI {

      def getByGuid(guid: String) = Action.async {
        Logger.info("Received getAssetByUid request")
        assetService
          .findAssetByGuid(guid)
          .map {
            case Left(errors) =>
              InternalServerError(Json.toJson(errors))
            case Right(dataSets) => Ok(Json.toJson(dataSets))
          }
      }


      def getProfilersLastRunInfoOnAsset(clusterId: String, assetId: String) = AuthenticatedAction.async { req =>

        Logger.info("Received getProfilersLastRunInfoOnAsset request")

        implicit val token = req.token
        dpProfilerService.getProfilersLastRunInfoOnAsset(clusterId, assetId).map { results =>

          Ok(Json.toJson(results))

        }
          .recover(apiErrorWithLog(e => Logger.error(s"Asset-Controller: getProfilersLastRunInfoOnAsset with asset Id $assetId and cluster id $clusterId failed with message ${e.getMessage}", e)))
      }


      def postAssetColumnClassifications(clusterId: String) = AuthenticatedAction.async(parse.json) { request =>
        Logger.info("Received request to modify asset column classifications")
        implicit val token: Option[Entities.HJwtToken] = request.token
        request.body
          .validate[BodyToModifyAssetColumnTags]
          .map { body =>
            val futures = body.columns.map {col=>
              atlasService.postClassifications(clusterId, col.guid, col.classifications)
            }
            Future.sequence(futures).flatMap { results =>
              dpProfilerService.postAssetColumnClassifications(clusterId, Json.toJson(body))
                .map(jsObj => Ok(Json.toJson(jsObj)))
            }
            .recoverWith({
              case e: Exception => Future.successful(InternalServerError(Json.toJson(e.getMessage)))
            })
            
          }
          .getOrElse(Future.successful(BadRequest))
      }


}
