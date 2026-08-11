# TVET e-Gateway — Backend

NestJS + Prisma implementation of the Central Cloud / Institution Edge Node backend described in
[`../docs/architecture.md`](../docs/architecture.md).

## Local dev mode: Node.js only, nothing else to install

This currently runs on **SQLite** (a plain file, `prisma/dev.db`) instead of the PostgreSQL target
from `../docs/database-design.md`, specifically so you can run the whole thing with just Node.js —
no Docker, no database server, no MinIO, no Redis. See the header comment in
`prisma/schema.prisma` for exactly what's different in SQLite mode and why it's safe for local dev.
`docker-compose.yml` in the repo root is there for when you're ready to move to the real stack (see
"Moving to the full stack" at the bottom of this file) — you don't need it yet.

This code was written without a Node.js runtime available in the authoring environment, so it has
**not been run or compiled yet**. If anything fails to compile, it's most likely a small mismatch
(import path, Prisma type name) that a normal `tsc`/`nest build` error message will point at
directly.

## 1. Prerequisite

- **Node.js 20 LTS or newer** and npm — https://nodejs.org (that's it — no other installs needed
  for this local mode)

## 2. Install and configure the backend

```bash
cd backend
npm install
cp .env.example .env
```

The defaults in `.env.example` already point at a local SQLite file — no edits needed to get
running. Change `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` before this ever runs anywhere shared.

> If `npm install` fails specifically on `argon2` (it's a native module), you likely need the
> platform's C++ build tools (on Windows, "Desktop development with C++" via Visual Studio Build
> Tools). Prebuilt binaries cover most setups, so this usually isn't needed.

## 3. Create the database schema

```bash
npx prisma migrate dev --name init
```

This reads `prisma/schema.prisma` and creates `prisma/dev.db` with every table from
[`../docs/database-design.md`](../docs/database-design.md) (translated to SQLite — see the schema
file's header comment for the specific differences: `Decimal` → `Float`, array columns → JSON
strings, no Postgres-only `CHECK` constraints).

## 4. Seed demo data

```bash
npm run prisma:seed
```

Creates the 4 roles, one pilot institution/trade/module, and one login per role. The script prints
a table of login IDs — all four seeded accounts share the password `Passw0rd!` (dev-only, see
`prisma/seed/seed.ts`).

## 5. Run the API

```bash
npm run start:dev
```

The API listens on `http://localhost:3000/api` (prefix set in `src/main.ts`).

## 6. Try it

```bash
# Log in as the seeded Admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loginId":"admin","password":"Passw0rd!"}'

# Use the returned accessToken as a Bearer token, e.g.:
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <accessToken>"
```

Try the other seeded logins (`trainer1`, `trainee1`, `examcontroller1`, same password) against the
role-gated endpoints in each module's controller to exercise the RBAC rules. `npx prisma studio`
is also useful here — it opens a local GUI on the SQLite file so you can see data change as you
call the API.

## What's implemented vs. stubbed

Implemented end-to-end (matching the four design docs in `../docs/`):

- Auth (login/refresh, argon2 hashing, JWT, server-side RBAC)
- User provisioning (Admin-only, no self-registration) + the two-step Eradicate Trainee workflow
- Institutions, Trades, Modules, Classes, Module/Class enrollment
- Assessment (Trainer proposes → Exam Controller approves) → Assignment → Submission → Grading
  (auto + manual, with optimistic-concurrency conflict detection) → Result computation →
  Certification (Exam Controller approval, blocked by open sync conflicts)
- Resources (metadata, search, access/download logging)
- Notifications (in-app, fan-out to recipients)
- Audit log (append-only, written explicitly at every sensitive mutation)
- Sync: device registration + conflict listing/resolution for grades

Deliberately **not** built in this pass (flagged here rather than silently left out):

- **File upload wiring**: `resources.fileUrl` and `submission_files.fileUrl` are stored as plain
  strings; no code actually uploads or serves file bytes yet (no MinIO, no local disk storage
  either). This doesn't block anything above — the API tracks file metadata/hashes regardless of
  where the bytes eventually live.
- **Push/SMS notification delivery**: `channelHint` is recorded on every notification, but only the
  in-app inbox (`GET /notifications`) is actually implemented.
- **The Trainer/Trainee offline mobile client and the Admin/Exam Controller web portal** — this
  repo is the backend only. See `docs/architecture.md` §2 for the intended Flutter + React split.
- **Admin/Exam Controller "profile" data**: `database-design.md` only defines profile tables for
  Trainees and Trainers — Admin/Exam Controller accounts currently have no name field anywhere in
  the schema (see the comment in `src/modules/users/dto/create-staff.dto.ts`).

## Moving to the full Postgres/MinIO/Redis stack

When you're ready to add that external software back in (matching `docs/architecture.md`'s actual
target stack, not just this local dev shortcut):

1. `docker compose up -d` from the repo root (starts Postgres, MinIO, Redis — already configured
   in `docker-compose.yml`).
2. Restore `prisma/schema.prisma`'s `datasource` block to `provider = "postgresql"` and add back
   the `@db.Uuid` / `@db.Decimal(x,y)` / `@db.Date` native type attributes and `String[]` array
   fields — either from git history (this file was SQLite-ified in one commit) or by re-reading
   `../docs/database-design.md` §3, which documents the original Postgres-native design directly.
   `Decimal` fields also need their corresponding code call sites updated back from plain `number`
   handling to `Prisma.Decimal`/`.toNumber()` (see `src/modules/results/results.service.ts`).
3. Update `.env`'s `DATABASE_URL` to the Postgres connection string (commented out in
   `.env.example`).
4. Re-run `npx prisma migrate dev`.
5. Wire the `minio` client (already in `package.json`) into `resources.service.ts` /
   `submissions.service.ts` for real file upload/download instead of the current metadata-only
   handling.
