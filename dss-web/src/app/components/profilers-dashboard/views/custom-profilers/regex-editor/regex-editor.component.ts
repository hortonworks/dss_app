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

import {Component, EventEmitter, Input, Output, SimpleChanges} from "@angular/core";
import {CSP_Resource_RegEx} from "../../../../../models/CSP_Rule";
import {CspService} from "../../../../../services/csp.service";
import {Alerts} from "../../../../../shared/utils/alerts";

@Component({
  selector: 'regex-editor',
  templateUrl: './regex-editor.component.html',
  styleUrls: ['./regex-editor.component.scss']
})

export class RegexEditorComponent {

  @Input('regExModel') model:CSP_Resource_RegEx;
  @Output('regExModelChange') modelEmitter: EventEmitter<CSP_Resource_RegEx> = new EventEmitter<CSP_Resource_RegEx>();
  @Output('toggleNotifier') toggleEmitter: EventEmitter<null> = new EventEmitter<null>();

  outputStr:string = "";
  matchCount:number = 0;
  serializedInputObj:string="";

  constructor(private cspService: CspService) {}

  ngOnInit() {
    this.serializedInputObj = JSON.stringify(this.model);
    this.outputStr = "";
  }

  runTest() {
    this.outputStr = "";
    setTimeout(() => this.runRegExMatch(), 100)
  }

  runRegExMatch() {
    this.outputStr = "";
    if (!this.model.value || !this.model.sampleData) return;
    var regExp
    try {
      regExp = eval("/"+this.model.value+"/g");
    } catch (err) {
      return this.outputStr = "Invalid Regular Expression";
    }
    this.matchCount = 0;
    var lines = this.model.sampleData.split("\n");
    lines.forEach((line, lIndx) => {
      this.outputStr += `Line-${lIndx+1}\n__________________________________________________\n`;
      var match = regExp.exec(line);
      if(!match)
        this.outputStr += `\nNo match found\n`;
      while (match != null) {
        this.matchCount++;
        this.outputStr += `\nMatch ${this.matchCount}\nFull match   ${match[0]}\n`;
        match.forEach((grp, i)=>{
          if(i && grp) this.outputStr += `Group ${i}        ${grp}\n`;
        });
        match = regExp.exec(line);
      }
      this.outputStr += `__________________________________________________\n\n\n\n`;
    });
    if(!this.outputStr) this.outputStr="No Match Found"
  }

  notifyToggle() {
    this.outputStr = "";
    const model = JSON.parse(this.serializedInputObj);
    this.model.name = model.name;
    this.model.value = model.value;
    this.model.sampleData = model.sampleData;
    this.toggleEmitter.emit(null);
  }

  saveResource() {
    if(!this.model.name || !this.model.value) {
      return Alerts.showErrorMessage("Cannot save resource without name and value.");
    }
    if(this.serializedInputObj === JSON.stringify(this.model)){
      return this.notifyToggle();
    }
    this.cspService.saveCspRegExResource(this.model).subscribe(resp => {
      this.outputStr = "";
      this.modelEmitter.emit(resp as CSP_Resource_RegEx);
    })
  }

}
