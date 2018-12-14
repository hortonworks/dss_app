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

import {Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import {chartColors} from '../../utils/constants';
import {DpPieChartModel, DpPieChartOptionsModel} from '../dp-chart-model';

declare const d3: any;
declare const nv: any;


@Component({
  selector: 'dp-pie',
  templateUrl: './dp-pie.component.html',
  styleUrls: ['./dp-pie.component.scss']
})

export class DpPieComponent implements OnInit, OnChanges, DpChart {

  @ViewChild('svgElement') svgElement: ElementRef;
  @Input() chartModel: DpPieChartModel;
  @Input() options: DpPieChartOptionsModel;

  defaultOptions = <DpPieChartOptionsModel> {
    color: [chartColors.RED, chartColors.BLUE],
    donut: false,
    labelType: 'percent',
    margin: { top: 30, right: 30, bottom: 20, left: 20 }
  };

  private chart: nv.PieChart;

  constructor() { }

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes && changes['chartModel'] && changes['chartModel'].currentValue){
      this.svgElement.nativeElement.classList.remove('loader');
      this.renderChart();
    }
  }

  private renderChart() {
    const options = Object.assign(this.defaultOptions, this.options);

    nv.addGraph(() => {
      this.chart = nv.models.pieChart()
        .x(function (d) {
          return d.key;
        })
        .y(function (d) {
          return d.y;
        })
        .donut(options.donut)
        .color(options.color)
        .valueFormat((val) => '')
        .labelType(options.labelType)
        .margin(options.margin);

      this.chart.pie.labelsOutside(true).donut(options.donut);
      this.chart.legend.align(false);

      d3.select(this.svgElement.nativeElement)
        .datum(this.chartModel.data.map(m => ({key: m.key, y: m.value})))
        .transition().duration(1200)
        .call(this.chart);

      nv.utils.windowResize(this.chart.update);
      return this.chart;
    });
  }

  // Todo: Handle error
  private handleError() {

  }

  public refreshChart() {
    this.chart.update();
  }
}
