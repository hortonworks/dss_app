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

export class ReplicationProperty {
  constructor(public guid: string, public typeName: string) {
  }
}
export class AssetProperty {
  constructor(public key: string, public value?: string) {
  }
}

export class AssetEntityParameters {
  totalSize:             string;
  rawDataSize:           string;
  EXTERNAL:              string;
  numRows:               string;
  numFiles:              string;
  transient_lastDdlTime: string;
  department:            string;
}

export class AssetEntityColumn {
  guid:     string;
  typeName: string;
}

export class AssetEntityClassificationAttributes {
  status?: string;

  constructor(status: string) {
    if(status) this.status = status;
  }
}

export class AssetEntityClassification {
  typeName: string;
  attributes = new AssetEntityClassificationAttributes('');

  constructor(typeName: string, attributes: any = {}) {
    this.typeName = typeName;
    this.attributes = attributes;
  }
}

export class AssetEntityAttributes {
  owner:            string;
  temporary:        boolean;
  lastAccessTime:   number;
  aliases:          null;
  qualifiedName     = '';
  columns:          AssetEntityColumn[] = [];
  description:      null;
  viewExpandedText: null;
  sd:               AssetEntityColumn = new AssetEntityColumn();
  tableType:        string;
  createTime:       number;
  name:             string;
  comment:          null;
  partitionKeys:    AssetEntityColumn[] = [];
  profileData:      any = {};
  parameters:       AssetEntityParameters = new AssetEntityParameters();
  db:               AssetEntityColumn = new AssetEntityColumn();
  retention:        number;
  viewOriginalText: null;
  replicatedTo?:    ReplicationProperty[];
  replicatedFrom?:  ReplicationProperty[];
}

export class AssetEntity {
  id:              string;
  typeName:        string;
  attributes:      AssetEntityAttributes = new AssetEntityAttributes();
  guid:            string;
  status:          string;
  createdBy:       string;
  updatedBy:       string;
  createTime:      number;
  updateTime:      number;
  version:         number;
  classifications: AssetEntityClassification[] = [];

  /* ui field */
  rowCount        = '-';
}

export class AssetDetails {
  referredEntities: any;
  entity: AssetEntity = new AssetEntity();
}
