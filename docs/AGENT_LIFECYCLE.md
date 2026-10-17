# Agent execution limits

Verified against runtime v2 on 17 October 2026. A job works until its verification gates pass or a limit/pause condition is reached. It is not an unlimited background engineer.

## Per-job allowances

| Job size | Total model calls, including specialists | Base active-time allowance | Context allowance       |
| -------- | ---------------------------------------- | -------------------------- | ----------------------- |
| Small    | 10                                       | 5 minutes                  | 24,000 estimated tokens |
| Medium   | 18                                       | 10 minutes                 | 32,000 estimated tokens |
| Large    | 28                                       | 15 minutes                 | 48,000 estimated tokens |

The active-time allowance is multiplied by the initial model's reasoning factor: low 1, medium 1.2, high 1.5, xhigh 2, max 2.5. A plan with an escalation ladder adds 120 seconds. Thus the largest current allowance is at most 39.5 minutes; the actual routing snapshot is authoritative. Medium Luna jobs currently select max effort and receive 1,500 seconds (25 minutes). A retry may be routed one size up. These are maximum allowances, not promised completion times.

The approved credit hold also creates a hard model-spend allowance. Before a call, the runtime bounds its maximum output against remaining spend, including other calls in flight. A shared step counter prevents subagents from creating additional unbounded work. Context compaction preserves recorded facts and recall, but does not enlarge the job's call/time/spend caps.

## Waiting and timeouts

- Model calls have effort-based deadlines of 2/3/4/6/8 minutes, clamped to the job's remaining time. An explicit abort deadline covers both response headers and body parsing; a gateway that sends headers and then stalls cannot leave the worker waiting indefinitely. No automatic provider retries occur.
- Foreground project commands default to 120 seconds and have a 600-second ceiling. Dependency installation and platform checks have their own bounded timeouts. The sandbox receives the remaining active-time allowance and pauses at expiry. The runtime checks its allowance and cancellation before subsequent actions; it can still be unwinding an operation or cleaning up at expiry.
- Heartbeats every three seconds indicate worker liveness, not useful progress. Recovery scans once a minute and treats a heartbeat older than five minutes as interrupted. A paused question/checkpoint is different from a stalled operation.
- Blocking questions pause the sandbox and worker execution. Nonblocking questions defer named paths while independent work continues. When independent work ends, the job pauses. Answering can resume a safe checkpoint with only the unused allowance.
- An interrupted paid provider call or mutating tool with an unknown outcome is fenced from automatic replay. It requires cancellation/reconciliation instead of risking a duplicate action or charge.

## Completion, failure and hosting

Completion requires current build/type checks, generated regression tests where present, browser interactions, a review of the final changes, finished required tasks and no unresolved high-severity specialist findings. Merely reaching the end of a model answer is not completion. Failed/budget-exhausted work preserves the last delivered project; ordinary failed builds waive the customer charge, while provider usage is still real and recorded. A cancelled run can charge measured work already performed. Paused work keeps its reservation until resumed or cancelled.

Larger applications need several bounded jobs. There is no automatic indefinite continuation across budget-exhausted jobs. Completing one small acceptance example does not establish correctness of arbitrary production software.

Closing the browser does not cancel a queued or running job. The API/worker must stay online. In the current local setup they run on the owner's computer, so sleep/shutdown interrupts orchestration even though E2B is remote. A continuously running cloud worker is needed to work while the laptop is off. That is an operational hosting dependency, separate from connecting a generated application to a customer's GitHub or hosting account.
