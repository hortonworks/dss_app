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
import {Observable} from 'rxjs';
import {AssetsAndCount, DsAssetModel} from '../models/dsAssetModel';
import {AssetSetQueryModel} from '../models/asset-set-query-model';
import {TagClassification} from '../models/tag-classification';
import {AssetColumnTagSaveRequest, EntityTagSaveBody} from '../models/asset-column-tag-save-request';


@Injectable()
export class DsAssetsService {
  url1 = 'api/query-assets';
  url2 = 'api/query-attributes';
  url3 = 'api/basic-query-assets';

  constructor(private httpClient: HttpClient) { }

  getQueryAttribute(clsId: number): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.url2}?clusterId=${clsId}`);
  }

  list(asqms: AssetSetQueryModel[], pageNo: number, pageSize: number, clusterId: number, datasetId: number,
       editable: boolean= false): Observable<AssetsAndCount> {
    let search = '', callDB: boolean|number = false;
    asqms.forEach(asqm => asqm.filters.forEach(filObj => {
      if (filObj.column === 'dataset.id') {callDB = filObj.value as number; }
      if (filObj.column === 'name') {search = filObj.value as string; }
    }));
    if (callDB) {
      return this.dbQuery(callDB, search, (pageNo - 1) * pageSize, pageSize, editable);
    }
    return this.atlasQuery(asqms, (pageNo - 1) * pageSize, pageSize, clusterId, datasetId);
  }

  getAssetServiceQueryParam(asqms: AssetSetQueryModel[], offset: number=null, limit: number=null) {
    let returnObj = this.getAtlasFilters(asqms);
    (typeof limit === "number") && (returnObj["limit"] = limit);
    (typeof offset === "number") && (returnObj["offset"] = offset);
    return returnObj;
  }
  getAtlasFilters(asqms: AssetSetQueryModel[]) {
    let asqm, atlasFilters = [], runBasicSearch = true;
    asqms.forEach(asqm1 => asqm = asqm1);
    console.log(asqm)
    asqm.filters.forEach(filObj => {
      if(runBasicSearch && ['name', 'createTime', 'owner', 'db.name', 'tag'].indexOf(filObj.column) === -1)
        runBasicSearch = false;
      if(runBasicSearch && filObj.column === 'db.name' && filObj.operator === 'nte')
        runBasicSearch = false;
      atlasFilters.push(
        {
          'atlasAttribute': {
            'name': filObj.column,
            'dataType': filObj.dataType
          },
          'operation': filObj.operator,
          'operand': filObj.value
        }
      )
    });
    console.log(runBasicSearch);
    if(runBasicSearch) {
      let tagName:string = null;
      let atlasFilters = {"condition":"AND", "criterion":[]};
      asqm.filters.forEach(filObj => {
        let pushObj = {"attributeName":filObj.column, "operator":filObj.operator, "attributeValue":filObj.value};
        switch(filObj.column) {
          case 'tag'    : tagName = filObj.value; return;
          case 'db.name': pushObj.attributeName="qualifiedName";
                          if(pushObj.operator === 'equals') pushObj.attributeValue += "."
                          pushObj.operator = "startsWith"; break;
          case 'createTime': pushObj.attributeValue=`${Date.parse(filObj.value.replace(/'/g, ""))}`; break;
        }
        switch (pushObj.operator) {
          case 'nte'    : pushObj.operator = 'neq';break;
          case 'equals' : pushObj.operator = 'eq';break;
        }
        atlasFilters.criterion.push(pushObj)
      })
      return {"entityFilters":atlasFilters, "classification":tagName};
    }
    return {"atlasFilters":atlasFilters};
  }

  dbQuery (id: number, searchText: string, offset: number, limit: number, editable: boolean): Observable<AssetsAndCount> {
    const url = `api/dataset/${id}/assets?queryName=${searchText}&offset=${offset}&limit=${limit}&state=${(editable) ? 'Edit' : ''}`;
    return this.httpClient.get(url).map(rsp => this.extractAssetArrayFromDbData(rsp))
  }

  atlasQuery(asqms: AssetSetQueryModel[], offset: number, limit: number, clusterId: number, datasetId: number): Observable<AssetsAndCount> {
    const postParams = this.getAssetServiceQueryParam(asqms, offset, limit);
    const url = (postParams['entityFilters'])?this.url3:this.url1
    let retObj = this.httpClient
                  .post(`${url}?clusterId=${clusterId}${datasetId ? '&datasetId=' + datasetId : ''}`, postParams)
                  .map((rsp: any[]) => this.extractAssetArrayFromAtlasData(rsp));
    return retObj;
  }

  tagsQuery(clusterId: number): Observable<string[]> {
    const uri = `api/assets/typeDefs/${clusterId}/classification`;
    return this.httpClient.get(uri).map((data: any) => data.classificationDefs.map(cTagObj => cTagObj.name));
  }

  extractAssetArrayFromDbData(assetsNCount: any): AssetsAndCount {
    const assetModelArr: DsAssetModel[] = [];
    const dataArr = assetsNCount.assets;
    if (dataArr) {
      dataArr.forEach(ent => {
        assetModelArr.push({
          createdTime: ent.assetProperties.createTime ? ((new Date(parseInt(ent.assetProperties.createTime, 10))).toDateString()) : '-',
          id: ent.guid,
          name: ent.assetProperties.name || '-',
          description : ent.assetProperties.description || '-',
          owner: ent.assetProperties.owner || '-',
          dbName: ent.assetProperties.qualifiedName.split('.')[0] || '-',
          source: 'hive',
          type: ent.assetType,
          clusterId: ent.clusterId
        })
      });
    }
    return {'assets': assetModelArr, 'count': assetsNCount.count} as AssetsAndCount;
  }

  extractAssetArrayFromAtlasData(dataArr: any[]): AssetsAndCount {
    const assetModelArr: DsAssetModel[] = [];
    if (dataArr) {
      dataArr.forEach(ent => {
        assetModelArr.push({
          createdTime: ent.attributes.createTime ? ((new Date(parseInt(ent.attributes.createTime, 10))).toDateString()) : '-',
          id: ent.guid,
          name: ent.displayText,
          description : ent.attributes.description || '-',
          owner: ent.attributes.owner || '-',
          source: 'hive',
          type: ent.typeName,
          clusterId: null,
          dsName: ent.datasetName,
          dbName: ent.attributes.qualifiedName.split('.')[0]
        })
      });
    }
    return {'assets': assetModelArr, 'count': null} as AssetsAndCount;
  }

  getAllTagsOfAsset(clusterId: string): Observable<TagClassification[]> {
    const uri = `api/assets/typeDefs/${clusterId}/classification`;

    return this.httpClient.get(uri)
      .map((data: any) => data.classificationDefs.map(cTagObj => new TagClassification(cTagObj.name, cTagObj.superTypes, cTagObj.attributeDefs)));
  }

  saveAssetColumnClassifications(clusterId: string, saveRequest: AssetColumnTagSaveRequest): Observable<any> {
    const uri = `/api/assets/column/classifications?clusterId=${clusterId}`;
    return this.httpClient.post<any>(uri, saveRequest);
  }

  saveEntityClassifications(clusterId: string, saveRequest: EntityTagSaveBody): Observable<any> {
    const uri = `/api/assets/entity/classifications?clusterId=${clusterId}`;
    return this.httpClient.post<any>(uri, saveRequest);
  }
}
