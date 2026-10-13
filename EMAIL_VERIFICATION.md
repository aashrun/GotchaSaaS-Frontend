# Email verification

The operator's local backend now uses Resend rather than the development mailbox. Credentials remain only in ignored `backend/.env`. The Gotcha! email includes a one-use verification link expiring in 24 hours; reset links expire in 30 minutes. Resend requests use a token-bound idempotency key. Delivery failures do not strand a newly registered account: the session still opens, the user stays unverified, and Settings/the studio offer a retry. The verification page refreshes the session state after consuming the link.

For a new backend deployment, set these environment values using a verified sending domain:

```dotenv
MAIL_MODE=resend
RESEND_API_KEY=your-server-side-key
MAIL_FROM=Gotcha! <no-reply@your-verified-domain.example>
APP_ORIGIN=https://your-builder-domain.example
```

`APP_ORIGIN` is both the browser/API origin and the destination used in email links. Local links point to localhost:7011 and require the local app to be running. A successful provider acceptance is not the same as delivery; inspect the Resend event status when troubleshooting. Verification remains pending until the user opens the link. Existing accounts are never marked verified by changing configuration.

## First build

1. Enter an idea on the project home and press the arrow. This saves the idea and opens the studio.
2. If verification is pending, use **Send verification email**, open the link, then **I’ve verified — check status**. Settings also offers resend and a status refresh.
3. Use **Review credits & build** (or the composer arrow). Review the estimated credits and approve generation.
4. Watch progress in the conversation. The preview updates after the generated app passes its checks. A starter preview is explicitly labeled as not built yet.

The UI identifies missing model/sandbox configuration and links to Connectors. Creating a project does not itself execute a paid build without approval.

## Isolated browser testing

Use a separate local API with `MAIL_MODE=local`, `RUN_WORKER=false`, paid providers disabled, and the dedicated `nebula_studio_e2e_test` database. Point it at `APP_ORIGIN=http://localhost:7013` and `NEBULA_PORT=7014`. Run the frontend with `DEV_API_TARGET=http://127.0.0.1:7014 npm run dev -w frontend -- --port 7013`, then run `E2E_APP_ORIGIN=http://localhost:7013 npm run test:e2e`. Synthetic browser tests must not use the operator's live email delivery. The actual user app keeps ports 7011/7012.
