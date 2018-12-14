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

import com.google.inject.Inject
import com.google.inject.name.Named
import com.hortonworks.dataplane.commons.auth.AuthenticatedAction
import com.hortonworks.dataplane.commons.domain.Entities.Error
import com.hortonworks.dataplane.cs.Webservice.DpProfilerService
import utils.JsonResponses
import play.api.Logger
import play.api.libs.json._
import play.api.mvc.Controller
import com.hortonworks.dataplane.db.Webservice.{ClusterComponentService, DataSetService}
import com.hortonworks.dataplane.commons.domain.Entities
import com.hortonworks.dataplane.commons.domain.JsonFormatters._
import com.hortonworks.dataplane.commons.domain.profiler.models.Requests.ProfilerMetricRequest
import com.hortonworks.dataplane.commons.domain.profiler.parsers.RequestParser._
import repo.DatasetRepo
import services.{ProfilerAgentService, UrlService, UtilityService}
import utils._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.util.{Failure, Success}

class DpProfilerAttributes @Inject()(
                                      @Named("dpProfilerService") val dpProfilerService: DpProfilerService,
                                      datasetRepo: DatasetRepo,
                                      @Named("clusterComponentService") val clusterComponentService: ClusterComponentService,
                                      val profilerAgentService: ProfilerAgentService,
                                      val urlService: UrlService,
                                      val utilityService: UtilityService
                                    ) extends Controller {

  def startProfilerJob(clusterId: String, dbName: String, tableName: String) = {
    AuthenticatedAction.async { req =>
      Logger.info(s"Received startProfilerJob for entity $clusterId $dbName $tableName")
      implicit val token = req.token
      dpProfilerService
        .startProfilerJob(clusterId, dbName, tableName)
        .map {
          case Left(errors) => {
            errors.errors.head.status match {
              case 404 => NotFound(JsonResponses.statusError(s"${Json.toJson(errors)}"))
              case 405 => MethodNotAllowed(JsonResponses.statusError(s"${Json.toJson(errors)}"))
              case _ => InternalServerError(Json.toJson(errors))
            }
          }
          case Right(attributes) => Accepted(Json.toJson(attributes))
        }

    }
  }

  def getProfilerJobStatus(clusterId: String, dbName: String, tableName: String) = {
    AuthenticatedAction.async { req =>
      Logger.info(s"Received getProfilerJobStatus for entity $clusterId $dbName $tableName")
      implicit val token = req.token
      dpProfilerService
        .getProfilerJobStatus(clusterId, dbName, tableName)
        .map {
          case Left(errors) => {
            errors.errors.head.status match {
              case 404 => NotFound(JsonResponses.statusError(s"${Json.toJson(errors)}"))
              case 405 => MethodNotAllowed(JsonResponses.statusError(s"${Json.toJson(errors)}"))
              case _ => InternalServerError(Json.toJson(errors))
            }
          }
          case Right(attributes) => Ok(Json.toJson(attributes))
        }

    }
  }

  def getScheduleStatus(clusterId: String, dataSetId: String) = {
    AuthenticatedAction.async { req =>
      Logger.info(s"Received getScheduleStatus for entity $clusterId $dataSetId")
      implicit val token = req.token
      datasetRepo.findById(dataSetId.toLong).flatMap {
        dataset => {
          for {
            jobName <- utilityService.doGenerateJobName(dataset.id.get, dataset.name)
            feu <- dpProfilerService.getScheduleInfo(clusterId, jobName)
          } yield {
            feu match {
              case Left(errors) => {
                errors.errors.head.status match {
                  case 404 => NotFound(JsonResponses.statusError(s"${Json.toJson(errors)}"))
                  case 405 => MethodNotAllowed(JsonResponses.statusError(s"${Json.toJson(errors)}"))
                  case _ => InternalServerError(Json.toJson(errors))
                }
              }
              case Right(attributes) => Ok(Json.toJson(attributes))
            }
          }
        }
      }
    }
  }

  def getAuditResults(clusterId: String, dbName: String, tableName: String, startDate: String, endDate: String, userName: String) = {
    AuthenticatedAction.async { req =>
      Logger.info(s"Received getAuditActions for entity $clusterId $dbName $tableName")
      implicit val token = req.token
      dpProfilerService
        .getAuditResults(clusterId, dbName, tableName, userName, startDate, endDate)
        .map {
          case Left(errors) => {
            errors.errors.head.status match {
              case 404 => NotFound(JsonResponses.statusError(s"${Json.toJson(errors)}"))
              case 405 => MethodNotAllowed(JsonResponses.statusError(s"${Json.toJson(errors)}"))
              case 503 => ServiceUnavailable(JsonResponses.statusError(s"${Json.toJson(errors)}"))
              case _ => InternalServerError(Json.toJson(errors))
            }
          }
          case Right(attributes) => Ok(Json.toJson(attributes))
        }

    }
  }


  def getAuditActions(clusterId: String, dbName: String, tableName: String, startDate: String, endDate: String, userName: String) = {
    AuthenticatedAction.async { req =>
      Logger.info(s"Received getAuditActions for entity $clusterId $dbName $tableName")
      implicit val token = req.token
      dpProfilerService
        .getAuditActions(clusterId, dbName, tableName, userName, startDate, endDate)
        .map {
          case Left(errors) => {
            errors.errors.head.status match {
              case 404 => NotFound(JsonResponses.statusError(s"${Json.toJson(errors)}"))
              case 405 => MethodNotAllowed(JsonResponses.statusError(s"${Json.toJson(errors)}"))
              case 503 => ServiceUnavailable(JsonResponses.statusError(s"${Json.toJson(errors)}"))
              case _ => InternalServerError(Json.toJson(errors))
            }
          }
          case Right(attributes) => Ok(Json.toJson(attributes))
        }

    }
  }

  def getMetrics(userName: String) = AuthenticatedAction.async(parse.json) { request =>
    implicit val token: Option[Entities.HJwtToken] = request.token
    request.body.validate[ProfilerMetricRequest] match {
      case JsSuccess(simpleRequest, _) =>
        Logger.debug(s"Received Metrics request for  $simpleRequest for user $userName ")
        dpProfilerService.getMetrics(simpleRequest, userName) map {
          case Left(errors) =>
            errors.errors.head.status match {
              case 404 => NotFound(JsonResponses.statusError(s"${Json.toJson(errors)}"))
              case 405 => MethodNotAllowed(JsonResponses.statusError(s"${Json.toJson(errors)}"))
              case 503 => ServiceUnavailable(JsonResponses.statusError(s"${Json.toJson(errors)}"))
              case _ => InternalServerError(Json.toJson(errors))
            }
          case Right(attributes) => Ok(Json.toJson(attributes))
        }
      case error: JsError =>
        Future.successful(BadRequest(s"Failed to parse request  ${BadRequest(JsError.toFlatForm(error).toString())}"))
    }
  }

  def getProfilersStatusWithJobSummary(clusterId: String) = {
    AuthenticatedAction.async { req =>
      val queryString = req.rawQueryString
      Logger.info(s"Received getProfilersStatusWithJobSummary for clusterId - $clusterId with query params - $queryString")
      implicit val token = req.token
      dpProfilerService
        .getProfilersStatusWithJobSummary(clusterId, queryString)
        .map(jsObj => Ok(Json.toJson(jsObj)))
        .recoverWith({
          case e: Exception => Future.successful(InternalServerError(Json.toJson(e.getMessage)))
        })
    }
  }

  def getProfilersStatusWithAssetsCount(clusterId: String) = {
    AuthenticatedAction.async { req =>
      val queryString = req.rawQueryString
      Logger.info(s"Received getProfilersStatusWithAssetsCount for clusterId - $clusterId with query params - $queryString")
      implicit val token = req.token
      dpProfilerService
        .getProfilersStatusWithAssetsCount(clusterId, queryString)
        .map(jsObj => Ok(Json.toJson(jsObj)))
        .recoverWith({
          case e: Exception => Future.successful(InternalServerError(Json.toJson(e.getMessage)))
        })
    }
  }

  def getExistingProfiledAssetCount(clusterId: String, profilerInstanceName: String) = {

    AuthenticatedAction.async { req =>

      Logger.info(s"Received getExistingProfiledAssetCount for clusterId - $clusterId with profiler name - $profilerInstanceName")

      implicit val token = req.token

      dpProfilerService
        .getExistingProfiledAssetCount(clusterId, profilerInstanceName)
        .map(jsObj => Ok(Json.toJson(jsObj)))
        .recoverWith({
          case e: Exception => Future.successful(InternalServerError(Json.toJson(e.getMessage)))
        })
    }
  }

  def getProfilersJobs(clusterId: String) = {
    AuthenticatedAction.async { req =>
      val queryString = req.rawQueryString
      Logger.info(s"Received getProfilersJobs for clusterId - $clusterId with query params - $queryString")
      implicit val token = req.token
      dpProfilerService
        .getProfilersJobs(clusterId, queryString)
        .map(jsObj => Ok(Json.toJson(jsObj)))
        .recoverWith({
          case e: Exception => Future.successful(InternalServerError(Json.toJson(e.getMessage)))
        })
    }
  }

  def putProfilerState(clusterId: String) = {
    AuthenticatedAction.async { req =>
      val queryString = req.rawQueryString
      Logger.info(s"Received putProfilerState for clusterId - $clusterId with query params - $queryString")
      implicit val token = req.token
      dpProfilerService
        .putProfilerState(clusterId, queryString)
        .map(jsObj => Ok(Json.toJson(jsObj)))
        .recoverWith({
          case e: Exception => Future.successful(InternalServerError(Json.toJson(e.getMessage)))
        })
    }
  }

  def getProfilerHistories(clusterId: String) = {
    AuthenticatedAction.async { req =>
      val queryString = req.rawQueryString
      Logger.info(s"Received getProfilerHistories for clusterId - $clusterId with query params - $queryString")
      implicit val token = req.token
      dpProfilerService
        .getProfilersHistories(clusterId, queryString)
        .map(jsObj => Ok(Json.toJson(jsObj)))
        .recoverWith({
          case e: Exception => Future.successful(InternalServerError(Json.toJson(e.getMessage)))
        })
    }
  }

  def getProfilerInstanceByName(clusterId: String, name: String) = {
    AuthenticatedAction.async { req =>
      val queryString = req.rawQueryString
      Logger.info(s"Received getProfilerInstanceByName for clusterId - $clusterId and profiler name - $name")
      implicit val token = req.token
      dpProfilerService
        .getProfilerInstanceByName(clusterId, name)
        .map(jsObj => Ok(Json.toJson(jsObj)))
        .recoverWith({
          case e: Exception => Future.successful(InternalServerError(Json.toJson(e.getMessage)))
        })
    }
  }

  def updateProfilerInstance(clusterId: String) = AuthenticatedAction.async(parse.json) { request =>
    implicit val token = request.token
    val body = request.body
    Logger.info(s"Received getProfilerInstanceByName for clusterId - $clusterId with body $body" )
    dpProfilerService
      .updateProfilerInstance(clusterId, Json.toJson(body))
      .map(jsObj => Ok(Json.toJson(jsObj)))
      .recoverWith({
        case e: Exception => Future.successful(InternalServerError(Json.toJson(e.getMessage)))
      })
  }

  def getProfilerSelectorsConfig(clusterId: String)= {
    AuthenticatedAction.async { req =>
      Logger.info(s"Received getProfilerSelectorsConfig for clusterId - $clusterId")
      implicit val token = req.token
      dpProfilerService
        .getProfilerSelectorsConfig(clusterId)
        .map(jsObj => Ok(Json.toJson(jsObj)))
        .recoverWith({
          case e: Exception => Future.successful(InternalServerError(Json.toJson(e.getMessage)))
        })
    }
  }

  def updateProfilerSelectorsConfig(clusterId: String, name: String) = AuthenticatedAction.async(parse.json) { request =>
    implicit val token = request.token
    val body = request.body
    Logger.info(s"Received updateProfilerSelectorsConfig for clusterId - $clusterId with body $body and name $name" )
    dpProfilerService
      .updateProfilerSelector(clusterId, name, Json.toJson(body))
      .map(jsObj => Ok(Json.toJson(jsObj)))
      .recoverWith({
        case e: Exception => Future.successful(InternalServerError(Json.toJson(e.getMessage)))
      })
  }

  def updateProfilerConfig(clusterId: String) = AuthenticatedAction.async(parse.json) {
    request =>
      Logger.info(s"Received request for updating profiler instance on cluster $clusterId")
      val body = request.body
      implicit val token = request.token.map(_.token)
      val profilerAgentUrl =  urlService.getDpProfilerUrl(clusterId.toLong)
      profilerAgentUrl.flatMap(profilerUrl =>
      {
        Logger.info(s"Got profiler agent URL => ${profilerUrl}")
        profilerAgentService.updateProfilerConfiguration(profilerUrl, clusterId, body)
          .map(jsObj => Ok(Json.toJson(jsObj)))
          .recoverWith({
            case e:BadRequestException => Future.successful(BadRequest(Json.toJson(e.getMessage)))
            case e:AuthenticationException => Future.successful(Unauthorized(Json.toJson(e.getMessage)))
            case e:NotFoundException => Future.successful(NotFound(Json.toJson(e.getMessage)))
            case e:RequestTimeoutException => Future.successful(RequestTimeout(Json.toJson(e.getMessage)))
            case e:BadGatewayException => Future.successful(BadGateway(Json.toJson(e.getMessage)))
            case e:GatewayTimeoutException => Future.successful(GatewayTimeout(Json.toJson(e.getMessage)))
            case e:Exception => Future.successful(InternalServerError(Json.toJson(e.getMessage)))
          })
      }
    )
  }

  def bulkUpdateProfilerConfigs(clusterId: String) = AuthenticatedAction.async(parse.json) {
    request =>
      Logger.info(s"Received request for bulk updating profiler instance on cluster $clusterId")
      val body = request.body
      implicit val token = request.token.map(_.token)
      val profilerAgentUrl =  urlService.getDpProfilerUrl(clusterId.toLong)
      profilerAgentUrl.flatMap(profilerUrl =>
      {
        Logger.info(s"Got profiler agent URL => ${profilerUrl}")
        profilerAgentService.bulkUpdateProfilerConfigurations(profilerUrl, clusterId, body)
          .map(jsObj => Ok(Json.toJson(jsObj)))
          .recoverWith({
            case e:BadRequestException => Future.successful(BadRequest(Json.toJson(e.getMessage)))
            case e:AuthenticationException => Future.successful(Unauthorized(Json.toJson(e.getMessage)))
            case e:NotFoundException => Future.successful(NotFound(Json.toJson(e.getMessage)))
            case e:RequestTimeoutException => Future.successful(RequestTimeout(Json.toJson(e.getMessage)))
            case e:BadGatewayException => Future.successful(BadGateway(Json.toJson(e.getMessage)))
            case e:GatewayTimeoutException => Future.successful(GatewayTimeout(Json.toJson(e.getMessage)))
            case e:Exception => Future.successful(InternalServerError(Json.toJson(e.getMessage)))
          })
      }
    )
  }


    def getYarnQueueList(clusterId:String) = {
      AuthenticatedAction.async
      { req =>
        Logger.info(s"Received request to fetch list of YARN queues for cluster $clusterId")
        clusterComponentService.getServiceByName(clusterId.toLong, "YARN").flatMap {
          case Left(errors) => {
            Logger.warn(s"Could not get YARN properties from storage - $errors")
            Future.failed(new NotFoundException(Error(404, s"Could not get YARN properties from storage - $errors")))
          }
          case Right(yarnServiceDetails) => {
            val yarnServiceDetailsJson = yarnServiceDetails.properties.get
            val configsAsList = (yarnServiceDetailsJson \ "properties").as[List[JsObject]]
            val yarnConfig = configsAsList.find(obj => (obj \ "type").as[String] == "capacity-scheduler")
            if (yarnConfig.isEmpty)
              Future.failed(NotFoundException(Error(404, "No properties found for Yarn")))
            val properties = (yarnConfig.get \ "properties").as[JsObject]
            val yarnQueues = (properties \ "yarn.scheduler.capacity.root.queues").as[String]
            val yarnQueueList = yarnQueues.split(",").toList
            Logger.info(s"Got YARN Queues => $yarnQueueList")
            Future.successful(Ok(Json.toJson(yarnQueueList)))
        }
      }
    }
  }
}
