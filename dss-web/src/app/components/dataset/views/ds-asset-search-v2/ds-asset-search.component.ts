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

import {Component, EventEmitter, Input, Output, ViewChild, OnInit} from '@angular/core';
import {DsAssetsService} from '../../../../services/dsAssetsService';
import {AssetSetQueryModel} from '../../../../models/asset-set-query-model';
import {AssetListActionsEnum, DsAssetList} from '../ds-assets-list/ds-assets-list.component';

@Component({
  selector: 'asset-search-V2',
  styleUrls: ['./ds-asset-search.component.scss'],
  templateUrl: './ds-asset-search.component.html'
})
export class DsAssetSearchV2 implements OnInit {

  @Input() clusterId: number;
  @Input() datasetId: number;
  @Input() showBelongsToColumn = false;

  @Output('addNotification') addNotificationEmitter: EventEmitter<AssetSetQueryModel> = new EventEmitter<AssetSetQueryModel>();
  @Output('cancelNotification') cancelNotificationEmitter: EventEmitter<null> = new EventEmitter<null>();

  @ViewChild('dsAssetList') dsAssetList: DsAssetList;

  queryModel: AssetSetQueryModel = new AssetSetQueryModel([]);
  searchText = '';
  ownerName = '';
  dbName = '';
  selectedTag = '';
  tagOptions: string[] = [];
  hideActionButtonCont = false;
  showQueryResults = false;
  resultStartIndx = 0;
  resultEndIndx = 0;
  allSelected = false;
  cherryPicked = 0;
  cherryDroped = 0;

  constructor(private assetService: DsAssetsService) {
  }

  ngOnInit() {
    this.assetService.tagsQuery(this.clusterId).subscribe(tags => {
      this.tagOptions = tags;
    });
  }

  freshFetch() {
    if (this.queryModel.filters.length == 0) {
      this.cherryPicked = this.cherryDroped = 0;
      this.allSelected = false;
      return this.showQueryResults = false;
    }
    this.showQueryResults = true;
    this.resultStartIndx = 0;
    setTimeout(() => this.dsAssetList.freshFetch(), 100);
  }

  onSearchTextChange(e: any) {
    this.queryModel.filters = this.queryModel.filters.filter(fil => fil.column != 'name');
    if (this.searchText) {
      this.queryModel.filters.push({column: 'name', operator: 'contains', value: this.searchText, dataType: 'string'});
    }
    this.freshFetch();
  }

  onOwnerNameChange(e) {
    this.queryModel.filters = this.queryModel.filters.filter(fil => fil.column != 'owner');
    if (this.ownerName) {
      this.queryModel.filters.push({column: 'owner', operator: 'contains', value: this.ownerName, dataType: 'string'});
    }
    this.freshFetch();
  }

  clearOwnerName() {
    this.ownerName = '';
    this.onOwnerNameChange(null);
  }

  onDbNameChange(e) {
    this.queryModel.filters = this.queryModel.filters.filter(fil => fil.column !== 'db.name');
    if (this.dbName) {
      this.queryModel.filters.push({column: 'db.name', operator: 'contains', value: this.dbName, dataType: 'string'});
    }
    this.freshFetch();
  }

  clearDbName() {
    this.dbName = '';
    this.onDbNameChange(null);
  }

  onTagSelectionChange(e) {
    this.queryModel.filters = this.queryModel.filters.filter(fil => fil.column != 'tag');
    if (this.selectedTag) {
      if (this.tagOptions.indexOf(this.selectedTag) == -1) {
        this.selectedTag = '';
        return;
      }
      this.queryModel.filters.push({column: 'tag', operator: 'equals', value: this.selectedTag, dataType: 'tag'});
    }
    this.freshFetch();
  }

  clearTag() {
    this.selectedTag = '';
    this.onTagSelectionChange(null);
  }

  onListAction(action) {
    switch (action) {
      case AssetListActionsEnum.RELOADED :
        this.resultStartIndx = this.dsAssetList.pageStartIndex;
        this.resultEndIndx = this.dsAssetList.pageEndIndex;
        break;

      case AssetListActionsEnum.SELECTIONCHANGE :
        this.cherryPicked = this.cherryDroped = 0;
        this.allSelected = false;
        if (this.dsAssetList.selectState !== this.dsAssetList.selStates.CHECKSOME) {
          (this.allSelected = true) && (this.cherryDroped = this.dsAssetList.selExcepList.length)
        } else {
          this.cherryPicked = this.dsAssetList.selExcepList.length
        }
    }
  }

  onAddAssetToList() {
    if (!this.allSelected && !this.cherryPicked && !this.cherryDroped) {
      return this.onCancel();
    }
    this.hideActionButtonCont = true;
    this.dsAssetList.updateQueryModels();
    this.addNotificationEmitter.emit(this.queryModel);
  }

  onCancel() {
    this.cancelNotificationEmitter.emit();
  }
}
