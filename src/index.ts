import { BaseStorage } from "./backends/base"
import { W3SStorage } from "./backends/w3s";
import {ArchivedComment, Comment, Index, IndexStorage} from "./types"
import * as crypto from "crypto";

let initialized = false;

class IPFSComments {
	private appId: string;
	private storage: BaseStorage;
	constructor() {

	}

	async init(appId: string, token: string, key: string) {
		this.appId = appId;
		this.storage = new W3SStorage(appId, token, key);
		await this.storage.init();
	}

	static async create(appId: string, token: string, key: string): Promise<IPFSComments> {
		if (initialized) {
			throw new Error("IPFSComments is already initialized");
		}

		const newInstance = new this();
		await newInstance.init(appId, token, key);
		initialized = true;
		return newInstance;
	}

	private tryInsertComment(comment: Comment, parentId: string, allComments: Comment[]): boolean {
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

	private mergeComments(baseComments: Comment[], newComments: Comment[]) {
		const commentIdMap: { [key: string]: Comment } = {};
		for (const comment of baseComments) {
			commentIdMap[comment.commentId] = comment;
		}

		for (const comment of newComments) {
			if (comment.commentId in commentIdMap) {
				const baseHistoryMap: { [key: number]: ArchivedComment} = {};
				for (const baseHistory of commentIdMap[comment.commentId].history) {
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

	mergeIndexStorage(baseIndexStorage: IndexStorage, newIndexStorage: IndexStorage): IndexStorage {
		const baseIndexCid = baseIndexStorage.index.map((index) => index.cid);

		for (const newPage of newIndexStorage.index) {
			if (!baseIndexCid.includes(newPage.cid)) {
				baseIndexStorage.index.push(newPage);
			}
		}

		return baseIndexStorage;
	}

	async getComments(pageId) {
		const routingTable = this.storage.cache.get("router").router;
		if (pageId in routingTable) {
			const cid = routingTable[pageId].cid;
			if (this.storage.cache.exists(cid)) {
				return this.storage.cache.get(cid);
			} else {
				const comments = await this.storage.pull(cid);
				this.storage.cache.set(cid, comments);
				return comments;
			}
		} else {
			return [];
		}
	}

	async getLatestStates(pageId, currentTimestamp) {
		let comments = await this.getComments(pageId);
		let router = this.storage.cache.get("router");

		const pageCount = await this.storage.count(pageId);
		const currentEpoch =
			pageId in router.router ? router.router[pageId].epoch : -1;
		if (pageCount !== currentEpoch + 1) {
			const lastTimestamp =
				this.storage.cache.get("router").router[pageId].timestamp || 0;

			const rcids = await this.storage.getMetadataBetweenPubTime(
				"router",
				lastTimestamp,
				currentTimestamp
			);
			for (const cid of rcids) {
				const mergeRouter = await this.storage.pull(cid);
				router = this.mergeIndexStorage(router, mergeRouter);
			}

			// merge all comments between last epoch and current epoch
			const pcids = await this.storage.getMetadataBetweenPubTime(
				pageId,
				lastTimestamp,
				currentTimestamp
			);
			for (const cid of pcids) {
				const mergeComments = await this.storage.pull(cid);
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
			cid: await this.storage.push(pageId, comments),
			timestamp: currentTimestamp,
			epoch: resp.epoch,
		};
		router.lastUpdated = currentTimestamp;
		this.storage.cache.set(router.router[pageId].cid, comments);
		this.storage.cache.set("router", router);
		await this.storage.push("router", router);

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
			cid: await this.storage.push(pageId, comments),
			timestamp: currentTimestamp,
			epoch: resp.epoch,
		};
		router.lastUpdated = currentTimestamp;
		this.storage.cache.set(router.router[pageId].cid, comments);
		this.storage.cache.set("router", router);
		await this.storage.push("router", router);

		return commentId;
	}

	async removeComment(pageId, commentId) {
		return await this.editComment(pageId, "[deleted]", commentId);
	}
}
