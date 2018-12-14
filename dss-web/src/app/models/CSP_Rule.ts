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

import {DSSUser} from "./user";

export class CSP_Rule {
	id?:number = null;
	name:string = "";
	description:string = "";
	creator_id:number = null;
	dsl:string = "";
	type?:string = "Custom";
	status?:string = "New";
}

export class CSP_Rule_With_Attributes {
  rule:CSP_Rule = new CSP_Rule;
  tags: any[] = []; //TODO create classification class
  cluster_ids:number[] = [];
  user:DSSUser;
  constructor (user:DSSUser){
    this.user = user;
  }
}

export class CSP_Dsl {
  matchType:string = "value";
  confidence:number = 100;
  dsl:string = "";
  dslDisplay:string = "";
  tags:string[]= [];
  isEnabled:boolean = true;
  constructor(matchType:string, confidence:number){
    this.matchType=matchType;
    this.confidence=confidence;
  }
}

export class CSP_Resource_RegEx {
  id?: number;
  type:string="regex";
  source:string="Custom";
  value: string = "";
  name: string = "";
  reference?:string = "";
  description?:string="";
  sampleData : string ="";
  creatorId?:number;
  created?;
  modified?;
}

export class CSP_Resource_File {
  id?: number;
  type:string="file";
  source:string="Custom";
  value: string = "";
  name: string = "";
  reference?:string = "";
  description?:string="";
  sampleData : string ="";
  creatorId?:number;
  created?;
  modified?;
}




export class CSPTestDataforRule {
  nameData: string[];
  valueData: string[];
  ruleId: number;
  clusterId: string;
}

export class DryRunResult {
  id: number;
  profiler: string;
  instance: string;
  dryRunStatus: string;
  results: DryRunResultValue[];
  cause: any;
}

export class DryRunResultValue {
  name: string;
  data: DryRunResultData[];
}

export class DryRunResultData {
  value: string;
  tags: string[];
}

export class CSPMetaConfig {
  groupName: string = "default";
  profilerInstanceName: string = "sensitiveinfo";
  dsls: CSP_Dsl[];
  isEnabled: boolean = true;
}

export class CSPResource {
  id?:number = null;
  type:string="";
  resourceType: string;
  resourceValue: string = "";
  displayName: string;
  generatedName: string = "";
  description: string ="";
  creatorId: number;
}
