# Project and code organization

There are two deployment repositories: [GotchaSaaS-Frontend](https://github.com/aashrun/GotchaSaaS-Frontend) contains the React builder interface; [GotchaSaaS-Backend](https://github.com/aashrun/GotchaSaaS-Backend) contains the Express control plane and worker. Each has its own package manifest, lockfile and standalone setup instructions. The local integration workspace still uses `GotchaSaaS-Frontend/` and `GotchaSaaS-Backend/` npm workspaces so both servers can run together. The original Desktop boilerplate repositories have not been edited.

Publishing checkouts live under ignored `.local/repositories/`. `python3 GotchaSaaS-Backend/scripts/export-repositories.py` prepares their source from this integration workspace; Git commits and pushes are performed separately after review and checks. Secrets, dependencies, generated builds and local state are excluded. The frontend export includes trusted template source synced from `GotchaSaaS-Backend/Templates/`; its build compiles the initial preview assets without requiring the backend checkout.

- `GotchaSaaS-Backend/Agent/`: model routing, Responses calls, typed tools, durable loop, research, memory and GitHub actions.
- `GotchaSaaS-Backend/Providers/`: OpenRouter, voice transcription, E2B, database and deployment adapters.
- `GotchaSaaS-Backend/Services/`: authentication, projects, folders, credit ledger, jobs, preview leases and infrastructure operations.
- `GotchaSaaS-Backend/Models/` and `Migrations/`: persistent control-plane data. Use migrations; never synchronize/destructively recreate production tables.
- `GotchaSaaS-Backend/Build/`: application target/language planning, protected mobile/desktop/PWA/Python scaffolds and isolated PWA preview origin.
- `GotchaSaaS-Backend/Templates/`: trusted source scaffolds, including the Express/PostgreSQL app starter.
- `GotchaSaaS-Backend/Sandbox/`: pinned dependency manifest and trusted browser/runtime drivers for the E2B image.
- `GotchaSaaS-Frontend/src/components/VoiceInput.jsx`: microphone, actual waveform, stop/cancel and transcript insertion.
- `GotchaSaaS-Frontend/src/components/AgentTools.jsx`: project memory, evidence, connections and owner-reviewed external actions.
- `GotchaSaaS-Frontend/src/pages/Dashboard.jsx`: New Project greeting/composer and the separate project library.
- `GotchaSaaS-Frontend/src/components/ProjectChat.jsx`: ongoing chat, real job activity, agent questions and verified app preview in the same workspace.
- `GotchaSaaS-Frontend/src/components/ProjectTools.jsx`: optional code, checkpoints, checks and GitHub/memory tools.

The dedicated folder section and folder controls have been removed from the interface. A founder can use Projects, Recents and Search directly. Folders were optional project groups; they never affected the agent, app code or hosting. Existing folder records and backend permissions remain for data compatibility, and all projects appear in the unfiltered library.

A generated frontend app has `src/` for components/styles and protected package, entry and build configuration. A full-stack app additionally has editable `server/index.js`, protected `src/lib/runtime.ts`, and protected `tests/runtime.test.js`. The preview server and PostgreSQL live only inside E2B. The ZIP includes source, not the preview database or platform credentials. Exported apps require their own application database URL and deployment environment.

Preview data persists while its E2B sandbox is paused/resumed. A new build currently starts a fresh preview database; exported/production apps need their own durable database. Source checkpoint restore does not restore database records.

## From idea to app

The sidebar stays mounted while the New Project composer becomes a normal conversation on a neutral dark/light gray surface. User bubbles have no sender label and stay compact; both themes use readable text and borderless translucent composers. Sending a prompt saves it, estimates the funded maximum, and queues one agent build; it reserves available credits automatically, subject to server spending/plan limits. Verification, missing configuration and insufficient credits appear in the conversation, with the prompt preserved for retry. There is no credit-approval workbench or simulated template preview.

Actual file/research/check/browser actions produce durable activity updates. A concise model-written progress summary may accompany those actions; private model reasoning is not displayed. Once current source has passed build and browser checks, its preview opens beside the chat. The preview is an isolated browser frame. E2B is the cloud computer that builds and tests the app, not the browser UI. Full-stack interactions pass through the authenticated API broker; an explicit five-minute backend preview lease has its own credit charge.

Questions live in the conversation and open a small modal. Blocking questions pause a saved sandbox/checkpoint and stop further tools. Non-blocking questions declare source paths whose writes are deferred; independent edits and research can continue. Completion waits for all answers. Answers are authenticated, limited to the job requester, secret checked, idempotent and serialized with the pause transaction. Only known provider/tool outcomes can resume.

A founder can stay entirely in chat. Generated source directories are maintained by the agent. GitHub is optional. Use Project tools → Memory & GitHub to connect a repository and review a prepared draft pull request; publishing still requires the owner's explicit approval. Our platform source is in the two GotchaSaaS repositories. That does not automatically create a repository for every customer app.

References: [Codex browser beside chat](https://learn.chatgpt.com/docs/browser?surface=app), [Lovable optional GitHub sync](https://docs.lovable.dev/integrations/github), [E2B cloud sandboxes](https://docs.e2b.dev/). These references do not establish that Codex or Lovable uses E2B internally.

The root contains only the two application directories, npm coordination files and README. Browser tests/configuration and asset provenance live in GotchaSaaS-Frontend; shared documentation lives in GotchaSaaS-Backend/docs. Generated test output is stored under the frontend’s hidden .local directory. Original unused source PNGs and obsolete test output were moved to Trash; runtime JPEG images are retained.

Target-specific source adds `app.json`/`eas.json` and React Native components for mobile, protected `desktop/` and a manual OS package workflow for Electron, or `public/manifest.webmanifest`/`public/sw.js` for PWAs. Python APIs use `server/app.py` and pinned requirements. Framework questions appear only for missing explicit preferences; unsupported choices are retained without silent substitution. See [MULTI_TARGET_STRATEGY.md](MULTI_TARGET_STRATEGY.md).
