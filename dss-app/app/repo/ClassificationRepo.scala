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

import models.Classification_Entities.Classification
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

class ClassificationRepo  @Inject()( protected val dbConfigProvider: DatabaseConfigProvider) extends HasDatabaseConfigProvider[PgProfile] {

  import profile.api._

  val Tags = TableQuery[ClassificationsTable]

  def addTags(tags:Seq[Classification]) : Future[Seq[Classification]] = {
    db.run(Tags returning Tags ++= tags)
  }

  def listAll() : Future[Seq[Classification]] = {
    db.run(for{
      allTags <- Tags.result
    } yield{(allTags)})
  }

  def queryToInsertMissingTags(tags:Seq[Classification]) = {
    for{
      existingTags  <- Tags.filter(_.name.inSet(tags.map(_.name))).result
      newTags       <- Tags returning Tags ++= tags.filterNot(t => (existingTags.map(_.name)).contains(t.name))
      allTags       <- Tags.filter(_.name.inSet(tags.map(_.name))).result
    } yield {(allTags)}
  }

  def insertMissingTags(tags:Seq[Classification]) : Future[Seq[Classification]] = {
    db.run(queryToInsertMissingTags(tags))
  }

  final class ClassificationsTable(tag: Tag) extends Table[Classification](tag, Some("dss"), "classifications") {

    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)

    def name = column[String]("name")

    def `type` = column[String]("type")

    def * = (id, name, `type`) <> ((Classification.apply _).tupled, Classification.unapply)
  }

}
