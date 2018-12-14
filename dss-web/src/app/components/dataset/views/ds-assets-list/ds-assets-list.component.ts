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

import {Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChange, ViewChild, IterableDiffers} from "@angular/core";
import {DsAssetModel} from "../../../../models/dsAssetModel";
import {RichDatasetModel} from "../../../../models/richDatasetModel";
import {DsAssetsService} from "../../../../services/dsAssetsService";
import {ActivatedRoute, Router} from "@angular/router";
import {AssetSetQueryFilterModel, AssetSetQueryModel} from '../../../../models/asset-set-query-model';

export enum AssetTypeEnum { ALL, HIVE, HDFS}

export enum AssetSelectionStateEnum { CHECKALL, CHECKALLWITHEXCEPTION, CHECKSOME}

export let AssetTypeEnumString = ["all", "hive", "file"];
export enum AssetListActionsEnum {EDIT, REMOVE, ADD, RELOADED, STARTRELOAD, SELECTIONCHANGE, DELETE, DONE}

class ASQFM extends AssetSetQueryFilterModel {}

class ASQM extends AssetSetQueryModel {}

enum ResultState { LOADING, LOADED, EMPTY, NOMORE}
@Component({
  selector: "ds-assets-list",
  styleUrls: ["./ds-assets-list.component.scss"],
  templateUrl: "./ds-assets-list.component.html",
})
export class DsAssetList implements OnInit {

  @Input() dsModel: RichDatasetModel;
  @Input() applicableActions: AssetListActionsEnum[];
  @Input() hideTabs: boolean = false;
  @Input() hideSearch: boolean = false;
  @Input() innerListScrollable: boolean = false;
  @Input() Editable: boolean = true;
  @Input() queryModels: (ASQM | ASQM[]);
  @Input() avoidLoadingOnInit: boolean = false;
  @Input() searchText: string = "";
  @Input() typeFilter: AssetTypeEnum = AssetTypeEnum.ALL;
  @Input() clusterId:number;
  @Input() datasetId:number;
  @Input() allowAssetNavigation : boolean = true;
  @Input() showBelongsToColumn : boolean = false;

  @ViewChild("table") table: ElementRef;
  @ViewChild("outerCont") outerCont: ElementRef;
  @ViewChild("listCont") listCont: ElementRef;

  @Output("onAction")
  actionEmitter: EventEmitter<AssetListActionsEnum> = new EventEmitter<AssetListActionsEnum>();

  pageSizeOptions: number[] = [10, 15, 20, 50, 100, 150, 200];
  pageSize: number = 20;
  pageStartIndex: number = 1;
  pageEndIndex: number = 0;
  assetsCount: number = 0;
  dsAssets: DsAssetModel[] = [];
  selExcepList: string[] = [];
  tab = AssetTypeEnum;
  selStates = AssetSelectionStateEnum;
  selectState = AssetSelectionStateEnum.CHECKSOME;
  actionEnum = AssetListActionsEnum;
  resultState:ResultState = ResultState.LOADED;
  resultStates = ResultState;
  iterableDiffer:any;
  private tableHeight: number = 0;
  private totalPages: number = 1;
  private initDone: boolean = false;

  constructor(private dsAssetsService: DsAssetsService,
              private router: Router,
              private activatedRoute: ActivatedRoute,
              private _iterableDiffers: IterableDiffers
  ) {
    this.iterableDiffer = this._iterableDiffers.find([]).create(null);
  }
  ngOnInit() {
    if (this.innerListScrollable) {
      this.outerCont.nativeElement.classList.add("innerListScrollable");
    }
    this.setTableHeight();
    if(!this.avoidLoadingOnInit) {
      this.fetchAssets();
    }
    this.initDone = true;
  }

  ngOnChanges(changes: { [propertyName: string]: SimpleChange }) {
    if(this.initDone && changes["selectState"]) {
      console.log('Changes detected! -1');
    }
    if(this.initDone && (changes["dsModel"] || changes["searchText"] || changes["queryModels"] || changes["pageSize"])) {
      this.fetchAssets();
    }
  }

  ngDoCheck() {
    let changes = this.iterableDiffer.diff(this.selExcepList);
    if (changes) {
        this.onChangeInSelection();
    }
  }

  setFirstPage() {
    this.pageStartIndex = 1;
  }

  clearResults() {
    this.dsAssets = [];
    this.totalPages = this.assetsCount = 0;
    this.clearSelection();
  }

  clearSelection () {
    this.selExcepList = [];
    this.selectState = this.selStates.CHECKSOME
    this.onChangeInSelection();
  }

  freshFetch () {
    this.setFirstPage();
    this.clearSelection();
    return this.fetchAssets();
  }

  fetchAssets() {
    this.dsAssets = [];
    let asqms = this.getQueryModelsForAssetService(true);
    const tab = this.tab, tpfltr = this.typeFilter;
    this.resultState = this.resultStates.LOADING
    if(this.dsModel && this.dsModel.counts) {
      this.assetsCount = this.dsModel.counts.hiveCount + this.dsModel.counts.filesCount;
      this.totalPages = Math.ceil(this.assetsCount / this.pageSize);
    }
    else
      this.totalPages = this.assetsCount = Infinity;

    //TODO there must be a separate count query with all filters instead of hard coding assetsCount
    asqms = this.getQueryModelsForAssetService(false);
    this.dsAssetsService.list(asqms, Math.ceil(this.pageStartIndex / this.pageSize), this.pageSize, this.clusterId, this.datasetId, this.Editable)
      .subscribe(assetsNcounts => {
        this.dsAssets = assetsNcounts.assets;
        if(assetsNcounts.count !== null) {
          this.assetsCount = assetsNcounts.count;
          this.totalPages = Math.ceil(this.assetsCount / this.pageSize);
        }
        this.pageEndIndex = this.pageStartIndex-1+assetsNcounts.assets.length;
        setTimeout(() => {
          this.setTableHeight();
          this.actionReload();
        }, 0);
        this.resultState = (this.dsAssets.length)?this.resultStates.LOADED:(this.pageStartIndex==1)?this.resultStates.EMPTY:this.resultStates.NOMORE;
      });
  }

  calcTableHeight() {
    let heightAboveTable = this.table.nativeElement.offsetTop - this.listCont.nativeElement.offsetTop;
    const paginationHeight = this.listCont.nativeElement.offsetHeight - this.table.nativeElement.offsetHeight - heightAboveTable;
    heightAboveTable = this.table.nativeElement.offsetTop - this.outerCont.nativeElement.offsetTop;
    return this.tableHeight = this.outerCont.nativeElement.offsetHeight - heightAboveTable - paginationHeight;
  }

  setTableHeight() {
    this.table.nativeElement.style.height = "auto";
    this.table.nativeElement.style.height =
      `${((this.innerListScrollable) ? this.calcTableHeight() : this.table.nativeElement.offsetHeight)}px`;
  }

  resize() {
    this.tableHeight = 0;
    this.setTableHeight();
  }

  onPageSizeChange(size: number) {
    this.setFirstPage();
    this.pageSize = size;
    this.fetchAssets();
  }

  onPageChange(index: number) {
    if(this.pageStartIndex < index && this.dsAssets.length < this.pageSize) {
      this.pageStartIndex = index;
      setTimeout(()=>this.pageStartIndex = index-this.pageSize, 0);
      return;
    }
    this.pageStartIndex = index;
    this.fetchAssets();
  }
  onCheckAllChange(e) {
    this.selExcepList = [];
    if(e.target.checked) this.selectState = this.selStates.CHECKALLWITHEXCEPTION
    else this.selectState = this.selStates.CHECKSOME
    this.onChangeInSelection();
  }
  checkedAllState() {
    if (this.selectState == this.selStates.CHECKSOME) return false;
    return true;
  }
  showChecked(asset) {
    // if (this.selectState == this.selStates.CHECKALL) return true
    if (this.selectState == this.selStates.CHECKALLWITHEXCEPTION) {
      return (this.selExcepList.indexOf(asset.id) == -1)
    }
    return (this.selExcepList.indexOf(asset.id) != -1)
  }
  onAssetSelectionChange(asset) {
    if (this.selExcepList.indexOf(asset.id) == -1) this.selExcepList.push(asset.id);
    else this.selExcepList = this.selExcepList.filter(id => id !== asset.id);
  }

  onChangeInSelection () {
    this.actionEmitter.emit(this.actionEnum.SELECTIONCHANGE);
  }

  actionAddMore() {
    this.actionEmitter.emit(this.actionEnum.ADD);
  }

  actionRemove() {
    this.actionEmitter.emit(this.actionEnum.REMOVE);
  }

  actionEdit() {
    this.actionEmitter.emit(this.actionEnum.EDIT);
  }

  actionReload () {
    this.actionEmitter.emit(this.actionEnum.RELOADED);
  }
  actionDelete () {
    this.actionEmitter.emit(this.actionEnum.DELETE);
  }
  actionDone () {
    this.actionEmitter.emit(this.actionEnum.DONE);
  }

  updateQueryModels() {
    const asqms: ASQM[] = [], qmdls = this.queryModels;
    asqms.push.apply(asqms, (qmdls.constructor.name == "Array") ? qmdls : [qmdls]);
    asqms.forEach(asqm => asqm[(this.selectState == this.selStates.CHECKSOME)?"selectionList":"exceptionList"] = this.selExcepList);
  }

  getQueryModelsForAssetService(countQuery: boolean) {
    const asqms: ASQM[] = [], asqmsClone: ASQM[] = [], qmdls = this.queryModels;
    if(qmdls) { // make sure its an array of asqm
      asqms.push.apply(asqms, (qmdls.constructor.name == "Array") ? qmdls : [qmdls]);
    }
    if (!asqms.length) { // make sure its not empty
      asqms.push(new ASQM([]));
    }
    asqms.forEach(asqm => {
      const newAsqm = new ASQM([]);
      newAsqm.filters.push.apply(newAsqm.filters, asqm.filters);
      if (!this.hideSearch && this.searchText) {
        newAsqm.filters.push({column: "name", operator: "contains", value: this.searchText, dataType:"string"});
      }
      // if (!this.hideTabs && !countQuery) {
      //   newAsqm.filters.push({column: "asset.source", operator: "==", value: AssetTypeEnumString[this.typeFilter], dataType:"-"});
      // }
      asqmsClone.push(newAsqm);
    });
    return asqmsClone;
  }
  onAssetClick(id:any, clusterId:number) {
    // console.log(id, clusterId);
    if(this.allowAssetNavigation && clusterId) {
      this.router.navigate([`clusters/${clusterId}/assets/${id}`], {relativeTo: this.activatedRoute});
    }
  }

  get showStarMessage() {
    return this.dsAssets.filter(ass=>ass.dsName).length;
  }
}
