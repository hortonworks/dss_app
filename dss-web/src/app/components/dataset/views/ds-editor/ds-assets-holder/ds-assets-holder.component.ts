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

import {Component, EventEmitter, Input, OnInit, Output, SimpleChange, ViewChild} from "@angular/core";
import {RichDatasetModel} from "../../../../../models/richDatasetModel";
import {RichDatasetService} from "../../../../../services/RichDatasetService";
import {AssetListActionsEnum, DsAssetList} from "../../ds-assets-list/ds-assets-list.component";
import {AssetSetQueryModel} from '../../../../../models/asset-set-query-model';

@Component({
  providers: [RichDatasetModel],
  selector: "ds-assets-holder",
  styleUrls: ["./ds-assets-holder.component.scss"],
  templateUrl: "./ds-assets-holder.component.html"
})

export class DsAssetsHolder {

  @Input() assetSetQueryModelsForAddition: AssetSetQueryModel[] = null;
  @Input() assetSetQueryModelsForSubtraction: AssetSetQueryModel[] = null;
  @Input() dsModel: RichDatasetModel = null;
  applicableListActions: AssetListActionsEnum[] = [AssetListActionsEnum.REMOVE, AssetListActionsEnum.ADD];
  showPopup: boolean = false;

  @Output('onNext') nextEE: EventEmitter<void> = new EventEmitter<void>();
  @Output('onCancel') cancelEE: EventEmitter<void> = new EventEmitter<void>();

  @ViewChild("dsAssetList") dsAssetList: DsAssetList;

  constructor(private richDatasetService: RichDatasetService){}

  get showList() {
    return (this.assetSetQueryModelsForAddition.length > 0);
  }

  actionDone(asqm: AssetSetQueryModel) {
    let futureRdataSet;

    if(asqm.selectionList.length)
      futureRdataSet = this.richDatasetService.addSelectedAssets(this.dsModel.id, this.dsModel.clusterId, asqm.selectionList);
    else
      futureRdataSet = this.richDatasetService.addAssets(this.dsModel.id, this.dsModel.clusterId, [asqm], asqm.exceptionList);

    futureRdataSet.subscribe(rData => {
        this.dsModel = rData;
        // this.assetSetQueryModelsForAddition.push(asqm);
        this.showPopup = false;
      })
  }

  onListAction(action: AssetListActionsEnum) {
    if (action == AssetListActionsEnum.ADD) {
      this.showPopup = true;
    }
    if (action == AssetListActionsEnum.REMOVE) {
      if(this.dsAssetList.checkedAllState())
        this.actionRemoveAll();
      else
        this.actionRemoveSelected(this.dsAssetList.selExcepList)
    }
  }

  actionRemoveAll() {
    console.log("Remove all called!!!")
    this.richDatasetService
      .deleteAllAssets(this.dsModel.id)
      .subscribe(rData => {
        this.dsModel = rData;
        // this.assetSetQueryModelsForAddition.splice(0);
        // this.dsModel.counts=null;
      })
  }
  actionRemoveSelected (ids:string[]) {
    console.log("Remove selected called!!!")
    if(!ids.length) return console.log("cannot remove without selection")
    this.richDatasetService
      .deleteSelectedAssets(this.dsModel.id, ids)
      .subscribe(rData => {
        this.dsModel = rData;
      })
  }

  actionCancel() {
    this.showPopup = false;
  }

  onNext() {
    this.nextEE.emit();
  }

  onCancel() {
    this.cancelEE.emit();
  }
}
