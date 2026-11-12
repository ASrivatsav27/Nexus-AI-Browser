"use client";

import { useRef } from "react";
import { Globe2, Sparkles, Trash2 } from "lucide-react";
import type { BrowserTab } from "@/lib/desktop";
import { hostnameOf } from "@/lib/address";
import type { Message } from "@/stores/workspace";
import { IconButton } from "@/components/ui/IconButton";
import { Conversation } from "./Conversation";
import { PromptComposer, type ComposerHandle } from "./PromptComposer";

// Mirrors the model configured in backend/src/services/agent.service.ts; switching is not implemented.
const CONFIGURED_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

export function ModelIndicator({ model }: { model: string }) {
  const name = model.split("/").pop()?.replace(/:free$/, "") ?? model;
  return <span className="model-indicator" title={`${model} via OpenRouter`}><i />{name} · OpenRouter</span>;
}

type Props = {
  active?: BrowserTab;
  messages: Message[];
  working: boolean;
  prompt: string;
  setPrompt: (value: string) => void;
  submit: () => void;
  clear: () => void;
};

export function AssistantPanel({ active, messages, working, prompt, setPrompt, submit, clear }: Props) {
  const composer = useRef<ComposerHandle>(null);
  const model = [...messages].reverse().find((m) => m.result)?.result?.model ?? CONFIGURED_MODEL;
  const hasPage = !!active && active.url !== "about:blank";

  return (
    <aside className="assistant" aria-label="Assistant">
      <header className="assistant-header">
        <span className="assistant-icon"><Sparkles size={17} /></span>
        <div className="assistant-title"><strong>Assistant</strong><ModelIndicator model={model} /></div>
        <IconButton label="Clear conversation" size="sm" disabled={!messages.length || working} onClick={clear}><Trash2 size={15} /></IconButton>
      </header>
      <div className="page-context" aria-label="Current page context">
        <div className="section-label">Current page</div>
        <div className="context-card">
          <Globe2 size={14} />
          {active && hasPage
            ? <div><strong>{active.title && active.title !== "New tab" ? active.title : hostnameOf(active.url)}</strong><span>{hostnameOf(active.url)}</span></div>
            : <div><strong>No page open</strong><span>Open a page to give the assistant context</span></div>}
        </div>
      </div>
      <Conversation messages={messages} onSuggest={(text) => { setPrompt(text); composer.current?.focus(); }} />
      <div className="composer-wrap"><PromptComposer ref={composer} value={prompt} working={working} onChange={setPrompt} onSubmit={submit} /></div>
    </aside>
  );
}
