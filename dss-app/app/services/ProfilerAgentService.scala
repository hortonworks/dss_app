package services

import java.io.File

import com.hortonworks.dataplane.commons.domain.Constants.PROFILER
import com.hortonworks.dataplane.commons.domain.Entities.Error
import com.hortonworks.dataplane.cs.KnoxProxyWsClient
import com.typesafe.scalalogging.Logger
import javax.inject.{Inject, Singleton}
import java.io.FileOutputStream

import akka.stream.scaladsl.{FileIO, Source}
import controllers.JsonAPI
import models.CspEntities._
import models.JsonFormatters._
import play.api.libs.json.{JsValue, Json}
import play.api.libs.ws.{WSAuthScheme, WSResponse}
import play.api.mvc.MultipartFormData.{DataPart, FilePart}
import repo.CSPResourceRepo
import utils._

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global
import play.api.Configuration

@Singleton
class ProfilerAgentService @Inject()(val config: Configuration,
                                     val cSPResourceRepo: CSPResourceRepo,
                                     ws: KnoxProxyWsClient) extends JsonAPI {
  val logger = Logger(classOf[ProfilerAgentService])

  private def httpHandler(res: WSResponse): Future[JsValue] = {
    res.status match {
      case 200 => Future.successful(res.json)
      case 204 => Future.successful(Json.obj("success" -> true))
      case 400 => Future.failed(BadRequestException(Error(400, s"Error from profiler. Bad Request: Received ${res.status}. Body ${res.body}")))
      case 401 => Future.failed(AuthenticationException(Error(401, s"Error from profiler.  Authentication unsuccessfull: Received ${res.status}. Body ${res.body}")))
      case 403 => Future.failed(ForbiddenException(Error(403, s"Error from profiler.  Forbidden : Received ${res.status}. Body ${res.body}")))
      case 404 => Future.failed(NotFoundException(Error(404, s"Error from profiler.  Not Found : Received ${res.status}. Body ${res.body}")))
      case 408 => Future.failed(RequestTimeoutException(Error(408, s"Error from profiler. Request Timed Out : Received ${res.status}. Body ${res.body}")))
      case 502 => Future.failed(BadGatewayException(Error(502, s"Error from profiler. Bad Gateway : Received ${res.status}. Body ${res.body}")))
      case 504 => Future.failed(GatewayTimeoutException(Error(504, "Error from profiler. Gateway Timeout: Received ${res.status}. Body ${res.body}")))
      case _ => Future.failed(WrappedErrorException(Error(500, s"Error from profiler. Unexpected error: Received ${res.status}. Body ${res.body}", s"${res.status}")))
    }
  }

  def saveAssetColumnTags(url: String, clusterId: String, body: JsValue)(implicit token: Option[String]): Future[JsValue] = {
    ws.url(s"$url/assets/tags", clusterId.toLong, PROFILER)
      .withToken(token)
      .withAuth("admin", "admin", WSAuthScheme.BASIC)
      .withHeaders("Accept" -> "application/json")
      .post(body).flatMap(httpHandler)
  }

  def updateProfilerConfiguration(url: String, clusterId: String, profilerConfig: JsValue)(implicit token: Option[String]): Future[JsValue] = {
    ws.url(s"$url/profilerinstanceswithselectorconfig", clusterId.toLong, PROFILER)
      .withToken(token)
      .withAuth("admin", "admin", WSAuthScheme.BASIC)
      .withHeaders("Accept" -> "application/json")
      .put(profilerConfig).flatMap(httpHandler)
  }

  def bulkUpdateProfilerConfigurations(url: String, clusterId: String, profilerConfigs: JsValue)(implicit token: Option[String]): Future[JsValue] = {
    ws.url(s"$url/profilerinstanceswithselectorconfig/bulk", clusterId.toLong, PROFILER)
      .withToken(token)
      .withAuth("admin", "admin", WSAuthScheme.BASIC)
      .withHeaders("Accept" -> "application/json")
      .put(profilerConfigs).flatMap(httpHandler)
  }

  def createOverwriteCSPMetaConfig(url: String, clusterId: String, cSPMetaConfig: CSPMetaConfig, profilerName: String, profilerInstance: String, ruleName: String, id: String, action: String)(implicit token: Option[String]): Future[JsValue] = {
    val urlToHit = s"$url/metaconfig/$action?profilerId=$profilerName&id=$id&nodeName=$ruleName&instance=$profilerInstance"
    ws.url(urlToHit, clusterId.toLong, PROFILER)
      .withToken(token)
      .withAuth("admin", "admin", WSAuthScheme.BASIC)
      .withHeaders("Accept" -> "application/json",
        "Content-Type" -> "text/plain")
      .put(Json.toJson(cSPMetaConfig)).flatMap(httpHandler)
  }

  def deleteCSPMetaConfig(url: String, clusterId: String, ruleName: String)(implicit token: Option[String]): Future[JsValue] = {
    val urlToHit = s"$url/metaconfig/delete?profilerId=sensitive_info_profiler&id=dsl&instance=sensitiveinfo&nodeName=$ruleName"
    ws.url(urlToHit, clusterId.toLong, PROFILER)
      .withToken(token)
      .withAuth("admin", "admin", WSAuthScheme.BASIC)
      .withHeaders("Accept" -> "application/json",
        "Content-Type" -> "text/plain")
      .delete().flatMap{ res =>
      res.status match {
        case 200 => Future.successful(Json.obj("success" -> res.body.toString))
        case _ => httpHandler(res)
      }
    }
  }

  def launchTestRun(url: String, clusterId: String, cSPRuleForTest: CSPRuleForTest)(implicit token: Option[String]): Future[JsValue] = {
    ws.url(s"$url/dryrun/launch", clusterId.toLong, PROFILER)
      .withToken(token)
      .withAuth("admin", "admin", WSAuthScheme.BASIC)
      .withHeaders("Accept" -> "application/json")
      .post(Json.toJson(cSPRuleForTest)).flatMap(httpHandler)
  }

  def getTestRunStatus(url: String, clusterId: String, testId: Long)(implicit token: Option[String]): Future[JsValue] = {
    ws.url(s"$url/dryrun/$testId", clusterId.toLong, PROFILER)
      .withToken(token)
      .withAuth("admin", "admin", WSAuthScheme.BASIC)
      .withHeaders("Accept" -> "application/json")
      .get().flatMap(httpHandler)
  }

  def checkCreateNode(url: String, clusterId: String, fileNames: Seq[String], profilerName: String)(implicit token: Option[String]): Future[Map[String, String]] = {

    val node = getNodeFromFileNames(fileNames, profilerName)

    checkNodeExistence(url, clusterId, node)
      .flatMap { jsObject =>

        jsObject.validate[Node].map { nd =>

          val (nonExistentFileNamesAsArray, existentFilesNameAndPathAsMap) = seggregateFilesOnExistenceOnCluster(nd)
          createNonExistentNodeAndGetPath(url, clusterId, nonExistentFileNamesAsArray, profilerName).map { fileAndPath =>
            existentFilesNameAndPathAsMap ++ fileAndPath.toMap
          }

        }
          .getOrElse {
            Future.failed(WrappedErrorException(Error(500, s"Unexpected error: Profiler-agent did not return expected response. Response is  ${jsObject}.")))
          }
      }
  }

  def seggregateFilesOnExistenceOnCluster(node: Node) = {

    val nonExistentFileNamesAsArray = scala.collection.mutable.ArrayBuffer.empty[String]

    val existentFilesNameAndPathAsMap = node.nodes.map { contextNode =>
      val nodeExists = contextNode.isExists.getOrElse(false)
      if (!nodeExists) nonExistentFileNamesAsArray += contextNode.nodeName
      val path = if (nodeExists) (contextNode.metaData.get \ "path").as[String] else ""
      (contextNode.nodeName, path)
    }.toMap

    (nonExistentFileNamesAsArray, existentFilesNameAndPathAsMap)
  }

  def getNodeFromFileNames(fileNames: Seq[String], profilerName: String) = {

    val contextNodes = fileNames.map { fileName =>
      val context = Context(profilerName, "files")
      ContextNode(context, fileName)
    }
    Node(contextNodes)

  }

  def getFileNameAndContent(fileNames: Seq[String]) = {
    cSPResourceRepo.getInSet(fileNames).map { filerosources =>
      filerosources.map { fr =>
        val tempFile = File.createTempFile(fr.reference.get, ".text")
        val fos = new FileOutputStream(tempFile)
        fos.write(fr.fileContent)
        (fr.reference.get, tempFile)
      }
    }
  }

  def createNonExistentNodeAndGetPath(url: String, clusterId: String, fileNames: Seq[String], profilerName: String)(implicit token: Option[String]): Future[Seq[(String, String)]] = {
    val fileNameAndContentMap = getFileNameAndContent(fileNames)
    fileNameAndContentMap.flatMap { filesAndContents =>
      Future.sequence(filesAndContents.map { fileAndContent =>
        createResourceNode(url, clusterId, profilerName, fileAndContent._1, fileAndContent._2, "files").map { jsVal =>
          (fileAndContent._1, (jsVal \ "path").as[String])
        }
      })
    }
  }

  def createResourceNode(url: String, clusterId: String, profilerName: String, fileName: String, file: File, id: String)(implicit token: Option[String]) = {
    val list = FilePart("metafile", "metafile", Option("text/plain"), FileIO.fromPath(file.toPath)) :: DataPart("name", "metafile") :: List()
    val slist = Source(list)
    ws.url(s"$url/metaconfig/upload?profilerId=${profilerName}&id=$id&nodeName=${fileName}", clusterId.toLong, PROFILER)
      .withToken(token)
      .withAuth("admin", "admin", WSAuthScheme.BASIC)
      .withHeaders("Accept" -> "application/json")
      .post(slist).flatMap(httpHandler)
  }

  def checkNodeExistence(url: String, clusterId: String, node: Node)(implicit token: Option[String]): Future[JsValue] = {
    ws.url(s"$url/metaconfig/info", clusterId.toLong, PROFILER)
      .withToken(token)
      .withAuth("admin", "admin", WSAuthScheme.BASIC)
      .withHeaders("Accept" -> "application/json")
      .post(Json.toJson(node)).flatMap(httpHandler)
  }

}
