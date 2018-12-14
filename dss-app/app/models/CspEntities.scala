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

import models.CspEntities.TestStatus.TestStatus
import models.Classification_Entities.Classification
import models.UserEntities.DssUser
import play.api.libs.json.{JsNull, JsObject, JsValue}

object CspEntities {

  case class CSPRule(id: Option[Long] = None,
                     name: String,
                     description: String,
                     creator_id: Long,
                     dsl: String,
                     `type`:Option[String] = Some("Custom"),
                     status: Option[String] = Some("New")
                     )

  case class CSPRuleClusterIdMap(id: Option[Long] = None,
                                 rule_id:Option[Long] = None,
                                 cluster_id:Long)

  case class CSPRuleClassificationMap(id: Option[Long] = None,
                                      rule_id:Option[Long] = None,
                                      classification_id:Option[Long] = None)

  case class CSPRuleWithTagsClusterIdsAndUser(
                                               rule: CSPRule,
                                               tags: Seq[Classification],
                                               cluster_ids:Seq[Long],
                                               user: DssUser
                                )

  case class CSPRuleForTest(profiler: String,
                            instance: String,
                            dryRunSettings: DryRunSettings)

  case class DryRunSettings(dryRunRules: Seq[DryRunRule])

  case class DryRunRule(name: String, data: List[String], dsls: Seq[CSPDsl])

  case class TestData(nameData: List[String],
                      valueData: List[String],
                      ruleId: Long,
                      clusterId: String,
                      profilerName: String = "sensitive_info_profiler",
                      profilerInstance: String = "sensitiveinfo")

  case class CSPTest(id: Option[Long] = None,
                     nameData: Seq[String],
                     valueData: Seq[String],
                     ruleId: Long,
                     idOnProfiler: Option[Long] = None,
                     clusterId: Long,
                     status: TestStatus = TestStatus.SUBMITTED,
                     startTime: Option[Long],
                     lastUpdatedTime: Option[Long],
                     responseData: String
                    )
  case class CSPResource(id: Option[Long] = None,
                         `type`: String,
                         value: Option[String] = None,
                         name: String,
                         reference: Option[String] = None,
                         fileContent: Array[Byte] = Array.empty[Byte],
                         description: Option[String] = None,
                         creatorId: Option[Long] = None,
                         created: Option[LocalDateTime] = None,
                         modified: Option[LocalDateTime] = None,
                         metaProperties: Option[JsValue] = None,
                         sampleData: Option[String] = None,
                         source: String = "Custom"
                        )

  case class Context(profilerId: String, id: String)

  case class ContextNode(context: Context, nodeName: String, isExists: Option[Boolean] = None, metaData: Option[JsObject] = None)

  case class Node(nodes: Seq[ContextNode])

  case class CSPRulePublishInfo(ruleId: Long,
                                clusterIds: Seq[String],
                                profilerId: String = "sensitive_info_profiler",
                                resourceId: String="dsl",
                                instance:String = "sensitiveinfo",
                                isEnabled: Boolean = true,
                                groupName: String = "default")

  case class CSPDsl(
                     matchType:String,
                     confidence:Int,
                     dsl:String,
                     tags:Seq[String],
                     isEnabled:Boolean = true
                   )

  case class CSPSaveResponse(clusterId: String,
                             response: JsValue,
                             isSuccess: Boolean)

  case class CSPRuleAndResourceMap(id: Option[Long] = None,
                                   ruleId:Long,
                                   resourceId:Long)

  case class CSPMetaConfig(groupName: String,
                           profilerInstanceName: String,
                           dsls: Seq[CSPDsl],
                           isEnabled: Boolean
                          )

  object TestStatus extends Enumeration {
    type TestStatus = Value
    val SUBMITTED, RUNNING, SUCCESSFUL, FAILED, UNKNOWN, STARTED = Value
  }

}
