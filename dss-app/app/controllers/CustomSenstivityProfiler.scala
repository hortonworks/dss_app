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


import java.time.Instant
import javax.inject.Inject

import com.hortonworks.dataplane.commons.auth.AuthenticatedAction
import com.hortonworks.dataplane.commons.domain.Entities.Error
import commons.Constants
import models.CspEntities.TestStatus.TestStatus
import models.CspEntities._
import models.UserEntities.DssUser
import play.api.Logger
import play.api.libs.json.{JsResult, JsValue, Json}
import play.api.mvc.Controller
import repo.{CSPResourceRepo, CSPRuleRepo, CSPTestRepo, ClassificationRepo}
import models.JsonFormatters._
import services.{ProfilerAgentService, UrlService}
import utils.WrappedErrorException

import scala.annotation.tailrec
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.util.{Failure, Success, Try}

class CustomSenstivityProfiler @Inject()(cspRuleRepo: CSPRuleRepo,
                                         cSPTestRepo: CSPTestRepo,
                                         classificationRepo: ClassificationRepo,
                                         val cSPResourceRepo: CSPResourceRepo,
                                         val profilerAgentService: ProfilerAgentService,
                                         val urlService: UrlService) extends Controller with JsonAPI {

  val logger = Logger(classOf[CustomSenstivityProfiler])

  def list = AuthenticatedAction.async { request =>
    Logger.info("CustomSenstivityProfiler-Controller: Received list all rules request")
    implicit val token = request.token.map(_.token)
    getTestStatusFromClusterAndUpdateDB.flatMap { rec =>
      cspRuleRepo.list()
        .map { ruleList =>
          Ok(Json.toJson(ruleList))
        }
        .recover(apiErrorWithLog(e => logger.error(s"getting list of rules failed", e)))
    }
      .recover(apiErrorWithLog(e => logger.error(s"failed to get running test status", e)))
  }

  def classificationList = AuthenticatedAction.async { request =>
    Logger.info("CustomSenstivityProfiler-Controller: Received list classification request")
    classificationRepo.listAll()
      .map { ruleList =>
        Ok(Json.toJson(ruleList))
      }
      .recover(apiErrorWithLog(e => Logger.error(s"CustomSenstivityProfiler-Controller: Getting list of classification failed with message ${e.getMessage}", e)))
  }

  def update() = AuthenticatedAction.async(parse.json) { request =>
    Logger.info("CustomSenstivityProfiler-Controller: Received update rule request")
    request.body
      .validate[CSPRuleWithTagsClusterIdsAndUser]
      .map { ruleWithAttrs =>
        cspRuleRepo
          .updateRuleWithTagsClusterIds(ruleWithAttrs.copy(user = new DssUser(request.user)))
          .map(rule => Accepted(Json.toJson(rule)))
          .recover(apiErrorWithLog(e => Logger.error(s"CustomSenstivityProfiler-Controller: Update rule failed with message ${e.getMessage}", e)))
      }
      .getOrElse(Future.successful(BadRequest))
  }

  def create() = AuthenticatedAction.async(parse.json) { request =>
    Logger.info("CustomSenstivityProfiler-Controller: Received create rule request")
    request.body
      .validate[CSPRuleWithTagsClusterIdsAndUser]
      .map { ruleWithAttrs =>
        cspRuleRepo
          .insertRuleWithTagsClusterIdsAndUser(ruleWithAttrs.copy(user = new DssUser(request.user)))
          .map(rule => Accepted(Json.toJson(rule)))
          .recover(apiErrorWithLog(e => Logger.error(s"CustomSenstivityProfiler-Controller: Create rule failed with message ${e.getMessage}", e)))
      }
      .getOrElse(Future.successful(BadRequest))
  }

  def delete(ruleId:Long) = AuthenticatedAction.async { request =>
    Logger.info("CustomSenstivityProfiler-Controller: Received delete rule request")
    cspRuleRepo
      .deleteRuleWithTags(ruleId)
      .map{count => NoContent}
      .recover(withLogAndApiError("CustomSenstivityProfiler-Controller: Ddelete rule request failed"))
  }

  def getTestRunStatusFromCluster(clusterId: String, testId: Long) = AuthenticatedAction.async { request =>
    logger.info("Received get test status request")
    implicit val token = request.token.map(_.token)
    val profilerAgentUrl = urlService.getDpProfilerUrl(clusterId.toLong)
    profilerAgentUrl.flatMap { profilerUrl =>
      profilerAgentService.getTestRunStatus(profilerUrl, clusterId, testId)
        .map(jsObj => Ok(Json.toJson(jsObj)))
        .recover(apiErrorWithLog(e => logger.error(s"not able to fetch test run status", e)))
    }
  }

  def publishCSPMetaConfig1(ruleId:Long) = AuthenticatedAction.async(parse.json) { request =>
    logger.info("Received publish CSP rule request")
    implicit val token = request.token.map(_.token)
    request.body.validate[Seq[Long]].map {clIdsInReq => (for{

      (rule, clIds) <- cspRuleRepo.getRuleAndClusterIds(ruleId).flatMap(_ match {
                          case (rule, clIds)  if rule.status.get == Constants.RULE_STATUS_TEST_SUCCESS
                          || rule.status.get == Constants.RULE_STATUS_SUSPENDED   =>  Future.successful((rule, clIds))
                          case _ => Future.failed(new Exception("Rule is not fit for publish"))
                       })

      cspDsls       <-  Json.parse(rule.dsl).validate[Seq[CSPDsl]].map(Future.successful(_))
        .getOrElse(throw new Exception("Rule has invalid dsl"))

      urlMap        <-  Future.sequence(clIdsInReq.map(clId =>
                          futureToFutureTry(urlService.getDpProfilerUrl(clId)).map(_ match {
                            case Success(url) => {
                              Logger.info(s"DpProfiler base url for clid $clId - $url")
                              (clId,url)
                            }
                            case Failure(e) => throw new Exception(s"Failed to getDpProfilerUrl for $clId")
                          }) //if any profilerUrl fetch fails then abort
                        )).map(_.toMap)
      (fileRefs
      , regRefs)    <-  Future.successful({
                          Logger.info("Segrigating file refrence and regex reference")
                          cSPResourceRepo.findResourceReferences(cspDsls.mkString(",")).toSet.toSeq
                            .partition(_.startsWith(Constants.CSPRESOURCE_TYPE_FILE))})

      regRef2Value  <-  cSPResourceRepo.getRefsWithValues(regRefs).map(_.map(r=> (r._1, r._2.replace("""\""","""\\"""))).toMap)

      clId2filePath <-  { Logger.info("Finding file path for each cluster")
                          if (fileRefs.isEmpty) Future(Map.empty[Long, Map[String, String]]) else
                          Future.sequence(clIdsInReq.map(clId => futureToFutureTry(
                              profilerAgentService.checkCreateNode(urlMap(clId), clId.toString, fileRefs, "sensitive_info_profiler")
                            ).map(_ match {
                              case Success(file2path) => {
                                Logger.info(s"Response of checkCreateNode for clId $clId - $file2path")
                                (clId, file2path)
                              }
                              case Failure(e) => throw new Exception(s"Failed to checkCreateNode for $clId, with file refrences ${fileRefs.toString()}")
                            })
                          )).map(_.toMap)
                        }

      clId2CspDsls  <-  Future.successful({
                          Logger.info("Replacing references with values")
                          var newCspDals:Seq[CSPDsl] = Seq()
                          cspDsls.foreach(cspDsl => {
                            var newDsl = cspDsl.dsl
                            regRefs.foreach(regRef => newDsl = newDsl.replace(s"<<$regRef>>", s""""${regRef2Value(regRef)}""""))
                            newCspDals = newCspDals :+ cspDsl.copy(dsl = newDsl)
                          })
                          clIdsInReq.map(clId =>{
                            var cspDslsForClId = newCspDals.map(_.copy())
                            if (fileRefs.nonEmpty) {
                              val fileRef2Path = clId2filePath(clId)
                              var newCspDslsForClId:Seq[CSPDsl] = Seq()
                              cspDslsForClId.foreach(cspDsl => {
                                var newDsl = cspDsl.dsl
                                fileRefs.foreach(fileRef => newDsl = newDsl.replace(s"<<$fileRef>>", s""""${fileRef2Path(fileRef)}""""))
                                newCspDslsForClId = newCspDslsForClId :+ cspDsl.copy(dsl = newDsl)
                              })
                              cspDslsForClId = newCspDslsForClId
                            }
                            Logger.info(s"Replaced cspDslsForClId - $clId is $cspDslsForClId")
                            (clId, cspDslsForClId)
                          }).toMap
                        })

      respMap       <-  Future.sequence(clIdsInReq.map(clId =>{
                          Logger.info(s"Sending request to publish CSPMetaConfig on clId - $clId")
                          val cspm = CSPMetaConfig(groupName="default", profilerInstanceName="sensitiveinfo", dsls=clId2CspDsls(clId), isEnabled=true)
                          futureToFutureTry(
                            profilerAgentService.createOverwriteCSPMetaConfig(urlMap(clId), clId.toString, cspm
                              , "sensitive_info_profiler", "sensitiveinfo", rule.name, "dsl"
                              , if(clIds.contains(clId)) "overwrite" else "create") // clIds is list of existing mapping clusterids
                          )
                            .map(res=>(clId,res))}
                        )).map(_.toMap)

      respSeq       <-  Future.successful(clIdsInReq.map(clId=>respMap(clId) match {
                          case Success(rsp) => CSPSaveResponse(clId.toString, rsp, true)
                          case Failure(e) =>  CSPSaveResponse(clId.toString, Json.toJson("message" -> e.getLocalizedMessage), false)
                        }))
      count         <-  { Logger.info(respSeq.toString())
                          val successClIds = respSeq.filter(_.isSuccess).map(_.clusterId.toLong).toSet.toSeq
                          if(successClIds.nonEmpty)
                            cspRuleRepo.insertClIdMappingAndMarkRulePublished(successClIds, ruleId)
                          else Future.successful(Logger.info("Rule status was not changed"))
                        }

    } yield{respSeq})
      .map{respSeq => Ok(Json.toJson(respSeq))}
      .recover(withLogAndApiError("CustomSenstivityProfiler-Controller: Publish rule request failed"))
    }.getOrElse(Future.successful(BadRequest("Invalid list of cluster Ids")))
  }

  def unPublishCSPMetaConfig(ruleId:Long) = AuthenticatedAction.async {request =>
    logger.info("Received unPublish CSP rule request")
    implicit val token = request.token.map(_.token)
    (for{
      (rule, clusterIds) <- cspRuleRepo.getRuleAndClusterIds(ruleId)
      urlMap  <- Future.sequence(clusterIds.map(clId =>
                      futureToFutureTry(urlService.getDpProfilerUrl(clId))
                      .map(_ match {
                        case Success(url) =>(clId,url)
                        case Failure(e) => throw new Exception(s"Failed to getDpProfilerUrl for $clId")
                      }) //if any profilerUrl fetch fails then abort
                  )).map(_.toMap)
      respMap <- Future.sequence(clusterIds.map(
                    clId => futureToFutureTry(profilerAgentService.deleteCSPMetaConfig(urlMap(clId), clId.toString, rule.name))
                      .map(res=>(clId,res))
                  )).map(_.toMap)
      respSeq <- Future.successful(clusterIds.map(clId=>respMap(clId) match {
                    case Success(rsp) => CSPSaveResponse(clId.toString, rsp, true)
                    case Failure(e) =>  CSPSaveResponse(clId.toString, Json.toJson("message" -> e.getLocalizedMessage), false)
                  }))
      count   <-  cspRuleRepo.deleteClIdMappingAndMarkRuleSuspended(respSeq.filter(_.isSuccess).map(_.clusterId.toLong).toSet.toSeq, ruleId)

    } yield{respSeq})
      .map{respSeq => Ok(Json.toJson(respSeq))}
      .recover(withLogAndApiError("CustomSenstivityProfiler-Controller: Delete rule request failed"))

  }

  def getTestStatus(ruleId: Long) = AuthenticatedAction.async { request =>
    logger.info("Received get test status request")
    cSPTestRepo.getByRuleId(ruleId)
      .map { resOption =>
        resOption.map { res =>
          Ok(Json.toJson(res))
        }
          .getOrElse(NotFound(Json.toJson("message"->s"no entry found for rule with rule id ${ruleId} in test")))
      }
      .recover(apiErrorWithLog(e => logger.error(s"not able to fetch test run status from DB", e)))
  }

  private val testStatusPollWaitTimeMs = 30000
  private val maxPollCalls = 10

  def getTestRunStatusFromClusterUtil(clusterId: String, testId: Long)(implicit token: Option[String]): Future[JsValue] = {
    val profilerAgentUrl = urlService.getDpProfilerUrl(clusterId.toLong)
    profilerAgentUrl.flatMap { profilerUrl =>
      profilerAgentService.getTestRunStatus(profilerUrl, clusterId, testId)
        .recoverWith {
          case th => val msg = s"not able to fetch dry run status for test id $testId on cluster id $clusterId"
            logger.error(msg, th)
            Future.failed(new Exception(msg, th))
        }
    }
      .recoverWith {
        case th => val msg = s"failed to get profiler agent url for cluster id $clusterId"
          logger.error(msg, th)
          Future.failed(new Exception(msg, th))
      }
  }

  def getTestStatusFromClusterAndUpdateDB()(implicit token: Option[String]) = {
    cSPTestRepo.getRunningTests.flatMap { runningTests =>
      val seqOfFuture = runningTests.map { test =>
        getTestRunStatusFromClusterUtil(test.clusterId.toString, test.idOnProfiler.get).flatMap { jsVal =>
          val dryRunStatus = TestStatus.withName((jsVal \ "dryRunStatus").as[String])
          val response = getTestResponseData(dryRunStatus, jsVal)
          logger.debug(s"test status received from cluster $jsVal")
          cSPTestRepo.updateStatusAndResponse(test.id, dryRunStatus, response).flatMap { res =>
            cspRuleRepo.updateRuleStatus(Some(test.ruleId), getRuleStatusFromTestStatus(dryRunStatus))
              .recoverWith {
                case th => val msg = s"failed to update rule status with test result for rule id ${test.ruleId} and test id ${test.id}"
                  logger.error(msg, th)
                  Future.failed(new Exception(msg, th))
              }
          }
            .recoverWith {
              case th => val msg = s"failed to update DB with test result for test id ${test.id}"
                logger.error(msg, th)
                Future.failed(new Exception(msg, th))
            }
        }
          .recoverWith {
            case th => val msg = s"failed to get status of test: ${test.id} from cluster: ${test.clusterId}"
              logger.error(msg, th)
              Future.failed(new Exception(msg, th))
          }
      }
      val futureSeqOfTrys = Future.sequence(seqOfFuture.map(futureToFutureTry(_)))
      futureSeqOfTrys.map { resSeq =>
        resSeq.collect { case Success(x) => x }
      }
    }
      .recoverWith {
        case th => val msg = "not able to get running tests"
          logger.error(msg, th)
          Future.failed(new Exception(msg, th))
      }
  }

  def getTestResponseData(dryRunStatus: TestStatus, jsObj: JsValue) = {
    if (dryRunStatus == TestStatus.SUCCESSFUL) {
      (jsObj \ "results").toString
    } else if (dryRunStatus == TestStatus.FAILED) {
      (jsObj \ "cause").toString
    } else {
      "response not available. still running"
    }
  }

  private def getRuleStatusFromTestStatus(dryRunStatus: TestStatus) = {
    dryRunStatus match {
      case TestStatus.SUCCESSFUL => Constants.RULE_STATUS_TEST_SUCCESS
      case TestStatus.RUNNING => Constants.RULE_STATUS_TEST_RUNNING
      case TestStatus.SUBMITTED => Constants.RULE_STATUS_TEST_RUNNING
      case TestStatus.FAILED => Constants.RULE_STATUS_TEST_FAILED
    }
  }

  def testRun = AuthenticatedAction.async(parse.json) { request =>
    logger.info("Received test rule request")
    implicit val token = request.token.map(_.token)
    request.body
      .validate[TestData]
      .map { testData =>
        val profilerAgentUrl = urlService.getDpProfilerUrl(testData.clusterId.toLong)
        profilerAgentUrl.flatMap { profilerUrl =>

          getDSLs(testData.ruleId, testData.clusterId, testData.profilerName, testData.profilerInstance, profilerUrl).flatMap { dsls =>
            val (nameDSLs, valueDSLs) = dsls.partition(_.matchType == "name")
            val drRunRuleName = DryRunRule("nameTest", testData.nameData, nameDSLs)
            val drRunRuleValue = DryRunRule("valueTest", testData.valueData, valueDSLs)
            val cSPRuleForTest = CSPRuleForTest(testData.profilerName, testData.profilerInstance, DryRunSettings(Seq(drRunRuleName, drRunRuleValue)))
            val startTimeMilli = Instant.now().toEpochMilli
            val cspruleJson = Json.toJson(cSPRuleForTest)
            logger.info(s"printing test data for cluster ${cspruleJson.toString()}")

            launchTestRun(profilerUrl, testData, cSPRuleForTest).map { result =>
              Accepted(Json.toJson(result))
            }
              .recover(apiErrorWithLog(e => logger.error(s"test run could not start for test data ${testData.toString}", e)))

          }
            .recover(apiErrorWithLog(e => logger.error(s"failed to get dsls for rule id ${testData.ruleId}", e)))
        }
          .recover(apiErrorWithLog(e => logger.error(s"failed to get url for cluster ${testData.clusterId}", e)))
      }
      .getOrElse(Future.successful(BadRequest("not a valid test request body")))
  }

  private def launchTestRun(profilerUrl: String, testData: TestData, cSPRuleForTest: CSPRuleForTest)(implicit token: Option[String]): Future[CSPTest] = {
    val startTimeMilli = Instant.now().toEpochMilli
    profilerAgentService.launchTestRun(profilerUrl, testData.clusterId, cSPRuleForTest).flatMap { jsObj =>
      val dryRunStatus = TestStatus.withName((jsObj \ "dryRunStatus").as[String])
      val testId = (jsObj \ "id").as[Long]
      val response = getTestResponseData(dryRunStatus, jsObj)
      val cSPTest = CSPTest(nameData = testData.nameData,
        valueData = testData.valueData,
        ruleId = testData.ruleId,
        idOnProfiler = Some(testId),
        clusterId = testData.clusterId.toLong,
        startTime = Some(startTimeMilli),
        lastUpdatedTime = Some(Instant.now().toEpochMilli),
        responseData = response
      )
      cSPTestRepo.add(cSPTest).flatMap { result =>
        cspRuleRepo.updateRuleStatus(Some(testData.ruleId), getRuleStatusFromTestStatus(dryRunStatus))
          .recover {
            case th => Future.failed(WrappedErrorException(Error(500, s"test started but status of rule could " +
              s"not be updated for rule id ${testData.ruleId}. Full error message ${th.getMessage}")))
          }

        Future.successful(result)
      }
        .recoverWith {
          case th => Future.failed(WrappedErrorException(Error(500, s"test started but response could " +
            s"not be saved in db for test data ${testData.toString}. Full error message ${th.getMessage}")))
        }
    }
  }

  private def getDSLs(ruleId: Long, clusterId: String, profilerName: String, profilerInstance: String, url: String)(implicit token: Option[String]): Future[Seq[CSPDsl]] = {
    val processedDSL = cspRuleRepo.getCSPRuleById(ruleId).flatMap { ruleOption =>
      ruleOption.map { rule =>
        Json.parse(rule.dsl).validate[Seq[CSPDsl]].map { cSPDsls: Seq[CSPDsl] =>

          val resourceReferenceSeq = cSPDsls.map { dslRule =>
            findResourceReferenceInString(dslRule.dsl, 0, Seq.empty[String])
          }.flatten.distinct

          logger.info("printing resourceReferenceSeq")
          resourceReferenceSeq.foreach(logger.info(_))

          replaceReferenceWithValue(cSPDsls, url, clusterId, profilerName, resourceReferenceSeq).map { dsls =>
            logger.info("printing DSL")
            logger.info(dsls.toString)
            Success.apply(dsls)
          }.recover {
            case e => val message = s"failed to replace dsl resource id with resource url on cluster $clusterId"
              logger.error(message, e)
              Failure.apply(WrappedErrorException(Error(500, e.getMessage)))
          }
        }
          .getOrElse {
            val message = s"dsl for rule with rule id $ruleId is not valid"
            Future.successful(Failure.apply(WrappedErrorException(Error(500, message))))
          }
      }
        .getOrElse {
          val message = s"rule with rule id $ruleId not found"
          Future.successful(Failure.apply(WrappedErrorException(Error(500, message))))
        }
    }
    processedDSL.flatMap(dslAndRuleName => Future.fromTry(dslAndRuleName))
  }

  private def replaceReferenceWithValue(cSPDsls: Seq[CSPDsl], url: String, clusterId: String, profilerName: String, resourceReferenceSeq: Seq[String])(implicit token: Option[String]): Future[Seq[CSPDsl]] = {

    val (files, regexes) = resourceReferenceSeq.partition(_.startsWith(Constants.CSPRESOURCE_TYPE_FILE))
    getFilesFromReference(url, clusterId, files, profilerName).flatMap { resourceToPathMap =>
      cSPResourceRepo.getInSet(regexes).flatMap { regexResource =>
        val regexReferenceToValueMap = regexResource.map(r => (r.reference.get, r.value.get.replace("""\""","""\\"""))).toMap
        val referenceToValueMap = resourceToPathMap ++ regexReferenceToValueMap
        val newDsls = cSPDsls.map { dslRule =>
          Future.fromTry(resourceIdToValueMapping(dslRule.dsl, 0, referenceToValueMap)).map { newRule =>
            dslRule.copy(dsl = newRule)
          }
        }
        Future.sequence(newDsls).map { dsls =>
          dsls
        }
      }
    }

  }

  private def getFilesFromReference(url: String, clusterId: String, files: Seq[String], profilerName: String)(implicit token: Option[String]): Future[Map[String, String]] = {
    if(files.isEmpty){
      Future(Map.empty[String, String])
    }else {
      profilerAgentService.checkCreateNode(url, clusterId, files, profilerName)
    }
  }

  def publishCSPMetaConfig() = AuthenticatedAction.async(parse.json) { request =>

    logger.info("Received publish CSP rule request")

    implicit val token = request.token.map(_.token)

    request.body
      .validate[CSPRulePublishInfo]
      .map { cSPRulePublishInfo =>

        cspRuleRepo.getCSPRuleById(cSPRulePublishInfo.ruleId).flatMap { ruleOption =>
          ruleOption.map { rule =>

            Json.parse(rule.dsl).validate[Seq[CSPDsl]].map { cSPDsl =>

              saveCSPOnCluster(cSPRulePublishInfo, cSPDsl, rule)
            }
              .getOrElse {
                val message = s"dsl for rule with rule id ${cSPRulePublishInfo.ruleId} is not valid"
                Future.successful(BadRequest(message)) // this is not bad request as dsl was not part of request
              }
          }.getOrElse {
            val message = s"rule with rule id ${cSPRulePublishInfo.ruleId} not found"
            Future.successful(BadRequest(message)) // its not a bad request 404 must be sent instead
          }
        }.recover(apiErrorWithLog(e => logger.error(s"rule with rule id ${cSPRulePublishInfo.ruleId} not found", e)))
        // recover is catch all for all sorts of exception. above messaging is not valid for every exception.
      }
      .getOrElse {
        val message = s"publish failed for ${request.body}"
        Future.successful(BadRequest(message))
      }
  }

  private def saveCSPOnCluster(cSPRulePublishInfo: CSPRulePublishInfo, cSPDsl: Seq[CSPDsl], rule: CSPRule)(implicit token: Option[String]) = {

    val cSPMetaConfig = CSPMetaConfig(groupName = cSPRulePublishInfo.groupName, profilerInstanceName = cSPRulePublishInfo.instance, dsls = cSPDsl, true)

    var resourceRefrences = cSPResourceRepo.findResourceReferences(cSPDsl.mkString(","))

    logger.info("printing resourceIdSeq")
    resourceRefrences.foreach(logger.info(_))

    cspRuleRepo.getRuleAndClIdMapping(rule.id.get).flatMap{ ruleAndCLuster =>
      val existsOnClusters:Seq[Long] = ruleAndCLuster.map(_.cluster_id)
      val seqOfFuture = cSPRulePublishInfo.clusterIds.map { clusterId =>
        replaceReferenceAndSaveCSPOnCluster(cSPMetaConfig,
          clusterId,
          cSPRulePublishInfo.profilerId,
          cSPRulePublishInfo.instance,
          rule.name,
          cSPRulePublishInfo.resourceId,
          if(existsOnClusters.contains(clusterId.toLong)) "overwrite" else "create",
          resourceRefrences)
      }
      doMappingsAndReturnResult(seqOfFuture, rule.id)
    }
  }

  private def doMappingsAndReturnResult(seqOfFuture: Seq[Future[CSPSaveResponse]], ruleId: Option[Long]) = {
    val futureSeqOfTrys = Future.sequence(seqOfFuture.map(futureToFutureTry(_)))
    val futureSeqSuccess = futureSeqOfTrys.map { resSeq =>
      resSeq.collect { case Success(x) => x }
    }
    futureSeqSuccess.flatMap { result =>
      val successSaveResponse = result.filter(_.isSuccess)
      cspRuleRepo.insertClIdMappingAndMarkRulePublished(successSaveResponse.map(_.clusterId.toLong), ruleId.get)
        .map(dbRes => Ok(Json.toJson(result)))
    }
  }

  private def seqFutureToFutureSeqOfTry[T](seqOfFuture: Seq[Future[T]]): Future[Seq[Try[T]]] = {
    val listOfFutureTrys = seqOfFuture.map(futureToFutureTry(_))
    Future.sequence(listOfFutureTrys)
  }

  private def futureToFutureTry[T](f: Future[T]): Future[Try[T]] =
    f.map(Success(_)).recover({ case e => Failure(e) })

  private def replaceReferenceAndSaveCSPOnCluster(cSPMetaConfig: CSPMetaConfig,
                                                  clusterId: String, profilerName: String,
                                                  profilerInstance: String, ruleName: String,
                                                  resourceId: String, action: String,
                                                  resourceReferenceSeq: Seq[String])(implicit token: Option[String]): Future[CSPSaveResponse] = {


    val profilerAgentUrl = urlService.getDpProfilerUrl(clusterId.toLong)

    profilerAgentUrl.flatMap { profilerUrl =>

      replaceReferenceWithValue(cSPMetaConfig.dsls, profilerUrl, clusterId, profilerName, resourceReferenceSeq).flatMap { dsls =>
        val cspm = cSPMetaConfig.copy(dsls = dsls)
        logger.info("printing DSL to save")
        logger.info(cspm.toString)
        createOverwriteCSP(profilerUrl, clusterId, cspm, profilerName, profilerInstance, ruleName, resourceId, action)
      }.recover {
        case e => val message = s"failed to replace dsl resource id with resource url on cluster $clusterId"
          getFailureResponse(e, message, clusterId)
      }
    }.recover {
      case e => val message = s"failed to get profiler agent url for cluster $clusterId"
        getFailureResponse(e, message, clusterId)
    }

  }

  private def getFailureResponse(th: Throwable, message: String, clusterId: String) = {
    logger.error(message, th)
    val messageString = message + "with reason" + th.getLocalizedMessage
    val jsObj = Json.toJson("message" -> messageString)
    CSPSaveResponse(clusterId, jsObj, false)
  }

  private def createOverwriteCSP(profilerUrl: String,
                                 clusterId: String,
                                 cSPMetaConfig: CSPMetaConfig,
                                 profilerName: String, profilerInstance: String,
                                 ruleName: String,
                                 resourceId: String,
                                 action: String)(implicit token: Option[String]) = {
    profilerAgentService.createOverwriteCSPMetaConfig(profilerUrl, clusterId, cSPMetaConfig, profilerName, profilerInstance, ruleName, resourceId, action)
      .map(jsObj => CSPSaveResponse(clusterId, jsObj, true))
      .recover {
        case e => val message = s"$action failed for clsuter $clusterId , resource id $resourceId and rule name $ruleName"
          getFailureResponse(e, message, clusterId)
      }
  }

  private val openingTag = "<<"
  private val closingTag = ">>"
  private val cspresourcePrefix = "resources__"

  private def getOpeningAndClosingIndex(rule: String, index: Int) = {
    val openingIndex = rule.indexOf(openingTag, index)
    val closingIndex = rule.indexOf(closingTag, openingIndex + 1)
    (openingIndex, closingIndex)
  }

  @tailrec
  private def resourceIdToValueMapping(rule: String, index: Int, resourceToValueMap: Map[String, String]): Try[String] = {
    val (openingIndex, closingIndex) = getOpeningAndClosingIndex(rule, index)
    if (openingIndex == -1 || closingIndex == -1) {
      Success.apply(rule)
    } else {
      val resourceId = rule.substring(openingIndex + openingTag.length, closingIndex)
      if (resourceId.startsWith(cspresourcePrefix)) {
        val pathString = resourceToValueMap.get(resourceId)
        if (pathString.isEmpty) {
          Failure.apply(WrappedErrorException(Error(500, s" Not able to fetch path for resource $resourceId. Please check your DSL.")))
        } else {
          val pathStringWithQuotes = "\"" + pathString.get + "\""
          val newRule = rule.replace(rule.substring(openingIndex, closingIndex + closingTag.length).toCharArray, pathStringWithQuotes.toCharArray)
          resourceIdToValueMapping(newRule, closingIndex + 1, resourceToValueMap)
        }
      } else resourceIdToValueMapping(rule, closingIndex + 1, resourceToValueMap)
    }
  }

  @tailrec
  private def findResourceReferenceInString(rule: String, index: Int, resourceIds: Seq[String]): Seq[String] = {
    val (openingIndex, closingIndex) = getOpeningAndClosingIndex(rule, index)
    if (openingIndex == -1 || closingIndex == -1) {
      resourceIds
    } else {
      val resourceId = rule.substring(openingIndex + openingTag.length, closingIndex)
      if (resourceId.startsWith(cspresourcePrefix)) findResourceReferenceInString(rule, closingIndex + 1, resourceId +: resourceIds)
      else findResourceReferenceInString(rule, closingIndex + 1, resourceIds)
    }
  }

  private def findResourceReferance(str:String):Seq[String] = {
    ("(?<=<<).+?(?=>>)".r findAllIn str).mkString(",").split(",").toSet.toSeq
  }
}
