import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  const candidateStatus = error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
  const status = typeof candidateStatus === "number" && candidateStatus >= 400 && candidateStatus < 600 ? candidateStatus : 503;
  res.status(status).json({ error: message });
};
