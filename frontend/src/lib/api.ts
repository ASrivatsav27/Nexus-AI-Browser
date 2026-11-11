import { agentResponseSchema, pageSchema } from "./schemas";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data: unknown = await response.json();
  if (!response.ok) throw new Error(typeof (data as { error?: unknown })?.error === "string" ? (data as { error: string }).error : `Request failed (${response.status})`);
  return data;
}

export async function getCurrentPage() { return pageSchema.parse(await request("/browser/page")); }
export async function navigate(url: string) { return pageSchema.parse(await request("/browser/navigate", { method: "POST", body: JSON.stringify({ url }) })); }
export async function runAgent(requestText: string) { return agentResponseSchema.parse(await request("/agent/run", { method: "POST", body: JSON.stringify({ request: requestText }) })); }
