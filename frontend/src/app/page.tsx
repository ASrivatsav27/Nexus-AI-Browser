"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowRight, Check, ChevronDown, CircleHelp, Clock3, Globe2, History, LayoutGrid, LoaderCircle, MessageSquare, Moon, MoreHorizontal, Plus, RefreshCw, Send, Settings2, ShieldCheck, Sun, X } from "lucide-react";
import { getCurrentPage, navigate, runAgent } from "@/lib/api";
import { useWorkspace } from "@/stores/workspace";

export default function Home() {
  const queryClient = useQueryClient();
  const page = useQuery({ queryKey: ["page"], queryFn: getCurrentPage, refetchInterval: 8000 });
  const navigation = useMutation({ mutationFn: navigate, onSuccess: (value) => queryClient.setQueryData(["page"], value) });
  const agent = useMutation({ mutationFn: runAgent });
  const [address, setAddress] = useState("");
  const [prompt, setPrompt] = useState("");
  const [themeReady, setThemeReady] = useState(false);
  const { theme, toggleTheme, messages, addUserMessage, addAssistantResult, addAssistantError } = useWorkspace();
  const currentHostname = page.data?.url ? new URL(page.data.url).hostname : "";
  useEffect(() => { setThemeReady(true); }, []);
  useEffect(() => { if (page.data?.url) setAddress(page.data.url); }, [page.data?.url]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme, themeReady]);

  async function submitPrompt(event: FormEvent) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value || agent.isPending) return;
    setPrompt("");
    const pendingId = addUserMessage(value);
    try {
      const result = await agent.mutateAsync(value);
      addAssistantResult(pendingId, result);
      queryClient.setQueryData(["page"], { url: result.page.url, title: result.page.title });
    } catch (error) {
      addAssistantError(pendingId, error instanceof Error ? error.message : "The request failed.");
    }
  }

  function submitAddress(event: FormEvent) {
    event.preventDefault();
    const raw = address.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    navigation.mutate(url);
  }

  return <main className="app-shell">
    <aside className="rail">
      <div className="brand-mark">N</div>
      <button className="rail-button selected" aria-label="Browser"><Globe2 /></button>
      <button className="rail-button" aria-label="Assistant"><MessageSquare /></button>
      <button className="rail-button" aria-label="History"><History /></button>
      <div className="rail-spacer" />
      <button className="rail-button" onClick={toggleTheme} aria-label="Toggle color theme">{theme === "dark" ? <Sun /> : <Moon />}</button>
      <button className="rail-button" aria-label="Settings"><Settings2 /></button>
      <div className="avatar">A</div>
    </aside>

    <section className="workspace">
      <header className="topbar">
        <div className="window-label"><span className="window-dot" />Nexus</div>
        <div className="tabs"><div className="tab active"><Globe2 size={15} />{page.data?.title || "New tab"}<X size={14} className="tab-close" /></div><button className="icon-button" aria-label="New tab"><Plus size={17} /></button></div>
        <div className="window-actions"><button className="icon-button" aria-label="Help"><CircleHelp size={17} /></button><button className="icon-button" aria-label="More options"><MoreHorizontal size={18} /></button></div>
      </header>
      <div className="toolbar">
        <button className="icon-button" aria-label="Back"><ArrowLeft size={17} /></button><button className="icon-button" aria-label="Forward"><ArrowRight size={17} /></button>
        <button className="icon-button" aria-label="Reload" onClick={() => page.refetch()}><RefreshCw size={15} /></button>
        <form className="address-form" onSubmit={submitAddress}><ShieldCheck size={15} /><input aria-label="Address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Search or enter address" /><button type="submit" className="address-go">Go</button></form>
        <button className="icon-button" aria-label="Browser menu"><ChevronDown size={16} /></button>
      </div>

      <div className="content-layout">
        <section className="page-view">
          <div className="page-meta"><div className="page-meta-title"><span className="site-favicon"><Globe2 size={15} /></span><div><strong>{page.data?.title || "Browser"}</strong><span>{page.data?.url || "Connect to the Nexus backend to begin"}</span></div></div><button className="icon-button subtle" aria-label="Page options"><MoreHorizontal size={18} /></button></div>
          <div className="webpage">
            {page.isLoading ? <div className="empty-state"><LoaderCircle className="spin" /><span>Connecting to browser…</span></div> : page.isError ? <div className="empty-state"><Globe2 /><strong>Browser isn’t connected</strong><span>Start the Nexus backend to see the active Chromium tab here.</span><button className="secondary-button" onClick={() => page.refetch()}>Retry connection</button></div> : <div className="web-placeholder"><div className="example-kicker">{currentHostname}</div><h1>{page.data?.title || "Untitled page"}</h1><p>Your active Chromium tab is controlled by the Nexus agent. Ask a question or give it a task in the assistant panel.</p><div className="skeleton-line wide"/><div className="skeleton-line"/><div className="skeleton-line short"/></div>}
          </div>
          <div className="statusbar"><span><span className={`status-dot ${page.isError ? "offline" : ""}`} />{page.isError ? "Backend offline" : "Browser connected"}</span><span>{currentHostname || "Waiting for browser"}</span></div>
        </section>

        <aside className="assistant-panel">
          <div className="assistant-header"><div className="assistant-heading"><div className="assistant-icon"><MessageSquare size={17} /></div><div><strong>Assistant</strong><span>Works with your current page</span></div></div><button className="icon-button" aria-label="Assistant options"><MoreHorizontal size={18} /></button></div>
          <button className="model-select"><span className="model-dot" /><span>Nemotron · OpenRouter</span><ChevronDown size={15} /></button>
          <div className="conversation">
            {messages.length === 0 ? <div className="welcome"><div className="welcome-icon"><MessageSquare size={19} /></div><h2>What can I help with?</h2><p>I can read this page and take browser actions based on your request.</p><div className="suggestions"><button onClick={() => setPrompt("Summarize this page")}>Summarize this page <ArrowDown size={13} /></button><button onClick={() => setPrompt("Find the main links on this page")}>Find key links <ArrowDown size={13} /></button></div></div> : <div className="messages">{messages.map((message) => <article className={`message ${message.role}`} key={message.id}><div className="message-label">{message.role === "user" ? "You" : "Nexus"}</div><div className="message-body">{message.text}</div>{message.result && <div className="action-list">{message.result.actions.map((action, index) => <span className={`action-chip ${action.ok ? "" : "failed"}`} key={`${action.tool}-${index}`}>{action.ok ? <Check size={12} /> : <X size={12} />}{action.tool.replace("browser_", "").replaceAll("_", " ")}</span>)}</div>}</article>)}</div>}
          </div>
          <div className="composer-wrap"><div className="page-context"><Globe2 size={13} /><span>{page.data?.title || "Current page"}</span><span className="context-url">{currentHostname}</span></div><form className="composer" onSubmit={submitPrompt}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Ask about this page or tell Nexus what to do…" rows={3} disabled={agent.isPending} /><div className="composer-footer"><span className="composer-hint">Enter to send · Shift+Enter for new line</span><button className="send-button" type="submit" disabled={!prompt.trim() || agent.isPending} aria-label="Send message">{agent.isPending ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}</button></div></form><div className="privacy-note"><ShieldCheck size={12} />Actions happen in your visible browser</div></div>
        </aside>
      </div>
      <footer className="bottom-bar"><span><LayoutGrid size={14} />Nexus workspace</span><span><Clock3 size={13} />Session state saved on this device</span></footer>
    </section>
  </main>;
}
