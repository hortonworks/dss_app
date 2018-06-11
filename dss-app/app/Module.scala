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

import com.google.inject.{AbstractModule, Inject, Provides, Singleton}
import java.util
import java.util.Optional

import com.google.inject.name.Named
import com.hortonworks.dataplane.db._
import com.hortonworks.dataplane.db.Webservice._
import play.api.{Configuration, Logger}
import play.api.libs.ws.WSClient
import com.hortonworks.datapalane.consul._
import com.hortonworks.dataplane.commons.metrics.MetricsRegistry
import com.hortonworks.dataplane.cs._


/**
 * This class is a Guice module that tells Guice how to bind several
 * different types. This Guice module is created when the Play
 * application starts.

 * Play will automatically use any class called `Module` that is in
 * the root package. You can create modules in other locations by
 * adding `play.modules.enabled` settings to the `application.conf`
 * configuration file.
 */
class Module extends AbstractModule {

  def configure() = {
    bind(classOf[ConsulInitializer]).asEagerSingleton()

    bind(classOf[MetricsRegistry]).toInstance(MetricsRegistry("dss-app"))
  }

  @Provides
  @Singleton
  @Named("userService")
  def provideUserService(implicit ws: WSClient, configuration: Configuration): UserService = {
    new UserServiceImpl(configuration.underlying)
  }

  @Provides
  @Singleton
  @Named("dpClusterService")
  def provideDpClusterService(implicit ws: WSClient, configuration: Configuration): DpClusterService = {
    new DpClusterServiceImpl(configuration.underlying)
  }

  @Provides
  @Singleton
  @Named("dataSetService")
  def provideDataSetService(implicit ws: WSClient, configuration: Configuration): DataSetService = {
    new DataSetServiceImpl(configuration.underlying)
  }

  @Provides
  @Singleton
  @Named("dataAssetService")
  def provideDataAssetService(implicit ws: WSClient,configuration: Configuration): DataAssetService = {
    new DataAssetServiceImpl(configuration.underlying)
  }

  @Provides
  @Singleton
  @Named("categoryService")
  def provideCategoryService(implicit ws: WSClient, configuration: Configuration): CategoryService = {
    new CategoryServiceImpl(configuration.underlying)
  }

  @Provides
  @Singleton
  @Named("dataSetCategoryService")
  def provideDataSetCategoryService(implicit ws: WSClient, configuration: Configuration): DataSetCategoryService = {
    new DataSetCategoryServiceImpl(configuration.underlying)
  }

  @Provides
  @Singleton
  @Named("atlasService")
  def provideAtlasService(implicit ws: WSClient, configuration: Configuration): com.hortonworks.dataplane.cs.Webservice.AtlasService = {
    implicit val wSClient = ClusterWsClient(ws)
    new AtlasServiceImpl(configuration.underlying)
  }

  @Provides
  @Singleton
  @Named("rangerService")
  def provideRangerService(implicit ws: WSClient, configuration: Configuration): com.hortonworks.dataplane.cs.Webservice.RangerService = {
    implicit val wSClient = ClusterWsClient(ws)
    new RangerServiceImpl(configuration.underlying)
  }

  @Provides
  @Singleton
  @Named("dpProfilerService")
  def provideDpProfilerService(implicit ws: WSClient, configuration: Configuration): com.hortonworks.dataplane.cs.Webservice.DpProfilerService = {
    implicit val wSClient = ClusterWsClient(ws)
    new DpProfilerServiceImpl(configuration.underlying)
  }

  @Provides
  @Singleton
  @Named("clusterService")
  def provideClusterService(implicit ws: WSClient, configuration: Configuration): ClusterService = {
    new ClusterServiceImpl(configuration.underlying)
  }

  @Provides
  @Singleton
  @Named("configService")
  def provideConfigService(implicit ws: WSClient, configuration: Configuration): ConfigService = {
    new ConfigServiceImpl(configuration.underlying)
  }

  @Provides
  @Singleton
  @Named("commentService")
  def provideCommentService(implicit ws: WSClient, configuration: Configuration): CommentService = {
    new CommentServiceImpl(configuration.underlying)
  }

  @Provides
  @Singleton
  @Named("ratingService")
  def provideRatingService(implicit ws: WSClient, configuration: Configuration): RatingService = {
    new RatingServiceImpl(configuration.underlying)
  }

  @Provides
  @Singleton
  @Named("favouriteService")
  def provideFavouriteService(implicit ws: WSClient, configuration: Configuration): FavouriteService = {
    new FavouriteServiceImpl(configuration.underlying)
  }

  @Provides
  @Singleton
  @Named("bookmarkService")
  def provideBookmarkService(implicit ws: WSClient, configuration: Configuration): BookmarkService = {
    new BookmarkServiceImpl(configuration.underlying)
  }
}

@Singleton
class ConsulInitializer @Inject()(config:Configuration){

  private val registrar = new ApplicationRegistrar(config.underlying,Optional.of(new AppConsulHook))
  registrar.initialize()

  private class AppConsulHook extends ConsulHook{
    override def onServiceRegistration(dpService: DpService) = {
      Logger.info(s"Registered service $dpService")
      // Service registered now, override the db service endpoints
      val map = new util.HashMap[String,String]()
      map.put("dp.services.db.service.uri",config.getString("dp.services.db.service.path").get)
      map.put("dp.services.cluster.service.uri",config.getString("dp.services.cluster.service.path").get)
      map.put("dp.services.hdp_proxy.service.uri",config.getString("dp.services.hdp_proxy.service.path").get)
      val gateway = new Gateway(config.underlying,map,Optional.of(this))
      gateway.initialize()
    }

    override def serviceRegistrationFailure(serviceId: String, th: Throwable):Unit = Logger.warn(s"Service registration failed for $serviceId",th)

    override def onServiceDeRegister(serviceId: String): Unit = Logger.info(s"Service removed from consul $serviceId")

    override def onRecoverableException(reason: String, th: Throwable): Unit = Logger.warn(reason)

    override def gatewayDiscovered(zuulServer: ZuulServer): Unit = Logger.info(s"Gateway dicovered $zuulServer")

    override def gatewayDiscoverFailure(message: String, th: Throwable): Unit = Logger.warn("Gateway discovery failed, endpoints configured in config will be used")

    override def onServiceCheck(serviceId: String): Unit = Logger.info("Running a service check for serviceId "+ serviceId)
  }

}

