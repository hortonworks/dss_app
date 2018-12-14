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

import {Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {DatasetTag} from '../../../../models/dataset-tag';
import {ViewsEnum} from '../../../../shared/utils/views';
import {NavTagPanelComponent} from './nav-tag-panel/nav-tag-panel.component';

@Component({
  selector: 'dp-dataset-dashboard',
  styleUrls: ['./dataset-dashboard.component.scss'],
  templateUrl: './dataset-dashboard.component.html',
})

export class DatasetDashboardComponent implements OnInit {

  currentDsTag: DatasetTag = null;
  dsNameSearch  = '';
  views = ViewsEnum;
  currentView: ViewsEnum;
  bookmarkFilter  = false;

  @ViewChild('tagViewer') tagViewer: NavTagPanelComponent;

  constructor(private router: Router,
              private route: ActivatedRoute) {
    this.route.data.subscribe( params => {
      // currently this filter ,if present, is always 'bookmark' filter
      this.bookmarkFilter = (params['filter'] && params['filter'] === 'bookmark');
    });
  }

  ngOnInit() {
    this.currentView = this.views.grid;
  }

  onTagChange(tagObj: DatasetTag) {
    this.currentDsTag = tagObj;
  }

  onViewChange(view) {
    this.currentView = view;
  }

  actionAddNewDataset() {
    this.router.navigate(['collections/add']);
  }

  dsNameSearchChange(event) {
    this.dsNameSearch = event.target.value;
  }

  onViewRefresh() {
    if (this.tagViewer) {
      this.tagViewer.fetchList();
    }
  }

  clearSearch() {
    this.dsNameSearch = '';
  }
}
