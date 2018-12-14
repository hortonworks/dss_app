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

import java.time.{Clock, LocalDateTime}
import javax.inject.Inject

import com.google.inject.name.Named
import com.hortonworks.dataplane.commons.domain.Atlas.EntityDatasetRelationship
import models.DatasetEntities._
import models.UserEntities.DssUser
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import repo.Z_RepoExceptions.{AlreadyExistsError, EntityNotFound, Forbidden}
import utils.WrappedErrorsException

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

class DatasetRepo @Inject()(@Named("clusterService") val clusterService: com.hortonworks.dataplane.db.Webservice.ClusterService,
                            protected val dbConfigProvider: DatabaseConfigProvider,
                            protected val assetRepo: AssetRepo,
                            protected val bookmarkRepo: BookmarkRepo,
                            protected val favouriteRepo: FavouriteRepo,
                            protected val commentsRepo: CommentsRepo,
                            protected val ratingRepo: RatingRepo,
                            protected val userRepo: UserRepo) extends HasDatabaseConfigProvider[PgProfile] {

  import profile.api._

  val Datasets = TableQuery[DatasetsTable].filter(_.active).filter(_.version > 0)
  val DatasetsWritable = TableQuery[DatasetsTable]
  val DatasetToCategoryMap = TableQuery[DatasetCategoryMapTable]
  var Categories = TableQuery[CategoriesTable]
  val DSEditDetails = TableQuery[DatasetEditDetailsTable]

  def searchCategoriesByName(searchText: String, size: Long): Future[List[Category]] = {
    db.run(Categories.filter(_.name.toLowerCase like s"%${searchText.toLowerCase}%").take(size).to[List].result)
  }

  def all(): Future[List[Dataset]] = db.run {
    Datasets.to[List].result
  }

  def findById(datasetId: Long): Future[Dataset] = {
    db.run(DatasetsWritable.filter(_.id === datasetId).result.head)
  }

  def findByNames(names: Seq[String]): Future[List[Dataset]] = {
    db.run(Datasets.filter(_.name inSetBind names).to[List].result)
  }

  def archiveById(datasetId: Long): Future[Int] = {
    db.run(DatasetsWritable.filter(_.id === datasetId).map(_.active).update(false))
  }

  def getDatasetEditDetails(datasetId: Long): Future[Option[DatasetEditDetails]] = {
    db.run(DSEditDetails.filter(_.datasetId === datasetId).result.headOption)
  }

  def getRichDatasetById(id: Long, dssUser: DssUser): Future[RichDataset] = {
    var query = DatasetsWritable.filter(_.id === id).filter(m => m.createdBy === dssUser.id || m.sharedStatus === SharingStatus.PUBLIC.id)
    var dsUsrQuery = query join userRepo.Users on (_.createdBy === _.id)
    getRichDatasetForQuery(dsUsrQuery, dssUser).map(_.head)
  }

  def getRichDatasetForQuery(dsUsrQuery: Query[(DatasetsTable, userRepo.UsersTable), (Dataset, DssUser), Seq], dssUser: DssUser): Future[Seq[RichDataset]] = {
    val query = for {
      dsetsWithUsrName <- dsUsrQuery.map(tpl => (tpl._1, tpl._2.username)).result
      dsIdsWithActivAssetsCount <- assetRepo.Assets.filter(_.datasetId inSet dsetsWithUsrName.map(_._1.id.get))
        .groupBy(a => (a.datasetId, a.assetType))
        .map(tpl => (tpl._1._1.get, tpl._1._2, "Active", tpl._2.length))
        .result
      dsIdsWithEditAssetsCount <- assetRepo.EditAssets.filter(_.datasetId inSet dsetsWithUsrName.map(_._1.id.get))
        .groupBy(a => (a.datasetId, a.assetType))
        .map(tpl => (tpl._1._1.get, tpl._1._2, "Edit", tpl._2.length))
        .result
      dsIdToTagsMap <- (DatasetToCategoryMap filter (_.datasetId inSet dsetsWithUsrName.map(_._1.id.get)))
        .join(Categories).on(_.categoryId === _.id)
        .map(tpl => (tpl._1.datasetId, tpl._2.name))
        .result
      dsIdTofavMap <- favouriteRepo.Favourites.filter(_.objectId inSet dsetsWithUsrName.map(_._1.id.get))
        .filter(_.objectType === "assetCollection")
        .map(tpl => (tpl.objectId, tpl.id.get, tpl.userId))
        .result
      dsIdToBmMap <- bookmarkRepo.Bookmarks.filter(_.objectId inSet dsetsWithUsrName.map(_._1.id.get))
        .filter(_.objectType === "assetCollection")
        .filter(_.userId === dssUser.id)
        .map(tpl => (tpl.objectId, tpl.id.get))
        .result
      dsIdToCmntCntMap <- commentsRepo.Comments.filter(_.objectId inSet dsetsWithUsrName.map(_._1.id.get))
        .filter(_.objectType === "assetCollection")
        .groupBy(_.objectId)
        .map(tpl => (tpl._1, tpl._2.length))
        .result
      dsIdToAvgRatMap <- ratingRepo.Ratings.filter(_.objectId inSet dsetsWithUsrName.map(_._1.id.get))
        .filter(_.objectType === "assetCollection")
        .groupBy(_.objectId)
        .map(tpl => (tpl._1, tpl._2.map(_.rating).avg.get))
        .result
      dsEditDetails <- DSEditDetails.filter(_.datasetId inSet dsetsWithUsrName.map(_._1.id.get)).result

    } yield {
      (dsetsWithUsrName, dsIdsWithActivAssetsCount ++ dsIdsWithEditAssetsCount, dsIdToTagsMap, dsIdTofavMap, dsIdToBmMap, dsIdToCmntCntMap, dsIdToAvgRatMap, dsEditDetails)
    }

    db.run(query).flatMap {
      case (dsetsWithUsrName, dsIdsWithAssetsCount, dsIdToTagsMap, dsIdTofavMap, dsIdToBmMap, dsIdToCmntCntMap, dsIdToAvgRatMap, dsEditDetails) => {
        val dpClusterIds:Set[Long] = dsetsWithUsrName.map(_._1.dpClusterId).toSet
        val futureSet:Future[Set[(Long, (Long, String))]] = Future.sequence(dpClusterIds.map(x =>
          clusterService.getLinkedClusters(x).flatMap {
            case Left(errors) => Future.failed(new WrappedErrorsException(errors))
            case Right(clusters) => Future.successful(x, (clusters.head.id.get, clusters.head.name))
          }
        ))
        futureSet.map(x => {
          val clusterIdMap = x.toMap
          dsetsWithUsrName.map {
            case (dataset, userName) => {
              RichDataset(
                dataset, dsIdToTagsMap.filter(_._1 == dataset.id.get).map(_._2), userName,
                clusterIdMap(dataset.dpClusterId)._1, clusterIdMap(dataset.dpClusterId)._2,
                dsIdsWithAssetsCount.filter(_._1 == dataset.id.get).map(tpl=>DataAssetCount(tpl._2, tpl._3, tpl._4)),
                dsEditDetails.find(_.datasetId == dataset.id.get),
                dsIdTofavMap.filter(_._1 == dataset.id.get).filter(_._3 == dssUser.id).map(_._2).headOption,
                Some(dsIdTofavMap.count(_._1 == dataset.id.get)),
                dsIdToBmMap.filter(_._1 == dataset.id.get).map(_._2).headOption,
                dsIdToCmntCntMap.filter(_._1 == dataset.id.get).map(_._2).headOption,
                dsIdToAvgRatMap.filter(_._1 == dataset.id.get).map(_._2).headOption
              )
            }
          }
        })
      }
    }
  }

  def getDsUsrQuery (searchText: Option[String], dssUser: DssUser, flag: Option[String], tag: Option[String]):
                                                    Query[(DatasetsTable, userRepo.UsersTable), (Dataset, DssUser), Seq]= {
    var dsQuery = Datasets.filter(m => (m.createdBy === dssUser.id) || (m.sharedStatus === SharingStatus.PUBLIC.id))
    dsQuery = searchText.map(txt => dsQuery.filter(m => (m.name.toLowerCase like s"%${txt.toLowerCase}%") || (m.description.toLowerCase like s"%${txt.toLowerCase}%"))).getOrElse(dsQuery)
    var dsUsrQuery = dsQuery join userRepo.Users on (_.createdBy === _.id)
    dsUsrQuery = tag match {
      case None => dsUsrQuery
      case Some(t) => dsUsrQuery.join(DatasetToCategoryMap).on(_._1.id === _.datasetId)
        .join(Categories).on(_._2.categoryId === _.id)
        .filter(_._2.name === t)
        .map(_._1._1)
    }
    flag match {
      case Some(fl) if (fl.equalsIgnoreCase("bookmark")) => (dsUsrQuery join bookmarkRepo.Bookmarks on (_._1.id === _.objectId))
        .filter(_._2.objectType === "assetCollection")
        .filter(_._2.userId === dssUser.id)
        .map(_._1)
      case _ => dsUsrQuery
    }
  }

  def getRichDataSetList(tag: Option[String], searchText: Option[String], flag: Option[String], offset:Option[String], size:Option[String], dssUser: DssUser): Future[Seq[RichDataset]] = {
    var dsUsrQuery = getDsUsrQuery(searchText, dssUser, flag, tag)
    dsUsrQuery = offset.map(o => dsUsrQuery.drop(o.toLong)).getOrElse(dsUsrQuery)
    dsUsrQuery = size.map(s => dsUsrQuery.take(s.toLong)).getOrElse(dsUsrQuery)
    getRichDatasetForQuery(dsUsrQuery, dssUser)
  }

  def getDatasetListCount(searchText: Option[String], dssUser: DssUser, flag: Option[String]):Future[Int] = {
    db.run(getDsUsrQuery(searchText, dssUser, flag, None).length.result)
  }

  def getCategoriesWithCount(searchText: Option[String], dssUser: DssUser, flag: Option[String]): Future[List[CategoryWithCount]] = {
    db.run(getDsUsrQuery(searchText, dssUser, flag, None)
      .join(DatasetToCategoryMap).on(_._1.id === _.datasetId)
      .join(Categories).on(_._2.categoryId === _.id)
      .map(tpl => (tpl._2.name, tpl._1._2.datasetId))
      .groupBy(_._1)
      .map(tpl => (tpl._1, tpl._2.length)).to[List]
      .result).map(_.map(tpl => CategoryWithCount(tpl._1, tpl._2)))
  }

  def insertWithCategories(dsNtags: DatasetAndTags, dssUser: DssUser): Future[RichDataset] = {
    val tags = dsNtags.tags
    val query = for {
      _ <- Datasets.filter(_.name === dsNtags.dataset.name).result.headOption.map {
        case Some(ds) => throw new AlreadyExistsError("Data set with given name already exist.")
        case _ => true
      }
      user <- userRepo.queryForInsertUserIfNotExist(dssUser)
      existingCats <- Categories.filter(_.name.inSet(tags)).to[List].result
      _ <- Categories ++= tags.filterNot(existingCats.map(_.name).contains(_)).map(t => Category(None, t, None))
      savedDataset <- DatasetsWritable returning DatasetsWritable += dsNtags.dataset.copy(createdBy = Some(user.id), version = 0)
      _ <- DSEditDetails returning DSEditDetails += DatasetEditDetails(None, savedDataset.id.get, savedDataset.createdBy.get, Some(LocalDateTime.now()))
      categories <- Categories.filter(_.name.inSet(tags)).to[List].result
      _ <- DatasetToCategoryMap ++= categories.map(c => DatasetCategoryMap(savedDataset.id.get, c.id.get))
    } yield {
      savedDataset
    }

    db.run(query.transactionally).flatMap {
      case sDset => getRichDatasetForQuery(
        DatasetsWritable.filter(_.id === sDset.id.get) join userRepo.Users on (_.createdBy === _.id),
        dssUser
      ).map(_.head)
    }
  }

  def updateWithCategories(dsNtags: DatasetAndTags, dssUser: DssUser): Future[RichDataset] = {
    val tags = dsNtags.tags
    val query = for {
    //TODO check if dssUser has an access to the dataset or if its public
      _ <- Datasets.filter(_.id === dsNtags.dataset.id).update(dsNtags.dataset.copy(lastModified = LocalDateTime.now()))
      _ <- DatasetToCategoryMap.filter(_.datasetId === dsNtags.dataset.id).delete
      existingCats <- Categories.filter(_.name.inSet(tags)).to[List].result
      _ <- Categories ++= tags.filterNot(existingCats.map(_.name).contains(_)).map(t => Category(None, t, None))
      savedDataset <- Datasets.filter(_.id === dsNtags.dataset.id).result.head
      categories <- Categories.filter(_.name.inSet(tags)).to[List].result
      _ <- DatasetToCategoryMap ++= categories.map(c => DatasetCategoryMap(savedDataset.id.get, c.id.get))
    } yield {
      savedDataset
    }

    db.run(query.transactionally).flatMap {
      case sDset => getRichDatasetForQuery(
        Datasets.filter(_.id === sDset.id.get) join userRepo.Users on (_.createdBy === _.id),
        dssUser
      ).map(_.head)
    }
  }

  //TODO Merge it into above update function
  def updateDatset(datasetId: Long, dataset: Dataset, dssUser: DssUser): Future[Dataset] = {
    val query = for {
      _ <- Datasets.filter(_.id === datasetId).result.headOption.map {
        case None => throw new EntityNotFound("Dataset with given id not found")
        case Some(dset) if (dset.createdBy.get != dssUser.id) => throw new Forbidden("User is forbidden to update")
        case _ => true
      }
      _ <- Datasets.filter(_.id === datasetId).update(dataset.copy(lastModified = LocalDateTime.now, createdBy = Some(dssUser.id)))
      ds <- Datasets.filter(_.id === datasetId).result.head
    } yield (ds)

    db.run(query.transactionally)
  }


  def beginEdit(datasetId: Long, dssUser: DssUser): Future[RichDataset] = {
    var query = for {
      _ <- DSEditDetails.filter(_.datasetId === datasetId).result.headOption.map {
        case None => None
        case Some(details) => DBIO.failed(throw new AlreadyExistsError)
      }
      _ <- DSEditDetails returning DSEditDetails += DatasetEditDetails(None, datasetId, dssUser.id, Some(LocalDateTime.now(Clock.systemUTC())))
    } yield ()
    db.run(query.transactionally).flatMap {
      case _ => getRichDatasetForQuery(
        DatasetsWritable.filter(_.id === datasetId) join userRepo.Users on (_.createdBy === _.id),
        dssUser
      ).map(_.head)
    }
  }

  def saveEdit(datasetId:Long, dssUser: DssUser) :Future[RichDataset] = {
    var query = for {
      _ <- assetRepo.AllAssets.filter(_.datasetId === datasetId).filter(_.editFlag === "Mark_Delete").delete
      _ <- assetRepo.AllAssets.filter(_.datasetId === datasetId).map(_.state).update(Some("Active"))
      _ <- DSEditDetails.filter(_.datasetId === datasetId).delete
      _ <- DatasetsWritable.filter(_.id === datasetId).map(_.version).update(1)
    } yield ()
    db.run(query.transactionally).flatMap {
      case _ => getRichDatasetForQuery(
        Datasets.filter(_.id === datasetId) join userRepo.Users on (_.createdBy === _.id),
        dssUser
      ).map(_.head)
    }
  }

  def revertEdit(datasetId:Long, dssUser: DssUser) :Future[RichDataset] = {
    var query = for {
      _ <- assetRepo.AllAssets.filter(_.datasetId === datasetId).filter(_.state === "Edit").delete
      _ <- assetRepo.AllAssets.filter(_.datasetId === datasetId).map(_.editFlag).update(Some("Mark_Add"))
      _ <- DSEditDetails.filter(_.datasetId === datasetId).delete
      v <- DatasetsWritable.filter(_.id === datasetId).result.head.map(_.version)
      _ <- v match {
        case 0 => DatasetsWritable.filter(_.id === datasetId).map(_.active).update(false)
        case _ => DatasetsWritable.filter(_.id === datasetId).map(_.version).update(1)
      }
    } yield ()
    db.run(query.transactionally).flatMap {
      case _ => getRichDatasetForQuery(
        DatasetsWritable.filter(_.id === datasetId) join userRepo.Users on (_.createdBy === _.id),
        dssUser
      ).map(_.head)
    }
  }


  def addAssets(datasetId: Long, assets: Seq[Asset], dssUser: DssUser): Future[RichDataset] = {
    val assetsToSave = assets.map(_.copy(datasetId = Some(datasetId), state = Some("Edit"), editFlag = Some("Mark_Add")))
    val assetGuIds = assets.map(_.guid)
    var query = for {
      _       <- DSEditDetails.filter(_.datasetId === datasetId).result.head
      exstAss <- assetRepo.AllAssets.filter(_.datasetId === datasetId).filter(_.guid inSet assetGuIds).result
      _       <- assetRepo.AllAssets.filter(_.id inSet exstAss.map(_.id.get)).map(_.editFlag).update(Some("Mark_Add"))
      _       <- assetRepo.AllAssets ++= assetsToSave.filterNot(row => exstAss.map(_.guid).contains(row.guid))
    } yield ()
    db.run(query.transactionally).flatMap {
      case _ => getRichDatasetForQuery(
        DatasetsWritable.filter(_.id === datasetId) join userRepo.Users on (_.createdBy === _.id),
        dssUser
      ).map(_.head)
    }
  }

  def removeAssets(datasetId: Long, assetGuIds: Seq[String], dssUser: DssUser): Future[RichDataset] = {
    var query = for {
      _ <- DSEditDetails.filter(_.datasetId === datasetId).result.head
      _ <- assetRepo.AllAssets.filter(_.datasetId === datasetId).filter(_.guid inSet assetGuIds).map(_.editFlag).update(Some("Mark_Delete"))
    } yield ()
    db.run(query.transactionally).flatMap {
      case _ => getRichDatasetForQuery(
        DatasetsWritable.filter(_.id === datasetId) join userRepo.Users on (_.createdBy === _.id),
        dssUser
      ).map(_.head)
    }
  }

  //TODO merge it with the above function
  def removeAllAssets(datasetId: Long, dssUser: DssUser): Future[RichDataset] = {
    var query = for {
      _ <- DSEditDetails.filter(_.datasetId === datasetId).result.head
      _ <- assetRepo.AllAssets.filter(_.datasetId === datasetId).map(_.editFlag).update(Some("Mark_Delete"))
    } yield ()
    db.run(query.transactionally).flatMap {
      case _ => getRichDatasetForQuery(
        DatasetsWritable.filter(_.id === datasetId) join userRepo.Users on (_.createdBy === _.id),
        dssUser
      ).map(_.head)
    }
  }

  def queryManagedAssets(clusterId: Long, assets: Seq[String]): Future[Seq[EntityDatasetRelationship]] = {
    val query = for {
      (dataAsset, dataset) <- assetRepo.EditAssets.filter(record => record.guid.inSet(assets) /* && record.clusterId === clusterId */) join DatasetsWritable on (_.datasetId === _.id)
    } yield (dataAsset.guid, dataset.id, dataset.name)
    db.run(query.to[Seq].result)
      .map(_.map {
        case (guid, datasetId, datasetName) => EntityDatasetRelationship(guid, datasetId.get, datasetName)
      })
  }


  final class DatasetsTable(tag: Tag) extends Table[Dataset](tag, Some("dss"), "datasets") {

    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)

    def name = column[String]("name")

    def description = column[Option[String]]("description")

    def dpClusterId = column[Long]("dp_clusterid")

    def createdBy = column[Option[Long]]("createdby")

    def createdOn = column[LocalDateTime]("createdon")

    def lastmodified = column[LocalDateTime]("lastmodified")

    def active = column[Boolean]("active")

    def version = column[Int]("version")

    def sharedStatus = column[Int]("sharedstatus")

    def * = (id, name, description, dpClusterId, createdBy, createdOn, lastmodified, active, version, sharedStatus) <> ((Dataset.apply _).tupled, Dataset.unapply)

  }

  final class CategoriesTable(tag: Tag) extends Table[Category](tag, Some("dss"), "categories") {
    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)

    def name = column[String]("name")

    def description = column[Option[String]]("description")

    def * = (id, name, description) <> ((Category.apply _).tupled, Category.unapply)
  }

  final class DatasetCategoryMapTable(tag: Tag) extends Table[DatasetCategoryMap](tag, Some("dss"), "dataset_categories") {

    def categoryId = column[Long]("category_id")

    def datasetId = column[Long]("dataset_id")

    def * = (datasetId, categoryId) <> ((DatasetCategoryMap.apply _).tupled, DatasetCategoryMap.unapply)
  }

  final class DatasetEditDetailsTable(tag: Tag) extends Table[DatasetEditDetails](tag, Some("dss"), "dataset_edit_details") {

    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)

    def datasetId = column[Long]("dataset_id")

    def editorId = column[Long]("edited_by")

    def editBegin = column[Option[LocalDateTime]]("edit_begin")

    def * = (id, datasetId, editorId, editBegin) <> ((DatasetEditDetails.apply _).tupled, DatasetEditDetails.unapply)
  }


}
