# Security boundaries

All control-plane APIs require an authenticated, revocable session. Mutations also require the allowed origin and a session CSRF token. Project access comes from organization membership, with viewer/editor/admin/owner enforcement. Quotas, source revisions, row-locked credit reservations, spending limits, enabled-model snapshots and unique settlement keys are server policy. Strict schemas and the request guard reject prototype keys, excessive nesting/fields, invalid text, NULs and the EICAR test signature.

## Files and execution

Customer code never runs in the API, local Node process or local shell. Only reviewed repository-owned templates are prepared locally. The E2B microVM receives no platform/provider/billing/repository credentials. Its network has denied internet egress and no public preview ingress. Trusted drivers and pinned dependencies are root-owned, and tenant processes run as an unprivileged user without sudo whose home and shell profiles are root-owned. Platform verification runs as a separate `gotcha-check` user with a clean environment on an exact snapshot of the authoritative source, after every tenant process is stopped, so nothing the agent's own commands do (runtime v2) can shape check results. Egress opens only to the npm registry during platform-run installs. The generated app's database credential grants access only to its isolated preview PostgreSQL database.

Source paths reject absolute paths, traversal, dotfiles, unsupported executable extensions, node_modules and build/output directories. File count, bytes and individual edits are capped. Protected package/entry/runtime configuration, runtime bridge and acceptance tests cannot be unlocked. Candidate writes are validated independently of model instructions. Build/browser evidence resets on edits, and final source application requires the current revision and permissions.

Failed source candidates may be reused only for the same requester/project at the unchanged revision, with no ambiguous provider/tool step. Source validation runs again and all validation evidence is discarded. The browser driver and tic-tac-toe acceptance protocol are installed as root-owned platform code; customer source cannot replace them. The static browser runs the actual compiled artifact and blocks external requests.

Arbitrary archive/binary uploads are unsupported. The text-reference control is bounded and server text validation applies to the resulting prompt. Dictation accepts only canonical bounded PCM WAV, never a URL or arbitrary uploaded document. A signature check is not a full antivirus scanner. No ClamAV service is claimed to be running; adding generic binary uploads requires quarantine and real antivirus/content-disarm scanning before enabling them.

## Browser and network

Published preview artifacts use an opaque-origin sandboxed iframe without same-origin privileges, parent navigation or external connections. CSP restricts scripts/styles to inline bundled artifacts and images to data/blob. Full-stack API access is an explicit postMessage broker: it validates the iframe source, nonce, request ID, method/path, body quota, authenticated project permission, live lease and per-user concurrency/rate limits. Only a fixed sandbox localhost API port is reachable. Platform cookies and tokens are never forwarded; generated-app cookies remain in a sandbox-private jar scoped to the platform user and project.

Public research accepts HTTPS on port 443 without URL credentials. It resolves all addresses, rejects loopback/private/link-local/metadata/mapped addresses, pins the verified DNS answer into the transport, and rechecks every redirect. Only bounded text responses are returned, with scripts/styles removed. Fetched content, code, memories and search results remain untrusted data and cannot alter server permissions.

## Secrets and external writes

Backend environment files are ignored and private. Stored connector credentials use authenticated AES-256-GCM encryption. The agent never receives those credentials. GitHub repository reads reject potential credentials. Actions snapshot repository, branch, source revision, files and digest for owner review. Only the owner approval endpoint may perform the external write. It claims each action once and records ambiguous outcomes instead of blindly retrying a branch/commit/PR operation. A changed connection or source invalidates approval.

Provider calls have explicit bounds and no automatic paid retries. An interrupted in-flight call/tool pauses with an unknown outcome and blocks resume. Known safe checkpoints can resume; cancellation settles once. Voice request IDs prevent duplicate billing, and failures release reservations. A fixed-duration preview lease limits compute independently of model calls. Deleting a project/account attempts to remove its sandboxes, and live tests remove their synthetic fixtures.

Publication requires an explicit owner review of the exact current validated revision, an active subscription, enabled paid resources and configured hosting. The API checks the reviewed revision under lock before enqueue, and the worker checks it again before deployment. Configuration failure is rejected before marking an external request dispatched. Readiness does not expose provider credentials or perform a public upload.

## Remaining deployment work

This is a locally tested set of boundaries, not a completed penetration test or a guarantee that arbitrary generated apps contain no vulnerabilities. Production still needs HTTPS, a real email provider, cloud API/worker/database hosting, reliable multi-worker coordination, monitored logs, backups/restore drills, dedicated service keys/spend allocations, infrastructure isolation review and security testing of generated application behavior. Infrastructure/Stripe adapters without configured credentials are not presented as live verified services.

Agent questions reject credentials, are bounded in size/count, and use a composite project/job foreign key. Only the original requester can answer; workspace permissions and the source revision are rechecked. Dependent writes are blocked server-side until the answer exists. Pausing and answering share a job-row lock so the next worker cannot start before sandbox pause, checkpoint and compute accounting are committed. Explicit worker execution tokens continue fencing previous workers.
