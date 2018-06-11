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

import {Component, Input, Output, OnInit, SimpleChange, EventEmitter} from "@angular/core";
import {Lake} from "../../../../../models/lake";
import {LakeService} from "../../../../../services/lake.service";
import {RichDatasetModel} from "../../../models/richDatasetModel";
import {DsTagsService} from "../../../services/dsTagsService";

@Component({
  providers: [RichDatasetModel],
  selector: "ds-info-holder",
  styleUrls: ["./ds-info-holder.component.scss"],
  templateUrl: "./ds-info-holder.component.html"
})
export class DsInfoHolder implements OnInit {

  @Input() dsModel = new RichDatasetModel();
  @Input() tags: string[] = [];
  availableTags = [];
  lakes: Lake[];

  @Output('onNext') nextEE: EventEmitter<void> = new EventEmitter<void>();
  @Output('onCancel') cancelEE: EventEmitter<void> = new EventEmitter<void>();

  constructor(private lakeService: LakeService,
              private tagService: DsTagsService) {
  }

  ngOnInit() {
    !this.dsModel.datalakeId && (this.dsModel.datalakeId=0);
    this.lakeService.listWithClusters('lake').subscribe(objs => {
      this.lakes =[];
      objs.forEach(obj => {
        obj.clusters.length && (obj.data.clusterId = obj.clusters[0].id);
        this.lakes.push(obj.data as Lake);
      })
    });
    this.dsModel.sharedStatus = 1;
  }

  onTagSearchChange(text: string) {
    this.availableTags = [];
    text && this.tagService.list(text, 5).subscribe(tags => this.availableTags = tags);
  }

  onNewTagAddition(text: string) {
    this.tags.push(text);
  }

  onLakeSelectionChange() {
    const selectedLake = this.lakes.filter(lake => lake.id == this.dsModel.datalakeId)[0];
    this.dsModel.datalakeName = (selectedLake)?selectedLake.name:"";
    this.dsModel.clusterId = (selectedLake)?selectedLake.clusterId:null;
  }

  onStatusChange(){
    this.dsModel.sharedStatus = (this.dsModel.sharedStatus % 2) + 1;
  }
  onNext() {
    this.nextEE.emit();
  }

  onCancel() {
    this.cancelEE.emit();
  }

}
