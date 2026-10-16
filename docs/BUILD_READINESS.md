# Build readiness — 17 October 2026

This assessment covers generating and testing applications. Customer repository connections, public hosting, store distribution and signing are separate capabilities.

## Active configuration

The local platform uses runtime v2. Neon migrations 012–014 are applied. The app remains on ports 7011/7012. Development coding uses the existing GPT-6 Luna policy. Customer source, app credentials and platform data are not test fixtures.

## Corrections from the runtime review

- Saved lockfiles are restored with `npm ci` before a fresh agent workspace starts its backend or checks. Safe retry candidates preserve installer-managed manifests and intentional deletions.
- Regex searches and compiled globs use RE2 WebAssembly. Malformed glob braces are rejected. Large diff searches have CPU/memory budgets and bounded output.
- Shell-imported additions, edits and deletions use the same assignment and pending-question write checks as direct editing tools.
- Required planned tasks must complete. High-severity specialist findings persist through incomplete reviews and cannot be erased through status updates or replanning; a completed re-review must resolve them.
- Project regression tests run as part of `run_checks`. Failing tests block completion even if type checking, compilation and browser assertions pass. Supported runners are Node's test runner, installed Vitest/Jest, and Python unittest.
- All supported images use a separate checker user and an exact source snapshot. Expo and Python builds now have the same isolated shell availability as web builds.
- The Expo static preview has a fixed localhost backend proxy. It cannot select an external proxy destination.
- The browser checker recognizes only the server-owned, expected unauthenticated `GET /api/me` 401 probe. Other browser errors remain failures and return explicit repair feedback to the model.
- The restricted mini-preview strips the platform's PWA installation bootstrap. Real installation stays on the isolated PWA origin and in exports, with the explicit worker policy. This avoids a preview policy violation without broadening the mini-preview's permissions.
- Dependency installation uses a trusted executable path and clean reinstall, skips lifecycle scripts, restricts egress to the registry, and promotes a read-only dependency tree for checking. Agent-modified binaries are not used by the installer.
- Removed the unused nodemon production dependency. Platform production dependency audit reports no vulnerabilities at verification time.

## Verified scope

The supported stacks are React web applications/PWAs, Node/Express full-stack apps, Python FastAPI/Flask/Django backends, Expo React Native source and web previews, and Electron renderer applications. Unsupported frameworks remain blocked before paid generation.

Runtime contracts were exercised in real isolated images for mobile without a backend, mobile with a Node backend, FastAPI, Flask, Django, desktop and PWA. These checks cover compilation, browser behaviour and, where applicable, backend signup/login/persistence/ownership. Native authentication also checks bearer tokens, logout revocation and rejection of forged browser requests.

The live sandbox regression covers command isolation, blocked egress, protected files, package installation, a fresh workspace restoring its lockfile, project tests and intentional test failure. Browser regressions use a separate local database and API.

The release verification passed 130 backend tests (nine optional provider contracts skipped), 20 UI workflows, 19 live sandbox boundary checks and seven runtime/image contracts. Real GPT-6 Luna builds completed for a Node-backed web app, an Expo water tracker, an Electron renderer water tracker and a PWA water tracker. Independent Chrome checks played all three trackers: add, reset and a clean console. The generated PWA additionally passed worker control, real manifest icons, offline reload and offline interaction on its isolated origin. The full-stack app passed signup, CRUD, ownership and paused-runtime reconnection checks.

Initial live attempts exposed the login-probe and PWA-policy bugs above; those attempts failed rather than claiming successful completion. Corrected runs passed. These were synthetic users in separate local databases; the owner's Neon credit balance was not used for fixture settlement. OpenRouter/E2B usage was metered. Detailed reports remain in ignored `.local` test artifacts; acceptance notes are in AGENT_RUNTIME_V2.md.

## Limits of the readiness claim

Passing checks establishes the behaviour actually exercised. It does not certify every possible application or every security property. Native Android/iOS device tests and packages are not substituted by browser previews. Expo connection remains deferred by the owner. Windows/Linux execution and signed installers require their own OS verification. Server-backed desktop apps remain blocked until a secure API/session adapter exists; the protected native bridge currently exposes only the platform name.

Specialists can inspect/edit their overlays and invoke platform checks; the coordinator owns arbitrary project commands, package installation, integration and the shared budget. An interrupted operation with an unknown paid or mutating outcome is fenced for cancellation/reconciliation rather than blindly replayed.

Runtime v1 remains an explicit rollback option. Set `AGENT_RUNTIME=v2` for the upgraded tools; jobs keep the runtime snapshotted when queued. Production hosting still needs the usual environment, mail, TLS, database and worker configuration in DEPLOYMENT.md.
