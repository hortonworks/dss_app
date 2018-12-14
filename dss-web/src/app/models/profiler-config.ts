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

import {ProfilerRunConfig, ProfilerSelectorConfig} from "./profiler-selector";

export class ProfilerInstanceConfig {
  profiler:         Profiler;
  profilerInstance = new ProfilerInstance(0,"","", 0, 0,null, null,
    true, "", "", "", 0);
}

export class ProfilerSparkConfig {
  numExecutors: number;
  executorCores: number;
  executorMemory: string;
  driverCores: number;
  driverMemory: string;
}

export class ProfilerParameters {
  sampleSize: number;
  samplepercent: string;
  saveToAtlas: boolean;
}

export class Profiler {
  id:           number;
  name:         string;
  version:      string;
  jobType:      string;
  assetType:    string;
  profilerConf: ProfilerConf;
  user:         string;
  description:  string;
  created:      number;
}

export class ProfilerConf {
  file:      string;
  proxyUser: string;
  className: string;
  jars:      any[];
}

export class ProfilerInstance {
  id:           number;
  name:         string;
  displayName:  string;
  profilerId:   number;
  version:      number;
  profilerConf  = new ProfilerSparkConfig();
  jobConf       = new ProfilerParameters();
  active:       boolean;
  owner:        string;
  queue:        string;
  description:  string;
  created:      number;

  constructor(id:number, name:string, displayName:string, profilerId:number, version:number,
              profilerConf:ProfilerSparkConfig, jobConf:ProfilerParameters, active:boolean,
              owner:string, queue:string, description:string, created:number) {
    this.id = id;
    this.name = name;
    this.displayName = displayName;
    this.profilerId = profilerId;
    this.version = version;
    this.profilerConf = profilerConf;
    this.jobConf = jobConf;
    this.active = active;
    this.owner = owner;
    this.queue = queue;
    this.description = description;
    this.created = created;
  }

}

export class ProfilerInstanceWithSelectorConfig {
  profilerInstance: ProfilerInstance;
  selectorConfig: ProfilerSelectorConfig;

  constructor(profilerInstance: ProfilerInstance, selectorConfig:ProfilerSelectorConfig) {
    this.profilerInstance = profilerInstance;
    this.selectorConfig = selectorConfig;
  }
}
