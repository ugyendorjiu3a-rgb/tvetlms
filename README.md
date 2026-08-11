# TVET e-Gateway

Learning Management System for TTIs and IZCs under the Ministry of Education & Skills Development
/ Department of Workforce Planning & Skills Development.

## Repository layout

- **[`docs/`](docs/)** — the four planning documents this build is derived from, in the order they
  were written and the order later docs depend on earlier ones:
  1. [`PRD.md`](docs/PRD.md) — product requirements
  2. [`architecture.md`](docs/architecture.md) — system architecture (three-tier offline-first design)
  3. [`database-design.md`](docs/database-design.md) — database/entity design
  4. [`ui-ux-flow.md`](docs/ui-ux-flow.md) — UI/UX flow for all four role dashboards
- **[`backend/`](backend/)** — NestJS + Prisma implementation of the Central Cloud / Institution
  Edge Node API described in `docs/architecture.md`. **Start here**: [`backend/README.md`](backend/README.md)
  has the exact steps to get it running on localhost, including what's implemented vs. stubbed.
  Currently runs on **SQLite** so it needs nothing installed beyond Node.js — no Docker, no
  database server.
- **`docker-compose.yml`** — local Postgres/MinIO/Redis, for later — not needed for the current
  SQLite-based local run. See `backend/README.md`'s "Moving to the full stack" section.

## What's built vs. what's next

The backend implements the full data model and the core academic workflow end-to-end: account
provisioning → module/assessment/assignment setup → trainee submission → trainer grading →
result computation → Exam Controller certification approval, plus resources, notifications, audit
logging, and the offline sync-conflict handling described in the architecture doc.

Not yet built: the Trainer/Trainee offline mobile client and the Admin/Exam Controller web portal
(both described in `docs/ui-ux-flow.md` and `docs/architecture.md` §2), MinIO file upload wiring,
and push/SMS notification delivery. See `backend/README.md`'s "What's implemented vs. stubbed"
section for the full list.

This code has not been run yet. Follow `backend/README.md`'s steps (`npm install` → `npx prisma
migrate dev` → `npm run prisma:seed` → `npm run start:dev`) to install, migrate, seed, and run it;
if anything fails to compile, the error message should point directly at the fix.
