package controllers

import java.time.LocalDateTime

import com.hortonworks.dataplane.commons.auth.AuthenticatedAction
import com.hortonworks.dataplane.commons.domain.Entities.Error
import commons.Constants
import javax.inject.Inject
import models.CspEntities._
import models.JsonFormatters._
import models.UserEntities.DssUser
import play.api.Logger
import play.api.libs.json.Json
import play.api.mvc.Controller
import repo.{CSPResourceRepo, CSPRuleRepo, ClassificationRepo}
import services.{ProfilerAgentService, UrlService}
import utils.WrappedErrorException

import scala.annotation.tailrec
import scala.concurrent.Future
import scala.util.{Failure, Success, Try}
import scala.concurrent.ExecutionContext.Implicits.global


class CSPResources @Inject()(cspRuleRepo: CSPRuleRepo,
                           classificationRepo: ClassificationRepo,
                           val cSPResourceRepo: CSPResourceRepo,
                           val profilerAgentService: ProfilerAgentService,
                           val urlService: UrlService) extends Controller with JsonAPI {

  private val logger = Logger(classOf[CustomSenstivityProfiler])

  def createNonFileResource() = AuthenticatedAction.async(parse.json) { request =>
    logger.info("Received create non file request")
    request.body
      .validate[CSPResource]
      .map { cSPResource =>
        cSPResourceRepo
          .add(cSPResource, new DssUser(request.user))
          .map(resource => Created(Json.toJson(resource)))
          .recover(withLogAndApiError("Create non-file resource failed"))
      }
      .getOrElse(Future.successful(BadRequest("Not a valid resource object")))
  }

  def createFileResource = AuthenticatedAction.async(parse.multipartFormData) { request =>
    logger.info("Received add look up file request")
    logger.info(request.body.toString)
    val dataparts = request.body.dataParts
    val fileName = dataparts.get("name")
    if (fileName.isDefined && !fileName.get.isEmpty) {
      request.body.file("metafile").map { metafile =>
        val fileToByteArray = java.nio.file.Files.readAllBytes(metafile.ref.file.toPath)
        cSPResourceRepo.add(
            CSPResource(`type` = "file", name = fileName.get.head.trim, fileContent = fileToByteArray)
            , new DssUser(request.user)
        )
        .map { resource => Created(Json.toJson(resource.copy(fileContent = Array[Byte]()))) }
        .recover(withLogAndApiError("file resource creation failed"))
      }
      .getOrElse {
        Future.successful(BadRequest("file was missing"))
      }
    } else {
      Future.successful(BadRequest("file name was missing"))
    }
  }

  def updateResource() = AuthenticatedAction.async(parse.json) { request =>
    logger.info("Received update resource request")
    //TODO check before update if resource is part of any published rule
    request.body
      .validate[CSPResource]
      .map { cSPResource =>
        cSPResourceRepo
          .update(cSPResource, new DssUser(request.user))
          .map(resource => Created(Json.toJson(resource)))
          .recover(withLogAndApiError("Update resource failed"))
      }
      .getOrElse(Future.successful(BadRequest("Not a valid resource object")))
  }

  def getResources(resourceType: Option[String], displayName: Option[String]) = AuthenticatedAction.async { request =>
    logger.info("Received get resources request")
    cSPResourceRepo.getAll(resourceType, displayName)
      .map { resList =>
        val finalList = resList.map{ res =>
          res.copy(fileContent =  Array[Byte]())
        }
        Ok(Json.toJson(finalList))
      }
      .recover(withLogAndApiError("failed to get list of resources"))
  }

  def deleteResource(resId:Long) = AuthenticatedAction.async { request =>
    logger.info("Received delete resource request")
    cSPResourceRepo
      .deleteById(resId)
      .map{count => NoContent}
      .recover(withLogAndApiError("Delete resource request failed"))
  }

}
