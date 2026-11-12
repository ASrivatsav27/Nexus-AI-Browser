# Nexus backend

TypeScript + Express API that attaches (Playwright over CDP) to the running Nexus Electron app. It never launches a browser.

## Structure

```text
backend/
├── index.ts                    # Server entry point
└── src/
    ├── app.ts                  # Express app and middleware registration
    ├── controllers/             # HTTP request/response handling
    │   ├── agent.controller.ts
    │   └── browser.controller.ts
    ├── middlewares/             # Shared Express middleware
    │   └── error.middleware.ts
    ├── routes/                  # HTTP route definitions
    │   ├── agent.routes.ts
    │   └── browser.routes.ts
    └── services/                # Browser automation and business logic
        ├── agent.service.ts
        └── browser.service.ts
```

## Run

Start the backend first or second; it keeps watching for Electron and logs `[nexus] Electron browser connected` once the connection to the Electron app is up (and `disconnected` if it drops). Electron advertises its debugging port through `http://127.0.0.1:9234/active`. No Playwright browser download is needed.

```powershell
bun install
bun run index.ts
# or: node --env-file=.env --import tsx index.ts
```

The API listens on `http://127.0.0.1:8000`.

## Browser API

- `GET /` returns a JSON health check for the backend.
- `GET /browser/page` returns the active tab's URL and title.
- `POST /browser/navigate` with JSON `{ "url": "https://example.com" }` navigates the active tab and returns its URL and title. Only `http` and `https` URLs are accepted.
- `POST /agent/run` with JSON `{ "request": "Find the latest release notes on this page" }` sends the current page snapshot and request to the configured OpenRouter model, then lets it choose browser tools as needed.

Set `OPENROUTER_API_KEY` in `backend/.env` and restart the backend. The selected model is `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`. The page URL, visible text, controls, and your request are sent to OpenRouter for inference. API keys are not included in logs or responses.

Example PowerShell request:

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/agent/run" `
  -ContentType "application/json" `
  -Body (@{ request = "Find the page's contact link and open it" } | ConvertTo-Json)
```

The backend does not open any browser window; it only drives the active Nexus Electron tab.
