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

export class AssetSchema {
  name: string;
  type: string;
  noOfUniques: string;
  noOfNulls: string;
  max: string;
  min: string;
  mean: string;
  comment: string;
  guid?: string;

  // UI Attributes
  tags: TagType[] = [];
  allAssetsAdded: boolean;
  showAddTagsDialog = false;
}

export class AssetModel {
  id: number;
  assetType: string;
  assetName: string;
  guid: string;
  assetProperties: any;
  clusterId: number;
  datasetId: number;
}

export class TagType {
  name: string;
  status: string;
  isNewTag: boolean;
  isDpTag: boolean;
  originalStatus: string;
  attributes: any;
  attributeDefs: any[];

  constructor(name: string, type: string, isNewTag: boolean, attributes:any={}) {
    this.name = name;
    this.status = type;
    this.isNewTag = isNewTag;
    this.originalStatus = this.status;
    this.attributes = attributes;
    this.isDpTag = (name == "dp" || name.indexOf("dp_") == 0)?true:false;
  }
}

export class TagDef {
  name: string;
  attributeDefs: any[];
  constructor(name:string, defs:any[]){
    this.name=name;
    this.attributeDefs = defs;
  }
}
