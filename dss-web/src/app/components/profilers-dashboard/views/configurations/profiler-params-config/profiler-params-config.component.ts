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
import {ProfilerInstanceConfig} from '../../../../../models/profiler-config';
import {Alerts} from '../../../../../shared/utils/alerts';

@Component({
  selector: 'app-profiler-params-config',
  templateUrl: './profiler-params-config.component.html',
  styleUrls: ['./profiler-params-config.component.scss']
})
export class ProfilerParamsConfigComponent implements OnInit {
  @Input() profilerName = '';
  @Input() clusterId: number;

  @Output() close = new EventEmitter<boolean>();

  jsonStr: string;
  profilerInstanceConfig: ProfilerInstanceConfig;

  constructor(private profilerService: ProfilerService) { }

  ngOnInit() {
    this.profilerService.getProfilerInstanceByName(this.clusterId, this.profilerName)
      .subscribe(resp => {
        this.profilerInstanceConfig = resp;
        const json = {};
        json['profilerConf'] = this.profilerInstanceConfig.profilerInstance.profilerConf;
        json['jobConf'] = this.profilerInstanceConfig.profilerInstance.jobConf;
        json['queue'] = this.profilerInstanceConfig.profilerInstance.queue;

        this.jsonStr = JSON.stringify(json, null, 2);
      });
  }

  save() {
   try {
     const json = JSON.parse(this.jsonStr);
     this.profilerInstanceConfig.profilerInstance.profilerConf = json['profilerConf'];
     this.profilerInstanceConfig.profilerInstance.jobConf = json['jobConf'];
     this.profilerInstanceConfig.profilerInstance.queue = json['queue'];

     this.profilerService.updateProfilerInstance(this.clusterId, this.profilerInstanceConfig.profilerInstance)
       .subscribe(resp => {
         Alerts.showConfirmation('Profiler configuration saved successfully');
         this.onClose(true);
       }, error => {
         Alerts.showError(`Error:${error}`);
       });
   } catch (e) {
     Alerts.showError(`Invalid configuration:${e.message}`);
   }

  }

  onClose(configSaved = false) {
    this.close.emit(configSaved);
  }
}
