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
import {Http, RequestOptions} from '@angular/http';
import {Observable} from 'rxjs/Observable';
import {ProfilerMetricRequest} from '../models/profiler-metric-request';
import {ProfilerMetricResponse} from '../models/profiler-metric-response';
import {HttpUtil} from '../shared/utils/httpUtil';
import {ProfilerInfoWithJobsCount, JobInfoModel, ProfilerInfoWithAssetsCount} from '../models/profiler-models';
import {ProfilerAndAssetInfo} from '../models/profiler-and-asset-info';
import {ProfilerInstance, ProfilerInstanceConfig, ProfilerInstanceWithSelectorConfig} from '../models/profiler-config';
import {HttpClient} from '@angular/common/http';
import { ProfilerRunConfig, ProfilerSelector } from '../models/profiler-selector';

@Injectable()
export class ProfilerService {
  constructor(private httpClient: HttpClient) {
  }

  assetCollectionStats(profilerMetricRequest: ProfilerMetricRequest): Observable<ProfilerMetricResponse> {
    const url = '/api/dpProfiler/metrics';
    return this.httpClient.post<ProfilerMetricResponse>(url, profilerMetricRequest);
  }

  getStatusWithJobCounts(clusterId: number, startTime: number, endTime: number): Observable<ProfilerInfoWithJobsCount[]> {
    const uri = `/api/dpProfiler/${clusterId}/status-with-jobs-count?startTime=${startTime}&endTime=${endTime}`;
    return this.httpClient.get<{data: ProfilerInfoWithJobsCount[]}>(uri).map(res => res.data);
  }

  getExistingProfiledAssetCount(clusterId: number , profilerInstanceName: string): Observable<any> {
    const uri = `/api/dpProfiler/${clusterId}/assets?profilerInstanceName=${profilerInstanceName}`;
    return this.httpClient.get<{data: any}>(uri).map(res => res.data);
  }

  getStatusWithAssetsCounts(clusterId: number, startTime: number, endTime: number): Observable<ProfilerInfoWithAssetsCount[]> {
    const uri = `/api/dpProfiler/${clusterId}/status-with-assets-count?startTime=${startTime}&endTime=${endTime}`;
    return this.httpClient.get<{data: ProfilerInfoWithAssetsCount[]}>(uri).map(res => res.data);
  }


  jobsList(clusterId: number, offset: number, limit: number, sortBy: string, sorOrder: string,
           startTime: number, endTime: number, profilerIds: Array<number>, statusArray: Array<String>): Observable<JobInfoModel[]> {
    const url = `/api/dpProfiler/${clusterId}/jobs?`;
    let uri = `${url}offset=${offset}&limit=${limit}&sortBy=${sortBy}&sortDir=${sorOrder}&startTime=${startTime}&endTime=${endTime}`;
    profilerIds.forEach(id => uri += `&profilerIds=${id}`);
    statusArray.forEach(status => uri += `&status=${status}`);
    return this.httpClient.get<{data: JobInfoModel[]}>(uri).map(res => res.data);
  }

  putProfilerState(clusterId: number, name: string, state: boolean): Observable<any> {
    const uri = `/api/dpProfiler/${clusterId}/profilerinstances/state?name=${name}&active=${state}`;
    return this.httpClient.put<{data: any}>(uri, {}).map(res => res.data);
  }

  getProfilerHistories(clusterId: number, name: string, startTime: number, endTime: number): Observable<any> {
    const uri = `/api/dpProfiler/${clusterId}/histories?profilerName=${name}&startTime=${startTime}&endTime=${endTime}`;
    return this.httpClient.get<{data: any}>(uri).map(res => res.data);
  }

  getProfilersRanOnAsset(clusterId: number, assetFullyQualifiedName: string): Observable<ProfilerAndAssetInfo[]> {
    const url = `/api/${clusterId}/assets/${assetFullyQualifiedName}/profilerslastrun`;
    return this.httpClient.get<{data: ProfilerAndAssetInfo[]}>(url).map(res => res.data);
  }

  getProfilerInstanceByName(clusterId: number, name: string): Observable<ProfilerInstanceConfig> {
    const url = `/api/dpProfiler/${clusterId}/profilerinstances/${name}`;
    return this.httpClient.get<{data: ProfilerInstanceConfig}>(url).map(res => res.data);
  }

  updateProfilerInstance(clusterId: number, instance: ProfilerInstance): Observable<ProfilerInstanceConfig> {
    const url = `/api/dpProfiler/${clusterId}/profilerinstances`;
    return this.httpClient.put<{data: ProfilerInstanceConfig}>(url, instance).map(res => res.data);
  }

  getProfilerSelectorsConfig(clusterId: number): Observable<ProfilerSelector[]> {
    const url = `/api/dpProfiler/${clusterId}/selectors`;
    return this.httpClient.get<{data: ProfilerSelector[]}>(url).map(res => res.data);
  }

  updateProfilerSelector(clusterId: number, name: string, config: ProfilerRunConfig): Observable<ProfilerSelector> {
    const url = `/api/dpProfiler/${clusterId}/selectors/${name}`;
    return this.httpClient.put<ProfilerSelector>(url, config);
  }

  updateProfilerInstanceWithSelectorConfig(clusterId:number, newConfig: ProfilerInstanceWithSelectorConfig):Observable<ProfilerInstance> {
    const url = `/api/dpProfiler/${clusterId}/profilerinstancesconfig`;
    return this.httpClient.put<ProfilerInstance>(url, newConfig);
  }
  
  bulkUpdateProfilerInstanceWithSelectorConfig(clusterId:number, newConfigs: ProfilerInstanceWithSelectorConfig[]):Observable<ProfilerInstance[]> {
    const url = `/api/dpProfiler/${clusterId}/profilerinstancesconfig/bulk`;
    return this.httpClient.put<ProfilerInstance[]>(url, newConfigs);
  }

  getYarnQueueList(clusterId:number):Observable<string[]> {
    const url = `/api/dpProfiler/${clusterId}/yarnqueues`;
    return this.httpClient.get<string[]>(url)
  }
}
