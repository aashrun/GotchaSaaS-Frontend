# Platform database schema

Sequelize models with UUID primary keys, timestamps, PostgreSQL JSONB for structured context/artifacts, foreign keys, unique constraints and ownership indexes. The platform database must be its own Neon project.

| Tables                              | Purpose                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| Users, Sessions, AuthTokens         | Accounts; bcrypt password hashes; hashed opaque session/auth tokens; revocation and expiration |
| Organizations, OrganizationMembers  | Workspace ownership and membership roles                                                       |
| Folders                             | Workspace-owned organization of projects, unique case-insensitive names and editor permissions |
| Projects, ProjectFiles              | Tenant-owned source, file protection, optimistic source revisions, structured specifications   |
| ProjectVersions                     | Immutable recovery/checkpoint/release files and project memory; database data excluded         |
| Messages                            | Project conversation records linked to jobs                                                    |
| AIModels                            | Administrator-approved model IDs and configurable rates                                        |
| AIJobs, JobEvents                   | Durable generation state, request idempotency, heartbeat, replayable SSE events                |
| TestRuns                            | Executed checks and logs, explicitly untested requirements                                     |
| CreditAccounts, CreditLedgerEntries | Locked credit balances/reservations, immutable grants/debits, unique settlement keys           |
| AIUsageRecords                      | Measured token counts by job/attempt, configured-rate cost estimates                           |
| ResourceOperations                  | Durable paid-operation reservation, external resource identifiers and partial/unknown outcomes |
| DatabaseConnections                 | Separate customer provider resources; encrypted connection URI; ownership/status               |
| Deployments                         | Release version, provider upload, URL, logs, HTTP smoke-test status                            |
| Subscriptions, BillingEvents        | Stripe identity/status and idempotent verified webhook processing                              |
| AuditLogs                           | Sensitive actions and bounded metadata without secrets                                         |

`001-control-plane.js` reads a frozen schema definition, rather than the current mutable model structure. A transaction holds an advisory migration lock, executes the migration, and records it in SequelizeMeta. Down/up was verified in a dedicated empty database. Do not roll back a production migration casually: source rollback does not roll back customer migrations or live data.

CreditAccounts has a database constraint requiring `balance >= reserved >= 0`. Unique keys prevent duplicate file paths, membership records, job requests, reservations/settlements, usage attempts, billing events, and resource operations.

Customer databases are not tables in this database. No control-plane connection URI is ever injected into customer source or sandboxes. Provider-created customer credentials are encrypted at rest and excluded from API responses. Runtime least-privilege identities/connectivity remain an explicit acceptance blocker.

Shared checkpoint actor references use SET NULL when a contributor deletes their account. The project owner retains the checkpoint source. Account/project deletion serializes against memberships, projects and credit creation, blocks unresolved paid resources, and clears historical deployment records only after external cleanup. A nullable-column guard handles earlier local schemas.

`005-project-folders.js` adds the 23rd platform table, Folders, and nullable `Projects.folderId`. A composite foreign key prevents assigning a folder from another organization even outside the HTTP API. Folder deletion clears only the folder assignment; it preserves projects, organization ownership, source, versions and chat. There is a 50-folder workspace quota. Existing projects migrate to an unfiled state. Down/up and existing-project/source preservation were verified in `nebula_migration_test`.

## Agent and voice extensions

Migration 006 adds ProjectMemories (project/key unique, revision/provenance), AgentSteps (job/sequence unique), AgentArtifacts (binary browser evidence), AgentConnections (encrypted project credentials), AgentActions (reviewed external operations), and VoiceRequests (duration/reservation/charge checks). Artifact/action job/project composite foreign keys prevent mismatched job ownership. Migration 007 allows manual external actions without an AI job. Migration 008 adds RuntimeLeases with a unique project, actor, sandbox ID, expiration and fixed lease charge. These records cascade with their owning project/user as appropriate; memory actors can become anonymous without losing project history.

## Agent questions (migration 009)

`AgentQuestions` stores project/job/requester identity, a bounded title/question/options list, blocking status, dependent source-path prefixes, pending/answered state and an immutable answer. Its composite foreign key prevents cross-project job associations. Job locks serialize checkpoint pause, compute accounting, answering and safe requeue. Questions are limited to three pending and six total per run; credentials are rejected.
