import { Web3Storage, File } from "web3.storage";
import AES from "crypto-js/aes.js";
import Utf8 from "crypto-js/enc-utf8.js";

import { SimpleCache } from "./cache.js";

class CommentStorage {
  constructor(appId, token, key) {
    this.appId = appId;
    this.client = new Web3Storage({ token: token });
    this.key = key;
    this.isEncrypted = !!key;

    this.cache = new SimpleCache();
  }

  getDefaultRouter() {
    return {
      appId: this.appId,
      router: {},
      lastUpdated: Date.now(),
    };
  }

  async getNameCount(name) {
    let count = 0;
    for await (const upload of this.client.list()) {
      if (upload.name.startsWith(`${this.appId}/${name}`)) {
        count++;
      }
    }

    return count;
  }

  async getCidBetweenTimestamp(name, from, to) {
    const cids = [];
    for await (const upload of this.client.list()) {
      if (upload.name.startsWith(`${this.appId}/${name}`)) {
        const timestamp = Number(new Date(upload.created).getTime());
        if (from < timestamp && timestamp < to) {
          cids.push(upload.cid);
        }
      }
    }

    return cids;
  }

  async getLatestAppRouter() {
    let routerExisted = false;
    let latestTimestamp = 0;
    let latestCid;
    for await (const upload of this.client.list()) {
      if (upload.name.startsWith(`${this.appId}/router`)) {
        routerExisted = true;
        const timestamp = Number(upload.name.split("/").slice(-1)[0]);
        if (timestamp > latestTimestamp) {
          latestTimestamp = timestamp;
          latestCid = upload.cid;
        }
      }
    }

    if (routerExisted) {
      this.cache.set("router", await this.pull(latestCid));
    } else {
      this.cache.set("router", this.getDefaultRouter());
      await this.push("router", this.cache.get("router"), Date.now());
    }

    return this.cache.get("router");
  }

  async push(name, data, timestamp) {
    const appIdAppendedName = `${this.appId}/${name}/${timestamp}`;
    const finalizedFileContent = this.isEncrypted
      ? AES.encrypt(JSON.stringify(data), this.key).toString()
      : JSON.stringify(data);
    const file = new File([finalizedFileContent], appIdAppendedName, {
      type: "text/plain",
    });
    return await this.client.put([file], {
      name: appIdAppendedName,
      wrapWithDirectory: false,
    });
  }

  async pull(cid) {
    const res = await this.client.get(cid);
    const file = (await res.files())[0];
    const fileContent = Buffer.from(await file.arrayBuffer()).toString();
    if (this.isEncrypted) {
      const decrypted = AES.decrypt(fileContent, this.key).toString(Utf8);
      return JSON.parse(decrypted);
    }
    return JSON.parse(fileContent);
  }
}

export { CommentStorage };
