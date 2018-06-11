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

package utils

import com.hortonworks.dataplane.commons.domain.Entities.{Cluster, DataplaneCluster}
import com.hortonworks.dataplane.cs.Webservice.AmbariWebService
import com.hortonworks.dataplane.db.Webservice.{ClusterService, DpClusterService}
import com.hortonworks.dlm.beacon.domain.RequestEntities.RangerServiceDetails
import org.scalatest.mock.MockitoSugar
import org.scalatestplus.play.{OneAppPerTest, PlaySpec}
import org.mockito.Mockito._
import org.scalatest.concurrent.AsyncAssertions

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global


class EndpointServiceSpec extends PlaySpec with MockitoSugar with OneAppPerTest{

  "Endpoint Service" must {

    val aws = mock[AmbariWebService]
    val cs = mock[ClusterService]
    val dpc = mock[DpClusterService]

    when(aws.isSingleNode) thenReturn Future.successful(true)
    when(cs.retrieve("1")) thenReturn Future.successful(
      Right(
        Cluster(id = Some(1), name = "test", dataplaneClusterId = Some(1))))
    when(dpc.retrieve("1")) thenReturn Future.successful(
      Right(DataplaneCluster(
        id = Some(1),
        name = "test",
        dcName = "",
        description = "",
        ambariUrl = "http://10.0.0.0:8080",
        ambariIpAddress = "",
        location = Some(1),
        createdBy = Some(1),
        state = Some("TO_SYNC"),
        knoxUrl = None,
        properties = None
      )))

    val service = new EndpointService(aws, cs, dpc)


    "transfom Hdfs datamap" in {

      service.transFormHdfsData(Map("fsEndpoint" -> Some("hdfs://test.blah.asasew:87700"),"dfs.namenode.rpc-address.blah"->Some("abd.somehost.qqq-1:9000")),1).map { x =>
        x.foreach{ case (k,v) =>
          v.isDefined mustBe true
          v.get.matches("10.0.0.0:\\d+") mustBe true
        }

      }

    }

    "transform Hive Quorum" in {
      service.transformZKQuorum("abd.somehost.qqq-1:9000,abd.somehost.qqq-2:9001",1).map { x =>
        x mustBe "10.0.0.0:9000,10.0.0.0:9001"
      }
    }


    "transform Ranger Data" in {
      service.transformRangerData(RangerServiceDetails("http://ranger:6080","test",Some("test")),1).map { x =>
          x.rangerEndPoint mustBe  "http://10.0.0.0:6080"
      }
    }


  }

}
