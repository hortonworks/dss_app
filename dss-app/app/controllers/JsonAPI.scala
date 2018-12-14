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

import play.api.Logger
import models.ErrorEntities.Error
import play.api.libs.json.Json
import play.api.mvc.{Controller, Result}
import repo.Z_RepoExceptions._
import models.JsonFormatters._
import com.hortonworks.dataplane.commons.domain.Entities.WrappedErrorException
import utils._

trait JsonAPI extends Controller {

  import com.hortonworks.dataplane.commons.domain.JsonFormatters._

  def withLogAndApiError(custLogMsg: String, logBlock: (Throwable) => Unit = defaultLogMessage): PartialFunction[Throwable, Result] = {
    case e: Throwable => {
      Logger.error(custLogMsg)
      logBlock(e)
      apiError(e, custLogMsg)
    }
  }

  def apiErrorWithLog(logBlock: (Throwable) => Unit = defaultLogMessage): PartialFunction[Throwable, Result] = {
    case e: Throwable => {
      logBlock(e)
      apiError(e)
    }
  }

  private def defaultLogMessage =
    (e: Throwable) => Logger.error(e.getMessage, e)


  def apiError(error: Throwable, custMsg: String = ""): Result = error match {
    case rae: WrappedErrorException => Status(rae.error.status)(Json.toJson(rae))
    case e: WrongParameters => BadRequest(Json.toJson(Error(400, "400", s"$custMsg ${e.getMessage}")))
    case e: BadRequestException => BadRequest(Json.toJson(Error(400, "400", s"$custMsg ${e.getMessage}")))
    case e: AuthenticationException => Unauthorized(Json.toJson(Error(401, "401", s"$custMsg ${e.getMessage}")))
    case e: Forbidden => Forbidden(Json.toJson(Error(403, "403", s"$custMsg ${e.getMessage}")))
    case e: ForbiddenException => Forbidden(Json.toJson(Error(403, "403", s"$custMsg ${e.getMessage}")))
    case e: EntityNotFound => NotFound(Json.toJson(Error(404, "404", s"$custMsg ${e.getMessage}")))
    case e: NotFoundException => NotFound(Json.toJson(Error(404, "404", s"$custMsg ${e.getMessage}")))
    case e: NoSuchElementException => NotFound(Json.toJson(Error(404, "404", s"$custMsg ${e.getMessage}")))
    case e: RequestTimeoutException => RequestTimeout(Json.toJson(Error(408, "408", s"$custMsg ${e.getMessage}")))
    case e: BadGatewayException => BadGateway(Json.toJson(Error(502, "502", s"$custMsg ${e.getMessage}")))
    case e: GatewayTimeoutException => GatewayTimeout(Json.toJson(Error(504, "504", s"$custMsg ${e.getMessage}")))
    case e: WrappedErrorsException => InternalServerError(Json.toJson(Error(500, "500", s"$custMsg ${e.errors.toString}")))
    case e: Exception => InternalServerError(Json.toJson(Error(500, "500", s"$custMsg ${e.getMessage}")))
    case e: Throwable => InternalServerError(Json.toJson(Error(500, "500", s"$custMsg ${e.getMessage}")))
  }

}
