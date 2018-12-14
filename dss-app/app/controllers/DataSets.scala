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

import java.time.{Clock, LocalDateTime}
import javax.inject.Inject

import com.google.inject.name.Named
import com.hortonworks.dataplane.commons.domain.Atlas.{AtlasEntities, AtlasSearchQuery, Entity}
import com.hortonworks.dataplane.commons.domain.JsonFormatters._
import com.hortonworks.dataplane.cs.Webservice.{AtlasService, DpProfilerService}
import utils.{JsonResponses, WrappedErrorsException}
import play.api.Logger
import play.api.libs.json.{Json, Reads, __}
import services.UtilityService
import com.hortonworks.dataplane.commons.auth.AuthenticatedAction
import com.hortonworks.dataplane.commons.domain.Entities.HJwtToken
import models.AtlasEntities.AtlasBasicSearchQueryParams
import models.JsonFormatters._
import models.DatasetEntities._
import models.UserEntities.DssUser
import play.api.mvc.{Action, Controller}
import play.api.libs.functional.syntax._
import repo.{AssetRepo, DatasetRepo}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.util.{Failure, Success, Try}

class DataSets @Inject()(
    @Named("atlasService") val atlasService: AtlasService,
    @Named("atlasService1") val atlasServiceLocal: services.AtlasService,
    @Named("dpProfilerService") val dpProfilerService: DpProfilerService,
    @Named("clusterService") val clusterService: com.hortonworks.dataplane.db.Webservice.ClusterService,
                        datasetRepo: DatasetRepo,
                        assetRepo: AssetRepo,
    val utilityService: UtilityService)
    extends Controller with JsonAPI {

  import models.JsonFormatters._

  def list(name: Option[String]) =  Action.async {
    Logger.info("Received list DataSet request")
    (name match {
      case None => datasetRepo.all()
      case Some(nm) => datasetRepo.findByNames(Seq(nm))
    })
      .map(datasets => Ok(Json.toJson(datasets)))
      .recover(withLogAndApiError("List dataSet failed"))
  }

  def create = AuthenticatedAction.async(parse.json) { request =>
    Logger.info("Received create dataSet with categoryIds request")
    request.body
      .validate[DatasetAndTags]
      .map { dSetNTags =>
        datasetRepo
          .insertWithCategories(dSetNTags, new DssUser(request.user))
          .map(rDataset => Ok(Json.toJson(rDataset)))
          .recover(withLogAndApiError("Create dataset with tags failed"))
      }
      .getOrElse(Future.successful(BadRequest))
  }

    def update() = AuthenticatedAction.async(parse.json) { request =>
      Logger.info("Received update dataSet with categoryIds request")
      request.body
        .validate[DatasetAndTags]
      .map { dSetNTags =>
        datasetRepo
          .updateWithCategories(dSetNTags, new DssUser(request.user))
          .map(rDataset => Ok(Json.toJson(rDataset)))
          .recover(withLogAndApiError("Update dataset with tags failed"))
      }
      .getOrElse(Future.successful(BadRequest))
  }

  //TODO Merge it into above update function
  def updateDataset(datasetId : String) = AuthenticatedAction.async(parse.json) { request =>
    Logger.info("Received update dataSet request")
    request.body
      .validate[Dataset]
      .map { dataset =>
        val loggedinUser = request.user.id.get
        if(loggedinUser != dataset.createdBy.get) Future.successful(Unauthorized("this user is not authorized to perform this action"))
        else{
          (for {
            edtOptn   <- datasetRepo.getRichDatasetById(datasetId.toLong, new DssUser(request.user)).map(_.editDetails)
            denyEdit  <- Future.successful(edtOptn match {
              case None => false
              case Some(edtDtl) => edtDtl.editBegin.get.isAfter(LocalDateTime.now(Clock.systemUTC()).minusMinutes(15))
            })
          } yield {denyEdit})
            .flatMap{
              case true => Future.successful(Conflict)
              case false => datasetRepo.updateDatset(datasetId.toLong, dataset, new DssUser(request.user)) map { dataset => Ok(Json.toJson(dataset)) }
            }.recover(withLogAndApiError("Update dataset failed"))
        }
      }
      .getOrElse(Future.successful(BadRequest))
  }

  def delete(dataSetId: String) =  AuthenticatedAction.async { request =>
    implicit val token: Option[HJwtToken] = request.token
    Logger.info("Received delete dataSet request")
    (for {
      dataset <- datasetRepo.findById(dataSetId.toLong)
      clusterId <- doGetClusterIdFromDpClusterId(dataset.dpClusterId.toString)
      _ <- dpProfilerService.datasetAssetMapping(clusterId, Seq.empty[String], dataset.name)
      deleted <- datasetRepo.archiveById(dataSetId.toLong)
    }  yield {
      Ok(Json.obj("datasetsDeleted" -> deleted))
    }).recover(withLogAndApiError("Delete dataset failed"))
  }

  private def doGetClusterIdFromDpClusterId(dpClusterId: String): Future[String] = {
    clusterService
      .getLinkedClusters(dpClusterId.toLong)
      .flatMap {
        case Left(errors) => Future.failed(WrappedErrorsException(errors))
        case Right(clusters) => Future.successful(clusters.head.id.get.toString)
      }
  }

  def getDatasetsByName(names: String) = AuthenticatedAction.async { req =>
    Logger.info("Received get DataSet by name request")
    datasetRepo.findByNames(names.split(","))
      .map(dataset => Ok(Json.toJson(dataset)))
      .recover(withLogAndApiError("Get DataSet by name failed"))
  }

  def getRichDatasetById(id: String) =  AuthenticatedAction.async { request =>
    Logger.info("Received get richDataSet by Id request")
    datasetRepo
      .getRichDatasetById(id.toLong, new DssUser(request.user))
      .map(rDataset => Ok(Json.toJson(rDataset)))
      .recover(withLogAndApiError("Get richDataSet by Id failed"))
  }

  def getRichDatasetList(tagName: String) = AuthenticatedAction.async { req =>
    Logger.info("Received get richDataSet list request")
    val tag = if(tagName.isEmpty || tagName.equalsIgnoreCase("all")) None else Option(tagName)
    datasetRepo
      .getRichDataSetList(tag, req.getQueryString("search"), req.getQueryString("filter")
        , req.getQueryString("offset"), req.getQueryString("size"), new DssUser(req.user))
      .map(rDatasets => Ok(Json.toJson(rDatasets)))
      .recover(withLogAndApiError("Get richDataSet list failed"))
  }

  def beginDatasetEdit(datasetId: Long) = AuthenticatedAction.async(parse.json) { req =>
    Logger.info("Received request to BEGIN dataset edit process")
    (for {
      needRevert <- datasetRepo.getDatasetEditDetails(datasetId).map{
                      case None => false
                      case Some(edtDtl) => edtDtl.editBegin.get.isBefore(LocalDateTime.now(Clock.systemUTC()).minusMinutes(15))
                    }
      _     <- Future.successful(if(needRevert) Logger.info("Need to REVERT stale inprogress edit process"))
      rDSet <- Future.successful(if(needRevert) datasetRepo.revertEdit(datasetId, new DssUser(req.user)))
      rDSet <- datasetRepo.beginEdit(datasetId, new DssUser(req.user))
    } yield {
      Ok(Json.toJson(rDSet))
    }).recover(withLogAndApiError("BEGIN dataset edit process failed"))
  }

  def revertDatasetEdit(datasetId: Long) = AuthenticatedAction.async(parse.json) { req =>
    Logger.info("Received request to REVERT dataset edit process")
    datasetRepo
      .revertEdit(datasetId, new DssUser(req.user))
      .map(rDataset => Ok(Json.toJson(rDataset)))
      .recover(withLogAndApiError("REVERT dataset edit process failed"))
  }

  def saveDatasetEdit(datasetId: Long) = AuthenticatedAction.async(parse.json) { req =>
    implicit val token = req.token
    Logger.info("Received request to SAVE dataset edit process")
    (for {
      dataset   <- datasetRepo.findById(datasetId)
      clusterId <- doGetClusterIdFromDpClusterId(dataset.dpClusterId.toString)
      assetIds  <- assetRepo.allWithDatasetId(datasetId, Some("Edit")).map(
                      _.assets.map { asset => ((asset.assetProperties \ "qualifiedName").as[String]).split("@").head}
                    )
      _         <- dpProfilerService.datasetAssetMapping(clusterId.toString, assetIds, dataset.name)
      rData     <- datasetRepo.saveEdit(datasetId, new DssUser(req.user))
    } yield {
      Ok(Json.toJson(rData))
    }).recover(withLogAndApiError("SAVE dataset edit process failed"))
  }

  def addSelectedAssetsToDataset = AuthenticatedAction.async(parse.json) { req =>
    implicit val token = req.token
    Logger.info("Received request to ADD selected assets to dataset")
    req.body.validate[BoxSelectionPrams].map{ params =>
      getAssetsFromGuids(params.clusterId, params.guids, 0)
        .flatMap{ assets =>
          assets.size match {
            case 0 => datasetRepo.getRichDatasetById(params.datasetId, new DssUser(req.user))
            case _ => datasetRepo.addAssets(params.datasetId, assets, new DssUser(req.user))
          }
        }
        .map(rDataset => Ok(Json.toJson(rDataset)))
        .recover(withLogAndApiError("ADD selected assets to dataset failed"))
    }.getOrElse(Future.successful(BadRequest))
  }

  def addAssetsToDataset = AuthenticatedAction.async(parse.json) { req =>
    implicit val token = req.token
    Logger.info("Received request to ADD DSL query assets to dataset")
    req.body.validate[AddToBoxDSLQueryPrams].map{ params =>
      getAssetFromDSLSearch(params.clusterId, params.assetDSLQueryModel, 0, params.exceptions)
        .flatMap{ assets =>
          assets.size match {
            case 0 => datasetRepo.getRichDatasetById(params.datasetId, new DssUser(req.user))
            case _ => datasetRepo.addAssets(params.datasetId, assets, new DssUser(req.user))
          }
        }
        .map(rDataset => Ok(Json.toJson(rDataset)))
        .recover(withLogAndApiError("ADD query assets to dataset failed"))
    }.getOrElse(Future.successful(BadRequest))
  }

  def addBasicQueryAssetsToDataset = AuthenticatedAction.async(parse.json) { req =>
    implicit val token = req.token
    Logger.info("Received request to ADD Basic query assets to dataset")
    req.body.validate[AddToBoxBasicQueryParams].map{ params =>
      getAssetFromBasicSearch(params.clusterId, params.assetBasicQueryModel, 0, params.exceptions)
        .flatMap{ assets =>
          assets.size match {
            case 0 => datasetRepo.getRichDatasetById(params.datasetId, new DssUser(req.user))
            case _ => datasetRepo.addAssets(params.datasetId, assets, new DssUser(req.user))
          }
        }
        .map(rDataset => Ok(Json.toJson(rDataset)))
        .recover(withLogAndApiError("ADD query assets to dataset failed"))
    }.getOrElse(Future.successful(BadRequest))
  }

  def removeAssetsFromDataset(datasetId: Long, ids: Seq[String]) = AuthenticatedAction.async { req =>
    implicit val token = req.token
    Logger.info("Received request to remove selected assets from dataset")
    datasetRepo
      .removeAssets(datasetId, ids, new DssUser(req.user))
      .map(rDataset => Ok(Json.toJson(rDataset)))
      .recover(withLogAndApiError("Remove selected assets from dataset failed"))
  }


  def removeAllAssetsFromDataset(datasetId: Long) = AuthenticatedAction.async { req =>
    implicit val token = req.token
    Logger.info("Received request to remove all assets from dataset")
    datasetRepo
      .removeAllAssets(datasetId, new DssUser(req.user))
      .map(rDataset => Ok(Json.toJson(rDataset)))
      .recover(withLogAndApiError("Remove all assets from dataset failed"))
  }

  def getDataAssetsByDatasetId(datasetId: String, queryName: String, offset: Long, limit: Option[Long], state: Option[String]) =  Action.async {
    Logger.info("Received request to list assets of dataset")
    assetRepo
      .allWithDatasetId(datasetId.toLong, state, queryName, offset, limit)
      .map(assets => Ok(Json.toJson(assets)))
      .recover(withLogAndApiError("Request to list assets of dataset failed"))
  }

  def getUniqueTagsFromAssetsOfDataset (datasetId: String) =  AuthenticatedAction.async { req =>
    implicit val token = req.token
    Logger.info("Received request to list unique tags of assets of dataset")
    assetRepo
      .allWithDatasetId(datasetId.toLong)
      .flatMap { assetsNcounts =>
        assetsNcounts.assets.length match {
          case 0 => Future.successful(Ok(Json.toJson(Array[String]())))
          case _ => getListOfUniqueTags(assetsNcounts.assets.head.clusterId, assetsNcounts.assets
            .map(_.guid)).map(tags => Ok(Json.toJson(tags)))
        }
      }
      .recover(withLogAndApiError("Request to list unique tags of assets of dataset failed"))
  }

  def searchCategories(searchText: String, size: Long) = Action.async {
    Logger.info("Received list dataSet-categories request")
    datasetRepo
      .searchCategoriesByName(searchText, size)
      .map(categories => Ok(Json.toJson(categories)))
      .recover(withLogAndApiError("List dataSet-categories request failed"))
    }

  def listCategoriesWithCount(searchText: Option[String], filterParam: Option[String]) =  AuthenticatedAction.async { req =>
    Logger.info("Received request to list categories with count request")
    (for {
      allCount            <- datasetRepo.getDatasetListCount(searchText, new DssUser(req.user), filterParam)
      categoriesWithCount <- datasetRepo.getCategoriesWithCount(searchText, new DssUser(req.user), filterParam)
      finalSequence       <- Future.successful(Seq(CategoryWithCount("ALL", allCount)) ++ categoriesWithCount)
    } yield {finalSequence})
      .map(list => Ok(Json.toJson(list)))
      .recover(withLogAndApiError("List dataSet-categories request failed"))
   }

  def getDatasetProfiledAssetCount(clusterId: String, datasetName: String, profilerInstanceName: String, startTime: Long, endTime: Long) = AuthenticatedAction.async { request =>
    implicit val token: Option[HJwtToken] = request.token
    (for {
      dsAssetCount <- dpProfilerService.getDatasetProfiledAssetCount(clusterId, datasetName, profilerInstanceName, startTime, endTime)
    }  yield {
      Ok(Json.toJson(dsAssetCount))
    })
      .recover(apiErrorWithLog(e => Logger.error(s"Datasets-Controller: getDatasetProfiledAssetCount with clusterId $clusterId, datasetName $datasetName and profilerInstanceName $profilerInstanceName on profiler_agent failed with message ${e.getMessage}", e)))
  }


  private def getListOfUniqueTags(clusterId: Long, guids:Seq[String])
                                 (implicit token: Option[HJwtToken]): Future[Seq[String]] = {
    atlasService
      .getAssetsDetails(clusterId.toString, guids)
      .map {
        case Left(errors) => throw WrappedErrorsException(errors)
        case Right(atlasEntities) => {
          atlasEntities.entities.getOrElse(Seq[Entity]()).filter(_.tags.nonEmpty) flatMap  (_.tags.get) distinct
        }
      }
  }


  private def extractAndFilterEntities(atlasEntities: AtlasEntities, exceptions: Seq[String] = Seq()) :Seq[Entity] = {
    atlasEntities.entities.getOrElse(Seq[Entity]()).filter(_.guid.nonEmpty).filter(ent => exceptions.find(_ == ent.guid.getOrElse(None)).isEmpty)
  }

  private def getAssetsFromGuids(clusterId: Long, guids:Seq[String], filterDatasetId:Long = 0)
                                (implicit token: Option[HJwtToken]) : Future[Seq[Asset]]= {
    atlasService
      .getAssetsDetails(clusterId.toString, guids)
      .map {
        case Left(errors) => throw WrappedErrorsException(errors)
        case Right(atlasEntities) => extractAndFilterEntities(atlasEntities).map(getAssetFromEntity(_, clusterId))
      }
  }

  private def getAssetFromDSLSearch(clusterId: Long, searchQuery: AtlasSearchQuery, filterDatasetId:Long = 0, exceptions: Seq[String] = Seq())(
    implicit token: Option[HJwtToken])
  : Future[Seq[Asset]] = {
    atlasService
      .searchQueryAssets(clusterId.toString, searchQuery)
      .map {
        case Left(errors) => throw WrappedErrorsException(errors)
        case Right(atlasEntities) => extractAndFilterEntities(atlasEntities, exceptions).map(getAssetFromEntity(_, clusterId))
      }
  }

  private def getAssetFromBasicSearch(clusterId: Long, searchQuery: AtlasBasicSearchQueryParams, filterDatasetId:Long = 0, exceptions: Seq[String] = Seq())(
    implicit token: Option[HJwtToken])
  : Future[Seq[Asset]] = {
    atlasServiceLocal
      .basicSearch(clusterId.toString, searchQuery)
      .map { atlasEntities =>
        extractAndFilterEntities(atlasEntities, exceptions).map(getAssetFromEntity(_, clusterId))
      }
  }

  private def getAssetFromEntity(entity: Entity, clusterId: Long): Asset = {
    Asset(None,
      entity.typeName.get,
      entity.attributes.get.get("name").get,
      entity.guid.get,
      Json.toJson(entity.attributes.get),
      clusterId)
  }

}
