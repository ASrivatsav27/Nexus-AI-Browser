import app from "./src/app";
import { closeBrowser } from "./src/services/browser.service";

const port = Number(process.env.PORT ?? 8000);
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Nexus backend is running on http://127.0.0.1:${port}`);
  console.log(`Waiting for the separate Nexus Edge window on ${process.env.NEXUS_BROWSER_CDP_PORT ?? "9233"}.`);
});

async function shutdown() {
  await closeBrowser();
  server.close(() => process.exit(0));
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
