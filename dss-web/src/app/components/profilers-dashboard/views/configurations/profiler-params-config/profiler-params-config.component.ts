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
import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ProfilerService} from '../../../../../services/profiler.service';
import {ProfilerInstanceConfig, ProfilerInstanceWithSelectorConfig} from '../../../../../models/profiler-config';
import {Alerts} from '../../../../../shared/utils/alerts';
import { Observable } from 'rxjs/Rx';
import { ProfilerRunConfig, ProfilerSelector, ProfilerSelectorConfig} from '../../../../../models/profiler-selector';

@Component({
  selector: 'app-profiler-params-config',
  templateUrl: './profiler-params-config.component.html',
  styleUrls: ['./profiler-params-config.component.scss']
})
export class ProfilerParamsConfigComponent implements OnInit {
  @Input() profilerName = '';
  @Input() clusterId: number;

  @Output() close = new EventEmitter<boolean>();

  advancedPaneShow = true;
  expressionType = 'Advanced';
  profilerSampleSizeAttributes = {
    'tablestats': ['Sample Percentage'],
    'sensitiveinfo': ['Number of Rows']
  };
  profilerSampleSizeAvailable = Object.keys(this.profilerSampleSizeAttributes);

  yarnQueueList:string[];

  jsonStr: string;
  profilerInstanceConfig = new ProfilerInstanceConfig();
  profilerDisplayName = '';
  profilerStatus = true;
  profilerSelector = new ProfilerSelector();
  cronConfig = new ProfilerRunConfig('');

  constructor(private profilerService: ProfilerService) { }

  ngOnInit() {
    Observable.forkJoin([
      this.profilerService.getProfilerInstanceByName(this.clusterId, this.profilerName),
      this.profilerService.getProfilerSelectorsConfig(this.clusterId)
    ]).subscribe(resp => {
      this.profilerInstanceConfig = resp[0];
      this.setProfilerInstanceConfig();
      this.setProfilerRunConfig(resp[1]);
      const json = {};
      json['profilerConf'] = this.profilerInstanceConfig.profilerInstance.profilerConf;
      json['jobConf'] = this.profilerInstanceConfig.profilerInstance.jobConf;
      json['queue'] = this.profilerInstanceConfig.profilerInstance.queue;

      this.profilerInstanceConfig.profilerInstance.profilerConf.executorMemory = "" + (parseFloat(json['profilerConf'].executorMemory) || "");
      this.profilerInstanceConfig.profilerInstance.profilerConf.driverMemory = "" + (parseFloat(json['profilerConf'].driverMemory) || "");

      this.jsonStr = JSON.stringify(json, null, 2);

      this.profilerDisplayName = this.profilerInstanceConfig.profilerInstance.displayName;
    });

    this.profilerService.getYarnQueueList(this.clusterId).subscribe(resp => {
      this.yarnQueueList = resp;
    });
  }

  save() {
    if (!this.isValid()) {
      return;
    }

    const saveRequest = [];
    if (this.profilerStatus !== this.profilerInstanceConfig.profilerInstance.active) {
      saveRequest.push(this.profilerService.putProfilerState(this.clusterId, this.profilerInstanceConfig.profilerInstance.name, this.profilerStatus));
    }

    const profilerSelectorConfig = new ProfilerSelectorConfig(this.profilerSelector.name, this.cronConfig);
    const profilerInstanceWithSelectorConfig = new ProfilerInstanceWithSelectorConfig(
            this.profilerInstanceConfig.profilerInstance, profilerSelectorConfig);
    saveRequest.push(this.profilerService.updateProfilerInstanceWithSelectorConfig(this.clusterId, profilerInstanceWithSelectorConfig));

    try {
     Observable.forkJoin(saveRequest).subscribe(resp => {
          console.log(resp);
          Alerts.showConfirmation('Profiler configuration saved successfully');
         this.onClose(true);
       }, error => {
          if(error.error) {
            try {
              let err = JSON.parse(error.error.substring(error.error.indexOf("Body ") + 5)).errors[0].message;
              Alerts.showError(`Error: ${err}`);              
            }
            catch (e) {
              Alerts.showError(`Error:${error.error}`);
            }
          }
          else
            Alerts.showError(`Error:${error.message}`);
       })
   } catch (e) {
     Alerts.showError(`Invalid configuration:${e.message}`);
   }
  }

  onClose(configSaved = false) {
    this.close.emit(configSaved);
  }

  private setProfilerInstanceConfig() {
    this.profilerStatus = this.profilerInstanceConfig.profilerInstance.active;
    this.profilerDisplayName = this.profilerInstanceConfig.profilerInstance.displayName;
  }

  private setProfilerRunConfig(profilerSelectors: ProfilerSelector[]) {
    this.profilerSelector = profilerSelectors.find(s => s.profilerInstanceName === this.profilerInstanceConfig.profilerInstance.name);
    if (this.profilerSelector) {
      this.cronConfig = this.profilerSelector.config
    }
  }

  allowOnlyNumbers(event) {
    return (event.charCode == 8 || event.charCode == 0) ? null : event.charCode >= 48 && event.charCode <= 57;
  }

  private isValid() {
    let errorMessage = [];
    if (this.profilerInstanceConfig.profilerInstance.profilerConf.executorMemory && this.profilerInstanceConfig.profilerInstance.profilerConf.executorMemory.length > 0) {
      const executorMemory  = this.profilerInstanceConfig.profilerInstance.profilerConf.executorMemory.replace(/m$/, '').replace(/g$/, '');
      if (isNaN(Number(executorMemory))) {
        errorMessage.push('Executor Memory');
      }
    }
    if (this.profilerInstanceConfig.profilerInstance.profilerConf.driverMemory && this.profilerInstanceConfig.profilerInstance.profilerConf.driverMemory.length > 0) {
      const driverMemory  = this.profilerInstanceConfig.profilerInstance.profilerConf.driverMemory.replace(/m$/, '').replace(/g$/, '');
      if (isNaN(Number(driverMemory))) {
        errorMessage.push('Driver Memory');
      }
    }

    if (errorMessage.length > 0) {
      Alerts.showError(`Invalid values for :${errorMessage.join(',')}. Format should be 200m or 2g`);
      return false;
    }

    if (this.profilerInstanceConfig.profilerInstance.name === 'tablestats') {
      if (this.profilerInstanceConfig.profilerInstance.jobConf.samplepercent && this.profilerInstanceConfig.profilerInstance.jobConf.samplepercent.length > 0 &&
           Number(this.profilerInstanceConfig.profilerInstance.jobConf.samplepercent) > 100) {
        Alerts.showError(`Invalid values for Sample Percentage value cannot be greater than 100`);
        return false;
      }
    }

    return true;
  }
}
