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
import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {HttpClient} from '@angular/common/http';

import {Comment, CommentWithUser} from '../models/comment';

@Injectable()
export class CommentService implements OnDestroy , OnInit {

  uri = 'api/comments';

  dataChanged = new Subject<boolean>();
  dataChanged$ = this.dataChanged.asObservable();

  constructor(private httpClient: HttpClient) { }

  ngOnInit() {
    this.dataChanged = new Subject<boolean>();
    this.dataChanged$ = this.dataChanged.asObservable();
  }

  getByObjectRef(objectId: string, objectType: string, offset: number, size: number): Observable<CommentWithUser[]>  {
    const uri = `${this.uri}?objectId=${objectId}&objectType=${objectType}&offset=${offset}&size=${size}`;
    return this.httpClient.get<CommentWithUser[]>(uri);
  }

  getCommentsCount(objectId: string, objectType: string): Observable<any>  {
    const uri = `${this.uri}/actions/count?objectId=${objectId}&objectType=${objectType}`;
    return this.httpClient.get<any>(uri);
  }

  getByParentId(parentCommentId): Observable<CommentWithUser[]>  {
    const uri = `${this.uri}/${parentCommentId}/replies`;
    return this.httpClient.get<CommentWithUser[]>(uri);
  }

  add(comment: Comment): Observable<CommentWithUser> {
    return this.httpClient.post<CommentWithUser>(`${this.uri}`, comment);
  }

  deleteComment(id: number): Observable<any> {
    return this.httpClient.delete<any>(`${this.uri}/${id}`);
  }

  ngOnDestroy() {
    this.dataChanged.unsubscribe();
    this.dataChanged = null;
    this.dataChanged$ = null;
  }
}
