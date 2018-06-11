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

import {Component, ViewChild, ElementRef, OnInit, HostBinding, isDevMode} from '@angular/core';
import {NavigationEnd, NavigationStart, Router} from '@angular/router';
import {DpAppNavigation} from 'dps-apps';
import {navigation} from '../../_nav';
import {DssAppEvents} from '../../services/dss-app-events';

@Component({
  selector: 'dss-collapsible-nav',
  templateUrl: './collapsible-nav.component.html',
  styleUrls: ['./collapsible-nav.component.scss']
})
export class CollapsibleNavComponent implements OnInit {
  activeTabName: string = '';
  navItems = navigation;
  assetPrefix = isDevMode() ? '' : 'dss';
  dssLogoPath = `${this.assetPrefix}/assets/images/dss-logo-white.png`;

  @ViewChild('personaNavSrc') personaNavSrc: ElementRef;
  @HostBinding('class.dss-sidebar-collapsed') collapseSideNav = false;

  constructor(private router: Router,
              private dssAppEvents: DssAppEvents) {}

  ngOnInit() {
    DpAppNavigation.init({
        srcElement: this.personaNavSrc.nativeElement,
        assetPrefix: '/assets/images'
    });
    this.router.events.subscribe( event => {
      if (event instanceof NavigationEnd) {
        this.setActiveNavFromBrowserLocation()
      }
    });
  }

  setActiveNavFromBrowserLocation() {
    const items = JSON.parse(JSON.stringify(this.navItems));
    const currentURL = window.location.pathname;
    for (let i = 0; i < items.length; i++) {
      const nav = items[i];
      if (nav.children && nav.children.length > 0) {
        items.push(...nav.children);
      }
      if (nav.url === currentURL) {
        this.activeTabName = nav.name;
        break;
      }
    }
  }

  toggleNav() {
    this.collapseSideNav = !this.collapseSideNav;
    setTimeout(() => this.dssAppEvents.setSideNavCollapsed(this.collapseSideNav), 300);
  }

  onSideNavClick($event, nav) {
    $event.stopPropagation();

    if (nav.children && nav.children.length > 0) {
      if (!this.collapseSideNav) {
        nav.hidden = !nav.hidden;
      }
      return;
    }

    this.activeTabName = nav.name;
    this.router.navigateByUrl(nav.url);

    return false;
  }

  onSideNavMouseEnter(nav, children) {
    let childMenu = children.getElementsByClassName('sidenav-item-children')[0];
    if (this.collapseSideNav && childMenu) {
      childMenu.classList.add('active');
    }
  }

  onSideNavMouseLeave(nav, children) {
    let childMenu = children.getElementsByClassName('sidenav-item-children')[0];
    if (this.collapseSideNav && childMenu) {
      childMenu.classList.remove('active');
    }

  }
}
