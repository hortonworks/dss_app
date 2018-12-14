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

import java.time.LocalDateTime
import javax.inject.Inject

import com.google.inject.Singleton
import commons.Constants
import models.CspEntities.CSPResource
import models.UserEntities.DssUser
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.api.libs.json.JsValue
import repo.Z_RepoExceptions.{EntityNotFound, Forbidden}

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

class CSPResourceRepo @Inject()(protected val dbConfigProvider: DatabaseConfigProvider,
                                protected val cspMappingsRepo: CSPMappingsRepo,
                                protected val userRepo: UserRepo) extends HasDatabaseConfigProvider[PgProfile] {

  import profile.api._

  val CSPResources = TableQuery[CSPResources]
  var RuleAndResourceMap = cspMappingsRepo.RuleAndResourceMap

  private val pattern = "(?<=<<).+?(?=>>)".r

  def findResourceReferences(str:String):Seq[String] = {
    (pattern findAllIn str).mkString(",").split(",").toSet.toSeq
  }

  def deleteById(resId:Long):Future[Int] = {
    db.run((for {
      _ <- RuleAndResourceMap.filter(_.resourceId === resId).length.result.map{
        case 0 => true;
        case _ => throw new Forbidden("Cannot delete this resource as is being used by few rules.")
        }
      _ <- CSPResources.filter(_.id === resId).delete
    } yield (1)).transactionally)
  }

  def add(resource: CSPResource, user: DssUser): Future[CSPResource] ={
    val query = for {
      user <- userRepo.queryForInsertUserIfNotExist(user)
      newRes <- CSPResources returning CSPResources += resource.copy(creatorId = Some(user.id)
        , name = resource.name.trim
        , created = Some(LocalDateTime.now())
        , modified = Some(LocalDateTime.now())
        , source = "Custom")
      _ <- CSPResources
        .filter(_.id === newRes.id)
        .map(_.reference)
        .update(Some(s"${Constants.CSPRESOURCE_PREFIX}${newRes.`type`}.${newRes.id.get}_${System.currentTimeMillis()}"))
      updatedRes <- CSPResources.filter(_.id === newRes.id).result.head
    } yield (updatedRes)
    db.run(query.transactionally)
  }

  def update(res: CSPResource, user: DssUser): Future[CSPResource] ={
    val query = for {
      _       <- RuleAndResourceMap.filter(_.resourceId === res.id).length.result.map {
        case 0 => true;
        case _ => throw new Forbidden("Cannot update this resource as is being used by few rules.")
      }
      user    <- userRepo.queryForInsertUserIfNotExist(user)
      oldRes  <- CSPResources.filter(_.id === res.id).result.headOption.map {
        case None => throw new EntityNotFound("Resource not found.")
        case Some(resource) => resource
      }
      _ <- CSPResources.filter(_.id === res.id).update(oldRes.copy(name = res.name.trim, value = res.value
        , description = res.description, sampleData = res.sampleData, metaProperties = res.metaProperties
        , fileContent = res.fileContent, modified = Some(LocalDateTime.now())))
      updatedRes <- CSPResources.filter(_.id === res.id).result.head
    } yield (updatedRes)
    db.run(query.transactionally)
  }

  def getAll(resourceType: Option[String], displayName: Option[String]): Future[Seq[CSPResource]] = {

    var resourceQuery = resourceType.map { resType =>
      CSPResources.filter(_.`type` === resType)
    }.getOrElse(CSPResources)

    resourceQuery = displayName.map { dname =>
      resourceQuery.filter(_.name.like(s"%$dname%"))
    }.getOrElse(resourceQuery)

    db.run(resourceQuery.result)
  }

  def getInSet(references: Seq[String]) = {
    db.run(CSPResources.filter(_.reference.inSet(references)).result)
  }

  def getRefsWithValues (references: Seq[String]): Future[Seq[(String, String)]] = {
    db.run(CSPResources.filter(_.reference.inSet(references)).map(r=>(r.reference, r.value)).result)
      .map(_.map(tpl => (tpl._1.get, tpl._2.get)))
  }


  final class CSPResources(tag: Tag) extends Table[CSPResource](tag, Some("dss"), "csp_resources") {

    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)

    def `type` = column[String]("type")

    def value = column[Option[String]]("value")

    def name = column[String]("name")

    def reference = column[Option[String]]("reference")

    def fileContent = column[Array[Byte]]("filecontent")

    def description = column[Option[String]]("description")

    def creatorId = column[Option[Long]]("creator_id")

    def created = column[Option[LocalDateTime]]("created")

    def modified = column[Option[LocalDateTime]]("modified")

    def metaProperties = column[Option[JsValue]]("meta_properties")

    def sampleData = column[Option[String]]("sample_data")

    def source = column[String]("source")

    def * = (id, `type`, value, name, reference, fileContent, description, creatorId, created, modified, metaProperties, sampleData, source) <> ((CSPResource.apply _).tupled, CSPResource.unapply)
  }

}
