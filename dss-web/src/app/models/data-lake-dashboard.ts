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

class DataLakeProfilerSummary {
  status: boolean;
  noOfTables: number;
  noOfProfiledTables: number;
  noOfSensitiveTables: number;
}

class DataLakeStatValues {
  key: string;
  value: number;
}

class DataLakeStats {
  status: boolean;
  stats: DataLakeStatValues[] = [];
}

export class DataLakeDashboard {
  summary: DataLakeProfilerSummary = new DataLakeProfilerSummary();
  assetCountHistogram: DataLakeStats = new DataLakeStats();
  profiledNonProfiled: DataLakeStats = new DataLakeStats();
  sensitiveNonSensitive: DataLakeStats = new DataLakeStats();
  profilerJobs: DataLakeStats = new DataLakeStats();
  secureData: DataLakeStats = new DataLakeStats();
  topAssetCollections: DataLakeStats = new DataLakeStats();
  topAssets: DataLakeStats = new DataLakeStats();

  public static getData(): DataLakeDashboard {
    const dataLakeDashboard = new DataLakeDashboard();
    dataLakeDashboard.summary.noOfTables = 100;
    dataLakeDashboard.summary.noOfProfiledTables = 50;
    dataLakeDashboard.summary.noOfSensitiveTables = 25;

    dataLakeDashboard.assetCountHistogram.stats = [
      {key: 'Mon', value: 15},
      {key: 'Tue', value: 20},
      {key: 'Wed', value: 40},
      {key: 'Thu', value: 80},
      {key: 'Fri', value: 100},
    ];

    dataLakeDashboard.profiledNonProfiled.stats = [
      {key: 'Profiled', value: 45},
      {key: 'Non Profiled', value: 55},
    ];

    dataLakeDashboard.sensitiveNonSensitive.stats = [
      {key: 'Profiled', value: 45},
      {key: 'Non Profiled', value: 55},
    ];

    dataLakeDashboard.profilerJobs.stats = [
      {key: 'Completed', value: 67},
      {key: 'In Progress', value: 32},
      {key: 'Failed', value: 12}
    ];

    dataLakeDashboard.secureData.stats = [
      {key: 'Secured', value: 45},
      {key: 'Un Secured', value: 55},
    ];

    dataLakeDashboard.topAssetCollections.stats = [
      {key: 'temp 2017', value: 87},
      {key: 'insurance 17', value: 76},
      {key: 'insurance 16', value: 56},
      {key: 'bank 17', value: 45},
      {key: 'clickstream', value: 32},
      {key: 'insurance 20', value: 31},
      {key: 'customer 27', value: 28},
      {key: 'bank 2017', value: 15},
      {key: 'finserve 7', value: 10},
      {key: 'marketing 71', value: 5}
    ];

    dataLakeDashboard.topAssets.stats = [
      {key: 'temp 2017', value: 87},
      {key: 'insurance 17', value: 76},
      {key: 'insurance 16', value: 56},
      {key: 'bank 17', value: 45},
      {key: 'clickstream', value: 32},
      {key: 'insurance 20', value: 31},
      {key: 'customer 27', value: 28},
      {key: 'bank 2017', value: 15},
      {key: 'finserve 7', value: 10},
      {key: 'marketing 71', value: 5}
    ];

    return dataLakeDashboard;
  }
}
