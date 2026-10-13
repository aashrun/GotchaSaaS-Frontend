# Agent implementation

The default builder now uses the `agent-v1` loop under `backend/Agent/`. The prior structured change-set builder remains available for old jobs and regression coverage. It is no longer the default Studio experience.

A user prompt is authenticated and estimated; the user accepts its maximum credit reservation. The API snapshots server-side role routing and source revision, persists the initial message once, and queues a job. The worker checks actor/project permissions again, saves source history, starts or resumes a private E2B workspace, and invokes OpenRouter Responses function tools.

Tools inspect project files, write bounded editable source, run fixed checks, interact with the actual browser, read public pages, perform bounded web research, save project memory, read the connected repository, and prepare external actions. Each provider result records returned token usage/cost before execution. Tool arguments are server-validated. Source candidates and observations are saved between steps. Model-selected shell text is never executed by the control plane.

A full-stack starter has an actual Express server and PostgreSQL inside E2B. Signup/login, session handling, persistent records and cross-user authorization have protected acceptance checks. Browser tests capture screenshots and visible assertions. Completion requires passing checks on current files; source edits invalidate prior evidence. Transactional application checks cancellation, current permissions and optimistic source revision.

An interrupted worker leaves a paused job. The requester can resume a safe checkpoint. A dispatched provider/tool with no known result blocks resume and needs reconciliation/cancellation; no invisible paid retry occurs. The generated app's sandbox can pause between preview sessions. This state is distinct from source version history, which never rolls back a live database.

The supported dependencies/runtime are curated. Arbitrary system commands, unrestricted internet, arbitrary package installs, unsupported backend stacks, every external connector and production hosting are not supplied by this loop. Its capabilities expand through reviewed typed adapters.

See [routing, budgets and cloud operation](HARNESS_STRATEGY.md), [security boundaries](SECURITY.md), [voice dictation](VOICE_INPUT.md), and [project structure](PROJECT_STRUCTURE.md).

## Conversation and clarification

Tool execution emits actual file/research/validation activity. The default loop excludes the status-only progress tool from model selection so it cannot waste a call on narration. These are progress reports, not hidden model reasoning. `ask_user` persists a requester-scoped question. A first build asks one concise purpose/audience question when needed, with a simple recommended choice; answered intake questions carry into later attempts. Blocking questions fence the rest of a tool batch, complete function outputs, checkpoint and pause E2B before exposing a resumable state. A non-blocking question declares deferred source paths; other edits may proceed, but finishing waits for outstanding answers. Answers are supplied explicitly to the resumed model context. Unknown interrupted provider/tool outcomes remain non-resumable. `POST /projects/:id/messages` saves typed prompts idempotently before infrastructure checks or credit reservation.

Interactive apps need browser interactions and assertions in addition to compilation. Tic-tac-toe has a platform-owned acceptance protocol rather than relying on model-authored test claims. The current trusted browser driver is installed on workspace creation/connection, remains root-owned, and uses the compiled static artifact with external requests blocked. Passing current evidence makes finish the sole permitted function; it cannot finish before validation. See [the real game build record](LIVE_GAME_VERIFICATION.md).
