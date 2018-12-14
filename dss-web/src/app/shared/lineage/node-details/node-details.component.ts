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

import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {AssetDetails, AssetProperty} from '../../../models/asset-property';
import {AssetService} from '../../../services/asset.service';
import {StringUtils} from '../../utils/stringUtils';
import {DateUtils} from '../../utils/date-utils';

@Component({
  selector: 'dp-node-details',
  templateUrl: './node-details.component.html',
  styleUrls: ['./node-details.component.scss']
})

export class NodeDetailsComponent implements OnChanges {

  @Input() clusterId: string;
  @Input() guidOfNode: string;
  @Input() showNodeDetails = false;

  @Output() close = new EventEmitter();

  // guid: string;
  // clusterId: string;
  assetProperties: AssetProperty[] = [];
  assetDetails: AssetDetails;
  name: string;
  iconSrc: string;
  fetchInProgress = true;
  returnURl = '';

  readonly entityState = {
    'ACTIVE': false,
    'DELETED': true,
    'STATUS_ACTIVE': false,
    'STATUS_DELETED': true
  };

  constructor(private assetService: AssetService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes && changes['showNodeDetails'] && changes['showNodeDetails'].currentValue) {
      if (this.showNodeDetails) {
        this.getData();
      }
    }
  }

  private getData() {
    this.fetchInProgress = true;
    this.assetService.getDetails(this.clusterId, this.guidOfNode).subscribe(details => {
      this.assetDetails = details;
      this.assetProperties = this.extractAssetProperties(details.entity);
      this.name = details.entity['attributes'].name;
      this.iconSrc = this.getIcon();
      this.fetchInProgress = false;
    }, (error => {
      this.fetchInProgress = false;
    }));
  }

  private extractAssetProperties(properties) {
    const assetProps: AssetProperty[] = [];
    const attributes = properties.attributes;
    Object.keys(attributes).forEach(key => {
      if (key === 'columns' || key === 'sd' || key === 'parameters') {
        return;
      }
      let value = attributes[key];
      if (attributes[key] && typeof attributes[key] === 'object' || Array.isArray(attributes[key])) {
        value = StringUtils.getFlattenedObjects(value);
      }
      if (key === 'lastAccessTime' || key === 'createTime' || key === 'endTime' || key === 'startTime') {
        value = DateUtils.formatDate(attributes[key], 'DD MMM YYYY hh:mm:ss A');
      } else if (key === 'db') {
        value = attributes.qualifiedName.slice(0, attributes.qualifiedName.indexOf('.'));
      }
      const property = new AssetProperty(key, value);
      assetProps.push(property);
    });
    return assetProps;
  }

  backToLineage() {
    this.close.emit();
  }


  getIcon() {
    const status = this.assetDetails.entity.status;
    if (this.assetDetails.entity.typeName.toLowerCase().indexOf('process') >= 0) {
      if (this.entityState[status]) {
        return 'assets/images/icon-gear-delete.png';
      } else if (this.assetDetails.entity.id === this.guidOfNode) {
        return 'assets/images/icon-gear-active.png';
      } else {
        return 'assets/images/icon-gear.png';
      }
    } else {
      if (this.entityState[status]) {
        return 'assets/images/icon-table-delete.png';
      } else if (this.assetDetails.entity.id === this.guidOfNode) {
        return 'assets/images/icon-table-active.png';
      } else {
        return 'assets/images/icon-table.png';
      }
    }
  }
}
