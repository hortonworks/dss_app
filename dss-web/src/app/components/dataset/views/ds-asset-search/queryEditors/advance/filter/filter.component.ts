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

import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {AssetOwnerModel} from "../../../../../models/assetOwnerModel";
import {AssetOwnerService} from "../../../../../services/assetOwnerService";
import {
  AssetSetQueryFilterModel, AssetTypeEnum,
  AssetTypeEnumString
} from "../../../../ds-assets-list/ds-assets-list.component";
import {DsAssetsService} from "../../../../../services/dsAssetsService";

export enum FilterOperatorEnum {LT, LTEQ, EQ, NOTEQ, GTEQ, GT, LIKE} // LIKE is contains
export const FilterOperatorSymbols = ["<", "<=", "==", "!=", "=>", ">", "Contains"];
export const FilterOperatorForQuery = ["lt", "lte", "equals", "nte", "gte", "gt", "contains"];

const FOEnum = FilterOperatorEnum;

export class QueryFilterObject {
  propertyName: string = "";
  dataType : string = "string";
  operators: FilterOperatorEnum[] = [];
  selectedOperator: FilterOperatorEnum = -1;
  helpText: string = "";
  _value: (string | number | boolean) = "";
  valueOptions: any[] = null;
  validationRegEx = /[^$|\s+]/; // not empty or just whitespace
  validity: boolean = false;

  getValue() {
    return this._value;
  }

  getOperatorDisplay(enmVal: FilterOperatorEnum) {
    return FilterOperatorSymbols[enmVal];
  }
  getOperatorForQuery(enmVal: FilterOperatorEnum) {
    return FilterOperatorForQuery[enmVal];
  }

  validate() {
    return this.validity = (this.selectedOperator == -1) ? false : (
      (this.valueOptions) ? ((this._value == -1) ? false : true) : (
        this.validationRegEx.test(this._value as string)));
  }

  getFilterData() {
    return new AssetSetQueryFilterModel(this.propertyName, this.getOperatorForQuery(this.selectedOperator), this.getValue(), this.dataType);
  }
}

export class QueryFilterSource extends QueryFilterObject {
  propertyName: string = "asset.source";
  operators: FilterOperatorEnum[] = [FOEnum.EQ, FOEnum.NOTEQ];
  helpTextKey: string = 'pages.dataset.asset-query.filter.source';
  _value: number = -1;
  valueOptions: AssetTypeEnum[] = [AssetTypeEnum.HIVE, AssetTypeEnum.HDFS];

  getValue() {
    return AssetTypeEnumString[this.valueOptions[this._value]];
  }
}

export class QueryFilterTypeString extends QueryFilterObject {
  operators: FilterOperatorEnum[] = [FOEnum.EQ, FOEnum.NOTEQ, FOEnum.LIKE];
  helpTextKey: string = 'pages.dataset.asset-query.filter.string';
  _value: string;

  constructor(public propertyName: string, public dataType: string) {
    super();
  }
}
export class QueryFilterTypeString1 extends QueryFilterTypeString {
  operators: FilterOperatorEnum[] = [FOEnum.EQ, FOEnum.NOTEQ];
}

export class QueryFilterTypeBoolean extends QueryFilterObject {
  operators: FilterOperatorEnum[] = [FOEnum.EQ, FOEnum.NOTEQ];
  helpTextKey: string = 'pages.dataset.asset-query.filter.boolean';
  _value: number = -1;
  valueOptions: string[] = ["false", "true"];

  constructor(public propertyName: string, public dataType: string) {
    super();
  }

  getValue() {
    return this.valueOptions[this._value];
  }
}

export class QueryFilterTypeDate extends QueryFilterObject {
  operators: FilterOperatorEnum[] = [FOEnum.EQ, FOEnum.NOTEQ, FOEnum.LT, FOEnum.GT];
  helpTextKey: string = 'pages.dataset.asset-query.filter.date';
  _value: string;

  constructor(public propertyName: string, public dataType: string) {
    super();
  }
}

export class QueryFilterTypeTag extends QueryFilterObject {
  operators: FilterOperatorEnum[] = [FOEnum.EQ];
  helpTextKey: string = 'pages.dataset.asset-query.filter.tag';
  _value: string;

  constructor(public propertyName: string, public dataType: string, public valueOptions: string[]) {
    super();
  }
}

@Component({
  selector: "query-filter",
  styleUrls: ["./filter.component.scss"],
  templateUrl: "./filter.component.html"
})
export class QueryFilter implements OnInit {
  @Input() avoidNewLine: boolean = false;
  @Input() clusterId:number;
  @Output("onClose") closeEmitter: EventEmitter<null> = new EventEmitter<null>();
  @Output("onInputEnter") enterEmitter: EventEmitter<null> = new EventEmitter<null>();
  filterObject: QueryFilterObject = null;
  availableFilters: any[] = [
    {display: "Select Filter Type", dataType: "QueryFilterObject"}
  ];
  owners: AssetOwnerModel[] = [];
  tagsAvailable: string[] = [];

  constructor(private ownerService: AssetOwnerService,
              private assetService: DsAssetsService) {
  }

  ngOnInit() {
    // this.ownerService.list().subscribe(owners => this.owners = owners);
    this.assetService.getQueryAttribute(this.clusterId).subscribe(qryAtrs => {
      qryAtrs.forEach(qryAtr=>(qryAtr.name != "retention" && qryAtr.dataType != "date") && this.availableFilters.push(
        {display: qryAtr.name, dataType: qryAtr.dataType, propertyName: qryAtr.name}
      ));
    });

    this.assetService.tagsQuery(this.clusterId).subscribe(tags => {
      this.tagsAvailable = tags;
    });
  }

  onFilterTypeChange(e) {
    const fltr = this.availableFilters[e.target.value];
    switch (fltr.dataType) {
      case "string" :
        let pn=fltr.propertyName
        if(pn == "tableType" || pn == "owner" || pn == "viewExpandedText" || pn == "viewOriginalText" || pn == "comment")
          this.filterObject = new QueryFilterTypeString1(fltr.propertyName, fltr.dataType);
        else
          this.filterObject = new QueryFilterTypeString(fltr.propertyName, fltr.dataType);
        break;
      case "boolean"  :
        this.filterObject = new QueryFilterTypeBoolean(fltr.propertyName, fltr.dataType);
        break;
      case "date"  :
        this.filterObject = new QueryFilterTypeDate(fltr.propertyName, fltr.dataType);
        break;
      case "tag" :
        this.filterObject = new QueryFilterTypeTag(fltr.propertyName, fltr.dataType, this.tagsAvailable);
        break;
      default                 :
        this.filterObject = new QueryFilterObject();
        break;
    }
  }

  validate() {
    this.filterObject.validate();
  }

  onCloseClick() {
    this.closeEmitter.emit();
  }

  onEnterClick() {
    this.enterEmitter.emit();
  }

  onKeyDown (event) {
    (event.keyCode === 13) && this.onEnterClick();
  }
}
