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
import {Observable} from 'rxjs/Observable';
import {HttpClient} from '@angular/common/http';

import {DataSet, DataSetAndCategories, DataSetAndTags} from '../models/data-set';

@Injectable()
export class DataSetService {
  url = 'api/datasets';

  constructor(private httpClient: HttpClient) {}

  // list(): Observable<DataSet[]> {
  //   return this.httpClient.get<DataSet[]>(this.url);
  // }

  query(params: { name?: string }): Observable<DataSet[]> {
    const query = Object.keys(params).reduce((accumulator, cParamKey) => `${accumulator}&${cParamKey}=${params[cParamKey]}`, '');
    return this.httpClient.get<DataSet[]>(`${this.url}?${query}`);
  }

  post(data: DataSetAndTags): Observable<DataSetAndCategories> {
    data.dataset.createdBy = 0;
    return this.httpClient.post<DataSetAndCategories>(`${this.url}`, data);
  }

  update(dataset: DataSet): Observable<DataSet> {
    return this.httpClient.patch<DataSet>(`${this.url}/${dataset.id}`, dataset);
  }

  // get(datasetId: number): Observable<DataSetAndCategories> {
  //   return this.httpClient.get<DataSetAndCategories>(`${this.url}/${datasetId}`);
  // }

  delete(datasetId: number): Observable<any> {
    return this.httpClient.delete<any>(`${this.url}/${datasetId}`);
  }

  datasetsByName(names: string[]): Observable<DataSet[]> {
    return this.httpClient.get<DataSet[]>(`api/dataset/bynames?names=${names.join(',')}`);
  }

}
