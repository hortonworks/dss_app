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
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  ViewContainerRef
} from "@angular/core";
import {AssetSetQueryModel} from '../../../../../../models/asset-set-query-model';
import {QueryFilter} from './filter/filter.component';

@Component({
  selector: "advance-query-editor",
  styles: [`.mdl-button {  min-width: 0px;  margin-top: 1px;  }`],
  template: `
    <div style="padding: 15px;">
      <span #filterCont></span>
      <button class="mdl-button btn-hwx-secondary" (click)="addNewFilter()"><i class="fa fa-plus"></i></button>
    </div>
  `
})
export class AdvanceQueryEditor implements OnInit {

  @Input() queryModel: AssetSetQueryModel;
  @Input() clusterId: number;

  @Output("onHeightChange") heightEmitter: EventEmitter<number> = new EventEmitter<number>();
  @Output("onActionDone") doneEmitter: EventEmitter<null> = new EventEmitter<null>();
  @ViewChild("filterCont", {read: ViewContainerRef}) filterCont: ViewContainerRef;
  @ViewChild("filterCont") filterContElmRef: ElementRef;

  fltrCmpRfs: ComponentRef<QueryFilter>[] = [];

  constructor(private cFR: ComponentFactoryResolver) { }

  ngOnInit() {
    this.addNewFilter();
  }

  addNewFilter() {
    const qFilter = this.cFR.resolveComponentFactory(QueryFilter);
    const compRef = this.filterCont.createComponent(qFilter);
    this.fltrCmpRfs.push(compRef);
    compRef.instance.clusterId = this.clusterId;
    compRef.instance.closeEmitter.subscribe(() => {
      this.fltrCmpRfs.splice(this.fltrCmpRfs.indexOf(compRef), 1)[0].destroy();
      setTimeout(() => this.heightEmitter.emit(this.filterContElmRef.nativeElement.parentElement.offsetHeight), 0);
    });
    compRef.instance.enterEmitter.subscribe(() => this.doneEmitter.emit());
    setTimeout(() => this.heightEmitter.emit(this.filterContElmRef.nativeElement.parentElement.offsetHeight), 0);
  }

  updateQueryModel() {
    const retArr = [];
    let fObj;
    this.fltrCmpRfs.forEach(compRef => (fObj = compRef.instance.filterObject) && fObj.validity && retArr.push(fObj.getFilterData()));
    this.queryModel.filters.splice(0, this.queryModel.filters.length);
    this.queryModel.filters.push.apply(this.queryModel.filters, retArr); // need to push all together
  }

  reset() {
    this.fltrCmpRfs.forEach(compRef => compRef.destroy());
    this.fltrCmpRfs = [];
    this.addNewFilter();
  }

  ngOnDestroy() {
    this.fltrCmpRfs.forEach(compRef => compRef.destroy());
    this.fltrCmpRfs = [];
  }
}
