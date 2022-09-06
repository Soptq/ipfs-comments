'use strict';

var lib = require('./lib.cjs');

(async () => {
    const storage = await lib.IPFSComments.create("test-app", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDVlZjkzNDIyM0QyYWYzRDRBNzBjYjE1QTM4MjcyNjM4YWRFZmQxN2IiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NjE5MjE0MzM5NTksIm5hbWUiOiJpcGZzLWNvbW1lbnRzIn0.gh0RuoFAzhis8Et5deyLUyg97adAhuAT4944m2A93cI", "");
    console.log(await storage.getComments("test-page-1"));
    // console.log("comment");
    // await new Promise(resolve => setTimeout(resolve, 10000));
    // const commentId1 = await storage.addComment("test-page-1", "The first reply");
    // console.log("comment");
    // await new Promise(resolve => setTimeout(resolve, 10000));
    // const commentId2 = await storage.addComment("test-page-1", "The second reply");
    // console.log("comment");
    // await new Promise(resolve => setTimeout(resolve, 10000));
    // const commentId3 = await storage.addComment("test-page-1", "The third reply", "fe38cdba313d5a8e0dec7743cfb3a8057cc87d107c0c1070a5a3bd4a5d098708");
})();
//# sourceMappingURL=test.cjs.map
