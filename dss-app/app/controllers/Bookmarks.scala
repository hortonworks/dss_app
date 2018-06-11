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
import com.hortonworks.dataplane.commons.domain.Entities.{Bookmark}
import com.hortonworks.dataplane.commons.domain.JsonFormatters._
import com.hortonworks.dataplane.db.Webservice.{BookmarkService}
import play.api.{Configuration, Logger}
import play.api.libs.json._
import play.api.mvc._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

class Bookmarks @Inject()(@Named("bookmarkService") val bookmarkService: BookmarkService,
                           private val config: Configuration)
  extends Controller with JsonAPI {

  def add = AuthenticatedAction.async(parse.json) { request =>
    Logger.info("Bookmarks-Controller: Received add bookmark request")
    val loggedinUser = request.user.id.get
    request.body
      .validate[Bookmark]
      .map { bm =>
        val objectTypes = config.getStringSeq("dss.bookmarks.object.types").getOrElse(Nil)
        if(!objectTypes.contains(bm.objectType)) {
          Logger.warn(s"Bookmarks-Controller: Bookmarks for object type ${bm.objectType} is not supported")
          Future.successful(BadRequest(s"Bookmarks for object type ${bm.objectType} is not supported"))
        }else {
          bookmarkService
            .add(bm.copy(userId = loggedinUser))
            .map { bookmark =>
              Created(Json.toJson(bookmark))
            }
            .recover(apiErrorWithLog(e => Logger.error(s"Bookmarks-Controller: Adding of bookmark $bm failed with message ${e.getMessage}",e)))
        }
      }
      .getOrElse{
        Logger.warn("Bookmarks-Controller: Failed to map request to Bookmark entity")
        Future.successful(BadRequest)
      }
  }

  def deleteById(bmId: Long) = AuthenticatedAction.async { req =>
    Logger.info("Bookmarks-Controller: Received delete bookmark request")
    val loggedinUser = req.user.id.get
    bookmarkService.deleteById(loggedinUser, bmId)
      .map{ msg =>
        Ok(Json.toJson(msg))
      }
      .recover(apiErrorWithLog(e => Logger.error(s"Bookmarks-Controller: Deleting Bookmark with bookmark Id $bmId failed with message ${e.getMessage}", e)))
  }
}
