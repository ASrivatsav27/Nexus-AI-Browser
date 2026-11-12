"use client";

import { useEffect, useRef, useState } from "react";
import { Globe2, RotateCw, Search, TriangleAlert } from "lucide-react";
import type { BrowserTab } from "@/lib/desktop";
import { hostnameOf, resolveAddress } from "@/lib/address";

type Props = { active?: BrowserTab; available: boolean; onReload: () => void; onNavigate: (url: string) => void };

const QUICK_LINKS = [
  { label: "Wikipedia", url: "https://en.wikipedia.org" },
  { label: "Hacker News", url: "https://news.ycombinator.com" },
  { label: "MDN Web Docs", url: "https://developer.mozilla.org" },
];

/** Host region for the native WebContentsView; its bounds are reported to Electron. */
export function BrowserViewport({ active, available, onReload, onNavigate }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const el = host.current;
    const api = window.nexusBrowser;
    if (!el || !api) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        void api.command("bounds", { x: r.left, y: r.top, width: r.width, height: r.height }).catch(() => undefined);
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    update();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", update); };
  }, []);

  const blank = !active || active.url === "about:blank";
  return (
    <section className="viewport" aria-label="Web page" ref={host}>
      {!available && <div className="viewport-state"><TriangleAlert size={22} /><strong>Open Nexus in the desktop app</strong><span>Web pages render in the Electron window. Run <code>bun run electron:dev</code> from the frontend folder.</span></div>}
      {available && active?.error && (
        <div className="viewport-state error" role="alert">
          <TriangleAlert size={22} />
          <strong>This page can’t be reached</strong>
          <span>{hostnameOf(active.url) || "The address"} — {active.error.replace(/^ERR_/, "").replaceAll("_", " ").toLowerCase()}</span>
          <button type="button" className="button secondary" onClick={onReload}><RotateCw size={14} />Try again</button>
        </div>
      )}
      {available && !active?.error && blank && (
        <div className="viewport-state newtab">
          <div className="newtab-mark"><Globe2 size={22} /></div>
          <strong>Search the web</strong>
          <form className="newtab-search" role="search" onSubmit={(event) => { event.preventDefault(); const target = resolveAddress(query); if (target) { onNavigate(target); setQuery(""); } }}>
            <Search size={16} aria-hidden="true" />
            <input autoFocus aria-label="Search the web" placeholder="Search DuckDuckGo or enter an address" value={query} spellCheck={false} autoComplete="off" onChange={(event) => setQuery(event.target.value)} />
            <button type="submit" className="button primary small" disabled={!query.trim()}>Search</button>
          </form>
          <span>The assistant can read and act on whichever page is open.</span>
          <div className="quick-links">{QUICK_LINKS.map((link) => <button type="button" key={link.url} className="button secondary" onClick={() => onNavigate(link.url)}>{link.label}</button>)}</div>
        </div>
      )}
    </section>
  );
}
