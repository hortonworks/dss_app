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

import com.google.inject.Inject
import java.io.File

import akka.util.ByteString
import play.api.Mode
import play.api.http.HttpEntity
import play.api.mvc.{Action, AnyContent, Result, ResponseHeader}

class StaticAssets @Inject() (environment: play.api.Environment,
                              configuration: play.api.Configuration) extends ExternalAssets(environment) {

  /**
    * Generates an `Action` that serves a static resource from an external folder
    *
    * @param rootPath the root folder for searching the static resource files such as `"/home/peter/public"`, `C:\external` or `relativeToYourApp`
    * @param file the file part extracted from the URL
    */
  override def at(rootPath: String, file: String): Action[AnyContent] = Action { request =>
    environment.mode match {
      case Mode.Prod => {

        val fileToServe = rootPath match {
          case AbsolutePath(_) => new File(rootPath, file)
          case _ => new File(environment.getFile(rootPath), file)
        }

        val defaultFileToServe = new File(rootPath, "index.html")

        if (fileToServe.exists) {
          Ok.sendFile(fileToServe, inline = true).withHeaders(CACHE_CONTROL -> "max-age=3600")
        } else {
          Ok.sendFile(defaultFileToServe, inline = true).withHeaders(CACHE_CONTROL -> "max-age=3600")
        }

      }
      case _ => Result (
        header = ResponseHeader(404, Map.empty),
        body = HttpEntity.Strict(ByteString(views.html.defaultpages.notFound.apply("404", rootPath).body), Some("text/html"))
      )
    }
  }
}