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
import {Component, EventEmitter, Input, isDevMode, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

import {AssetDetails, AssetEntityClassification} from '../../../../../models/asset-property';
import {ProfilerService} from '../../../../../services/profiler.service';
import {AssetInfo, ProfilerAndAssetInfo} from '../../../../../models/profiler-and-asset-info';
import {TagClassification} from '../../../../../models/tag-classification';
import {AssetTagStatus} from '../../../../../shared/utils/constants';
import {TagType} from "../../../../../models/asset-schema";
import {
  EntityClassificationData, EntityDefinition,
  EntityTagSaveBody
} from "../../../../../models/asset-column-tag-save-request";
import {DsAssetsService} from "../../../../../services/dsAssetsService";
import {Alerts} from "../../../../../shared/utils/alerts";

@Component({
  selector: 'dss-asset-view-aside-summary',
  templateUrl: './asset-view-aside-summary.component.html',
  styleUrls: ['./asset-view-aside-summary.component.scss']
})
export class AssetViewAsideSummaryComponent implements OnChanges, OnInit {
  showProperties = true;
  showTags = true;
  showTableTags = true;
  showProfilers = true;
  suggestedTags: string[] = [];
  acceptedTags: string[] = [];
  otherColumnTags: string[] = [];
  tableTags: TagType[] = [];
  systemTags: string[] = [];
  colCount: number | '-' = '-';
  editTableTags = false;
  showAddTagsDialog = false;
  tagObjs: TagType[] = null;
  assetTagStatus = AssetTagStatus;
  saveTagInProgress:boolean = false;

  @Input() clusterId: string;
  @Input() assetDetails = new AssetDetails();
  @Input() tagClassification: TagClassification[] = [];
  @Input() profierAndAssetInfos: ProfilerAndAssetInfo[] = [];

  @Output() assetChanged = new EventEmitter<void>();

  constructor(private activateRoute: ActivatedRoute,
              private assetService: DsAssetsService,
              private profilerService: ProfilerService) { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes && changes['assetDetails'] && changes['assetDetails'].currentValue) {
      if (this.assetDetails.referredEntities) {
        this.colCount = this.assetDetails.entity.attributes.columns.length;
        this.extractTags();
        this.extractTableTags();
      }
    }
  }

  private extractTableTags() {
    this.tableTags = [];
    this.assetDetails.entity.classifications.forEach(clfn =>
      this.tableTags.push(new TagType(clfn.typeName, AssetTagStatus.MANAGED, false, clfn.attributes))
    );
  }

  private extractTags() {
    this.acceptedTags = [];
    this.suggestedTags = [];
    this.otherColumnTags = [];

    Object.keys(this.assetDetails.referredEntities).forEach(id => {
      const configuredTags: AssetEntityClassification[] = this.assetDetails.referredEntities[id].classifications;
      if (configuredTags && configuredTags.length > 0) {
        configuredTags.forEach(tag => {
          if (tag && tag.typeName.startsWith('dp_') && tag.attributes) {
            if (tag.attributes.status === AssetTagStatus.ACCEPTED && this.acceptedTags.indexOf(tag.typeName) === -1)  {
              this.acceptedTags.push(tag.typeName);
            }
            if (tag.attributes.status === AssetTagStatus.SUGGESTED && this.suggestedTags.indexOf(tag.typeName) === -1) {
              this.suggestedTags.push(tag.typeName);
            }
          }
          else if (tag && tag.typeName && this.otherColumnTags.indexOf(tag.typeName) === -1) {
            this.otherColumnTags.push(tag.typeName)
          }
        });
      }
    });

    this.acceptedTags.sort();
    this.suggestedTags.sort();

    this.suggestedTags.forEach((name, index) => {
      if (this.acceptedTags.indexOf(name) !== -1) {
        this.acceptedTags.splice(index, 1);
      }
    });
  }

  togglePane(val: boolean) {
    val = !val;
  }

  startTableTagEdit() {
    this.tagObjs = [];
    this.tableTags.forEach(tag => {
      this.tagObjs.push(new TagType(tag.name, AssetTagStatus.MANAGED, false, tag.attributes));
    });
    this.editTableTags = true;
    this.showTableTags = true;
  }
  cancelTableTagEdit() {
    this.tagObjs = null;
    this.editTableTags = false;
  }
  saveTableTagEdit() {

    const clfnData = new EntityClassificationData();
    let datapushed = false;
    const newTableTags: TagType[] = [];
    this.tagObjs.forEach(tag => {
      if (tag.isNewTag && tag.status === AssetTagStatus.NOT_CONFIGURED) return;
      if (tag.isNewTag) {
        clfnData.postData.push(new AssetEntityClassification(tag.name, tag.attributes));
        newTableTags.push(tag);
      }
      else if (tag.status === AssetTagStatus.NOT_CONFIGURED)
        clfnData.deleteData.push(tag.name);
      else {
        clfnData.putData.push(new AssetEntityClassification(tag.name, tag.attributes));
        newTableTags.push(tag);
      }
      datapushed = true;
    });

    if(!datapushed) {
      this.tagObjs = null;
      this.editTableTags = false;
      return
    }
    if(!clfnData.postData.length) clfnData.postData = null;
    if(!clfnData.deleteData.length) clfnData.deleteData = null;
    if(!clfnData.putData.length) clfnData.putData = null;

    const body = new EntityTagSaveBody();
    body.tableName = this.assetDetails.entity.attributes.name;
    body.databaseName = this.assetDetails.entity.attributes.qualifiedName.split('.')[0];
    body.entities.push(new EntityDefinition(body.tableName, this.assetDetails.entity.guid, clfnData))

    this.saveTagInProgress = true;
    this.assetService.saveEntityClassifications(this.clusterId, body)
      .finally(() => this.saveTagInProgress = false)
      .subscribe((resp) => {
        let allSuccess = true;
        for (var i=0; i<resp.length; i++) {
          if(!resp[i].success) allSuccess = false;
        }
        if (allSuccess)
          Alerts.showConfirmation('Tag classification saved successfully');
        else
          Alerts.showError('All tags were not saved successfully');
        allSuccess && (this.tableTags = newTableTags)
        this.tagObjs = null;
        this.editTableTags = false;
        this.assetChanged.emit();
      });
  }
  onRemoveTableTag(tag:TagType) {
    tag.status = AssetTagStatus.NOT_CONFIGURED;
  }
  onTagSelectionChanged(allTags) {
    // console.log(allTags);
  }
  onAddTagsButtonClick() {
    this.tagClassification.forEach(def => {
      let tag = this.tagObjs.find(tag => tag.name === def.name);
      if (!tag) {
        tag = new TagType(def.name, AssetTagStatus.NOT_CONFIGURED, true);
        !tag.isDpTag && this.tagObjs.push(tag);
      }
      tag.attributeDefs = def.attributeDefs;
    });

    this.showAddTagsDialog=true;
  }
  onTagConfigClose() {
    this.showAddTagsDialog=false;
  }

}
