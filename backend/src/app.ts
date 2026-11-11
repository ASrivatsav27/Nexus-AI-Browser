import express from "express";
import browserRoutes from "./routes/browser.routes";
import healthRoutes from "./routes/health.routes";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

app.use(express.json());
app.use("/", healthRoutes);
app.use("/browser", browserRoutes);
app.use(errorHandler);

export default app;
