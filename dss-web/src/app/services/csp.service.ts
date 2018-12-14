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

import {Observable} from "rxjs";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {RequestOptions} from '@angular/http';
import {
  CSP_Rule_With_Attributes, CSPTestDataforRule, DryRunResult, CSPMetaConfig, CSPResource, CSP_Resource_RegEx,
  CSP_Resource_File
} from "../models/CSP_Rule";
import {Injectable} from "@angular/core";

@Injectable()
export class CspService {
  url = 'api/csp';

  constructor(private httpClient: HttpClient) {}

  list(): Observable<CSP_Rule_With_Attributes[]> {
    return this.httpClient.get<CSP_Rule_With_Attributes[]>(`${this.url}/rules`);
  }

  listClassifications(): Observable<any[]> { //TODO instead of any have case class defined for classification structure
    return this.httpClient.get<any[]>(`${this.url}/classifications`);
  }

  updateRule(rule:CSP_Rule_With_Attributes): Observable<CSP_Rule_With_Attributes> {
    return this.httpClient.put<CSP_Rule_With_Attributes>(`${this.url}/rule`, rule);
  }

  createRule(rule:CSP_Rule_With_Attributes): Observable<CSP_Rule_With_Attributes> {
    return this.httpClient.post<CSP_Rule_With_Attributes>(`${this.url}/rule`, rule);
  }

  deleteRule(ruleId:number): Observable<any> {
    return this.httpClient.delete<any>(`${this.url}/rule/${ruleId}`);
  }

  deployRule(ruleId:number, clusterIds:number[]): Observable<any> {
    return this.httpClient.post<any>(`/api/csp/rule/${ruleId}/publish`, clusterIds);
  }

  suspendRule(ruleId:number): Observable<any> {
    return this.httpClient.post<any>(`/api/csp/rule/${ruleId}/unpublish`, {});
  }

  startTestRun(testData: CSPTestDataforRule): Observable<DryRunResult> {
    return this.httpClient.post<DryRunResult>(`/api/csp/testrun`, testData)
  }

  getTestRunStatus(testId: number, clusterId: number): Observable<DryRunResult> {
    return this.httpClient.get<DryRunResult>(`/api/csp/${clusterId}/testrun?testId=${testId}`)
  }

  createOverwriteCSPMetaConfig(cSPMetaConfig: CSPMetaConfig,
    clusterId: number,
    profilerName: string,
    ruleName: string,
    resourceId: string,
    action: string): Observable<string> {
    let profilerInstanceName = cSPMetaConfig.profilerInstanceName;
    let urlToHit = `/api/csp/${clusterId}/rule?profilerName=${profilerName}&profilerInstance=${profilerInstanceName}&ruleName=${ruleName}&resourceId=${resourceId}&action=${action}`
    return this.httpClient.put<string>(urlToHit, cSPMetaConfig)
  }

  createFileResource(file: File, fileName: string, displayName: string) {
    let formData = new FormData()
    formData.append("name", displayName)
    formData.append(fileName, file)
    let headers = new HttpHeaders();
    let options = {headers: headers.set('Content-Type-Value', 'undefined')};
    return this.httpClient.post<CSP_Resource_File>(`/api/csp/fileresource`, formData, options)
  }

  getListOfResources(): Observable<(CSP_Resource_RegEx[] | CSP_Resource_File[])> {
    return this.httpClient.get<(CSP_Resource_RegEx[] | CSP_Resource_File[])>(`/api/csp/resources`)
  }

  saveCspRegExResource (resource:CSP_Resource_RegEx): Observable<any> {
    return this.httpClient[resource.id?"put":"post"]<any>(`/api/csp/nonfileresource`, resource)
  }

  deleteCspResource (resourceId:number): Observable<any> {
    return this.httpClient.delete<any>(`/api/csp/resource/${resourceId}`);
  }

  getTestDataForRule(ruleId:number):Observable<any> {
    return this.httpClient.get<any>(`/api/csp/testrun?ruleId=${ruleId}`)
  }
}
