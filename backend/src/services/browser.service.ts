import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext, Page } from "playwright";

const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const profileDirectory = process.env.NEXUS_BROWSER_PROFILE_DIR ?? resolve(backendDirectory, ".data/chromium-profile");
let contextPromise: Promise<BrowserContext> | undefined;

/** Launch and reuse Nexus's own visible Chromium with a persistent profile. */
export async function startBrowser(): Promise<BrowserContext> {
  contextPromise ??= (async () => {
    process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve(backendDirectory, ".playwright");
    const { chromium } = await import("playwright");
    return chromium.launchPersistentContext(profileDirectory, { headless: false });
  })()
    .catch((error: unknown) => {
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

/** Close Nexus's browser cleanly when the backend shuts down. */
export async function closeBrowser(): Promise<void> {
  const context = await contextPromise?.catch(() => undefined);
  await context?.close();
  contextPromise = undefined;
}
