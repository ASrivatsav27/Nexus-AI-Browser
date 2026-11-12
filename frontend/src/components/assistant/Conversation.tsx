"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Check, CircleHelp, Copy, LoaderCircle, TriangleAlert, X } from "lucide-react";
import type { Message as MessageType } from "@/stores/workspace";

function ActionChips({ message }: { message: MessageType }) {
  if (!message.result?.actions.length) return null;
  return (
    <div className="action-list" aria-label="Actions taken">
      {message.result.actions.map((action, index) => (
        <span key={`${action.tool}-${index}`} className={`action-chip ${action.ok ? "" : "failed"}`} title={action.error}>
          {action.ok ? <Check size={11} /> : <X size={11} />}{action.tool.replace("browser_", "").replaceAll("_", " ")}
        </span>
      ))}
    </div>
  );
}

export function Message({ message }: { message: MessageType }) {
  const [copied, setCopied] = useState(false);
  if (message.role === "user") {
    return (
      <article className="message user">
        <CircleHelp size={15} aria-hidden="true" />
        <p>{message.text}</p>
      </article>
    );
  }
  if (message.status === "pending") {
    return <article className="message answer pending" aria-busy="true"><div className="answer-head"><LoaderCircle size={14} className="spin" />Working on this page…</div></article>;
  }
  const failed = message.status === "error";
  async function copy() {
    try { await navigator.clipboard.writeText(message.text); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  }
  return (
    <article className={`message answer ${failed ? "failed" : ""}`}>
      <div className="answer-head">{failed ? <TriangleAlert size={14} /> : <Bot size={14} />}{failed ? "Request failed" : "Answer"}</div>
      <p>{message.text}</p>
      <ActionChips message={message} />
      {!failed && <button type="button" className="button secondary small" onClick={() => void copy()}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}</button>}
    </article>
  );
}

export function Conversation({ messages, onSuggest }: { messages: MessageType[]; onSuggest: (text: string) => void }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages]);

  if (!messages.length) {
    return (
      <div className="conversation empty">
        <div className="section-label">Try asking</div>
        {["Summarize this page", "List the main links on this page", "What is this page about?"].map((text) => (
          <button type="button" key={text} className="suggestion" onClick={() => onSuggest(text)}>{text}</button>
        ))}
      </div>
    );
  }
  return (
    <div className="conversation" role="log" aria-live="polite" aria-label="Conversation">
      <div className="section-label">Conversation</div>
      {messages.map((message) => <Message key={message.id} message={message} />)}
      <div ref={end} />
    </div>
  );
}
