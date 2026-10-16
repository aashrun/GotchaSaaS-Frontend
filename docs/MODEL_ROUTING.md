# Gotcha SaaS model routing

The enforced policy is `gotcha-saas-routing-v6`: **quality first, sized by the job**. Small edits and easy fixes run on the efficient model; new apps, real features and anything risky start on the best model for that kind of work. Routing is server-owned, snapshotted on the job and re-checked at estimate, queue and every model call. Customers never see model names, providers or routing details.

Only four models are ever routed: GPT-6 Luna, GPT-6.1 Sol, Claude Sonnet 5.5 and Claude Opus 5.5. GPT-6 Astra and any other enabled model (for example Kimi) are never used for coding, including through an operator's manual selection.

## How a prompt is routed

1. **Size and kind of job.** Jev (when `ROUTING_TRIAGE=on`) or the deterministic profiler ([`Agent/taskProfile.js`](../Agent/taskProfile.js)) decides:
   - **size** — `small`: colour/copy/spacing changes, a tiny UI tweak, an easy bug fix or a short feature on an existing app; `medium`: a new app, a new page/flow/API, several related changes; `large`: big multi-feature builds, accounts/login, payments, permissions, migrations, scaling, 3D.
   - **kind** — `ui`, `backend`, `architecture` (auth, billing, permissions, migrations, scaling) or `three_d`.

   The profiler matches whole words, ignores negated requirements ("no login, accounts or database" keeps a game a UI job) and treats a short "add a dashboard page" or "add a notes API" as real feature work. A retry after a failed build at the same project version starts **one size up**.

2. **Model and effort from benchmarks.** [`Agent/modelCatalog.js`](../Agent/modelCatalog.js) holds each model's Artificial Analysis Intelligence Index **per reasoning effort** and its measured cost per index task. Each size × kind cell has a minimum score (and owner rules); the most cost-efficient variant that clears it wins. Large jobs take the top score, starting one effort below the top when that is within two points for at least 35% less.
3. **Owner rules.** UI stays on GPT (Claude's UI style is not wanted); server and architecture work beyond small fixes uses Claude; 3D uses Opus.

The resulting table (all plans, October 2026 benchmarks):

| Size   | UI                                   | Backend                                      | Architecture                       | 3D                             |
| ------ | ------------------------------------ | -------------------------------------------- | ---------------------------------- | ------------------------------ |
| Small  | Luna · high → Sol high → xhigh → max | Luna · high → Sonnet high → Opus xhigh → max | Sonnet · medium → Opus xhigh → max | Luna · high → Opus xhigh → max |
| Medium | Sol · high → xhigh → max             | Sonnet · high → Opus xhigh → max             | Opus · xhigh → max                 | Opus · xhigh → max             |
| Large  | Sol · xhigh → max                    | Opus · xhigh → max                           | Opus · xhigh → max                 | Opus · xhigh → max             |

Admin → Model routing shows this table live, recomputed from the enabled models, plan limits and the latest benchmarks.

### Why these choices (Artificial Analysis, October 2026)

| Variant          | Intelligence Index     | Cost per index task |
| ---------------- | ---------------------- | ------------------- |
| Luna low → max   | 21 / 29 / 32 / 34 / 37 | a few cents at most |
| Sol low → max    | 42 / 48 / 50 / 51 / 52 | $0.13 → $0.72       |
| Sonnet low → max | 36 / 41 / 47 / 52 / 56 | $0.41 → $7.60       |
| Opus xhigh / max | 56 / 58                | $3.46 / $5.98       |

- Effort is the biggest quality lever: the platform previously ran Luna at low effort (21). Small jobs now use Luna at high effort (32).
- Sonnet 5.5 costs the same per token as Sol ($2 / $10 per million) and is the most verbose model Artificial Analysis has measured, so it is not a "small" model in cost terms. Sol at high effort scores 50 for $0.32 per task; Sonnet needs xhigh to reach 52 at $2.74.
- On the Coding Agent Index (agentic coding with a harness) Sonnet 5.5 (68) and Opus 5.5 (66) lead GPT-6.1 Sol (63), which supports Claude for server and architecture work. Opus xhigh reaches Sonnet max's score for about half the cost.
- Artificial Analysis does not rank UI quality. Arena's frontend leaderboards do, and they currently rate Claude models well; the GPT-for-UI rule is an owner taste decision, kept as a configurable rule rather than a benchmark claim.

Sources: [Artificial Analysis models](https://artificialanalysis.ai/models), [GPT-6.1 Sol](https://artificialanalysis.ai/models/gpt-6-1-sol), [GPT-6 Luna](https://artificialanalysis.ai/models/gpt-6-luna), [Sonnet 5.5 article](https://artificialanalysis.ai/articles/claude-sonnet-5-5), [Coding Agent Index posts](https://x.com/ArtificialAnlys/status/2105814318294114720). Benchmark data is credited to Artificial Analysis wherever it is displayed.

### Refreshing benchmarks

Set `ARTIFICIAL_ANALYSIS_API_KEY` (free tier: 100 requests/day, attribution required) and use Admin → Refresh benchmarks. One request to `/api/v2/language/models` updates each routed model's indices per effort (`AIModels.benchmarks`); routing picks them up immediately. Costs per task are not on the free tier, so the catalog keeps its cost data; a newly listed effort borrows the next deeper effort's cost.

## Request shape per model

- **GPT (Luna, Sol):** native `reasoning.effort`, forced tool calls, output limits 6K–32K tokens by effort.
- **Claude (Sonnet, Opus):** an explicit thinking budget (`reasoning.max_tokens`: 2K–32K by effort) with 12K tokens of room for the tool call itself, and **automatic** tool choice. Live checks on Sonnet 5.5 (October 2026) showed OpenRouter rejects forced tool choice for Claude endpoints with or without thinking, so every Claude call under the previous routing would have failed; a Claude reply without a tool call is now a corrective retry.
- Timeouts grow with effort (2–8 minutes) so a slow deep call is never mistaken for an unknown outcome.

## Climbing (escalation)

A role climbs one rung only when the build proves it is stuck: two consecutive failed checks or browser tests, two rejected replies, or 60% of the call budget used without verified results. Escalated calls are capped per size, and a climb happens only while the approved budget covers three typical calls of the next variant. Every climb is recorded on the job and counted in Admin.

## Measured outcomes

Benchmarks set the prior choice; Gotcha's own results can override it. [Agent/outcomes.js](../Agent/outcomes.js) counts, per size, kind of work and starting variant (model:effort), the routed jobs of the last 90 days that completed without escalating ("clean"), excluding cancellations and failures the agent could not cause (project changed, lease moved, access revoked, model disabled). The estimate is shrunk toward a 75% prior worth 10 jobs; a variant with at least 10 jobs whose estimate falls below 50% is skipped as that cell's start while another eligible variant remains. Outcomes can only move a start past a failing variant, never below the owner's quality floors, and UI stays on GPT. Applied demotions are recorded on the plan (`measuredDemotions`). Statistics are cached for 10 minutes; routing never fails if they are unavailable.

## Runtime v2 budgets

With `AGENT_RUNTIME=v2`, plans carry `capabilities` (`version`, `shell`, `orchestration` — delegation only for medium and large jobs) and a token budget instead of a byte budget: small 24K tokens / 10 calls, medium 32K / 18, large 48K / 28. Typical calls are larger (9K / 13K / 18K input tokens, of which the 7–8K-token tool and instruction prefix is usually a cache hit) and more numerous (6 / 12 / 18), so typical cost and holds are higher than v1; the spend guard is unchanged. See [AGENT_RUNTIME_V2.md](AGENT_RUNTIME_V2.md).

## Holds and credits

Customers are charged the provider-billed cost of the calls actually made plus build-computer time (see [BILLING.md](BILLING.md)). The hold covers 2.5× the typical run on the starting model, upgrades within the same price class (a deeper effort on the same model) and the compute cap. A jump from Luna to a premium model is not reserved up front; the retry of a failed attempt starts one size up instead. Typical credits at 1,000 credits/USD and a 60% margin (priors until measured): small edit ≈ 26 (hold ≈ 100); new medium UI app on Sol ≈ 760 (hold ≈ 3,600); large Opus build ≈ 4,650 (hold ≈ 17,800). Premium work costs 30–180× a Luna edit, so plan allowances and the credit scale should be set with these numbers in mind.

## Plans and the development lock

All plans may use all four models today. `ROUTING_MODELS_ECONOMY`, `_BALANCED` and `_PRO` (comma lists of `luna,sol,sonnet,opus`) narrow a plan later; jobs then take the best allowed variant for their cell, and UI still never falls back to Claude.

In `NODE_ENV=development`, `DEVELOPMENT_MODEL_LOCK` (default `on`) runs every job on GPT-6 Luna, choosing Luna's effort by size (high for small jobs, max for medium and large). Set it to `off` to test quality routing locally; spend stays bounded by holds and each account's funded credits.

## Jev

[Jev](https://openrouter.ai/docs/guides/community/jev) (`typesafe/jev-1.13`, OpenRouter Decisions API) answers three independent typed questions — size (score), kind of work (choice) and whether current external research is needed (yes/no). A live check returned in under a second for about $0.00002. With `ROUTING_TRIAGE=on`, confident answers (≥ 0.6) set the size and kind; budgets never shrink below the deterministic view, and the advice travels from estimate to queue in an encrypted, request-bound ticket. `shadow` records advice without acting on it; Admin shows agreement per size. Jev decides what kind of job it is; the benchmark catalog decides which model does it. Jev Router is not used for coding calls: it would move model choice outside the snapshotted, hold-backed plan and cannot see build/test evidence.
