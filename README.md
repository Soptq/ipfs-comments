# IPFSComments SDK

This SDK helps developers or users integrate a comment system into their dApp or website in just few lines of codes. It is built on top of [IPFS](https://ipfs.io/) and [Web3.Storage](https://web3.storage/) so that it is decentralized and serverless, and all comments are stored on IPFS.

This SDK provides a simple and intuitive API for developers to use.

## Features:
1. Basic functionalities: comment, reply, edit and delete.
2. Optimized for IPFS: minimal IPFS GET calls required as they could be slow to fetch.
3. Cache system: further boosting performance to improve UX.
4. Conflicts resolver: maintain database stability when concurrently commenting from users.
5. Encryption: encrypt all comments before storing them on IPFS.
6. Friendly interfaces: developers can get started and extend its functionalities in minutes.

## Getting Started

### Installation

```shell
npm install git+https://github.com/Soptq/ipfs-comments.git
```

### Initialization

```typescript
import { IPFSComments } from 'ipfs-comments';

const ipfsComment = await IPFSComments.create(
  appId, // string, an identifier for your app
  w3sToken, // string, your Web3.Storage token
  encryptionKey // string, your encryption key, leave empty if you don't want to encrypt
);
```

### Get comments of a page

```typescript
const comments = await ipfsComment.getComments(pageId); // string, the identifier for the page
```

### Other APIs

Note that considering different APPs usually have their own way to identify their users, so by default there is no access control built in this SDK, meaning that anyone can comment, reply, edit or delete any comments. You can implement your own access control by extending the SDK.

#### Add / Reply a comment

```typescript
const comment = await ipfsComment.addComment(
  pageId, // string, the identifier for the page
  content, // string, the content of the comment
  parentId, // string, the identifier for the parent comment, leave empty if it is a top-level comment
);
```

#### Edit a comment
    
```typescript
const comment = await ipfsComment.editComment(
  pageId, // string, the identifier for the page
  content, // string, the new content of the comment
  commentId, // string, the identifier for the comment
);
```

#### Delete a comment

```typescript
const comment = await ipfsComment.deleteComment(
  pageId, // string, the identifier for the page
  commentId, // string, the identifier for the comment
);
```

## Example

There is an example project in `example/simple-comments` folder to demonstrate the use of SDK.

Please refer to [README.md](example/simple-comments/README.md) for more details.
