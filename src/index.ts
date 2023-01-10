import { BaseStorage } from "./backends/base"
import { W3SStorage } from "./backends/w3s";
import * as crypto from "crypto";

let initialized = false;

class IPFSComments {
	private appId: string;
	private storage: BaseStorage;
	constructor() {

	}

	async init(appId, token, key) {
		this.appId = appId;
		this.storage = new W3SStorage(appId, token, key);
		await this.storage.init();
	}

	static async create(appId, token, key): Promise<IPFSComments> {
		if (initialized) {
			throw new Error("IPFSComments is already initialized");
		}

		const newInstance = new this();
		await newInstance.init(appId, token, key);
		initialized = true;
		return newInstance;
	}

	private tryInsertComment(comment, parentId, allComments) {
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

	private mergeComments(baseComments, newComments) {
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
}
