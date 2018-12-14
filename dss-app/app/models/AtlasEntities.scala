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

import play.api.libs.json.JsObject

object AtlasEntities {

  case class AtlasClassification ( typeName : String, attributes: JsObject )

  case class BodyToModifyAtlasClassification (
                                               postData : Option[Seq[AtlasClassification]],
                                               putData : Option[Seq[AtlasClassification]],
                                               deleteData : Option[Seq[String]]
                                             )

  case class EntityInfoWitTags(
                                name: String,
                                guid: String,
                                classifications: BodyToModifyAtlasClassification
                              )

  case class BodyToModifyAssetColumnTags(
                                          databaseName: String, tableName: String, columns: Seq[EntityInfoWitTags]
                                        )

  case class BodyToModifyEntityTags(
                                          databaseName: String, tableName: String, entities: Seq[EntityInfoWitTags]
                                        )


  //basic search case class

  case class FilterCriteria(attributeName: String, operator: String, attributeValue: String)

  case class EntityFilters( condition:String, criterion:Seq[FilterCriteria])

  case class AtlasBasicSearchQueryParams(entityFilters: EntityFilters,
                              classification: Option[String] = None,
                              limit: Option[Int] = Some(1000),
                              offset: Option[Int] = Some(0),
                              typeName: Option[String] = Some("hive_table"),
                              excludeDeletedEntities: Option[Boolean] = Some(true),
                              includeClassificationAttributes: Option[Boolean] = Some(true),
                              includeSubTypes: Option[Boolean] = Some(true),
                              includeSubClassifications: Option[Boolean] = Some(true)
  )

}
