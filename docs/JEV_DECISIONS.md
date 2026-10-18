# Jev as Gotcha's decision and vision layer

Pinned model: `typesafe/jev-1.14`, via `POST https://openrouter.ai/api/alpha/decisions`, using the existing server-side OpenRouter key. `Providers/jev.js` owns the contract, deadline, input formats, typed-answer validation and usage recording. No silent GPT classifier fallback exists.

## Audited call sites

- Conversation intent: the former combined Luna JSON classification/answer call is split. Jev selects answer/build/resume/clarify from actual conversation context and separately judges work authorization and whether the previous stopped task is the intended target. No word-based shortcut forces continue/resume. The old text recognizer is used only for identifying misclassified historical jobs. Luna writes a customer reply only after answer mode is selected; it cannot change Jev's decision and gets no tools.
- Model routing: the existing Jev 1.13 triage uses the shared 1.14 adapter. It is on by default outside tests. Jev chooses request size, kind of work and research need; the allowed model catalog, plan limits, development Luna lock and spend gates determine the permitted model/effort ladder. Explicit off uses deterministic code, never a different AI judge.
- Specialist switching: proposed role changes go to Jev with the request, recent work and permitted roles. Low-confidence/unavailable decisions keep the current role. It cannot choose models outside the plan or increase the approved budget.
- Visual decisions: image references are read by Jev during intent assessment; typed reference kind/theme/layout judgments go into build context. The coding model receives reference metadata instead of raw image parts. The `visual_decision` tool in both runtimes can ask concrete questions with 2–12 options about an attached reference or a screenshot artifact from this exact job/project. Specialists can use it too. Returned confidence/uncertainty is explicit. Browser assertions and compilation remain the functional verification mechanism; a visual judgment cannot substitute for them.
- Other model calls found in the audit produce application code, architecture/research prose, summaries or customer replies. Those need a generative model. Framework selection, permissions, billing arithmetic, runtime limits and published-action approvals remain deterministic application rules. Jev never overrides them.

## Image contract

OpenRouter documents text-and-image input for Jev 1.14, plus typed Choice/Noul/Score/Box outputs. Jev does not generate descriptions, explanations, code or images. We use Choice/Noul/Score for the current implementation; Box is not needed here.

Use `image_url` parts in a top-level state array. Remote URLs are rejected locally. Existing upload validation/secret checks stay in force. Images are decoded with pixel limits, rotated, flattened and padded into 1024x768 JPEGs to meet Jev's minimum dimensions and pixel count, without distorting the content. Raw bytes, base64, prompts and question answers are not stored in the decision usage ledger.

## Execution policy

The intent label's confidence is not a probability of domain correctness. In particular, build and resume labels can split probability while agreeing on work. We gate build on the dedicated work-authorization probability (0.85); resume additionally requires a strong previous-task judgment (0.85) and contextual work authorization (0.65). Answer-only responses have no execution authority. Unsupported or malformed outputs fail closed. These thresholds are initial settings supported by the small evaluations below, not a claim of general accuracy.

Decision usage records keep purpose, model, input/output token counts, provider-reported USD (or a configured estimate), latency and optional user/project/job IDs. Admin economics includes decision costs separately from generative replies and coding compute. Jev output tokens can be reported even though output is free. Decisions are platform operating costs; existing customer coding credit holds and settlement remain unchanged. Migration `016-decision-usage.js` must run before startup.

## Validation

The first calibration pass asked for clarification on too many legitimate requests (6/12 accepted). Clarifying the distinction between cancelled/unfinished tasks and completed tasks, plus separate action-authorization questions, produced 12/12 on the calibration set. The independently worded invoice-export holdout passed 10/10, including resumption, explanations, mixed fix-plus-explanation, and contextual go-aheads. Both live image checks identified a red image correctly. Final calibration plus holdout cost $0.000955458 in reported Jev usage. These small sets are regression evidence, not a population accuracy benchmark.

Run `RUN_JEV_LIVE=true node scripts/verify-jev-live.js` and `... --holdout` for explicit paid API checks. They never create customer coding jobs or change customer apps. Unit/API regression tests use injected responses and no paid key.

## Primary documentation checked October 18, 2026

- https://openrouter.ai/typesafe/jev-1.14
- https://openrouter.ai/docs/guides/community/jev
- https://openrouter.ai/docs/guides/community/multimodal-decisions
- https://docs.typesafe.ai/api
