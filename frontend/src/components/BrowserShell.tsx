"use client";

import { useEffect, useRef, useState } from "react";
import { runAgent, type HistoryTurn } from "@/lib/api";
import { useBrowser } from "@/hooks/useBrowser";
import { useWorkspace } from "@/stores/workspace";
import { TabStrip } from "./browser/TabStrip";
import { NavigationToolbar } from "./browser/NavigationToolbar";
import { BrowserViewport } from "./browser/BrowserViewport";
import { AssistantPanel } from "./assistant/AssistantPanel";

export function BrowserShell() {
  const { browser, active, available, command, commandError, clearCommandError } = useBrowser();
  const { theme, assistantOpen, messages, toggleTheme, toggleAssistant, addUserMessage, addAssistantResult, addAssistantError, clearMessages } = useWorkspace();
  const [prompt, setPrompt] = useState("");
  const [working, setWorking] = useState(false);
  const running = useRef(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => { document.documentElement.dataset.theme = theme; void command("theme", theme); }, [theme, command]);

  async function submitPrompt() {
    const value = prompt.trim();
    if (!value || running.current) return;
    running.current = true;
    setWorking(true);
    setPrompt("");
    // Earlier turns (before this request) give the model the conversation context; failed/pending answers are skipped.
    const history: HistoryTurn[] = useWorkspace.getState().messages
      .filter((m) => m.role === "user" || !m.status)
      .map((m) => ({ role: m.role, text: m.text.slice(0, 4000), page: m.role === "user" && m.pageUrl ? { title: (m.pageTitle ?? "").slice(0, 300), url: m.pageUrl.slice(0, 2000) } : undefined }))
      .slice(-12);
    while (history.length && history.reduce((sum, turn) => sum + turn.text.length, 0) > 20_000) history.shift(); // stay under the backend's size cap, dropping the oldest first
    const pendingId = addUserMessage(value, active ? { title: active.title, url: active.url } : undefined);
    try {
      addAssistantResult(pendingId, await runAgent(value, history));
      await command("state");
    } catch (error) {
      addAssistantError(pendingId, error instanceof Error ? error.message : "The request failed.");
    } finally {
      running.current = false;
      setWorking(false);
    }
  }

  if (!mounted) return <main className="shell" />;
  return (
    <main className="shell">
      <TabStrip browser={browser} command={command} />
      <NavigationToolbar active={active} theme={theme} assistantOpen={assistantOpen} command={command} toggleTheme={toggleTheme} toggleAssistant={toggleAssistant} />
      {commandError && <div className="command-error" role="alert"><span>{commandError}</span><button type="button" onClick={clearCommandError}>Dismiss</button></div>}
      <div className="workspace">
        <BrowserViewport active={active} available={available} onReload={() => void command("reload")} onNavigate={(url) => void command("navigate", url)} />
        {assistantOpen && <AssistantPanel active={active} messages={messages} working={working} prompt={prompt} setPrompt={setPrompt} submit={() => void submitPrompt()} clear={clearMessages} />}
      </div>
    </main>
  );
}
