# Nexus backend

TypeScript + Express API with Playwright launching a Nexus-owned Chromium browser.

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

Install dependencies and the Playwright-managed Chromium browser once, then start the backend:

```powershell
npm install
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.playwright"
npx playwright install chromium
node --env-file=.env --import tsx index.ts
```

The backend launches a visible Chromium window using a persistent Nexus profile stored under `backend/.data/chromium-profile`. It does not connect to Comet or Microsoft Edge.

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

The Chromium window launches with the backend and closes when the backend receives Ctrl+C.
