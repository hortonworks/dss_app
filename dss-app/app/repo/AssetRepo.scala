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

package repo

import javax.inject.Inject

import models.DatasetEntities.{Asset, AssetsAndCounts}
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.api.libs.json.JsValue

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

class AssetRepo @Inject()(protected val dbConfigProvider: DatabaseConfigProvider) extends HasDatabaseConfigProvider[PgProfile] {

  import profile.api._

  val AllAssets = TableQuery[AssetTable]
  def Assets = AllAssets.filter(_.state === "Active")
  def EditAssets = AllAssets.filter(_.editFlag === "Mark_Add")

  def allWithDatasetId(datasetId: Long, state: Option[String] = None, queryName: String = "", offset: Long = 0, limit: Option[Long] = None): Future[AssetsAndCounts] = {
    val query = (if (state.getOrElse("") == "Edit") EditAssets else Assets)
                          .filter(record => record.datasetId === datasetId && record.assetName.like(s"%$queryName%"))
    db.run(for {
      count <- query.length.result
      assets <- (limit.map(query.take(_)).getOrElse(query)).drop(offset).to[List].result
    } yield (assets, count)).map {
      case (assets, count) => AssetsAndCounts(assets, count)
    }
  }

  final class AssetTable(tag: Tag)
    extends Table[Asset](tag, Some("dss"), "data_asset") {

    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)

    def assetType = column[String]("asset_type")

    def assetName = column[String]("asset_name")

    def guid = column[String]("guid")

    def assetProperties = column[JsValue]("asset_properties")

    def clusterId = column[Long]("cluster_id")

    def datasetId = column[Option[Long]]("dataset_id")

    def state = column[Option[String]]("state")

    def editFlag = column[Option[String]]("edit_flag")

    def * = (id, assetType, assetName, guid, assetProperties, clusterId, datasetId, state, editFlag) <> ((Asset.apply _).tupled, Asset.unapply)

  }

}
