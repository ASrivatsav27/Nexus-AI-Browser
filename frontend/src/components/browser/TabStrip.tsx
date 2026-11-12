import { Globe2, LoaderCircle, Plus, X } from "lucide-react";
import type { BrowserState, BrowserTab as Tab } from "@/lib/desktop";
import { hostnameOf } from "@/lib/address";
import { IconButton } from "@/components/ui/IconButton";

function tabLabel(tab: Tab) {
  if (tab.url === "about:blank" || !tab.url) return "New tab";
  return tab.title && tab.title !== "New tab" ? tab.title : hostnameOf(tab.url) || "New tab";
}

export function BrowserTab({ tab, active, onSelect, onClose }: { tab: Tab; active: boolean; onSelect: () => void; onClose: () => void }) {
  const label = tabLabel(tab);
  return (
    <div className={`tab ${active ? "active" : ""}`} role="presentation">
      <button type="button" className="tab-select" role="tab" aria-selected={active} title={label} onClick={onSelect}>
        {tab.loading ? <LoaderCircle size={14} className="spin tab-icon" /> : <Globe2 size={14} className="tab-icon" />}
        <span>{label}</span>
      </button>
      <button type="button" className="tab-close" aria-label={`Close ${label}`} onClick={onClose}><X size={13} /></button>
    </div>
  );
}

export function TabStrip({ browser, command }: { browser: BrowserState; command: (name: "select" | "close" | "new", value?: unknown) => Promise<void> }) {
  return (
    <header className="tabstrip">
      <div className="tabs" role="tablist" aria-label="Browser tabs">
        {browser.tabs.map((tab) => (
          <BrowserTab key={tab.id} tab={tab} active={tab.id === browser.activeId} onSelect={() => void command("select", tab.id)} onClose={() => void command("close", tab.id)} />
        ))}
        <IconButton label="New tab" size="sm" onClick={() => void command("new")}><Plus size={16} /></IconButton>
      </div>
    </header>
  );
}
