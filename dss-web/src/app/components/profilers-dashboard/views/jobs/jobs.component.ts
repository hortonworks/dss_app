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

import {Component, OnInit} from '@angular/core';
import {LakeService} from '../../../../services/lake.service';
import {ProfilerService} from '../../../../services/profiler.service';
import {JobsCountModel, ProfilerInfoWithJobsCount, JobInfoModel} from '../../../../models/profiler-models';


export class JobStatusFilterState {
	"SUCCESS":boolean = false;
	"RUNNING":boolean = false;
	"FAILED":boolean = false;
}

export class ProfilersFilterState {
	"sensitiveinfo":boolean = false;
	"hivecolumn":boolean = false;
	"hive_metastore_profiler":boolean = false;
	"audit":boolean = false;
}

export enum  TimeTabs {
  D, W, M
}

@Component({
  selector: 'profilers-jobs-dashboard',
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.scss']
})

export class ProfilerJobsComponent  implements OnInit {

  JSObject: Object = Object;
  clusters = [];
  jSFState:JobStatusFilterState =  new JobStatusFilterState();
  profState:ProfilersFilterState = new ProfilersFilterState();
  clstrFilState = {};
  currentClusterId = 0;
  currentClusterName = "";
  sortInfo = {'col':'id', 'order':'desc'}

  jobs:Array<JobInfoModel> = [];

  jobsCountModel:JobsCountModel = {SUCCESS:0,RUNNING:0,FAILED:0};
  profilersList:Array<ProfilerInfoWithJobsCount> = [];

  statusDisplayMap = {"SUCCESS":"Completed", "RUNNING":"Running", "FAILED":"Failed"};
  timeTabs = TimeTabs;
  timeSelect:TimeTabs = TimeTabs.D;

  constructor( private lakeService: LakeService
             , private profilerService:ProfilerService
             ){}

  ngOnInit() {
  	this.lakeService.listWithClusterId().subscribe(lakes => {
  		lakes = lakes.sort((a, b) => a.name.localeCompare(b.name));
  		lakes.forEach((lake, i)=>this.clstrFilState[lake.clusterId]=(!i)?true:false);
  		this.clusters = lakes;
      this.currentClusterId = lakes[0].clusterId;
      this.currentClusterName = lakes[0].name + ", " + lakes[0].dcName;
      this.relodeProfilerStatus();
  		this.reloadJobs();
  	});
  }

  relodeProfilerStatus () {
    this.profilersList = [];
    var d = new Date();
    const endTime = d.getTime();
    const multiplyBy = (this.timeSelect === TimeTabs.D)?0:(this.timeSelect === TimeTabs.W ? 6:29);
    d.setHours(-24*multiplyBy,0,0,0);
    const startTime = d.getTime();

    this.profilerService.getStatusWithJobCounts(this.currentClusterId, startTime, endTime)
      .subscribe(infoAndCounts => {
        this.profilersList = infoAndCounts
        this.updateJobsCountModel();
      });
  }

  updateJobsCountModel () {
    this.jobsCountModel = {SUCCESS:0,RUNNING:0,FAILED:0}
    this.profilersList.forEach(pInfo => {
      this.jobsCountModel.SUCCESS += pInfo.jobsCount.SUCCESS
      this.jobsCountModel.RUNNING += pInfo.jobsCount.RUNNING
      this.jobsCountModel.FAILED += pInfo.jobsCount.FAILED
    })
  }

  reloadJobs() {
  	this.jobs = [];
    let d = new Date();
    const endTime = d.getTime();
    const multiplyBy = (this.timeSelect === TimeTabs.D)?0:(this.timeSelect === TimeTabs.W ? 6:29);
    d.setHours(-24*multiplyBy,0,0,0);
    const startTime = d.getTime();

    let profilerIds = [];
    this.profilersList.forEach(pObj => {
      if(this.profState[pObj.profilerInfo.name])
        profilerIds.push(pObj.profilerInfo.id);
    })

    let statusArray = [];
    for (let key in this.jSFState) {
      if(this.jSFState[key])
        statusArray.push(key.toUpperCase())
    }

    this.profilerService.jobsList(this.currentClusterId, 0, 50, this.sortInfo.col, this.sortInfo.order, startTime, endTime, profilerIds, statusArray)
      .subscribe(jobs => {
        this.jobs = jobs;
      })
  }

  sordBy(colName) {
  	const order = (this.sortInfo.col === colName)?((this.sortInfo.order === 'desc')?'asc':'desc'):'desc'
  	this.sortInfo.col = colName;
  	this.sortInfo.order = order;
  	this.reloadJobs();
  }

  jsfChanged(key) {
  	this.jSFState[key] = !this.jSFState[key];
  	this.reloadJobs();
  }

  profFilChanged(name) {
  	this.profState[name] = ! this.profState[name];
  	this.reloadJobs();
  }

  clusterFilterChanged (clstrId) {
  	this.clusters.forEach(lake=>{
      this.clstrFilState[lake.clusterId]=false;
      if(lake.clusterId === clstrId)
        this.currentClusterName = lake.name + ", " + lake.dcName;
    })
  	this.clstrFilState[clstrId]=true;
    this.currentClusterId = clstrId;
    this.relodeProfilerStatus();
  	this.reloadJobs();
  }

  timeTabChanged() {
    for (let key in this.profState) {
      this.profState[key] = false;
    }
    this.reloadJobs();
    this.relodeProfilerStatus();
  }

  getDisplayDate(epoch:number) {
    return (new Date(epoch)).toString().substr(4,20);
  }

}
