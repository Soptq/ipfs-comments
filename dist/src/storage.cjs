'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var web3_storage = require('web3.storage');
var AES = require('crypto-js/aes.js');
var Utf8 = require('crypto-js/enc-utf8.js');
var cache = require('./cache.cjs');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var AES__default = /*#__PURE__*/_interopDefaultLegacy(AES);
var Utf8__default = /*#__PURE__*/_interopDefaultLegacy(Utf8);

class CommentStorage {
  constructor(appId, token, key) {
    this.appId = appId;
    this.client = new web3_storage.Web3Storage({ token: token });
    this.key = key;
    this.isEncrypted = !!key;

    this.cache = new cache.SimpleCache();
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
      ? AES__default["default"].encrypt(JSON.stringify(data), this.key).toString()
      : JSON.stringify(data);
    const file = new web3_storage.File([finalizedFileContent], appIdAppendedName, {
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
      const decrypted = AES__default["default"].decrypt(fileContent, this.key).toString(Utf8__default["default"]);
      return JSON.parse(decrypted);
    }
    return JSON.parse(fileContent);
  }
}

exports.CommentStorage = CommentStorage;
//# sourceMappingURL=storage.cjs.map
