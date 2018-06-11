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
  Component, EventEmitter, Input, OnChanges, OnInit, Output,
  SimpleChanges
} from '@angular/core';
import * as moment from 'moment';
import {PROFILERS_TIME_RANGE_FORMAT} from 'app/shared/utils/constants';

const validFormats = ['D', 'W', 'M', 'Y'];
const defaultTimeRange = 'M';


class TimeRangeButtonGroupData {
  displayName: string;
  isActive: boolean;

  constructor(displayName: string, isActive = false) {
    this.displayName = displayName;
    this.isActive = isActive;
  }
}

@Component({
  selector: 'dss-time-range-button-group',
  templateUrl: './time-range-button-group.component.html',
  styleUrls: ['./time-range-button-group.component.scss']
})
export class TimeRangeButtonGroupComponent implements OnChanges {

  @Input() formats: ('D' | 'W' | 'M' | 'Y')[] = [];
  @Output('change') change = new EventEmitter<[string, string]>();

  displayValues: TimeRangeButtonGroupData[] = [];
  toDate = '';
  fromDate = '';

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes && changes['formats'] && changes['formats'].currentValue) {
      this.render();
    }
  }

  private render() {
    this.formats = this.formats.filter(f => validFormats.indexOf(f) > -1);
    this.displayValues = this.formats.map(f => new TimeRangeButtonGroupData(f));
    this.selectTimeRange(this.displayValues.find(d => d.displayName === defaultTimeRange));
  }

  selectTimeRange(button: TimeRangeButtonGroupData) {
    this.displayValues.forEach(d => (d.isActive = false));
    button.isActive = true;

    this.toDate = '';
    this.fromDate = '';
    switch (button.displayName) {
      case 'D':
        this.fromDate = moment().endOf('day').local().format(PROFILERS_TIME_RANGE_FORMAT);
        this.toDate = moment().endOf('day').local().format(PROFILERS_TIME_RANGE_FORMAT);
        break;
      case 'W':
        this.fromDate = moment().subtract(7, 'days').startOf('day').local().format(PROFILERS_TIME_RANGE_FORMAT);
        this.toDate = moment().endOf('day').local().format(PROFILERS_TIME_RANGE_FORMAT);
        break;
      case 'M':
        this.fromDate = moment().subtract(30, 'days').startOf('day').local().format(PROFILERS_TIME_RANGE_FORMAT);
        this.toDate = moment().endOf('day').local().format(PROFILERS_TIME_RANGE_FORMAT);
        break;
      case 'Y':
        this.fromDate = moment().subtract(365, 'days').startOf('day').local().format(PROFILERS_TIME_RANGE_FORMAT);
        this.toDate = moment().endOf('day').local().format(PROFILERS_TIME_RANGE_FORMAT);
        break;

    }

    this.fireChange();
  }

  fireChange() {
    if (this.fromDate.length > 0 && this.toDate.length > 0) {
      this.change.emit([this.fromDate, this.toDate]);
    }
  }
}
