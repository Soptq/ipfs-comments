import AES from "crypto-js/aes.js";
import Utf8 from "crypto-js/enc-utf8.js";
import { Cache } from "../cache";
import { IndexStorage } from "../types";

export class BaseStorage {
	protected appId: string;
	protected encryptionKey: string;
	protected cache: Cache;
	public index: IndexStorage;

	constructor(appId: string, encryptionKey: string) {
		this.appId = appId;
		this.encryptionKey = encryptionKey;
		this.cache = new Cache();
	}

	protected isEncryptedStorage() {
		return !!this.encryptionKey;
	}

	// This function is called to init the storage.
	public async init() {
		// not implemented
	}

	// This function is called to encrypt a data.
	protected encrypt(data: { [key: string]: any }): string {
		if (this.isEncryptedStorage()) {
			return AES.encrypt(JSON.stringify(data), this.encryptionKey).toString();
		}
		return JSON.stringify(data);
	}

	protected decrypt(data: string): { [key: string]: any } {
		if (this.isEncryptedStorage()) {
			return JSON.parse(AES.decrypt(data, this.encryptionKey).toString(Utf8));
		}
		return JSON.parse(data);
	}

	// This function is called to upload a data to IPFS.
	// @ts-ignore
	protected async push(data: any, appending: string): Promise<string> {
		// not implemented
	}

	// This function is called to fetch a file from IPFS.
	// @ts-ignore
	protected async pull(ident: string): Promise<{ [key: string]: any }> {
		// not implemented
	}
}