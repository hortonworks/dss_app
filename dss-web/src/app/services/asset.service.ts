///<reference path="../models/asset-property.ts"/>
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

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import { Observable } from 'rxjs';
import {AssetDetails} from '../models/asset-property';
import {HttpUtil} from '../shared/utils/httpUtil';


@Injectable()
export class AssetService {
  uri = 'api/assets';

  constructor(private httpClient: HttpClient) { }

  getDetails(clusterId: string, assetId: string): Observable<AssetDetails> {
    const uri = `${this.uri}/details/${clusterId}/${assetId}`;
    return this.httpClient.get<AssetDetails>(uri);
  }

  getProfilerAuditResults(clusterId: string, dbName: string, tableName: string, userName: string, dateModel: any): Observable<any> {
    const endDate = `${dateModel.endDate.year}-${dateModel.endDate.month}-${dateModel.endDate.day}`;
    const startDate = `${dateModel.beginDate.year}-${dateModel.beginDate.month}-${dateModel.beginDate.day}`;
    return this.getAuditProfilerStats(clusterId, dbName, tableName, startDate, endDate, userName);
  }

  getAuditProfilerStats(clusterId: string, dbName: string, tableName: string,
                                startDate: string, endDate: string, userName: string): Observable<any> {
    let uri = `api/dpProfiler/auditResults?`;
    const user = userName ? ('&userName=' + userName) : '';
    uri += `clusterId=${clusterId}&dbName=${dbName}&tableName=${tableName}&startDate=${startDate}&endDate=${endDate}${user}`;
    return this.httpClient.get<any>(uri, {observe: 'response'});
  }

  getProfilerAuditActions(clusterId: string, dbName: string, tableName: string, userName: string, dateModel: any): Observable<any> {
    const endDate = `${dateModel.endDate.year}-${dateModel.endDate.month}-${dateModel.endDate.day}`;
    const startDate = `${dateModel.beginDate.year}-${dateModel.beginDate.month}-${dateModel.beginDate.day}`;
    return this.getAuditProfilerActions(clusterId, dbName, tableName, startDate, endDate, userName);
  }

  getAuditProfilerActions(clusterId: string, dbName: string, tableName: string, startDate: string, endDate: string, userName: string) {
    let uri = `api/dpProfiler/auditActions?`;
    const user = userName ? ('&userName=' + userName) : '';
    uri += `clusterId=${clusterId}&dbName=${dbName}&tableName=${tableName}&startDate=${startDate}&endDate=${endDate}${user}`;
    return this.httpClient.get(uri, {observe: 'response'});
  }
}
