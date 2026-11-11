import app from "./src/app";
import { closeBrowser, startBrowser } from "./src/services/browser.service";

const port = Number(process.env.PORT ?? 8000);
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Nexus backend is running on http://127.0.0.1:${port}`);
  void startBrowser()
    .then(() => console.log("Nexus Chromium is ready with its own persistent profile."))
    .catch((error: unknown) => console.error("Nexus Chromium failed to launch:", error));
});

async function shutdown() {
  await closeBrowser();
  server.close(() => process.exit(0));
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
