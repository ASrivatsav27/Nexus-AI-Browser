import type { Browser, Page } from "playwright";

const cdpPort = Number(process.env.NEXUS_BROWSER_CDP_PORT ?? 9233);
const cdpEndpoint = `http://127.0.0.1:${cdpPort}`;
let browserPromise: Promise<Browser> | undefined;

async function waitForCdp(): Promise<void> {
  const deadline = Date.now() + 15_000;
  let lastError = "not responding yet";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${cdpEndpoint}/json/version`, { signal: AbortSignal.timeout(750) });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "connection failed";
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  }

  throw new Error(`Nexus Edge is not available at ${cdpEndpoint}: ${lastError}. Start the Nexus Edge window first.`);
}

/** Attach Playwright to the separate Nexus Edge window at its local CDP endpoint. */
export async function startBrowser(): Promise<Browser> {
  browserPromise ??= (async () => {
    await waitForCdp();
    const { chromium } = await import("playwright");
    return chromium.connectOverCDP(cdpEndpoint, { timeout: 10_000 });
  })().catch((error: unknown) => {
    browserPromise = undefined;
    const detail = error instanceof Error ? error.message : "unknown startup error";
    throw new Error(`Could not connect to Nexus Edge: ${detail}`, { cause: error });
  });

  return browserPromise;
}

export async function getActivePage(): Promise<Page> {
  const browser = await startBrowser();
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const pages = context.pages();
  return pages.at(-1) ?? context.newPage();
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

/** Disconnect Playwright from the Nexus Edge window. */
export async function closeBrowser(): Promise<void> {
  const browser = await browserPromise?.catch(() => undefined);
  await browser?.close().catch(() => undefined);
  browserPromise = undefined;
}
