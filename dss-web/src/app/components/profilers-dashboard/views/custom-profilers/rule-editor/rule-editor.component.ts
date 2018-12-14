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

import {Component, EventEmitter, Input, OnInit, Output, SimpleChanges} from '@angular/core';
import {
  CSP_Dsl, CSP_Rule_With_Attributes, CSPTestDataforRule, CSP_Resource_RegEx, CSP_Resource_File
} from '../../../../../models/CSP_Rule';
import {AuthUtils} from "../../../../../shared/utils/auth-utils";
import {CspService} from "../../../../../services/csp.service";
import {LakeService} from '../../../../../services/lake.service';
import {TaggingWidgetTagModel} from "../../../../../shared/tagging-widget/tagging-widget.component";
import { Lake } from '../../../../../models/lake';
import {Alerts} from "../../../../../shared/utils/alerts";


@Component({
  selector: 'csp-rule-editor',
  templateUrl: './rule-editor.component.html',
  styleUrls: ['./rule-editor.component.scss']
})

export class CSPRuleEditorComponent {

  @Input() ruleWithAttributes:CSP_Rule_With_Attributes;
  @Input() lakes:Lake[]= [];
  @Output('cancelNotification') cancleEmitter: EventEmitter<null> = new EventEmitter<null>();
  @Output('saveNotification') doneEmitter: EventEmitter<number> = new EventEmitter<number>();

  serializedInputObj:string="";
  nameDslObj:CSP_Dsl = null;
  valueDslObj:CSP_Dsl = null;
  allClassifications = null;
  availableTags:TaggingWidgetTagModel[] = [];
  filteredTags:TaggingWidgetTagModel[] = [];
  selectedTags:TaggingWidgetTagModel[] = [];
  regExResources:CSP_Resource_RegEx[] = [];
  fileResources:CSP_Resource_File[] = [];

  validationError:boolean = false;
  sidebarOpen:boolean = false;

  dslOprands = [{'display':'Regex', 'inline':'regex', 'dependent':true}
    ,{'display':'Lookup', 'inline':'whitelist', 'dependent':true}
    ,{'display':'Whitelist', 'inline':'whitelist', 'dependent':true}
    ,{'display':'Blacklist', 'inline':'blacklist', 'dependent':true}
    ,{'display':'Algo', 'inline':'', 'dependent':true}
    ];
  dslOperators = [{'display':'AND', 'inline':' and '}, {'display':'OR', 'inline':' or '}, {'display':'NOT', 'inline':' !'}];
  dslSubOprands =[{'display':'Email Address', 'inline':'(<<resource__regex.1>>)', 'oprands':['Regex']}
    ,{'display':'Credit Card', 'inline':'(<<resource__regex.2>>)', 'oprands':['Regex']}
    ,{'display':'Swift Code', 'inline':'(<<resource__regex.3>>)', 'oprands':['Regex']}
    ,{'display':'Regex4', 'inline':'(<<resource__regex.4>>)', 'oprands':['Regex']}
    ,{'display':'File1', 'inline':'(<<resource__file.1>>)', 'oprands':['Lookup', 'Whitelist', 'Blacklist']}
    ,{'display':'File2', 'inline':'(<<resource__file.2>>)', 'oprands':['Lookup', 'Whitelist', 'Blacklist']}
    ,{'display':'File3', 'inline':'(<<resource__file.3>>)', 'oprands':['Lookup', 'Whitelist', 'Blacklist']}
    ,{'display':'Luhn Check', 'inline':'luhn_check', 'oprands':['Algo']}
  ];


  isTestBoxHidden: boolean = true;
  columnNameTestData: string = "";
  columnValueTestData: string = "";
  testButtonDisabled: boolean = false;
  testClusterID:number=0;


  constructor(private cspService: CspService,
    private lakeService: LakeService) {}

  ngOnInit() {
    this.cspService.listClassifications().subscribe(classifications => {
      this.allClassifications = classifications;
      this.availableTags = this.allClassifications.map(cl => new TaggingWidgetTagModel(cl.name, cl));
    });
    this.cspService.getListOfResources().subscribe(resources => {
      this.regExResources = resources.filter(res => res.type === 'regex');
      this.fileResources = resources.filter(res => res.type === 'file');
      this.reFillDslSubOprands();
    });
  }

  reFillDslSubOprands () {
    this.dslSubOprands = [{'display':'Luhn Check', 'inline':'luhn_check', 'oprands':['Algo']}];
    this.regExResources.forEach(req => this.dslSubOprands.push(
      {'display':req.name, 'inline':'(<<'+req.reference+'>>)', 'oprands':['Regex']}
    ));
    this.fileResources.forEach(req => this.dslSubOprands.push(
      {'display':req.name, 'inline':'(<<'+req.reference+'>>)', 'oprands':['Lookup', 'Whitelist', 'Blacklist']}
    ));

  }

  showTestPopup() {
    this.save(true);
  }

  doClose() {
    this.isTestBoxHidden = true;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ruleWithAttributes'] && !changes['ruleWithAttributes'].currentValue) {
      this.ruleWithAttributes = new CSP_Rule_With_Attributes(AuthUtils.getDssUser());
    }
    if (changes['ruleWithAttributes']) {
      try {
        const dsls = JSON.parse(this.ruleWithAttributes.rule.dsl)
        this.valueDslObj =  (dsls.filter(d=>d.matchType == 'value')[0] as CSP_Dsl) || new CSP_Dsl("value", 85);
        this.nameDslObj =  (dsls.filter(d=>d.matchType == 'name')[0] as CSP_Dsl) || new CSP_Dsl("name", 15);
      } catch (e) {
        this.valueDslObj = new CSP_Dsl("value", 85);
        this.nameDslObj = new CSP_Dsl("name", 15);
      }
      this.selectedTags = this.ruleWithAttributes.tags.map(cl => new TaggingWidgetTagModel(cl.name, cl));
      this.serializedInputObj = JSON.stringify(this.ruleWithAttributes);
      this.valueDslObj.confidence = 85;
      this.nameDslObj.confidence = 15;
    }
  }
  getTestData() {
    this.cspService.getTestDataForRule(this.ruleWithAttributes.rule.id).subscribe(testData => {
      this.columnNameTestData = testData.nameData.join("\n") || "";
      this.columnValueTestData = testData.valueData.join("\n") || "";
      this.testClusterID = testData.clusterId || 0;
    })
  }

  onTagSearchChange(s_text) {
    const text = s_text.toLowerCase();
    this.filteredTags = this.availableTags
      .sort((tag1, tag2) => (tag1.display > tag2.display)?1:-1)
      .filter(tag => tag.display.toLowerCase().indexOf(text) != -1)
      .sort((tag1, tag2) => (tag1.display.toLowerCase().indexOf(text) > tag2.display.toLowerCase().indexOf(text))?1:-1)

  }
  onNewTagAddition (tag) {
    this.selectedTags.push(tag);
  }
  onCancel () {
    this.cancleEmitter.emit(null);
  }

  startTest () {
    if(!this.testClusterID)
      return Alerts.showErrorMessage("Lake not selected.");
    if(!this.columnValueTestData && !this.columnNameTestData)
      return Alerts.showErrorMessage("Test data not entered.");
    this.cspService.startTestRun(<CSPTestDataforRule>{
      nameData: this.columnNameTestData.split("\n"),
      valueData: this.columnValueTestData.split("\n"),
      ruleId: this.ruleWithAttributes.rule.id,
      clusterId: this.testClusterID.toString()
    }).subscribe(whatever => {
      console.log(whatever);
      this.doneEmitter.emit(this.ruleWithAttributes.rule.id);
      Alerts.showSuccessMessage("Test submitted, It usually takes couple of mints to run.")
    });
  }

  startValidation () {
    console.log(this.testClusterID);
    this.columnValueTestData = "Some dummy data";
    this.startTest()
  }

  validateRuleWithAttributes() {
    if(!this.ruleWithAttributes.rule.name || !(this.nameDslObj.dsl || this.valueDslObj.dsl) || !this.selectedTags.length)
      return false;
    this.ruleWithAttributes.tags = this.selectedTags.map(tag => (typeof tag === 'string')?{"name":tag, "type": "Custom"}:tag.data);
    this.ruleWithAttributes.rule.creator_id = this.ruleWithAttributes.user.id;
    const dslObjArr:CSP_Dsl[] = [];
    if(this.nameDslObj.dsl) {
      this.nameDslObj.tags = this.ruleWithAttributes.tags.map(tag => tag.name);
      dslObjArr.push(this.nameDslObj);
    }
    if(this.valueDslObj.dsl) {
      this.valueDslObj.tags = this.ruleWithAttributes.tags.map(tag => tag.name);
      dslObjArr.push(this.valueDslObj);
    }
    if(dslObjArr.length === 1)
      dslObjArr[0].confidence = 100;
    this.ruleWithAttributes.rule.dsl = JSON.stringify(dslObjArr);
    return true;
  }

  save (avoidDismiss:boolean) {
    if(!this.validateRuleWithAttributes())
      return Alerts.showErrorMessage("Validation failed, make sure all mandatory fields are filled.")
    avoidDismiss && (this.isTestBoxHidden = false);
    if (this.serializedInputObj === JSON.stringify(this.ruleWithAttributes)) {
      avoidDismiss && this.getTestData();
      return !avoidDismiss && this.doneEmitter.emit(this.ruleWithAttributes.rule.id);
    }
    this.cspService[(this.ruleWithAttributes.rule.id) ? "updateRule" : "createRule"](this.ruleWithAttributes).subscribe(savedRuleWithAttrs => {
      this.ruleWithAttributes = savedRuleWithAttrs;
      avoidDismiss && this.getTestData();
      !avoidDismiss && this.doneEmitter.emit(this.ruleWithAttributes.rule.id);
    })
  }
}





