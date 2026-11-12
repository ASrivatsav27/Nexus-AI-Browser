import type { Browser, BrowserContext, Page } from "playwright";
let browserPromise: Promise<Browser> | undefined;
let connectedPort: number | undefined;
let electronUp = false;
type Bridge = { targetId?: string; cdpPort?: number };
// Electron advertises its own debugging port; a fixed port can be taken by another Chromium browser.
async function readBridge(): Promise<Required<Bridge>> {
  const response = await fetch("http://127.0.0.1:9234/active", { signal: AbortSignal.timeout(3000) }).catch((error) => { throw new Error("Nexus Electron app is not running (bridge 127.0.0.1:9234 unreachable).", { cause: error }); });
  const state = await response.json() as Bridge;
  if (!response.ok || !state.targetId || !state.cdpPort) throw new Error("Select a webpage tab in Nexus.");
  return { targetId: state.targetId, cdpPort: state.cdpPort };
}
async function connect(port: number) {
  if (browserPromise && connectedPort !== port) { browserPromise.catch(() => undefined); browserPromise = undefined; }
  connectedPort = port;
  browserPromise ??= import("playwright").then(async ({ chromium }) => {
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 10000 });
    if (!electronUp) { electronUp = true; console.log(`[nexus] Electron browser connected (CDP 127.0.0.1:${port}).`); }
    browser.on("disconnected", () => { browserPromise = undefined; if (electronUp) { electronUp = false; console.log("[nexus] Electron browser disconnected."); } });
    return browser;
  }).catch(error => { browserPromise = undefined; const reason = error instanceof Error ? error.message.split("\n")[0] : String(error); throw new Error(`Could not attach to the Nexus Electron app (CDP 127.0.0.1:${port}): ${reason}`, { cause: error }); });
  return browserPromise;
}
/**
 * Passive watcher: never launches a browser. It only attaches to the running Nexus Electron app
 * and logs when that connection comes up or goes away.
 */
export function watchElectronConnection(intervalMs = 3000) {
  let lastReason = "";
  const tick = async () => {
    try { await connect((await readBridge()).cdpPort); lastReason = ""; }
    catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (reason !== lastReason) { lastReason = reason; console.log(`[nexus] Waiting for Electron browser: ${reason}`); }
    }
  };
  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
export async function startBrowser(): Promise<BrowserContext> {
  const context = (await connect((await readBridge()).cdpPort)).contexts()[0];
  if (!context) throw new Error("No Electron browser context available.");
  return context;
}
export async function getActivePage(): Promise<Page> {
  const state = await readBridge();
  for (const context of (await connect(state.cdpPort)).contexts()) {
    for (const page of context.pages()) {
      const session = await context.newCDPSession(page);
      try { const info = await session.send("Target.getTargetInfo"); if (info.targetInfo.targetId === state.targetId) return page; }
      finally { await session.detach(); }
    }
  }
  throw new Error("Selected tab is not ready. Try again.");
}
export async function navigateTo(url: string): Promise<Page> {
  const page = await getActivePage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return page;
}

export type PageSnapshot = {
  url: string;
  title: string;
  text: string;
  controls: Array<{
    role: string;
    name: string;
    type?: string;
    placeholder?: string;
    href?: string;
    disabled?: boolean;
  }>;
};

export async function getPageSnapshot(page?: Page): Promise<PageSnapshot> {
  const activePage = page ?? (await getActivePage());
  const [title, text, controls] = await Promise.all([
    activePage.title(),
    activePage.locator("body").innerText({ timeout: 5000 }).catch(() => ""),
    activePage.locator("button,a,input,textarea,select,[role=button],[role=link]").evaluateAll((elements) =>
      elements.slice(0, 80).map((element) => {
        const el = element as HTMLElement;
        const input = el as HTMLInputElement;
        const role = el.getAttribute("role") ?? ({ A: "link", BUTTON: "button", INPUT: input.type === "checkbox" ? "checkbox" : input.type === "radio" ? "radio" : "textbox", TEXTAREA: "textbox", SELECT: "combobox" } as Record<string, string>)[el.tagName] ?? el.tagName.toLowerCase();
        const labels = "labels" in el ? Array.from((el as HTMLInputElement).labels ?? []).map((label) => label.innerText).join(" ") : "";
        return {
          role,
          name: el.getAttribute("aria-label") || labels || el.innerText || input.placeholder || input.value || "",
          type: input.type || undefined,
          placeholder: input.placeholder || undefined,
          href: el instanceof HTMLAnchorElement ? el.href : undefined,
          disabled: "disabled" in el ? Boolean(input.disabled) : undefined,
        };
      }),
    ).catch(() => []),
  ]);

  return {
    url: activePage.url(),
    title,
    text: text.slice(0, 12000),
    controls: controls.map((control) => ({ ...control, name: control.name.trim().slice(0, 200) })).filter((control) => control.name),
  };
}

export async function clickByRole(role: string, name: string): Promise<void> {
  const page = await getActivePage();
  await page.getByRole(role as Parameters<Page["getByRole"]>[0], { name, exact: true }).click({ timeout: 10_000 });
}

export async function fillByLabel(label: string, value: string): Promise<void> {
  const page = await getActivePage();
  await page.getByLabel(label, { exact: true }).fill(value, { timeout: 10_000 });
}

export async function selectByLabel(label: string, value: string): Promise<void> {
  const page = await getActivePage();
  await page.getByLabel(label, { exact: true }).selectOption(value, { timeout: 10_000 });
}

export async function scrollPage(direction: "up" | "down", amount: number): Promise<void> {
  const page = await getActivePage();
  await page.evaluate((distance) => window.scrollBy(0, distance), direction === "down" ? amount : -amount);
}

export async function closeBrowser(): Promise<void> {
  const browser = await browserPromise?.catch(() => undefined);
  browserPromise = undefined;
  await browser?.close();
}
