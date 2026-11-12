const SEARCH_URL = "https://duckduckgo.com/?q=";
const HOST = /^[^\s/?#]+\.[a-z]{2,}(:\d+)?([/?#]\S*)?$/i;
const LOCAL = /^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?([/?#]\S*)?$/i;

/** Turns address-bar input into a navigable http(s) URL, or a web search for free text. */
export function resolveAddress(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (LOCAL.test(raw)) return `http://${raw}`;
  if (HOST.test(raw)) return `https://${raw}`;
  return `${SEARCH_URL}${encodeURIComponent(raw)}`;
}

export function hostnameOf(url?: string): string {
  if (!url || url === "about:blank") return "";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}
