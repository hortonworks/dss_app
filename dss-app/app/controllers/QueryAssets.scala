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
import com.hortonworks.dataplane.commons.domain.Atlas.{AtlasEntities, AtlasSearchQuery, Entity}
import com.hortonworks.dataplane.commons.domain.Entities.Errors
import com.hortonworks.dataplane.commons.domain.JsonFormatters._
import com.hortonworks.dataplane.cs.Webservice.AtlasService
import com.hortonworks.dataplane.commons.auth.AuthenticatedAction
import models.AtlasEntities.AtlasBasicSearchQueryParams
import models.JsonFormatters._
import utils.JsonResponses
import play.api.Logger
import play.api.libs.json.Json
import play.api.mvc.Controller
import repo.DatasetRepo
import services.{CredentialInterface, UrlService}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

class QueryAssets @Inject()(
                             @Named("atlasService") val atlasService: AtlasService,
                             @Named("atlasService1") val atlasServiceLocal: services.AtlasService,
                             datasetRepo: DatasetRepo) extends Controller with JsonAPI {

  def searchAtlasBasic(clusterId: String, datasetId: Option[String]) = AuthenticatedAction.async(parse.json) { request =>
    Logger.info("Received Basic atlas search request for assets")
    implicit val token = request.token
    request.body
      .validate[AtlasBasicSearchQueryParams]
      .map { body =>
        (for {
          results <- atlasServiceLocal.basicSearch(clusterId, body)
          enhancedResults <- doEnhanceAssetsWithOwningDataset(clusterId.toLong, datasetId, results)
        } yield enhancedResults)
          .map(json => Ok(Json.toJson(json)))
          .recover(withLogAndApiError("Atlas asset search with Basic query failed."))
      }
      .getOrElse(Future.successful(BadRequest))
  }

  def search(clusterId: String, datasetId: Option[String]) = AuthenticatedAction.async(parse.json) { request =>
    Logger.info("Received DSL atlas search request for assets")
    implicit val token = request.token
    request.body
      .validate[AtlasSearchQuery]
      .map { filters =>
        (for {
          results <- atlasService.searchQueryAssets(clusterId, filters).flatMap {
            case Left(errors) => Future.failed(new Exception(s"Error in atlas DSL search query. $errors"))
            case Right(atlasEntities) => Future.successful(atlasEntities)
          }
          enhancedResults <- doEnhanceAssetsWithOwningDataset(clusterId.toLong, datasetId, results)
        } yield enhancedResults)
          .map(json => Ok(Json.toJson(json)))
          .recover(withLogAndApiError("Atlas asset search with DSL query failed."))
      }
      .getOrElse(Future.successful(BadRequest))
  }

  private def doEnhanceAssetsWithOwningDataset(clusterId: Long, datasetId: Option[String], atlasEntities: AtlasEntities)
  : Future[Seq[Entity]] = {
    val entities = atlasEntities.entities.getOrElse(Nil)
    val assetIds: Seq[String] = entities.filter(_.guid.nonEmpty) map (_.guid.get)
    datasetRepo
      .queryManagedAssets(clusterId, assetIds)
      .map {
        relationships => {
          val relations = datasetId match {
            case None => relationships
            case Some(dsId) => relationships.filter(_.datasetId == dsId.toLong)
          }
          entities.map { cEntity =>
            relations.find(_.guid == cEntity.guid.get) match {
              case None => cEntity
              case Some(relationship) =>
                cEntity.copy(
                  datasetId = Option(relationship.datasetId),
                  datasetName = Option(relationship.datasetName))
            }
          }
        }
      }
  }

}
