"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrowserCommand, BrowserState } from "@/lib/desktop";

/** Mirrors Electron's tab state and exposes validated browser commands. */
export function useBrowser() {
  const [browser, setBrowser] = useState<BrowserState>({ tabs: [] });
  const [available, setAvailable] = useState(true);
  const [commandError, setCommandError] = useState("");

  const command = useCallback(async (name: BrowserCommand, value?: unknown) => {
    try {
      const next = await window.nexusBrowser?.command(name, value);
      if (next) setBrowser(next);
      setCommandError("");
    } catch (error) {
      setCommandError(error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "") : "Browser command failed.");
    }
  }, []);

  useEffect(() => {
    const api = window.nexusBrowser;
    if (!api) { setAvailable(false); return; }
    let mounted = true;
    void api.command("state").then((next) => { if (mounted) setBrowser(next); }).catch(() => undefined);
    const unsubscribe = api.subscribe((next) => { if (mounted) setBrowser(next); });
    return () => { mounted = false; unsubscribe(); };
  }, []);

  const active = browser.tabs.find((tab) => tab.id === browser.activeId);
  return { browser, active, available, command, commandError, clearCommandError: () => setCommandError("") };
}
