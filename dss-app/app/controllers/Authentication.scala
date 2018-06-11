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
import com.hortonworks.dataplane.commons.domain.Entities._
import com.hortonworks.dataplane.commons.domain.JsonFormatters._
import com.hortonworks.dataplane.db.Webservice.UserService
import org.apache.commons.codec.binary.Base64
import play.api.{Configuration, Logger}
import play.api.libs.json.{JsError, JsSuccess, Json}
import play.api.mvc._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.util.{Left, Try}

class Authentication @Inject()(@Named("userService") val userService: UserService,
                               configuration: Configuration)
    extends Controller {

  val HEADER_FOR_GATEWAY_USER_CTX = "X-DP-User-Info"

  private def handleErrors(errors: Errors) = {
    if (errors.errors.exists(_.status == 400))
      BadRequest(Json.toJson(errors))
    else if (errors.errors.exists(_.status == 403))
      Forbidden(Json.toJson(errors))
    else if (errors.errors.exists(_.status == 404))
      NotFound(Json.toJson(errors))
    else if (errors.errors.exists(_.status == 409))
      Conflict(Json.toJson(errors))
    else
      InternalServerError(Json.toJson(errors))
  }

  def userDetail = AuthenticatedAction.async { request =>
    request.headers
      .get(HEADER_FOR_GATEWAY_USER_CTX)
      .map { egt =>
        val encodedGatewayToken: String = egt
        val userJsonString: String = new String(Base64.decodeBase64(encodedGatewayToken))
        Json.parse(userJsonString)
          .validate[UserContext] match {
            case JsSuccess(userContext, _) => Future.successful(Ok(Json.toJson(userContext)))
            case JsError(error) =>
              Logger.error(s"Error while parsing Gateway token. $error")
              Future.successful(Unauthorized)
            }
      }
      .getOrElse(Future.successful(Unauthorized))
  }

  def getAllRoles = Action.async { req =>
    userService.getRoles().map {
      case Left(errors) => handleErrors(errors)
      case Right(roles) => Ok(Json.toJson(roles))
    }
  }
}
