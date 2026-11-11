# Nexus backend

TypeScript + Bun + Express API with Playwright launching a Nexus-owned Chromium browser.

## Structure

```text
backend/
├── index.ts                    # Server entry point
└── src/
    ├── app.ts                  # Express app and middleware registration
    ├── controllers/             # HTTP request/response handling
    │   └── browser.controller.ts
    ├── middlewares/             # Shared Express middleware
    │   └── error.middleware.ts
    ├── routes/                  # HTTP route definitions
    │   └── browser.routes.ts
    └── services/                # Browser automation and business logic
        └── browser.service.ts
```

## Run

Install dependencies and the Playwright-managed Chromium browser once, then start the backend:

```powershell
npm install
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.playwright"
npx playwright install chromium
bun run index.ts
```

The npm lockfile pins the installed dependencies. Bun is still the TypeScript runtime for the server.

The backend launches a visible Chromium window using a persistent Nexus profile stored under `backend/.data/chromium-profile`. It does not connect to Comet.

The API listens on `http://127.0.0.1:8000`.

## Browser API

- `GET /` returns a JSON health check for the backend.
- `GET /browser/page` returns the active tab's URL and title.
- `POST /browser/navigate` with JSON `{ "url": "https://example.com" }` navigates the active tab and returns its URL and title. Only `http` and `https` URLs are accepted.

Playwright owns the browser process and closes it when the backend receives Ctrl+C.
