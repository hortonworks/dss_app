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

import {HttpUtil} from '../shared/utils/httpUtil';
import {AuditSchema, PolicySchema, TagPolicySchema} from '../models/auditSchema';
import {HttpClient} from '@angular/common/http';

export class PolicyTypes {
  static HIVE = 'hive';
  static TAG = 'tag';
}

@Injectable()
export class RangerService {
  uri = 'api/ranger';
  count = 0;
  policyCount = 0;
  tagPolicyCount = 0;

  constructor(private httpClient: HttpClient) {
  }

  getPolicyDetails(clusterId: string, dbName: string, tableName: string, offset: number, limit: number): Observable<any> {
    const serviceType = PolicyTypes.HIVE;
    let uri = `${this.uri}/${clusterId}/policies?offset=${offset}&limit=${limit}&serviceType=${serviceType}`;
    uri += `&dbName=${dbName}&tableName=${tableName}`;
    return this.httpClient.get<PolicySchema[]>(uri).map((data) => this.formatPolicyData(data));
  }

  formatPolicyData(data: any): PolicySchema[] {
    this.policyCount = data.totalCount || 0;
    const policyData: PolicySchema[] = [];
    data.policies.forEach(d => {
      d.groups = [];
      d.users = [];
      const buckets = ['policyItems', 'denyPolicyItems', 'allowExceptions', 'denyExceptions', 'dataMaskPolicyItems',
                        'rowFilterPolicyItems'];
      buckets.forEach(bucket => {
          d[bucket].forEach(pI => {
            d.groups = d.groups.concat(pI.groups);
            d.users = d.users.concat(pI.users);
          })
      });
      d.groups = d.groups.filter((x, i, a) => a.indexOf(x) == i)
      d.users = d.users.filter((x, i, a) => a.indexOf(x) == i)
      policyData.push(d as PolicySchema)
    });
    return policyData;
  }

  getTotalPolicyCount(): number {
    return this.policyCount;
  }

  getTagPolicyDetails(clusterId: string, guid: string, offset: number, limit: number): Observable<any> {
    const serviceType = PolicyTypes.TAG;
    const uri = `${this.uri}/${clusterId}/policies?offset=${offset}&limit=${limit}&serviceType=${serviceType}&guid=${guid}`;
    return this.httpClient.get<PolicySchema[]>(uri).map((data) => this.formatTagPolicyData(data));
  }

  formatTagPolicyData(data: any): PolicySchema[] {
    this.tagPolicyCount = data.totalCount || 0;
    const policyData: TagPolicySchema[] = [];
    data.policies.forEach(d => {
      d.groups = [];
      d.users = [];
      const buckets = ['policyItems', 'denyPolicyItems', 'allowExceptions', 'denyExceptions', 'dataMaskPolicyItems',
                        'rowFilterPolicyItems'];
      buckets.forEach(bucket => {
        d[bucket].forEach(pI => {
          d.groups = d.groups.concat(pI.groups);
          d.users = d.users.concat(pI.users);
        });
      });
      d.groups = d.groups.filter((x, i, a) => a.indexOf(x) === i);
      d.users = d.users.filter((x, i, a) => a.indexOf(x) === i);
      if (d.resources && d.resources.tag && d.resources.tag.values) {
        d.tags = d.resources.tag.values;
      } else {
        d.tags = [];
      }
      policyData.push(d as TagPolicySchema);
    });
    return policyData;
  }

  getTotalTagPolicyCount(): number {
    return this.tagPolicyCount;
  }

  getAuditDetails(clusterId: string, dbName: string, tableName: string, offset: number, limit: number, accessType: string,
                    result: string): Observable<any> {
    result = (result === 'ALLOWED') ? '1' : (result === 'DENIED') ? '0' : '';
    accessType = (accessType === 'ALL') ? '' : accessType;
    let uri = `${this.uri}/audit/${clusterId}/${dbName}/${tableName}?offset=${offset}&limit=${limit}&accessType=${accessType}`;
    uri += `&accessResult=${result}`;
    return this.httpClient.get<AuditSchema[]>(uri).map((data) => this.formatAuditData(data));

  }

  formatAuditData(data: any): AuditSchema[] {
    this.count = data.totalCount || 0;
    const auditData: AuditSchema[] = [];
    data.vXAccessAudits.forEach(d => {
      const m = d.eventTime.match(/^(\d+)-(\d+)-(\d+)T(\d+)\:(\d+)\:(\d+)Z$/);
      d.eventTime = `${m[2]}/${m[3]}/${m[1]} ${m[4]}:${m[5]}:${m[6]} GMT`;
      d.accessResult = (d.accessResult) ? 'ALLOWED' : 'DENIED';
      if (d.policyId === -1) {
        d.policyId = '--';
      }
      auditData.push(d as AuditSchema);
    });
    return auditData;
  }

  getTotalCount(): number {
    return this.count;
  }
}
