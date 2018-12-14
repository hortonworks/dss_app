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

import {Injectable, OnDestroy, OnInit} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {Rating} from '../models/rating';
import {HttpUtil} from "../shared/utils/httpUtil";

@Injectable()
export class RatingService implements OnDestroy, OnInit {
  uri = 'api/ratings';

  dataChanged = new Subject<number>();
  dataChanged$ = this.dataChanged.asObservable();

  constructor(private httpClient: HttpClient) { }

  ngOnInit(): void {
    this.dataChanged = new Subject<number>();
    this.dataChanged$ = this.dataChanged.asObservable();
  }

  get(objectId: string, objectType: string): Observable<Rating> {
    const uri = `${this.uri}?objectId=${objectId}&objectType=${objectType}`;
    let headers = new HttpHeaders();
    headers = headers.append('httpUtilErrorHandler', 'inService');
    return this.httpClient.get<Rating>(uri, {headers: headers}).catch(err => {
      if(err.status !== 404) HttpUtil.httpErrResponseHandler(err)
      return Observable.throwError(err)
    });
  }

  getAverage(objectId: string, objectType: string): Observable<{votes: number, average: number}>  {
    const uri = `${this.uri}/actions/average?objectId=${objectId}&objectType=${objectType}`;
    return this.httpClient.get<{votes: number, average: number}>(uri);
  }

  add(rating: Rating): Observable<Rating> {
    return this.httpClient.post<Rating>(`${this.uri}`, rating);
  }

  update(rate: number, ratingId: number): Observable<Rating> {
    return this.httpClient.patch<Rating>(`${this.uri}/${ratingId}`, {'rating': rate});
  }

  ngOnDestroy() {
    this.dataChanged.unsubscribe();
    this.dataChanged = null;
    this.dataChanged$ = null;
  }
}
