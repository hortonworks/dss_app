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
import {
  ProfilerInstance,
  ProfilerInstanceConfig,
  ProfilerInstanceWithSelectorConfig
} from '../../../../models/profiler-config';
import { Observable } from 'rxjs/Rx';
import { ProfilerRunConfig, ProfilerSelector, ProfilerSelectorConfig} from '../../../../models/profiler-selector';

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

class SaveProfilerConfigMessage {
  message: string = '';
  details: string = '';
  status: 'INPROGRESS' | 'DONE' | 'FAILED';
  showDetails = false;

  constructor(message: string, details: string) {
    this.message = message;
    this.details = details;
    this.status = 'INPROGRESS';
    this.showDetails = false;
  }
}


@Component({
  selector: 'profilers-configs-dashboard',
  templateUrl: './configs.component.html',
  styleUrls: ['./configs.component.scss']
})

export class ProfilerConfigsComponent implements OnInit {
  selectedProfilerName = '';

  clusters: Lake[] = [];
  markedClusterIds : number[] = [];
  markedClusterObjs : any[] = [];
  primaryLake = new Lake();
  profilers: Array<ProfilerInfoWithAssetsCount> = [];
  selectedProfiler: ProfilerInfoWithAssetsCount = null;
  senstivityProfilerData = [];

  profilerHistoryData = [];
  historiesResp = null;
  selectedProfilerInfo = new ProfilerInstanceConfig();
  selectedProfilerCronConfig = new  ProfilerRunConfig('');
  assetMatricResp = null;
  todaysProgressPersentage = 0;

  colSortState = COL_SORT_STATE;
  sortState = COL_SORT_STATE.None;
  colNames = COL_NAMES;

  saveProfilerConfigMessages: SaveProfilerConfigMessage[] = [];
  showReplicationDialog = false;
  noClusterSelected = false;

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
    if(this.primaryLake === lake) return;
    this.onProfilerConfigChange(null);
    this.showReplicationDialog = false;
    this.onCloseSaveMessages()
    this.primaryLake = lake;
    this.profilers = [];
    this.selectedProfiler = null;
    this.profilerHistoryData = null;
    this.reloadAssetMatric();
    this.reloadProfilersStatus();
  }

  reloadProfilersStatus () {
    this.profilers = [];

    const d = new Date();
    const endTime = d.getTime();
    d.setHours(0, 0, 0, 0);
    const startTime = d.getTime();

    this.profilerService
      .getStatusWithAssetsCounts(this.primaryLake.clusterId, startTime, endTime)
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

    const clusterId = this.primaryLake.clusterId;
    const profilerName = this.selectedProfiler.profilerInfo.name;

    this.profilerService
      .getProfilerHistories(clusterId, profilerName, startTime, endTime)
      .subscribe(histories => {
        if (clusterId === this.primaryLake.clusterId && profilerName === this.selectedProfiler.profilerInfo.name) {
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
      .putProfilerState(this.primaryLake.clusterId, profiler.name, profiler.active)
      .subscribe(resp => {
        profiler.active = resp.state;
        this.loadProfilerDetails();
      });
  }

  changeProfiler($event, profiler: ProfilerInfoWithAssetsCount) {
    this.onProfilerConfigChange(null);
    this.onCloseSaveMessages();
    this.selectedProfiler = profiler;
    this.loadProfilerHistories();
    this.loadProfilerDetails();

    $event.stopPropagation();
    $event.preventDefault();
  }

  private createProfilerMetricRequest(metrics: ProfilerMetric[]) {
    const profilerMetricRequest = new ProfilerMetricRequest();
    profilerMetricRequest.clusterId = this.primaryLake.clusterId;

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
    this.changeProfiler($event, profiler);
    this.showReplicationDialog = false;
    this.onProfilerConfigChange(null);
    this.onCloseSaveMessages();
    setTimeout(() => {
      this.selectedProfilerName = profiler.profilerInfo.name;
    }, 100);
  }

  onProfilerConfigChange($event) {
    if ($event) {
      this.selectLake(this.primaryLake);
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

  private loadProfilerDetails() {
    const clusterId = this.primaryLake.clusterId;
    const profilerName = this.selectedProfiler.profilerInfo.name;

    Observable.forkJoin([
      this.profilerService.getProfilerInstanceByName(clusterId, profilerName),
      this.profilerService.getProfilerSelectorsConfig(clusterId)
    ]).subscribe(resp => {
      this.selectedProfilerInfo = resp[0];
      const profilerSelector = resp[1].find(s => s.profilerInstanceName === this.selectedProfilerInfo.profilerInstance.name);
      if (profilerSelector) {
        this.selectedProfilerCronConfig = profilerSelector.config
      }
    });
  }

  resolveCopyCheck(lake, property:string):boolean {
    let arr;
    return ((arr = this.markedClusterObjs.filter(o => o.lakeId == lake.clusterId)) && arr.length && arr[0][property])?true:false;
  }
  resolveSelectLakeCheck(lake):boolean {
    return this.markedClusterObjs.filter(o => o.lakeId == lake.clusterId).length?true:false;
  }
  onCopyCheckboxChange(lake:Lake, property:string, isChecked: boolean) {
    let fltrd = this.markedClusterObjs.filter(obj=>obj.lakeId == lake.clusterId)
    if (fltrd.length) 
      fltrd[0][property] = isChecked;
    else if (isChecked) {
      fltrd = [{"lakeId":lake.clusterId}];
      fltrd[0][property] = isChecked;
      this.markedClusterObjs.push(fltrd[0]);
    }
    if(fltrd[0] && !(fltrd[0].copyQueue || fltrd[0].copyCron || fltrd[0].copyAdvanced)) {
      this.onLakeCheckboxChange(lake, false);
    }

  }
  selectAllOptionsForReplication() {
    this.markedClusterObjs = [];
    this.clusters.filter(lake => lake !== this.primaryLake).forEach(lake => 
      this.markedClusterObjs.push({"lakeId":lake.clusterId, "copyCron":true, "copyQueue":true, "copyAdvanced":true}));
  }
  clearAllOptionsForReplication() {
    this.markedClusterObjs = [];
  }

  bringUpReplicationDialog($event) {
    $event.stopPropagation();
    $event.preventDefault();
    this.onProfilerConfigChange(null);
    this.onCloseSaveMessages();
    this.markedClusterIds = [];
    this.markedClusterObjs = [];
    this.showReplicationDialog = true;
  }
  onLakeCheckboxChange (lake:Lake, isChecked: boolean) {
    this.markedClusterObjs = this.markedClusterObjs.filter(obj=>obj.lakeId !== lake.clusterId)
    isChecked && this.markedClusterObjs.push({"lakeId":lake.clusterId, "copyCron":true});
  }
  applyConfigToSelectedClusters() {
    if(!this.markedClusterObjs.length) {
      this.noClusterSelected = true;
      setTimeout(()=>this.noClusterSelected=false, 3000);
      return;
    }
    this.showReplicationDialog = false;

    const profilerConfigRequests = [];
    const clusterId = this.primaryLake.clusterId;
    this.profilers.forEach(profiler => {
      profilerConfigRequests.push(this.profilerService.getProfilerInstanceByName(clusterId, profiler.profilerInfo.name))
    });
    profilerConfigRequests.push(this.profilerService.getProfilerSelectorsConfig(clusterId));

    this.saveProfilerConfigMessages = [];
    this.addSaveMessage('Fetching profiler config from ' + this.primaryLake.name + ', ' + this.primaryLake.dcName);
    if (!document.body.classList.contains('mask')) {
      document.body.classList.add('mask');
    }

    Observable.forkJoin(profilerConfigRequests).subscribe(resp => {
        this.updateSaveMessage('Profiler config fetched from ' + this.primaryLake.name + ', ' + this.primaryLake.dcName, '','DONE');

        const profilerNameToSaveMap = {};
        const clusterIdAndNames = [];
        const profilerSelectors: ProfilerSelector[] = resp.splice(resp.length-1)[0];
        const profilerInstances: ProfilerInstanceConfig[] = resp;

        profilerInstances.forEach(p => {
            const name = p.profilerInstance.name;
            const selector = profilerSelectors.find(s => s.profilerInstanceName === name);
            profilerNameToSaveMap[name] = [p.profilerInstance, new ProfilerRunConfig(selector.config.cronExpr), selector.name];

        });

        this.clusters.forEach(c => {
          const length:number = this.markedClusterObjs.filter(o => o.lakeId == c.clusterId).length
          if (length && c.clusterId !== this.primaryLake.clusterId) {
            clusterIdAndNames.push([c.clusterId, c.name, c.dcName]);
          }
        });

        this.saveProfilerConfigOnClusters(profilerNameToSaveMap, clusterIdAndNames)
      }, err => {
      this.updateSaveMessage('Failed to apply profiler config on ' + this.primaryLake.name + ', ' + this.primaryLake.dcName, err.message, 'FAILED');
      document.body.classList.remove('mask');
    });
  }

  private saveProfilerConfigOnClusters(profilerNameToSaveMap: {}, clusterIdAndNames: any[]) {
    if (clusterIdAndNames.length <= 0) {
      document.body.classList.remove('mask');
      return;
    }

    const clusterIdAndName = clusterIdAndNames.pop();
    if (clusterIdAndName) {
      const clusterId = clusterIdAndName[0];
      const clusterName = clusterIdAndName[1] + ', '+ clusterIdAndName[2];
      this.saveProfilerConfigOnCluster(profilerNameToSaveMap, clusterIdAndNames, clusterId, clusterName);
    }
  }

  private saveProfilerConfigOnCluster(profilerNameToSaveMap: {}, clusterIds: any[], clusterId: any, clusterName: string) {
    this.addSaveMessage('Applying the profiler config on' + clusterName);

    const copyFlag = this.markedClusterObjs.filter(o => o.lakeId == clusterId)[0] || {};

    const saveRequestParams = [];
    const profilerInstanceRequests = []
    Object.keys(profilerNameToSaveMap).forEach(profilerName => {
      profilerInstanceRequests.push(this.profilerService.getProfilerInstanceByName(clusterId, profilerName));
    });

    Observable.forkJoin(profilerInstanceRequests).subscribe(resp => {
      const profilerInstancesConfigs: ProfilerInstanceConfig[] = resp;
      profilerInstancesConfigs.forEach(conf => {
        const pInstance = conf.profilerInstance;
        const configInstanceAndCron = profilerNameToSaveMap[pInstance.name];

        const pIC:ProfilerInstance = configInstanceAndCron[0];
        const updatedProfilerInstanceConfig = new ProfilerInstance(pInstance.id, pIC.name, pIC.displayName,  
          pInstance.profilerId, pIC.version, 
          (copyFlag.copyAdvanced)?pIC.profilerConf:pInstance.profilerConf, 
          (copyFlag.copyAdvanced)?pIC.jobConf:pInstance.jobConf, 
          pIC.active, pIC.owner, 
          (copyFlag.copyQueue)?pIC.queue:pInstance.queue, pIC.description, pIC.created);

        const pSelectorConfig = new ProfilerSelectorConfig(configInstanceAndCron[2], configInstanceAndCron[1]);

        saveRequestParams.push(new ProfilerInstanceWithSelectorConfig(updatedProfilerInstanceConfig, pSelectorConfig));
      });
      const saveRequest = this.profilerService.bulkUpdateProfilerInstanceWithSelectorConfig(clusterId, saveRequestParams);
      this.saveConfigWithUpdatedRequest(saveRequest, profilerNameToSaveMap, clusterIds, clusterName);
    });
  }

  private saveConfigWithUpdatedRequest(saveRequest:Observable<any>, profilerNameToSaveMap: {}, clusterIds: any[], clusterName: string){
    saveRequest.subscribe(resp => {
      this.updateSaveMessage('Successfully saved the profiler config on ' + clusterName,'', 'DONE');
      this.saveProfilerConfigOnClusters(profilerNameToSaveMap, clusterIds);
    }, error => {
      let errMsg
      if(error.error) {
        try {
          errMsg = JSON.parse(error.error.substring(error.error.indexOf("Body ") + 5)).errors[0].message;
        } catch (e) {
          errMsg = error.error;
        }
      } else errMsg = error.message;
      this.updateSaveMessage('Failed to apply profiler config on ' + clusterName, errMsg,'FAILED');
      this.saveProfilerConfigOnClusters(profilerNameToSaveMap, clusterIds);
    });
  }

  private updateSaveMessage(message: string, details: string, status: 'INPROGRESS' | 'DONE' | 'FAILED') {
    this.saveProfilerConfigMessages[this.saveProfilerConfigMessages.length -1].message = message;
    this.saveProfilerConfigMessages[this.saveProfilerConfigMessages.length -1].details = details;
    this.saveProfilerConfigMessages[this.saveProfilerConfigMessages.length -1].status = status;
  }

  private addSaveMessage(message: string) {
    this.saveProfilerConfigMessages.push(new SaveProfilerConfigMessage(message, ''));
  }

  onCloseSaveMessages() {
    this.saveProfilerConfigMessages = [];
  }
}
