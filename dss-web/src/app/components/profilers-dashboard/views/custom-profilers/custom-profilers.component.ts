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
import {CspService} from "../../../../services/csp.service";
import {CSP_Rule_With_Attributes} from "../../../../models/CSP_Rule";
import {LakeService} from "../../../../services/lake.service";
import {Lake} from "../../../../models/lake";
import {Alert} from "selenium-webdriver";
import {Alerts} from "../../../../shared/utils/alerts";

@Component({
  selector: 'custom-profilers-dashboard',
  templateUrl: './custom-profilers.component.html',
  styleUrls: ['./custom-profilers.component.scss']
})

export class CustomProfilersDashboardComponent {
  rulesWithAttributes:CSP_Rule_With_Attributes[] = [];
  lakes:Lake[]=[];
  deployClusterIds:number[] = [];
  deployResult = {};
  rulesWithAttributesForDeploy:CSP_Rule_With_Attributes=null;
  groups:string[] = ["System", "Custom", "Draft"];
  groupTypeMap = {"System":"System", "Custom":"Custom", "Draft":"Custom"}
  groupStatusMap = {"System":["PUBLISHED", "Active"], "Custom":["PUBLISHED", "SUSPENDED"], "Draft":["New", "TEST_PENDING", "TEST_RUNNING", "TEST_SUCCESS", "TEST_FAILED"]}
  groupDisplay = {"System":"System Deployed", "Custom":"Custom Deployed", "Draft":"Custom Draft"}
  statusDisplayMap = {"New":"Validation Pending", "TEST_PENDING":"Validation Pending", "TEST_RUNNING":"Validation Running", "TEST_SUCCESS":"Validation Success"
    , "TEST_FAILED":"Validation Failed", "Active":"Active", "PUBLISHED":"Deployed", "SUSPENDED":"Suspended"}
  activeGroup:string = this.groups[0];
  searchStr:string = "";
  profilerStatus = true;
  showPopup:boolean = false;
  showClusterSelectionPopup:boolean = false;
  activatePopup = false;
  deactivatePopup = false;
  ruleAttrsForEdit:CSP_Rule_With_Attributes = null;
  newRuleId:number=null;
  showInfoRuleId:number = null;
  testData:any = null;

	constructor(private cspService: CspService,
              private lakeService: LakeService) {}
  ngOnInit() {
    this.lakeService.listWithClusters('lake').subscribe(objs => {
      this.lakes =[];
      objs.forEach(obj => {
        obj.clusters.length && (obj.data.clusterId = obj.clusters[0].id);
        this.lakes.push(obj.data as Lake);
      })
    });
    this.reloadRules();
  }
  reloadRules() {
    this.cspService.list().subscribe(rulesWithAttributes => {
      this.rulesWithAttributes = rulesWithAttributes
      if(this.rulesWithAttributes.filter(attrs=> attrs.rule.status === "TEST_RUNNING").length)
        setTimeout(()=>this.reloadRules(), 20*1000); // 20 seconds
    })
  }
  showRow (attrs:CSP_Rule_With_Attributes) {
    return (
      !this.searchStr ||
      (attrs.rule.name.toLocaleLowerCase().indexOf(this.searchStr.toLocaleLowerCase()) !=-1) ||
      (attrs.rule.description.toLocaleLowerCase().indexOf(this.searchStr.toLocaleLowerCase()) !=-1) ||
      (JSON.stringify(attrs.tags).toLocaleLowerCase().indexOf(this.searchStr.toLocaleLowerCase()) !== -1)
    )
  }
  getGroupRules(groupName:string):CSP_Rule_With_Attributes[] {
	  return this.rulesWithAttributes
      .filter(rwa => rwa.rule.type === this.groupTypeMap[groupName])
      .filter(rwa => this.groupStatusMap[groupName].indexOf(rwa.rule.status) != -1)
  }

  editAllowed(attrs):boolean {
    return (attrs.cluster_ids.length === 0 && attrs.rule.type != "System");
  }

  showDeploy(attrs):boolean {
	  return (attrs.rule.status === "TEST_SUCCESS" || attrs.rule.status === "SUSPENDED")
  }

  showSuspend(attrs):boolean {
    return (attrs.rule.status === "PUBLISHED")
  }


  onLakeCheckboxChange(lake:Lake, selection:boolean) {
	  if(selection){
      this.deployClusterIds.push(lake.clusterId);
      this.deployResult[lake.clusterId] = "Awaiting";
    }
    else {
      this.deployClusterIds.splice(this.deployClusterIds.indexOf(lake.clusterId),1)
      this.deployResult[lake.clusterId] = null;
    }
  }

  showClusterSelection(attr) {
	  this.deployClusterIds = [];
    this.deployResult = {};
	  this.rulesWithAttributesForDeploy=attr;
	  this.showClusterSelectionPopup = true;
  }
  hideClusterSelection() {
    this.deployClusterIds = [];
    this.deployResult = {};
    this.rulesWithAttributesForDeploy=null;
    this.showClusterSelectionPopup = false;
  }
  deploy() {
    if(!this.deployClusterIds.length)
	    return Alerts.showErrorMessage("No lake selected.");
    this.cspService
      .deployRule(this.rulesWithAttributesForDeploy.rule.id, this.deployClusterIds)
      .subscribe(res=>{
        res.forEach(obj => this.deployResult[obj.clusterId] = obj.isSuccess)
        this.reloadRules();
      })
  }
  revertDeploy() {
    this.cspService.suspendRule(this.rulesWithAttributesForDeploy.rule.id).subscribe(whatever => {
      for(var key in this.deployResult){
        (this.deployResult[key] !== null) && (this.deployResult[key]="Awaiting");
      }
      this.reloadRules();
    })
  }
  suspendDeploy(attr) {
    this.cspService.suspendRule(attr.rule.id).subscribe(whatever => {
        this.reloadRules();
    })
  }
  get showDeployAction() {
	  var retVal = true
    Object.keys(this.deployResult)
      .map(key => this.deployResult[key])
      .forEach(val => retVal && val===true && (retVal=false));
    return retVal;
  }

  showTestInfo(attrs:CSP_Rule_With_Attributes) {
	  this.showInfoRuleId = attrs.rule.id;
    this.cspService.getTestDataForRule(this.showInfoRuleId).subscribe(testData => {
      this.testData = testData
      this.testData.responseData = JSON.parse(testData.responseData.replace("JsDefined(", "").replace(/\)([^\)]*)$/,'$1'));
      if(testData.status === "SUCCESSFUL") {
        this.testData.result = []
        this.testData.responseData.forEach(obj => this.testData.result.push(...obj.data))
      }
    })
  }
  dismissTestInfo () {
    this.showInfoRuleId = null;
    this.testData = null;
  }

  launchPopup (attrs:CSP_Rule_With_Attributes) {
	  this.ruleAttrsForEdit=attrs;
    this.showPopup = true;
    this.activatePopup = false;
    window.setTimeout(() => this.activatePopup = true, 1); // the time you want
  }
  onHidePopup () {
	  this.ruleAttrsForEdit=null;
    this.activatePopup = false;
    this.deactivatePopup = true;
    window.setTimeout(() => {
        this.showPopup = false;
        this.deactivatePopup = false;
      }, 600
    ); // the time you want
  }
  onRuleSave (rulId) {
	  console.log(rulId);
	  this.activeGroup = this.groups[2];
    this.newRuleId = rulId;
	  this.ngOnInit();
	  this.onHidePopup();
  }

  deleteRule(attrs:CSP_Rule_With_Attributes){
    this.cspService.deleteRule(attrs.rule.id).subscribe(rsp => {
      this.rulesWithAttributes.splice(this.rulesWithAttributes.indexOf(attrs),1);
    })
  }

}
