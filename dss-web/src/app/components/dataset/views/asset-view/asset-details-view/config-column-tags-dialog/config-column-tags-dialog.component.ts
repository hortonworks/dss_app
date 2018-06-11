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

@Component({
  selector: 'dss-config-column-tags-dialog',
  templateUrl: './config-column-tags-dialog.component.html',
  styleUrls: ['./config-column-tags-dialog.component.scss']
})
export class ConfigColumnTagsDialogComponent {

  @Input() tags: TagType[] = [];

  @Output() tagsChange = new EventEmitter<TagType[]>();
  @Output() close = new EventEmitter<boolean>();

  showSearch = false;
  showAddTag = false;
  addTag = '';
  search = '';
  searchTimeout: any;
  regex = new RegExp('');
  assetTagStatus = AssetTagStatus;

  onSearch($event) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.regex = new RegExp(this.search);
    }, 500);
  }


  onAddTagClick() {
    this.showAddTag = !this.showAddTag;
    if (this.showAddTag) {
      this.showSearch = false;
    }
    this.regex = new RegExp('');
  }

  onSearchClick() {
    this.showSearch = !this.showSearch;
    if (this.showSearch) {
      this.showAddTag = false;
    }
    this.regex = new RegExp('');
  }

  onCloseAddTagsDialog() {
    this.close.emit(true);
  }

  onAddTag($event) {
    this.showAddTag = false;
    let tagFound = false;
    for (let i = 0; i < this.tags.length; i++) {
      const tag = this.tags[i];
      if (tag.name.toLowerCase() === this.addTag.toLowerCase()) {
        tag.status = AssetTagStatus.ACCEPTED;
        this.tags.splice(i, 1);
        this.tags.unshift(tag);
        tagFound = true;
        break;
      }
    }

    if (!tagFound) {
      this.tags.unshift(new TagType(this.addTag, AssetTagStatus.ACCEPTED, true));
    }

    this.tagsChange.emit(this.tags);
  }

  onAddTagCheckBoxClick(tag: TagType) {
    if (tag.status === AssetTagStatus.ACCEPTED || tag.status === AssetTagStatus.SUGGESTED) {
      tag.status = AssetTagStatus.REJECTED;
    } else {
      tag.status = AssetTagStatus.ACCEPTED;
    }
    this.tagsChange.emit(this.tags);
  }
}
