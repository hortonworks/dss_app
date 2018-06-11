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
import com.hortonworks.dataplane.commons.domain.Atlas.{
  AtlasEntities,
  AtlasSearchQuery,
  Entity
}
import com.hortonworks.dataplane.commons.domain.Entities.Errors
import com.hortonworks.dataplane.commons.domain.JsonFormatters._
import com.hortonworks.dataplane.cs.Webservice.AtlasService
import com.hortonworks.dataplane.db.Webservice.DataAssetService
import com.hortonworks.dataplane.commons.auth.AuthenticatedAction
import models.JsonResponses
import play.api.Logger
import play.api.libs.json.Json
import play.api.mvc.Controller

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

class QueryAssets @Inject()(
    @Named("atlasService") val atlasService: AtlasService,
    @Named("dataAssetService") val assetService: DataAssetService) extends Controller {

  def search(clusterId: String, datasetId: Option[String]) = AuthenticatedAction.async(parse.json) { request =>
    Logger.info("Received get cluster atlas search request")
    implicit val token = request.token
    request.body
      .validate[AtlasSearchQuery]
      .map { filters =>
        val future = for {
          results <- atlasService.searchQueryAssets(clusterId, filters)
          enhancedResults <- doEnhanceAssetsWithOwningDataset(clusterId.toLong, datasetId, results)
        } yield enhancedResults

        future
          .map {
            case Left(errors) =>
              InternalServerError(Json.toJson(errors))
            case Right(enhanced) => Ok(Json.toJson(enhanced))
          }
      }
      .getOrElse(Future.successful(BadRequest))

  }

  private def doEnhanceAssetsWithOwningDataset(clusterId: Long, datasetId: Option[String], atlasEntities: Either[Errors, AtlasEntities])
    : Future[Either[Errors, Seq[Entity]]] = {
    atlasEntities match {
      case Left(errors) => Future.successful(Left(errors))
      case Right(atlasEntities) =>
        val entities = atlasEntities.entities.getOrElse(Nil)
        val assetIds
          : Seq[String] = entities.filter(_.guid.nonEmpty) map (_.guid.get)
        assetService
          .findManagedAssets(clusterId, assetIds)
          .map {
            case Left(errors) => Left(errors)
            case Right(relationships) => {
              val relations = datasetId match {
                case None => relationships
                case Some(dsId) => relationships.filter(_.datasetId == dsId.toLong)
              }
              val enhanced = entities.map { cEntity =>
                relations.find(_.guid == cEntity.guid.get) match {
                  case None => cEntity
                  case Some(relationship) =>
                    cEntity.copy(
                      datasetId = Option(relationship.datasetId),
                      datasetName = Option(relationship.datasetName))
                }

              }
              Right(enhanced)
            }
          }
    }
  }

}
