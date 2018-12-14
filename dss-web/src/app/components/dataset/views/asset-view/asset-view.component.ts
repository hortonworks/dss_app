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

import {AfterViewInit, Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

import {AssetService} from '../../../../services/asset.service';
import {TabStyleType} from '../../../../shared/tabs/tabs.component';
import {AssetDetails, AssetProperty} from '../../../../models/asset-property';
import {DssAppEvents} from '../../../../services/dss-app-events';
import {DsAssetsService} from '../../../../services/dsAssetsService';
import {TagClassification} from '../../../../models/tag-classification';
import {AssetInfo, ProfilerAndAssetInfo} from '../../../../models/profiler-and-asset-info';
import {ProfilerService} from '../../../../services/profiler.service';
import {SENSITIVITY_PROFILER_INSTANCE_NAME} from '../../../../shared/utils/constants';


export enum TopLevelTabs {
  OVERVIEW, SCHEMA, POLICY, AUDIT
}

enum ProfilerStatus {
  UNKNOWN, NOSUPPORT, NOTSTARTED, RUNNING, SUCCESS, FAILED
}

@Component({
  selector: 'dp-asset-view',
  templateUrl: './asset-view.component.html',
  styleUrls: ['./asset-view.component.scss']
})

export class AssetViewComponent implements OnInit,  AfterViewInit {
  tabType = TabStyleType;
  topLevelTabs = TopLevelTabs;
  selectedTopLevelTabs = TopLevelTabs.OVERVIEW;
  showSummary = true;

  assetDetails = new AssetDetails();

  clusterId: string;
  guid: string;
  tableName: string;
  databaseName: string;
  summary: AssetProperty[] = [];
  nextRunDisplay = '';
  tagClassification: TagClassification[] = [];
  profierAndAssetInfos: ProfilerAndAssetInfo[] = [];
  isSensitivityProfilerRan = false;

  constructor(private route: ActivatedRoute,
              private assetService: AssetService,
              private dsAssetService: DsAssetsService,
              private profilerService: ProfilerService,
              private dssAppEvents: DssAppEvents) {
  }

  ngAfterViewInit() {
    this.dssAppEvents.assetCollaborationPaneCollapsed$.subscribe(val => {
      this.showSummary = val;
    });
  }

  ngOnInit() {
    this.clusterId = this.route.snapshot.params['clusterId'];
    this.guid = this.route.snapshot.params['guid'];
    this.getData();
  }

  private getData() {
    this.getAssetDetails();
    this.getAllTags();
  }

  private getAllTags() {
    this.dsAssetService.getAllTagsOfAsset(this.clusterId).subscribe(tagClassification => {
      this.tagClassification = tagClassification;
    });
  }

  private getAssetDetails() {
    this.assetService.getDetails(this.clusterId, this.guid).subscribe(details => {
      if (details.entity['typeName'] && details.entity['typeName'] !== 'hive_table') {
        return;
      }

      this.assetDetails = details;
      this.summary = this.extractSummary(details.entity);
      this.setAssetRowCount(details);
      this.getProfilersRunOnAsset();
    });
  }

  private setAssetRowCount(details) {
    this.assetDetails.entity.rowCount = '-';
    if (details.entity.attributes.profileData) {
      this.assetDetails.entity.rowCount = details.entity.attributes.profileData.attributes.rowCount;
    } else if (details.entity.attributes.parameters.numRows) {
      this.assetDetails.entity.rowCount = details.entity.attributes.parameters.numRows;
    }
  }

  private getProfilersRunOnAsset() {
    const clusterId = parseInt(this.clusterId, 10);
    let assetFullyQualifiedName = this.assetDetails.entity.attributes.qualifiedName;
    const clusterNameIndex = this.assetDetails.entity.attributes.qualifiedName.indexOf('@');
    if (clusterNameIndex > -1) {
      assetFullyQualifiedName = assetFullyQualifiedName.substr(0, clusterNameIndex);
    }

    this.isSensitivityProfilerRan = false;
    this.profilerService.getProfilersRanOnAsset(clusterId, assetFullyQualifiedName).subscribe((resp: ProfilerAndAssetInfo[]) => {
      this.profierAndAssetInfos = resp;
      this.profierAndAssetInfos.forEach(profilerAndAssetInfo => {
        if (!profilerAndAssetInfo.assetInfo) {
          profilerAndAssetInfo.assetInfo = new AssetInfo();
        }

        if (!this.isSensitivityProfilerRan && profilerAndAssetInfo.assetInfo.profilerInstanceName === SENSITIVITY_PROFILER_INSTANCE_NAME) {
          this.isSensitivityProfilerRan = true;
        }
      });
    });
  }

  private extractSummary(entity) {
    const summary: AssetProperty[] = [];
    const qualifiedName = entity.attributes.qualifiedName;
    this.tableName = qualifiedName.slice(qualifiedName.indexOf('.') + 1, qualifiedName.indexOf('@'));
    this.databaseName = qualifiedName.slice(0, qualifiedName.indexOf('.'));
    summary.push(new AssetProperty('Datalake', qualifiedName.slice(qualifiedName.indexOf('@') + 1, qualifiedName.length)));
    summary.push(new AssetProperty('Database', this.databaseName));
    let rowCount = 'NA';
    if (entity.attributes.profileData && entity.attributes.profileData.attributes) {
      rowCount = entity.attributes.profileData.attributes.rowCount;
    }
    summary.push(new AssetProperty('# of Rows', rowCount));

    return summary;
  }

  toggleSummary() {
    this.showSummary = !this.showSummary;
    setTimeout(() => this.dssAppEvents.setAssetCollaborationPaneCollapsed(this.showSummary), 300);
  }

  onAssetChanged() {
    this.getData();
  }
}

