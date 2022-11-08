import { Web3Storage, File } from "web3.storage";

import { BaseStorage } from "./base"
import { IndexStorage } from "../types"

export class W3SStorage extends BaseStorage {
	private w3s: Web3Storage;
	INDEX_IDENT = "index";

	constructor(appId: string, w3sToken: string, encryptionKey: string) {
		super(appId, encryptionKey);
		this.w3s = new Web3Storage({ token: w3sToken });
	}

	public async count(startsWith: string): Promise<number> {
		let count: number = 0;
		for await (const upload of this.w3s.list()) {
			if (upload.name.startsWith(startsWith)) {
				count++;
			}
		}
		return count;
	}

	public async getMetadataBetweenPubTime(startsWith, fromTime, toTime): Promise<{ [key: string]: string[] }> {
		const metadata: { [key: string]: string[] } = {};
		for await (const upload of this.w3s.list()) {
			if (upload.name.startsWith(startsWith)) {
				const publishTimestamp = Number(new Date(upload.created).getTime());
				if (fromTime < publishTimestamp && publishTimestamp <= toTime) {
					const name = upload.name.split("/")[1];
					if (metadata[name] === undefined) {
						metadata[name] = [upload.cid.toString()];
					} else {
						metadata[name].push(upload.cid.toString());
					}
				}
			}
		}

		return metadata;
	}

	public async init() {
		let currentTimestamp = Date.now();
		let lastIndexTimestamp = 0;
		let lastIndexIdent = "";

		for await (const upload of this.w3s.list()) {
			if (upload.name.startsWith(`${this.appId}/${this.INDEX_IDENT}`)) {
				const uploadTimestamp = Number(upload.name.split("/").slice(-1)[0]);
				if (uploadTimestamp > lastIndexTimestamp) {
					lastIndexTimestamp = uploadTimestamp;
					lastIndexIdent = upload.cid.toString();
				}
			}
		}

		if (lastIndexTimestamp > 0) {
			this.index = (await this.pull(lastIndexIdent) as IndexStorage);
		} else {
			this.index = {
				appId: this.appId,
				index: [],
				lastUpdated: currentTimestamp,
			};
			await this.push(this.index, `${this.INDEX_IDENT}/${currentTimestamp}`);
		}
		this.cache.set(this.INDEX_IDENT, this.index);
	}

	public async push(data: any, appending: string): Promise<string> {
		const name: string = `${this.appId}/${appending}`;
		const encryptedData = this.encrypt(data);
		const file: File = new File(
			[encryptedData],
			name,
			{ type: "text/plain", }
		);

		return await this.w3s.put([file], {
			name: name,
			wrapWithDirectory: false,
		})
	}

	public async pull(ident: string): Promise<{ [key: string]: any }> {
		if (this.cache.exists(ident)) {
			return this.cache.get(ident);
		} else {
			const results = await this.w3s.get(ident);
			const file = (await results.files())[0];
			const fileBuffer = Buffer.from(await file.arrayBuffer()).toString();
			let data: { [key: string]: any } = this.decrypt(fileBuffer);

			// save to cache
			this.cache.set(ident, data);

			return data
		}
	}
}