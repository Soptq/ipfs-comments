import { BaseInterface } from "./base"

import { W3SStorage } from "../backends/w3s"
import {IndexStorage} from "../types";

class W3SInterface extends BaseInterface {
	protected storage: W3SStorage;

	constructor() {
		super()
	}

	protected async init(...args: string[]) {
		this.appId = args[0];
		this.storage = new W3SStorage(this.appId, args[1], args[2]);
		await this.storage.init();
	}

	public async insertComment(pageId: string, comment: string, replyTo: string | undefined) {
		const currentTimestamp = Date.now();
	}

	public async resolveConflicts(pageId, currentTimestamp) {
		const lastTimestamp = this.storage.index.lastUpdated;
		const allMetadata = await this.storage.getMetadataBetweenPubTime(
			this.appId,
			lastTimestamp,
			currentTimestamp
		);

		for (const [name, idents] of Object.entries(allMetadata)) {
			if (name === this.storage.INDEX_IDENT) {
				// merge all indexes between lastUpdated and currentTimestamp
				for (const ident of idents) {
					const toIndex: IndexStorage = (await this.storage.pull(ident)) as IndexStorage;
					this.storage.index = this.mergeIndexes(this.storage.index, toIndex);
				}
				// merge current page's comments
			}
		}
	}

	async getComments(pageId) {
		const index: { [key: string]: any } = this.storage.index.index;
		if (pageId in index) {
			const cid = index[pageId].cid;
			return await this.storage.pull(cid);
		} else {
			return [];
		}
	}
}