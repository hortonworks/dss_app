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

export const dssCoreURLS = ['auth/in', 'auth/out'];

export const chartColors = {
  GREEN: '#2DB075',
  BLUE: '#2891C0',
  RED: '#E86164',
  YELLOW: '#E18546',
  GREY: '#666666'
};

export const MetricTypeConst: any = {
  AssetCounts: 'AssetCounts',
  TopKAssets: 'TopKAssets',
  TopKCollections: 'TopKCollections',
  TopKAssetsForCollection: 'TopKAssetsForCollection',
  ProfilerMetric: 'ProfilerMetric',
  TopKUsersPerAssetMetric: 'TopKUsersPerAsset',
  AssetDistributionBySensitivityTagMetric: 'AssetDistributionBySensitivityTag',
  QueriesAndSensitivityDistributionMetric: 'QueriesAndSensitivityDistribution',
  SecureAssetAccessUserCountMetric: 'SecureAssetAccessUserCount',
  SensitivityDistributionMetric: 'SensitivityDistribution',
  ProfilerJobs: 'ProfilerJobs'
};

export const ProfilerName: any = {
  AUDIT: 'audit',
  SENSITIVEINFO: 'sensitiveinfo',
  HIVE_METASTORE_PROFILER: 'hive_metastore_profiler',
  HIVECOLUMN: 'hivecolumn',
  TABLESTATS: 'tablestats'
};

export const ContextTypeConst: any = {
  COLLECTION: 'COLLECTION',
  CLUSTER: 'CLUSTER',
  ASSET: 'ASSET'
};

export const AssetType: any = {
  HIVE: 'Hive'
};

export const AssetTagStatus = {
  SUGGESTED: 'suggested',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  NOT_CONFIGURED: 'not-configured'
};

export let PROFILERS_TIME_RANGE_FORMAT = 'YYYY-MM-DD';
