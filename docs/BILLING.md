# Billing and cost policy

Signup credits are a configurable, actual transactional grant recorded once per account (`FREE_SIGNUP_CREDITS`); no final commercial prices are hardcoded. Model identifiers and input/output USD-per-million token rates are administrator configuration. Credits use `CREDITS_PER_USD` as ledger units, not an assumed public commercial price.

Before a job, reserve a conservative maximum including the repair budget. Use row locks, the monthly spending limit, available balance and concurrent-job restrictions. Record each returned model call's actual input/output tokens before applying or repairing files. Estimated USD derives from those counts at configured rates, not invoices.

Settlement locks the job/account, inserts a unique settlement key and deducts once. Release unused reservations. Qualifying failed platform jobs waive the customer charge, retaining measured provider usage for cost review. Cancellation stops future stages and lets an in-flight model request return its usage before settlement. Never restart paid generation silently after a worker crash. Unknown provider usage is not fabricated and needs invoice reconciliation.

Stripe checkout/portal are optional. Signed webhooks synchronize subscriptions and grant configured credits for unique paid invoice IDs for the configured price. Duplicate event delivery and signature rejection have isolated unit coverage. Live Stripe checkout/subscription/invoice/refund/out-of-order tests are blocked until authorized test configuration exists.

Paid infrastructure requires operator enablement, active/trialing billing state, verified owner permission, a persisted unique operation, an explicit approval, and per-project limits. A provider-created resource with a later failure retains its external identifier. An ambiguous create outcome blocks automatic retry.

Not implemented: top-ups, auto-recharge, scheduled plan changes, resource provider invoice imports, database/hosting metrics, customer-owned provider billing, spending alerts, refund reconciliation and configurable commercial plan catalog. These must not be marketed as operational.

## Agent, voice and preview meter

The default agent reserves its bounded role model calls, research fees and up to ten minutes of compute. OpenRouter-reported cost is preferred when available, otherwise actual tokens use snapshotted rates. E2B elapsed time uses the configured image rate. Neither fallback is an invoice import. Dictation reserves and settles once per recording UUID; failed/interrupted recordings waive the charge. A full-stack preview requires an explicit 14-credit, five-minute lease and reuses an unexpired lease without a second charge. All three spend kinds count against the monthly cap. See HARNESS_STRATEGY.md for role policy, prices and margin assumptions.

The funded provider budget includes recorded model/transcription/compute cost and preview leases, including waived failures. It is bounded by actual ledger grants/purchases/adjustments, so failed-job refunds cannot become an unlimited paid-call loop.
