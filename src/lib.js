import { CommentStorage } from "./storage.js";
import * as crypto from "crypto";

let initialized = false;

class IPFSComments {
  constructor() {
    //static initialization
  }

  async initialize(appId, token, key) {
    this.appId = appId;
    this.commentStorage = new CommentStorage(appId, token, key);
    await this.commentStorage.getLatestAppRouter();
  }

  static async create(appId, token, key = "") {
    if (initialized) {
      throw new Error("IPFSComments is already initialized");
    }
    initialized = true;
    const ipfsComments = new IPFSComments();
    await ipfsComments.initialize(appId, token, key);
    return ipfsComments;
  }

  tryInsertComment(comment, parentId, allComments) {
    for (const _comment of allComments) {
      if (_comment.commentId === parentId) {
        _comment.replies.push(comment);
        return true;
      } else {
        if (this.tryInsertComment(comment, parentId, _comment.replies)) {
          return true;
        }
      }
    }

    return false;
  }

  mergeComments(baseComments, newComments) {
    const commentIdMap = {};
    for (const comment of baseComments) {
      commentIdMap[comment.commentId] = comment;
    }

    for (const comment of newComments) {
      if (comment.commentId in commentIdMap) {
        const baseHistoryMap = {};
        for (const baseHistory in commentIdMap[comment.commentId].history) {
          baseHistoryMap[baseHistory.timestamp] = baseHistory;
        }

        for (const newHistory of comment.history) {
          if (newHistory.timestamp in baseHistoryMap) {
            baseHistoryMap[newHistory.timestamp] = newHistory;
          }
        }

        commentIdMap[comment.commentId].history = Object.values(baseHistoryMap);
        commentIdMap[comment.commentId].comment = comment.comment;
        commentIdMap[comment.commentId].timestamp = comment.timestamp;
        commentIdMap[comment.commentId].replies = this.mergeComments(
          commentIdMap[comment.commentId].replies,
          comment.replies
        );
      } else {
        commentIdMap[comment.commentId] = comment;
      }
    }

    return Object.values(commentIdMap);
  }

  mergeRouters(baseRouter, newRouter) {
    for (const newPage of Object.keys(newRouter.router)) {
      if (newPage in baseRouter.router) {
        baseRouter.router[newPage] = newRouter.router[newPage];
      }
    }
    return baseRouter;
  }

  async getLatestStates(pageId, currentTimestamp) {
    let comments = await this.getComments(pageId);
    let router = this.commentStorage.cache.get("router");

    const pageCount = await this.commentStorage.getNameCount(pageId);
    const currentEpoch =
      pageId in router.router ? router.router[pageId].epoch : -1;
    if (pageCount !== currentEpoch + 1) {
      const lastTimestamp =
        this.commentStorage.cache.get("router").router[pageId].timestamp || 0;

      const rcids = await this.commentStorage.getCidBetweenTimestamp(
        "router",
        lastTimestamp,
        currentTimestamp
      );
      for (const cid of rcids) {
        const mergeRouter = await this.commentStorage.pull(cid);
        router = this.mergeRouters(router, mergeRouter);
      }

      // merge all comments between last epoch and current epoch
      const pcids = await this.commentStorage.getCidBetweenTimestamp(
        pageId,
        lastTimestamp,
        currentTimestamp
      );
      for (const cid of pcids) {
        const mergeComments = await this.commentStorage.pull(cid);
        comments = this.mergeComments(comments, mergeComments);
      }
    }

    return {
      router: router,
      comments: comments,
      epoch: pageCount,
    };
  }

  async addComment(pageId, comment, replyTo = undefined) {
    const currentTimestamp = Date.now();
    let resp = await this.getLatestStates(pageId, currentTimestamp);
    let comments = resp.comments;
    let router = resp.router;

    const commentId = crypto
      .createHash("sha256")
      .update(`${comment}/${Date.now()}`)
      .digest("hex");
    const formattedComment = {
      commentId: commentId,
      replies: [],
      comment: comment,
      history: [],
      timestamp: currentTimestamp,
    };
    const isInserted = this.tryInsertComment(
      formattedComment,
      replyTo,
      comments
    );
    if (!isInserted) {
      comments.push(formattedComment);
    }

    router.router[pageId] = {
      cid: await this.commentStorage.push(pageId, comments, currentTimestamp),
      timestamp: currentTimestamp,
      epoch: resp.epoch,
    };
    router.lastUpdated = currentTimestamp;
    this.commentStorage.cache.set(router.router[pageId].cid, comments);
    this.commentStorage.cache.set("router", router);
    await this.commentStorage.push("router", router, currentTimestamp);

    return commentId;
  }

  tryEditComment(newComment, commentId, allComments, currentTimestamp) {
    for (const _comment of allComments) {
      if (_comment.commentId === commentId) {
        _comment.history.push({
          comment: _comment.comment,
          timestamp: _comment.timestamp,
        });
        _comment.comment = newComment;
        _comment.timestamp = currentTimestamp;
        return true;
      } else {
        if (
          this.tryEditComment(
            newComment,
            commentId,
            _comment.replies,
            currentTimestamp
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  async editComment(pageId, newComment, commentId) {
    const currentTimestamp = Date.now();
    let resp = await this.getLatestStates(pageId, currentTimestamp);
    let comments = resp.comments;
    let router = resp.router;

    const isEdited = this.tryEditComment(
      newComment,
      commentId,
      comments,
      currentTimestamp
    );
    if (!isEdited) {
      throw new Error("Comment not found");
    }

    router.router[pageId] = {
      cid: await this.commentStorage.push(pageId, comments, currentTimestamp),
      timestamp: currentTimestamp,
      epoch: resp.epoch,
    };
    router.lastUpdated = currentTimestamp;
    this.commentStorage.cache.set(router.router[pageId].cid, comments);
    this.commentStorage.cache.set("router", router);
    await this.commentStorage.push("router", router, currentTimestamp);

    return commentId;
  }

  async removeComment(pageId, commentId) {
    return await this.editComment(pageId, "[deleted]", commentId);
  }

  async getComments(pageId) {
    const routingTable = this.commentStorage.cache.get("router").router;
    if (pageId in routingTable) {
      const cid = routingTable[pageId].cid;
      return this.commentStorage.cache.cached_get(cid, async () => {
        return await this.commentStorage.pull(cid);
      });
    } else {
      return [];
    }
  }
}

export { IPFSComments };
