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

import models.SocialEntities.{Comment, CommentWithAttributes}
import models.UserEntities.DssUser
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

class CommentsRepo @Inject()(protected val dbConfigProvider: DatabaseConfigProvider,
                             protected val userRepo: UserRepo
                            ) extends HasDatabaseConfigProvider[PgProfile] {
  import profile.api._
  val Comments = TableQuery[CommentsTable]

  def add(comment:Comment, dssUser:DssUser): Future[CommentWithAttributes] = {
    val newComment = comment.copy(createdOn = Some(LocalDateTime.now()), lastModified = Some(LocalDateTime.now()), editVersion = Some(0))
    val query = for {
      user  <- userRepo.queryForInsertUserIfNotExist(dssUser)
      cmnt  <- Comments returning Comments += newComment.copy(createdBy = user.id)
    } yield {CommentWithAttributes(cmnt, 0, user.user_name)}
    db.run(query.transactionally)
  }

  def findByObjectRef(objectId:Long, objectType:String, offset:Long = 0, size:Long = 20): Future[Seq[CommentWithAttributes]] = {
    val query = for {
      cmntsWithUsrs   <- Comments.filter(m => (m.objectId === objectId && m.objectType === objectType && m.parentCommentId.isEmpty))
                                .join(userRepo.Users).on(_.createdBy === _.id).map(t => (t._1,t._2.username)).sortBy(_._1.createdOn)
                                .drop(offset).take(size).result
      parIdToComIdMap <- Comments.filter(_.parentCommentId inSet cmntsWithUsrs.map(_._1.id.get)).map(m => (m.parentCommentId, m.id)).result
    } yield {(cmntsWithUsrs, parIdToComIdMap)}

    db.run(query).map {
      case (cmntsWithUsrs, parIdToComIdMap) => {
        cmntsWithUsrs.map {
          case (cmnt, usrname) => CommentWithAttributes(cmnt, parIdToComIdMap.filter(_._1 == cmnt.id).size.toLong, usrname)
        }
      }
    }
  }

  def findByParentId(parentId: Long): Future[Seq[CommentWithAttributes]] = {
    val query = for {
      cmntsWithUsrs   <- Comments.filter(_.parentCommentId === parentId).join(userRepo.Users).on(_.createdBy === _.id)
                          .map(t => (t._1, t._2.username)).sortBy(_._1.createdOn).result
      parIdToComIdMap <- Comments.filter(_.parentCommentId inSet cmntsWithUsrs.map(_._1.id.get)).map(m => (m.parentCommentId, m.id)).result
    } yield {(cmntsWithUsrs, parIdToComIdMap)}

    db.run(query).map {
      case (cmntsWithUsrs, parIdToComIdMap) => {
        cmntsWithUsrs.map {
          case (cmnt, usrname) => CommentWithAttributes(cmnt, parIdToComIdMap.filter(_._1 == cmnt.id).size.toLong, usrname)
        }
      }
    }
  }

  def getCommentsCount(objectId: Long, objectType: String): Future[Int] = {
    val query = Comments.filter(m => (m.objectId === objectId && m.objectType === objectType)).length.result
    db.run(query)
  }

  def deleteCommentById(commentId:Long, dssUser:DssUser)={
    db.run(Comments.filter(m =>(m.id === commentId && m.createdBy === dssUser.id)).delete)
  }

  final class CommentsTable(tag: Tag) extends Table[Comment](tag, Some("dss"), "comments") {
    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)

    def comment = column[Option[String]]("comment")

    def objectType = column[String]("object_type")

    def objectId = column[Long]("object_id")

    def createdBy = column[Long]("createdby")

    def createdOn = column[Option[LocalDateTime]]("createdon")

    def lastModified = column[Option[LocalDateTime]]("lastmodified")

    def parentCommentId = column[Option[Long]]("parent_comment_id")

    def editVersion = column[Option[Int]]("edit_version")

    def * = (id, comment, objectType, objectId, createdBy, createdOn, lastModified, parentCommentId, editVersion) <> ((Comment.apply _).tupled, Comment.unapply)
  }
}
