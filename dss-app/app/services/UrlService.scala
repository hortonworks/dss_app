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

import java.net.URL
import java.util.concurrent.TimeUnit

import javax.inject.{Inject, Singleton}
import com.google.common.base.Supplier
import com.google.common.cache.{CacheBuilder, CacheLoader, LoadingCache}
import com.google.inject.name.Named
import com.hortonworks.dataplane.commons.domain.Ambari.ClusterServiceWithConfigs
import com.hortonworks.dataplane.commons.domain.Constants
import com.hortonworks.dataplane.commons.service.api.ServiceNotFound
import com.hortonworks.dataplane.db.Webservice.{ClusterComponentService, ClusterHostsService}
import com.hortonworks.dataplane.commons.domain.Entities.{ClusterService => CS}
import com.typesafe.scalalogging.Logger
import play.api.Configuration
import play.api.libs.json.JsObject

import scala.concurrent.{ExecutionContext, Future}
import scala.util.Try

@Singleton
class UrlService @Inject()(
                            @Named("clusterComponentService") private val clusterComponentService: ClusterComponentService,
                            @Named("clusterHostsService") private val clusterHostsService: ClusterHostsService,
                            private val config: Configuration)(implicit ec: ExecutionContext
){

  private lazy val log = Logger(classOf[UrlService])

  // The time for which the cluster-supplier mapping should be help in memory
  private val cacheExpiry =
    Try(config.underlying.getInt("dp.services.cluster.atlas.proxy.cache.expiry.secs"))
      .getOrElse(600)

  private val clusterAtlasSupplierCache = CacheBuilder
    .newBuilder()
    .expireAfterAccess(cacheExpiry, TimeUnit.SECONDS)
    .build(
      new AtlasURLSupplierCacheLoader(clusterComponentService,
        clusterHostsService)).asInstanceOf[LoadingCache[Long,Future[Set[URL]]]]

  private val clusterDpProfilerSupplierCache = CacheBuilder
    .newBuilder()
    .expireAfterAccess(cacheExpiry, TimeUnit.SECONDS)
    .build(
      new DpProfilerURLSupplierCacheLoader(clusterComponentService,
        clusterHostsService)).asInstanceOf[LoadingCache[Long,Future[URL]]]

  def getAtlasUrl(clusterId:Long): Future[Set[String]] = {
    val atlasUrl =
      clusterAtlasSupplierCache
        .get(clusterId)
        .map {urlSet =>
          log.info(s"Discovered Atlas URLs: $urlSet") // Discovered Atlas URLs: Set(http://xxx.xx.xx.xxx:21000)
          urlSet.map(_.toString)
        }

    // Make sure We evict on failure
    atlasUrl.onFailure {
      case th:Throwable =>
        log.error("Cannot load Atlas Url",th)
        log.info(s"Invalidating any entries for cluster id -  ${clusterId}")
        clusterAtlasSupplierCache.invalidate(clusterId)
    }
    atlasUrl
  }

  def getDpProfilerUrl(clusterId:Long): Future[String] = {
    val dpProfilerUrl =
      clusterDpProfilerSupplierCache
        .get(clusterId)
        .map {url =>
          log.info(s"Discovered DpProfiler URL: $url")
          url.toString
        }

    // Make sure We evict on failure
    dpProfilerUrl.onFailure {
      case th:Throwable =>
        log.error("Cannot load DpProfiler Url",th)
        log.info(s"Invalidating any entries for cluster id -  ${clusterId}")
        clusterDpProfilerSupplierCache.invalidate(clusterId)
    }
    dpProfilerUrl
  }
}

sealed class AtlasURLSupplierCacheLoader(
                                     private val clusterComponentService: ClusterComponentService,
                                     private val clusterHostsService: ClusterHostsService)(implicit ec: ExecutionContext)
  extends CacheLoader[Long, Future[Set[URL]]]() {

  private lazy val log = Logger(classOf[AtlasURLSupplierCacheLoader])

  override def load(key: Long): Future[Set[URL]] = {
    log.info(s"Loading a URL supplier into cache, URL's for cluster-id:$key")
    val supplier = new AtlasURLSupplier(key, clusterComponentService, clusterHostsService)
    supplier.get()
  }
}

sealed class DpProfilerURLSupplierCacheLoader(
                                     private val clusterComponentService: ClusterComponentService,
                                     private val clusterHostsService: ClusterHostsService)(implicit ec: ExecutionContext)
  extends CacheLoader[Long, Future[URL]]() {

  private lazy val log = Logger(classOf[DpProfilerURLSupplierCacheLoader])

  override def load(key: Long): Future[URL] = {
    log.info(s"Loading a URL supplier into cache, URL's for cluster-id:$key")
    val supplier = new DpProfilerURLSupplier(key, clusterComponentService, clusterHostsService)
    supplier.get()
  }
}

private sealed class AtlasURLSupplier(
                                       clusterId: Long,
                                       clusterComponentService: ClusterComponentService,
                                       clusterHostsService: ClusterHostsService)(implicit ec: ExecutionContext)
  extends Supplier[Future[Set[URL]]] {

  private lazy val log = Logger(classOf[AtlasURLSupplier])

  def getAtlasUrlStrFromConfig(service: CS): Future[Set[URL]] = Future.successful {

    val configsAsList =
      (service.properties.get \ "properties").as[List[JsObject]]
    val atlasConfig = configsAsList.find(obj =>
      (obj \ "type").as[String] == "application-properties")
    if (atlasConfig.isEmpty)
      throw ServiceNotFound("No properties found for Atlas")
    val properties = (atlasConfig.get \ "properties").as[JsObject]
    val apiUrl = (properties \ "atlas.rest.address").as[String]
    val urlList = apiUrl.split(",").map(_.trim)
    urlList.map(new URL(_)).toSet
  }

  override def get(): Future[Set[URL]] = {

    log.info("Fetching the Atlas URL from storage")
    val f = for {
      epConfigs <- getEndPointConfigsOrThrowException(clusterId)
      urlSet <- getAtlasUrlStrFromConfig(epConfigs)
      atlasUrls <- constructUrlObjs(urlSet, clusterId)
    } yield atlasUrls

    // Its important to complete this future before caching it
    for {
      intF <- f
      url <- Future.successful(intF)
    } yield url
  }

  private def getEndPointConfigsOrThrowException(clusterId: Long) = {
    clusterComponentService
      .getServiceByName(clusterId, Constants.ATLAS)
      .map {
        case Right(endpoints) => endpoints
        case Left(errors) =>
          throw new Exception(errors.firstMessage.toString)
      }
  }

  def constructUrlObjs(urlSet: Set[URL], clusterId: Long): Future[Set[URL]] = {

    val urlObjsSet = urlSet.map( s =>
      clusterHostsService
        .getHostByClusterAndName(clusterId, s.getHost)
        .map {
          case Right(host) =>
            new URL(
              s"${s.getProtocol}://${host.ipaddr}:${s.getPort}")
          case Left(errors) =>
            throw new Exception(
              s"Cannot translate the atlas hostname ${s.getHost} into an IP address $errors")
        })

    Future.sequence(urlObjsSet)
  }

}

private sealed class DpProfilerURLSupplier(
                                            clusterId: Long,
                                            clusterComponentService: ClusterComponentService,
                                            clusterHostsService: ClusterHostsService)(implicit ec: ExecutionContext)
  extends Supplier[Future[URL]] {

  private lazy val log = Logger(classOf[DpProfilerURLSupplier])

  override def get(): Future[URL] = {
    log.info("Fetching DPProfiler info from the configs")
    val serviceConfigs = getConfigOrThrowException(clusterId)
    serviceConfigs.flatMap(configs => getUrlFromConfig(configs))
  }

  def getUrlFromConfig(service: ClusterServiceWithConfigs): Future[URL] = Future.successful {
    val host = service.servicehost
    val configsAsList = service.configProperties.get.properties
    val profilerConfig = configsAsList.find(obj =>
      obj.`type` == "dpprofiler-env")
    if (profilerConfig.isEmpty)
      throw ServiceNotFound("No properties found for DpProfiler")
    val properties = profilerConfig.get.properties
    val port = properties("dpprofiler.http.port")
    val dpProfilerUrl = s"http://$host:$port"
    log.info(s"Constructed Profiler Agent URL => ${dpProfilerUrl}")
    new URL(s"http://$host:$port")
  }

  private def getConfigOrThrowException(clusterId: Long) = {
    clusterComponentService.getEndpointsForCluster(clusterId, "DPPROFILER").map {
      case Right(endpoints) => endpoints
      case Left(errors) =>
        throw ServiceNotFound(
          s"Could not get the service Url from storage - $errors")
    }.recover{
      case e: Throwable =>
        throw ServiceNotFound(
          s"Could not get the service Url from storage - ${e.getMessage}")
    }
  }
}
