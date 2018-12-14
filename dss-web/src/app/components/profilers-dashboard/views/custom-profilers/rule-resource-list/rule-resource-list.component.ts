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

import {Component, EventEmitter, Input, Output} from "@angular/core";
import {CSP_Resource_File, CSP_Resource_RegEx} from "../../../../../models/CSP_Rule";
import {CspService} from "../../../../../services/csp.service";

@Component({
  selector: 'rule-resource-list',
  templateUrl: './rule-resource-list.component.html',
  styleUrls: ['./rule-resource-list.component.scss']
})

export class RuleResourceListComponent {

  @Input('regExResources') regExResources:CSP_Resource_RegEx[] = [];
  @Input('lookupResources') lookupResources:CSP_Resource_File[] = [];
  @Output('toggleNotifier') toggleEmitter: EventEmitter<null> = new EventEmitter<null>();
  @Output('changeNotifier') changeEmitter: EventEmitter<null> = new EventEmitter<null>();

  regExSearch:string="";
  lookUpSearch:string="";

  regExToEdit:CSP_Resource_RegEx=null;

  regExAccordianOpen=true;
  lookUpAccordianOpen=false;
  algoAccordianOpen=false;

  showRegExEditor=false;
  showLookupEditor=false;

  constructor(private cspService: CspService) {}

  toggleAccordian(name:string) {
    if(name == "regEx") {
      this.regExAccordianOpen = !this.regExAccordianOpen;
      this.lookUpAccordianOpen=false;
      this.algoAccordianOpen=false;
    }
    if(name == "lookup") {
      this.lookUpAccordianOpen = !this.lookUpAccordianOpen;
      this.regExAccordianOpen=false;
      this.algoAccordianOpen=false;
    }
    if(name == "algo") {
      this.algoAccordianOpen = !this.algoAccordianOpen;
      this.regExAccordianOpen=false;
      this.lookUpAccordianOpen=false;
    }
  }

  showEditor(name:string){
    this.showRegExEditor=false;
    this.showLookupEditor=false;

    if(name=='regEx') {
      this.showRegExEditor = true;
      this.regExToEdit = new CSP_Resource_RegEx();
    }
    if(name=='lookup')
      this.showLookupEditor=true;

    this.notifyToggle()
  }

  deleteResource(obj) {
    if(confirm("Are you sure you want to delete the resource")){
      this.cspService.deleteCspResource(obj.id).subscribe(whatever => {
        if(obj.type === 'regex')
          this.regExResources.splice(this.regExResources.indexOf(obj),1);
        if(obj.type === 'file')
          this.lookupResources.splice(this.lookupResources.indexOf(obj),1);
        this.changeEmitter.emit(null);
      })
    }
  }

  editRegex(obj) {
    this.showEditor('regEx');
    this.regExToEdit = obj;
  }

  notifyToggle() {
    this.toggleEmitter.emit(null)
  }

  manageChange(obj) {
    if(obj.type === 'regex' && this.regExResources.filter(res=>res.id === obj.id).length == 0)
      this.regExResources.push(obj);
    if(obj.type === 'file' && this.lookupResources.filter(res=>res.id === obj.id).length == 0)
      this.lookupResources.push(obj);
    this.changeEmitter.emit(null);
    this.notifyToggle()
  }

  onRegExSarchChange() {
    console.log(this.regExSearch);
  }

}
