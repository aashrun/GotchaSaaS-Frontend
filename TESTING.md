# Testing and verified limits

Use Node 22+, PostgreSQL and the installed Chrome browser.

- `npm test`: 42 passing backend integration/security/transport tests; 9 live-provider tests explicitly blocked/skipped; 0 failures.
- `npm run test:e2e`: 7 passing browser workflows; 0 failures.
- `npm run check`: JavaScript syntax, production frontend build and five curated frontend template builds.
- `npm audit`: zero reported vulnerabilities after patched UUID and DOMPurify overrides. These overrides deliberately update vulnerable transitive versions and are covered by runtime tests.
- All five migrations passed up/down/up on a dedicated empty database. Shared-history downgrade intentionally refuses to remove actor nullability while anonymous records exist.

Integration tests use only `nebula_studio_test` and assert that database name before fixture cleanup. They exercise actual PostgreSQL, HTTP, cookies, bcrypt, CSRF, organization authorization, source persistence/snapshots/restore, ZIP bytes, credit row locks/idempotency, cancellation/recovery, provider preflight rejection, raw-body Stripe signature/duplicate delivery, partial-resource deletion guards, and contributor deletion without destroying another tenant's history. Stripe signature payloads and the non-executing offline sandbox are explicitly isolated unit fixtures, not live integrations.

Browser tests use http://localhost:7011 with the API on 7012. They register synthetic accounts, sign in through the app entry, create a CRM project, use the real session-only template CRUD, reload persisted source/checkpoints, type into Monaco and save/restore source, enforce file protection, display unavailable model status, verify email via the local mailbox, inspect actual ledger grants, save/reload themes, inspect mobile navigation/overflow, delete projects and delete accounts. Their own synthetic accounts are removed in teardown. No existing human account is used.

The login checks verify decoded full-size static Earth imagery in dark mode and sky/cloud imagery in light mode, absence of video requests, mobile image-panel suppression, password visibility and the forgotten-password route.

The Earth workspace flow verifies decoded full-size images, removed navbar, pure black/white sidebar surfaces, Arial typography, random rotation without a manual selector, reload persistence, a simulated two-hour rotation, a new-login rotation, server-persisted themes, and visible pinned logout controls at 1440×900, 1280×600, 1024×500 and 390×600. Gallery tests use synthetic accounts and delete those accounts afterward.

Live contracts for OpenAI, OpenRouter, Anthropic, Gemini, E2B, Neon, Supabase, Cloudflare and Stripe are skipped unless explicitly enabled with authorized test configuration. Set `RUN_LIVE_PROVIDER_TESTS=true` only when you approve metered test requests/sandbox creation. Model tests require an enabled admin model entry with its actual rates and the corresponding `*_TEST_MODEL`. Database/Cloudflare tests are read-only against explicitly supplied test resource identifiers. Stripe live tests require an `sk_test_` key and recurring test price. They do not prove checkout/refund/subscription flows; those require further authorized live tests.

Provider/template setup is in DEPLOYMENT.md and INTEGRATIONS.md. No live credentials were supplied, so no actual customer database, sandbox, AI call, subscription or deployment was created.

The editor is lazy-loaded (approximately 699 KB gzip) and emits a chunk-size warning. This is not hidden as a successful performance audit. Runtime/browser checks for generated applications, actual hosting/database resource consumption, full-stack authorization, production infrastructure and independent security review remain outstanding.

Folder tests exercise real PostgreSQL tenant constraints, case-insensitive uniqueness, viewer rejection, same-workspace assignment, project counts/filtering/search, preserved projects/source after folder deletion and account export. OpenRouter transport tests simulate chunked SSE, processing comments, final usage after stop, usage-only events, errors/refusals/truncation, abort/no retry and secret-free diagnostics. A queued job test verifies the approved OpenRouter snapshot, idempotency and reuse of the initial user message, then cancels before any provider call.

The browser folder workflow covers creation, one-step project entry, reload-persisted chat, moving projects, rename, deletion with projects preserved and search. A separate explicitly mocked infrastructure test checks that the saved idea automatically requests one credit estimate and never queues a paid build without approval. This does not claim successful live generation.

The sidebar flow verifies persisted desktop collapse, visible credits in the compact rail and expanded/mobile sidebar, credits remaining pinned during navigation scrolling, folded Manage links and top-right appearance controls.

The Gotcha composer workflow verifies personalized greetings changing on a new project, the smaller circular upward send control and adjacent microphone, server-normalized image/text references, home-to-studio handoff and reload persistence, removal, project search including no results, collapsible Recents and the connector roadmap. Backend reference checks exercise actual image decoding/resizing, metadata and appended payload removal, MIME forgery, invalid formats, credentials, quota rejection, untrusted multimodal context and increased credit reservations. No paid image-understanding request is made by these tests.

Current default results: 61 backend checks pass (nine optional live contracts skipped), nine browser workflows pass, syntax/format checks pass and the standalone frontend repository builds its templates and production bundle. Both standalone repositories install with npm ci. The browser suite retains the normal API rate limits; repeated full runs within a short window can exhaust the local server's rate-limit window.

## Agent and dictation checks

The default test suite does not make paid calls. It now covers malformed PCM, scope/idempotency/refunds, request injection, SSRF IP classification, memory revisions, protected agent writes, evidence-gated source application and interrupted-call cancellation. Browser tests use an actual fake microphone/AudioWorklet plus an intercepted transcription response, verifying encoding, waveform, cancel without upload and insertion in home/studio.

Explicit metered end-to-end agent verification: create the separate `nebula_agent_live_test` database, then run `RUN_AGENT_LIVE=true node backend/scripts/verify-agent-live.js` with the configured E2B/OpenRouter environment and public catalog snapshot. It uses synthetic users only, snapshots results to ignored `.local/live-agent-verification.json`, and removes its project/sandbox/user afterward. It is deliberately separate from the ordinary `nebula_studio_test` database.
