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
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {TagType} from '../../../../../../models/asset-schema';
import {AssetTagStatus} from '../../../../../../shared/utils/constants';
import {Alerts} from "../../../../../../shared/utils/alerts";

@Component({
  selector: 'dss-config-column-tags-dialog',
  templateUrl: './config-column-tags-dialog.component.html',
  styleUrls: ['./config-column-tags-dialog.component.scss']
})
export class ConfigColumnTagsDialogComponent {

  @Input() tags: TagType[] = [];
  @Input() showTagFilter: boolean = false;

  @Output() tagsChange = new EventEmitter<TagType[]>();
  @Output() close = new EventEmitter<boolean>();

  showSearch = false;
  addTag = '';
  search = '';
  searchTimeout: any;
  regex = new RegExp('');
  assetTagStatus = AssetTagStatus;
  checkedTagsName:string[] = [];
  tagFilter:string = null;

  ngOnInit() {
   this.tags.forEach(tag=>{
     if([this.assetTagStatus.ACCEPTED,this.assetTagStatus.SUGGESTED,this.assetTagStatus.MANAGED].indexOf(tag.status) != -1)
       this.checkedTagsName.push(tag.name);
   });
   if(this.showTagFilter) this.tagFilter = "system";
  }
  onSearch($event) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.regex = new RegExp(this.search.toLocaleLowerCase());
    }, 100);
  }

  checkTagHidden (tag: TagType) {
    return (
      !this.regex.test(tag.name.toLocaleLowerCase()) ||
      (this.showTagFilter) && (
        (this.tagFilter == "system" && !tag.isDpTag) || (this.tagFilter == "managed" && tag.isDpTag)
      )
    )?true:false;
  }


  onSearchClick() {
    this.showSearch = !this.showSearch;
    this.regex = new RegExp('');
  }

  onCloseAddTagsDialog() {
    let mandatoryVoilation = false
    this.tags.forEach(tag=>{
      if(!mandatoryVoilation && this.assetTagStatus.MANAGED === tag.status)
        tag.attributeDefs.forEach(def => {
          if(!def.isOptional && !tag.attributes[def.name])
            mandatoryVoilation = true;
        })
    })
    if(mandatoryVoilation){
      Alerts.showError('All mandatory fields not filled.');
      return;
    }
    this.close.emit(true);
  }

  onAddTagCheckBoxClick(tag: TagType) {
    let indx = this.checkedTagsName.indexOf(tag.name);
    if( indx== -1)
      this.checkedTagsName.push(tag.name);
    else
      this.checkedTagsName.splice(indx,1);

    if (tag.status === AssetTagStatus.ACCEPTED || tag.status === AssetTagStatus.SUGGESTED) {
      tag.status = AssetTagStatus.REJECTED;
      tag.attributes.status = AssetTagStatus.REJECTED;
    }
    else if (tag.status === AssetTagStatus.REJECTED) {
      tag.status = AssetTagStatus.ACCEPTED;
      tag.attributes.status = AssetTagStatus.ACCEPTED;
    }
    else if (tag.status === AssetTagStatus.MANAGED)
      tag.status = AssetTagStatus.NOT_CONFIGURED;
    else {
      tag.status = (tag.isDpTag)?AssetTagStatus.ACCEPTED:AssetTagStatus.MANAGED;;
      if(tag.isDpTag)
        tag.attributes.status = AssetTagStatus.ACCEPTED;
    }

    this.tagsChange.emit(this.tags);
  }
}
