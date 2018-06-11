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
import {Component, Input, isDevMode, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

import {AssetDetails, AssetEntityClassification} from '../../../../../models/asset-property';
import {ProfilerService} from '../../../../../services/profiler.service';
import {AssetInfo, ProfilerAndAssetInfo} from '../../../../../models/profiler-and-asset-info';
import {TagClassification} from '../../../../../models/tag-classification';
import {AssetTagStatus} from '../../../../../shared/utils/constants';

@Component({
  selector: 'dss-asset-view-aside-summary',
  templateUrl: './asset-view-aside-summary.component.html',
  styleUrls: ['./asset-view-aside-summary.component.scss']
})
export class AssetViewAsideSummaryComponent implements OnChanges, OnInit {
  profierAndAssetInfos: ProfilerAndAssetInfo[] = [];
  showProperties = true;
  showTags = true;
  showProfilers = true;
  assetPrefix = isDevMode() ? ' ' : 'dss';
  suggestedTags: string[] = [];
  acceptedTags: string[] = [];
  systemTags: string[] = [];
  colCount: number | '-' = '-';

  @Input() assetDetails = new AssetDetails();
  @Input() tagClassification: TagClassification[] = [];

  constructor(private activateRoute: ActivatedRoute,
              private profilerService: ProfilerService) { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes && changes['assetDetails'] && changes['assetDetails'].currentValue) {
      if (this.assetDetails.referredEntities) {
        this.colCount = this.assetDetails.entity.attributes.columns.length;
        this.extractTags();
      }
      if (this.assetDetails.entity.attributes.qualifiedName && this.assetDetails.entity.attributes.qualifiedName.length > 0) {
        this.getProfilersRunOnAsset();
      }
    }
  }

  private getProfilersRunOnAsset() {
    const clusterId = parseInt(this.activateRoute.snapshot.params.clusterId, 10);
    let assetFullyQualifiedName = this.assetDetails.entity.attributes.qualifiedName;
    const clusterNameIndex = this.assetDetails.entity.attributes.qualifiedName.indexOf('@');
    if (clusterNameIndex > -1) {
      assetFullyQualifiedName = assetFullyQualifiedName.substr(0, clusterNameIndex);
    }

    this.profilerService.getProfilersRanOnAsset(clusterId, assetFullyQualifiedName).subscribe((resp: ProfilerAndAssetInfo[]) => {
      this.profierAndAssetInfos = resp;
      this.profierAndAssetInfos.forEach(profilerAndAssetInfo => {
        if (!profilerAndAssetInfo.assetInfo) {
          profilerAndAssetInfo.assetInfo = new AssetInfo();
        }
      });
    });
  }

  private extractTags() {
    this.acceptedTags = [];
    this.suggestedTags = [];

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

}
