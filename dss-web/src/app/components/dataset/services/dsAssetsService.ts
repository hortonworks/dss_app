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

import {Injectable} from "@angular/core";
import {Http, RequestOptions} from "@angular/http";
import {Observable} from "rxjs";
import {DsAssetModel, AssetsAndCount} from "../models/dsAssetModel";
import {AssetSetQueryModel} from "../views/ds-assets-list/ds-assets-list.component";
import {HttpUtil} from "../../../shared/utils/httpUtil";
import {AssetColumnTagSaveRequest} from '../../../models/asset-column-tag-save-request';
import {TagClassification} from '../../../models/tag-classification';

@Injectable()
export class DsAssetsService {
  url1 = "api/query-assets";
  url2 = "api/query-attributes";

  constructor(private http: Http) {
  }

  getQueryAttribute(clsId:number):Observable<any[]> {
    return this.http
      .get(`${this.url2}?clusterId=${clsId}`, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .catch(HttpUtil.handleError);
  }

  list(asqms: AssetSetQueryModel[], pageNo: number, pageSize: number, clusterId:number, datasetId:number, editable:boolean=false): Observable<AssetsAndCount> {
    let search:string = "", callDB:boolean|number = false;
    asqms.forEach(asqm => asqm.filters.forEach(filObj =>{
      if(filObj.column == "dataset.id") {callDB = filObj.value as number;}
      if(filObj.column == "name") {search = filObj.value as string;}
    }));
    if(callDB) {
      return this.dbQuery(callDB, search, (pageNo - 1) * pageSize, pageSize, editable);
    }
    return this.atlasQuery(asqms, (pageNo - 1) * pageSize, pageSize, clusterId, datasetId);
  }

  getAssetServiceQueryParam(asqms: AssetSetQueryModel[], offset:number, limit:number){
    return {
      "atlasFilters":this.getAtlasFilters(asqms),
      "limit":limit,
      "offset":offset
    };
  }
  getAtlasFilters(asqms: AssetSetQueryModel[]){
    let asqm, atlasFilters=[];
    asqms.forEach(asqm1 => asqm=asqm1);
    asqm.filters.forEach(filObj => {
      atlasFilters.push(
        {
          "atlasAttribute":{
            "name":filObj.column,
            "dataType":filObj.dataType
          },
          "operation":filObj.operator,
          "operand":filObj.value
        }
      )
    });
    return atlasFilters;
  }

  dbQuery (id: number, searchText:string, offset:number, limit:number, editable:boolean) : Observable<AssetsAndCount> {
    return this.http
      .get(`api/dataset/${id}/assets?queryName=${searchText}&offset=${offset}&limit=${limit}&state=${(editable)?"Edit":""}`, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .map(rsp => this.extractAssetArrayFromDbData(rsp))
      .catch(HttpUtil.handleError)
  }

  atlasQuery(asqms: AssetSetQueryModel[], offset:number, limit:number, clusterId:number, datasetId:number) : Observable<AssetsAndCount> {
    let postParams=this.getAssetServiceQueryParam(asqms, offset, limit);
    return this.http
      .post(`${this.url1}?clusterId=${clusterId}${datasetId?"&datasetId="+datasetId:""}`, postParams, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .map(rsp => this.extractAssetArrayFromAtlasData(rsp))
      .catch(HttpUtil.handleError)
  }

  tagsQuery(clusterId: number): Observable<string[]> {
    const uri = `api/assets/typeDefs/${clusterId}/classification`;

    return this.http
      .get(uri, new RequestOptions(HttpUtil.getHeaders()))
      .map(HttpUtil.extractData)
      .map(data => data.classificationDefs.map(cTagObj => cTagObj.name))
      .catch(HttpUtil.handleError);

  }

  extractAssetArrayFromDbData(assetsNCount: any) :AssetsAndCount{
    let assetModelArr :DsAssetModel[] = [];
    let dataArr = assetsNCount.assets;
    dataArr && dataArr.forEach(ent=>{
      assetModelArr.push({
        createdTime: ent.assetProperties.createTime?((new Date(parseInt(ent.assetProperties.createTime))).toDateString()):"-",
        id: ent.guid,
        name: ent.assetProperties.name || "-",
        description : ent.assetProperties.description || "-",
        owner: ent.assetProperties.owner || "-",
        dbName: ent.assetProperties.qualifiedName.split(".")[0] || "-",
        source: "hive",
        type: ent.assetType,
        clusterId: ent.clusterId
      })
    });
    return {"assets":assetModelArr, "count": assetsNCount.count} as AssetsAndCount;
  }

  extractAssetArrayFromAtlasData(dataArr: any[]) :AssetsAndCount{
    let assetModelArr :DsAssetModel[] = [];
    dataArr && dataArr.forEach(ent=>{
      assetModelArr.push({
        createdTime: ent.attributes.createTime?((new Date(parseInt(ent.attributes.createTime))).toDateString()):"-",
        id: ent.guid,
        name: ent.displayText,
        description : ent.attributes.description || "-",
        owner: ent.attributes.owner || "-",
        source: "hive",
        type: ent.typeName,
        clusterId: null,
        dsName:ent.datasetName,
        dbName:ent.attributes.qualifiedName.split(".")[0]
      })
    });
    return {"assets":assetModelArr, "count": null} as AssetsAndCount;
  }

  getAllTagsOfAsset(clusterId: string): Observable<TagClassification[]> {
    const uri = `api/assets/typeDefs/${clusterId}/classification`;

    return this.http
    .get(uri, new RequestOptions(HttpUtil.getHeaders()))
    .map(HttpUtil.extractData)
    .map(data => data.classificationDefs.map(cTagObj => new TagClassification(cTagObj.name, cTagObj.superTypes)))
    .catch(HttpUtil.handleError);
  }

  saveAssetColumnClassifications(clusterId: string, saveRequest: AssetColumnTagSaveRequest) {
    const uri = `/api/assets/column/classifications?clusterId=${clusterId}`;
    return this.http
    .post(uri, saveRequest, new RequestOptions(HttpUtil.getHeaders()))
    .map(HttpUtil.extractData)
    .catch(HttpUtil.handleError);
  }
}
