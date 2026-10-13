# Gotcha! SaaS frontend

React 19 / Vite 8 builder interface. Companion API: [GotchaSaaS-Backend](https://github.com/aashrun/GotchaSaaS-Backend).

## Run

Requires Node 22+ and npm. Start the backend on port 7012 first.

```sh
npm ci
npm run dev
```

Open http://localhost:7011. Vite proxies `/v1` to 127.0.0.1:7012. Credentials stay in the backend; frontend `.env.example` only contains optional public Auth0 client configuration.

## Build and checks

```sh
npm run build
npm run test:e2e
npm run format:check
```

Build automatically compiles the trusted template source in `templates/` into ignored `public/templates/`. These scaffolds are synced from the backend's `Templates/` directory and never include customer code. Deploy `dist/` behind a same-origin `/v1` proxy to the backend. SPA routes must fall back to index.html. The backend can optionally serve this build by setting FRONTEND_DIST_DIR to its absolute path.

Browser tests require a running isolated frontend/backend, Chrome and MAIL_MODE=local. Use DEV_API_TARGET for a separate API port and E2E_APP_ORIGIN for its frontend origin. They create and remove synthetic browser accounts, mock paid generation/transcription, and do not launch paid builds. Do not run them against live email delivery. See EMAIL_VERIFICATION.md for the isolated setup.

Gotcha! uses the original Classic Quality wordmark and Gotcha Games favicon. All other text uses Arial. Themes have an inset borderless rounded Earth/cloud canvas, pinned credits, smooth collapsible navigation, project search, rotating personalized greetings, compact voice/send controls, and validated text/image references. `design-assets/` documents asset provenance. The image catalog rotates at login and every two hours.

See [CONNECTORS.md](CONNECTORS.md) for connector status/planning and reference limits; [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for folder and app organization. Shared architecture documents describe the integrated system; run commands above apply to this standalone repository.
