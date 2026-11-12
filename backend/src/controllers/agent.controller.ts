import type { NextFunction, Request, Response } from "express";
import { executeAgentTask, type HistoryTurn } from "../services/agent.service";

const MAX_HISTORY_ITEMS = 20;
const MAX_HISTORY_CHARS = 24_000;

/** Validates client-supplied chat history; returns an error string when it is malformed. */
function parseHistory(raw: unknown): HistoryTurn[] | string {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > MAX_HISTORY_ITEMS) return `history must be an array of at most ${MAX_HISTORY_ITEMS} messages`;
  const turns: HistoryTurn[] = [];
  let total = 0;
  for (const item of raw) {
    if (!item || typeof item !== "object") return "history contains an invalid message";
    const { role, text, page } = item as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof text !== "string" || text.length > 4000) return "history contains an invalid message";
    total += text.length;
    let pageContext: HistoryTurn["page"];
    if (page !== undefined) {
      const { title, url } = (page ?? {}) as Record<string, unknown>;
      if (typeof title !== "string" || typeof url !== "string" || title.length > 300 || url.length > 2000) return "history contains an invalid page reference";
      pageContext = { title, url };
    }
    if (text.trim()) turns.push({ role, text, page: pageContext });
  }
  return total > MAX_HISTORY_CHARS ? "history is too long" : turns;
}

export async function runAgent(req: Request, res: Response, next: NextFunction) {
  const request: unknown = req.body?.request;
  if (typeof request !== "string" || !request.trim()) {
    res.status(400).json({ error: "request must be a non-empty string" });
    return;
  }
  if (request.length > 4000) {
    res.status(400).json({ error: "request must be 4000 characters or fewer" });
    return;
  }
  const history = parseHistory(req.body?.history);
  if (typeof history === "string") {
    res.status(400).json({ error: history });
    return;
  }

  try {
    res.json(await executeAgentTask(request.trim(), history));
  } catch (error) {
    next(error);
  }
}
