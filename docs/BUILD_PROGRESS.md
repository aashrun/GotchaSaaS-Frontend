# Customer build progress

Progress now describes work on the customer's application. It does not stream private reasoning or expose Gotcha's model selection, vendors, pricing or infrastructure.

Tools carry a short `customer_note` about the action they are about to perform. Notes travel with the normal tool call, so they require no separate model call or status-only turn. The runtime emits a started event and an outcome after the tool returns. Failed checks, failed browser assertions and rejected saves cannot be labelled successful. A bounded, validated event envelope retains the app subject and note in stored/SSE history; arbitrary old log strings cannot become customer messages. Unsafe notes fall back to deterministic app-action labels.

The chat keeps progress outside the user's message bubble, groups repeated reads and start/outcome pairs, preserves failed steps, hides repetitive generic planning entries and offers a compact activity history. There is no fake percentage or rotating claim of work that did not happen. The current observable action, last-update time and elapsed clock remain visible while a model request is pending.

Runtime v2 records the first start, accumulated active time and final completion time. Question pauses stop the active clock; safe resumes retain the previous total. Worker recovery uses the last known heartbeat for interrupted time. Historical jobs fall back to their existing timestamps; their older generic messages are not rewritten into invented feature updates. Final timing is recorded before the completion event, independently of later credit settlement. The UI briefly refreshes unsettled receipts rather than incorrectly reporting zero usage.

The finish tool provides structured delivered features, explicit exclusions and product approach. The server appends actual build/regression/browser results. These are persisted with the job and displayed in a borderless completion card. Older runs without a structured report do not receive an invented one.

## Cut-off write recovery

The reviewed AI video-editor job used 18 calls and ended after approximately 19m42s. Nine `write_file` argument strings ended mid-string despite the gateway marking their replies complete. The old runtime returned a tool error but did not count these as malformed replies, allowing repetitive retries. It never reached build/browser verification. Only an unverified helper was staged; the delivered project remained unchanged and the charge was waived.

The runtime now validates argument JSON before executing a reply, provides explicit smaller-change feedback, and stops after three consecutive invalid replies. Runtime v2 writes are capped at 8,000 characters; larger features must be split into modules or edited through small patches. Oversized writes follow the same bounded repair path. It never repairs/trusts guessed code or applies an unverified draft. This fixes the retry behaviour; it does not claim that the earlier video editor was successfully built.

## Verification

- 137 backend tests passed; nine optional provider contracts skipped. Added coverage includes safe progress encoding/privacy, honest outcomes, historical/final timing and stopping repeated cut-off writes without changing delivered source.
- Nine chat browser workflows passed, including live/frozen clocks, repeated-update grouping, both themes, completion scope/approach/checks, questions, preview and keyboard behaviour.
- A real development-model/full-stack edit completed in five calls with specific app notes and structured finish fields. Build/browser checks and the resumed signup/CRUD bridge passed. It used an isolated local fixture account and the connected providers; the owner's failed job was not rerun or charged.

Screenshot fixtures and raw traces stay in ignored `.local` directories. The example appointment-planner screenshots are test data, not a claim that the video-editor project completed.

## Inline work thread

The work thread follows the supplied conversation reference: a muted elapsed-time disclosure, readable progress paragraphs and quieter icon rows recording the actual actions underneath. Running threads start expanded; historical completed threads can be opened from their final duration. Longer feeds show the latest six paragraphs with a control to reveal earlier updates. Failed steps stay visible. New activity follows the bottom only while the reader is already near it.

Customer notes may contain one to three sentences, up to 480 characters, about observable work and its purpose. This is public progress commentary, not private reasoning. Notes reuse the existing action calls, privacy validation, storage and event stream; no extra status-only model calls were added. Earlier notes remain readable.

Completed runs persist server-measured net totals for files changed and lines added/removed, including new and deleted files. The customer response exposes only nonnegative integer counts after successful source application. Failed or historical runs without these totals do not receive invented counts. The clock now formats hours as well as minutes and seconds. The completion report is inline and borderless in both themes.

This refinement passed 30 backend tests covering progress, privacy, diff totals and runtime completion, plus ten browser chat workflows covering grouped commentary/action rows, frozen clocks and hour formatting, keyboard disclosure, history expansion, both themes and phone overflow. The production frontend build passed. These UI fixtures do not spend customer provider credits.

## Specific commentary, final answers and responsive input

A review of the owner's actual saved editor run found useful commentary in the tool calls, but an overly restrictive verb allowlist rejected wording such as “I’m rebuilding”, “I’m repairing” and “I’m finishing”. The note validator now accepts varied public wording while retaining length bounds, secret/path/model filtering and the ban on premature success claims. New regression cases cover the previously rejected wording. Incidental actions without notes are grouped under the current meaningful paragraph; their generic “Reviewed your app” messages are never rendered as separate paragraphs.

Completed work automatically collapses its activity. The final assistant response renders safe Markdown paragraphs, emphasis and lists, followed by the scope/check/change receipt. Raw HTML, remote image loading and active-script links are not enabled. Finish instructions require answers to explicit questions, observed diagnosis, clear exclusions and what the user can try next. No new provider calls were added for status copy. Body/progress text is larger, navigation labels are larger within the same 248px sidebar, and recent-project links have no chat icon.

Submission displays the prompt immediately, including while a new project is being created. Verified chat submissions no longer create an extra message and reload before estimating/queuing; the job transaction already persists that message. Accepted job/message state is applied locally, and sidebar refreshes run in the background. The credit estimate, reservation, authorization and idempotency checks remain on the server. Failed submissions retain the prompt, request identity and retry path across a page reload; this does not claim the server acknowledged a request before it did.

Dictation stops recording immediately, returns to a small pending microphone indicator while the actual transcript is awaited, and inserts the result without a success toast. No visible “Transcribing…” text or spinner is shown. The bounded request is cancelled on unmount so a late result cannot land in a different composer. Provider processing still takes real time; no transcript is fabricated.

Validation: 30 backend tests passed and 14 chat/voice browser workflows passed, including delayed project creation, delayed/failed chat submission, no duplicate message POST, automatic completion collapse, 18 unannotated actions grouped into one update, safe Markdown, both themes, unchanged sidebar width, mobile layout and delayed dictation without the removed text/toast. The real saved editor conversation was also inspected without submitting a build or rerunning its job. Repeated test runs hit the isolated server's auth limiter; its process was restarted for the clean run, without changing the production limit.
