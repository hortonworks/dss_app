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

import { Injectable } from '@angular/core';
import { Http, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';

import { Lake } from '../models/lake';
import {Cluster, ServiceInfo} from '../models/cluster';

import { HttpUtil } from '../shared/utils/httpUtil';
import {Subject} from 'rxjs/Subject';


@Injectable()
export class LakeService {
  url = 'api/lakes';

  clusterAdded = new Subject<boolean>();
  clusterAdded$ = this.clusterAdded.asObservable();

  clusterDeleted = new Subject<boolean>();
  clusterDeleted$ = this.clusterDeleted.asObservable();

  clusterDeleteFailed = new Subject<boolean>();
  clusterDeleteFailed$ = this.clusterDeleted.asObservable();

  constructor(
    private http:Http
  ) {}

  list(): Observable<Lake[]> {
    return this.http
      .get(this.url, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .catch(HttpUtil.handleError);
  }

  listAsPromise(): Promise<Lake[]> {
    return this.http
    .get(this.url, new RequestOptions(HttpUtil.getHeaders()))
    .map(HttpUtil.extractData)
    .toPromise();
  }

  insert(lake: Lake): Observable<Lake> {
    return this.http
      .post(`${this.url}`, lake, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .catch(HttpUtil.handleError);
  }

  update(lake: Lake): Observable<Lake> {
    return this.http
      .put(`${this.url}/${lake.id}`, lake, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .catch(HttpUtil.handleError);
  }

  retrieve(lakeId: string): Observable<Lake> {
    return this.http
      .get(`${this.url}/${lakeId}`, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .catch(HttpUtil.handleError);
  }

  deleteCluster(lakeId: string) : Observable<any> {
    return this.http
      .delete(`${this.url}/${lakeId}`, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .catch(HttpUtil.handleError);
  }

  getDiscoveredServices(lakeId: string): Observable<any[]> {
    return this.http
      .get(`${this.url}/${lakeId}/services`, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .catch(HttpUtil.handleError);
  }


  listWithClusters(type: string = 'all'): Observable<{ data: Lake, clusters: Cluster[] }[]> {
    return this.http
      .get(`api/actions/clusters?type=${type}`, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .catch(HttpUtil.handleError);
  }

  listWithClusterId(type: string = 'all'): Observable<Array<Lake>> {
    return this.http
      .get(`api/actions/clusters?type=${type}`, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .map(lakes => {
        var lakesWithClusterId = [];
        lakes.forEach(lake => {
          lake.data.clusterId = lake.clusters[0].id;
          lakesWithClusterId.push(lake.data);
        })
        return lakesWithClusterId;
      })
      .catch(HttpUtil.handleError);
  }

  listWithClustersAsPromise(type: string = 'all'): Promise<{ data: Lake, clusters: Cluster[] }[]> {
    return this.http
    .get(`api/actions/clusters?type=${type}`, new RequestOptions(HttpUtil.getHeaders()))
    .map(HttpUtil.extractData)
    .toPromise()
    .catch(HttpUtil.handleError);
  }

  validate(ambariUrl: string): Observable<any> {
  return this.http
    .get(`api/ambari/status?url=${ambariUrl}`, new RequestOptions(HttpUtil.getHeaders()))
    .map(HttpUtil.extractData)
    .catch(HttpUtil.handleError);
  }

  getServicesInfo(lakeId: string): Observable<ServiceInfo[]> {
    return this.http
      .get(`${this.url}/${lakeId}/servicesDetails`, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .catch(HttpUtil.handleError);
  }

  getPairsMock(lakes, id:number) : Observable<{
      data: Lake,
      clusters: Cluster[],
      status : number
    }>{
      if(lakes.length === 1){
        return null;
      }
      let index = lakes.findIndex((lake)=>{return id === lake.data.id})
      if(index === lakes.length - 1){
        return Observable.of(lakes[index - 1]);
      }else{
        return Observable.of(lakes[index + 1]);
      }
    }

}
