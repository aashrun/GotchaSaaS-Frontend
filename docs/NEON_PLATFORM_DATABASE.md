# Neon platform database

Gotcha SaaS now stores its own accounts, password hashes, sessions, organizations, projects, chats, job activity, source versions, models and credit ledger in the owner's Neon PostgreSQL database through Sequelize v6 and the pg driver. This is separate from databases built for customer apps inside E2B or through connectors. Neon is PostgreSQL; a MySQL driver would not work, and there is no MySQLize dependency.

The database URL lives only in the ignored backend .env. Neon TLS always verifies the certificate and enables channel binding, even if the URL contains a conflicting SSL mode. Application traffic uses the supplied pooler. Sequelize prefixes each query with its public search path in the same request to avoid session state assumptions across PgBouncer transactions. The migration CLI derives the direct Neon endpoint for schema migrations.

On 2026-10-14, the source's 32 tables were copied after confirming zero active jobs. Row counts and canonical row fingerprints matched before cutover: 3 users, 4 projects, 8 messages, 37 model usage records and all related histories, settings and credit balances. Password verification and HTTP sign-in were checked after migration. Fifteen concurrent reads and a rolled-back write passed on Neon. The private rollback dump stays in .local/gotcha-before-neon.dump with restricted file permissions. The old app database is inactive; it is retained as a recovery copy. No local application database is needed to run Gotcha SaaS.

The separate disposable local gotcha_saas_test and gotcha_saas_browser_test databases support destructive automated fixtures; tests never reset the Neon database. Set DATABASE_SSL=false explicitly for local test databases. Production hosting of the API and worker, Neon backup retention/restore drills, least-privilege runtime database credentials and provider invoice reconciliation remain launch work.

References: [Neon pooling](https://neon.com/docs/connect/connection-pooling), [Sequelize PostgreSQL](https://sequelize.org/docs/v6/other-topics/dialect-specific-things/).
