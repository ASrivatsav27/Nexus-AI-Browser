import app from "./src/app";
import { closeBrowser, watchElectronConnection } from "./src/services/browser.service";

const port = Number(process.env.PORT ?? 8000);
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Nexus backend is running on http://127.0.0.1:${port}`);
  console.log("[nexus] The backend never launches a browser; it attaches to the Nexus Electron app.");
  watchElectronConnection();
});

async function shutdown() {
  await closeBrowser();
  server.close(() => process.exit(0));
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
