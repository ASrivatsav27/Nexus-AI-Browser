import type { NextFunction, Request, Response } from "express";
import { executeAgentTask } from "../services/agent.service";

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

  try {
    res.json(await executeAgentTask(request.trim()));
  } catch (error) {
    next(error);
  }
}
