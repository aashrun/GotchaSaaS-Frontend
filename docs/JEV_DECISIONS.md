# Jev as Gotcha's decision and vision layer

Pinned model: `typesafe/jev-1.14`, via `POST https://openrouter.ai/api/alpha/decisions`, using the existing server-side OpenRouter key. `Providers/jev.js` owns the contract, deadline, input formats, typed-answer validation and usage recording. No silent GPT classifier fallback exists.

## Audited call sites

- Conversation intent: the former combined Luna JSON classification/answer call is split. Jev selects answer/build/resume/clarify from actual conversation context. The current customer message is placed last and explicitly separated from historical context; an old explanation-only request cannot veto a new repair request. No word-based shortcut forces continue/resume. The old text recognizer is used only for identifying misclassified historical jobs. Luna writes a customer reply only after answer mode is selected; it cannot change Jev's decision and gets no tools.
- Model routing: the existing Jev 1.13 triage uses the shared 1.14 adapter. It is on by default outside tests. Jev chooses request size, kind of work and research need; the allowed model catalog, plan limits, development Luna lock and spend gates determine the permitted model/effort ladder. Explicit off uses deterministic code, never a different AI judge.
- Specialist switching: proposed role changes go to Jev with the request, recent work and permitted roles. Low-confidence/unavailable decisions keep the current role. It cannot choose models outside the plan or increase the approved budget.
- Visual decisions: image references are read by Jev during intent assessment; typed reference kind/theme/layout judgments go into build context. The coding model receives reference metadata instead of raw image parts. The `visual_decision` tool in both runtimes can ask concrete questions with 2–12 options about an attached reference or a screenshot artifact from this exact job/project. Specialists can use it too. Returned confidence/uncertainty is explicit. Browser assertions and compilation remain the functional verification mechanism; a visual judgment cannot substitute for them.
- Other model calls found in the audit produce application code, architecture/research prose, summaries or customer replies. Those need a generative model. Framework selection, permissions, billing arithmetic, runtime limits and published-action approvals remain deterministic application rules. Jev never overrides them.

## Image contract

OpenRouter documents text-and-image input for Jev 1.14, plus typed Choice/Noul/Score/Box outputs. Jev does not generate descriptions, explanations, code or images. We use Choice/Noul/Score for the current implementation; Box is not needed here.

Use `image_url` parts in a top-level state array. Remote URLs are rejected locally. Existing upload validation/secret checks stay in force. Images are decoded with pixel limits, rotated, flattened and padded into 1024x768 JPEGs to meet Jev's minimum dimensions and pixel count, without distorting the content. Raw bytes, base64, prompts and question answers are not stored in the decision usage ledger.

## Execution policy

One contextual intent choice is authoritative (`jev-v2`). Separate authorization/resumption scores were removed after they contradicted explicit repair requests, causing repeated clarification questions. Jev selects clarify when the current desired action is unresolved. Its confidence is recorded, not treated as an independently calibrated probability of correctness. Server-owned tenant permissions, budgets, valid resume targets, pending dependencies and external-action approvals remain mandatory. Answer-only responses have no tool authority. Unsupported or malformed outputs fail closed.

Decision usage records keep purpose, model, input/output token counts, provider-reported USD (or a configured estimate), latency and optional user/project/job IDs. Admin economics includes decision costs separately from generative replies and coding compute. Jev output tokens can be reported even though output is free. Decisions are platform operating costs; existing customer coding credit holds and settlement remain unchanged. Migration `016-decision-usage.js` must run before startup.

## Validation

The initial small calibration sets missed real-history contamination: an earlier explanation-only instruction depressed a separate authorization score even when intent was build. The revised policy separates the latest message and removes that conflicting second veto. It passes 12 calibration cases, 10 independently worded holdouts, and five added regressions covering repair requests after explanation-only discussion. The two original failing messages were also replayed with their recorded conversation history and selected build. The final 27-case pass plus its image checks cost $0.00111867 in reported Jev usage. These small sets are regression evidence, not a population accuracy benchmark.
Run `RUN_JEV_LIVE=true node scripts/verify-jev-live.js` , `... --holdout` or `... --regressions` for explicit paid API checks. They never create customer coding jobs or change customer apps. Unit/API regression tests use injected responses and no paid key.

## Primary documentation checked October 18, 2026

- https://openrouter.ai/typesafe/jev-1.14
- https://openrouter.ai/docs/guides/community/jev
- https://openrouter.ai/docs/guides/community/multimodal-decisions
- https://docs.typesafe.ai/api
