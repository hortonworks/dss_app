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

package models

import java.time.LocalDateTime

import com.hortonworks.dataplane.commons.domain.Atlas.AtlasSearchQuery
import models.AtlasEntities.AtlasBasicSearchQueryParams
import play.api.libs.json.JsValue

object DatasetEntities {

  object SharingStatus extends Enumeration {
    val PUBLIC = Value(1)
    val PRIVATE = Value(2)
  }

  case class Asset(id: Option[Long],
                   assetType: String,
                   assetName: String,
                   guid: String,
                   assetProperties: JsValue,
                   clusterId: Long,
                   datasetId: Option[Long] = None,
                   state: Option[String] = None,
                   editFlag: Option[String] = None
                  )

  case class AssetsAndCounts(assets: Seq[Asset], count: Long)

  case class Dataset(id: Option[Long] = None,
                     name: String,
                     description: Option[String],
                     dpClusterId: Long,
                     createdBy: Option[Long],
                     createdOn: LocalDateTime = LocalDateTime.now(),
                     lastModified: LocalDateTime = LocalDateTime.now(),
                     active: Boolean = true,
                     version: Int = 0,
                     sharedStatus: Int = SharingStatus.PUBLIC.id // 1 - Public, 2 - Private
                     )

  case class Category(id: Option[Long] = None,
                       name: String,
                       description: Option[String])

  case class CategoryWithCount(name: String, count: Int)

  case class DatasetCategoryMap(datasetId: Long, categoryId: Long)

  case class DatasetAndTags(dataset: Dataset, tags: Seq[String])

  case class DatasetEditDetails(id: Option[Long],
                                datasetId: Long,
                                editorId: Long,
                                editBegin: Option[LocalDateTime] //= Some(LocalDateTime.now())
                               )

  case class DataAssetCount(assetType: String, assetState: String, count: Int)

  case class RichDataset(dataset: Dataset,
                         tags: Seq[String],
                         user: String,
                         clusterId: Long,
                         cluster: String,
                         counts: Seq[DataAssetCount],
                         editDetails: Option[DatasetEditDetails] = None,
                         favouriteId: Option[Long] = None, //favourite Id of logged in users favourite object
                         favouriteCount: Option[Int] = None,
                         bookmarkId: Option[Long] = None,
                         totalComments: Option[Int] = None,
                         avgRating: Option[Float] = None)

  case class AddToBoxDSLQueryPrams(datasetId: Long,
                           clusterId: Long,
                           assetDSLQueryModel: AtlasSearchQuery,
                           exceptions: Seq[String])

  case class AddToBoxBasicQueryParams(datasetId: Long,
                               clusterId: Long,
                               assetBasicQueryModel: AtlasBasicSearchQueryParams,
                               exceptions: Seq[String])

  case class BoxSelectionPrams(datasetId: Long,
                               clusterId: Long,
                               guids: Seq[String])

}
