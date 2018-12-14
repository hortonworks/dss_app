///<reference path="../../../../../models/asset-property.ts"/>
///<reference path="../../../../../models/asset-schema.ts"/>
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
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import {AssetSchema, TagDef, TagType} from '../../../../../models/asset-schema';
import {DssAppEvents} from '../../../../../services/dss-app-events';
import {
  AssetDetails,
  AssetEntityClassification,
  AssetEntityClassificationAttributes
} from '../../../../../models/asset-property';
import {DsAssetsService} from '../../../../../services/dsAssetsService';
import {AssetTagStatus} from '../../../../../shared/utils/constants';
import {
  AssetColumnTagSaveRequest,
  EntityClassificationData,
  EntityDefinition, EntityTagSaveBody
} from '../../../../../models/asset-column-tag-save-request';
import {Alerts} from '../../../../../shared/utils/alerts';
import {TagClassification} from '../../../../../models/tag-classification';
import {Observable} from "rxjs";

@Component({
  selector: 'dp-asset-details-view',
  templateUrl: './asset-details-view.component.html',
  styleUrls: ['./asset-details-view.component.scss']
})
export class AssetDetailsViewComponent implements OnChanges, OnInit {

  assetSchemas: AssetSchema[] = [];
  @Input() tagClassification: TagClassification[] = [];
  @Input() assetDetails: AssetDetails;
  @Input() clusterId: string;
  @Input() guid: string;

  @Output() assetChanged = new EventEmitter<void>();

  rowCount = 'NA';
  colGuid = '';
  editTags = false;
  assetTagStatus = AssetTagStatus;
  saveTagInProgress = false;
  tagsAvailable: TagDef[] = [];
  assetSchemasClone = '';

  constructor(private assetService: DsAssetsService,
              private dssAppEvents: DssAppEvents) { }


  ngOnInit() {
    Promise.resolve(null).then(() => {
      this.dssAppEvents.setAssetCollaborationPaneCollapsed(false);
      this.dssAppEvents.setSideNavCollapsed(false);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['assetDetails'] || !this.assetDetails) {
      return;
    }

    if (changes && changes['assetDetails'] && changes['assetDetails'].currentValue) {
      if (this.assetDetails.entity.attributes.profileData && this.assetDetails.entity.attributes.profileData['attributes']) {
        this.rowCount = this.assetDetails.entity.attributes.profileData.attributes.rowCount;
      }

      if (this.assetDetails.referredEntities) {
        this.assetSchemas = this.extractSchema(this.assetDetails.referredEntities);
      }
    }

    if (changes && changes['tagClassification'] && changes['tagClassification'].currentValue) {
      this.tagsAvailable = [];
      this.tagsAvailable = this.tagClassification.reduce((reducer, tagClassification) => {
          this.tagsAvailable.push(new TagDef(tagClassification.name, tagClassification.attributeDefs));
        return reducer;
      }, this.tagsAvailable);
    }
  }

  setColGuid(guid) {
    if (this.isChartDataAvailableForCol(guid)) {
      this.colGuid === guid ? this.colGuid = '' : this.colGuid = guid;
    }
  }

  private extractSchema(referredEntities) {
    const assetSchemas: AssetSchema[] = [];
    Object.keys(referredEntities).forEach(key => {
      if (referredEntities[key].typeName !== 'hive_column' || referredEntities[key].status === 'DELETED') {
        return;
      }
      const attributes = referredEntities[key].attributes;
      const schema: AssetSchema = new AssetSchema();
      schema.name = attributes.name;
      schema.type = attributes.type;
      schema.guid = key;
      schema.comment = attributes.comment;
      schema.showAddTagsDialog = false;
      schema.allAssetsAdded = false;

      const configuredTagsStr = [];
      const configuredTags: AssetEntityClassification[] = referredEntities[key].classifications;
      if (configuredTags && configuredTags.length > 0) {
        schema.tags = [];
        configuredTags.forEach(tag => {
          if (tag && tag.typeName) {
            configuredTagsStr.push(tag.typeName);
            schema.tags.push(new TagType(tag.typeName, (tag.typeName.startsWith('dp_'))?tag.attributes.status:AssetTagStatus.MANAGED, false, tag.attributes));
          }
        });
      }

      const profileData = attributes.profileData ? attributes.profileData.attributes : null;
      if (profileData) {
        this.populateProfileData(schema, profileData);
      }
      assetSchemas.push(schema);
    });
    return assetSchemas;
  }

  private populateProfileData(schema: AssetSchema, profileData: any) {
    const type = schema.type.toLowerCase();
    if (type.indexOf('int') >= 0 || type.indexOf('decimal') >= 0 || type.indexOf('long') >= 0 ||
        type.indexOf('float') >= 0 || type.indexOf('double') >= 0) {
      schema.min = profileData.minValue;
      schema.max = profileData.maxValue;
      schema.mean = profileData.meanValue;
    }
    schema.noOfUniques = profileData.cardinality;
    schema.noOfNulls = this.rowCount !== 'NA' ? (parseInt(this.rowCount, 10) - profileData.nonNullCount).toString() : 'NA';
  }

  get colVisualData() {
    let ret = {};
    if (!this.colGuid || !this.assetDetails.referredEntities[this.colGuid].attributes.profileData) {
      return ret;
    }
    ret = this.assetDetails.referredEntities[this.colGuid].attributes.profileData.attributes;
    ret['name'] = this.assetDetails.referredEntities[this.colGuid].attributes.name;
    ret['type'] = this.assetDetails.referredEntities[this.colGuid].attributes.type;
    try {
      const profilerInfo = this.assetDetails.entity.attributes.profileData.attributes;
      if (!profilerInfo.sampleTime || !profilerInfo.samplePercent) {
        throw new Error('sampleTime or samplePercent not available');
      }
      let td = Math.floor((Date.now() - parseInt(profilerInfo.sampleTime, 10)) / 60000); // in minutes
      let displayText = '';
      if (td / 60 < 1) {
        displayText = td + ((td === 1) ? ' minute ' : ' minutes ') + 'ago';
      } else {
        displayText = (td = Math.floor(td / 60)) + ((td === 1) ? ' hour ' : ' hours ') + 'ago';
      }
      ret['profilerInfo'] = `Profiled : ${profilerInfo.samplePercent}% rows, ${displayText}`;

    } catch (err) {/*console.log(err)*/
    }

    return ret;
  }

  isChartDataAvailableForCol(colGuid: string): boolean {
    const ent = this.assetDetails.referredEntities[colGuid];
    if (!ent || !ent.attributes.profileData) {
      return false;
    }
    const data = ent.attributes.profileData.attributes;
    if (!data || !data.histogram && !data.quartiles) {
      return false;
    }

    return true;
  }

  getIconClass(colGuid) {
    if (this.isChartDataAvailableForCol(colGuid)) {
      const ent = this.assetDetails.referredEntities[colGuid];
      const data = ent.attributes.profileData.attributes;
      if (data.cardinality < 11) {
        return 'fa fa-pie-chart pointer';
      }
      return 'fa fa-bar-chart pointer';
    }

    return null;
  }

  toggleEdit() {
    this.editTags = !this.editTags;
    if (!this.editTags) {
      this.saveTags();
    } else {
      this.assetSchemasClone = JSON.stringify(this.assetSchemas);
    }
  }

  cancelEditTags() {
    this.assetSchemas = JSON.parse(this.assetSchemasClone);
    this.editTags = false;
  }

  private saveTags() {
    const dp_saveRequest = new AssetColumnTagSaveRequest();
    dp_saveRequest.tableName = this.assetDetails.entity.attributes.name;
    dp_saveRequest.databaseName = this.assetDetails.entity.attributes.qualifiedName.split('.')[0];

    const saveRequest = new EntityTagSaveBody();
    saveRequest.tableName = this.assetDetails.entity.attributes.name;
    saveRequest.databaseName = this.assetDetails.entity.attributes.qualifiedName.split('.')[0];

    this.assetSchemas.forEach(schema => {
      if (schema.tags.length > 0) {
        const dp_postData: AssetEntityClassification[] = [];
        const dp_putData: AssetEntityClassification[] = [];
        const postData: AssetEntityClassification[] = [];
        const putData: AssetEntityClassification[] = [];
        const deleteData: string[] = [];

        for (let i = 0; i < schema.tags.length; i++) {
          const tag = schema.tags[i];
          if (tag.isNewTag) {
            if (tag.status === AssetTagStatus.NOT_CONFIGURED || tag.status === AssetTagStatus.REJECTED) {
              continue;
            }
            if(tag.isDpTag) {// new dp tags must be of accepted status, profiler matrics query does not support managed status
              tag.status = tag.attributes.status = AssetTagStatus.ACCEPTED;
              dp_postData.push(new AssetEntityClassification(tag.name, tag.attributes));
            }
            else
              postData.push(new AssetEntityClassification(tag.name, tag.attributes));
          } else if (tag.status === AssetTagStatus.NOT_CONFIGURED) {
              deleteData.push(tag.name);
          } else {
            if(tag.status === AssetTagStatus.SUGGESTED) tag.status = tag.attributes.status = AssetTagStatus.ACCEPTED;
            if(tag.isDpTag)
              dp_putData.push(new AssetEntityClassification(tag.name, tag.attributes));
            else
              putData.push(new AssetEntityClassification(tag.name, tag.attributes));
          }
        }

        if (postData.length > 0 || putData.length > 0 || deleteData.length > 0) {
          const classifications = new EntityClassificationData();
          classifications.putData = putData.length > 0 ? putData : null;
          classifications.postData = postData.length > 0 ? postData : null;
          classifications.deleteData = deleteData.length > 0 ? deleteData : null;
          saveRequest.entities.push(new EntityDefinition(schema.name, schema.guid, classifications));
        }

        if (dp_postData.length > 0 || dp_putData.length > 0) {
          const classifications = new EntityClassificationData();
          classifications.putData = dp_putData.length > 0 ? dp_putData : null;
          classifications.postData = dp_postData.length > 0 ? dp_postData : null;
          if(classifications.deleteData) delete classifications.deleteData;
          dp_saveRequest.columns.push(new EntityDefinition(schema.name, schema.guid, classifications));
        }
      }
    });

    if (dp_saveRequest.columns.length || saveRequest.entities.length) {
      if (dp_saveRequest.columns.length > 40) {
        Alerts.showError('Data Steward Studio supports association of only 40 sensitive tags per hive table');
        return;
      }

      this.saveTagInProgress = true;
      Observable.forkJoin([
        this.assetService.saveAssetColumnClassifications(this.clusterId, dp_saveRequest).catch(e => Observable.of('error')),
        this.assetService.saveEntityClassifications(this.clusterId, saveRequest).catch(e => Observable.of('error'))
      ])
      .finally(() => this.saveTagInProgress = false)
      .subscribe((resp) => {
        let errInSave = false;
        for(var i=0; i<resp.length;i++){
          if(resp[i] == 'error') errInSave = true;
        }
        if(errInSave)
          Alerts.showError('All tags were not saved successfully;');
        else
          Alerts.showConfirmation('Tag classification saved successfully');
        this.assetChanged.emit();
      });
    }

  }

  onRemoveTag(schema: AssetSchema, tag: TagType) {
    tag.status = (tag.isDpTag)?AssetTagStatus.REJECTED:AssetTagStatus.NOT_CONFIGURED;
    if (tag.isDpTag) tag.attributes.status = AssetTagStatus.REJECTED;
    schema.tags = schema.tags.slice();
  }

  onAddTagsButtonClick(schema: AssetSchema) {
    if (!schema.allAssetsAdded) {
      this.tagsAvailable.forEach(def => {
        let tag = schema.tags.find(tag => tag.name === def.name);
        if (!tag) {
          tag = new TagType(def.name, AssetTagStatus.NOT_CONFIGURED, true);
          schema.tags.push(tag);
        }
        tag.attributeDefs = def.attributeDefs;
      });
      schema.allAssetsAdded = true;
    }
    schema.showAddTagsDialog = true;
  }

  onTagsChanged($event, schema: AssetSchema) {
    schema.tags = $event.slice();
  }

  onTagConfigClose(schema: AssetSchema) {
    schema.showAddTagsDialog = false;
  }

}
