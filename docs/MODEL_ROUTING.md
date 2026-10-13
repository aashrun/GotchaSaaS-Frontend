# Gotcha SaaS model routing

The enforced policy is `gotcha-saas-routing-v2`. Ordinary web frontend work uses GPT: Luna on economy, Sol on balanced/pro. Backend work uses Luna on economy, Sonnet on balanced, and Sonnet for ordinary pro work with Opus for architecture. Explicitly selected GPT/Claude coding models can override backend roles; selecting Claude does not redirect ordinary web frontend work to Claude. Three.js/WebGL/3D requests may use the plan-approved Claude frontend specialist. Dependency/runtime support must still be checked: routing does not add unsupported packages. No automatic fallback to an arbitrary enabled model is allowed. Missing GPT configuration blocks generation.

Every queued job records role models, prices, policy version, routing reason and allowed budget. Context/output/compute limits, the funded credit check, permissions and supported tools remain server-owned. A model cannot raise the user's plan, add funds or approve external actions. Claude Code and Codex are agent products; the current runtime calls the configured underlying GPT/Claude models through OpenRouter, not those products' desktop harnesses.

## Jev recommendation

Jev can return typed choices, rubric scores and probabilities. It can help classify intent, estimate task difficulty, choose between permitted tools, assess whether clarification is useful, and advise whether a failed attempt needs escalation. The vendor recommends small independent questions rather than one broad question weighing many unrelated factors: [TypeSafe documentation](https://docs.typesafe.ai/introduction).

Do not enable it as the final authority for model selection yet. One independent preprint found neither tested decision model exceeded chance for zero-shot model routing on its evaluation. That is evidence to measure our own tasks, not proof Jev can never help: [paired evaluation](https://arxiv.org/abs/2610.02267).

A safe next evaluation is shadow routing: give Jev a redacted requirements summary and a small allowed label set such as ordinary frontend, backend CRUD, security architecture, 3D. Include supported stack, current plan/cost ceiling, known model availability and dated measured performance. Record its advice without changing live routes, with a short timeout and deterministic fallback. It receives no credentials and never decides access permissions, spending authority or publication approval.

Model profiles need our own held-out application builds: end-to-end requirement pass rate, first-attempt success, repair count, total provider plus compute cost, latency, tool reliability and security-case results. Public benchmarks are dated supplementary evidence; a generic ranking cannot establish UI quality or our backend success rate. Select the cheapest allowed model meeting the task's measured quality floor. Consider stronger models for authentication/billing/migrations only within the reviewed plan budget. Uncertain advice falls back to the explicit policy. Separate cost from confidence: a high confidence number is not a verified success probability until calibrated against these cases.

The four-app Luna run is a small diagnostic sample, not enough to establish superiority between Luna, Sol, Sonnet or Opus. Jev is not connected to live routing in this change; no new router provider calls or untested cost-saving claims are made.
