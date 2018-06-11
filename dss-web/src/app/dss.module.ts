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

import { BrowserModule } from '@angular/platform-browser';
import {APP_INITIALIZER, NgModule} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {Http, HttpModule, RequestOptions} from '@angular/http';
import {RouterModule} from '@angular/router';
import {TranslateHttpLoader} from '@ngx-translate/http-loader';
import {TranslateLoader, TranslateModule, TranslateService} from '@ngx-translate/core';
import {TranslateStore} from '@ngx-translate/core/src/translate.store';

import { AppComponent } from './dss.component';
import {routes} from './dss.routes';
import {CollapsibleNavModule} from './shared/collapsible-nav/collapsible-nav.modue';
import {HeaderModule} from './shared/header/header.module';
import {AuthenticationService} from './services/authentication.service';
import {CommentsModule} from './shared/comments/comments.module';
import {BaseDssRequestOptions} from './dss-request-options';
import {MdlService} from './services/mdl.service';
import {MdlDirective} from './shared/directives/mdl.directive';
import {DssAppEvents} from './services/dss-app-events';
import {LakeService} from './services/lake.service';
import {navigation} from './_nav';
import {DataLakeDashboardModule} from './components/data-lake-dashboard/data-lake-dashboard.module';
import {ProfilersDashboardModule} from './components/profilers-dashboard/profilers-dashboard.module';
import {DatasetModule} from './components/dataset/dataset.module';

export function HttpLoaderFactory(http: Http) {
  return new TranslateHttpLoader(http);
}

export function startupServiceFactory(authenticationService: AuthenticationService, lakeService: LakeService) {
  return () => authenticationService.loadUser()
              .then(() => lakeService.listWithClustersAsPromise())
              .then((lakes) => {
                const dashboard = navigation.find(n => (n.name === 'Dashboard'));
                lakes = lakes.sort((a, b) => a.data.name.localeCompare(b.data.name));
                dashboard.children = lakes.map(lake =>
                  ({name: `${lake.data.name}, ${lake.data.dcName}`,
                    url: `/dss/data-lake-dashboard/${lake.clusters[0].id}`, iconClassName: ''
                  }));
              });
}

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    RouterModule.forRoot(routes),
    CollapsibleNavModule,
    HeaderModule,
    CommentsModule,
    DatasetModule,
    DataLakeDashboardModule,
    ProfilersDashboardModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [Http]
      }
    })
  ],
  declarations: [
    AppComponent,
    MdlDirective
  ],
  providers: [
      MdlService,
      TranslateStore,
      TranslateService,
      DssAppEvents,
      AuthenticationService,
      LakeService,
      {
        provide: APP_INITIALIZER,
        useFactory: startupServiceFactory,
        deps: [AuthenticationService, LakeService],
        multi: true
      },
      { provide: RequestOptions,
        useClass: BaseDssRequestOptions
      }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
