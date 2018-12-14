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
import {Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild} from '@angular/core';
import {Chart} from 'nvd3';
import * as moment from 'moment';

import {ProfilerService} from '../../../../../services/profiler.service';
import {DssAppEvents} from 'app/services/dss-app-events';
import {chartColors, ContextTypeConst, MetricTypeConst, ProfilerName} from '../../../../../shared/utils/constants';
import {
  MetricContextDefinition,
  ProfilerMetric,
  ProfilerMetricDefinition,
  ProfilerMetricRequest,
} from '../../../../../models/profiler-metric-request';
import {
  AccessPerDayResponse,
  AssetDistributionBySensitivityTagResponse,
  Metric,
  ProfilerMetricResponse,
  QueriesAndSensitivityDistributionResponse,
  SecureAssetAccessUserCountResponse,
  SensitivityDistributionResponse
} from '../../../../../models/profiler-metric-response';
import {TranslateService} from '@ngx-translate/core';
import {StringUtils} from '../../../../../shared/utils/stringUtils';
import {RichDatasetModel} from '../../../../../models/richDatasetModel';
import {DomUtils} from '../../../../../shared/utils/dom-utils';
import {RichDatasetService} from 'app/services/RichDatasetService';
import {MathUtils} from '../../../../../shared/utils/math-utils';
import {Observable} from 'rxjs/Observable';
import {DpPieChartModel} from "../../../../../shared/charts/dp-chart-model";

declare const d3: any;
declare const nv: any;

@Component({
  selector: 'dss-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnChanges, OnDestroy {
  @Input('dsModel') dsModel = new RichDatasetModel();

  @ViewChild('topUsers') topUsers: ElementRef;
  @ViewChild('distributionByTag') distributionByTag: ElementRef;
  @ViewChild('usersAccessingSensitiveData') usersAccessingSensitiveData: ElementRef;

  assetCollectionDashboard = new ProfilerMetricResponse();
  charts: Chart[] = [];
  UNABLE_TO_FETCH_DATA = 'Unable to fetch data for plotting the chart';
  NO_DATA = 'Data not available for plotting the chart';
  LABEL_LENGTH  = 10;
  metricTypeConst = MetricTypeConst;
  sensitivityDistributionData = new SensitivityDistributionResponse(-1, -1);
  queriesAndSensitivityDistribution = new QueriesAndSensitivityDistributionResponse(0, 0);

  i18nTablesInAssetCollectionWithTag = '';
  i18nTimesSecureDataAccessed = '';
  i18nUserAccessedAnyData = '';
  noOfTablesProfiledBySensitivityProfiler = -1;
  private subscriptions = [];

  sensitiveNonSensitiveData: DpPieChartModel;
  queriesRunningSensitiveData: DpPieChartModel;

  constructor(private profileService: ProfilerService,
              private dssAppEvents: DssAppEvents,
              private richDatasetService: RichDatasetService,
              translate: TranslateService) {
    const i18Keys = [
      'common.unable-to-fetch-chart-data',
      'common.no-chart-data',
      'pages.dataset.asset-collection.times-user-accessed-any-data',
      'pages.dataset.asset-collection.tables-in-asset-collection-with-tag',
      'pages.dataset.asset-collection.times-secure-data-accessed'
    ];
    translate.get(i18Keys).subscribe((res: string[]) => {
      this.UNABLE_TO_FETCH_DATA = res['common.unable-to-fetch-chart-data'];
      this.NO_DATA = res['common.no-chart-data'];
      this.i18nUserAccessedAnyData = res['pages.dataset.asset-collection.times-user-accessed-any-data'];
      this.i18nTablesInAssetCollectionWithTag = res['pages.dataset.asset-collection.tables-in-asset-collection-with-tag'];
      this.i18nTimesSecureDataAccessed = res['pages.dataset.asset-collection.times-secure-data-accessed'];
    });

  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes && changes['dsModel'].currentValue) {
      this.getData();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  private getData() {
    const metricsRequests = this.createProfilerMetricRequest([
      new ProfilerMetric(MetricTypeConst.SensitivityDistributionMetric, new ProfilerMetricDefinition()),
      new ProfilerMetric(MetricTypeConst.AssetDistributionBySensitivityTagMetric, new ProfilerMetricDefinition(10))
    ]);

    const sub1 = this.profileService.assetCollectionStats(metricsRequests);
    const sub2 = this.richDatasetService.profiledTablesPerProfilers(this.dsModel.clusterId, this.dsModel.name, ProfilerName.SENSITIVEINFO,
      new Date(0).getTime(), new Date().getTime());

    const sub = Observable.forkJoin([sub1, sub2])
      .finally(() => {
        this.distributionByTag.nativeElement.classList.remove('loader');
      })
      .subscribe((resp: any[]) => {
        this.noOfTablesProfiledBySensitivityProfiler = resp[1].assetCount;
        const assetCollectionDashboard = resp[0];
        this.assetCollectionDashboard = assetCollectionDashboard;
        this.initCharts();
      });

    this.subscriptions.push(sub);

    this.dssAppEvents.sideNavCollapsed$.subscribe(collapsed => this.updateChartDimensions());
    this.dssAppEvents.dataSetCollaborationPaneCollapsed$.subscribe(collapsed => this.updateChartDimensions());
  }

  private createProfilerMetricRequest(metrics: ProfilerMetric[]) {
    const profilerMetricRequest = new ProfilerMetricRequest();
    profilerMetricRequest.clusterId = this.dsModel.clusterId;

    profilerMetricRequest.context.contextType = ContextTypeConst.COLLECTION;
    profilerMetricRequest.context.definition = new MetricContextDefinition(this.dsModel.name);

    profilerMetricRequest.metrics = metrics;
    return profilerMetricRequest;
  }

  private initCharts() {
    this.charts = [] ;
    this.createDistributionByTagChart();
    this.createSensitiveNonSensitiveChart();
  }

  private createDistributionByTagChart() {
    let distributionByTagData = [], maxValue = 0, minValue = Infinity;
    const metrics = this.assetCollectionDashboard.metrics.filter((metric: Metric) =>
      metric.metricType === MetricTypeConst.AssetDistributionBySensitivityTagMetric)[0];
    if (metrics.status) {
      const data = metrics.definition as AssetDistributionBySensitivityTagResponse;
      const metricsChartValues = Object.keys(data.tagToAssetCount).map(key => {
        const value = data.tagToAssetCount[key];
        maxValue = Math.max(maxValue, value);
        minValue = Math.min(minValue, value);
        return ({'label': key, 'value': value});
      });
      distributionByTagData = [{'key': this.i18nTablesInAssetCollectionWithTag, 'color': chartColors.GREEN, 'values': metricsChartValues}];
    }

    nv.addGraph(() => {
      const chart = nv.models.multiBarHorizontalChart()
      .x( (d) => {
        return d.label;
      })
      .y( (d) => {
        return d.value;
      })
      .showValues(false)
      .duration(350)
      .stacked(false)
      .showControls(false)
      .showLegend(false)
      .showValues(minValue < maxValue/10)
      .showYAxis(true)
      .groupSpacing(0.2)
      .margin({left: 85})
      .forceY([0, MathUtils.nearestScaleValue(maxValue)]);

      chart.yAxis.tickFormat(d3.format('f'));
      chart.xAxis.tickFormat( d => StringUtils.trunc( d, this.LABEL_LENGTH) );
      chart.tooltip.headerFormatter( d => d );

      d3.select(this.distributionByTag.nativeElement)
      .datum(distributionByTagData)
      .call(chart);

      nv.utils.windowResize(chart.update);
      this.charts.push(chart);

      return chart;
    });
  }

  private createSensitiveNonSensitiveChart() {
    const metrics = this.assetCollectionDashboard.metrics.filter((metric: Metric) =>
      metric.metricType === MetricTypeConst.SensitivityDistributionMetric)[0];
    if (metrics.status && this.noOfTablesProfiledBySensitivityProfiler > 0) {
      this.sensitivityDistributionData = metrics.definition as SensitivityDistributionResponse;
      const sensitiveDataValue = this.sensitivityDistributionData.assetsHavingSensitiveData;
      const nonSensitiveDataValue = this.sensitivityDistributionData.totalAssets - sensitiveDataValue;

      this.sensitiveNonSensitiveData = new DpPieChartModel([
        {key: 'Sensitive', value: sensitiveDataValue},
        {key: 'Non Sensitive', value:  nonSensitiveDataValue}
      ]);
    }
  }

  private getTopKUsers(startDate: string, endDate: string) {
    const metricsRequests = this.createProfilerMetricRequest([
      new ProfilerMetric(MetricTypeConst.TopKUsersPerAssetMetric, new ProfilerMetricDefinition(10, startDate, endDate))
    ]);

    DomUtils.removeAllChildNodes(this.topUsers.nativeElement);
    this.topUsers.nativeElement.classList.add('loader');

    const subscription = this.profileService.assetCollectionStats(metricsRequests)
      .finally(() => this.topUsers.nativeElement.classList.remove('loader'))
      .subscribe(assetCollectionDashboard => {
        this.createTopUsersChart(assetCollectionDashboard);
      });

    this.subscriptions.push(subscription);
  }

  private  createTopUsersChart(topUsersResponse: ProfilerMetricResponse) {
    let topUsersData = [], maxValue = 0, minValue=Infinity;
    const metrics = topUsersResponse.metrics.filter((metric: Metric) => metric.metricType === MetricTypeConst.TopKUsersPerAssetMetric)[0];
    if (metrics.status) {
      const data = metrics.definition as SecureAssetAccessUserCountResponse;
      const metricsChartValues = Object.keys(data.accessCounts).map(key => {
        const value = data.accessCounts[key];
        maxValue = Math.max(maxValue, value);
        minValue = Math.min(minValue, value);
        return ({'label': key, 'value': value});
      });
      metricsChartValues.sort((a, b) => b.value - a.value);
      topUsersData = [{'key': this.i18nUserAccessedAnyData, 'color': chartColors.GREEN, 'values': metricsChartValues}];
    }

    nv.addGraph(() => {
      const chart = nv.models.multiBarHorizontalChart()
      .x((d) => {
        return d.label;
      })
      .y((d) => {
        return d.value;
      })
      .showValues(false)
      .duration(350)
      .stacked(false)
      .showControls(false)
      .showLegend(false)
      .showValues(minValue < maxValue/10)
      .showYAxis(true)
      .groupSpacing(0.2)
      .margin({left: 85})
      .forceY([0, MathUtils.nearestScaleValue(maxValue)]);

      chart.yAxis.tickFormat(d3.format('f'));
      chart.xAxis.tickFormat( d => StringUtils.trunc( d, this.LABEL_LENGTH) );
      chart.tooltip.headerFormatter( d => d );

      d3.select(this.topUsers.nativeElement)
      .datum(topUsersData)
      .call(chart);

      nv.utils.windowResize(chart.update);
      this.charts.push(chart);

      return chart;
    });
  }

  private getQuiresRunningSensitiveDataChart(startDate: string, endDate: string) {
    const metricsRequests = this.createProfilerMetricRequest([
      new ProfilerMetric(MetricTypeConst.QueriesAndSensitivityDistributionMetric, new ProfilerMetricDefinition(10, startDate, endDate))
    ]);

    const subscription = this.profileService.assetCollectionStats(metricsRequests)
      .subscribe(assetCollectionDashboard => {
        this.createQuiresRunningSensitiveDataChart(assetCollectionDashboard);
      });
    this.subscriptions.push(subscription);
  }

  private createQuiresRunningSensitiveDataChart(quiresRunningSensitiveDataResponse: ProfilerMetricResponse) {
    let data = [];
    const metrics = quiresRunningSensitiveDataResponse.metrics.filter((metric: Metric) =>
      metric.metricType === MetricTypeConst.QueriesAndSensitivityDistributionMetric)[0];

    if (metrics.status) {
      this.queriesAndSensitivityDistribution = metrics.definition as QueriesAndSensitivityDistributionResponse;
      const sensitiveDataValue = this.queriesAndSensitivityDistribution.queriesRunningOnSensitiveData;
      const nonSensitiveDataValue = this.queriesAndSensitivityDistribution.totalQueries - sensitiveDataValue;

      if (sensitiveDataValue > 0 || nonSensitiveDataValue > 0) {
        this.queriesRunningSensitiveData = new DpPieChartModel([
          {key: 'Sensitive', value: sensitiveDataValue},
          {key: 'Non Sensitive', value:  nonSensitiveDataValue}
        ]);
      }
      // Todo: Handle error
      if(this.queriesAndSensitivityDistribution.errorMessage) {
        this.queriesRunningSensitiveData = new DpPieChartModel(null, this.queriesAndSensitivityDistribution.errorMessage);
      }
    }
  }

  private getUsersAccessingSensitiveDataChart(startDate: string, endDate: string) {
    const metricsRequests = this.createProfilerMetricRequest([
      new ProfilerMetric(MetricTypeConst.SecureAssetAccessUserCountMetric, new ProfilerMetricDefinition(10, startDate, endDate))
    ]);

    DomUtils.removeAllChildNodes(this.usersAccessingSensitiveData.nativeElement);
    this.usersAccessingSensitiveData.nativeElement.classList.add('loader');

    const subscription = this.profileService.assetCollectionStats(metricsRequests)
      .finally(() => this.usersAccessingSensitiveData.nativeElement.classList.remove('loader'))
      .subscribe(assetCollectionDashboard => {
        this.createUsersAccessingSensitiveDataChart(assetCollectionDashboard);
      });

    this.subscriptions.push(subscription);
  }

  private createUsersAccessingSensitiveDataChart(usersAccessingSensitiveData: ProfilerMetricResponse) {
    let data = [], maxValue = 0;
    const metrics = usersAccessingSensitiveData.metrics.filter((metric: Metric) =>
      metric.metricType === MetricTypeConst.SecureAssetAccessUserCountMetric)[0];
    if (metrics.status) {
      const respData = metrics.definition as AccessPerDayResponse;
      const metricsChartValues = respData.accessPerDay.map((key) => {
        maxValue = Math.max(maxValue, key.numberOfAccesses);
        return ({'x': moment(key.date, 'YYYY-MM-DD').valueOf(), 'y': key.numberOfAccesses});
      });

      data = [{
        area: true,
        values: metricsChartValues,
        key: this.i18nTimesSecureDataAccessed,
        color: chartColors.GREEN,
        fillOpacity: .1
      }];
    }

    nv.addGraph(() => {
      const chart = nv.models.lineChart()
        .margin({right: 25})
        .forceY([0, MathUtils.nearestScaleValue(maxValue)])
        .options({
          duration: 300,
          showLegend: false,
          useInteractiveGuideline: true
        });

      chart.xAxis.tickFormat((d) => {
        return d3.time.format('%m/%d/%y')(new Date(d));
      });

      chart.yAxis.tickFormat((d) => {
        return d3.format(',f')(d);
      });

      d3.select(this.usersAccessingSensitiveData.nativeElement)
        .datum(data)
        .call(chart);

      nv.utils.windowResize(chart.update);
      this.charts.push(chart);

      return chart;
    });
  }

  private updateChartDimensions() {
    this.charts.forEach(chart => chart.update());
  }

  timeRangeChange($event, type: string) {
    if (type === MetricTypeConst.TopKUsersPerAssetMetric) {
      this.getTopKUsers($event[0], $event[1]);
    }

    if (type === MetricTypeConst.SecureAssetAccessUserCountMetric) {
      this.getUsersAccessingSensitiveDataChart($event[0], $event[1]);
    }

    if (type === MetricTypeConst.QueriesAndSensitivityDistributionMetric) {
      this.getQuiresRunningSensitiveDataChart($event[0], $event[1]);
    }
  }
}
