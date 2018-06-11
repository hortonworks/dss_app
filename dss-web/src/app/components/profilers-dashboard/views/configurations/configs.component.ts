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

import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ProfilerService} from '../../../../services/profiler.service';
import {LakeService} from '../../../../services/lake.service';
import { Lake } from '../../../../models/lake';
import {ProfilerModel, ProfilerInfoWithAssetsCount} from '../../../../models/profiler-models';

import {chartColors, ContextTypeConst, MetricTypeConst} from '../../../../shared/utils/constants';
import {
  MetricContextDefinition, ProfilerMetric,
  ProfilerMetricDefinition, ProfilerMetricRequest
} from 'app/models/profiler-metric-request';

declare const d3: any;
declare const nv: any;

export enum COL_SORT_STATE {
  Name_ASC, Version_ASC, Assets_ASC, Status_ASC,
  Name_DESC, Version_DESC, Assets_DESC, Status_DESC,
  None
}

export enum COL_NAMES {
  Name, Version, Assets, Status
}


@Component({
  selector: 'profilers-configs-dashboard',
  templateUrl: './configs.component.html',
  styleUrls: ['./configs.component.scss']
})

export class ProfilerConfigsComponent implements OnInit {
  selectedProfilerName = '';

  clusters = [];
  selectedLake = new Lake();
  profilers: Array<ProfilerInfoWithAssetsCount> = [];
  selectedProfiler: ProfilerInfoWithAssetsCount = null;
  senstivityProfilerData = [];

  profilerHistoryData = [];
  historiesResp = null;
  assetMatricResp = null;
  todaysProgressPersentage = 0;

  colSortState = COL_SORT_STATE;
  sortState = COL_SORT_STATE.None;
  colNames = COL_NAMES;

  @ViewChild('piChart') piChart: ElementRef;

  constructor(private lakeService: LakeService,
              private profilerService: ProfilerService) {}

  ngOnInit() {
    this.lakeService.listWithClusterId().subscribe(lakes => {
      lakes = lakes.sort((a, b) => a.name.localeCompare(b.name));
      this.clusters = lakes;
      this.selectLake(lakes[0]);
    });
  }

  selectLake(lake) {
    this.selectedLake = lake;
    this.profilers = [];
    this.selectedProfiler = null;
    this.profilerHistoryData = null;
    this.reloadAssetMatric();
    this.relodeProfilersStatus();
  }

  relodeProfilersStatus () {
    this.profilers = [];

    const d = new Date();
    const endTime = d.getTime();
    d.setHours(0, 0, 0, 0);
    const startTime = d.getTime();

    this.profilerService
      .getStatusWithAssetsCounts(this.selectedLake.clusterId, startTime, endTime)
      .subscribe(infoAndCounts => {
        const profilerNameToLatestVersionMap = {};
        infoAndCounts.forEach(infoAndCount => {
          if (!profilerNameToLatestVersionMap[infoAndCount.profilerInfo.name]) {
            profilerNameToLatestVersionMap[infoAndCount.profilerInfo.name] = infoAndCount;
          }

          if (profilerNameToLatestVersionMap[infoAndCount.profilerInfo.name].profilerInfo.version < infoAndCount.profilerInfo.version) {
            profilerNameToLatestVersionMap[infoAndCount.profilerInfo.name] = infoAndCount;
          }
        });
        this.profilers = Object.keys(profilerNameToLatestVersionMap).map(k => profilerNameToLatestVersionMap[k])
                          .sort((a, b) => a.profilerInfo.displayName.localeCompare(b.profilerInfo.displayName));
      });
  }

  loadProfilerHistories () {
    this.historiesResp = null;
    this.profilerHistoryData = null;

    const d = new Date();
    const endTime = d.getTime();
    d.setHours(-24 * 6, 0, 0, 0);
    const startTime = d.getTime();

    const clusterId = this.selectedLake.clusterId;
    const profilerName = this.selectedProfiler.profilerInfo.name;

    this.profilerService
      .getProfilerHistories(clusterId, profilerName, startTime, endTime)
      .subscribe(histories => {
        if (clusterId === this.selectedLake.clusterId && profilerName === this.selectedProfiler.profilerInfo.name) {
          this.historiesResp = histories;
          this.prepareProfilerHistoryData();
        }
      });
  }

  prepareProfilerHistoryData () {
    this.profilerHistoryData = [];

    if (!this.assetMatricResp || !this.historiesResp) {
      return;
    }
    let validMData = null;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(), dStr = this.formatDate(d.setDate(d.getDate() - i));
      const data = this.historiesResp.find(obj => obj.day === dStr);
      const mData = this.assetMatricResp.find(obj => obj.date === dStr);
      const status = (!data || !data.assetsCount.SUCCESS) ? 'failed' : (data.assetsCount.FAILED) ? 'somePass' : 'allPass';
      const percent = (!data || !mData) ? '-' : (Math.floor(100 * data.assetsCount.SUCCESS / mData.totalAssets) + '%');
      const displayDate = (new Date(d.setDate(d.getDate()))).toString().substr(4, 6);
      if (mData) {
        validMData = mData;
      }

      if (i) {
        this.profilerHistoryData.push({'day': dStr, 'status': status, 'assetsProfiled': percent, 'displayDate': displayDate});
      } else {
        this.createPiChart((data) ? data.assetsCount.SUCCESS : 0, validMData.totalAssets);
      }
    }
  }

  toggleActive(profiler: ProfilerModel) {
    profiler.active = !profiler.active;
    this.profilerService
      .putProfilerState(this.selectedLake.clusterId, profiler.name, profiler.active)
      .subscribe(resp => profiler.active = resp.state);
  }
  changeProfiler($event, profiler: ProfilerInfoWithAssetsCount) {
    this.selectedProfiler = profiler;
    this.loadProfilerHistories();

    $event.stopPropagation();
    $event.preventDefault();
  }

  private createProfilerMetricRequest(metrics: ProfilerMetric[]) {
    const profilerMetricRequest = new ProfilerMetricRequest();
    profilerMetricRequest.clusterId = this.selectedLake.clusterId;

    profilerMetricRequest.context.contextType = ContextTypeConst.CLUSTER;

    profilerMetricRequest.metrics = metrics;
    return profilerMetricRequest;
  }

  private reloadAssetMatric() {

    const d = new Date();
    const endTime = d.getTime();
    d.setHours(-24 * 6, 0, 0, 0);
    const startTime = d.getTime();

    const metricsRequests = this.createProfilerMetricRequest([
      new ProfilerMetric(MetricTypeConst.AssetCounts,
                          new ProfilerMetricDefinition(undefined, this.formatDate(startTime), this.formatDate(endTime)))
    ]);

    this.assetMatricResp = null;
    this.profilerService.assetCollectionStats(metricsRequests).subscribe(data => {
      this.assetMatricResp = data.metrics[0].definition['assetsAndCount'];
      this.prepareProfilerHistoryData();
    });
  }

  private formatDate(date) {
    const d = new Date(date),
          year = d.getFullYear();
    let month = '' + (d.getMonth() + 1),
        day = '' + d.getDate();

    if (month.length < 2) {
      month = '0' + month;
    }

    if (day.length < 2) {
      day = '0' + day;
    }

    return [year, month, day].join('-');
  }

  private createPiChart (success: number, total: number) {
    if (!this.piChart) {
      return setTimeout(() => this.createPiChart(success, total), 200);
    }

    this.todaysProgressPersentage = Math.floor(100 * success / total);
    const data = [];
    data.push({'key': 'Profiled Assets', 'y': success});
    data.push({'key': 'Non Profiled Assets', 'y': total - success});
    nv.addGraph(() => {
      const chart = nv.models.pieChart()
      .x(function (d) {
        return d.key;
      })
      .y(function (d) {
        return d.y;
      })
      .donut(true)
      .color([chartColors.BLUE, chartColors.RED]).width(150).height(150)
      .showLegend(false)
      .showLabels(false);

      d3.select(this.piChart.nativeElement)
      .datum(data)
      .call(chart);

      return chart;
    });
  }

  showProfilerConfig($event, profiler: ProfilerInfoWithAssetsCount) {
    this.selectedProfilerName = profiler.profilerInfo.name;
    $event.stopPropagation();
    $event.preventDefault();
  }

  onProfilerConfigChange($event) {
    if ($event) {
      this.selectLake(this.selectedLake);
    }

    this.selectedProfilerName = '';
  }

  toggleSort(colName: COL_NAMES) {
    if (colName === COL_NAMES.Name) {
      this.sortState = (this.sortState === COL_SORT_STATE.Name_ASC) ? COL_SORT_STATE.Name_DESC : COL_SORT_STATE.Name_ASC;
      this.profilers = this.profilers.sort((a, b) => {
        return (this.sortState === COL_SORT_STATE.Name_DESC) ? b.profilerInfo.displayName.localeCompare(a.profilerInfo.displayName) :
                  a.profilerInfo.displayName.localeCompare(b.profilerInfo.displayName);
      });
    } else if (colName === COL_NAMES.Version) {
      this.sortState = (this.sortState === COL_SORT_STATE.Version_ASC) ? COL_SORT_STATE.Version_DESC : COL_SORT_STATE.Version_ASC;
      this.profilers = this.profilers.sort((a, b) => {
        return (this.sortState === COL_SORT_STATE.Version_DESC) ? (b.profilerInfo.version - a.profilerInfo.version) :
          (a.profilerInfo.version - b.profilerInfo.version);
      });
    } else if (colName === COL_NAMES.Assets) {
      this.sortState = (this.sortState === COL_SORT_STATE.Assets_ASC) ? COL_SORT_STATE.Assets_DESC : COL_SORT_STATE.Assets_ASC;
      this.profilers = this.profilers.sort((a, b) => {
        return (this.sortState === COL_SORT_STATE.Assets_DESC) ? (b.assetsCount - a.assetsCount) :
          (a.assetsCount - b.assetsCount);
      });
    } else if (colName === COL_NAMES.Status) {
      this.sortState = (this.sortState === COL_SORT_STATE.Status_ASC) ? COL_SORT_STATE.Status_DESC : COL_SORT_STATE.Status_ASC;
      this.profilers = this.profilers.sort((a, b) => {
        return (this.sortState === COL_SORT_STATE.Status_DESC) ? (Number(a.profilerInfo.active) - Number(b.profilerInfo.active)) :
          (Number(b.profilerInfo.active) - Number(a.profilerInfo.active));
      });
    }
  }
}
