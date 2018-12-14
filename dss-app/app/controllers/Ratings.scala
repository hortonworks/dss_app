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
import models.SocialEntities.Rating
import models.UserEntities.DssUser
import play.api.{Configuration, Logger}
import play.api.libs.json.{__, _}
import play.api.libs.functional.syntax._
import play.api.mvc._
import repo.RatingRepo

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

class Ratings @Inject()(ratingRepo: RatingRepo,
                        private val config: Configuration)
  extends Controller with JsonAPI {

  val objectTypes = config.getStringSeq("dss.ratings.object.types").getOrElse(Nil)

  def add = AuthenticatedAction.async(parse.json) { request =>
    Logger.info("dss Ratings Controller: Received add rating request")
    request.body
      .validate[Rating]
      .map { rating =>
        if(!objectTypes.contains(rating.objectType)) {
          Logger.warn(s"Ratings-Controller: Ratings for object type ${rating.objectType} is not supported")
          Future.successful(BadRequest("Ratings for object type ${rating.objectType} is not supported"))
        }
        else{
          ratingRepo.add(rating, new DssUser(request.user))
            .map { rt => Created(Json.toJson(rt)) }
            .recover(apiErrorWithLog(e => Logger.error(s"Ratings Controller: Adding of Rating $rating failed with message ${e.getMessage}",e)))
        }
      }
      .getOrElse(Future.successful(BadRequest))
  }

  def get(objectId: String, objectType: String) = AuthenticatedAction.async { req =>
    Logger.info("dss Ratings Controller: Received get rating request")
    if(!objectTypes.contains(objectType)) {
      Logger.warn(s"Ratings-Controller: Ratings for object type ${objectType} is not supported")
      Future.successful(BadRequest(" Ratings for object type ${objectType} is not supported"))
    }
    else {
      ratingRepo.get(req.user.id.get, objectId.toLong, objectType)
        .map{
          rating => Ok(Json.toJson(rating ))
        }
        .recover(apiErrorWithLog(e => Logger.error(s"Ratings-Controller: Get rating with object id $objectId and object type $objectType failed with message ${e.getMessage}",e)))
    }
  }

  def getAverage(objectId: String, objectType: String) = Action.async { req =>
    Logger.info("dss Ratings Controller: Received get-average rating request")
    if(!objectTypes.contains(objectType)) {
      Logger.warn(s"Ratings-Controller: Ratings for object type ${objectType} is not supported")
      Future.successful(BadRequest(" Ratings for object type ${objectType} is not supported"))
    }
    else {
      ratingRepo.getAverageAndLength(objectId.toLong, objectType)
        .map {
          avgAndTotalVotes=> Ok(Json.obj("average" -> avgAndTotalVotes._1, "votes" -> avgAndTotalVotes._2))
        }
        .recover(apiErrorWithLog(e => Logger.error(s"Ratings-Controller: Get average rating with object id $objectId and object type $objectType failed with message ${e.getMessage}",e)))
    }
  }

  def update(ratingId: String) = AuthenticatedAction.async(parse.json) { request =>
    Logger.info("dss Ratings Controller: Received update rating request")
    request.body
      .validate[(Float)]
      .map { rt =>
        ratingRepo.update(ratingId.toLong, rt, new DssUser(request.user))
          .map { rating =>
            Ok(Json.toJson(rating))
          }
          .recover(apiErrorWithLog(e => Logger.error(s"Ratings-Controller: update of rating with rating id $ratingId failed with message ${e.getMessage}",e)))
      }
      .getOrElse(Future.successful(BadRequest))
  }

  implicit val tupledRatingReads = ((__ \ 'rating).read[Float])
}

