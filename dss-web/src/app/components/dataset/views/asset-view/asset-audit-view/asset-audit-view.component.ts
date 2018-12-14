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

import {Component, Input, OnInit} from '@angular/core';
import {RangerService} from '../../../../../services/ranger.service';
import {AssetService} from '../../../../../services/asset.service';

export enum AuditWidgetState {
  NOINFO, LOADING, LOADED
}

@Component({
  selector: 'asset-audit-view',
  templateUrl: './asset-audit-view.component.html',
  styleUrls: ['./asset-audit-view.component.scss']
})
export class AssetAuditView implements OnInit {
  @Input() assetDetails;
  @Input() clusterId: string;
  audits:any[] = [];
  AWS = AuditWidgetState;
  state = this.AWS.NOINFO;
  accessType:string = "ALL";
  result:string = "ALL";
  pageSize:number = 20;
  pageStartsFrom:number = 1;
  count = 3;
  resultOptions:string[] = ["ALL", "ALLOWED", "DENIED"];
  accessTypeOptions:string[] = ["ALL", "SELECT", "UPDATE", "CREATE", "DROP", "ALTER", "INDEX", "READ", "WRITE"];
  showMockVisualization = true;
  dbName:string="";
  assetName:string="";

  constructor(private rangerService: RangerService, private assetService: AssetService) {
  }

  ngOnInit() {
  	console.log(this.assetDetails, this.clusterId);
  	if(!this.assetDetails) return;
  	this.onRefresh();
    // this.assetService.checkMockAuditVisualStatus().subscribe(status => {
    //   console.log(status);
    //   this.showMockVisualization = status.showMockVisualization;
    // });

  }
  onRefresh(){
  	this.audits = [];
  	this.state = this.AWS.LOADING;
  	let qualifiedName = this.assetDetails.entity.attributes.qualifiedName;
  	this.dbName = qualifiedName.slice(0, qualifiedName.indexOf('.'));
  	this.assetName = this.assetDetails.entity.attributes.name;
  	this.rangerService.getAuditDetails(this.clusterId, this.dbName, this.assetName, this.pageStartsFrom-1, this.pageSize, this.accessType, this.result)
  	  .subscribe(details=>{
  	  	this.count = this.rangerService.getTotalCount();
  	  	this.state = this.AWS.LOADED;
  	  	this.audits = details;
  	  },
  	  err => (err.status === 404) && (this.state = this.AWS.NOINFO)
  	  );
  }
  setFirstPage() {
    this.pageStartsFrom = 1;
  }
  onPageSizeChange(size: number) {
    this.setFirstPage();
    this.pageSize = size;
    this.onRefresh();
  }
  onPageChange(index: number) {
    if(this.pageStartsFrom < index && this.audits.length < this.pageSize) {
      this.pageStartsFrom = index;
      setTimeout(()=>this.pageStartsFrom = index-this.pageSize, 0);
      return;
    }
    this.pageStartsFrom = index;
    this.onRefresh();
  }

}
