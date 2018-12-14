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

import {
  Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChange,
  ViewChild
} from "@angular/core";



@Component({
  selector: 'dsl-widget',
  styleUrls: ['./dsl-widget.component.scss'],
  templateUrl: './dsl-widget.component.html',
})

export class DslWidget implements OnInit, OnChanges {

  @Input('dsl') dsl="";
  @Output('dslChange') dslEmitter: EventEmitter<string> = new EventEmitter<string>();
  @Input('dslDisplay') dslDisplay="";
  @Output('dslDisplayChange') dslDisplayEmitter: EventEmitter<string> = new EventEmitter<string>();
  @ViewChild('input') input: ElementRef;


  @Input('oprands') oprands;
  // = [{'display':'Regex', 'inline':'Regex', 'dependent':true},
  //   {'display':'Lookup', 'inline':'Lookup', 'dependent':true},
  //   {'display':'Whitelist', 'inline':'Lookup', 'dependent':true},
  //   {'display':'Blacklist', 'inline':'NOT Lookup', 'dependent':true},
  //   {'display':'Luhn Check', 'inline':'luhn', 'dependent':false}];
  @Input('operators') operators;
  // = [{'display':'AND', 'inline':' and '}, {'display':'OR', 'inline':' or '}, {'display':'NOT', 'inline':' !'}];
  @Input('subOprands') subOprands;
  // =[{'display':'Email Address', 'inline':'(<<resource__regex.1>>)', 'oprands':['Regex']}
  //   ,{'display':'Credit Card', 'inline':'(<<resource__regex.2>>)', 'oprands':['Regex']}
  //   ,{'display':'Swift Code', 'inline':'(<<resource__regex.3>>)', 'oprands':['Regex']}
  //   ,{'display':'Regex4', 'inline':'(<<resource__regex.4>>)', 'oprands':['Regex']}
  //   ,{'display':'File1', 'inline':'(<<resource__file.1>>)', 'oprands':['Lookup', 'Whitelist', 'Blacklist']}
  //   ,{'display':'File2', 'inline':'(<<resource__file.2>>)', 'oprands':['Lookup', 'Whitelist', 'Blacklist']}
  //   ,{'display':'File3', 'inline':'(<<resource__file.3>>)', 'oprands':['Lookup', 'Whitelist', 'Blacklist']}
  // ];
  showDropDown=false;
  dropDownOptions:any = this.oprands;
  dropDownType = 'oprands';
  inputText="";
  displayText="";
  insertIndex=0;
  timeoutTracker;

  ngOnInit() {
  }
  ngOnChanges(changes: { [propertyName: string]: SimpleChange }) {
    if (changes['dslDisplay']) {
      this.inputText = this.dslDisplay;
      // this.insertIndex = this.dslDisplay.length
    }
    if (changes['oprands']) {
      this.dropDownOptions = this.oprands;
      this.dropDownType = 'oprands';
    }
  }

  onInputFocus() {
    this.showDropDown=true;
    this.timeoutTracker=setTimeout(() =>this.input.nativeElement.setSelectionRange(this.insertIndex, this.insertIndex), 100);
  }
  onInputBlur() {
    this.timeoutTracker=setTimeout(() => this.showDropDown=false, 300);
  }
  onInputTextChange(){
    this.inputText=this.dslDisplay;
  }
  clearDsl(){
    this.inputText=this.dslDisplay=this.dsl="";
    this.insertIndex=0;
    this.dropDownOptions = this.oprands;
    this.dropDownType = 'oprands';
    this.dslEmitter.emit(this.dsl);
    this.dslDisplayEmitter.emit(this.dslDisplay);
  }
  manageSelection(selOpt){
    this.dslDisplay = this.dslDisplay.slice(0, this.insertIndex) + (selOpt.display || selOpt) + this.dslDisplay.slice(this.insertIndex);
    this.dsl += selOpt.inline;
    if(selOpt.dependent) {
      this.dslDisplay += "()";
      this.insertIndex = this.dslDisplay.length-1;
      this.dropDownOptions = this.subOprands.filter(opt => opt.oprands.indexOf(selOpt.display) != -1);
      this.dropDownType = 'subOprands'
    }
    else {
      this.dslDisplay += " ";
      this.insertIndex = this.dslDisplay.length;
      this.dropDownOptions = (this.dropDownType  === 'operators')? this.oprands:this.operators;
      this.dropDownType =(this.dropDownType  === 'operators')? 'oprands':'operators';
    }
    this.inputText=this.dslDisplay;
    this.timeoutTracker && clearTimeout(this.timeoutTracker);
    this.input.nativeElement.focus();
    this.dslEmitter.emit(this.dsl);
    this.dslDisplayEmitter.emit(this.dslDisplay);
    console.log(this.dsl);
  }

}
