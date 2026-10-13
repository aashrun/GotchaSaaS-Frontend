# Architecture and repository assessment

## Audited boilerplate

Source `/Users/aashrungautam/Desktop/BoilerPlate/{BoilerplateBE,BoilerplateFE}`. Copied source into `GotchaSaaS-Backend/` and `GotchaSaaS-Frontend/`, excluding secrets, node_modules, build artifacts, and Git metadata. Existing UI primitives, React Router, Vite/Tailwind configuration, Express conventions, and optional Auth0 integration were reused.

The supplied backend connected to MongoDB and used Mongoose, although Sequelize was listed. Its frontend imported a missing Analytics file, used conflicting `/` routes, and bypassed all ProtectedRoute checks. Auth0 environment settings were required at module import even when unavailable. There were no migrations, organization permissions, or tests. The conversion to PostgreSQL is a documented necessary correction to meet the user's explicit stack requirement, not a framework replacement.

## Boundaries

- `GotchaSaaS-Frontend/src/pages`: route experiences. `components/ui`: retained shadcn-style primitives. Theme/auth contexts and same-origin API client.
- `GotchaSaaS-Backend/Routes`: validated HTTP boundaries. `Auth`: cookie/CSRF/project/admin enforcement, optional verified Auth0 exchange. `Controllers`: retained user convention.
- `GotchaSaaS-Backend/Services`: projects, authentication/mail, credit accounting, durable jobs, resource operations, billing.
- `GotchaSaaS-Backend/Providers`: E2B, Neon, Supabase, Cloudflare, and a timeout-bound HTTP helper. AI provider adapters use official server SDKs.
- `GotchaSaaS-Backend/Models`: Sequelize control-plane records. `Migrations`: frozen initial schema plus explicit incremental changes; no `sync()`.
- E2B is the only application runtime. Its template contains fixed dependencies. Internet egress is denied, provider secrets are not injected, and only platform-owned validation commands are accepted.
- Browser previews use compiled HTML in a sandboxed opaque-origin iframe. Scripts and React form handlers work; same-origin access, parent navigation, and external networking/submissions are prohibited.
- Curated template previews are built locally from repository-owned source only. The template preparation script cannot accept tenant/project code.

## Durable operations

AI jobs live in PostgreSQL. Workers claim one row with skip-locked row locks, persist state/events, renew heartbeats, enforce bounded repairs, and reconcile credit reservations. A crashed request is never silently repeated. Stale jobs are recovered by periodic sweeps; interrupted source remains recoverable. Provider timeouts can still incur unreported provider charges; provider invoices require reconciliation before commercial launch.

Resource operations reserve a project/provider operation before calling paid APIs. Creation requires verified owner access, active subscription, explicit approval, operator enablement, quotas, and an idempotency key. Unknown outcomes block new creation for that resource class. No automatic retry of an ambiguous creation is allowed. Resource-operation restart recovery and manual provider reconciliation must be tested live.

## VibeSDK evaluation

[Cloudflare VibeSDK](https://github.com/cloudflare/vibesdk) is MIT-licensed and provides useful isolation/tool/history patterns, but its current platform uses Cloudflare-specific Workers, Durable Objects/Facets, and artifact services. Adopting it as the control plane would replace the requested Express/Sequelize/PostgreSQL architecture. It was evaluated as a reference; its code was not copied and its hosted service is not used as a hidden dependency. The [SDK](https://github.com/cloudflare/vibesdk/tree/main/sdk) may be considered later for compatible optional tooling.

## Remaining architecture work

Generated full-stack Worker templates and authorization tests; least-privilege customer database identities; transactional migrations/backup checkpoints; signed production preview delivery; provider cost/resource metering; complete deployment rollback/domain routing; GitHub App; attachment storage; observability; reconciliation jobs; retention automation; and production operational hardening.

## Sandbox provider decision

E2B and [Daytona](https://www.daytona.io/docs/en/sandboxes/) were evaluated against their documented SDK isolation/network/preview capabilities. E2B was selected for the initial adapter because a dependency-preinstalled template, denied egress, fixed commands, disposable lifecycle and compiled artifact delivery fit this Node control plane. Daytona remains a future adapter; its [tier-dependent network limits](https://www.daytona.io/docs/en/network-limits/) and signed/private preview flow require separate validation. The E2B image has been created and live app checks are recorded in IMPLEMENTATION_STATUS.md; Daytona remains untested.

## Current agent runtime

See [HARNESS_STRATEGY.md](HARNESS_STRATEGY.md) for the implemented Responses tool loop, role routing, durable steps/memory, supported Express/PostgreSQL sandbox runtime, browser assertions, preview bridge, credit budgets and reviewed GitHub actions. Legacy change-set jobs retain their original adapter for backward compatibility.
