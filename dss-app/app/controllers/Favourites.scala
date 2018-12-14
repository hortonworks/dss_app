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
import models.JsonFormatters._
import models.SocialEntities.Favourite
import models.UserEntities.DssUser
import play.api.{Configuration, Logger}
import play.api.libs.json._
import play.api.mvc._
import repo.FavouriteRepo

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

class Favourites @Inject()(favouriteRepo: FavouriteRepo,
                         private val config: Configuration)
  extends Controller with JsonAPI {

  def add = AuthenticatedAction.async(parse.json) { request =>
    Logger.info("Favourites-Controller: Received add favourite request")
    val loggedinUser = request.user.id.get
    request.body
      .validate[Favourite]
      .map { fav =>
        val objectTypes = config.getStringSeq("dss.favourites.object.types").getOrElse(Nil)
        if(!objectTypes.contains(fav.objectType)) {
          Future.successful(BadRequest(s"Favourites for object type ${fav.objectType} is not supported"))
        }else {
          favouriteRepo.addAndGetWithTotal(fav, new DssUser(request.user))
            .map { tpl:(Favourite, Long) => Created(Json.obj("favourite" -> Json.toJson(tpl._1), "totalFavCount" -> tpl._2))}
            .recover(apiErrorWithLog(e => Logger.error(s"Favourites-Controller: Adding of favourite $fav failed with message ${e.getMessage}",e)))
        }

      }
      .getOrElse(Future.successful(BadRequest))
  }

  def deleteById(favId: Long, objectType: String, objectId:Long) = AuthenticatedAction.async { req =>
    Logger.info("Favourites-Controller: Received delete favourite request")
    favouriteRepo.deleteAndGetTotal(favId, new DssUser(req.user))
      .map {tpl:(Long, Long) => Ok(Json.obj("rowsDeleted" -> tpl._1, "totalFavCount" -> tpl._2))}
      .recover(apiErrorWithLog(e => Logger.error(s"Favourites-Controller: Deleting Favourite with Favourite Id $favId failed with message ${e.getMessage}", e)))
  }
}
