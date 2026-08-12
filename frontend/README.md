# TVET e-Gateway — Frontend

A single responsive React web app serving all four role-based interfaces (Trainee, Trainer, Exam
Controller, Admin) described in [`../docs/ui-ux-flow.md`](../docs/ui-ux-flow.md), against the
NestJS backend in [`../backend`](../backend).

One app instead of the doc's Flutter-mobile + React-web split (`architecture.md` §2): the brief
for this pass was a web frontend, and a single React SPA with role-gated routing covers all four
roles without the added complexity of a second toolchain. Revisit that split if/when a real
offline-first mobile client is actually being built.

## Stack

Vite + React + TypeScript, React Router (role-gated routes), TanStack Query (data fetching,
caching, loading/error state), Tailwind CSS (styling, role color themes), Axios (API client with
auth-token attach + one-shot refresh-on-401).

## Run it

Requires the backend already running (see [`../backend/README.md`](../backend/README.md)) at
`http://localhost:3000/api`.

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Opens on `http://localhost:5173`. Log in with any of the seeded accounts (see backend README):
`admin` / `trainer1` / `trainee1` / `examcontroller1`, all with password `Passw0rd!`.

## What's real vs. what's a documented simplification

Every flow in this app calls the real backend — nothing here is mocked. It was built by reading
the actual controller/DTO code (not just the design docs) and was driven end-to-end through a
real browser against the live backend during development, which caught and fixed a real backend
bug along the way (`BigInt` fields had no JSON serialization — see `backend/src/main.ts`).

A few places adapt to gaps in the current API rather than pretending they don't exist:

- **No per-trainee "my modules" filter exists yet** (`GET /modules` returns every module
  institution-wide). `ModulesBrowse`/`TrainerModules` show the full list rather than claiming
  personalized enrollment the API can't actually provide — reasonable for a single-pilot-department
  deployment (see `docs/PRD.md`'s pilot scope).
- **Assessments aren't filtered by approval status server-side** (`GET /assessments?moduleId=`
  returns drafts too). The Trainee's `ModuleDetail` page applies a client-side filter to only show
  `status: 'approved'` assessments, since assignments shouldn't be visible to trainees before an
  Exam Controller approves the parent assessment (matches `docs/architecture.md`'s approval-gate
  design even though the backend doesn't enforce the read-side of it).
- **No object storage is wired up** (`backend/README.md` "What's stubbed"). `AssignmentDetail`'s
  submission form and `TrainerResources`'s upload form both compute a real SHA-256 hash of the
  picked file client-side (`crypto.subtle.digest`, matching `architecture.md` §6) and submit that
  real metadata — there's just no server-side target for the actual bytes yet, so `fileUrl` is a
  placeholder (`local://<filename>`) rather than a real object-storage reference.
- **`POST /results/compute` had no UI entry point in the backend's own design** — it's a
  trainer/exam-controller/admin action with no natural home in the four dashboards' nav. It's
  exposed as a "Compute module result" button on the Trainer's Submission Review page once a
  submission is graded (`pages/trainer/SubmissionReview.tsx`), since that's the natural point in
  the workflow where a trainer would trigger it.
- **Voice-note feedback** (`ui-ux-flow.md` mentions it as an input option) isn't built — only text
  comments, since there's no audio recording/storage backend to submit to.
- **Bilingual (EN/DZ) UI toggle** isn't built. `ui-ux-flow.md` §0.2 calls for one, but there's no
  translated content anywhere in the seed data or backend to actually switch to — a toggle with
  nothing behind it would be a non-functional stub, which contradicts the "don't just generate code
  and assume it works" brief this was built under. Worth adding once real bilingual content exists.

## Structure

```
src/
  lib/          — API client (axios + auth/refresh interceptor), typed endpoint wrappers, types
  context/       — AuthContext (login, active-role switching, session restore)
  components/    — ProtectedRoute, Layout (role-themed nav), NotificationBell, shared feedback UI
  pages/
    trainee/     trainer/     examController/     admin/     shared/
```
