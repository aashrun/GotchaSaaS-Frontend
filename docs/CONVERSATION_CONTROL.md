# Conversation, continuation and queued work

Every prompt in ProjectChat previously used estimate + jobs directly. A question started a tool-equipped coding run; a bare “Continue” replaced the task request, and the runtime had no recent chat context. An unrelated failed checkpoint could also be reused. The composer refused follow-ups while a job was active.

## Request lifecycle

`POST /ai/turns` saves a unique user message and durable ConversationTurn atomically. Retries reuse the same identifier; reusing an identifier for another user, project or prompt is rejected. No build credits are held while waiting in the message queue. The current app continues to render the message immediately.

A dispatcher, independent of the coding worker, processes turns. A typed Jev 1.14 decision receives recent messages, the latest task/status, known project runtime and image references. It makes one authoritative choice: `answer`, `build`, `resume` or `clarify`. The current request is explicitly separated from historical context and takes priority; older explanation-only instructions do not remain active. Keywords do not override its contextual intent. Uncertain requests ask a clarification. A generative model writes prose only after answer mode has been selected. Invalid or interrupted output fails safely rather than defaulting to coding. Answer mode has no tools or sandbox and cannot edit files. It writes the final assistant answer directly.

Intent uses Jev through the Decisions API with a 10-second deadline. Answer writing uses the inexpensive Luna model, a 30-second call and at most 1,600 output tokens per attempt. Jev cannot generate prose. Generative reply tokens/cost are recorded on the private turn result, including explicit retry costs. Jev usage has a separate DecisionUsages ledger; these operating costs are included in admin economics. Conversation is capped at 12 submissions/minute, 100 messages/user/day, $0.50/user/day in recorded provider costs, and 10 outstanding turns. Coding retains its existing credit reservation, spend guards, authorization and verification. Provider fields never appear in public turn data.

Build mode goes through the existing estimate, reservation and job submission service. User/project limits still permit only one live coding job. Checks happen when the queued request is dispatched against the latest project revision. Another user's build cannot be interrupted.

## Continue and stopped work

A standalone continue/resume/retry is tied to the latest task in this project by this requester. A paused task uses its existing safe resume path, preserving pending-question and unknown-outcome safeguards. A cancelled/failed task starts a new bounded run with its complete original request, recent conversation and explicit continuation origin. Repeated continuations preserve the same original request without growing prompt wrappers. Original references are retained when the continuation supplies none.

Candidate files are carried forward only for that explicitly identified stopped task, at the same project revision, after validating changes and checking that no tool/provider step has an unknown outcome. Otherwise the agent inspects the current verified project afresh. No unrelated failed checkpoint is silently picked up. Existing checks remain required before applying changes.

A completed latest task is not restarted by a bare continue; Gotcha asks what to do next. Legacy jobs that mistakenly ran for discussion or a bare control word without delivering source changes are skipped when locating the actual task; this recovers the stopped request in the reported conversation. A completed legacy retry with measured source changes remains a completed task. Historical results are not rewritten. Older runs that used the former behavior remain in history.

## Queue and interruption UX

While a build runs, Enter/the arrow queues a follow-up; Shift+Enter inserts a newline. The stop control remains separate. “Interrupt & send” prioritizes a new message. The queued list supports Send now and removal and survives reloads. Queued prompts are processed in order; explicit Send now may jump ahead.

An immediate conversational question is answered without stopping the build. An immediate coding request asks the existing run to cancel, waits for it to reach a safe tool boundary and finish settling, then starts the follow-up with fresh context. An in-flight provider/tool call is not forcibly replayed or assumed aborted; interruption can take until that operation returns. No two coding jobs run concurrently for the user or project.

Project owners/members may read queue state, but only the sender can control a queued message. Pending/failed messages can be removed before dispatch; dispatch and cancellation are serialized by row locks. Startup recovery reconciles accepted jobs by idempotency key. An uncertain paid conversation call is marked for explicit retry rather than automatically repeated.

Migration: `015-conversation-turns.js`. Run `npm run db:migrate` before starting the updated backend/worker. Both integrated app and standalone worker run the dispatcher.

## Validation

Saved backend regressions cover answer-only handling, mixed intent, complete continuation scope, completed-task behavior, queue persistence/order, interruption without overlap, questions during a running build, ownership/idempotency, malformed responses, and crash reconciliation. Existing integration/runtime/billing tests remain required.

Browser checks cover queue submission, reload, Send now/removal, explicit interruption, conversational rendering without a build, immediate prompt display, keyboard behavior, questions, preview and current activity rendering.

A live read-only check in the owner video-editor conversation sent “Did you uderstand my problem in the first place?”. Gotcha correctly restated Story Map/Edit Planner blank screens and the unanswered scalability question. The message was answered with no job ID; the project's build-job count stayed at six. Recorded provider cost: $0.000254727. This does not claim the customer's blank-screen bug itself has been repaired.
