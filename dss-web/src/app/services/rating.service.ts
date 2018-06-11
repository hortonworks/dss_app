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
import {Http, Headers, RequestOptions} from '@angular/http';
import {Observable} from 'rxjs/Observable';
import {HttpUtil} from '../shared/utils/httpUtil';
import {Rating} from "../models/rating";
import {Subject} from "rxjs/Subject";

@Injectable()
export class RatingService implements OnDestroy, OnInit{
  uri = 'api/ratings';

  dataChanged = new Subject<number>();
  dataChanged$ = this.dataChanged.asObservable();

  constructor(private http:Http) { }

  ngOnInit(): void {
    this.dataChanged = new Subject<number>();
    this.dataChanged$ = this.dataChanged.asObservable();
  }

  get(objectId: string, objectType: string): Observable<Rating>  {
    const uri = `${this.uri}?objectId=${objectId}&objectType=${objectType}`;

    return this.http
      .get(uri, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .catch(err => {
        if(err.status == 404) {
          return Observable.throw(err);
        }
        return HttpUtil.handleError(err)
      });
  }

  getAverage(objectId: string, objectType: string): Observable<any>  {
    const uri = `${this.uri}/actions/average?objectId=${objectId}&objectType=${objectType}`;

    return this.http
      .get(uri, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .catch(err => {
        return HttpUtil.handleError(err)
      });
  }

  add(rating: Rating): Observable<Rating> {
    return this.http
      .post(`${this.uri}`, rating, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .catch(HttpUtil.handleError);
  }

  update(rate: number, ratingId: number): Observable<Rating> {
    return this.http
      .patch(`${this.uri}/${ratingId}`, {"rating":rate}, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .catch(HttpUtil.handleError);
  }

  ngOnDestroy() {
    this.dataChanged.unsubscribe();
    this.dataChanged = null;
    this.dataChanged$ = null;
  }
}
