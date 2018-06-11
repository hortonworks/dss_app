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
  Input,
  OnChanges, OnDestroy,
  SimpleChanges,
  ViewChild,
  ViewChildren
} from '@angular/core';
import * as moment from 'moment';
import {
  AssetTagStatus,
  AssetType,
  chartColors,
  ContextTypeConst,
  MetricTypeConst
} from '../../../../../shared/utils/constants';
import {StringUtils} from '../../../../../shared/utils/stringUtils';
import {DssAppEvents} from '../../../../../services/dss-app-events';
import {LineageComponent} from '../../../../../shared/lineage/lineage.component';
import {AssetDetails, AssetEntityClassification} from '../../../../../models/asset-property';
import {
  AssetContextDefinition,
  AssetDefinition,
  ProfilerMetric,
  ProfilerMetricDefinition,
  ProfilerMetricRequest
} from '../../../../../models/profiler-metric-request';
import {ActivatedRoute} from '@angular/router';
import {ProfilerService} from '../../../../../services/profiler.service';
import {
  ProfilerMetricResponse,
  SecureAssetAccessUserCountResponse
} from '../../../../../models/profiler-metric-response';
import {AssetService} from '../../../../../services/asset.service';
import {TimeRangeButtonGroupComponent} from '../../../../../shared/time-range-button-group/time-range-button-group.component';
import {DomUtils} from '../../../../../shared/utils/dom-utils';
import {MathUtils} from '../../../../../shared/utils/math-utils';

declare const d3: any;
declare const nv: any;

@Component({
  selector: 'dss-asset-view-overview',
  templateUrl: './asset-view-overview.component.html',
  styleUrls: ['./asset-view-overview.component.scss']
})

export class AssetViewOverviewComponent implements OnChanges, OnDestroy {
  @Input() guid = '1cb2fd1e-03b4-401f-a587-2151865d375a';
  @Input() clusterId = '1989';
  @Input() assetDetails = new AssetDetails();

  @ViewChild('topUsers') topUsers: ElementRef;
  @ViewChild('authUnauthorisedAccess') authUnauthorisedAccess: ElementRef;
  @ViewChild('selectAndUpdate') selectAndUpdate: ElementRef;
  @ViewChild(LineageComponent) lineageComponent: LineageComponent;
  @ViewChildren(TimeRangeButtonGroupComponent) timeRangeButtons;

  LABEL_LENGTH = 13;

  private charts = [];
  sensitiveColCount: number | '-' = '-';
  colCount: number | '-' = '-';
  auditCharts =  {
    AUTHORISATION: 'authorisation',
    ACCESS: 'access'
  };
  loaderIcon = {
    topUsersInProgress: false,
    authUnauthorisedAccessInProgress: false,
    selectAndUpdateInProgress: false
  };
  private subscriptions = [];

  constructor(private activatedRoute: ActivatedRoute,
              private profileService: ProfilerService,
              private assetService: AssetService,
              private dssAppEvents: DssAppEvents) {
    this.dssAppEvents.sideNavCollapsed$.subscribe(() => this.updateChartDimensions());
    this.dssAppEvents.assetCollaborationPaneCollapsed$.subscribe(() => this.updateChartDimensions());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes && changes['assetDetails'] && changes['assetDetails'].currentValue) {
      if (this.assetDetails.referredEntities && this.assetDetails.entity) {
        this.colCount = this.assetDetails.entity.attributes.columns.length;
        this.extractTags();
      }

      if ((this.assetDetails.entity.attributes.name && this.assetDetails.entity.attributes.name.length > 0) &&
          (this.assetDetails.entity.attributes.qualifiedName && this.assetDetails.entity.attributes.qualifiedName.length > 0)) {
        this.initCharts();
        this.fireTimeRangeButtonChange();
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  private extractTags() {
    Object.keys(this.assetDetails.referredEntities).forEach(id => {
      const configuredTags: AssetEntityClassification[] = this.assetDetails.referredEntities[id].classifications;
      if (configuredTags && configuredTags.length > 0) {
        for (let i = 0; i < configuredTags.length; i++) {
          const tag = configuredTags[i];
          if (tag && tag.typeName.startsWith('dp_') && tag.attributes &&
              (tag.attributes.status === AssetTagStatus.ACCEPTED || tag.attributes.status === AssetTagStatus.SUGGESTED)) {
            this.sensitiveColCount =  this.sensitiveColCount === '-' ?  1 : (this.sensitiveColCount + 1);
            break;
          }
        }
      }
    });
  }


  private initCharts() {
    this.getTopAssetsChartData();
  }

  private createProfilerMetricRequest(metrics: ProfilerMetric[]) {
    const dbName = this.assetDetails.entity.attributes.qualifiedName.split('.')[0];
    const tableName = this.assetDetails.entity.attributes.name;
    const clusterId = parseInt(this.activatedRoute.snapshot.params['clusterId'], 10);
    const profilerMetricRequest = new ProfilerMetricRequest();
    profilerMetricRequest.clusterId = clusterId;

    profilerMetricRequest.context.contextType = ContextTypeConst.ASSET;
    profilerMetricRequest.context.definition = new AssetContextDefinition(AssetType.HIVE,
                                                    new AssetDefinition(dbName, tableName));

    profilerMetricRequest.metrics = metrics;
    return profilerMetricRequest;
  }

  private getTopAssetsChartData() {
    const metricsRequests = this.createProfilerMetricRequest([
      new ProfilerMetric(MetricTypeConst.TopKUsersPerAssetMetric, new ProfilerMetricDefinition(10, moment(0).format('YYYY-MM-DD'),
                                                                                                    moment().format('YYYY-MM-DD')))
    ]);

    this.loaderIcon.topUsersInProgress = true;
    const subscription = this.profileService.assetCollectionStats(metricsRequests)
    .finally(() => this.loaderIcon.topUsersInProgress = false)
    .subscribe(profilerMetricResponse => {
      this.createTopAssetsChart(profilerMetricResponse);
    });

    this.subscriptions.push(subscription);
  }

  private createTopAssetsChart(profilerMetricResponse: ProfilerMetricResponse) {
    let data = [], maxValue = 0;
    if (profilerMetricResponse.status) {
      const topKUsers = profilerMetricResponse.metrics.filter(m => m.metricType === MetricTypeConst.TopKUsersPerAssetMetric)[0];
      const secureAssetAccessUsers = topKUsers.definition as SecureAssetAccessUserCountResponse;
      data = Object.keys(secureAssetAccessUsers.accessCounts).map(k => {
        maxValue = Math.max(secureAssetAccessUsers.accessCounts[k], maxValue);
        return {'label': k, 'value': secureAssetAccessUsers.accessCounts[k]};
      });
      data = data.sort((a, b) => (b.value - a.value));
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
      .x( (d) => {
        return StringUtils.centerEllipses(d.label, this.LABEL_LENGTH);
      })
      .y(function (d) {
        return d.value;
      })
      .showValues(false)
      .duration(350)
      .showControls(true)
      .stacked(false)
      .showControls(false)
      .showLegend(false)
      .showYAxis(true)
      .groupSpacing(0.5)
      .margin({left: 90})
      .forceY([0, MathUtils.nearestScaleValue(maxValue)]);

      chart.yAxis.tickFormat(d3.format('f'));

      d3.select(this.topUsers.nativeElement)
      .datum(topUsersData)
      .call(chart);

      nv.utils.windowResize(chart.update);
      this.charts.push(chart);

      return chart;
    });
  }

  private getAuthorisedAndUnAuthorisedData(startDate: string, endDate: string) {
    const assetName = this.assetDetails.entity.attributes.name;
    const dbName = this.assetDetails.entity.attributes.qualifiedName.split('.')[0];

    if (assetName && dbName && startDate && endDate) {
      DomUtils.removeAllChildNodes(this.authUnauthorisedAccess.nativeElement);
      this.loaderIcon.authUnauthorisedAccessInProgress = true;

      const subscription = this.assetService.getAuditProfilerStats(this.clusterId, dbName, assetName, startDate, endDate, null)
      .finally(() => this.loaderIcon.authUnauthorisedAccessInProgress = false)
      .subscribe((resp: any) => {
        this.createAuthorisedAndUnAuthorisedChart(resp.data);
      });

      this.subscriptions.push(subscription);
    }
  }

  private createAuthorisedAndUnAuthorisedChart(data: any) {
    let maxValue = 0;
    const unAuthorised = [], authorised = [];
    data.forEach(d => {
      maxValue = Math.max(maxValue, d.result['1'] + d.result['0']);
      authorised.push({x: d.date, y: d.result['1']});
      unAuthorised.push({x: d.date, y: d.result['0']});
    });

    const test_data = [
      {'key': 'Allowed', 'nonStackable': false, 'values': authorised},
      {'key': 'Denied', 'nonStackable': false, 'values': unAuthorised}
    ];

    nv.addGraph(() => {
      const chart = nv.models.multiBarChart()
      .stacked(true)
      .showControls(false)
      .color([chartColors.GREEN, chartColors.RED])
      .groupSpacing(.4)
      .forceY([0, MathUtils.nearestScaleValue(maxValue)]);

      const svg = d3.select(this.authUnauthorisedAccess.nativeElement).datum(test_data);
      svg.transition().duration(0).call(chart);

      nv.utils.windowResize(chart.update);
      this.charts.push(chart);

      return chart;
    });
  }

  private getAuditAccessData(startDate: string, endDate: string) {
    const assetName = this.assetDetails.entity.attributes.name;
    const dbName = this.assetDetails.entity.attributes.qualifiedName.split('.')[0];

    if (assetName && dbName && startDate && endDate) {
      DomUtils.removeAllChildNodes(this.selectAndUpdate.nativeElement);
      this.loaderIcon.selectAndUpdateInProgress = true;

      const subscription = this.assetService.getAuditProfilerActions(this.clusterId, dbName, assetName, startDate, endDate, null)
      .finally(() => this.loaderIcon.selectAndUpdateInProgress = false)
      .subscribe((resp: any) => {
        this.createAuditAccessChart(resp.data);
      });

      this.subscriptions.push(subscription);
    }
  }

  private createAuditAccessChart(resp: any) {
    let select = 0, drop = 0, create = 0, data = [];
    resp.forEach(d => {
      select += typeof(d.action.select) === 'number' ? d.action.select : 0;
      drop += typeof(d.action.drop) === 'number' ? d.action.drop : 0;
      create += typeof(d.action.create) === 'number' ? d.action.create : 0;
    });

    if (select > 0 || create > 0 || drop > 0) {
      data = [
        {'key': 'Select', 'y': select},
        {'key': 'Update', 'y': create},
        {'key': 'Drop', 'y': drop}
      ];
    }

    nv.addGraph(() => {
      const chart = nv.models.pieChart()
      .x(function (d) {
        return d.key;
      })
      .y(function (d) {
        return d.y;
      })
      .donut(true)
      .color([chartColors.BLUE, chartColors.YELLOW, chartColors.RED])
      .valueFormat(d3.format('.f'))
      .labelType('percent');

      chart.pie.labelsOutside(true).donut(true);

      d3.select(this.selectAndUpdate.nativeElement)
      .datum(data)
      .transition().duration(1200)
      .call(chart);

      nv.utils.windowResize(chart.update);
      this.charts.push(chart);

      return chart;
    });
  }

  private updateChartDimensions() {
    this.charts.forEach(chart => {
      chart.update();
    });
    this.lineageComponent.reDraw();
  }

  timeRangeChange($event, type: string) {
    if (type === this.auditCharts.ACCESS) {
      this.getAuditAccessData($event[0], $event[1]);
    }

    if (type === this.auditCharts.AUTHORISATION) {
      this.getAuthorisedAndUnAuthorisedData($event[0], $event[1]);
    }
  }

  private fireTimeRangeButtonChange() {
    if (this.timeRangeButtons && this.timeRangeButtons.length > 0) {
      this.timeRangeButtons.forEach(b => b.fireChange());
    }
  }
}
