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
import {MetricTypeConst} from '../shared/utils/constants';
import {MetricType} from './profiler-metric-request';

export class AccessPerDayItems {
  date: string;
  numberOfAccesses: number;

  constructor(date: string, numberOfAccesses: number) {
    this.date = date;
    this.numberOfAccesses = numberOfAccesses;
  }
}

export class AccessPerDayResponse {
  accessPerDay: AccessPerDayItems[] = [];
  errorMessage: string;

  constructor(accessPerDay: AccessPerDayItems[]) {
    this.accessPerDay = accessPerDay;
  }
}


export class SensitivityDistributionResponse {
  totalAssets: number;
  assetsHavingSensitiveData: number;
  errorMessage: string;

  constructor(totalAssets: number, assetsHavingSensitiveData: number) {
    this.totalAssets = totalAssets;
    this.assetsHavingSensitiveData = assetsHavingSensitiveData;
  }
}

export class QueriesAndSensitivityDistributionResponse {
  totalQueries: number;
  queriesRunningOnSensitiveData: number;
  errorMessage: string;

  constructor(totalQueries: number, queriesRunningOnSensitiveData: number) {
    this.totalQueries = totalQueries;
    this.queriesRunningOnSensitiveData = queriesRunningOnSensitiveData;
  }
}

export class AssetDistributionBySensitivityTagResponse {
  tagToAssetCount: {[p: string]: number};
  errorMessage: string;

  constructor(tagToAssetCount: { [p: string]: number }) {
    this.tagToAssetCount = tagToAssetCount;
  }
}

export class SecureAssetAccessUserCountResponse {
  accessCounts: {[key: string]: number};
  errorMessage: string;

  constructor(accessPerDay: { [p: string]: number }) {
    this.accessCounts = accessPerDay;
  }
}

export class AssetCountsResultForADay {
  date: string;
  totalAssets: number;
  newAssets: number;

  constructor(date: string, totalAssets: number, newAssets: number) {
    this.date = date;
    this.totalAssets = totalAssets;
    this.newAssets = newAssets;
  }
}

export class AssetsAndCount {
  assetsAndCount: AssetCountsResultForADay[] |  {[p: string]: Number};

  constructor(assetsAndCount: AssetCountsResultForADay[] = []) {
    this.assetsAndCount = assetsAndCount;
  }
}

export class CollectionsAndCount {
  collectionsAndCount: {[p: string]: Number};
}

export class Metric {
  status: boolean;
  metricType: MetricType;
  definition: AssetDistributionBySensitivityTagResponse | AccessPerDayResponse | SensitivityDistributionResponse |
                QueriesAndSensitivityDistributionResponse | SecureAssetAccessUserCountResponse | AssetsAndCount |
                CollectionsAndCount;

  constructor(status: boolean,
              metricType: MetricType,
              definition: AssetDistributionBySensitivityTagResponse | AccessPerDayResponse | SensitivityDistributionResponse |
                  QueriesAndSensitivityDistributionResponse | SecureAssetAccessUserCountResponse | AssetsAndCount |
                  CollectionsAndCount) {
    this.status = status;
    this.metricType = metricType;
    this.definition = definition;
  }
}

export class ProfilerMetricResponse {
  status: boolean;
  metrics: Metric[] = [];

  static getData(): ProfilerMetricResponse {
    const profilerMetricResponse = new ProfilerMetricResponse();
    const tagToAssetCount = new AssetDistributionBySensitivityTagResponse({
      'name': 1,
      'email': 1,
      'expirydate': 1,
      'dob': 1,
      'ukpassportnumber': 1,
      'age': 1,
      'driverlicence': 1,
      'npi': 1,
      'creditcard': 1,
      'ssn': 1
    });
    const accessPerDay = new AccessPerDayResponse([
      new AccessPerDayItems('2017-03-01', 19),
      new AccessPerDayItems('2017-02-28', 34),
      new AccessPerDayItems('2017-02-27', 2),
      new AccessPerDayItems('2017-02-26', 31),
      new AccessPerDayItems('2017-02-25', 7),
      new AccessPerDayItems('2017-02-24', 18),
      new AccessPerDayItems('2017-02-23', 3),
      new AccessPerDayItems('2017-02-22', 44)
    ]);
    const sensitivityDistribution = new SensitivityDistributionResponse(2, 1);
    const queriesAndSensitivityDistribution = new QueriesAndSensitivityDistributionResponse(10, 5);
    const accessCounts =  new SecureAssetAccessUserCountResponse({
      'rohit': 10,
      'gaurav': 2,
      'vimal': 16
    });

    profilerMetricResponse.status = true;
    profilerMetricResponse.metrics = [
      new Metric(true, MetricTypeConst.AssetDistributionBySensitivityTagMetric, tagToAssetCount),
      new Metric(true, MetricTypeConst.SecureAssetAccessUserCountMetric, accessPerDay),
      new Metric(true, MetricTypeConst.SensitivityDistributionMetric, sensitivityDistribution),
      new Metric(true, MetricTypeConst.QueriesAndSensitivityDistributionMetric, queriesAndSensitivityDistribution),
      new Metric(true, MetricTypeConst.TopKUsersPerAssetMetric, accessCounts)
    ];

    return profilerMetricResponse;
  }
}
