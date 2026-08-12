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
  Edge Node API described in `docs/architecture.md`. [`backend/README.md`](backend/README.md) has
  the exact steps to get it running on localhost, including what's implemented vs. stubbed.
  Currently runs on **SQLite** so it needs nothing installed beyond Node.js — no Docker, no
  database server.
- **[`frontend/`](frontend/)** — a single responsive React web app covering all four role-based
  interfaces (Trainee, Trainer, Exam Controller, Admin) from `docs/ui-ux-flow.md`, built against
  the backend's real API. [`frontend/README.md`](frontend/README.md) has run steps and a list of
  where it adapts to current backend gaps (e.g. no object storage wired up yet) rather than faking
  them.
- **`docker-compose.yml`** — local Postgres/MinIO/Redis, for later — not needed for the current
  SQLite-based local run. See `backend/README.md`'s "Moving to the full stack" section.

## Running it locally

1. Start the backend first: `cd backend && npm install && npx prisma migrate dev && npm run
   prisma:seed && npm run start:dev` (API on `http://localhost:3000/api`).
2. Then the frontend: `cd frontend && npm install && cp .env.example .env.local && npm run dev`
   (app on `http://localhost:5173`).
3. Log in with any seeded account: `admin` / `trainer1` / `trainee1` / `examcontroller1`, all with
   password `Passw0rd!`.

Both READMEs have more detail — `backend/README.md`'s "What's implemented vs. stubbed" and
`frontend/README.md`'s "What's real vs. what's a documented simplification" are the places to
check before assuming a given feature is fully wired up end to end.

## What's built vs. what's next

The backend implements the full data model and the core academic workflow end-to-end: account
provisioning → module/assessment/assignment setup → trainee submission → trainer grading →
result computation → Exam Controller certification approval, plus resources, notifications, audit
logging, and the offline sync-conflict handling described in the architecture doc. The frontend
covers all four role dashboards against that same live API — this was driven through a real
browser during development (not just written and assumed to work), which caught and fixed a real
backend bug (BigInt JSON serialization) along the way.

Not yet built: the offline-first mobile client architecture.md describes for Trainer/Trainee
(this pass built one responsive web app for all four roles instead — see frontend/README.md for
why), MinIO file upload wiring (uploads are hashed and tracked with real metadata, just no byte
storage target yet), push/SMS notification delivery, and a bilingual EN/DZ UI toggle (no
translated content exists yet to toggle to).
