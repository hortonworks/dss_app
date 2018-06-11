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
import com.hortonworks.dataplane.cs.Webservice.DpProfilerService
import models.JsonResponses
import play.api.Logger
import play.api.libs.json.{JsError, JsSuccess, Json}
import play.api.mvc.Controller
import com.hortonworks.dataplane.db.Webservice.DataSetService
import com.hortonworks.dataplane.commons.domain.Entities
import com.hortonworks.dataplane.commons.domain.JsonFormatters._
import com.hortonworks.dataplane.commons.domain.profiler.models.Requests.ProfilerMetricRequest
import com.hortonworks.dataplane.commons.domain.profiler.parsers.RequestParser._
import services.UtilityService

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

class DpProfilerAttributes @Inject()(
                                      @Named("dpProfilerService") val dpProfilerService: DpProfilerService,
                                      @Named("dataSetService") val dataSetService: DataSetService,
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
      dataSetService.retrieve(dataSetId).flatMap {
        case Left(errors) => Future.successful(InternalServerError(Json.toJson(errors)))
        case Right(datasetAndCategories) => {
          val dataset = datasetAndCategories.dataset
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

}
