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
import {Component, isDevMode, OnInit} from '@angular/core';
import {RichDatasetService} from '../../../../services/RichDatasetService';
import {ActivatedRoute, Router} from '@angular/router';
import {
  Bookmark, Favourite,
  RichDatasetModel
} from "app/models/richDatasetModel";
import {DsTagsService} from '../../../../services/dsTagsService';
import {AuthUtils} from '../../../../shared/utils/auth-utils';
import {FavouriteService} from '../../../../services/favourite.service';
import {BookmarkService} from '../../../../services/bookmark.service';
import {CommentService} from '../../../../services/comment.service';
import {RatingService} from "app/services/rating.service";
import {DataSet} from '../../../../models/data-set';
import {DataSetService} from '../../../../services/dataset.service';
import {DssAppEvents} from '../../../../services/dss-app-events';

declare var d3: any;
declare var nv: any;

export enum Tabs {
  OVERVIEW, ASSETS
}

@Component({
  selector: 'dss-asset-collection',
  templateUrl: './asset-collection-edit.component.html',
  styleUrls: ['./asset-collection-edit.component.scss']
})

export class AssetCollectionEditComponent implements OnInit {

  tabEnum = Tabs;
  selectedTab = Tabs.OVERVIEW;
  dsModel = new RichDatasetModel();
  showSummary : boolean = true;
  systemTags: string[] = [];
  objectType: string = "assetCollection";

  constructor(private router: Router,
              private dataSetService: DataSetService,
              private richDatasetService: RichDatasetService,
              private tagService: DsTagsService,
              private commentService: CommentService,
              private bookmarkService: BookmarkService,
              private favouriteService: FavouriteService,
              private ratingService: RatingService,
              private activeRoute: ActivatedRoute,
              private dssAppEvents: DssAppEvents) { }

  ngOnInit() {
    this.activeRoute.params.subscribe(params => {
      const assetCollectionId = params["id"];

      this.richDatasetService.getById(assetCollectionId).subscribe(dsObj => this.dsModel = dsObj);
      this.tagService.listAtlasTags(assetCollectionId).subscribe(tags => this.systemTags=tags)

      this.commentService.ngOnInit();
      this.commentService.dataChanged$.subscribe(callRequired => {
        if (callRequired) {
          this.commentService.getCommentsCount(assetCollectionId, this.objectType).subscribe(commentsCount => {
            this.dsModel.totalComments = commentsCount.totalComments;
          });
        }
      });

      this.ratingService.ngOnInit();
      this.ratingService.dataChanged$.subscribe(avgRating => {
        this.dsModel.avgRating = avgRating;
      });

    });
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

  isLoggedInUser(datasetUserId: number){
    return Number(AuthUtils.getUser().id) === datasetUserId;
  }

  onLockClick(){
    if(this.isLoggedInUser(this.dsModel.creatorId)){
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

  onFavIconClick(){
    let userId = Number(AuthUtils.getUser().id);

    if (!this.dsModel.favouriteId) {
      let favourite = new Favourite();
      favourite.userId = userId;
      favourite.objectId = this.dsModel.id;
      favourite.objectType = this.objectType;
      this.favouriteService.add(favourite).subscribe(favWithTotal => {
        this.dsModel.favouriteId = favWithTotal.favourite.id;
        this.dsModel.favouriteCount = favWithTotal.totalFavCount;
      });
    } else {
      this.favouriteService.delete(this.dsModel.favouriteId, this.dsModel.id, this.objectType).subscribe(msg => {
        this.dsModel.favouriteId = null;
        this.dsModel.favouriteCount = msg.totalFavCount;
      });
    }
  }

  viewComments(){
    this.router.navigate([{outlets: {'sidebar': ['comments','assetCollection',true]}}], { relativeTo: this.activeRoute, queryParams: { returnURl: this.router.url }});
  }

  onBookmarkIconClick(){
    let userId = Number(AuthUtils.getUser().id);

    if (!this.dsModel.bookmarkId) {
      let bookmark = new Bookmark();
      bookmark.userId = userId;
      bookmark.objectType = this.objectType;
      bookmark.objectId = this.dsModel.id;
      this.bookmarkService.add(bookmark).subscribe(bm => {
        this.dsModel.bookmarkId = bm.id;
      });
    } else {
      this.bookmarkService.delete(this.dsModel.bookmarkId).subscribe(() => {
        this.dsModel.bookmarkId = null;
      });
    }
  }

  ngOnDestroy(){
    this.commentService.ngOnDestroy();
    this.ratingService.ngOnDestroy();
  }
}
