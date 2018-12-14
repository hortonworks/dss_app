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
import {HttpClient} from '@angular/common/http';


@Injectable()
export class LakeService {
  url = 'api/lakes';

  clusterAdded = new Subject<boolean>();
  clusterAdded$ = this.clusterAdded.asObservable();

  clusterDeleted = new Subject<boolean>();
  clusterDeleted$ = this.clusterDeleted.asObservable();

  clusterDeleteFailed = new Subject<boolean>();
  clusterDeleteFailed$ = this.clusterDeleted.asObservable();

  constructor(private httpClient: HttpClient) {}

  // list(): Observable<Lake[]> {
  //   return this.httpClient.get<Lake[]>(this.url);
  // }

  // listAsPromise(): Promise<Lake[]> {
  //   return this.httpClient.get<Lake[]>(this.url)
  //   .toPromise();
  // }

  // insert(lake: Lake): Observable<Lake> {
  //   return this.httpClient.post<Lake>(`${this.url}`, lake);
  // }

  // update(lake: Lake): Observable<Lake> {
  //   return this.httpClient.put<Lake>(`${this.url}/${lake.id}`, lake);
  // }

  // retrieve(lakeId: string): Observable<Lake> {
  //   return this.httpClient.get<Lake>(`${this.url}/${lakeId}`);
  // }

  // deleteCluster(lakeId: string): Observable<any> {
  //   return this.httpClient.delete<any>(`${this.url}/${lakeId}`);
  // }

  // getDiscoveredServices(lakeId: string): Observable<any[]> {
  //   return this.httpClient.get<any[]>(`${this.url}/${lakeId}/services`);
  // }


  listWithClusters(type: string = 'all'): Observable<{ data: Lake, clusters: Cluster[] }[]> {
    return this.httpClient.get<{ data: Lake, clusters: Cluster[] }[]>(`api/actions/clusters?type=${type}`);
  }

  listWithClusterId(type: string = 'all'): Observable<Lake[]> {
    return this.httpClient.get<Array<{data: any, clusters: any}>>(`api/actions/clusters?type=${type}`)
      .map((lakes: Array<{data: any, clusters: any}>) => {
        const lakesWithClusterId: Lake[] = [];
        lakes.forEach(lake => {
          lake.data.clusterId = lake.clusters[0].id;
          lakesWithClusterId.push(lake.data);
        });
        return lakesWithClusterId;
      });
  }

  listWithClustersAsPromise(type: string = 'all'): Promise<{ data: Lake, clusters: Cluster[] }[]> {
    return this.httpClient.get<{ data: Lake, clusters: Cluster[] }[]>(`api/actions/clusters?type=${type}`).toPromise();
  }

  // validate(ambariUrl: string): Observable<any> {
  //   return this.httpClient.get<any>(`api/ambari/status?url=${ambariUrl}`);
  // }

  // getServicesInfo(lakeId: string): Observable<ServiceInfo[]> {
  //   return this.httpClient.get<ServiceInfo[]>(`${this.url}/${lakeId}/servicesDetails`);
  // }
}
