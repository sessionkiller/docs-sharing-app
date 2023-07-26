import React, { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";

const SAVE_INTERVAL_MS = 2000;
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
];

const TextEditor = () => {
  const { id: documentId } = useParams();
  const wrapperRef = useRef();
  const socketRef = useRef();
  const quillRef = useRef();

  useEffect(() => {
    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.once("load-document", (document) => {
      quillRef.current.setContents(document);
      quillRef.current.enable();
    });

    socket.emit("get-document", documentId);

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    //INIT
    const editor = document.createElement("div");
    wrapperRef.current.append(editor);
    const node = wrapperRef.current;
    const q = new Quill(editor, {
      theme: "snow",
      modules: { toolbar: TOOLBAR_OPTIONS },
    });
    quillRef.current = q;

    q.disable();
    q.setText("Loading...");

    //HANDLING CHANGES
    const changesHandler = (delta, oldDelta, source) => {
      if (source !== "user") return;
      socketRef.current.emit("send-changes", delta);
    };
    q.on("text-change", changesHandler);

    //RECEIVING CHANGES
    const socket = socketRef.current;
    const receivingHandler = (delta) => {
      q.updateContents(delta);
    };
    socket.on("receive-changes", receivingHandler);

    //CLEANUP
    return () => {
      q.off("text-change", changesHandler);
      socket.off("receive-changes", receivingHandler);
      node.innerHTML = "";
    };
  }, []);

  return <div className="container" ref={wrapperRef}></div>;
};

export default TextEditor;
