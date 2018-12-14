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

package services

import java.util.concurrent.atomic.AtomicInteger
import javax.inject.Inject

import com.hortonworks.dataplane.commons.domain.Atlas.{AtlasAttribute, AtlasEntities, AtlasFilter, AtlasSearchQuery, Entity}
import com.hortonworks.dataplane.commons.domain.Constants.ATLAS
import com.hortonworks.dataplane.commons.domain.Entities.{Error, HJwtToken, WrappedErrorException}
import com.hortonworks.dataplane.cs.KnoxProxyWsClient
import com.typesafe.config.Config
import com.typesafe.scalalogging.Logger
import models.AtlasEntities.{AtlasBasicSearchQueryParams, AtlasClassification}
import models.JsonFormatters._
import play.api.libs.json.{JsValue, Json}
import play.api.libs.ws.{WSAuthScheme, WSResponse}

import scala.concurrent.{Future, Promise}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.util.{Failure, Success, Try}

class AtlasService @Inject()(
                              val config: Config,
                              val urlService: UrlService,
                              val credentialInterface: CredentialInterface
                            )(implicit ws: KnoxProxyWsClient) {
  val logger = Logger(classOf[AtlasService])

  private def httpHandler(res: WSResponse): JsValue = {
    res.status match {
      case 200 => res.json
      case 204 => Json.obj("success" -> true, "code" -> 204)
      case _ => throw WrappedErrorException(Error(500, s"Unexpected error from Atlas: Received ${res.body}", s"${res.status}"))
    }
  }

  import scala.collection.JavaConverters._
  private val defaultAttributes =
    config
      .getObjectList("dp.services.atlas.atlas.common.attributes")
      .asScala
      .map { it => Json.obj("name" -> it.toConfig.getString("name"), "dataType" -> it.toConfig.getString("dataType")) }
  private val lowerCaseQueries = Try(config.getBoolean("dp.services.atlas.lower.case.queries")).getOrElse(false)
  private val filterDeletedEntities = Try(config.getBoolean("dp.services.atlas.filter.deleted.entities")).getOrElse(true)
  private val hiveBaseQuery = Try(config.getString("dp.services.atlas.hive.search.query.base")).getOrElse("hive_table")
  private val includedTypes = config.getStringList("dp.services.atlas.hive.accepted.types").asScala.toSet
  private val defaultLimit = Try(config.getInt("atlas.query.records.default.limit")).getOrElse(10000)
  private val defaultOffset = Try(config.getInt("atlas.query.records.default.offset")).getOrElse(0)

  private val buildKV: JsValue => Option[Map[String, String]] = (cE: JsValue) => {
    (cE \ "attributes")
      .asOpt[Map[String, JsValue]]
      .map {_.collect {
        case (key, value) if value.asOpt[String].isDefined => (key, value.as[String])
        case (key, value) if value.asOpt[Long].isDefined => (key, value.toString())
      }}
  }
  private val entityJsonToAtlasEntity : JsValue => AtlasEntities = (json: JsValue) => {
//    logger.info(s"response json - $json")
    (json \ "entities").asOpt[Seq[JsValue]]
      .map { _.collect {
        case cEntity: JsValue if filterDeletedEntities && (cEntity \ "status").as[String] != "DELETED" => Entity(
          typeName = (cEntity \ "typeName").asOpt[String],
          attributes = buildKV(cEntity),
          guid = (cEntity \ "guid").asOpt[String],
          status = (cEntity \ "status").asOpt[String],
          displayText = (cEntity \ "displayText").asOpt[String],
          tags = (cEntity \ "classificationNames").asOpt[Seq[String]],
          datasetId = None,
          datasetName = None)
      }}
      .map(entities => AtlasEntities(Option(entities.toList)))
      .getOrElse(AtlasEntities(None))
  }

  def basicSearch (clusterId: String, body:AtlasBasicSearchQueryParams)(implicit token: Option[HJwtToken]): Future[AtlasEntities] = {
    for {
      urls <- urlService.getAtlasUrl(clusterId.toLong)
      cred <- credentialInterface.getCredential("DPSPlatform.credential.atlas")
      results <- requestUrlsSequentially(urls, (url: String) => {
          logger.info(s"atlas basic search with params ${Json.toJson(body)}")
          ws.url(s"$url/api/atlas/v2/search/basic", clusterId.toLong, ATLAS)
            .withToken(token.map(_.token))
            .withAuth(cred.user.getOrElse("admin"), cred.pass.getOrElse("admin"), WSAuthScheme.BASIC)
            .withHeaders("Accept" -> "application/json")
            .post(Json.toJson(body))
        })
        .map(httpHandler)
        .map(entityJsonToAtlasEntity(_))
    } yield results
  }

  def query(urls: Set[String], clusterId: String, username: String, password: String, query: AtlasSearchQuery)(implicit token: Option[String]): Future[AtlasEntities] = {

    val queryActive = query.copy(atlasFilters = query.atlasFilters :+ AtlasFilter(AtlasAttribute("__state", "string"), "equals", "ACTIVE"));

    val q = s"$hiveBaseQuery ${Filters.query(queryActive, lowerCaseQueries)}"

    firstRespOfParallelReqs(
      urls,
      (url: String) =>
        ws.url(s"$url/api/atlas/v2/search/dsl", clusterId.toLong, ATLAS)
          .withToken(token)
          .withAuth(username, password, WSAuthScheme.BASIC)
          .withHeaders(
            "Content-Type" -> "application/json",
            "Accept" -> "application/json"
          )
          .withQueryString("query" -> q, "offset" -> query.offset.getOrElse(defaultOffset).toString, "limit" -> query.limit.getOrElse(defaultLimit).toString)
          .get()
    )
      .map(httpHandler)
      .map (entityJsonToAtlasEntity(_))
        //AtlasEntities
  }

  def getEntity(urls: Set[String], clusterId: String, username: String, password: String, guid: String)(implicit token: Option[String]): Future[JsValue] = {
    firstRespOfParallelReqs(
      urls,
      (url: String) =>
        ws.url(s"$url/api/atlas/v2/entity/guid/$guid", clusterId.toLong, ATLAS)
          .withToken(token)
          .withAuth(username, password, WSAuthScheme.BASIC)
          .withHeaders("Accept" -> "application/json")
          .get()
    )
      .map(httpHandler)
    //AtlasEntityWithExtInfo > {entity: {AtlasEntity}}
  }

  def getEntities(urls: Set[String], clusterId: String, username: String, password: String, guids: Seq[String])(implicit token: Option[String]): Future[JsValue] = {
    firstRespOfParallelReqs(
      urls,
      (url: String) =>
        ws.url(s"$url/api/atlas/v2/entity/bulk", clusterId.toLong, ATLAS)
          .withToken(token)
          .withAuth(username, password, WSAuthScheme.BASIC)
          .withHeaders("Accept" -> "application/json")
          .withQueryString(guids.map(guid => ("guid", guid)): _*)
          .get()
    )
      .map(httpHandler)
    //AtlasEntitiesWithExtInfo > {entities: [{AtlasEntity}]}
  }

  def getTypes(urls: Set[String], clusterId: String, username: String, password: String, defType: String) (implicit token: Option[String]): Future[JsValue] = {
    firstRespOfParallelReqs(
      urls,
      (url: String) =>
        ws.url(s"$url/api/atlas/v2/types/typedefs", clusterId.toLong, ATLAS)
          .withToken(token)
          .withAuth(username, password, WSAuthScheme.BASIC)
          .withQueryString("type" -> defType)
          .withHeaders("Accept" -> "application/json")
          .get()
    )
      .map(httpHandler)
    //AtlasTypesDef: {enumDefs: [], structDefs: {}, classificationDefs: [], entityDefs: []}
  }

  def getEntityTypes(urls: Set[String], clusterId: String, username: String, password: String, name: String)(implicit token: Option[String]): Future[Seq[JsValue]] = {
    val typeOfDef = "entitydef"
    firstRespOfParallelReqs(
      urls,
      (url: String) =>
        ws.url(s"$url/api/atlas/v2/types/$typeOfDef/name/$name", clusterId.toLong, ATLAS)
          .withToken(token)
          .withAuth(username, password, WSAuthScheme.BASIC)
          .withHeaders("Accept" -> "application/json")
          .get()
    )
      .map(httpHandler)
      .map { json =>
        //AtlasEntityDef: {attributeDefs: [AtlasAttributeDef]}

        val attributes = (json \ "attributeDefs").as[Seq[JsValue]]
        //Seq[AtlasAttributeDef]

        val sAttributes =
          attributes
            .filter(cAttribute => includedTypes.contains((cAttribute \ "typeName").as[String]))
            .map(cAttribute => Json.obj("name" -> (cAttribute \ "name").as[String], "dataType" -> (cAttribute \ "typeName").as[String]))

        sAttributes.toList ++ defaultAttributes
        //Seq[AtlasAttribute(name: String, dataType: String)]: Seq[{name, typeName}]
      }
  }

  def getLineage(urls: Set[String], clusterId: String, username: String, password: String, guid: String, depth: Option[String])(implicit token: Option[String]): Future[JsValue] = {
    firstRespOfParallelReqs(
      urls,
      (url: String) => {
        val infiniteDepth = 0
        ws.url(s"$url/api/atlas/v2/lineage/$guid", clusterId.toLong, ATLAS)
          .withToken(token)
          .withAuth(username, password, WSAuthScheme.BASIC)
          .withQueryString("depth" -> depth.getOrElse(infiniteDepth).toString, "direction" -> "BOTH")
          .withHeaders("Accept" -> "application/json")
          .get()
      }
    )
      .map(httpHandler)
    //AtlasLineageInfo: {baseEntityGuid, lineageDirection, lineageDepth, guidEntityMap, relations}
  }

  def postClassifications(urls: Set[String], clusterId: String, username: String, password: String, guid: String
                          , classifications: Seq[AtlasClassification]) (implicit token: Option[String]): Future[JsValue] = {
    requestUrlsSequentially(
      urls,
      (url: String) =>{
        logger.info(s"request to post classifications for guid $guid. url=$url/api/atlas/v2/entity/guid/$guid/classifications")
        ws.url(s"$url/api/atlas/v2/entity/guid/$guid/classifications", clusterId.toLong, ATLAS)
          .withToken(token)
          .withAuth(username, password, WSAuthScheme.BASIC)
          .withHeaders("Accept" -> "application/json")
          .post(Json.toJson(classifications))
      }
    )
      .map(httpHandler)
    //AtlasTypesDef: {enumDefs: [], structDefs: {}, classificationDefs: [], entityDefs: []}
  }

  def putClassifications(urls: Set[String], clusterId: String, username: String, password: String, guid: String
                         , classifications: Seq[AtlasClassification]) (implicit token: Option[String]): Future[JsValue] = {
    requestUrlsSequentially(
      urls,
      (url: String) => {
        logger.info(s"request to put classifications for guid $guid. url=$url/api/atlas/v2/entity/guid/$guid/classifications")
        ws.url(s"$url/api/atlas/v2/entity/guid/$guid/classifications", clusterId.toLong, ATLAS)
          .withToken(token)
          .withAuth(username, password, WSAuthScheme.BASIC)
          .withHeaders("Accept" -> "application/json")
          .put(Json.toJson(classifications))
      }
    )
      .map(httpHandler)
    //AtlasTypesDef: {enumDefs: [], structDefs: {}, classificationDefs: [], entityDefs: []}
  }

  def deleteClassification(urls: Set[String], clusterId: String, username: String, password: String, guid: String
                            , classificationName: String) (implicit token: Option[String]): Future[JsValue] = {
    requestUrlsSequentially(
      urls,
      (url: String) => {
        logger.info(s"request to delete classification $classificationName on entity $guid. url=$url/api/atlas/v2/entity/guid/$guid/classification/$classificationName")
        ws.url(s"$url/api/atlas/v2/entity/guid/$guid/classification/$classificationName", clusterId.toLong, ATLAS)
          .withToken(token)
          .withAuth(username, password, WSAuthScheme.BASIC)
          .withHeaders("Accept" -> "application/json")
          .delete()
      }
    )
      .map(httpHandler)
    //AtlasTypesDef: {enumDefs: [], structDefs: {}, classificationDefs: [], entityDefs: []}
  }

  private def firstRespOfParallelReqs(urls: Set[String], fn: (String) => Future[WSResponse]) = {
    val p = Promise[WSResponse]()
    urls.size match {
      case 0 => p.tryFailure(WrappedErrorException(Error(500, "No URLs available for Atlas.", "cluster.http.atlas.configuration")))
      case _ => {
        val remaining = new AtomicInteger(urls.size)
        urls
          .map(fn(_))
          .foreach {
            _.onComplete { result =>
              //  decrement by 1
              remaining.decrementAndGet()

              result match {
                case Success(response) if(response.status == 200) => p.trySuccess(response)
                case _ => if (remaining.get() == 0 && p.isCompleted == false) p.tryComplete(result)
              }
            }
          }
      }
    }
    p.future
  }

  private def requestUrlsSequentially(urls: Set[String], fn: (String) => Future[WSResponse]) = {
    val p = Promise[WSResponse]()
    urls.size match {
      case 0 => p.tryFailure(WrappedErrorException(Error(500, "No URLs available for Atlas.", "cluster.http.atlas.configuration")))
      case _ => retry(urls.toList, fn, p)
    }
    p.future
  }

  private def retry(urls: List[String], fn: (String) => Future[WSResponse], p:Promise[WSResponse]): Unit = {
    fn(urls.head)
      .onComplete{ result =>
        logger.info(s"Response.status=${result.map(_.status).getOrElse(0)}")
        result match {
          case Success(response) if (response.status >= 200 && response.status < 300) =>   p.trySuccess(response)
          case _ =>
            if (urls.tail.nonEmpty) retry(urls.tail, fn, p)
            else p.tryComplete(result)
        }
      }
  }
}