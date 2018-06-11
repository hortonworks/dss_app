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
import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {TranslateService} from "@ngx-translate/core";
import {CommentService} from "../../services/comment.service";
import {Comment, CommentWithUser, ReplyTo} from "../../models/comment";
import {AuthUtils} from "../utils/auth-utils";
import * as moment from 'moment';
import {RatingService} from "../../services/rating.service";
import {Rating} from "../../models/rating";

@Component({
  selector: 'dp-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss']
})
export class CommentsComponent implements OnInit {

  constructor(private router: Router,
              private route: ActivatedRoute,
              private translateService: TranslateService,
              private commentService: CommentService,
              private ratingService: RatingService) { }

  isRatingEnabled: boolean = false;
  objectType: string;
  objectId: string;

  commentWithUsers: CommentWithUser[]= [];
  commentWithUsersMap = {}; // introduced to avoid making call to server on delete of a root/parent comment.
  fetchInProgress: boolean =true;
  newCommentText: string;
  fetchError: boolean= false;
  returnURl: string = '';
  totalVotes: number = 0;
  userRating: Rating = new Rating();
  averageRating: number =0;
  userRatingLabel: string = "";

  // pagination params to fetch parent comments
  offset:number = 0;
  size:number = 10;

  allCommentsLoaded: boolean = false;
  timer = null;
  newCommentsAvailable:boolean = false; // this keeps track of those new parent comments which are added but are not visible (because edge is not in viewport) and as allCommentsLoaded was made true in previous call these new parent comments were never loaded.

  //below variables are needed to show replyTo box over textarea while replying
  replyTo: ReplyTo;
  isReply: boolean = false;
  parentCommentWithUser: CommentWithUser = new CommentWithUser();

  @ViewChild('newComment') newCommentTextArea : ElementRef;
  @ViewChild('edge') edgeElement: ElementRef;
  @ViewChild('replyToCommentArea') replyToCommentArea: ElementRef;

  ngOnInit() {
    this.objectType = this.route.snapshot.params['objectType'];
    this.objectId = this.route.parent.snapshot.params['id'];
    this.isRatingEnabled = this.route.snapshot.params['isRatingEnabled'];
    this.getComments(true,this.offset,this.size);
    this.userRating.rating =0;
    this.getRating();
    this.route.queryParams.subscribe((params) => {
      this.returnURl = params.returnURl;
    });
  }

  getRating(){
    this.ratingService.get(this.objectId,this.objectType).subscribe( rating => {
      this.userRating = rating;
      this.userRatingLabel = "YOU RATED"
    }, err => {
      if(err.status == 404){
        this.userRating = new Rating();
        this.userRating.rating = 0;
        this.userRatingLabel = "RATE THIS COLLECTION"
      }
    });
    this.getAverageRating();
  }
  getAverageRating(){
    this.ratingService.getAverage(this.objectId,this.objectType).subscribe( averageAndVotes => {
      this.totalVotes = averageAndVotes.votes;
      this.averageRating = averageAndVotes.average;
      this.ratingService.dataChanged.next(this.averageRating);
    });
  }

  onRatingChange(event){
    if(this.userRating.rating === 0){
      let newRating = new Rating();
      newRating.rating = event.rating;
      newRating.createdBy = Number(AuthUtils.getUser().id);
      newRating.objectId = Number(this.objectId);
      newRating.objectType = this.objectType;
      this.ratingService.add(newRating).subscribe(rating => {
        this.userRating = rating;
        this.getAverageRating();
      })
    }else {
      this.ratingService.update(event.rating, this.userRating.id).subscribe(rating => {
        this.userRating = rating;
        this.getAverageRating();
      });
    }
  }

  onHoverRatingChange(){ // onHoverRatingChange on Rating Component
    this.userRatingLabel = "RATE THIS COLLECTION";
  }

  onMouseLeave(){ // onMouseLeave on Rating Component
    if(this.userRating.rating !== 0){
      this.userRatingLabel = "YOU RATED";
    }
  }

  formatTotalVotes(totalVotes){
    if(totalVotes === 1 || totalVotes === 0){
      return totalVotes+" vote";
    }
    return totalVotes+ " votes";
  }

  getComments(refreshScreen: boolean, offset:number, size: number) {
    this.fetchError = false;
    this.fetchInProgress = refreshScreen;
    this.commentService.getByObjectRef(this.objectId,this.objectType,offset,size).subscribe(comments =>{
        this.commentWithUsers = this.offset === 0 ? comments : this.commentWithUsers.concat(comments);
        this.allCommentsLoaded = comments.length < this.size ? true : false;
        let resetMap = (this.offset === 0);
        this.offset = this.offset + comments.length;
        this.fetchInProgress = false;
        this.updateCommentWithUsersMap(comments, resetMap);
        setTimeout(() => {
          this.loadNext();       // required in case 'edge' is already in viewport (without scrolling). setTimeout is needed as window takes some time to adjust with newly loaded comments.
        },50);
      }, () => {
        this.fetchInProgress = false;
        this.fetchError = true;
      }
    );
  }

  updateCommentWithUsersMap(comments: CommentWithUser[], resetMap: boolean){
    let that = this;
    if(resetMap) this.commentWithUsersMap = {};
    this.commentWithUsers.forEach(function(cWU){
      that.commentWithUsersMap[cWU.comment.id] = cWU;
    });
  }

  getCommentWithUsersFromMap(){
    let keys = Object.keys(this.commentWithUsersMap);
    let that = this;
    this.commentWithUsers =  keys.map(function(v) { return that.commentWithUsersMap[v]; });
  }

  toggleAndGetReplies(commentWithUser: CommentWithUser){
    if(!commentWithUser.isReplyVisible){
      commentWithUser.isReplyVisible = true;
      let comment = commentWithUser.comment;
      this.commentService.getByParentId(comment.id).subscribe(comments => {
        commentWithUser.replies = comments;
        commentWithUser.comment.numberOfReplies = comments.length;
      });
    }else{
      commentWithUser.isReplyVisible = false;
    }
  }
  onPostComment() {
    if(this.newCommentText && this.newCommentText.trim()){
      let newCommentText = this.newCommentText;
      this.newCommentText = "";
      this.resizeTextArea();
      let newCommentObject = new Comment();
      newCommentObject.objectType = this.objectType;
      newCommentObject.objectId = Number(this.objectId);
      newCommentObject.comment = newCommentText;
      newCommentObject.createdBy = Number(AuthUtils.getUser().id);
      if(this.isReply) {
        newCommentObject.parentCommentId = this.parentCommentWithUser.comment.id;
        this.parentCommentWithUser.isReplyVisible = false;
        this.commentService.add(newCommentObject).subscribe(_ => {
          this.commentService.dataChanged.next(true);
          this.toggleAndGetReplies(this.parentCommentWithUser);
          this.removeReply();
        });
      }else {
        this.commentService.add(newCommentObject).subscribe(_ => {
          this.commentService.dataChanged.next(true);
          if(this.isEdgeInViewport()){
            this.getComments(false,this.offset,this.size);
          }else{
            this.newCommentsAvailable = true;
          }
        });
      }
    }
  }

  resetOffset(){
    this.offset =0;
    this.allCommentsLoaded = false;
  }
  onDeleteComment(commentToDelete: CommentWithUser, parentCommentWu:CommentWithUser) {
    if(!commentToDelete.comment.parentCommentId){
      this.deleteRootComment(commentToDelete)
    }else {
      this.deleteReply(commentToDelete, parentCommentWu)
    }
  }

  // on delete of reply, a new call is made to fetch all replies after deleting the reply
  deleteReply(commentToDelete: CommentWithUser, parentCommentWu:CommentWithUser){
    this.commentService.deleteComment(commentToDelete.comment.id).subscribe(_ => {
      parentCommentWu.isReplyVisible = false;
      this.toggleAndGetReplies(parentCommentWu);
    });
  }

  // no new call to server to fetch comments when a comment is deleted. Using commentWithUsersMap instead
  deleteRootComment(commentToDelete: CommentWithUser){
    this.commentService.deleteComment(commentToDelete.comment.id).subscribe();
    delete this.commentWithUsersMap[commentToDelete.comment.id];
    this.offset = this.offset - 1;
    this.getCommentWithUsersFromMap();

  }

  onReplyToComment(replyToComment: CommentWithUser, parentCommentWithUser: CommentWithUser){
    this.replyTo = new ReplyTo();
    let replyToCmnt = replyToComment.comment;
    this.replyTo.parentId = parentCommentWithUser.comment.id;
    this.parentCommentWithUser = parentCommentWithUser;
    this.replyTo.commentText = replyToCmnt.comment;
    this.replyTo.username = replyToComment.userName;
    this.isReply = true;
  }

  removeReply(){
    this.replyTo = new ReplyTo();
    this.isReply = false;
    this.parentCommentWithUser = new CommentWithUser();
  }

  isLoggedInUser(commentWu: CommentWithUser){
    return Number(AuthUtils.getUser().id) === commentWu.comment.createdBy;
  }

  formatDate(dateString: string) {
    let date = moment(dateString);
    return date.format("hh:mm A MMM DD 'YY");
  }

  lengthAdjustedComment(comment: string, isExpanded: boolean) {
    if(!isExpanded){
      return comment.substring(0,128)+"...  ";
    }
    return comment+"  ";
  }

  resizeTextArea(){
    let textArea = this.newCommentTextArea.nativeElement;
    let that = this;
    setTimeout(function() {
      textArea.style.cssText = 'height:auto';
      textArea.style.cssText = 'height:'+Math.min(textArea.scrollHeight, 100) + "px";
      if(that.replyToCommentArea){
        that.replyToCommentArea.nativeElement.style.cssText = 'bottom:'+Math.min(textArea.scrollHeight+7, 107) + "px";
      }
    },0);
  }

  isEdgeInViewport() {
    let element = this.edgeElement.nativeElement;
    let rect = element.getBoundingClientRect();
    let parentEle = this.edgeElement.nativeElement.parentElement;
    let parentRect = parentEle.getBoundingClientRect();
    return (
      rect.top < parentRect.bottom &&
      rect.bottom > 0
    );
  }

  shouldLoadNext(){
    return this.isEdgeInViewport() && (!this.allCommentsLoaded || this.newCommentsAvailable);
  }

  loadNext(){
    if(this.shouldLoadNext()){
      clearTimeout(this.timer);
      this.timer = null;
      this.timer = setTimeout(() => {
        this.getComments(false,this.offset,this.size);
        this.newCommentsAvailable = false;
        this.timer = null;
      }, 1000);
    }
  }

}
