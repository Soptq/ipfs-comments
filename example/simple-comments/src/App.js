import { IPFSComments } from "ipfs-comments";
import "./App.css";
import { useEffect, useState } from "react";
import { Block } from "baseui/block";
import { Heading, HeadingLevel } from "baseui/heading";
import { ParagraphSmall } from "baseui/typography";
import { Button } from "baseui/button";
import { Input } from "baseui/input";
import { useSnackbar } from "baseui/snackbar";
import { TreeView, toggleIsExpanded } from "baseui/tree-view";
import { styled } from "baseui";

function App() {
  const [initialized, setInitialized] = useState(false);
  const [ipfsComment, setIpfsComment] = useState(null);
  const [pageComments, setPageComments] = useState([]);
  const [value, setValue] = useState("");
  const [replyValue, setReplyValue] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [commentTreeNodes, setCommentTreeNodes] = useState([]);

  const [editValue, setEditValue] = useState("");
  const [editCidValue, setEditCidValue] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [removeCidValue, setRemoveCidValue] = useState("");
  const [removeLoading, setRemoveLoading] = useState(false);

  const appId = "test-app";
  const pageId = "test-page";
  const encryptionKey = "";

  const { enqueue } = useSnackbar();

  const Label = styled("div", {
    display: "flex",
    flexGrow: 1,
    paddingRight: "5px",
  });

  const Hash = styled("span", {
    marginLeft: "auto",
  });

  const customLabel = (node) => {
    return (
      <Label>
        <span>{node.comment}</span>
        <Hash>{node.id}</Hash>
      </Label>
    );
  };

  useEffect(() => {
    if (initialized) {
      return;
    }

    (async () => {
      console.log("Initializing IPFS Comments...");
      enqueue({
        message: "Initializing IPFS Comments...",
      });
      global.Buffer = global.Buffer || require("buffer").Buffer;

      // To use the ipfs-comments SDK, simply initialize and you are ready to go! Only 1 line of code ;)
      // Initialize
      const _ipfsComment = await IPFSComments.create(
        appId, process.env.REACT_APP_WEB3_STORAGE_TOKEN, encryptionKey // Yes, it supports encryption!
      );
      // Get Comment of the page
      const comments = await _ipfsComment.getComments(pageId);
      // And done!

      const treeNodes = convertCommentsToTree(comments);
      setIpfsComment(_ipfsComment);
      setInitialized(true);
      setCommentTreeNodes(treeNodes);
      setPageComments(comments);
    })();
  }, [initialized]);

  const convertCommentsToTree = (nodes) => {
    const outputs = [];
    for (const node of nodes) {
      outputs.push({
        id: node.commentId,
        label: customLabel,
        comment: node.comment,
        isExpanded: true,
        children: convertCommentsToTree(node.replies),
      });
    }
    return outputs;
  };

  const refreshComments = async () => {
    const comments = await ipfsComment.getComments(pageId);
    const treeNodes = convertCommentsToTree(comments);
    setCommentTreeNodes(treeNodes);
    setPageComments(comments);
  };

  const submitComment = async () => {
    setSubmitLoading(true);
    await ipfsComment.addComment(pageId, value, replyValue);
    await refreshComments();
    setReplyValue("");
    setValue("");
    setSubmitLoading(false);
  };

  const editComment = async () => {
    setEditLoading(true);
    await ipfsComment.editComment(pageId, editValue, editCidValue);
    await refreshComments();
    setEditCidValue("");
    setEditValue("");
    setEditLoading(false);
  };

  const removeComment = async () => {
    setRemoveLoading(true);
    await ipfsComment.removeComment(pageId, removeCidValue);
    await refreshComments();
    setRemoveCidValue("");
    setRemoveLoading(false);
  };

  return (
    <Block
      className={"main-block"}
      paddingLeft={["scale800", "scale1200"]}
      paddingRight={["scale800", "scale1200"]}
      paddingBottom={["scale400", "scale400"]}
    >
      <HeadingLevel>
        <Heading>Demo for IPFSComments SDK</Heading>
        {/*<center>*/}
        <Button onClick={refreshComments} disabled={!initialized}>
          Refresh Comments
        </Button>
        <p>Existed Comments</p>
        <TreeView
          data={commentTreeNodes}
          indentGuides={true}
          onToggle={(node) => {
            setCommentTreeNodes((prevData) => toggleIsExpanded(prevData, node));
          }}
        />
        <div style={{ marginTop: 16, marginBottom: 16 }} />
        <p>Add Comment</p>
        <Input
          value={replyValue}
          onChange={(e) => setReplyValue(e.target.value)}
          placeholder="Reply to which hash, leave empty if you want to reply to the page"
          clearOnEscape
        />
        <div style={{ marginTop: 16, marginBottom: 16 }} />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Comment here"
          clearOnEscape
        />
        <div style={{ marginTop: 16, marginBottom: 16 }} />
        <Button
          onClick={submitComment}
          disabled={!initialized}
          isLoading={submitLoading}
        >
          Submit Your Comment
        </Button>

        <p>Edit Comment</p>
        <Input
          value={editCidValue}
          onChange={(e) => setEditCidValue(e.target.value)}
          placeholder="Edit which hash"
          clearOnEscape
        />
        <div style={{ marginTop: 16, marginBottom: 16 }} />
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="New comment here"
          clearOnEscape
        />
        <div style={{ marginTop: 16, marginBottom: 16 }} />
        <Button
          onClick={editComment}
          disabled={!initialized}
          isLoading={editLoading}
        >
          Edit Your Comment
        </Button>

        <p>Remove Comment</p>
        <Input
          value={removeCidValue}
          onChange={(e) => setRemoveCidValue(e.target.value)}
          placeholder="Remove which hash"
          clearOnEscape
        />
        <div style={{ marginTop: 16, marginBottom: 16 }} />
        <Button
          onClick={removeComment}
          disabled={!initialized}
          isLoading={removeLoading}
        >
          Remove Your Comment
        </Button>

        <ParagraphSmall>
          Made With ❤️ By Soptq, Source Code @
          https://github.com/Soptq/ipfs-comments
        </ParagraphSmall>
        {/*</center>*/}
      </HeadingLevel>
    </Block>
  );
}

export default App;
