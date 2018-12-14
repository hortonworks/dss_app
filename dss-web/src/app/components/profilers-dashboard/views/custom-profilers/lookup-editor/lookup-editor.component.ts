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

import {Component, EventEmitter, Output} from "@angular/core";
import {Alerts} from "../../../../../shared/utils/alerts";
import {CspService} from "../../../../../services/csp.service";
import {CSP_Resource_File} from "../../../../../models/CSP_Rule";

@Component({
  selector: 'lookup-editor',
  templateUrl: './lookup-editor.component.html',
  styleUrls: ['./lookup-editor.component.scss']
})

export class LookupEditorComponent {

  @Output('toggleNotifier') toggleEmitter: EventEmitter<null> = new EventEmitter<null>();
  @Output('newFileNotifier') newFileEmitter: EventEmitter<CSP_Resource_File> = new EventEmitter<CSP_Resource_File>();

  filename:string="";
  fileForUpload:File=null;

  constructor(private cspService: CspService) { }

  notifyToggle() {
    this.toggleEmitter.emit(null)
  }
  fileChange(files: FileList){
    if(files.length !== 1){
      return Alerts.showErrorMessage("Cannot upload more than one file.");
    }
    if(files[0].size > 100*1000) {
      return Alerts.showErrorMessage("Cannot upload file more than 100KB size.");
    }
    this.fileForUpload=files[0];
  }
  uploadFile() {
    if(!this.fileForUpload || !this.filename)
      return Alerts.showErrorMessage("Please name your resource and select file not more than 100KB size.");
    this.cspService.createFileResource(this.fileForUpload, "metafile", this.filename)
      .subscribe(cSPResource => {
        this.newFileEmitter.emit(<CSP_Resource_File>cSPResource);
        // this.notifyToggle();
      })
  }
}
