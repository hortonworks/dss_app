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

import models.CspEntities.TestStatus
import play.api.libs.json._

object JsonFormatters {

  import models.ErrorEntities._

  implicit val errorFormat = Json.format[Error]

  import models.Classification_Entities._

  val defaultJson = Json.using[Json.WithDefaultValues]

  implicit val testStatusReads = Reads.enumNameReads(TestStatus)

  implicit val classificationWrites = Json.writes[Classification]
  implicit val classificationReads = Json.reads[Classification]

  import models.UserEntities._

  implicit val userWrites = Json.writes[DssUser]
  implicit val userReads = Json.reads[DssUser]

  import models.CspEntities._

  implicit val csp_rule_Writes = Json.writes[CSPRule]
  implicit val csp_rule_Reads = Json.reads[CSPRule]

  implicit val csp_rule_clusterId_map_Writes = Json.writes[CSPRuleClusterIdMap]
  implicit val csp_rule_clusterId_map_Reads = Json.reads[CSPRuleClusterIdMap]

  implicit val csp_rule_classification_map_Writes = Json.writes[CSPRuleClassificationMap]
  implicit val csp_rule_classification_map_Reads = Json.reads[CSPRuleClassificationMap]

  implicit val csp_rule_with_tags_and_user_Writes = Json.writes[CSPRuleWithTagsClusterIdsAndUser]
  implicit val csp_rule_with_tags_and_user_Reads = Json.reads[CSPRuleWithTagsClusterIdsAndUser]

  implicit val contextWrites = Json.writes[Context]
  implicit val contextReads = Json.reads[Context]

  implicit val contextNodeWrites = Json.writes[ContextNode]
  implicit val contextNodeReads = Json.reads[ContextNode]

  implicit val nodeWrites = Json.writes[Node]
  implicit val nodeReads = Json.reads[Node]

  implicit val cSPRulePublishInfoWrites = Json.writes[CSPRulePublishInfo]
  implicit val cSPRulePublishInfoReads = defaultJson.reads[CSPRulePublishInfo]

  implicit val cSPDslWrites = Json.writes[CSPDsl]
  implicit val cSPDslReads = Json.reads[CSPDsl]

  implicit val cSPSaveResponseWrites = Json.writes[CSPSaveResponse]
  implicit val cSPSaveResponseReads = Json.reads[CSPSaveResponse]

  implicit val cSPRuleAndResourceMapWrites = Json.writes[CSPRuleAndResourceMap]
  implicit val cSPRuleAndResourceMapReads = Json.reads[CSPRuleAndResourceMap]

  implicit val cSPMetaConfigWrites = Json.writes[CSPMetaConfig]
  implicit val cSPMetaConfigReads = Json.reads[CSPMetaConfig]

  implicit val testDataWrites = Json.writes[TestData]
  implicit val testDataReads = defaultJson.reads[TestData]

  implicit val cSPTestWrites = Json.writes[CSPTest]
  implicit val cSPTestReads = defaultJson.reads[CSPTest]

  implicit val dryRunRuleWrites = Json.writes[DryRunRule]
  implicit val dryRunRuleReads = Json.reads[DryRunRule]

  implicit val dryRunSettingsWrites = Json.writes[DryRunSettings]
  implicit val dryRunSettingsReads = Json.reads[DryRunSettings]

  implicit val cSPRuleForTestWrites = Json.writes[CSPRuleForTest]
  implicit val cSPRuleForTestReads = Json.reads[CSPRuleForTest]

  implicit val cSPResourceWrites = Json.writes[CSPResource]
  implicit val cSPResourceReads =  defaultJson.reads[CSPResource]

  import models.SocialEntities._

  implicit val ratingWrites = Json.writes[Rating]
  implicit val ratingReads = Json.reads[Rating]

  implicit val bookmarkWrites = Json.writes[Bookmark]
  implicit val bookmarkReads = Json.reads[Bookmark]

  implicit val favouriteWrites = Json.writes[Favourite]
  implicit val favouriteReads = Json.reads[Favourite]

  implicit val commentWrites = Json.writes[Comment]
  implicit val commentReads = Json.reads[Comment]

  implicit val commentWithAttributesWrites = Json.writes[CommentWithAttributes]
  implicit val commentWithAttributesReads = Json.reads[CommentWithAttributes]

  import models.DatasetEntities._

  implicit val assetWrites = Json.writes[Asset]
  implicit val assetReads = defaultJson.reads[Asset]

  implicit val assetsAndCountReads = Json.reads[AssetsAndCounts]
  implicit val assetsAndCountWrites = Json.writes[AssetsAndCounts]

  implicit val datasetWrites = Json.writes[Dataset]
  implicit val datasetReads = defaultJson.reads[Dataset]

  implicit val categoryWrites = Json.writes[Category]
  implicit val categoryReads = Json.reads[Category]

  implicit val categoryWithCountWrites = Json.writes[CategoryWithCount]
  implicit val categoryWithCountReads = Json.reads[CategoryWithCount]

  implicit val datasetCategoryMapWrites = Json.writes[DatasetCategoryMap]
  implicit val datasetCategoryMapReads = Json.reads[DatasetCategoryMap]

  implicit val datasetAndTagsReads = Json.reads[DatasetAndTags]
  implicit val datasetAndTagsWrites = Json.writes[DatasetAndTags]

  implicit val datasetEditDetailsWrites = Json.writes[DatasetEditDetails]
  implicit val datasetEditDetailsReads = Json.reads[DatasetEditDetails]

  implicit val addToBoxPramsReads = defaultJson.reads[AddToBoxDSLQueryPrams]
  implicit val addToBoxPramsWrites = Json.writes[AddToBoxDSLQueryPrams]

  implicit val BoxSelectionPramsReads = defaultJson.reads[BoxSelectionPrams]
  implicit val BoxSelectionPramsWrites = Json.writes[BoxSelectionPrams]

  implicit val DataAssetCountReads = defaultJson.reads[DataAssetCount]
  implicit val DataAssetCountWrites = Json.writes[DataAssetCount]

  implicit val richDatasetReads = defaultJson.reads[RichDataset]
  implicit val richDatasetWrites = Json.writes[RichDataset]

  import models.AtlasEntities._

  implicit val atlasClassificationReads = Json.reads[AtlasClassification]
  implicit val atlasClassificationWrites = Json.writes[AtlasClassification]

  implicit val bodyToModifyAtlasClassificationReads = Json.reads[BodyToModifyAtlasClassification]
  implicit val odyToModifyAtlasClassificationWrites = Json.writes[BodyToModifyAtlasClassification]

  implicit val columnInfoWitTagsReads = defaultJson.reads[EntityInfoWitTags]
  implicit val columnInfoWitTagsWrites = Json.writes[EntityInfoWitTags]

  implicit val bodyForModifyAssetColumnTagsReads = defaultJson.reads[BodyToModifyAssetColumnTags]
  implicit val bodyForModifyAssetColumnTagsWrites = Json.writes[BodyToModifyAssetColumnTags]

  implicit val bodyToModifyEntityTagsReads = defaultJson.reads[BodyToModifyEntityTags]
  implicit val bodyToModifyEntityTagsWrites = Json.writes[BodyToModifyEntityTags]

  implicit val FilterCriteriaReads = defaultJson.reads[FilterCriteria]
  implicit val FilterCriteriaWrites = Json.writes[FilterCriteria]

  implicit val EntityFiltersReads = defaultJson.reads[EntityFilters]
  implicit val EntityFiltersWrites = Json.writes[EntityFilters]

  implicit val AtlasBasicSearchQueryParamsReads = defaultJson.reads[AtlasBasicSearchQueryParams]
  implicit val AtlasBasicSearchQueryParamsWrites = Json.writes[AtlasBasicSearchQueryParams]

  implicit val AddToBoxBasicQueryParamsReads = defaultJson.reads[AddToBoxBasicQueryParams]
  implicit val AddToBoxBasicQueryParamsWrites = Json.writes[AddToBoxBasicQueryParams]


}
