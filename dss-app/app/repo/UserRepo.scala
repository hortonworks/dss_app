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

import models.UserEntities.DssUser
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

class UserRepo @Inject()( protected val dbConfigProvider: DatabaseConfigProvider) extends HasDatabaseConfigProvider[PgProfile] {

  import profile.api._

  val Users = TableQuery[UsersTable]

  def queryForInsertUserIfNotExist(usr:DssUser) = {
    for {
      user  <- Users.filter(_.id === usr.id).result.headOption
      returnUser <- user match {
        case Some(u) => Users.filter(_.id === usr.id).result.head
        case None =>  Users returning Users += usr
      }
    } yield (returnUser)
  }

  def insertUserIfNotExist(usr:DssUser) :Future[DssUser] = {
    db.run(queryForInsertUserIfNotExist(usr))
  }

  final class UsersTable(tag: Tag) extends Table[DssUser](tag, Some("dss"), "users") {

    def id = column[Long]("id", O.PrimaryKey)

    def username = column[String]("user_name")

    def displayname = column[String]("display_name")

    def * = (id, username, displayname) <> ((DssUser.apply _).tupled, DssUser.unapply)
  }

}
