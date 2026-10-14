# Billing and cost policy

Signup credits are a configurable, actual transactional grant recorded once per account (`FREE_SIGNUP_CREDITS`); no final commercial prices are hardcoded. Model identifiers and input/output USD-per-million token rates are administrator configuration. Credits use `CREDITS_PER_USD` as ledger units, not an assumed public commercial price.

Before a job, reserve a conservative maximum including the repair budget. Use row locks, the monthly spending limit, available balance and concurrent-job restrictions. Record each returned model call's actual input/output tokens before applying or repairing files. Estimated USD derives from those counts at configured rates, not invoices.

Settlement locks the job/account, inserts a unique settlement key and deducts once. Release unused reservations. Qualifying failed platform jobs waive the customer charge, retaining measured provider usage for cost review. Cancellation stops future stages and lets an in-flight model request return its usage before settlement. Never restart paid generation silently after a worker crash. Unknown provider usage is not fabricated and needs invoice reconciliation.

Stripe checkout/portal are optional. Signed webhooks synchronize subscriptions and grant configured credits for unique paid invoice IDs for the configured price. Duplicate event delivery and signature rejection have isolated unit coverage. Live Stripe checkout/subscription/invoice/refund/out-of-order tests are blocked until authorized test configuration exists.

Paid infrastructure requires operator enablement, active/trialing billing state, verified owner permission, a persisted unique operation, an explicit approval, and per-project limits. A provider-created resource with a later failure retains its external identifier. An ambiguous create outcome blocks automatic retry.

Not implemented: top-ups, auto-recharge, scheduled plan changes, resource provider invoice imports, database/hosting metrics, customer-owned provider billing, spending alerts, refund reconciliation and configurable commercial plan catalog. These must not be marketed as operational.

## Agent, voice and preview meter

The default agent reserves its bounded role model calls, research fees and up to ten minutes of compute. OpenRouter-reported cost is preferred when available, otherwise actual tokens use snapshotted rates. E2B elapsed time uses the configured image rate. Neither fallback is an invoice import. Dictation reserves and settles once per recording UUID; failed/interrupted recordings waive the charge. A full-stack preview requires an explicitly approved five-minute lease priced from $0.0138 estimated compute cost plus the configured margin (35 credits at the current 60% margin; 14 at zero margin) and reuses an unexpired lease without a second charge. All three spend kinds count against the monthly cap. See HARNESS_STRATEGY.md for role policy, prices and margin assumptions.

The funded provider budget includes recorded model/transcription/compute cost and preview leases, including waived failures. It is bounded by actual ledger grants/purchases/adjustments, so failed-job refunds cannot become an unlimited paid-call loop.

## Service margin and visibility

New build reservations and settlements use a snapshotted policy: `ceil(providerCostUsd / (1 - BILLING_GROSS_MARGIN_PERCENT / 100) * CREDITS_PER_USD)`. The configured target is 60%, and the conversion is 1,000 credits per dollar of allocated usage value. A $0.10 cost therefore reserves/charges 250 credits ($0.25 value). This is a contribution before payment fees, tax, shared hosting/database overhead, refunds and free credits, not a profit guarantee or a finalized subscription price.

Each new job stores its approved pricing policy and settlement cost, credit value and contribution in result.billing. Old jobs without a policy retain zero-margin settlement. Voice requests persist their policy; runtime leases display their current charge before approval. Models and routing labels are hidden from the chat composer. Billing retains measured tokens and distinguishes reported versus estimated cost; only administration shows platform economics.

Administration totals recorded input/output tokens, model/voice/build/preview compute cost, charged credits and allocated credit value. Failed builds remain in cost totals despite waived customer charges. Grants and test credits create no cash revenue. Invoice imports, commercial plan economics and overhead allocation still need configuration. Unknown costs from ambiguous interrupted provider calls require reconciliation; they are not guessed.
