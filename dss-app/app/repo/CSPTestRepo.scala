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

package repo

import javax.inject.{Inject, Singleton}
import models.CspEntities.{CSPTest, TestStatus}
import models.CspEntities.TestStatus.TestStatus
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.api.libs.json.{JsValue, Json}

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

@Singleton
class CSPTestRepo @Inject()(protected val dbConfigProvider: DatabaseConfigProvider,
                            protected val userRepo: UserRepo) extends HasDatabaseConfigProvider[PgProfile] {

  import profile.api._

  val CSPTests = TableQuery[CSPTests]

  implicit val testStatusColumnType = MappedColumnType.base[TestStatus, String](
    e => e.toString,
    s => TestStatus.withName(s)
  )

  implicit val stringListMapper = MappedColumnType.base[Seq[String],String](
    list => Json.stringify(Json.toJson(list)),
    string => Json.parse(string).as[Seq[String]]
  )

  def add(cSPTest: CSPTest): Future[CSPTest] = {
    db.run {
      (for {
        cTestSeq <- CSPTests.filter(_.ruleId === cSPTest.ruleId).to[List].result
        res <- cTestSeq match {
          case Nil => CSPTests returning CSPTests.map(_.id) into ((csptest, id) => csptest.copy(id = id)) += cSPTest
          case cTestHead :: _ => {
            val updatedCSPTest = cSPTest.copy(id = cTestHead.id)
            CSPTests.filter(_.ruleId === cSPTest.ruleId).update(updatedCSPTest).map { _ =>
              updatedCSPTest
            }
          }
        }
      } yield res).transactionally
    }
  }

  def updateStatusAndResponse(id: Option[Long], status: TestStatus, response: String): Future[Int] ={
    db.run {
      CSPTests.filter(_.id === id).map(rec => (rec.status, rec.responseData)).update((status, response))
    }
  }

  def getByRuleId(ruleId: Long): Future[Option[CSPTest]] = {
    val query = CSPTests.filter(_.ruleId === ruleId).sortBy(_.startTime.desc).take(1).result.headOption
    db.run(query)
  }

  def getRunningTests: Future[Seq[CSPTest]] = {
    val query = CSPTests.filter(r => r.status === TestStatus.SUBMITTED || r.status === TestStatus.STARTED || r.status === TestStatus.RUNNING).result
    db.run(query)
  }

  final class CSPTests(tag: Tag) extends Table[CSPTest](tag, Some("dss"), "csp_tests") {

    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)

    def nameData = column[Seq[String]]("name_data")

    def valueData = column[Seq[String]]("value_data")

    def ruleId = column[Long]("rule_id")

    def idOnProfiler = column[Option[Long]]("id_on_profiler")

    def clusterId = column[Long]("cluster_id")

    def status = column[TestStatus]("status")

    def startTime = column[Option[Long]]("start_time")

    def lastUpdatedTime = column[Option[Long]]("lastupdated_time")

    def responseData = column[String]("response_data")

    def * = (id, nameData, valueData, ruleId, idOnProfiler, clusterId, status, startTime, lastUpdatedTime, responseData) <> ((CSPTest.apply _).tupled, CSPTest.unapply)
  }

}