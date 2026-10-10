# CrowdMind backend

Extends the teammate API with reports, duplicate detection/merge, notifications, password recovery, safe profile updates and enforced workflow.

## Run locally

In backend: npm ci, then npm run dev:local.
In another terminal, frontend: npm run dev:local.
Open http://localhost:5174/. API is http://localhost:5001.

Local runner ignores external DATABASE_URL, binds loopback, persists its own .local-db and writes reset emails to .local-mail. These folders and generated secret are ignored by Git.
Local-only demo accounts: admin@crowdmind.local and member@crowdmind.local.
Password: CrowdMindLocal2026!
Existing demo profiles are not overwritten on restart. Demo accounts are never created by npm start or in the hosted database.

PGlite runs embedded PostgreSQL through a socket server for Prisma. Local/tests use one connection, not a production concurrency/load benchmark.
[Socket documentation](https://github.com/electric-sql/pglite/tree/main/packages/pglite-socket).

## Verify

npm test uses a fresh in-memory database, all migrations, HTTP/Express and real Prisma queries. It never uses an external DATABASE_URL. Temporary mail/database files are removed. Cases cover permissions, last Admin, workflow, voting, merge retention, reports, notifications, reset expiry/reuse, session revocation and rate limits.

## Deploy to PostgreSQL

The old schema had no migration history. 0001_baseline represents that schema; 0002_community adds fields/tables and changes default status while preserving existing statuses.
0003_merge_alias_cleanup ensures target deletion removes old merge aliases.

For an existing database: back up and compare the real schema/history with the baseline first. If it matches, run:
- npx prisma migrate resolve --applied 0001_baseline
- npm run db:migrate
- npx prisma generate
- npm start

For an empty database, run db:migrate without marking the baseline applied. Never use migrate reset on shared data.
[Prisma baseline instructions](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining).

Set DATABASE_URL and a long random JWT_SECRET; fallback secret removed.
Set FRONTEND_URL and NODE_ENV=production. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM for real reset email delivery. Port465 uses TLS;587 uses STARTTLS. File-mail mode is disabled in production.
[SMTP configuration](https://nodemailer.com/smtp).

Deploy API/migrations before frontend. Local runner does not modify Render. Normal PostgreSQL deployment and real SMTP still need verification.

## Choices

Profile fields are allowlisted; roles are verified in DB. Logout/password change/reset revoke all sessions.
Last Admin cannot be deleted/demoted. Ideas start Under Review and advance to Planned then Done.
Merge keeps target user's vote on conflicts; comments/tags transfer; source becomes alias.
Detection uses explainable word overlap without a paid AI service.
Hiding preserves content/reports; no unhide operation is included.
Rate limiting is per-IP/single-process; replicas need shared storage and network-appropriate proxy configuration.
