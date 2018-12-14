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

import {Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {AdvanceQueryEditor} from './queryEditors/advance/advance-query-editor.component';
import {BasicQueryEditor, SimpleQueryObjectModel} from './queryEditors/basic/basic-query-editor.component';
import {AssetSetQueryModel} from '../../../../models/asset-set-query-model';
import {AssetListActionsEnum, DsAssetList} from '../ds-assets-list/ds-assets-list.component';

export enum DsAssetSearchTabEnum { NORMAL, ADVANCE}

@Component({
  selector: 'asset-search',
  styleUrls: ['./ds-asset-search.component.scss'],
  templateUrl: './ds-asset-search.component.html'
})

export class DsAssetSearch {
  tabEnum = DsAssetSearchTabEnum;
  activeTab = this.tabEnum.NORMAL;
  queryObj: SimpleQueryObjectModel = new SimpleQueryObjectModel('');
  queryModel: AssetSetQueryModel = new AssetSetQueryModel([]);
  showQueryResults = false;
  hideSearchButtons = false;

  allSelected = false;
  cherryPicked = 0;
  cherryDroped = 0;

  @ViewChild('outerCont') outerCont: ElementRef;
  @ViewChild('tabCont') tabCont: ElementRef;
  @ViewChild('emptySearchMsg') emptySearchMsg: ElementRef;
  @ViewChild('queryResultCont') queryResultCont: ElementRef;
  @ViewChild('dsAssetList') dsAssetList: DsAssetList;
  @ViewChild('basicQueryEditor') basicQueryEditor: BasicQueryEditor;
  @ViewChild('advanceQueryEditor') advanceQueryEditor: AdvanceQueryEditor;

  @Input() hideActionButtons = false;
  @Input() clusterId: number;
  @Input() datasetId: number;
  @Input() showBelongsToColumn = false;
  @Output('addNotification') addNotificationEmitter: EventEmitter<AssetSetQueryModel> = new EventEmitter<AssetSetQueryModel>();
  @Output('cancelNotification') cancelNotificationEmitter: EventEmitter<null> = new EventEmitter<null>();

  get showDone () {
    return (this.allSelected || this.cherryPicked || this.cherryDroped);
  }

  setActiveTab (tabEnum: DsAssetSearchTabEnum) {
    if (this.activeTab === tabEnum) { return; }
    this.actionReset();
    this.activeTab = tabEnum;
  }

  actionCancel() {
    this.cancelNotificationEmitter.emit();
  }

  onListAction (action) {
    switch (action) {
      case AssetListActionsEnum.RELOADED :
          // this.resultStartIndx = this.dsAssetList.pageStartIndex;
          // this.resultEndIndx = this.dsAssetList.pageEndIndex;
          break;

      case AssetListActionsEnum.SELECTIONCHANGE :
          this.cherryPicked = this.cherryDroped = 0; this.allSelected = false;
          if (this.dsAssetList.selectState !== this.dsAssetList.selStates.CHECKSOME) {
            if (this.allSelected = true) {
              (this.cherryDroped = this.dsAssetList.selExcepList.length);
            }
          } else {
            this.cherryPicked = this.dsAssetList.selExcepList.length
          }
    }
  }
  actionDone () {
    if (!this.allSelected && !this.cherryPicked && !this.cherryDroped) { return this.actionCancel(); }
    this.dsAssetList.updateQueryModels();
    this.addNotificationEmitter.emit(this.queryModel);
  }

  actionSearch() {
    this.showQueryResults = true;
    setTimeout(() => this.onQueryEditorResize(), 0);
    setTimeout(() => this._actionSearch(), 0);
  }

  _actionSearch() {
    switch (this.activeTab) {
      case this.tabEnum.NORMAL :
        if (!this.queryModel.filters.length) { return this.onEmptySearch(); }
        this.basicQueryEditor.hideFilterCont();
        this.hideSearchButtons = true;
        this.dsAssetList.freshFetch();
        break;
      case this.tabEnum.ADVANCE:
        this.advanceQueryEditor.updateQueryModel();
        if (!this.queryModel.filters.length) { return this.onEmptySearch(); }
        // this.hideSearchButtons = true;
        this.dsAssetList.freshFetch();
        break;
    }
  }
  showSearchButton () {
    this.hideSearchButtons = false;
    this.onQueryEditorResize();
  }

  actionReset() {
    this.queryModel.filters.splice(0, this.queryModel.filters.length);
    switch (this.activeTab) {
      case this.tabEnum.NORMAL :
        this.basicQueryEditor.reset();
        break;
      case this.tabEnum.ADVANCE:
        this.advanceQueryEditor.reset();
        break;
    }
    if (this.dsAssetList) {
      this.dsAssetList.clearResults();
    }
    this.showQueryResults = false;
    this.showSearchButton();
    this.onQueryEditorResize();
  }

  onQueryEditorResize() {
    setTimeout( () => {
      const padding = this.queryResultCont.nativeElement.offsetTop - this.outerCont.nativeElement.offsetTop;
      this.tabCont.nativeElement.style.marginTop = `-${padding}px`; // -10 for padding from border
      this.outerCont.nativeElement.style.paddingTop = `${padding}px`;
      if (this.dsAssetList) {
        this.dsAssetList.resize();
      }
    }, 0);
  }

  onEmptySearch () {
    this.actionReset();
    this.emptySearchMsg.nativeElement.style.display = 'inline-block';
    setTimeout(() => this.emptySearchMsg.nativeElement.style.display = 'none', 2000);
  }
}
