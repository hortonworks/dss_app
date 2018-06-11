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

package controllers

import javax.inject.Inject

import com.google.inject.name.Named
import com.hortonworks.dataplane.commons.auth.AuthenticatedAction
import com.hortonworks.dataplane.commons.domain.Entities.Comment
import com.hortonworks.dataplane.commons.domain.JsonFormatters._
import com.hortonworks.dataplane.db.Webservice.CommentService
import play.api.{Configuration, Logger}
import play.api.libs.json._
import play.api.libs.functional.syntax._
import play.api.mvc._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

class Comments @Inject()(@Named("commentService") val commentService: CommentService,
                         private val config: Configuration)
  extends Controller with JsonAPI {

  def addComments = AuthenticatedAction.async(parse.json) { request =>
    Logger.info("Comments-Controller: Received add Comment request")
    request.body
      .validate[Comment]
      .map { comment =>
        val objectTypes = config.getStringSeq("dp.comments.object.types").getOrElse(Nil)
        if(!objectTypes.contains(comment.objectType)) {
          Logger.warn(s"Comments-Controller: Comments for object type ${comment.objectType} is not supported")
          Future.successful(BadRequest(s"Comments for object type ${comment.objectType} is not supported"))
        }
        else{
          commentService
            .add(comment.copy(createdBy = request.user.id.get))
            .map { comment =>
              Created(Json.toJson(comment))
            }
            .recover(apiErrorWithLog(e => Logger.error(s"Comments-Controller: Adding of Comment $comment failed with message ${e.getMessage}",e)))
        }
      }
      .getOrElse{
        Logger.warn("Comments-Controller: Failed to map request to Comment entity")
        Future.successful(BadRequest)
      }
  }

  def updateComments(commentId: String) = AuthenticatedAction.async(parse.json) { request =>
    Logger.info("Comments-Controller: Received update Comment request")
    request.body
      .validate[(String, Long)]
      .map { case (commentTextWithUser) =>
        val loggedinUser = request.user.id.get
        if(loggedinUser != commentTextWithUser._2) {
          Logger.warn("Comments-Controller: User is not authorized to perform this action")
          Future.successful(Unauthorized("this user is not authorized to perform this action"))
        }
        else{
          commentService
            .update(commentTextWithUser._1,commentId)
            .map { comment =>
              Ok(Json.toJson(comment))
            }
            .recover{
              apiErrorWithLog(e => Logger.error(s"Comments-Controller: Updating comment with comment id $commentId by $loggedinUser to $commentTextWithUser._1 failed with message ${e.getMessage}", e))
            }
        }
      }
      .getOrElse{
        Logger.warn("Comments-Controller: Failed to map request to Comment Text and User")
        Future.successful(BadRequest)
      }
  }

  implicit val tupledCommentTextWithUserReads = (
    (__ \ 'commentText).read[String] and
    (__ \ 'userId).read[Long]
  ) tupled

  def getByObjectRef(objectId: String, objectType: String) = Action.async { req =>
    Logger.info("Comments-Controller: Received get comment by object-reference request")
    val objectTypes = config.getStringSeq("dp.comments.object.types").getOrElse(Nil)
    if(!objectTypes.contains(objectType)){
      Logger.warn(s"Comments-Controller: Comment for object type $objectType is not supported")
      Future.successful(BadRequest)
    }
    else{
      commentService
        .getByObjectRef(req.rawQueryString) // passing req.rawQueryString as there may be 'offset' and 'size' parameters.
        .map { comments =>
          Ok(Json.toJson(comments))
        }
        .recover(apiErrorWithLog(e => Logger.error(s"Comments-Controller: Getting Comments with object Id $objectId and object Type $objectType failed with message ${e.getMessage}", e)))
    }
  }

  def getCommentsCount(objectId: Long, objectType: String) = Action.async { req =>
    Logger.info("Comments-Controller: Received get comments count by object-reference request")
    val objectTypes = config.getStringSeq("dp.comments.object.types").getOrElse(Nil)
    if(!objectTypes.contains(objectType)){
      Logger.warn(s"Comments-Controller: Comment for object type $objectType is not supported")
      Future.successful(BadRequest)
    }
    else{
      commentService
        .getCommentsCount(objectId, objectType)
        .map { commentsCount =>
        Ok(Json.toJson(commentsCount))
      }
        .recover(apiErrorWithLog(e => Logger.error(s"Comments-Controller: Getting Comments count with object Id $objectId and object Type $objectType failed with message ${e.getMessage}", e)))
    }
  }

  def getByParentId(parentId: String) = Action.async { req =>
    Logger.info("Comments-Controller: Received get comment by parent Id request")
    commentService.getByParentId(parentId,req.rawQueryString)
      .map { comments =>
        Ok(Json.toJson(comments))
      }
      .recover(apiErrorWithLog(e => Logger.error(s"Comments-Controller: Getting Comments with parent Id $parentId failed with message ${e.getMessage}", e)))
  }

  private def isNumeric(str: String) = scala.util.Try(str.toLong).isSuccess

  def deleteCommentById(commentId: String) = AuthenticatedAction.async { req =>
    Logger.info("Comments-Controller: Received delete comment request")
    val loggedinUser = req.user.id.get
    commentService.deleteById(commentId,loggedinUser)
      .map{ msg =>
        Ok(Json.toJson(msg))
      }
      .recover(apiErrorWithLog(e => Logger.error(s"Comments-Controller: Deleting comment with comment Id $commentId failed with message ${e.getMessage}", e)))
  }
}
