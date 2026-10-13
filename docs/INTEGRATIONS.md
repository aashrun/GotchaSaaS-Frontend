# Provider setup and verification

Keys are server-only. The integrations page reports configuration, never assumes connection verification. Missing optional credentials do not prevent registration, projects, editing, recovery, or exports.

| Provider   | Required configuration                                 | Implemented scope                                                              | Live status                                                                    |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| OpenAI     | OPENAI_API_KEY; admin model ID/rates                   | Responses structured output + server stream + token usage                      | Not tested                                                                     |
| OpenRouter | OPENROUTER_API_KEY; admin model ID/rates               | OpenAI-compatible streamed strict JSON schema + final token usage              | Transport fixtures pass; live tool checks recorded in IMPLEMENTATION_STATUS.md |
| Anthropic  | ANTHROPIC_API_KEY; admin model ID/rates                | Forced change-set tool + usage                                                 | Not tested                                                                     |
| Gemini     | GEMINI_API_KEY; admin model ID/rates                   | Structured JSON + usage                                                        | Not tested                                                                     |
| E2B        | E2B_API_KEY, E2B_TEMPLATE_ID                           | Isolated files, fixed build commands, deny egress, compiled preview, cleanup   | Prepared cloud template; live checks recorded                                  |
| Neon       | NEON_API_KEY, NEON_ORG_ID, NEON_REGION, encryption key | Separate project creation/status/deletion                                      | Blocked                                                                        |
| Supabase   | SUPABASE_ACCESS_TOKEN, SUPABASE_ORGANIZATION_SLUG      | Project creation, health/deletion                                              | Blocked                                                                        |
| Cloudflare | token, account, dispatch namespace, app domain         | Frontend Worker upload/details/deletion, smoke-test recording                  | Blocked                                                                        |
| Stripe     | secret key, webhook secret, price ID, configured grant | Checkout/portal, signed idempotent webhook, subscription state, invoice grants | Live blocked; signature unit tests pass                                        |
| Resend     | RESEND_API_KEY, MAIL_FROM                              | Verification/reset mail                                                        | Live blocked; local mailbox tested                                             |
| Auth0      | issuer/audience plus public frontend client config     | RS256 token verification, verified userinfo, server session exchange           | Blocked                                                                        |
| GitHub     | Project fine-grained repository token                  | Encrypted project connection, repository reads and reviewed draft PR adapter   | Credentials absent; no live PR created                                         |

[Neon create-project API](https://api-docs.neon.tech/reference/createproject) returns a new resource/URI; record identifiers before further steps and wait for operations/health before using it. This release explicitly leaves the connection `provisioning`: a least-privilege runtime role, connectivity verification, migrations and generated CRUD are not implemented. Do not expose the provisioned administrative URI in a generated app.

[Supabase create-project API](https://supabase.com/docs/reference/api/v1-create-a-project) uses `organization_slug` (not the deprecated organization_id). [Supabase for Platforms](https://supabase.com/docs/guides/integrations/supabase-for-platforms) requires healthy services before Auth/storage setup. Publishable vs secret keys, Auth configuration, RLS, health waiting, migrations, and backend binding still require implementation.

Resource creation additionally requires `ALLOW_PAID_RESOURCES=true`, a verified project owner, an active/trialing subscription, and explicit approval in the UI. Idempotency is local; an ambiguous provider timeout is **not** safely retryable. Inspect the provider account for the unique project name and reconcile the persisted operation instead of creating duplicates. Operator reconciliation UI is still pending.

[Stripe webhook guidance](https://docs.stripe.com/webhooks) requires the unmodified request body and signature secret. This API preserves the raw body before JSON middleware. Test checkout, subscription changes, invoices, out-of-order delivery, refunds, cancellations and billing reconciliation with your Stripe test account before commercial use. Top-ups, refund processing, plan scheduling and final commercial prices remain incomplete.

## OpenRouter

1. Put `OPENROUTER_API_KEY` in the backend environment; keep the key out of the frontend. Restart the API after changing its environment.
2. Verify the administrator account and list its email in `ADMIN_EMAILS`. In Administration, create an enabled model with provider **openrouter**, its exact `vendor/model` identifier, display name, current input/output rates, and output token limit. Prices are operator-configured; no model or price is silently seeded.
3. Select a model endpoint supporting strict JSON-schema structured output. The adapter uses the installed OpenAI SDK against `https://openrouter.ai/api/v1`, requests streamed output and usage, and sets `require_parameters=true`, `allow_fallbacks=false`, and `data_collection=deny`. Incompatible endpoints can fail rather than produce an unchecked source proposal.
4. Configure `E2B_API_KEY` and the prepared `E2B_TEMPLATE_ID` for actual app builds. A verified user enters an idea, reviews the automatic credit estimate, then approves generation. The provider key alone does not enable the build environment.

The adapter consumes the complete stream, including usage events after the stop event. Refusals, truncated responses, mid-stream errors, missing token usage, timeouts and cancellation are rejected. The existing change-set checks, job snapshot, credit reservation/settlement and sandbox validation apply to OpenRouter. Token costs remain configured-rate estimates, not provider invoice reconciliation.

Local tests use simulated HTTP/SSE responses and an HTTP test app without a worker; they make no live AI requests. Live verification requires `RUN_LIVE_PROVIDER_TESTS=true`, `OPENROUTER_TEST_MODEL`, an enabled matching model, and authorized credentials. The OpenRouter key is now configured from the user’s Reconcile backend. A read-only key check returned HTTP 200, and five model choices were configured from the current public catalog. Automatic plan-aware specialist routing is the default. E2B key/template are now configured; the agent uses Responses tools and a supported full-stack environment. Current live results are recorded in IMPLEMENTATION_STATUS.md.

References: [OpenAI SDK compatibility/authentication](https://openrouter.ai/docs/api_reference/authentication), [structured output](https://openrouter.ai/docs/guides/features/structured-outputs), [streaming/usage](https://openrouter.ai/docs/api_reference/streaming), [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection).

## Voice and full-stack previews

Voice uses OpenRouter MAI-Transcribe 2; a real synthetic recording was transcribed. See VOICE_INPUT.md. E2B contains pinned Node/React/Vite/Express/pg/Playwright dependencies and PostgreSQL. Full-stack previews use a bounded, authenticated localhost request broker and an explicit five-minute credit lease. The provisioned Neon/Supabase adapters remain separate; their administrative URIs are never reused in the sandbox.
