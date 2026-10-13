# Real tic-tac-toe build verification

Verified 13 October 2026 through the operator's existing Gotcha account. The app asked one audience/purpose question; the answer selected personal/friends play on one device, without login, a database or online multiplayer. All application source was generated through OpenRouter GPT-6 Luna inside the SaaS builder. No game implementation was manually inserted by the coding agent.

Three failed attempts exposed call-budget exhaustion, external-font/navigation waits, and guessed browser labels. Harness fixes added bounded tool selection with forced completion after validation, compiled browser checks, a platform-owned game acceptance protocol, and safe reuse of failed candidate source with fresh validation. The successful attempt reused the saved candidate and completed in six model calls. Failed attempts remain visible in chat; this was not a successful one-shot build.

The final project passed TypeScript, production build, and 32 real cloud-browser assertions: all eight winning lines for each player, draw, occupied-cell protection, no moves after a win, restart before/after game over, keyboard Enter play, and mobile visibility/overflow. A winning round and a draw were also played manually in the embedded app preview, including restart and occupied-cell protection. The exact downloaded HTML passed the same 32 assertions with Chrome offline. The source ZIP and runnable HTML were retained locally; customer projects, credentials and test screenshots are excluded from platform Git exports.

| Measurement                                  | Result                                               |
| -------------------------------------------- | ---------------------------------------------------- |
| OpenRouter cost across all four attempts     | $0.0178113771, provider-reported                     |
| E2B elapsed compute across all four attempts | $0.018284908, estimated rather than an invoice       |
| Total model calls                            | 37; final successful attempt used 6                  |
| Customer builder charge                      | 6 ledger credits; failed platform attempts charged 0 |
| Account after settlement                     | 94 available credits, 0 reserved                     |
| Source revision                              | 1, validated and saved                               |

Failed provider/compute spend still counts against the platform's funded budget. No additional paid generation was used for export or regression verification.

Public deployment was not performed. The UI correctly reports missing Cloudflare token/account/dispatch namespace/public domain, disabled paid-resource creation, and no active subscription. Its review/explicit approval path is browser-tested with a mocked provider; no real Cloudflare upload is claimed. The current adapter serves validated static frontend artifacts, not generated Express/PostgreSQL applications.

This demonstrates a working basic local game and a repaired build loop. It does not establish arbitrary-software reliability or production readiness. The API/worker/platform database are still local; persistent production app runtimes/databases, actual hosting verification, broader app/security evaluations, monitoring, backups and live commercial integrations remain required. A minor generated accessibility label in the draw badge also needs polish before claiming a complete accessibility review.
