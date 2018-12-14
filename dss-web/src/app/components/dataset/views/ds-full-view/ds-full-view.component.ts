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

import {Component, OnInit, ViewChild, ElementRef, isDevMode} from "@angular/core";
import {ActivatedRoute, Router} from "@angular/router";
import * as DialogPolyfill from 'dialog-polyfill';
import {Bookmark, Favourite, RichDatasetModel} from "../../../../models/richDatasetModel";
import {RichDatasetService} from "../../../../services/RichDatasetService";
import {DsTagsService} from "../../../../services/dsTagsService";
import {DataSetService} from "../../../../services/dataset.service";
import {AssetListActionsEnum, DsAssetList} from "../ds-assets-list/ds-assets-list.component";
import {DsAssetSearch} from "../ds-asset-search/ds-asset-search.component";
import {AuthUtils} from "../../../../shared/utils/auth-utils";
import {FavouriteService} from "../../../../services/favourite.service";
import {BookmarkService} from "../../../../services/bookmark.service";
import {RatingService} from "../../../../services/rating.service";
import {DataSet} from "../../../../models/data-set";
import {CommentService} from "../../../../services/comment.service";
import {DssAppEvents} from "../../../../services/dss-app-events";
import * as moment from 'moment';
import {AssetSetQueryFilterModel, AssetSetQueryModel} from '../../../../models/asset-set-query-model';

export enum Tabs {
  OVERVIEW, ASSETS
}

@Component({
  selector: "ds-full-view",
  styleUrls: ["./ds-full-view.component.scss"],
  templateUrl: "./ds-full-view.component.html",
})
export class DsFullView implements OnInit {

  @ViewChild('dialogConfirm') dialogConfirm: ElementRef;
  @ViewChild("dsAssetList") dsAssetList: DsAssetList;
  @ViewChild("dsAssetSearch") dsAssetSearch: DsAssetSearch;

  tabEnum = Tabs;
  selectedTab = Tabs.OVERVIEW;
  dsModel: RichDatasetModel = null;
  applicableListActions: AssetListActionsEnum[] = [AssetListActionsEnum.EDIT];
  dsAssetQueryModel: AssetSetQueryModel;
  dsId: string;
  showSummary : boolean = true;
  saveInProgress = false;
  EditState : boolean = false;
  showPopup: boolean = false;
  hidePopupActionButtons: boolean = false;
  showConfirmationSticker: boolean = false;
  showErrorSticker: boolean = false;
  showSaveErrorSticker: boolean = false;
  systemTags: string[] = [];
  objectType: string = "assetCollection";
  avgRating: number = 0;
  assetCountDiff:number = 0;
  activatePopup = false;
  deactivatePopup = false;

  constructor(private router: Router,
              private activeRoute: ActivatedRoute,
              private richDatasetService: RichDatasetService,
              private dataSetService: DataSetService,
              private tagService: DsTagsService,
              private favouriteService: FavouriteService,
              private bookmarkService: BookmarkService,
              private ratingService: RatingService,
              private commentService: CommentService,
              private dssAppEvents: DssAppEvents) {
  }

  ngOnInit() {
    const selectTab = this.activeRoute.snapshot.queryParams['tab'];
    if (selectTab && selectTab.length > 0) {
      this.selectedTab = selectTab === 'assets' ? Tabs.ASSETS : Tabs.OVERVIEW;
    }
    this.activeRoute.params
      .subscribe(params => {
        this.dsId = params["id"];
        this.loadDsModel();
        this.dsAssetQueryModel = new AssetSetQueryModel([
          new AssetSetQueryFilterModel("dataset.id", "=", +params["id"], "-")
        ]);
        this.tagService.listAtlasTags(+params["id"]).subscribe(tags => this.systemTags=tags)

        this.commentService.ngOnInit();
        this.commentService.dataChanged$.subscribe(callRequired => {
          if(callRequired){
            this.commentService.getCommentsCount(params["id"], this.objectType).subscribe(commentsCount => {
              this.dsModel.totalComments = commentsCount.totalComments;
            });
          }
        });

      });

    this.ratingService.ngOnInit();
    this.ratingService.dataChanged$.subscribe(avgRating => {
      this.dsModel.avgRating = avgRating;
    });
  }
  onShowModel () {
    this.showPopup = true;
    this.activatePopup = false;
    window.setTimeout(() => this.activatePopup = true, 1); // the time you want
  }
  onHideModel () {
    this.activatePopup = false;
    this.deactivatePopup = true;
    window.setTimeout(() => {
      this.showPopup = false;
      this.deactivatePopup = false;
    }, 600
    ); // the time you want
  }
  loadDsModel () {
    this.richDatasetService.getById(+this.dsId, this.EditState).subscribe(dsObj => {
        this.dsModel = dsObj;
        this.setEditState();
    });
  }
  setEditState () {
    console.log(this.dsModel.editDetails);
    if(this.isEditInProgress() && this.dsModel.editDetails.editorId == Number(AuthUtils.getUser().id)){
      this.applicableListActions = [AssetListActionsEnum.REMOVE, AssetListActionsEnum.ADD];
      this.EditState = true;
      return;
    }
    this.applicableListActions = [AssetListActionsEnum.EDIT];
    this.EditState = false;
    // setTimeout(() =>this.dsAssetList.freshFetch(),0);
  }
  get confirmationStickerText() {
    return `${Math.abs(this.assetCountDiff)} ${(this.assetCountDiff < 0)?"":"new"} Assets ${(this.assetCountDiff != 0)?"successfully":""} ${(this.assetCountDiff < 0)?"removed from":"added to"} ${this.dsModel.name}.`;
  }
  updateDsModel = (rData) => {

    this.assetCountDiff = rData.counts.hiveCount - this.dsModel.counts.hiveCount;
    this.dsModel = rData;
    this.dsAssetList && this.dsAssetList.clearSelection();
    this.setEditState();

    !this.EditState && this.tagService.listAtlasTags(+rData["id"]).subscribe(tags => this.systemTags=tags)
    this.EditState && this.assetCountDiff && (this.showConfirmationSticker=true);
    setTimeout(()=>this.showConfirmationSticker=false, 4000);
  }
  isEditInProgress() {
    const utcTstamp = new Date(new Date().getTime() + new Date().getTimezoneOffset() * 60000).getTime();
    return (this.dsModel.editDetails && ((utcTstamp - moment(this.dsModel.editDetails.editBegin).toDate().getTime())/1000 <= 15*60))
  }
  private onAction(action: AssetListActionsEnum) {
    if(action === AssetListActionsEnum.DELETE)
      return this.onDeleteDataset();
    if(action === AssetListActionsEnum.EDIT){
      if(this.isEditInProgress()){
        this.showErrorSticker=true;
        setTimeout(()=> this.showErrorSticker=false, 4000);
        return;
      }
      this.richDatasetService
        .beginEdit(this.dsModel.id)
        .subscribe(this.updateDsModel)
    }
    if(action === AssetListActionsEnum.DONE){
    }
    if (action == AssetListActionsEnum.REMOVE) {
      if(this.dsAssetList.checkedAllState())
        this.actionRemoveAll();
      else
        this.actionRemoveSelected(this.dsAssetList.selExcepList);
    }
    if (action == AssetListActionsEnum.ADD) {
      this.onShowModel();
    }
//    this.router.navigate(['dss/collections', this.dsModel.id, 'edit']);
  }

  actionRemoveAll() {
    console.log("Remove all called!!!")
    this.richDatasetService
      .deleteAllAssets(this.dsModel.id)
      .subscribe(this.updateDsModel)
  }
  actionRemoveSelected (ids:string[]) {
    if(!ids.length) return;
    this.richDatasetService
      .deleteSelectedAssets(this.dsModel.id, ids)
      .subscribe(this.updateDsModel)
  }


  onDeleteDataset() {
    DialogPolyfill.registerDialog(this.dialogConfirm.nativeElement);
    this.dialogConfirm.nativeElement.showModal();
  }

  doConfirmDelete() {
    const delete$ = this.dataSetService.delete(this.dsModel.id).share();
    delete$
      .subscribe(() => {
        this.dialogConfirm.nativeElement.close();

        this.router.navigate([`collections`]);
      });
  }

  doCancelDelete() {
    this.dialogConfirm.nativeElement.close();
  }


  onCancelEdition () {
    this.richDatasetService.cancelEdition(this.dsModel.id)
      .subscribe(rModel => {
        if(!this.dsModel.version)
          this.router.navigate(["collections"]);
        this.updateDsModel(rModel);
      })
  }

  onSaveEdition () {
    this.saveInProgress = true;
    this.richDatasetService.saveEdition(this.dsModel.id)
      .finally(() => this.saveInProgress = false)
      .subscribe(rModel => {
        if(!this.dsModel.version)
          this.router.navigate(["collections"]);
        this.updateDsModel(rModel);
      },
      err => {
        this.showSaveErrorSticker=true;
        setTimeout(()=> this.showSaveErrorSticker=false, 4000);
      })
  }

  onFavIconClick(){
    let userId = Number(AuthUtils.getUser().id)
    if(!this.dsModel.favouriteId){
      let favourite = new Favourite();
      favourite.userId = userId;
      favourite.objectId = this.dsModel.id;
      favourite.objectType = this.objectType;
      this.favouriteService.add(favourite).subscribe(favWithTotal => {
        this.dsModel.favouriteId = favWithTotal.favourite.id;
        this.dsModel.favouriteCount = favWithTotal.totalFavCount;
      })
    }else{
      this.favouriteService.delete(this.dsModel.favouriteId, this.dsModel.id, this.objectType).subscribe(msg => {
        this.dsModel.favouriteId = null;
        this.dsModel.favouriteCount = msg.totalFavCount;
      })
    }
  }

  onBookmarkIconClick(){
    let userId = Number(AuthUtils.getUser().id)
    if(!this.dsModel.bookmarkId){
      let bookmark = new Bookmark();
      bookmark.userId = userId;
      bookmark.objectType = this.objectType;
      bookmark.objectId = this.dsModel.id;
      this.bookmarkService.add(bookmark).subscribe(bm => {
        this.dsModel.bookmarkId = bm.id;
      })
    }else{
      this.bookmarkService.delete(this.dsModel.bookmarkId).subscribe(_ => {
        this.dsModel.bookmarkId = null;
      })
    }
  }

  onLockClick(){
    if(this.isLoggedInUser(this.dsModel.creatorId)){
      if(this.isEditInProgress()){
        this.showErrorSticker=true;
        setTimeout(()=> this.showErrorSticker=false, 4000);
        return;
      }
      let dataset = new DataSet();
      dataset.id = this.dsModel.id;
      dataset.createdBy = this.dsModel.creatorId;
      dataset.createdOn = this.dsModel.createdOn;
      dataset.dpClusterId = this.dsModel.datalakeId; // this datalakeId is actually dpClusterId of dataset
      dataset.datalakeId = this.dsModel.datalakeId;
      dataset.description = this.dsModel.description;
      dataset.lastModified = this.dsModel.lastModified;
      dataset.name = this.dsModel.name;
      dataset.active = this.dsModel.active;
      dataset.version = this.dsModel.version;
      dataset.customProps = this.dsModel.customProps;
      dataset.sharedStatus = (this.dsModel.sharedStatus % 2) + 1;
      this.dataSetService.update(dataset).subscribe( ds => {
        this.dsModel.sharedStatus = ds.sharedStatus;
        this.dsModel.lastModified = ds.lastModified;
      })
    }
  }

  isLoggedInUser(datasetUserId: number){
    return Number(AuthUtils.getUser().id) === datasetUserId;
  }

  viewComments(){
    this.router.navigate([{outlets: {'sidebar': ['comments', 'assetCollection', true]}}],
      { relativeTo: this.activeRoute, skipLocationChange: true, queryParams: { returnURl: this.router.url }});
  }

  getAggregateValue(val){
    if(val){
      return val;
    }
    return 0;
  }

  toggleSummaryWidget () {
    this.showSummary = !this.showSummary;
    setTimeout(() => this.dssAppEvents.setDataSetCollaborationPaneCollapsed(!this.showSummary), 300);
  }

  popupActionCancel() {
    this.onHideModel();
  }

  popupActionDone() {
    this.onHideModel();
  }

  popupActionAdd(asqm: AssetSetQueryModel) {
    this.hidePopupActionButtons = true;
    let futureRdataSet;

    if(asqm.selectionList.length)
      futureRdataSet = this.richDatasetService.addSelectedAssets(this.dsModel.id, this.dsModel.clusterId, asqm.selectionList);
    else
      futureRdataSet = this.richDatasetService.addAssets(this.dsModel.id, this.dsModel.clusterId, [asqm], asqm.exceptionList);

    futureRdataSet.subscribe(rdata=> {
      this.hidePopupActionButtons = false;
      this.updateDsModel(rdata);
      this.dsAssetSearch.dsAssetList.freshFetch();
    })
  }

  ngOnDestroy(){
    this.commentService.ngOnDestroy();
    this.ratingService.ngOnDestroy();
  }
}
