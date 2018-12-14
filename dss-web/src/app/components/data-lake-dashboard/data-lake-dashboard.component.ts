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

import {Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewChildren} from '@angular/core';
import {Chart} from 'nvd3';

import {ActivatedRoute, Router} from '@angular/router';
import {ProfilerService} from 'app/services/profiler.service';
import {
  chartColors, ContextTypeConst, MetricTypeConst, ProfilerName,
  PROFILERS_TIME_RANGE_FORMAT
} from '../../shared/utils/constants';
import {DssAppEvents} from '../../services/dss-app-events';
import {ProfilerMetric, ProfilerMetricDefinition, ProfilerMetricRequest} from 'app/models/profiler-metric-request';
import {
  AssetsAndCount, Metric,
  ProfilerMetricResponse,
  AssetCountsResultForADay, CollectionsAndCount, SensitivityDistributionResponse
} from '../../models/profiler-metric-response';
import {DomUtils} from '../../shared/utils/dom-utils';
import * as moment from 'moment';
import {ProfilerInfoWithJobsCount, ProfilerInfoWithAssetsCount} from '../../models/profiler-models';
import {Observable} from 'rxjs/Observable';
import {StringUtils} from '../../shared/utils/stringUtils';
import {
  TimeRangeButtonGroupComponent
} from '../../shared/time-range-button-group/time-range-button-group.component';
import {MathUtils} from '../../shared/utils/math-utils';
import {DataSetService} from '../../services/dataset.service';
import {DpPieChartModel, DpPieChartOptionsModel} from "../../shared/charts/dp-chart-model";

declare const d3: any;
declare const nv: any;

@Component({
  selector: 'dss-data-lake-dashboard',
  templateUrl: './data-lake-dashboard.component.html',
  styleUrls: ['./data-lake-dashboard.component.scss']
})

export class DataLakeDashboardComponent implements OnInit, OnDestroy {

  @ViewChild('totalAssets') totalAssets: ElementRef;
  @ViewChild('topAssetCollections') topAssetCollections: ElementRef;
  @ViewChild('topAssets') topAssets: ElementRef;
  @ViewChildren(TimeRangeButtonGroupComponent) timeRangeButtons;

  LABEL_LENGTH  = 13;

  clusterId: number;
  metricTypeConst = MetricTypeConst;
  sensitivityDistributionData = new  SensitivityDistributionResponse(-1, -1);
  private charts: Chart[] = [];
  private subscriptions = [];

  profiledNonProfiledData: DpPieChartModel;
  sensitiveData: DpPieChartModel;
  profilerJobsData: DpPieChartModel;
  profilerJobsOptions: DpPieChartOptionsModel;

  constructor(private router: Router,
              private activeRoute: ActivatedRoute,
              private profileService: ProfilerService,
              private dataSetService: DataSetService,
              private dssAppEvents: DssAppEvents) { }

  ngOnInit() {
    this.activeRoute.params.subscribe(params => {
      this.ngOnDestroy();
      this.clusterId = parseInt(params['id'], 10);
      if (String(this.clusterId) === 'undefined') {
        this.redirectToRoot();
      } else {
        this.getDataLakeDashboardData(this.clusterId);
        this.fireTimeRangeButtonChange();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  redirectToRoot() {
    this.router.navigateByUrl('/dss');
  }

  getDataLakeDashboardData(dataLakeId: number) {
    const metricsRequests = this.createProfilerMetricRequest([
      new ProfilerMetric(MetricTypeConst.SensitivityDistributionMetric, new ProfilerMetricDefinition())
    ]);

    const subscription = Observable.forkJoin([
      this.profileService.assetCollectionStats(metricsRequests),
      this.profileService.getExistingProfiledAssetCount(this.clusterId, 'sensitiveinfo')
    ])
    .subscribe((resp: any[]) => this.initCharts(resp));

    this.subscriptions.push(subscription);
    this.dssAppEvents.sideNavCollapsed$.subscribe(collapsed => this.updateChartDimensions());
  }

  private initCharts(resp: any[]) {
    const profilerMetricResponse = resp[0];
    const sensitiveProfiledAssetCount = resp[1];

    this.createProfiledNonProfiledChart(sensitiveProfiledAssetCount, profilerMetricResponse);
    this.createSensitiveDataChart(profilerMetricResponse);
  }

  private createProfiledNonProfiledChart(sensitiveProfiledAssetCount: any,
                                         profilerMetricResponse: ProfilerMetricResponse) {

    const data = [];
    const metrics = profilerMetricResponse.metrics.filter((metric: Metric) =>
        metric.metricType === MetricTypeConst.SensitivityDistributionMetric)[0];
    const sensitivityDistributionData = metrics.definition as SensitivityDistributionResponse;

    if (sensitiveProfiledAssetCount && sensitiveProfiledAssetCount.assetCount && sensitivityDistributionData
        && sensitivityDistributionData.totalAssets) {
      const nonProfiledAssetCount = sensitivityDistributionData.totalAssets - sensitiveProfiledAssetCount.assetCount;
      this.profiledNonProfiledData = new DpPieChartModel([
        {
          key: `Non Profiled Assets - ${nonProfiledAssetCount}`,
          value: nonProfiledAssetCount},
        {
          key: `Profiled Assets - ${sensitiveProfiledAssetCount.assetCount}`,
          value: sensitiveProfiledAssetCount.assetCount}
      ]);
    }
  }

  private createSensitiveDataChart(profilerMetricResponse: ProfilerMetricResponse) {
    let data = [];
    const metrics = profilerMetricResponse.metrics.filter((metric: Metric) =>
        metric.metricType === MetricTypeConst.SensitivityDistributionMetric)[0];
    if (metrics.status) {
      this.sensitivityDistributionData = metrics.definition as SensitivityDistributionResponse;
      const sensitiveDataValue = this.sensitivityDistributionData.assetsHavingSensitiveData;
      const nonSensitiveDataValue = this.sensitivityDistributionData.totalAssets -
                                        this.sensitivityDistributionData.assetsHavingSensitiveData;
      this.sensitiveData = new DpPieChartModel([
        {
          key: `Sensitive - ${sensitiveDataValue}`,
          value: sensitiveDataValue
        },
        {
          key: `Non Sensitive - ${nonSensitiveDataValue}`,
          value:  nonSensitiveDataValue
        }
      ]);
    }
  }

  private createProfilerMetricRequest(metrics: ProfilerMetric[]) {
    const profilerMetricRequest = new ProfilerMetricRequest();
    profilerMetricRequest.clusterId = this.clusterId;

    profilerMetricRequest.context.contextType = ContextTypeConst.CLUSTER;

    profilerMetricRequest.metrics = metrics;
    return profilerMetricRequest;
  }

  private getAssetCounts(startDate: string, endDate: string) {
    const metricsRequests = this.createProfilerMetricRequest([
      new ProfilerMetric(MetricTypeConst.AssetCounts, new ProfilerMetricDefinition(undefined, startDate, endDate))
    ]);

    DomUtils.removeAllChildNodes(this.totalAssets.nativeElement);
    this.totalAssets.nativeElement.classList.add('loader');

    const subscription = this.profileService.assetCollectionStats(metricsRequests)
      .finally(() => this.totalAssets.nativeElement.classList.remove('loader'))
      .subscribe(assetCollectionDashboard => {
      this.createAssetCountChart(assetCollectionDashboard);
    });
    this.subscriptions.push(subscription);
  }

  private createAssetCountChart(profilerMetricResponse: ProfilerMetricResponse) {
    let maxVal = 0;
    const assetCounts = [], newAssetCount = [];
    const metrics = profilerMetricResponse.metrics.filter((metric: Metric) => metric.metricType === MetricTypeConst.AssetCounts)[0];
    if (metrics.status) {
      const data = metrics.definition as AssetsAndCount;
      let assetsAndCount = data.assetsAndCount as AssetCountsResultForADay[];
      assetsAndCount = assetsAndCount.sort((a, b) => {
        return (moment(a.date, PROFILERS_TIME_RANGE_FORMAT).valueOf() - moment(b.date, PROFILERS_TIME_RANGE_FORMAT).valueOf());
      });
      assetsAndCount.forEach(ac => {
        const assetCount = ac.totalAssets - ac.newAssets;
        assetCounts.push({'x': ac.date , 'y': assetCount});
        newAssetCount.push({'x': ac.date , 'y': ac.newAssets});
        maxVal = Math.max(assetCount, maxVal);
      });
    }

    const data = [
      {'key': 'Existing', 'nonStackable': false, 'values': assetCounts},
      {'key': 'New', 'nonStackable': false, 'values': newAssetCount}
    ];

    nv.addGraph(() => {
      const chart = nv.models.multiBarChart()
      .stacked(true)
      .showControls(false)
      .color([chartColors.BLUE, chartColors.GREEN])
      .groupSpacing(.4)
      .forceY([0, MathUtils.nearestScaleValue(maxVal)])
      .margin({bottom: 90});

      chart.yAxis.tickFormat(d3.format('f'));

      const svg = d3.select(this.totalAssets.nativeElement).datum(data);
      svg.transition().duration(0).call(chart);

      nv.utils.windowResize(chart.update);
      this.charts.push(chart);

      return chart;
    });
  }

  private getProfilerJobs(startDate: number, endDate: number) {
    const sub = this.profileService.getStatusWithJobCounts(this.clusterId, startDate, endDate)
      .subscribe(profilerInfoWithJobsCount => {
      this.createProfilerJobsChart(profilerInfoWithJobsCount);
    });
    this.subscriptions.push(sub);
  }

  private createProfilerJobsChart(profilerInfoWithJobsCount: ProfilerInfoWithJobsCount[]) {
    const sensitiveJobsCount = profilerInfoWithJobsCount.filter(p => p.profilerInfo.name === ProfilerName.SENSITIVEINFO)[0];
    if (sensitiveJobsCount) {
      const success = sensitiveJobsCount.jobsCount.SUCCESS ? sensitiveJobsCount.jobsCount.SUCCESS : 0,
      running = sensitiveJobsCount.jobsCount.RUNNING ? sensitiveJobsCount.jobsCount.RUNNING : 0,
      started = sensitiveJobsCount.jobsCount.STARTED ? sensitiveJobsCount.jobsCount.STARTED : 0,
      failed  = sensitiveJobsCount.jobsCount.FAILED  ? sensitiveJobsCount.jobsCount.FAILED  : 0,
      unknown = sensitiveJobsCount.jobsCount.UNKNOWN ? sensitiveJobsCount.jobsCount.UNKNOWN : 0;

      this.profilerJobsData = new DpPieChartModel([
        {
          key: `Success - ${success}`,
          value:  success
        },
        {
          key: `Running - ${running}`,
          value:  running
        },
        {
          key: `Started - ${started}`,
          value:  started
        },
        {
          key: `Failed - ${failed}`,
          value:  failed
        },
        {
          key: `Unknown - ${unknown}`,
          value:  unknown
        }
      ]);
    }

    this.profilerJobsOptions = {
      donut: true,
      margin: {
        bottom: 50
      },
      color: [chartColors.GREEN, chartColors.BLUE, chartColors.YELLOW, chartColors.RED, chartColors.GREY]
    };
  }

  private getTopKCollections(startDate: any, endDate: any) {
    const metricsRequests = this.createProfilerMetricRequest([
      new ProfilerMetric(MetricTypeConst.TopKCollections, new ProfilerMetricDefinition(10, startDate, endDate))
    ]);

    DomUtils.removeAllChildNodes(this.topAssetCollections.nativeElement);
    this.topAssetCollections.nativeElement.classList.add('loader');

    const subscription = this.profileService.assetCollectionStats(metricsRequests)
      .finally(() => this.topAssetCollections.nativeElement.classList.remove('loader'))
      .subscribe(assetCollectionDashboard => {
      this.createTopKCollectionsChart(assetCollectionDashboard);
    });
    this.subscriptions.push(subscription);
  }

  private createTopKCollectionsChart(profilerMetricResponse: ProfilerMetricResponse) {
    let data = [], maxValue = 0, minValue = Infinity;
    const metrics = profilerMetricResponse.metrics.filter((metric: Metric) => metric.metricType === MetricTypeConst.TopKCollections)[0];
    if (metrics.status) {
      const definition = metrics.definition as CollectionsAndCount;
      const assetsAndCount = definition.collectionsAndCount as {[p: string]: number};
      data = Object.keys(assetsAndCount).map(k => {
        maxValue = Math.max(maxValue, assetsAndCount[k]);
        minValue = Math.min(minValue, assetsAndCount[k]);
        return ({'label': k, 'value': assetsAndCount[k]});
      });
      data.sort((a, b) => b.value - a.value);
    }

    const topUsersData = [
      {
        'key': '',
        'color': chartColors.GREEN,
        'values': data
      }
    ];
    let chart;
    nv.addGraph(() => {
      chart = nv.models.multiBarHorizontalChart()
      .x(d => d.label )
      .y(d => d.value )
      .showValues(false)
      .duration(350)
      .stacked(false)
      .showControls(false)
      .showLegend(false)
      .showValues(minValue < maxValue/10)
      .showYAxis(true)
      .groupSpacing(0.2 + ((10 - data.length) * 0.07))
      .margin({left: 90, bottom: 75})
      .forceY([0, MathUtils.nearestScaleValue(maxValue)]);

      chart.dispatch.on('renderEnd', () => {
        this.renderSharedStatusIcon(this.topAssetCollections, data.map(d => d.label));
      });

      chart.xAxis.tickFormat( d => StringUtils.trunc( d, this.LABEL_LENGTH) );
      chart.yAxis.tickFormat(d3.format('f'));
      chart.yAxis.axisLabel('Number of accesses');
      chart.tooltip.headerFormatter( d => d );

      d3.select(this.topAssetCollections.nativeElement)
      .datum(topUsersData)
      .call(chart);

      nv.utils.windowResize(chart.update);
      this.charts.push(chart);

      d3.selectAll(this.topAssetCollections.nativeElement).selectAll('foreignObject').data([1]).enter().append(() => {
        const f = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        f.setAttribute('x', '0');
        f.setAttribute('y', '0');
        f.setAttribute('height', '18');
        f.setAttribute('width', '90');
        f.setAttribute('style', 'stroke: black');
        f.innerHTML = '<div style=""><i class="fa fa-lock" style="margin-left: 5px;margin-top: 4px;font-weight: 900;"></i></div>';
        return f;
      });

      return chart;
    });
  }

  private getTopKAssets(startDate: string, endDate: string) {
    const metricsRequests = this.createProfilerMetricRequest([
      new ProfilerMetric(MetricTypeConst.TopKAssets, new ProfilerMetricDefinition(10, startDate, endDate))
    ]);

    DomUtils.removeAllChildNodes(this.topAssets.nativeElement);
    this.topAssets.nativeElement.classList.add('loader');

    const subscription = this.profileService.assetCollectionStats(metricsRequests)
      .finally(() => this.topAssets.nativeElement.classList.remove('loader'))
      .subscribe(assetCollectionDashboard => {
      this.createTopKAssetsChart(assetCollectionDashboard);
    });
    this.subscriptions.push(subscription);
  }

  private createTopKAssetsChart(profilerMetricResponse: ProfilerMetricResponse) {
    let data = [], maxValue = 0, minValue = Infinity;
    const metrics = profilerMetricResponse.metrics.filter((metric: Metric) => metric.metricType === MetricTypeConst.TopKAssets)[0];
    if (metrics.status) {
      const definition = metrics.definition as AssetsAndCount;
      const assetsAndCount = definition.assetsAndCount as {[p: string]: number};
      data = Object.keys(assetsAndCount).map(k => {
        maxValue = Math.max(maxValue, assetsAndCount[k]);
        minValue = Math.min(minValue, assetsAndCount[k]);
        return ({'label': k, 'value': assetsAndCount[k]});
      });
      data.sort((a, b) => b.value - a.value);
    }

    const topUsersData = [
      {
        'key': '',
        'color': chartColors.GREEN,
        'values': data
      }
    ];
    let chart;
    nv.addGraph(() => {
      chart = nv.models.multiBarHorizontalChart()
      .options({
        useInteractiveGuideline: true
      })
      .x(d => d.label )
      .y(d => d.value )
      .showControls(true)
      .stacked(false)
      .showControls(false)
      .showLegend(false)
      .showValues(minValue < maxValue/10)
      .groupSpacing(0.2 + ((10 - data.length) * 0.07))
      .margin({left: 90, bottom: 75})
      .forceY([0, MathUtils.nearestScaleValue(maxValue)]);

      chart.xAxis.tickFormat( d => StringUtils.trunc(d, this.LABEL_LENGTH));
      chart.yAxis.tickFormat(d3.format('f'));
      chart.yAxis.axisLabel('Number of accesses');
      chart.tooltip.headerFormatter( d => d );

      d3.select(this.topAssets.nativeElement)
      .datum(topUsersData)
      .call(chart);

      nv.utils.windowResize(chart.update);
      this.charts.push(chart);

      return chart;
    });
  }

  private renderSharedStatusIcon(element: ElementRef, names:  string[]) {
    this.dataSetService.datasetsByName(names).subscribe(dataSets => {
      const collectIdToSharedCSSClass = {};
      dataSets.forEach(dataSet => {
        const index = names.indexOf(dataSet.name);
        if (index > -1) {
          collectIdToSharedCSSClass[index] = dataSet.sharedStatus === 2 ? '"fa fa-lock"' : '"fa fa-unlock-alt"';
        }
      });
      this.renderLockIcon(collectIdToSharedCSSClass, element);
    });
  }

  private renderLockIcon(collectIdToSharedCSSClass, element: ElementRef) {
    const validDataSetId = Object.keys(collectIdToSharedCSSClass);
    d3.select(element.nativeElement).selectAll('.nv-bar').selectAll('foreignObject')
      .data([1]).enter().append((data, inIndex, outerIndex) => {
      const f = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      f.setAttribute('x', '0');
      f.setAttribute('y', '0');
      f.setAttribute('height', '18');
      f.setAttribute('width', '90');
      f.setAttribute('style', 'stroke: black');
      if (validDataSetId.indexOf(String(outerIndex)) > -1) {
        const cssClass = collectIdToSharedCSSClass[String(outerIndex)];
        f.innerHTML = `<div style=""><i class=${cssClass} style="margin-left: 5px;margin-top: 4px;font-weight: 900;"></i></div>`;
      }
      return f;
    });
  }

  private updateChartDimensions() {
    this.charts.forEach(chart => chart.update());
  }

  timeRangeChange($event, type: string) {
    if (type === MetricTypeConst.AssetCounts) {
      this.getAssetCounts($event[0], $event[1]);
    }

    if (type === MetricTypeConst.TopKAssets) {
      this.getTopKAssets($event[0], $event[1]);
    }

    if (type === MetricTypeConst.TopKCollections) {
      this.getTopKCollections($event[0], $event[1]);
    }

    if (type === MetricTypeConst.ProfilerJobs) {
      this.getProfilerJobs(moment($event[0], 'YYYYMMDD').valueOf(), moment($event[1], 'YYYYMMDD').valueOf());
    }
  }

  private fireTimeRangeButtonChange() {
    if (this.timeRangeButtons && this.timeRangeButtons.length > 0) {
      this.timeRangeButtons.forEach(b => b.fireChange());
    }
  }
}
