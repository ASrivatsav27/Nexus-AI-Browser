import express from "express";
import agentRoutes from "./routes/agent.routes";
import browserRoutes from "./routes/browser.routes";
import healthRoutes from "./routes/health.routes";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

const allowedOrigins = new Set(["http://127.0.0.1:48000", "http://127.0.0.1:3000"]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) { res.status(403).json({ error: "Origin not allowed" }); return; }
  if (origin) { res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Vary", "Origin"); res.setHeader("Access-Control-Allow-Headers", "Content-Type"); res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); }
  if (req.method === "OPTIONS") { res.sendStatus(204); return; }
  next();
});
app.use(express.json());
app.use("/", healthRoutes);
app.use("/agent", agentRoutes);
app.use("/browser", browserRoutes);
app.use(errorHandler);

export default app;
