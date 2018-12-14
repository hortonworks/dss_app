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


import javax.inject.{Inject, Singleton}

import commons.Constants
import models.CspEntities._
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import repo.Z_RepoExceptions.{EntityNotFound, Forbidden, WrongParameters}

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

@Singleton
class CSPRuleRepo @Inject()(protected val dbConfigProvider: DatabaseConfigProvider,
                            protected val cspResourceRepo: CSPResourceRepo,
                            protected val userRepo: UserRepo,
                            protected val cspMappingsRepo: CSPMappingsRepo,
                            protected val classificationRepo: ClassificationRepo) extends HasDatabaseConfigProvider[PgProfile] {

  import profile.api._

  var Rules = TableQuery[CSPRulesTable]
  var TagsMap = TableQuery[CSPRuleClassificationMapTable]
  var clIdsMap = TableQuery[CSPRuleClusterIdMapTable]
  var Tags = classificationRepo.Tags
  var RuleAndResourceMap = cspMappingsRepo.RuleAndResourceMap

  def list():Future[Seq[CSPRuleWithTagsClusterIdsAndUser]] = {

    val query = for {
      rulesWithUser     <-  (Rules join userRepo.Users on (_.creator_id === _.id)).result
      ruleIdsWithClId   <-  clIdsMap.filter(_.rule_id inSet rulesWithUser.map(_._1.id.get)).result
      ruleIdsWithTaggId <-  TagsMap.filter(_.rule_id inSet rulesWithUser.map(_._1.id.get)).result
      tags              <-  Tags.filter(_.id inSet ruleIdsWithTaggId.map(_.classification_id.get)).result
    } yield {(rulesWithUser, ruleIdsWithClId, ruleIdsWithTaggId, tags)}

    db.run(query).map {
      case (rulesWithUser, ruleIdsWithClId, ruleIdsWithTaggId, tags) => {
        rulesWithUser.map {
          case (rule, user) => {
            CSPRuleWithTagsClusterIdsAndUser(rule,
              tags.filter(tag => ruleIdsWithTaggId.filter(_.rule_id == rule.id).map(_.classification_id).contains(tag.id)),
              ruleIdsWithClId.filter(_.rule_id == rule.id).map(_.cluster_id),
              user)
          }
        }
      }
    }

  }

  def getRuleAndClusterIds(id:Long): Future[(CSPRule, Seq[Long])] = {
//    db.run((Rules.filter(_.id === id) join clIdsMap on (_.id === _.rule_id))
//      .groupBy(_._1)
//      .map(tpl => (tpl._1, tpl._2.map(_._2.cluster_id)))
//      .result.head
//    )
    db.run(for{
      rule <- Rules.filter(_.id === id).result.head
      clIds <- clIdsMap.filter(_.rule_id === rule.id).map(_.cluster_id).result
    } yield(rule, clIds))
  }

  def getRuleWithTagsClusterIdsAndUser(id:Long) :Future[CSPRuleWithTagsClusterIdsAndUser] = {
    db.run(for {
        (rule, user)  <- (Rules.filter(_.id === id) join userRepo.Users on(_.creator_id === _.id)).result.head
        clusterIds    <- clIdsMap.filter(_.rule_id === rule.id).map(_.cluster_id).result
        tags          <- (TagsMap.filter(_.rule_id === rule.id) join Tags on(_.classification_id === _.id)).map(_._2).result
    } yield {(rule, tags, clusterIds, user)})
    .map(tpl => CSPRuleWithTagsClusterIdsAndUser(tpl._1, tpl._2, tpl._3, tpl._4))
  }

  def insertRuleWithTagsClusterIdsAndUser(obj:CSPRuleWithTagsClusterIdsAndUser) :Future[CSPRuleWithTagsClusterIdsAndUser] = {
    val tags = obj.tags
    val query = for {
        resIds    <- cspResourceRepo.CSPResources
                    .filter(_.reference inSet(cspResourceRepo.findResourceReferences(obj.rule.dsl)))
                    .map(_.id).result
        user      <- userRepo.queryForInsertUserIfNotExist(obj.user)
        rule      <- Rules returning Rules += obj.rule.copy(creator_id = user.id)
        resMaps   <- RuleAndResourceMap ++= resIds.map(id => CSPRuleAndResourceMap(None, rule.id.get, id.get))
        allTags   <- classificationRepo.queryToInsertMissingTags(tags)
        tagMaps   <- TagsMap ++= allTags.map(t => CSPRuleClassificationMap(None, rule.id, t.id))
        clusIds   <- clIdsMap ++= obj.cluster_ids.map(CSPRuleClusterIdMap(None, rule.id, _))
      } yield {
        CSPRuleWithTagsClusterIdsAndUser(rule, allTags, obj.cluster_ids, user)
      }
    db.run(query.transactionally)
  }

  def updateRuleWithTagsClusterIds(obj:CSPRuleWithTagsClusterIdsAndUser) :Future[CSPRuleWithTagsClusterIdsAndUser] = {
//    val ruleId = obj.rule.id
    val query = for {
      user      <- userRepo.queryForInsertUserIfNotExist(obj.user)
      oldRule   <- Rules.filter(_.id === obj.rule.id).result.headOption.map {
                  case None => throw new EntityNotFound("Given rule was not found")
                  case Some(rule) => rule
                }
      _         <- {
                    val newRule =
                      if(oldRule.dsl != obj.rule.dsl)
                        obj.rule.copy(status = Some(Constants.RULE_STATUS_TEST_PENDING))
                      else obj.rule
                    Rules.filter(_.id === oldRule.id).update(newRule)
                }
      updatedRule   <- Rules.filter(_.id === oldRule.id).result.head
      delQuery  <- RuleAndResourceMap.filter(_.ruleId === updatedRule.id).delete
      resIds    <- cspResourceRepo.CSPResources
                    .filter(_.reference inSet(cspResourceRepo.findResourceReferences(updatedRule.dsl)))
                    .map(_.id).result
      resMaps   <- RuleAndResourceMap ++= resIds.map(id => CSPRuleAndResourceMap(None, updatedRule.id.get, id.get))
      delQuery  <- clIdsMap.filter(_.rule_id === updatedRule.id).delete
      clusIds   <- clIdsMap ++= obj.cluster_ids.map(CSPRuleClusterIdMap(None, updatedRule.id, _))
      delQuery  <- TagsMap.filter(_.rule_id === updatedRule.id).delete
      allTags   <- classificationRepo.queryToInsertMissingTags(obj.tags)
      tagMaps   <- TagsMap ++= allTags.map(t => CSPRuleClassificationMap(None, updatedRule.id, t.id))
    } yield {
      CSPRuleWithTagsClusterIdsAndUser(updatedRule, allTags, obj.cluster_ids, obj.user)
    }
    db.run(query.transactionally)
  }

  def insertRuleAndClIdMapping(cSPRuleClusterIdMap: Seq[CSPRuleClusterIdMap]) = {
    db.run(clIdsMap ++= cSPRuleClusterIdMap)
  }

  def deleteClIdMappingAndMarkRuleSuspended(clusterIds:Seq[Long], ruleId:Long): Future[Int] = {
    db.run((for {
      count <- clIdsMap.filter(_.rule_id === ruleId).filter(_.cluster_id inSet(clusterIds)).delete
      _ <- Rules.filter(_.id === ruleId).map(_.status).update(Some(Constants.RULE_STATUS_SUSPENDED))
    } yield (count)).transactionally)

  }

  def insertClIdMappingAndMarkRulePublished(clusterIds:Seq[Long], ruleId:Long) = {
    db.run((for {
      existingClIds <- clIdsMap.filter(_.rule_id === ruleId).filter(_.cluster_id inSet clusterIds).map(_.cluster_id).result
      _ <- clIdsMap ++= (clusterIds diff existingClIds).map(clId => CSPRuleClusterIdMap(rule_id = Some(ruleId), cluster_id =clId))
      _ <- Rules.filter(_.id === ruleId).map(_.status).update(Some(Constants.RULE_STATUS_PUBLISHED))
    } yield (true)).transactionally)
  }



  def getRuleAndClIdMapping(ruleId: Long): Future[Seq[CSPRuleClusterIdMap]] = {
    db.run(clIdsMap.filter(_.rule_id === ruleId).result)
  }

  def updateRuleStatus(ruleId: Option[Long], status: String) = {
    db.run(Rules.filter(_.id === ruleId).map(_.status).update(Some(status)))
  }

  def deleteRuleWithTags(ruleId:Long):Future[Int] = {
    db.run((for {
      _ <- clIdsMap.filter(_.rule_id === ruleId).length.result.map{
        case 0 => true;
        case _ => throw new Forbidden("Cannot delete this rule as is being used by cluster profilers.")
      }
      _ <- Rules.filter(_.id === ruleId).delete
    } yield (1)).transactionally)

  }

  def getCSPRuleById(ruleId: Long): Future[Option[CSPRule]] = {
    db.run(Rules.filter (_.id === ruleId).result.headOption)
  }

  final class CSPRulesTable(tag: Tag) extends Table[CSPRule](tag, Some("dss"), "csp_rules") {
    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)

    def name = column[String]("name")

    def description = column[String]("description")

    def creator_id = column[Long]("creator_id")

    def dsl = column[String]("dsl")

    def `type` = column[Option[String]]("type")

    def status = column[Option[String]]("status")

    def user = foreignKey("rule_user", creator_id, userRepo.Users)(_.id)

    def * = (id, name, description, creator_id, dsl, `type`, status) <> ((CSPRule.apply _).tupled, CSPRule.unapply)
  }

  final class CSPRuleClusterIdMapTable(tag:Tag) extends Table[CSPRuleClusterIdMap](tag, Some("dss"), "csp_rule_cluster_id") {

    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)

    def rule_id = column[Option[Long]]("rule_id")

    def cluster_id = column[Long]("cluster_id")

    def rule = foreignKey("map_ruleId", rule_id, Rules)(_.id)

    def * = (id, rule_id, cluster_id) <> ((CSPRuleClusterIdMap.apply _).tupled, CSPRuleClusterIdMap.unapply)

  }


  final class CSPRuleClassificationMapTable(tag:Tag) extends Table[CSPRuleClassificationMap](tag, Some("dss"), "csp_rule_classification") {

    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)

    def rule_id = column[Option[Long]]("rule_id")

    def classification_id = column[Option[Long]]("classification_id")

    def rule = foreignKey("map_ruleId", rule_id, Rules)(_.id)

    def classification = foreignKey("map_classification", classification_id, classificationRepo.Tags)(_.id)

    def * = (id, rule_id, classification_id) <> ((CSPRuleClassificationMap.apply _).tupled, CSPRuleClassificationMap.unapply)

  }

}
