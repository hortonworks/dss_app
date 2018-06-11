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
import {AfterViewInit, Input, Component, ElementRef, HostListener, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {AssetService} from '../../../../../../services/asset.service';
import {IMyDrpOptions, IMyDateRangeModel} from 'mydaterangepicker';

declare const d3: any;
declare const nv: any;

@Component({
  selector: 'dp-audit-visualization',
  templateUrl: './audit-visualization.component.html',
  styleUrls: ['./audit-visualization.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AuditVisualizationComponent implements OnInit, AfterViewInit {

  @Input() assetName;
  @Input() dbName;
  @Input() clusterId: string;

  @ViewChild('stackedbarchart') stackedBarChart: ElementRef;
  @ViewChild('donutchart') donutChart: ElementRef;

  filterOptions: any[] = [];
  filters = [];
  userName: string;
  showFilterListing = false;
  selectedFilterIndex = -1;
  private availableFilterCount = 0;

  // users = ['insurance_admin', 'admin', 'customer'];
  result = ['Authorized', 'Unauthorized'];

  userChangeTimer:any = null;

  today = new Date();
  lastWeek = new Date(this.today.getTime() - 7*24*60*60*1000);
  myDateRangePickerOptions: IMyDrpOptions = {
    dateFormat: 'dd mmm yyyy',
    editableDateRangeField: false,
  };
  dateModel: Object = {
    beginDate: {year: this.lastWeek.getFullYear(), month: 1+this.lastWeek.getMonth(), day: this.lastWeek.getDate()},
    endDate: {year: this.today.getFullYear(), month: 1+this.today.getMonth(), day: this.today.getDate()}
  };

  @HostListener('document:click', ['$event', '$event.target'])
  public onClick($event: MouseEvent, targetElement: HTMLElement): void {
    if (targetElement.id === 'search') {
      return;
    }
    this.showFilterListing = false;
  }

  bar_data = [
    {
      id:'allowed',
      key: 'Allowed',
      color: '#16b273',
      values: []
    },
    {
      id:'denied',
      key: 'Unauthorised',
      color: '#f0685c',
      values: []
    }
  ];

  static optionListClass = 'option-value';
  static highlightClass = 'highlighted-filter';

  filterFields = [
    {key: 'user', display: 'User'},
    {key: 'result', display: 'Result'}];

  constructor(private assetService: AssetService) {
  }


  ngAfterViewInit() {
//    this.createStackedBarChart(this.test_data);
//    this.createDonutChart(this.donutChartData);
  }

  ngOnInit() {
    this.onParamChange();
  }
  noDate:boolean=false;
  onDateRangeChanged(model: IMyDateRangeModel){
    //this.dateModel = model;
    this.noDate=false
    setTimeout(()=>{
      if(!this.dateModel) this.noDate=true;
      else this.onParamChange();
    }, 100);
  }

  onUserChange () {
    this.userChangeTimer && clearTimeout(this.userChangeTimer);
    this.userChangeTimer = setTimeout(()=>this.onParamChange(), 300);
  }

  barChartLoading:boolean = false;
  barChartLoading503:boolean = false;
  paiChartLoading:boolean = false;
  paiChartLoading503:boolean = false;
  noPaiData = false;
  noBarData = false;
  onParamChange() {
    this.reloadBarChart();
    this.reloadPiChart();
  }

  reloadBarChart () {
    this.barChartLoading = true;
    this.barChartLoading503 = false;
    this.noBarData = false;
    let results={"allowed":[], "denied":[]};
    this.bar_data.forEach(obj=>obj.values=results[obj.id]);
    this.assetService.getProfilerAuditResults(this.clusterId, this.dbName, this.assetName, this.userName, this.dateModel).subscribe (
      res=> {
        this.barChartLoading = false;
        res.data.forEach(itm => {
          itm.result && results.allowed.push({"x":itm.date, "y":itm.result["1"]||0});
          itm.result && results.denied.push({"x":itm.date, "y":itm.result["0"]||0});

        });
        this.createStackedBarChart(this.bar_data);
      },
      err => {
        if(err.status === 503) {
          this.barChartLoading = false;
          this.barChartLoading503 = true;
          setTimeout(() => this.reloadBarChart(), 10000);
        }
        if(err.status === 500) {
          this.barChartLoading = false;
          this.noBarData = true;
        }
      }
    );
  }
  reloadPiChart () {
    this.paiChartLoading = true;
    this.paiChartLoading503 = false;
    this.noPaiData = false;
    this.assetService.getProfilerAuditActions(this.clusterId, this.dbName, this.assetName, this.userName, this.dateModel).subscribe (
      res=> {
        this.paiChartLoading = false;
        var data={}, donutData=[];
        res.data.forEach(itm => {
          for(var acn in itm.action) {
            if(!data[acn]) data[acn] = 0;
            data[acn] += itm.action[acn];
          }
        })
        for (var key in data) {
          donutData.push({"label":key, "value":data[key]});
        }
        this.createDonutChart(donutData);
      },
      err => {
        if(err.status === 503) {
          this.paiChartLoading = false;
          this.paiChartLoading503 = true;
          setTimeout(() => this.reloadPiChart(), 10000);
        }
        if(err.status === 500) {
          this.paiChartLoading = false;
          this.noPaiData = true;
        }
      }
    );
  }

  createStackedBarChart(chartData) {
    let self = this;
    nv.addGraph({
      generate: function () {
        let width = self.stackedBarChart.nativeElement.style.width,//nv.utils.windowSize().width,
          height = self.stackedBarChart.nativeElement.style.height; //nv.utils.windowSize().height;
        let chart = nv.models.multiBarChart()
          .width(width)
          .height(height)
          .stacked(true);
        chart.tooltip.contentGenerator(function (data) {
          let i = data.index;
          let tooltip = '<div class="chart-tooltip">';
          if (chartData.length > 1) {
            tooltip += '<div><i class="fa fa-circle" style="color: ' + chartData[0].color + '"></i> <strong class="value">' + chartData[0].values[i].y + '</strong>' + chartData[0].values[i].key + '</div>';
            tooltip += '<div><i class="fa fa-circle" style="color: ' + chartData[1].color + '"></i> <strong class="value">' + chartData[1].values[i].y + '</strong>' + chartData[1].values[i].key + '</div>';
          } else {
            tooltip += '<div><i class="fa fa-circle" style="color: ' + chartData[0].color + '"></i> <strong class="value">' + chartData[0].values[i].y + '</strong>' + chartData[0].values[i].key + '</div>';
          }

          return tooltip;
        });
        chart.dispatch.on('renderEnd', function () {
          console.log('Render Complete');
        });
        chart.groupSpacing(0.7);
        let svg = d3.select('#allowedVsUnauthorisedAccess svg').datum(chartData);
        console.log('calling chart');
        svg.transition().duration(500).call(chart);
        d3.select('#allowedVsUnauthorisedAccess svg')
          .attr('width', width)
          .attr('height', height)
          .transition().duration(0);

        return chart;
      },
      callback: function (graph) {
        nv.utils.windowResize(function () {
          let width = self.stackedBarChart.nativeElement.style.width,//nv.utils.windowSize().width,
            height = self.stackedBarChart.nativeElement.style.height; //nv.utils.windowSize().height;
          graph.width(width).height(height);
          d3.select('#allowedVsUnauthorisedAccess svg')
            .attr('width', width)
            .attr('height', height)
            .transition().duration(0)
            .call(graph);
        });
      }
    });
  }

  createDonutChart(chartData:any[]) {
    let self = this;
    let myColors = ['#16b273', '#128fc4'];
    d3.scale.myColors = function () {
      return d3.scale.ordinal().range(myColors);
    };
    let count:any = 0;
    chartData.forEach(obj=>count+=obj.value);
    count = count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count;
    nv.addGraph({
      generate: function () {
        let width = self.donutChart.nativeElement.width,//nv.utils.windowSize().width,
          height = self.donutChart.nativeElement.height; //nv.utils.windowSize().height;
        let chart = nv.models.pieChart()
          .x(function (d) {
            return d.label
          })
          .y(function (d) {
            return d.value
          })
          .showLabels(true)     //Display pie labels
          .labelThreshold(.05)  //Configure the minimum slice size for labels to show up
          .labelType('percent') //Configure what type of data to show in the label. Can be "key", "value" or "percent"
          .donut(true)          //Turn on Donut mode. Makes pie chart look tasty!
          .donutRatio(0.35)     //Configure how big you want the donut hole size to be.
          .pieLabelsOutside(true)
          .title(count)
          .color(d3.scale.myColors().range());
        chart.dispatch.on('renderEnd', function () {
          console.log('Render Complete');
        });
        let svg = d3.select('#selectVsUpdate svg').datum(chartData);
        console.log('calling chart');
        svg.transition().duration(500).call(chart);
        d3.select('#selectVsUpdate svg')
          .attr('width', width)
          .attr('height', height)
          .transition().duration(0);

        return chart;
      },
      callback: function (graph) {
        nv.utils.windowResize(function () {
          let width = self.donutChart.nativeElement.width,//nv.utils.windowSize().width,
            height = self.donutChart.nativeElement.height; //nv.utils.windowSize().height;
          graph.width(width).height(height);
          d3.select('#selectVsUpdate svg')
            .attr('width', width)
            .attr('height', height)
            .transition().duration(0)
            .call(graph);
        });
      }
    });
  }

  private highlightSelected() {
    let filterOptions = document.getElementsByClassName(AuditVisualizationComponent.optionListClass);
    let highlighted = document.getElementsByClassName(AuditVisualizationComponent.highlightClass);
    for (let i = 0; i < highlighted.length; i++) {
      let elt = highlighted.item(i);
      elt.className = 'option-value';
    }
    let highlightedOption: any = filterOptions[this.selectedFilterIndex];
    highlightedOption.focus();
    highlightedOption.className += ` ${AuditVisualizationComponent.highlightClass}`;
  }

  // handleKeyboardEvents(event, display?, key?, value?) {
  //   let keyPressed = event.keyCode || event.which;
  //   if (keyPressed === 40 && this.selectedFilterIndex < this.availableFilterCount - 1) {
  //     ++this.selectedFilterIndex;
  //     this.highlightSelected();
  //     return;
  //   } else if (keyPressed === 38 && this.selectedFilterIndex !== 0) {
  //     --this.selectedFilterIndex;
  //     this.highlightSelected();
  //     return;
  //   } else if (keyPressed === 13 && this.selectedFilterIndex !== -1) {
  //     // this.addToFilter(display, key, value);
  //     return;
  //   }
  // }

  // filter() {
    // if (this.filters.length === 2) {
    //   this.createStackedBarChart(this.test_data_per_user);
    //   let resultFilter = this.filters.find(filter => filter.key === 'result');
    //   if (resultFilter.value === 'Authorized') {
    //     this.createStackedBarChart(this.test_data_authorised_per_user);
    //   } else {
    //     this.createStackedBarChart(this.test_data_unauthorised_per_user);
    //   }
    // } else if (this.filters.length === 1 && this.filters.find(filter => filter.key === 'user')) {
    //   this.createStackedBarChart(this.test_data_per_user);
    //   this.createDonutChart(this.donutChartDataPerUser);
    // } else if (this.filters.length === 1 && this.filters.find(filter => filter.key === 'result')) {
    //   let resultFilter = this.filters.find(filter => filter.key === 'result');
    //   if (resultFilter.value === 'Authorized') {
    //     this.createStackedBarChart(this.test_data_allowed);
    //   } else {
    //     this.createStackedBarChart(this.test_data_unauthorised);
    //   }
    // } else {
    //   this.createStackedBarChart(this.test_data);
    //   this.createDonutChart(this.donutChartData);
    // }
    // this.selectedFilterIndex = -1;
  // }

  // removeFilter(filter) {
  //   for (let i = 0; i < this.filters.length; i++) {
  //     let filterItem = this.filters[i];
  //     if (filterItem.key === filter.key && filterItem.value === filter.value) {
  //       this.filters.splice(i, 1);
  //       break;
  //     }
  //   }
  //   this.filter();
  // }

  // addToFilter(display, key, value) {
  //   if (!this.filters.find(filter => filter.key === key && filter.value === value)) {
  //     this.filters.push({'key': key, 'value': value, 'display': display});
  //   }
  //   this.filter();
  //   this.searchText = '';
  //   this.showFilterListing = false;
  // }

  // showOptions(event) {
  //   let keyPressed = event.keyCode || event.which;
  //   if (keyPressed === 38 || keyPressed === 40) {
  //     this.handleKeyboardEvents(event);
  //   } else {
  //     this.filterOptions = [];
  //     let term = event.target.value.trim().toLowerCase();
  //     if (term.length === 0) {
  //       this.selectedFilterIndex = -1;
  //       this.showFilterListing = false;
  //       return;
  //     }
  //     this.availableFilterCount = 0;
  //     if (!this.filters.find(option => option.key === 'user')) {
  //       let users = this.users.filter(user => user.toLowerCase().indexOf(term) >= 0);
  //       if (users && users.length) {
  //         this.filterOptions.push({'displayName': 'User', 'key': 'user', values: users});
  //         this.availableFilterCount += users.length
  //       }
  //     }
  //     if (!this.filters.find(option => option.key === 'result')) {
  //       let result = this.result.filter(res => res.toLowerCase().indexOf(term) >= 0);
  //       if (result && result.length) {
  //         this.filterOptions.push({'displayName': 'Result', 'key': 'result', values: result});
  //         this.availableFilterCount += result.length;
  //       }
  //     }

  //     this.showFilterListing = true;
  //   }
  // }
}
