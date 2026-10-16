# Agent runtime v2: baseline, plan and acceptance criteria

> 17 October update: the local app now runs v2 after Neon migrations 012–014. Review fixes and expanded verification are described in [BUILD_READINESS.md](BUILD_READINESS.md). The delivery notes below describe the original 16 October implementation; its Expo/Python shell limitation has since been removed with separate checker-user verification.

Written 16 October 2026 before implementation; the "Delivery status" section at the end records what was delivered and measured.

## Baseline (verified in code and in live sandboxes)

**What the agent can do (v1).** One OpenRouter model per call drives a bounded tool loop ([Agent/runtime.js](../Agent/runtime.js), [Agent/tools.js](../Agent/tools.js)). Tools: list files, read a whole file, literal search, write or exact-text patch files under `src/` and `server/` only, platform type check/build/backend acceptance, scripted Playwright steps, the tic-tac-toe protocol, SSRF-safe page fetch, one bounded web search, project memory, GitHub reads, draft-PR preparation, specialist switching and one question to the user. Routing v6 picks model and effort; credits, holds and the spend guard are exact.

**Incomplete or missing.**

- No shell, processes, dependency installation, tests other than the platform's own, linting or migrations. `package.json` is protected and dependencies are fixed by the image.
- No line ranges, regex search, symbols, definitions, references, dependency graph or diagnostics with locations. No move, delete, multi-file patch or diff view.
- Specialists are just a model switch: one shared prompt, no plan, no task list, no subagents, no scoped permissions.
- Browser evidence reports page errors and HTTP 5xx only; no console errors, failed requests, viewport or keyboard checks.

**Context.** Each call sends one JSON blob (request, build plan, spec, memory, answers, file list, remaining calls) followed by at most the last four turns, trimmed until a byte budget of 28–48 KB fits. The checkpoint keeps the last 6 turns and 24 history entries; everything older is lost to the model (the full record survives only in `AgentSteps`). Bytes are treated as tokens; model context limits (≈1M tokens for all four routed models) are unused. The volatile JSON comes first, so provider prompt caching rarely hits after the instructions.

**Failures, interruption, spending, source changes.** Durable steps, execution leases, ambiguous paid calls block replay, cancellation releases holds, failed builds are waived, the spend guard caps every call, source applies only after revision/permission/evidence checks. Edits invalidate evidence.

**Architectural blockers.** The source of truth is the in-memory file list, so anything that changes the sandbox directly (a shell, an installer, a generator) would silently diverge. Platform checks run as the same Unix user as generated code inside a login shell, which is safe only while the agent has no shell: a live probe showed one line appended to `~/.profile` rewrites the output of every later command run as that user. Dependencies are a read-only shared folder. Step sequence numbers come from a database `max()+1`, which cannot support parallel agents.

## Live sandbox findings (16 October 2026)

- Commands run through a login shell; the agent's user has no sudo; root commands are unaffected by user dotfiles. Making `/home/user` and its shell profiles root-owned blocks every hijack attempt.
- A separate `gotcha-check` user can type-check and build a snapshot copy of the source; ptrace across users needs privileges the agent does not have.
- `169.254.169.254` is Firecracker MMDS: it exposes only a hash of the in-VM daemon token and sandbox identifiers, no credentials. The VM's iptables lacks owner matching, so per-user fencing is not available and not needed.
- `updateNetwork` switches egress in ~0.4 s: with `allowOut: ['registry.npmjs.org']` npm installs work (3 s) while other hosts stay blocked; blocking resumes afterwards.

## Plan and acceptance criteria

1. **Repository tools and isolated commands.** Glob, regex/literal grep with context, line-range reads, symbols, definitions, references, callers, imports/reverse dependencies (TypeScript language service over the authoritative files; regex fallback for Python), diagnostics with file:line from the type checker. Create/modify/move/delete, multi-file patches, unified diffs, stale-read rejection. Editable scope: any safe project path except protected platform files; `package.json`/lockfile change only through the platform installer. `run_command` with argv, controlled cwd, timeouts, bounded output, background processes (status/output/stop); every command is followed by a workspace sync that validates and imports changes or reverts forbidden ones. `install_packages` opens registry-only egress, ignores install scripts, records the lockfile and audits.
   _Accept:_ unit tests for each tool; a live sandbox run that installs a package, builds, runs a test script, starts a background server, syncs a generated file and reverts a protected-file edit.
2. **Context management.** Separate durable project state, the full step record and the working context. Token budgets from model limits with calibrated estimates; stable prefix first for caching; deterministic compaction of older turns into a fact ledger; `recall` over the full record; read results tied to content hashes.
   _Accept:_ a long synthetic session stays within budget, keeps requirements/decisions/failures/next actions, and recalls a compacted fact.
3. **Orchestrator and specialists.** Task plan with dependencies and assignments persisted on the job; specialist profiles with instructions, tool scopes, write scopes and budgets; subagents on file overlays with base hashes, run in parallel only with disjoint write scopes; coordinator integration with conflict detection; one shared budget and sequence allocator. Small jobs never see these tools.
   _Accept:_ two parallel subagents edit disjoint files and integrate; overlapping edits are reported, never silently overwritten; spend across agents stays inside one hold.
4. **Impact analysis and independent verification.** `analyze_impact` (consumers, routes, tests); `review_changes` (diff plus findings such as deleted or skipped tests, `@ts-ignore`, swallowed errors); completion requires review and checks after the last change. Platform checks run as `gotcha-check` on a snapshot of the authoritative files after stopping agent processes. Browser evidence adds console errors, failed requests, viewport and keyboard steps.
   _Accept:_ tampering cases (skipped tests, check run before last edit, edited protected test) cannot finish as verified.
5. **Recovery, cost and evaluation.** Processes, tasks and assignments in checkpoints; usage records carry agent, role and effort; measured outcomes per routing cell can promote a better-performing start model. Repeatable evaluation tasks with independent acceptance, run for v1 and v2 under the same model and budget.
   _Accept:_ evaluation report with completion, correctness, false completion, cost and time per task, clearly labelling unrun comparisons.

Feature flags: `AGENT_RUNTIME=v1|v2`, `AGENT_SHELL=on|off` and `AGENT_ORCHESTRATION=on|off`, snapshotted on each job's routing plan so in-flight jobs never change behaviour. The plan above proposed v2 as the default; after the evaluation below the default stays **v1** (see "Recommendation").

## Delivery status (16 October 2026)

All five stages are implemented behind the flags and tested; none is scaffolding.

| Stage                                  | Where                                                                                                                                                                                       | Evidence                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1. Repository tools and commands       | [toolsV2.js](../Agent/toolsV2.js), [codeIntel.js](../Agent/codeIntel.js), [workspace.js](../Agent/workspace.js), [diff.js](../Helpers/diff.js), [e2bSandbox.js](../Providers/e2bSandbox.js) | Unit tests for every tool; live sandbox check (17/17, `scripts/verify-agent-v2-live.js`)                |
| 2. Context management                  | [context.js](../Agent/context.js)                                                                                                                                                           | Compaction, shrinking, calibration and recall tests; resume test                                        |
| 3. Orchestrator and specialists        | [orchestrator.js](../Agent/orchestrator.js), runtime `invoke`/`processStep`                                                                                                                 | Parallel-specialist runtime test (shared hold, disjoint scopes, integration); plan/scope/conflict tests |
| 4. Impact and independent verification | [impact.js](../Agent/impact.js), [tools.js](../Agent/tools.js), checker user in the sandbox                                                                                                 | Review/tampering tests; console-error refusal test; live checker isolation                              |
| 5. Recovery, cost and evaluation       | [runtime.js](../Agent/runtime.js), [outcomes.js](../Agent/outcomes.js), migration 014, [evaluate-agent.js](../scripts/evaluate-agent.js)                                                    | Checkpoint resume test; in-flight spend invariant; outcome SQL test; v1/v2 evaluation                   |

**Active capabilities with `AGENT_RUNTIME=v2`.** Glob, grep (literal/regex with context), sectioned reads with line numbers, TypeScript language-service symbols/definitions/references/callers/dependencies, diagnostics with file:line (tsc, esbuild/Vite, unresolved imports, Python tracebacks), write/patch/atomic multi-file patch/move/delete with stale-read rejection, unified diffs. A project shell (`run_command` without shell parsing, background processes, `install_packages` with registry-only egress, no install scripts, recorded lockfile and audit) whose every change is validated and imported or reverted. Token-budgeted context with a stable cacheable prefix, deterministic fact ledger, oversized-output shrinking, calibration and `recall`. For medium and large jobs, `plan_tasks`/`delegate` to eight specialist profiles on private overlays with write scopes, parallel only when scopes are disjoint, conflict-checked integration, one sequence allocator and one hold (in-flight worst cases reserved). `analyze_impact`, mandatory `review_changes` after the last edit (deleted/skipped tests block), strict verification (console errors fail), and a fingerprint check so the delivered files are exactly the verified build. Usage records carry effort, role and specialist; measured outcomes can demote a failing starting variant.

**Both runtimes** now run platform checks as the `gotcha-check` user on an exact snapshot after stopping agent processes (also before the preview binds its port), with a root-owned home so login-shell hooks cannot be planted.

### Live sandbox check (no model calls)

`RUN_AGENT_LIVE=true node scripts/verify-agent-v2-live.js` (91 s, 16 October 2026): source created by a command imported; protected `index.html` restored; no platform credentials in the agent environment; outbound network blocked; `~/.bashrc` and `sudo` refused; `zod` installed with a lockfile and usable, registry closed again afterwards; a planted server on the preview port stopped before checks; type check and build pass in the checker snapshot; mobile browser test with console data; diagnostics on unchanged files keep the verified build; a type error reported at `src/extra.ts:1`; the checker snapshot is not writable by the agent. 17/17 passed.

### Evaluation

Harness: [scripts/evaluate-agent.js](../scripts/evaluate-agent.js) (`RUN_AGENT_EVAL=true`). Real OpenRouter and E2B calls under the development policy (GPT-6 Luna only, effort by job size) against the dedicated local database `gotcha_agent_live_test`, whose records are kept for audit and regrading. Each job goes through the normal API (estimate, hold, queue, worker). After a job reports completion, a **hidden Playwright test the agent never sees** exercises the preview the customer would receive, served from a secure origin; a job that stops to ask the user is recorded and cancelled. Tasks: `copy-change` (two text edits, landing template), `task-filters` (All/Active/Completed filters, tasks template), `count-bug` (seeded defect: the counter counts finished tasks), `lost-stage` (move types into `src/customers.ts`, add a Lost stage and a summary card, CRM template) and `date-line` (today's date formatted with `date-fns`, which the template does not include). USD is model plus sandbox cost; credits are what the customer was charged (stopped jobs are waived).

**Round 1, before tuning** (every job was sized medium because templates counted as new apps; three runs per cell; one v2 `date-line` run was lost to a harness fault):

| Task         | Runtime | Runs | Hidden tests passed | Stopped (budget / asked user) | False completions | Credits per run | Model + sandbox USD per run | Calls per run | Seconds per run |
| ------------ | ------- | ---- | ------------------- | ----------------------------- | ----------------- | --------------- | --------------------------- | ------------- | --------------- |
| copy-change  | v1      | 3    | 3/3                 | 0 / 0                         | 0                 | 11.3            | 0.0045                      | 6.0           | 56              |
| copy-change  | v2      | 3    | 3/3                 | 0 / 0                         | 0                 | 16.3            | 0.0066                      | 7.7           | 73              |
| task-filters | v1      | 3    | 3/3                 | 0 / 0                         | 0                 | 24.0            | 0.0096                      | 7.7           | 97              |
| task-filters | v2      | 3    | 3/3                 | 0 / 0                         | 0                 | 35.3            | 0.0141                      | 9.3           | 116             |
| count-bug    | v1      | 3    | 3/3                 | 0 / 0                         | 0                 | 9.7             | 0.0040                      | 5.0           | 53              |
| count-bug    | v2      | 3    | 3/3                 | 0 / 0                         | 0                 | 14.7            | 0.0057                      | 7.3           | 62              |
| lost-stage   | v1      | 3    | 3/3                 | 0 / 0                         | 0                 | 24.0            | 0.0096                      | 8.0           | 97              |
| lost-stage   | v2      | 3    | 3/3                 | 0 / 0                         | 0                 | 51.7            | 0.0208                      | 14.0          | 166             |
| date-line    | v1      | 3    | 0/3                 | 0 / 3                         | 0                 | 0.0             | 0.0098                      | 6.7           | 96              |
| date-line    | v2      | 2    | 1/2                 | 0 / 1                         | 0                 | 25.0            | 0.0229                      | 14.5          | 151             |

Totals: v1 passed 12/15 (all three misses stopped to ask permission to use `Intl`, because v1 cannot install packages); v2 passed 13/14 (it installed `date-fns` itself; the other run is explained below). No false completions in either runtime. v2 cost 1.7× the USD and 2.0× the credits, mainly from extra exploration calls on small edits.

Fixes made from what round 1 showed: review diffs listed the 2,290-line lockfile first and hid the agent's own change, so the agent looped and finally asked the user (lockfiles are now summarised and listed last); instructions now match effort to the request and bundle review with finish; starter templates are sized as existing apps (a two-string edit is small, a new app inside a template is not).

**Round 2, final code** (two runs per cell):

| Task         | Runtime | Runs | Hidden tests passed | Stopped (budget / asked user) | False completions | Credits per run | Model + sandbox USD per run | Calls per run | Seconds per run |
| ------------ | ------- | ---- | ------------------- | ----------------------------- | ----------------- | --------------- | --------------------------- | ------------- | --------------- |
| copy-change  | v1      | 2    | 2/2                 | 0 / 0                         | 0                 | 8.5             | 0.0035                      | 6.0           | 44              |
| copy-change  | v2      | 2    | 2/2                 | 0 / 0                         | 0                 | 14.0            | 0.0055                      | 7.0           | 76              |
| task-filters | v1      | 2    | 2/2                 | 0 / 0                         | 0                 | 21.5            | 0.0088                      | 6.5           | 98              |
| task-filters | v2      | 2    | 2/2                 | 0 / 0                         | 0                 | 27.0            | 0.0107                      | 6.0           | 102             |
| count-bug    | v1      | 2    | 2/2                 | 0 / 0                         | 0                 | 7.0             | 0.0029                      | 5.0           | 40              |
| count-bug    | v2      | 2    | 2/2                 | 0 / 0                         | 0                 | 10.5            | 0.0040                      | 6.0           | 50              |
| lost-stage   | v1      | 2    | 1/2                 | 1 / 0                         | 0                 | 15.5            | 0.0139                      | 12.0          | 150             |
| lost-stage   | v2      | 2    | 2/2                 | 0 / 0                         | 0                 | 34.5            | 0.0137                      | 8.0           | 145             |
| date-line    | v1      | 2    | 0/2                 | 2 / 0                         | 0                 | 0.0             | 0.0115                      | 8.0           | 126             |
| date-line    | v2      | 2    | 0/2                 | 2 / 0                         | 0                 | 0.0             | 0.0131                      | 10.0          | 132             |

Totals: v1 passed 7/10, v2 8/10, no false completions; v2 used 1.6× the credits and 1.15× the USD, and per passed task the cost was equal (USD 0.0116 v1, 0.0118 v2). v1 ran out of calls on one `lost-stage` run. Both runtimes ran out of calls on every `date-line` run, which exposed a defect from v1 affecting both: the interactive-app check matched substrings, so "**form**atted" demanded click/fill tests that a display-only change can never provide, and `finish` was never offered. The check now matches whole words, and the review no longer flags `App.tsx` as shared code when only the protected entry point imports it.

**Round 3, `date-line` after that fix:**

| Task      | Runtime | Runs | Hidden tests passed | Stopped (budget / asked user) | False completions | Credits per run | Model + sandbox USD per run | Calls per run | Seconds per run |
| --------- | ------- | ---- | ------------------- | ----------------------------- | ----------------- | --------------- | --------------------------- | ------------- | --------------- |
| date-line | v1      | 2    | 0/2                 | 2 / 0                         | 0                 | 0.0             | 0.0121                      | 8.0           | 132             |
| date-line | v2      | 2    | 2/2                 | 0 / 0                         | 0                 | 22.0            | 0.0089                      | 8.5           | 98              |

v2 installed `date-fns` through the installer (lockfile recorded) and passed both runs; v1 cannot add packages, tried to edit the protected manifest and stopped at its call limit both times (small jobs may not ask questions). With round 3 replacing round 2's `date-line` rows, the final code passed **v2 10/10, v1 7/10**, with no false completions.

**What this shows, and what it does not.** On Luna, v2 was at least as correct as v1 on every task, never ran out of calls on the multi-file refactor (v1 did once), and satisfies requests that need a dependency (v1 cannot); neither runtime claimed a success the hidden tests refuted. It costs more per job on simple edits and about the same per successful job. The sample is small (2–3 runs per cell, five web tasks, one model), so these are indications, not statistical significance. Quality-routed models (Sol, Sonnet, Opus) were not evaluated; full-stack, mobile and Python projects were not evaluated; specialist delegation was offered on medium jobs but Luna never chose it, so its effect on quality is covered only by the scripted runtime test. **OpenCode was not run**; no comparison with it is made.

### Recommendation

Use `AGENT_RUNTIME=v2` for development builds now. Before making it the production default, run the same suite on the quality-routed models after the Neon migrations, extended with full-stack and larger multi-file tasks, and compare cost per successful job. The flag can then be switched without affecting jobs already running.

### Limitations and owner dependencies

- Migrations 012, 013 and 014 must be applied to the Neon platform database (`npm run db:migrate`) before this code can start there; the server refuses to start with pending migrations.
- An interrupted delegation is not resumed: its coordinator step stays unfinished and the job must be cancelled (the existing rule for any tool action with an unknown outcome). Coordinator steps resume from checkpoints.
- Specialists cannot use the project shell; only the coordinator can.
- Expo and Python projects keep single-user checks and get no shell (checker isolation is verified only for Vite-based web, PWA and desktop projects).
- Measured-outcome routing needs at least 10 jobs per cell before it acts; it only demotes, never promotes below the owner's quality floors.
- Prompt caching depends on the provider: GPT caches automatically through OpenRouter; Claude caching was not verified for the Responses API.
- OpenCode was not run; no comparison with it is claimed.

## Review corrections and acceptance (17 October 2026)

The current local configuration is v2 and Neon migrations 012–014 are applied. The original limitations above are historical: Expo and Python now use separate checker users and support the coordinator's project shell. See [BUILD_READINESS.md](BUILD_READINESS.md) for the corrected readiness scope and remaining native distribution limits.

Dependency restoration, protected retry manifests/deletions, bounded RE2 searches and diff computation, deferred-path shell checks, required-task completion, persistent security findings and execution of generated project tests are covered by regression tests. Installation now rebuilds a clean dependency tree using a trusted npm path rather than copying agent-writable dependencies into the checker. Full-stack browser validation tolerates only the expected server-owned unauthenticated session probe; console failures receive explicit repair feedback. PWA installation is separated from restricted mini-preview rendering.

Final verification:

| Check                                     | Result                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| Backend suite                             | 130 passed, 9 optional provider contracts skipped, 0 failures                  |
| Browser UI workflows                      | 20 passed against isolated local-mail fixtures                                 |
| Live E2B boundary checks                  | 19 passed, including fresh lockfile restoration and failing project tests      |
| Runtime contracts                         | 7 passed: Expo, Expo/Node, FastAPI, Flask, Django, Electron renderer and PWA   |
| Real Luna generation                      | Node-backed web edit, Expo tracker, Electron tracker and PWA tracker completed |
| Independent generated-app browser grading | All three trackers passed add/reset with no console errors                     |
| Generated PWA offline contract            | Worker control, manifest icons, offline reload and offline interaction passed  |
| Platform production dependency audit      | 0 reported vulnerabilities at verification time                                |

The full-stack generated edit completed in six model calls; its runtime was paused and resumed, then signup and owned-record CRUD passed. The corrected PWA completed in seven calls. Earlier live failures identified and led to repairs of the auth-probe and PWA preview problems; they are not counted as passing runs. Tests used synthetic local-database accounts, not the owner's Neon data or account balance. Model and sandbox calls still consume provider credits.

These results support controlled use of the supported build/test paths. They do not prove arbitrary software correctness, native device behaviour, Windows/Linux execution or production-scale reliability. Quality-routed premium models were not rerun; development remained on GPT-6 Luna. Interrupted unknown-outcome operations remain fenced rather than replayed. Customer GitHub and hosting integrations are outside this acceptance scope.
