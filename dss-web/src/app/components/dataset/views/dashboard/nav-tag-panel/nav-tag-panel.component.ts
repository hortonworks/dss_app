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
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChange
} from '@angular/core';
import {DatasetTag} from '../../../../../models/dataset-tag';
import {DatasetTagService} from '../../../../../services/tag.service';

@Component({
  selector: 'nav-tag-panel',
  styleUrls: ['./nav-tag-panel.component.scss'],
  templateUrl: './nav-tag-panel.component.html'
})
export class NavTagPanelComponent implements OnInit, OnChanges {

  @Input() dsNameSearch = '';
  @Input() bookmarkFilter = false;
  @Output('updateSelection') updateSelection: EventEmitter<DatasetTag> = new EventEmitter<DatasetTag>();

  readonly ALL = 'ALL';

  allTags: DatasetTag[] = null;
  displayTags: DatasetTag[] = null;
  tagSearchText = '';
  showTags = false;
  private currentDsTag: DatasetTag = null;
  private searchTimer: any;

  constructor(private element: ElementRef,
              private tagService: DatasetTagService) { }

  ngOnChanges(changes: { [propertyName: string]: SimpleChange }) {
    if ((changes['dsNameSearch'] && !changes['dsNameSearch'].firstChange) || (changes['bookmarkFilter'])) {
      this.fetchList();
    }
  }

  ngOnInit() {
    this.fetchList();
  }

  fetchList() {
    this.tagService.list(this.dsNameSearch, this.bookmarkFilter)
      .subscribe(tags => {
        let lastSelectedTag = null;
        this.allTags = [];
        tags.forEach(cTag => {
          if (cTag.name === this.ALL || cTag.count > 0) {
            this.allTags.push(cTag);
            if (this.currentDsTag && cTag.name === this.currentDsTag.name) {
              lastSelectedTag = cTag;
            }
          }
        });

        this.displayTags = this.allTags;
        this.onPanelRowSelectionChange(lastSelectedTag);
      });
  }

  onPanelRowSelectionChange(tagObj: DatasetTag) {
    this.showTags = false;
    this.currentDsTag = tagObj ? tagObj : this.allTags.find(t => t.name === this.ALL);
    this.tagSearchText = (this.currentDsTag && this.currentDsTag.name === this.ALL) ? '' : this.currentDsTag.name;

    this.updateSelection.emit(this.currentDsTag);
  }

  searchTag() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.displayTags = this.allTags.filter(tag => tag.name.toLowerCase().indexOf(this.tagSearchText.toLowerCase()) !== -1);
    }, 500);
  }

  onClearSearch($event) {
    this.onPanelRowSelectionChange(null);
    this.searchTag();
    $event.stopPropagation();
  }

  @HostListener('document:click', ['$event', '$event.target'])
  public onDocumentClick($event: MouseEvent, targetElement: HTMLElement): void {
    if (this.element.nativeElement.contains(targetElement)) {
      this.showTags = !this.showTags;
      return;
    }
    this.showTags = false;
  }
}
