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
import com.hortonworks.dataplane.commons.domain.Entities.HJwtToken
import com.hortonworks.dataplane.commons.domain.JsonFormatters._
import com.hortonworks.dataplane.cs.Webservice.DpProfilerService

import scala.util.Try
import models.AtlasEntities._
import models.JsonFormatters._
import play.api.Logger
import play.api.libs.json.{JsObject, Json}
import play.api.mvc.{Action, Controller}
import services.{AtlasService, CredentialInterface, ProfilerAgentService, UrlService}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.util.{Failure, Success}

class AssetProfiler @Inject()(
      @Named("dpProfilerService") val dpProfilerService: DpProfilerService,
      @Named("atlasService1") val atlasService: AtlasService,
      val urlService: UrlService,
      val profilerAgentService: ProfilerAgentService,
      val credentialInterface: CredentialInterface
                     ) extends Controller with JsonAPI {

      import models.JsonFormatters._


      def getProfilersLastRunInfoOnAsset(clusterId: String, assetId: String) = AuthenticatedAction.async { req =>

        Logger.info("Received getProfilersLastRunInfoOnAsset request")

        implicit val token = req.token
        dpProfilerService.getProfilersLastRunInfoOnAsset(clusterId, assetId).map { results =>

          Ok(Json.toJson(results))

        }
          .recover(apiErrorWithLog(e => Logger.error(s"Asset-Controller: getProfilersLastRunInfoOnAsset with asset Id $assetId and cluster id $clusterId failed with message ${e.getMessage}", e)))
      }

      def saveAtlasClassifications(clusterId: String) = AuthenticatedAction.async(parse.json) { request =>
        Logger.info("Received request to modify asset column classifications")
        implicit val token: Option[Entities.HJwtToken] = request.token
        request.body
          .validate[BodyToModifyEntityTags]
          .map { body =>
            val futureTries = body.entities.map {ent=>
              futureToFutureTry(postColumnClassificationsToAtlas(clusterId, ent.guid, ent.classifications))
              .map(_ match {
                case Success(resp) => resp
                case Failure(e) =>  Logger.error(s"Failed to save atlas classification, for entity ${ent.guid}.", e)
                                    Json.obj("success" -> false, "guid" -> ent.guid)
              })
            }
            Future.sequence(futureTries).map(results => Ok(Json.toJson(results)))
            .recover(withLogAndApiError("Failed in saveClassificationsToAtlas."))
          }
          .getOrElse(Future.successful(BadRequest))
      }

      def postAssetColumnClassifications(clusterId: String) = AuthenticatedAction.async(parse.json) { request =>
        Logger.info("Received request to modify asset column classifications")
        implicit val token: Option[Entities.HJwtToken] = request.token
        request.body
          .validate[BodyToModifyAssetColumnTags]
          .map { body =>
            val futures = body.columns.map {col=>
              postColumnClassificationsToAtlas(clusterId, col.guid, col.classifications)
            }
            Future.sequence(futures).flatMap { results =>
              val profilerAgentUrl =  urlService.getDpProfilerUrl(clusterId.toLong)
              profilerAgentUrl.flatMap(profilerUrl =>{
                profilerAgentService.saveAssetColumnTags(profilerUrl, clusterId, Json.toJson(body))(token.map(_.token))
                  .map(jsObj => Ok(Json.toJson(jsObj)))
              })
            }.recover(withLogAndApiError("Failed in postColumnClassificationsToAtlas."))
            
          }
          .getOrElse(Future.successful(BadRequest))
      }

      private def postColumnClassificationsToAtlas(clusterId: String, atlasGuid: String, body: BodyToModifyAtlasClassification)
                                                  (implicit token: Option[Entities.HJwtToken])
      : Future[JsObject]  = {
        for {
          urls <- urlService.getAtlasUrl(clusterId.toLong)
          cred <- credentialInterface.getCredential("DPSPlatform.credential.atlas")
          res1 <- body.postData match {
            case None => Future.successful(Json.obj("nopostdata" -> true))
            case Some(seqOfClsfn:Seq[AtlasClassification]) =>
              atlasService.postClassifications(urls, clusterId, cred.user.getOrElse("admin"), cred.pass.getOrElse("admin")
                , atlasGuid, seqOfClsfn)(token.map(_.token))
          }
          res2 <- body.putData match {
            case None => Future.successful(Json.obj("noputdata" -> true))
            case Some(seqOfClsfn:Seq[AtlasClassification]) =>
              atlasService.putClassifications(urls, clusterId, cred.user.getOrElse("admin"), cred.pass.getOrElse("admin")
                , atlasGuid, seqOfClsfn)(token.map(_.token))
          }
          res3 <- body.deleteData match {
            case None => Future.successful(Seq(Json.obj("nodeletedata" -> true)))
            case Some(seqOfClfnName:Seq[String]) =>
              Future.sequence(seqOfClfnName.map(name =>
                futureToFutureTry(atlasService.deleteClassification(urls, clusterId, cred.user.getOrElse("admin")
                  , cred.pass.getOrElse("admin"), atlasGuid, name)(token.map(_.token))
                ).map(_ match {
                  case Success(resp) => resp
                  case Failure(e) =>  Logger.error(s"Failed to delete atlas classification $name, for entity $atlasGuid", e)
                                      Json.obj("success" -> false, "name" -> name)
                })
              ))
          }
        } yield Json.obj("success" -> true, "postResp" -> res1, "putResp" -> res2, "deleteResp" -> res3)

      }

  private def futureToFutureTry[T](f: Future[T]): Future[Try[T]] =
    f.map(Success(_)).recover({ case e => Failure(e) })

}
