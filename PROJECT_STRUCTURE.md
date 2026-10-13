# Project and code organization

There are two deployment repositories: [GotchaSaaS-Frontend](https://github.com/aashrun/GotchaSaaS-Frontend) contains the React builder interface; [GotchaSaaS-Backend](https://github.com/aashrun/GotchaSaaS-Backend) contains the Express control plane and worker. Each has its own package manifest, lockfile and standalone setup instructions. The local integration workspace still uses `frontend/` and `backend/` npm workspaces so both servers can run together. The original Desktop boilerplate repositories have not been edited.

Publishing checkouts live under ignored `.local/repositories/`. `python3 scripts/export-repositories.py` prepares their source from this integration workspace; Git commits and pushes are performed separately after review and checks. Secrets, dependencies, generated builds and local state are excluded. The frontend export includes trusted template source synced from `backend/Templates/`; its build compiles the initial preview assets without requiring the backend checkout.

- `backend/Agent/`: model routing, Responses calls, typed tools, durable loop, research, memory and GitHub actions.
- `backend/Providers/`: OpenRouter, voice transcription, E2B, database and deployment adapters.
- `backend/Services/`: authentication, projects, folders, credit ledger, jobs, preview leases and infrastructure operations.
- `backend/Models/` and `Migrations/`: persistent control-plane data. Use migrations; never synchronize/destructively recreate production tables.
- `backend/Templates/`: trusted source scaffolds, including the Express/PostgreSQL app starter.
- `backend/Sandbox/`: pinned dependency manifest and trusted browser/runtime drivers for the E2B image.
- `frontend/src/components/VoiceInput.jsx`: microphone, actual waveform, stop/cancel and transcript insertion.
- `frontend/src/components/AgentTools.jsx`: project memory, evidence, connections and owner-reviewed external actions.
- `frontend/src/pages/Dashboard.jsx` and `Studio.jsx`: project home and chat/preview/editor.

Workspace folders are optional groups of projects, similar to [Lovable's project folders](https://docs.lovable.dev/introduction/project-folders). Deleting one preserves its projects. They are useful when someone has several clients or apps, so they remain available in the collapsible sidebar. They do not create directories inside a generated app.

A generated frontend app has `src/` for components/styles and protected package, entry and build configuration. A full-stack app additionally has editable `server/index.js`, protected `src/lib/runtime.ts`, and protected `tests/runtime.test.js`. The preview server and PostgreSQL live only inside E2B. The ZIP includes source, not the preview database or platform credentials. Exported apps require their own application database URL and deployment environment.

Preview data persists while its E2B sandbox is paused/resumed. A new build currently starts a fresh preview database; exported/production apps need their own durable database. Source checkpoint restore does not restore database records.
