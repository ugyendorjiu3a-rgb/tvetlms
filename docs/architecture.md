# System Architecture Document
## TVET e-Gateway — Learning Management System

**Companion to:** [PRD.md](./PRD.md)
**Status:** Draft for review
**Design priorities (in order):** offline reliability in low-connectivity TTIs/IZCs → data integrity for grading/certification → operability by a small government IT team → scale to ~1,500 users / ~25 TB.

This document makes concrete architectural decisions where the PRD left open questions (OQ1, OQ2, OQ10). Each such decision is called out as an **[Architecture Decision]** and should be confirmed with the Ministry, not treated as final.

---

## 1. High-Level Architecture Overview

Two structural choices shape everything else:

**[Architecture Decision — resolves PRD OQ10]** Given intermittent connectivity is the norm rather than the exception at TTIs/IZCs, the architecture uses a **three-tier topology** instead of a simple client↔cloud model:

```
Tier 1: Client devices (Trainer/Trainee apps, on-campus, may be fully offline)
Tier 2: Institution Edge Node (one lightweight server per TTI/IZC campus)
Tier 3: Central Cloud (national, hosts system of record, dashboards, Ministry reporting)
```

- **Tier 1 ↔ Tier 2** happens over the campus LAN/Wi-Fi — always available even when the campus has no internet.
- **Tier 2 ↔ Tier 3** syncs opportunistically whenever the campus has internet (continuous if available, batched/nightly if not).

This directly serves the "offline-first" and "digitize one department at a single TTI" pilot requirements: the pilot can run entirely on Tier 1 + Tier 2 before Tier 3 (central cloud, multi-institution rollup) is even needed.

**[Architecture Decision]** At the application layer, the backend is a **modular monolith**, not microservices. At ~1,500 users and a small government ops team, microservices add operational cost (service discovery, distributed tracing, multiple deploy pipelines) without a corresponding benefit. Internal module boundaries (Identity, Modules/Resources, Assessment/Grading, Notifications, Sync, AI Gateway, Audit) are kept strict via internal APIs, so the system *could* be split later if scale demands it — but it ships and operates as one deployable unit per tier.

```
                                   ┌─────────────────────────────┐
                                   │      CENTRAL CLOUD (Tier 3)  │
                                   │  National system of record  │
                                   │                              │
                                   │  ┌────────────────────────┐  │
                                   │  │   API Gateway / Auth   │  │
                                   │  └───────────┬────────────┘  │
                                   │  ┌───────────▼────────────┐  │
                                   │  │   Core API (modular    │  │
                                   │  │   monolith):           │  │
                                   │  │  - Identity/RBAC       │  │
                                   │  │  - Modules & Resources │  │
                                   │  │  - Assessment/Grading  │  │
                                   │  │  - Certification       │  │
                                   │  │  - Notifications       │  │
                                   │  │  - Sync Orchestrator   │  │
                                   │  │  - Audit Log           │  │
                                   │  └───┬────────┬───────┬───┘  │
                                   │      │        │       │       │
                                   │  ┌───▼──┐ ┌───▼───┐ ┌─▼────┐ │
                                   │  │Postgres│ │ MinIO │ │Redis/│ │
                                   │  │(primary│ │(object│ │Queue │ │
                                   │  │+ read  │ │storage│ │      │ │
                                   │  │replica)│ │25 TB) │ │      │ │
                                   │  └────────┘ └───────┘ └──────┘ │
                                   │  ┌────────────────────────┐  │
                                   │  │  AI Gateway (isolated) │  │
                                   │  └────────────────────────┘  │
                                   │  ┌────────────────────────┐  │
                                   │  │ Ministry/Admin Reporting│ │
                                   │  └────────────────────────┘  │
                                   └───────────────┬──────────────┘
                                                    │ opportunistic sync
                                                    │ (internet, when available)
                       ┌────────────────────────────┼────────────────────────────┐
                       │                             │                             │
             ┌─────────▼─────────┐         ┌─────────▼─────────┐        ┌─────────▼─────────┐
             │ INSTITUTION EDGE   │         │ INSTITUTION EDGE   │        │ INSTITUTION EDGE   │
             │ NODE — TTI A       │         │ NODE — TTI B       │  ...   │ NODE — IZC C        │
             │ (Tier 2)           │         │ (Tier 2)           │        │ (Tier 2)            │
             │ - Local Postgres   │         │                    │        │                     │
             │ - Local file cache │         │                    │        │                     │
             │ - Sync Agent       │         │                    │        │                     │
             └─────────┬──────────┘         └────────────────────┘        └─────────────────────┘
                        │ campus LAN / Wi-Fi (works even with no internet)
        ┌───────────────┼────────────────────┐
        │                │                    │
 ┌──────▼──────┐  ┌──────▼──────┐     ┌───────▼──────┐
 │ Trainee app │  │ Trainer app │     │ Admin/Exam    │
 │ (offline-   │  │ (offline-   │     │ Controller    │
 │  capable)   │  │  capable)   │     │ web portal    │
 └─────────────┘  └─────────────┘     └───────────────┘
```

---

## 2. Frontend Architecture

Two client types, because Trainer/Trainee usage patterns differ sharply from Admin/Exam Controller usage:

- **Trainer & Trainee app** — cross-platform mobile-first app (recommend **Flutter** or **React Native**, single codebase for Android + iOS + a desktop build) with a local **SQLite** store and local file cache. This is the client that must work fully offline: browsing pre-downloaded resources, submitting assignments, viewing grades, giving/receiving feedback. All of it reads/writes local SQLite first, then queues sync operations.
- **Admin & Exam Controller portal** — a responsive **web app** (React), since these roles operate primarily from an institution office with more reliable connectivity, manage configuration, run reports, and approve certifications. It still calls the same Tier-2 edge node first (not the central cloud directly) so admin actions at a campus keep working during a WAN outage.

Both clients talk to the **local Institution Edge Node** (Tier 2) as their primary backend, never directly to the central cloud — this means "offline" for an end user really means "edge node is reachable, central cloud may or may not be."

State/data layer pattern: local-first store (SQLite/IndexedDB) as source of truth for the UI, with a background sync service reconciling against the edge node's API. UI never blocks on network calls for read operations.

---

## 3. Backend Architecture

Both the Institution Edge Node and the Central Cloud run the **same modular-monolith codebase**, configured differently:

- **Edge Node build**: Identity (cached/local auth), Modules & Resources, Assessment/Grading, Notifications (local delivery), Sync Agent. No AI Gateway, no Ministry-wide reporting (not enough data locally to be meaningful).
- **Central Cloud build**: all modules active, including AI Gateway, cross-institution reporting, and the Sync Orchestrator that reconciles many edge nodes.

Internal modules and responsibilities:

| Module | Responsibility |
|---|---|
| Identity/RBAC | Accounts, roles, credential issuance, session/token management |
| Modules & Resources | Module metadata, resource metadata/files, tagging, search, usage logs |
| Assessment/Grading | Assignments, submissions, MCQ auto-grade, manual grading, grading log |
| Certification | Applies the certification scale, tracks pass/repeat status, certificate issuance |
| Notifications | Generates and queues all notification types (§15 of PRD) |
| Sync Orchestrator/Agent | Manages queued offline operations, conflict detection/resolution (§7) |
| Audit Log | Immutable record of sensitive actions (§10) |
| AI Gateway | Sole entry/exit point for AI features; enforces boundaries (§9) |

Running the same codebase at both tiers minimizes maintenance burden for a small ops team — one set of migrations, one test suite, two deployment configs.

---

## 4. Authentication and Authorization Design

- Credentials (Student ID/Staff ID + password) issued by Admin through the credential portal (PRD FR1); passwords hashed with **argon2id**, never stored/transmitted in plaintext.
- **JWT access + refresh tokens.** Access tokens short-lived (e.g., 15 min); refresh tokens longer-lived and cached locally so the mobile app can re-authenticate against the *local* edge node without a live central-cloud connection.
- **Offline login**: the edge node issues and validates its own tokens locally (it holds a local copy of credential hashes synced from the central cloud), so login works even if the edge node itself has no internet — this is what makes true offline use possible.
- **RBAC enforced server-side** at every API call (never trust client-side role checks), implementing the exact edit-accessibility matrix from the PRD:
  - Trainee: read own profile/module/results; write own profile fields only.
  - Trainer: read assigned trainees' submissions; write scores/feedback for own modules only; no write access to trainee personal-identity fields.
  - Exam Controller: read/write assessment schedules and certification approval records; read (not write) personal-identity fields.
  - Admin: full read/write, including the gated "Eradicate Trainee" action.
- All login attempts (success/failure) are audit-logged; rate limiting/lockout on repeated failures.

---

## 5. Database Architecture

- **PostgreSQL** as the relational store at both tiers (SQLite is used only inside the mobile client for local-first data, not at the edge node — Postgres is used at the edge node too, since it must serve multiple concurrent client devices on the LAN).
- Core structured entities (users, modules, assessments, submissions, grades, certifications) as normalized relational tables; extensible metadata (e.g., resource metadata, evolving NCS code sets — PRD NFR9) stored in **JSONB** columns to avoid schema migrations every time the Ministry updates a code list.
- **Central Cloud** runs a **read replica** dedicated to Admin/Exam Controller/Ministry dashboard queries, so heavy reporting queries never contend with transactional writes (grading, submissions).
- **Edge Node** DB is the authoritative source for in-progress campus activity; it syncs up to Central Cloud, which becomes the authoritative national system of record once synced.
- Every mutable table carries `updated_at`, `updated_by`, and a `version` integer for optimistic concurrency (needed for sync conflict detection, §7).
- Audit log is a separate **append-only** table/schema — no updates or deletes permitted at the application layer.

---

## 6. File/Resource Storage Design

- **MinIO** (self-hosted, S3-compatible object storage) at the Central Cloud, sized for the ~25 TB target — chosen over a third-party cloud object store to keep government/trainee data in-country and under Ministry control (data residency).
- Each Institution Edge Node keeps a **local file cache** of resources relevant to its trainees/trainers (the "pre-download while connected" requirement in PRD FR32) — effectively a partial, LRU-managed mirror of the resources its users actually need, not the full 25 TB.
- Every file is content-hashed (**SHA-256**) at upload, both to detect corruption/tampering and to allow cheap deduplication if the same resource is uploaded at multiple institutions.
- Resource metadata (title, subject/module, format, dates, NCS code, module code — PRD FR7) lives in Postgres; the binary file lives in object storage; the two are linked by a stable resource ID, not by filename.
- Access & accountability records (uploader/reviewer identity, permission level, update history — PRD FR9) and usage logs (views/downloads/search — PRD FR10) are stored relationally alongside the resource record, not embedded in the file store.

---

## 7. Offline Sync Design

This is the highest-risk area of the system (identified as a top risk in the PRD), so the design is deliberately conservative for high-stakes data.

**Sync direction and cadence:**
- Client ↔ Edge Node: near-continuous over LAN whenever the device is on campus.
- Edge Node ↔ Central Cloud: opportunistic — attempts sync whenever internet is detected; falls back to scheduled batch sync (e.g., nightly) if connectivity is poor.

**Conflict resolution — [Architecture Decision, resolves PRD OQ1]**, tiered by data sensitivity:

| Data class | Examples | Strategy |
|---|---|---|
| Low-stakes, single-owner | Resource tags, usage logs, read/unread status | Last-write-wins, version retained for rollback |
| Collaborative but non-critical | Comments/feedback threads | Append-only — no overwrite possible, so no real conflict exists |
| High-stakes, single-authoritative-writer | Grades, scores, grading status | Optimistic concurrency using `version`; if the edge node detects two conflicting writes to the same submission's grade (e.g., a trainer graded offline on two devices), the record is **not auto-merged** — it is flagged into a Sync Conflict Queue for the Trainer/Exam Controller to resolve manually |
| Certification decisions | Certificate issuance, pass/repeat status | Computed **only** at the tier that has full, synced data — never provisionally finalized offline. Offline clients may *display* a locally computed preview, clearly marked "pending sync," but the authoritative certification record is written once the edge node (and ultimately central cloud) has the complete, conflict-free grade set |
| Personal identity data | Name, contact info | Admin-only write, last-write-wins with full history (low conflict likelihood since only one role can write) |

- Every sync operation is queued locally with a status (`pending` / `syncing` / `synced` / `conflict`) visible in the client UI, so users trust the offline experience instead of wondering if their work was saved (PRD §11 requirement).
- Sync payloads are batched and diffed (not full-table dumps) to stay usable on poor connections.

---

## 8. Notification Service Design

- Notification events (deadline reminders, grading complete, new resource, result declaration, assessment schedule, general notices — PRD §15) are generated by the relevant module (Assessment/Grading, Modules & Resources, etc.) and written to a **Notifications** table/queue.
- **In-app inbox** is the primary channel and is itself offline-capable: notifications generated at the edge node are delivered to the local client immediately over LAN; notifications requiring central-cloud data (e.g., Ministry-wide notices) sync down like any other data.
- **Push notification** (mobile) as a secondary channel when the device has direct internet.
- **[Recommendation]** Add an **SMS fallback** for the highest-priority notifications only (submission deadline, result declaration) — SMS works over basic cellular coverage even where data connectivity doesn't, which directly matches the low-connectivity design goal. This is a cost/vendor trade-off to confirm with the Ministry (see §14).
- Notification delivery/read status is tracked per user for accountability and to avoid re-sending.

---

## 9. AI Service Boundaries

The **AI Gateway** is an isolated module — not because AI is untrusted technically, but to make the human-control requirement in the PRD structurally enforceable rather than a policy note.

- AI Gateway is the **only** component allowed to call AI models (whether self-hosted or an external API), and it never has direct write access to grading, certification, personal-identity, or policy tables.
- AI outputs (e.g., a personalized module recommendation, an at-risk-trainee flag, a suggested intervention) are written to a **Suggestions** table. A human (Trainer, Exam Controller, or Admin, depending on suggestion type) must explicitly accept/apply a suggestion before it affects any system-of-record data. Nothing an AI produces becomes a grade, a certification, or a policy change on its own.
- MCQ auto-grading is a narrow, deterministic exception: it is rule-based scoring against a known answer key (not a generative-AI judgment call), so it's implemented in the Assessment/Grading module directly, not routed through the AI Gateway — this matches the PRD's scoping of AI grading to strictly objective assessments.
- **[Recommendation]** If an external AI API is used (vs. a self-hosted model), only send it anonymized/de-identified content where feasible — trainee PII should not leave Ministry-controlled infrastructure to reach a third-party AI provider. This should be validated against whatever data-protection framework applies (PRD OQ3).
- Every AI suggestion and every human accept/reject action on it is audit-logged, giving a clean trail of "AI proposed, human decided."

---

## 10. Logging, Audit, and Monitoring Design

- **Audit log** (append-only, as in §5): every login, grade change, certification decision, resource permission change, and the Eradicate Trainee action — capturing who, what, before/after values, and when. This is the accountability backbone required across the PRD (§9, §14).
- **Operational logging**: structured application logs (e.g., via a lightweight self-hosted stack such as Grafana Loki) separate from the audit log — used for debugging, not compliance.
- **Monitoring/alerting** (e.g., Prometheus + Grafana): service health at both tiers, sync failure rates, storage capacity utilization (tracked against the 25 TB planning ceiling), and edge-node connectivity status, surfaced on the Admin dashboard.
- Audit log retention policy to be set with the Ministry (ties to PRD OQ6); operational logs can rotate on a much shorter cycle.

---

## 11. Security and Privacy Architecture

- TLS in transit everywhere, including Edge Node ↔ Central Cloud sync traffic.
- Encryption at rest for the database and object storage.
- RBAC enforced server-side at every endpoint; field-level restrictions so, e.g., a Trainer's API responses never include a trainee's Citizenship ID even if the Trainer app is inspected/tampered with.
- Secrets (DB credentials, API keys) managed via a secrets manager/vault, not checked into config files.
- Credential hashing (argon2id), brute-force/lockout protection, audit-logged auth events.
- Self-hosted infrastructure (MinIO, Postgres) in a Ministry/government-controlled data center to satisfy data residency for Citizenship ID and other sensitive fields — pending confirmation of the applicable regulation (PRD OQ3).
- Regular automated backups of both tiers, with restore procedures tested — offline-first does not mean backup-optional; an edge node is a single point of failure for its campus.
- The "must never" list from the PRD (§16) — no AI bypass of human review, no unauthorized data access, no removal of human oversight for sensitive/disputed content — is enforced structurally via the AI Gateway boundary (§9) and RBAC (§4), not left as a guideline.

---

## 12. Scalability and Deployment Strategy

- At ~1,500 users total (national scale, spread across many institutions), **no individual edge node or even the central cloud needs heavy horizontal scaling** — the bottleneck is connectivity and operational simplicity, not raw throughput.
- **Deployment**: containerized services (Docker) at both tiers. Given a small government ops team, prefer **Docker Compose** (or a lightweight orchestrator) over full Kubernetes for the pilot and early rollout — Kubernetes' operational overhead isn't justified at this scale and would slow the team down. Revisit only if institution count grows substantially beyond initial planning.
- **Edge Node hardware**: a modest on-prem server or NUC-class machine per campus is sufficient — it only serves one institution's concurrent users, not the national load.
- Central Cloud API layer is still built **stateless** (session state in Redis, not in-process) so it *can* scale horizontally later without a redesign, even though it isn't required at launch.
- Storage scales incrementally — start well under 25 TB (pilot department only) and grow MinIO capacity as institutions onboard, rather than over-provisioning upfront.

---

## 13. Suggested Tech Stack Options

| Layer | Option A (recommended) | Option B (alternative) |
|---|---|---|
| Trainer/Trainee client | Flutter (Android/iOS/desktop, one codebase) | React Native |
| Admin/Exam Controller portal | React (web) | Vue.js |
| Local client storage | SQLite (via `drift`/`sqflite`) | SQLite (via WatermelonDB) |
| Backend framework | Node.js + NestJS (TypeScript, shared types with React frontend) | Python + Django (batteries-included, strong admin tooling) |
| Database | PostgreSQL | PostgreSQL |
| Object storage | MinIO (self-hosted, S3-compatible) | MinIO |
| Cache/session/queue | Redis + BullMQ | Redis + Celery (if Django) |
| Notifications | In-app + Web Push + optional SMS gateway (e.g., a regional SMS API provider) | Same |
| Monitoring | Prometheus + Grafana + Loki | Same |
| Containerization | Docker + Docker Compose | Same |
| AI Gateway | Self-hosted small models where feasible; external LLM API only for non-sensitive, anonymized tasks | Same |

Option A is recommended primarily because a single primary language (TypeScript) across mobile, web, and backend reduces the hiring/training burden for a small government team — a practical concern that matters as much as any technical merit here.

---

## 14. Risks and Trade-offs

| Decision | Trade-off | Why it's still the right call here |
|---|---|---|
| Modular monolith over microservices | Less "clean" separation, harder to scale one module independently | Matches team size and 1,500-user scale; avoids distributed-systems complexity the ops team doesn't need yet |
| Three-tier (edge node) topology over pure cloud+PWA | More infrastructure to deploy and maintain (one server per campus) | Directly solves the offline reliability requirement better than a browser-only offline story; matches the "digitize one department at a single TTI" pilot framing |
| Self-hosted MinIO/Postgres over managed cloud services | More ops burden on the Ministry's IT team; no vendor SLA | Data residency for Citizenship ID and other sensitive trainee data likely requires it, pending legal confirmation (OQ3) |
| Conservative offline conflict handling for grades (manual resolution over auto-merge) | Occasionally requires a human to resolve a conflict rather than fully automatic sync | Grading/certification data corruption is a much worse failure mode than asking a Trainer to resolve an occasional conflict |
| SMS fallback for critical notifications | Recurring vendor cost, dependency on a telecom SMS gateway | Directly serves the low-connectivity population who may lack data access even when they have basic cellular coverage — recommend piloting this narrowly before committing |
| Docker Compose over Kubernetes at launch | Manual work if the system later needs true horizontal scaling | Right-sized for current scale and team capacity; API layer is still built stateless so migration later is possible, not blocked |

---

## Data Flow: Upload → Assessment → Grading → Certification

1. **Upload (Trainee, offline or online):** Trainee submits assignment file(s) in the client app → written to local SQLite + local file cache immediately (instant UX, no network wait) → filename, timestamp, SHA-256 hash, and status (`queued`) recorded → sync agent queues the operation.
2. **Sync to Edge Node:** Once on campus LAN, the sync agent pushes the submission (metadata + file) to the Institution Edge Node → Edge Node validates allowed file types (PRD FR13), stores the file locally, updates status to `submitted`, and notifies the Trainer (in-app, delivered next time the Trainer's client syncs with the edge node).
3. **Assessment/Grading:** For MCQ components, the Assessment/Grading module auto-grades immediately against the answer key and writes to the auto-grade log. For subjective components, the Trainer grades manually (online or offline) — score, grading status, and grader identity are recorded; a `version` is attached for conflict detection.
4. **Sync to Central Cloud:** The Edge Node syncs the graded submission upward when internet is available. If a conflicting grade edit is detected (e.g., graded on two devices offline), it lands in the Sync Conflict Queue for manual resolution rather than being auto-merged (§7).
5. **Certification:** Once a module's full, conflict-free grade set is present at the tier computing certification, the Certification module applies the scale (PRD §13) to compute grade/GPA/performance band and pass/repeat status. Passing results trigger automatic certificate generation, routed to the Exam Controller for approval before being marked final (resolves PRD OQ2 as: **all certificates pass through Exam Controller review before being marked final**, given the PRD explicitly requires "validation & oversight" as a human-owned function — this should be confirmed, but automatic-with-no-review is inconsistent with that principle).
6. **Notification:** Trainee receives a "result declaration" notification once certification is finalized, delivered in-app immediately if online, or queued for delivery on next sync/connectivity.
7. **Audit trail:** Every step above (submission received, grade entered, conflict resolved, certificate approved) writes an immutable audit log entry.

---

## Recommendations: Pilot First, Then Scale

**Pilot (30 days, one department, one TTI):**
- Deploy **Tier 1 (client) + Tier 2 (edge node) only.** Skip the Central Cloud tier and multi-institution sync entirely — a single edge node at the pilot TTI can act as the system of record for the pilot's duration. This minimizes infrastructure to stand up and lets the team validate the parts that matter most for the pilot's success measures: resource search/tagging accuracy and the transparency dashboard.
- Skip the AI Gateway and SMS fallback for the pilot — neither is needed to validate the core hypothesis (can trainers/trainees find and use resources independently, does offline sync work).
- Use the pilot specifically to validate: metadata completeness/tagging accuracy (PRD §14), offline sync reliability end-to-end (download → offline use → submit → sync), and whether the "minutes not days" resource-location success measure is actually met.

**Scale-up (post-pilot, national rollout toward 1,500 users / 25 TB):**
- Stand up the Central Cloud tier; onboard the pilot edge node as the first of many, confirming edge↔cloud sync works before rolling out additional institutions.
- Introduce the AI Gateway once there's enough real usage data for personalization/at-risk prediction to be meaningful — launching it on day one with no data would produce low-quality suggestions and risk trust in the "human-in-the-loop" model.
- Introduce SMS notifications and the read-replica reporting database as usage grows, not upfront.
- Formalize the Sync Conflict Queue workflow based on real conflict frequency observed during the pilot — if conflicts turn out to be rare in practice, the resolution UI can stay lightweight; if frequent, invest more here before wider rollout.

---

*This architecture is derived from [PRD.md](./PRD.md) and the Ministry's System Architecture Prompt. Architecture Decisions marked above resolve PRD open questions provisionally and should be confirmed with Ministry stakeholders before implementation begins.*
