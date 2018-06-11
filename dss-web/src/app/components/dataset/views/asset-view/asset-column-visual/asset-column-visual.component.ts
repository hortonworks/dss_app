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

import {Component, Input, OnInit} from '@angular/core';

declare var d3: any;
declare var nv: any;

@Component({
  selector: 'asset-column-visual',
  templateUrl: './asset-column-visual.component.html',
  styleUrls: ['./asset-column-visual.component.scss']
})

export class AssetColumnVisualComponent implements OnInit{

	@Input() data;
	onlyHisto :boolean = true;
	showPi : boolean = false;
	noDataAvailable : boolean = false;
	dataVisualizationColors: string[] = ["#f44336", "#E91E63", "#9C27B0", "#673AB7", "#3F51B5", "#2196F3", "#03A9F4", "#00BCD4", "#009688", "#4CAF50", "#8BC34A", "#FFEB3B", "#FFC107", "#FF9800", "#FF5722", "#9E9E9E", "#607D8B", "#f44336", "#E91E63", "#9C27B0", "#673AB7", "#3F51B5", "#2196F3", "#03A9F4", "#00BCD4", "#009688", "#4CAF50", "#8BC34A", "#FFEB3B", "#FFC107", "#FF9800", "#FF5722", "#9E9E9E", "#607D8B", "#1976D2", "#b71c1c", "#1A237E", "#0D47A1"];

	ngOnInit () {
		if(!this.data || !this.data.histogram && !this.data.quartiles) {
	  	  this.noDataAvailable = true;
		  return;
		}
		if(this.data.quartiles && JSON.parse(this.data.quartiles).length > 0)
			this.onlyHisto = false;
		if(this.data.cardinality < 11)
			this.showPi = true;
		if(this.data.histogram) {
	      if (this.showPi)
	        this.drawPiChart();
	      else
	        this.drawHisto();
	    }
		if(this.onlyHisto) return;
		this.drawBoxPlot();
	}
	drawHisto () {
		var _this = this;
		nv.addGraph(function() {
			var dataa = _this.getDataForHistogram();
	        var chart = nv.models.discreteBarChart()
	            .x(function(d) { return d.label })
	            .y(function(d) { return d.value })
	            .staggerLabels(false)
	            //.staggerLabels(historicalBarChart[0].values.length > 8)
	            .showValues(false)
	            .duration(0)
	            ;
	        chart.xAxis.axisLabel(_this.data.name);
	        chart.yAxis.axisLabel("Count");
	        chart.yAxis.tickFormat(d3.format('d'));
	        d3.select('#chart1 svg')
	            .datum(dataa)
	            .call(chart);
	        nv.utils.windowResize(chart.update);

	        var barsWidth:number = d3.select(".nv-barsWrap").node()['getBoundingClientRect']().width;
	        var padding=1, allowedWidth = barsWidth/dataa[0].values.length;

	        function wrap() {
			  var self = d3.select(this),
			    textLength = self.node()['getComputedTextLength'](),
			    text = self.text();
			  while (textLength > (allowedWidth - 2 * padding) && text.length > 0) {
			    text = text.slice(0, -1);
			    self.text(text + '...');
			    textLength = self.node()['getComputedTextLength']();
			  }
			}
			d3.select(".nv-axis")
				.selectAll(".tick")
				.selectAll("text")
				.html("")
				.append('tspan').text(function(d) {
				return d;
				}).each(wrap);

			(_this.data.type != "string") && d3.select(".nv-axis")
				.selectAll(".tick")
				.selectAll("text")
				.attr('transform', function(d,i,j) { return 'translate (-'+allowedWidth/2 +', 8)' }) ;

	        // var label = d3.select(".nv-axislabel");
	        // label.attr("y", +(label.attr("y"))-5);

	        return chart;
	    });
	}
	getDataForHistogram () {
		return [{
			values: JSON.parse(this.data.histogram).map(obj=>{return {"label":(obj.bin.toFixed)?obj.bin.toFixed(2):obj.bin, "value":obj.count, "color": "#60A947"}}),
			key: this.data.name,
			color: "#ff7f0e"
		}];
	}
	drawBoxPlot () {
		var domainRange = this.data.maxValue - this.data.minValue;
		var _this = this;
		nv.addGraph(function() {
		var chart = nv.models.boxPlotChart()
			  .x(function(d) { return d.label })
			  .staggerLabels(true)
			  .maxBoxWidth(75) // prevent boxes from being incredibly wide
			  .yDomain([_this.data.minValue-domainRange/10, _this.data.maxValue+domainRange/10])
			  ;
		chart.yAxis.axisLabel(_this.data.name);

		d3.select('#chart2 svg')
		  .datum(_this.getDataForBoxPlot())
		  .call(chart);
		nv.utils.windowResize(chart.update);
		return chart;
		});
	}
	getDataForBoxPlot () {
		var quartiles = JSON.parse(this.data.quartiles);
		return [{
          label: "Boxplot with max, min and mean",
          values: {
            Q1: quartiles[1].value,
            Q2: quartiles[2].value,
            Q3: quartiles[3].value,
            whisker_low: quartiles[0].value,
            whisker_high: quartiles[4].value,
            outliers: [this.data.maxValue, this.data.meanValue, this.data.minValue]
          }
        }]
	}
	drawPiChart () {
		var _this = this;
		nv.addGraph(function() {
      var chart = nv.models.pieChart()
        .x(function(d) { return d.key })
			  .y(function(d) { return d.y })
        .donutLabelsOutside(true)
        .showTooltipPercent(true)
        .color(_this.dataVisualizationColors);
			d3.select("#chart1 svg")
				.datum(_this.getDataForPiChart())
				.transition().duration(1200)
				// .attr('width', width)
				// .attr('height', height)
				.call(chart);
			return chart;
		});
	}
	getDataForPiChart () {
		return JSON.parse(this.data.histogram).map(obj=>{return {"key":(obj.bin.toFixed)?obj.bin.toFixed(2):obj.bin, "y":obj.count}});
	}

}
