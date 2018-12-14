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

import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {NguiAutoCompleteModule} from '@ngui/auto-complete';
import {PaginationModule} from '../../shared/pagination/pagination.module';
import {TaggingWidgetModule} from '../../shared/tagging-widget/tagging-widget.module';
import {DsAssetsService} from '../../services/dsAssetsService';
import {DsTagsService} from '../../services/dsTagsService';
import {RichDatasetService} from '../../services/RichDatasetService';
import {DatasetDashboardComponent} from './views/dashboard/dataset-dashboard.component';
import {DsNavResultViewer} from './views/dashboard/ds-result-viewer/ds-result-viewer.component';
import {DsRowProxy} from './views/dashboard/ds-result-viewer/row-proxy/row-proxy.component';
import {DsTileProxy} from './views/dashboard/ds-result-viewer/tile-proxy/tile-proxy.component';
import {NavTagPanelComponent} from './views/dashboard/nav-tag-panel/nav-tag-panel.component';
import {DsAssetSearch} from './views/ds-asset-search/ds-asset-search.component';
import {DsAssetSearchV2} from './views/ds-asset-search-v2/ds-asset-search.component';
import {AdvanceQueryEditor} from './views/ds-asset-search/queryEditors/advance/advance-query-editor.component';
import {QueryFilter} from './views/ds-asset-search/queryEditors/advance/filter/filter.component';
import {BasicQueryEditor} from './views/ds-asset-search/queryEditors/basic/basic-query-editor.component';
import {SearchWidget} from './views/ds-asset-search/queryEditors/basic/search-widget/search-widget.component';
import {DsAssetList} from './views/ds-assets-list/ds-assets-list.component';
import {DsAssetListStyle1} from './views/ds-assets-list/styled/style1';
import {DsAssetsHolder} from './views/ds-editor/ds-assets-holder/ds-assets-holder.component';
import {DsEditor} from './views/ds-editor/ds-editor.component';
import {DsCreator} from './views/ds-create/ds-creator.component';
import {DsInfoHolder} from './views/ds-editor/ds-info-holder/ds-info-holder.component';
import {UniqueDatasetNameValidator} from './directives/validators';
import {DsSummaryHolder} from './views/ds-editor/ds-summary-holder/ds-summary-holder.component';
import {DsFullView} from './views/ds-full-view/ds-full-view.component';
import {TranslateModule} from '@ngx-translate/core';
import {MyDateRangePickerModule} from 'mydaterangepicker';

import {AssetViewComponent} from './views/asset-view/asset-view.component';
import {DropdownModule} from '../../shared/dropdown/dropdown.module';
import {TabsModule} from '../../shared/tabs/tabs.module';
import {AssetDetailsViewComponent} from './views/asset-view/asset-details-view/asset-details-view.component';
import {AssetColumnVisualComponent} from './views/asset-view/asset-column-visual/asset-column-visual.component';
import {AssetAuditView} from './views/asset-view/asset-audit-view/asset-audit-view.component';
import {AssetPolicyView} from './views/asset-view/asset-policy-view/asset-policy-view.component';
import {LineageModule} from '../../shared/lineage/lineage.module';
import {AssetService} from '../../services/asset.service';
import {RangerService} from '../../services/ranger.service';
import {AuditVisualizationComponent} from './views/asset-view/asset-audit-view/audit-visualization/audit-visualization.component';
import {
  AssetTagPolicyViewComponent
} from './views/asset-view/asset-policy-view/asset-tag-policy-view/asset-tag-policy-view.component';
import {
  AssetResourcePolicyViewComponent
} from './views/asset-view/asset-policy-view/asset-resource-policy-view/asset-resource-policy-view.component';
import {RouterModule} from '@angular/router';
import {CommentsModule} from '../../shared/comments/comments.module';
import {DatasetTagService} from 'app/services/tag.service';
import {DataSetService} from '../../services/dataset.service';
import {CommentService} from '../../services/comment.service';
import {RatingService} from '../../services/rating.service';
import {FavouriteService} from '../../services/favourite.service';
import {BookmarkService} from '../../services/bookmark.service';
import {AssetCollectionEditComponent} from './views/asset-collection-edit/asset-collection-edit.component';
import {OverviewComponent} from './views/asset-collection-edit/overview/overview.component';
import {ProfilerService} from 'app/services/profiler.service';
import {TimeRangeButtonGroupModule} from '../../shared/time-range-button-group/time-range-button-group.module';
import {BorromeanRingsButtonModule} from '../../shared/borromean-rings-button/borromean-rings-button.module';
import {AssetViewOverviewComponent} from './views/asset-view/asset-view-overview/asset-view-overview.component';
import {AssetViewAsideSummaryComponent} from './views/asset-view/asset-view-aside-summary/asset-view-aside-summary.component';
import {ConfiguredTagsFilterPipe} from './views/asset-view/asset-details-view/configured-tags-filter.pipe';
import {
  ConfigColumnTagsDialogComponent
} from './views/asset-view/asset-details-view/config-column-tags-dialog/config-column-tags-dialog.component';
import {PipeModule} from '../../shared/pipe.module';
import {DisplayDpTagsFilterPipe} from './views/asset-view/display-dp-tags-filter.pipe';
import {DpChartsModule} from "../../shared/charts/charts.module";

@NgModule({
  declarations: [
    NavTagPanelComponent,
    DsNavResultViewer,
    DsTileProxy,
    DsFullView,
    DsEditor,
    DsCreator,
    DsInfoHolder,
    DsAssetsHolder,
    DsSummaryHolder,
    DsAssetList,
    DsAssetListStyle1,
    DsRowProxy,
    DatasetDashboardComponent,
    DsAssetSearchV2,
    DsAssetSearch,
    BasicQueryEditor,
    AdvanceQueryEditor,
    QueryFilter,
    SearchWidget,
    UniqueDatasetNameValidator,
    AssetViewComponent,
    AssetDetailsViewComponent,
    AssetColumnVisualComponent,
    AssetAuditView,
    AssetPolicyView,
    AuditVisualizationComponent,
    AssetTagPolicyViewComponent,
    AssetResourcePolicyViewComponent,
    AssetCollectionEditComponent,
    OverviewComponent,
    AssetViewOverviewComponent,
    AssetViewAsideSummaryComponent,
    ConfiguredTagsFilterPipe,
    DisplayDpTagsFilterPipe,
    ConfigColumnTagsDialogComponent
  ],
  entryComponents: [QueryFilter],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NguiAutoCompleteModule,
    TaggingWidgetModule,
    TranslateModule,
    PaginationModule,
    DropdownModule,
    TabsModule,
    LineageModule,
    RouterModule,
    MyDateRangePickerModule,
    CommentsModule,
    TimeRangeButtonGroupModule,
    BorromeanRingsButtonModule,
    DpChartsModule,
    PipeModule.forRoot()
  ],
  exports: [
    NavTagPanelComponent,
    DsNavResultViewer,
    DsTileProxy,
    DsFullView,
    DsEditor,
    DsCreator,
    DsInfoHolder,
    DsAssetsHolder,
    DsSummaryHolder,
    DsAssetList,
    DsRowProxy,
    DatasetDashboardComponent,
    DsAssetSearchV2,
    DsAssetSearch,
    BasicQueryEditor,
    AdvanceQueryEditor,
    QueryFilter,
    SearchWidget,
    AssetCollectionEditComponent,
    OverviewComponent
  ],
  providers: [
    RichDatasetService,
    DsAssetsService,
    DsTagsService,
    AssetService,
    RangerService,
    DatasetTagService,
    DataSetService,
    CommentService,
    RatingService,
    FavouriteService,
    BookmarkService,
    ProfilerService
  ]
})
export class DatasetSharedModule {
}
