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

import models.SocialEntities.{Bookmark, Favourite}
import models.UserEntities.DssUser
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.db.NamedDatabase
import repo.Z_RepoExceptions.{EntityNotFound, Forbidden}

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

@Singleton
class BookmarkRepo @Inject()(protected val dbConfigProvider: DatabaseConfigProvider,
                             protected val userRepo: UserRepo
                            ) extends HasDatabaseConfigProvider[PgProfile]{

  import profile.api._

  val Bookmarks = TableQuery[BookmarksTable]

  def add(bookmark: Bookmark, dssUser:DssUser): Future[Bookmark] = {
    db.run(for{
      user        <- userRepo.queryForInsertUserIfNotExist(dssUser)
      bookmark1  <- Bookmarks returning Bookmarks += bookmark.copy(userId = user.id)
    }yield (bookmark1))
  }

  def getByUserId(userId: Long): Future[Seq[Bookmark]] ={
    db.run(Bookmarks.filter(t => (t.userId === userId)).result)
  }

  def delete(userId: Long, bmId: Long): Future[Int] = {
    db.run(Bookmarks.filter(t => (t.id === bmId && t.userId === userId)).delete)
  }

//  def deleteByobjectRef(objectId: Long, objectType: String): Future[Int] = {
//    db.run(Bookmarks.filter(t => (t.objectId === objectId && t.objectType === objectType)).delete)
//  }
//
//  def getBookmarkInfoForObjListQuery(objectIds: Seq[Long], userId: Long, objectType: String) = {
//    Bookmarks.filter(t => (t.objectId.inSet(objectIds) && t.userId === userId && t.objectType === objectType)).groupBy(a => (a.objectId, a.id))
//  }

  final class BookmarksTable(tag: Tag) extends Table[Bookmark](tag, Some("dss"), "bookmarks") {
    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)

    def userId = column[Long]("user_id")

    def objectType = column[String]("object_type")

    def objectId = column[Long]("object_id")

    def * = (id, userId, objectType, objectId) <> ((Bookmark.apply _).tupled, Bookmark.unapply)
  }

}





class FavouriteRepo @Inject()(protected val dbConfigProvider: DatabaseConfigProvider,
                              protected val userRepo: UserRepo
                             ) extends HasDatabaseConfigProvider[PgProfile] {

  import profile.api._

  val Favourites = TableQuery[FavouritesTable]

  def addQuery(favourite: Favourite, dssUser:DssUser) = {
    for{
      user        <- userRepo.queryForInsertUserIfNotExist(dssUser)
      favourite1  <- Favourites returning Favourites += favourite.copy(userId = user.id)
    }yield (favourite1)
  }

  def add(favourite: Favourite, dssUser:DssUser): Future[Favourite] ={
    db.run(addQuery(favourite, dssUser).transactionally)
  }

  def addAndGetWithTotal(favourite: Favourite, dssUser:DssUser): Future[(Favourite, Long)] ={
    db.run((for{
      fav   <- addQuery(favourite, dssUser)
      total <- Favourites.filter(t => (t.objectId === fav.objectId && t.objectType === fav.objectType)).length.result
    }yield{(fav, total)}).transactionally).map(itm => (itm._1, itm._2))
  }

  def deleteAndGetTotal(favId:Long, dssUser:DssUser): Future[(Long, Long)] = {
    db.run((for{
      delFav    <- Favourites.filter(_.id === favId).result.headOption.map {
                  case None => throw new EntityNotFound
                  case Some(oldFav) if oldFav.userId != dssUser.id => throw new Forbidden
                  case Some(oldFav) => oldFav
                }
      delCount  <- Favourites.filter( t => (t.id === favId && t.userId === dssUser.id)).delete
      total     <- Favourites.filter(t => (t.objectId === delFav.objectId && t.objectType === delFav.objectType)).length.result
    } yield {(delCount, total)}).transactionally).map(itm => (itm._1, itm._2))
  }

  final class FavouritesTable(tag: Tag) extends Table[Favourite](tag, Some("dss"), "favourites") {
    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)

    def userId = column[Long]("user_id")

    def objectType = column[String]("object_type")

    def objectId = column[Long]("object_id")

    def * = (id, userId, objectType, objectId) <> ((Favourite.apply _).tupled, Favourite.unapply)
  }

}