# Nexus backend

TypeScript + Bun + Express API with Playwright attached to a separate Nexus-owned Microsoft Edge profile.

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

Install dependencies and open a separate Nexus Edge window, then start the backend:

```powershell
npm install
Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList @("--remote-debugging-port=9233", "--user-data-dir=C:\MajorProject\Nexus\backend\.data\nexus-edge-profile", "--no-first-run", "about:blank")
bun run index.ts
```

The npm lockfile pins the installed dependencies. Bun is still the TypeScript runtime for the server.

Playwright attaches through the local CDP endpoint on port `9233`. The separate browser profile is stored under `backend/.data/nexus-edge-profile`; this does not connect to Comet or use your normal Edge profile.

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

Keep the Nexus Edge window open while using the backend. It closes separately from the backend and does not affect Comet.
