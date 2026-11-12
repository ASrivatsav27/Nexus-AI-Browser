"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Lock, Moon, PanelRight, RotateCw, Search, Sun } from "lucide-react";
import type { BrowserTab } from "@/lib/desktop";
import { resolveAddress } from "@/lib/address";
import { IconButton } from "@/components/ui/IconButton";

export function AddressBar({ active, onSubmit }: { active?: BrowserTab; onSubmit: (url: string) => void }) {
  const shown = active?.url && active.url !== "about:blank" ? active.url : "";
  const [draft, setDraft] = useState(shown);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (document.activeElement !== input.current) setDraft(shown); }, [shown, active?.id]);
  const secure = shown.startsWith("https://");

  function submit(event: FormEvent) {
    event.preventDefault();
    const target = resolveAddress(draft);
    if (!target) return;
    onSubmit(target);
    input.current?.blur();
  }

  return (
    <form className="address-bar" onSubmit={submit} role="search">
      <span className={`address-lock ${secure ? "secure" : ""}`} aria-hidden="true">{shown ? <Lock size={14} /> : <Search size={14} />}</span>
      <input
        ref={input}
        aria-label="Address and search"
        value={draft}
        spellCheck={false}
        autoComplete="off"
        placeholder="Search or enter address"
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={() => setDraft(shown)}
        onKeyDown={(event) => { if (event.key === "Escape") { setDraft(shown); event.currentTarget.blur(); } }}
      />
    </form>
  );
}

type Props = {
  active?: BrowserTab;
  theme: "light" | "dark";
  assistantOpen: boolean;
  command: (name: "back" | "forward" | "reload" | "navigate", value?: unknown) => Promise<void>;
  toggleTheme: () => void;
  toggleAssistant: () => void;
};

export function NavigationToolbar({ active, theme, assistantOpen, command, toggleTheme, toggleAssistant }: Props) {
  return (
    <nav className="toolbar" aria-label="Browser controls">
      <div className="toolbar-group">
        <IconButton label="Back" disabled={!active?.canGoBack} onClick={() => void command("back")}><ArrowLeft size={18} /></IconButton>
        <IconButton label="Forward" disabled={!active?.canGoForward} onClick={() => void command("forward")}><ArrowRight size={18} /></IconButton>
        <IconButton label="Reload" disabled={!active || active.url === "about:blank"} onClick={() => void command("reload")}><RotateCw size={16} /></IconButton>
      </div>
      <AddressBar active={active} onSubmit={(url) => void command("navigate", url)} />
      <div className="toolbar-group right">
        <IconButton label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={toggleTheme}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</IconButton>
        <button type="button" className={`assistant-toggle ${assistantOpen ? "is-active" : ""}`} aria-pressed={assistantOpen} onClick={toggleAssistant}>
          <PanelRight size={16} /><span>Assistant</span>
        </button>
      </div>
    </nav>
  );
}
