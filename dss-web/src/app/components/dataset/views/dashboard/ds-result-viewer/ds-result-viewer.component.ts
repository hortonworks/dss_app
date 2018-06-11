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

import {Component, Input, Output, ViewChild, OnInit, SimpleChange, ElementRef, EventEmitter} from "@angular/core";
import * as DialogPolyfill from 'dialog-polyfill';
import {DatasetTag} from "../../../../../models/dataset-tag";
import {ViewsEnum} from "../../../../../shared/utils/views";
import {RichDatasetModel} from "../../../models/richDatasetModel";
import {RichDatasetService} from "../../../services/RichDatasetService";
import {DataSetService} from "../../../../../services/dataset.service";

@Component({
  selector: "ds-nav-result-viewer",
  styleUrls: ["./ds-result-viewer.component.scss"],
  templateUrl: "./ds-result-viewer.component.html",
})
export class DsNavResultViewer {

  @Input() currentDsTag: DatasetTag;
  @Input() view;
  @Input() dsNameSearch:string = "";
  @Input() bookmarkFilter: boolean = false;
  @ViewChild('dialogConfirm') dialogConfirm: ElementRef;

  @Output() onViewRefresh = new EventEmitter<boolean>();

  _datasetToDelete: RichDatasetModel;
  _deleteWasSuccessful = false;

  datasetModels: RichDatasetModel[] = null;
  views = ViewsEnum;
  start: number = 1;
  limit: number = 10;

  private currentPage: number = 1;

  constructor(
    private dataSetService: DataSetService,
    private richDatasetService: RichDatasetService,
  ) {
  }

  ngOnChanges(changes: SimpleChange) {
    if ((changes["dsNameSearch"] && changes["dsNameSearch"].currentValue && !changes["dsNameSearch"].firstChange) ||
        (changes["currentDsTag"] && changes["currentDsTag"].currentValue && !changes["currentDsTag"].firstChange) ||
        (changes["bookmarkFilter"] && changes["bookmarkFilter"].currentValue && this.currentDsTag))  {
      this.start = 1;
      this.getDataset();
    }
  }

  getDataset() {
    this.datasetModels = null;
    this.richDatasetService.listByTag(this.currentDsTag.name, this.dsNameSearch, this.start-1, this.limit, this.bookmarkFilter)
      .subscribe(result => this.datasetModels = result);
  }

  onPageChange(start) {
    this.start = start;
    this.getDataset();
  }

  onSizeChange(limit) {
    this.start = 1;
    this.limit = limit;
    this.getDataset();
  }

  onDeleteDataset(datasetId: number) {
    this._datasetToDelete = this.datasetModels.find(cDataset => cDataset.id === datasetId);
    DialogPolyfill.registerDialog(this.dialogConfirm.nativeElement);
    this.dialogConfirm.nativeElement.showModal();
  }

  doConfirmDelete() {
    const delete$ = this.dataSetService.delete(this._datasetToDelete.id).share();

    delete$.subscribe(() => {
      this.getDataset();
      this.onViewRefresh.emit(true);
    });
    delete$
      .do(() => this._deleteWasSuccessful = true)
      .delay(500)
      .subscribe(() => {
        this._datasetToDelete = null;
        this._deleteWasSuccessful = false;

        this.dialogConfirm.nativeElement.close();
      });
  }

  doCancelDelete() {
    this.dialogConfirm.nativeElement.close();
  }
}
