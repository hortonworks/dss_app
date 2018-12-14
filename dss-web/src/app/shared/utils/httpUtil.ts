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

export const HEADER_CHALLENGE_HREF = 'X-Authenticate-Href';
import {HttpErrorResponse} from "@angular/common/http";
import { CustomError } from '../../models/custom-error';
import { Alerts } from './alerts';


export class HttpUtil {

  public static httpErrResponseHandler(httpErrResponse: HttpErrorResponse) {
    let message = '';
    const errorJSON = httpErrResponse.error;
     if (Array.isArray(errorJSON.errors) && errorJSON.errors[0] && errorJSON.errors[0].status &&
      errorJSON.errors[0].message && errorJSON.errors[0].errorType) {
      message = errorJSON.errors.filter(err => (err.status && err.message && err.errorType))
        .map(err => this.truncateErrorMessage(err.message))
        .join(', ');
    } else if (errorJSON.error && errorJSON.error.message) {
      message = errorJSON.error.message;
    } else if (Array.isArray(errorJSON)) {
      message = errorJSON.map(err => this.truncateErrorMessage(err.message))
        .join(', ');
    } else if (errorJSON.message) {
      message = this.truncateErrorMessage(errorJSON.message);
    } else if (errorJSON.errors) {
      message = errorJSON.errors.map(err => this.truncateErrorMessage(err.message))
        .join(', ');
    } else {
      message = 'Error Occurred while processing';
    }
    Alerts.showErrorMessage(message);
  }
  private static truncateErrorMessage(errorMessage: string) {
    if (errorMessage.length < 256) {
      return errorMessage;
    }
    return errorMessage.substring(0, 256);
  }

}
