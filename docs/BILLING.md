# Billing and cost policy

Signup credits are a configurable, actual transactional grant recorded once per account (`FREE_SIGNUP_CREDITS`); no final commercial prices are hardcoded. Model identifiers and prices are administrator configuration and can be refreshed from OpenRouter's live catalogue (Admin → Refresh prices). Credits use `CREDITS_PER_USD` as ledger units, not an assumed public commercial price.

## How a build is charged (pricing v2)

```
measured cost (USD) = Σ provider-billed cost of every model call      (OpenRouter usage.cost)
                    + build-computer seconds × COMPUTE_USD_PER_SECOND (wall clock while the sandbox runs)
exact credits       = measured cost × CREDITS_PER_USD ÷ (1 − BILLING_GROSS_MARGIN_PERCENT/100)
charged credits     = whole part of (exact credits + carried fraction), capped at the approved hold
```

- **Provider-billed cost per call.** OpenRouter's `usage.cost` already includes prompt-cache discounts and cache writes, reasoning tokens and web-search fees. It is recorded per call with its source (`provider_reported`). Only if a response omits it does the fallback estimate apply: uncached input × input price + cached input × cached-input price + output × output price + searches × `WEB_SEARCH_USD_PER_REQUEST` ($0.01, OpenRouter's per-request search price).
- **Why this matters.** Measured Luna calls in this workspace cost 41–95% of the flat input/output estimate on cached turns and up to 23% more on cache-writing first turns. The old flat fallback was biased in both directions and charged search at a tenth of its price.
- **Calls are billed even when rejected.** A reply cut off at the output limit is now recorded (it was previously lost, so its cost was neither tracked nor counted against the funded budget).
- **Build computer.** Elapsed sandbox seconds at `COMPUTE_USD_PER_SECOND` (default $0.000046: 2 vCPU / 4 GiB public rate), with optional `COMPUTE_MOBILE_…`/`COMPUTE_PYTHON_…` overrides. Capped at the routed allowance. This is metering, not an imported provider invoice.
- **Fractional carry, no round-up.** Usage is metered in millionths of a credit (`CreditAccounts.carryMicrocredits`). Whole credits are charged and the remainder carries to the next charge, so over an account's life the total charged equals the exact usage to within one credit. Previously every build and every dictation rounded up (a $0.00003 dictation cost a whole credit).
- **Waivers and caps.** Builds that fail for platform reasons are charged 0 (their provider cost still counts against the funded budget). Cancelled builds pay for the work done. The charge can never exceed the approved hold; any excess is absorbed.
- **Receipt.** `AIJobs.result.billing` stores modelUsd, computeUsd, cost by model, calls and provider-billed call count, exact credits, carry before/after, cap flag, credit value and contribution. It is operator data and never sent to customers.

Example (60% margin, 1,000 credits/USD): builds costing $0.0026 and $0.0035 are 6.5 and 8.75 exact credits. They are charged 6 (carry 0.5) and 9 (carry 0.25) — 15 credits for 15.25 used. The old per-build round-up charged 16.

## Holds and the spend guard

Before a build, the account places a temporary hold: the build-computer cap + search fees + 2.5× the typical model spend on the starting model, plus upgrades within the same price class (a deeper effort on the same model), never more than the theoretical worst case. The runtime enforces the model part before every call by shrinking the call's output limit to fit and stopping (charge waived) when less than 512 output tokens would fit. A jump from Luna to a premium model is not reserved; a failed attempt's retry starts one size up instead, with its own estimate. Typical credits and holds under quality-first routing (1,000 credits/USD, 60% margin): small edit 26 / 101, new medium UI app on Sol 761 / 3,582, large Opus build 4,650 / 17,832. In the development lock (Luna only) the same jobs are 26–130 credits typical. The estimate returns a typical cost (`expected`), a low end (`min`) and the hold (`max`). Insufficient-credit errors state the required hold, available credits and existing holds. See [MODEL_ROUTING.md](MODEL_ROUTING.md).

With parallel specialists (runtime v2), every call's worst case (conservative input bound plus its output limit) is reserved against the hold while it is in flight, so concurrent calls together never exceed the approved amount. Usage records carry the reasoning effort, the role and the specialist task, so cost per model variant and per task is measurable.

Reservations use row locks, the monthly spending limit, available balance and concurrent-job restrictions. Settlement locks the job/account, inserts a unique settlement key and deducts once. The funded provider budget includes recorded model/transcription/compute cost and preview leases, including waived failures. It is bounded by actual ledger grants/purchases/adjustments, so waived failures cannot become an unlimited paid-call loop.

## Voice and live previews

Dictation reserves a small hold and settles once per recording UUID at the exact metered cost with the same carry; failed or interrupted recordings are free. A full-stack live backend is an explicitly approved five-minute lease priced from 300 s of build-computer time plus the margin (35 credits at 60%), shown before approval; reopening an active lease does not charge again.

## What customers see

Credits only: balance, holds, monthly limit, per-entry ledger (Build, Build · no charge, Voice dictation, Live backend preview), the hold and typical cost before a build, and "Used N credits" on each finished build. Customers never receive provider costs, token counts, model names, margins, carry internals or routing data; the account export lists builds with their charged credits. Administration shows total tokens, model/voice/build/preview cost, charged credits, contribution, prompt-cache hit rate, the share of provider-billed calls, and routing outcomes per tier.

## Stripe and paid infrastructure

Stripe checkout/portal are optional. Signed webhooks synchronize subscriptions and grant configured credits for unique paid invoice IDs for the configured price. Duplicate event delivery and signature rejection have isolated unit coverage. Live Stripe checkout/subscription/invoice/refund/out-of-order tests are blocked until authorized test configuration exists.

Paid infrastructure requires operator enablement, active/trialing billing state, verified owner permission, a persisted unique operation, an explicit approval, and per-project limits. A provider-created resource with a later failure retains its external identifier. An ambiguous create outcome blocks automatic retry.

Not implemented: top-ups, auto-recharge, scheduled plan changes, provider invoice imports and reconciliation, database/hosting metrics, customer-owned provider billing, spending alerts, refund reconciliation and a configurable commercial plan catalog. These must not be marketed as operational.
