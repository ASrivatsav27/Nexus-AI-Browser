import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext, Page } from "playwright";

const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const profileDirectory = process.env.NEXUS_BROWSER_PROFILE_DIR ?? resolve(backendDirectory, ".data/chromium-profile");
let contextPromise: Promise<BrowserContext> | undefined;

/** Launch and reuse Nexus's own visible Chromium with a persistent profile. */
export async function startBrowser(): Promise<BrowserContext> {
  contextPromise ??= (async () => {
    const { chromium } = await import("playwright");
    return chromium.launchPersistentContext(profileDirectory, { headless: false });
  })().catch((error: unknown) => {
    contextPromise = undefined;
    throw new Error("Could not launch Nexus's Chromium browser. Install it with `npx playwright install chromium`.", {
      cause: error,
    });
  });
  return contextPromise;
}

export async function getActivePage(): Promise<Page> {
  const context = await startBrowser();
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

/** Close Nexus's Chromium browser cleanly when the backend shuts down. */
export async function closeBrowser(): Promise<void> {
  const context = await contextPromise?.catch(() => undefined);
  await context?.close();
  contextPromise = undefined;
}
