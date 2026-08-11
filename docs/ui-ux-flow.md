# UI / UX Flow Document
## TVET e-Gateway — Learning Management System

**Companion to:** [PRD.md](./PRD.md), [architecture.md](./architecture.md), [database-design.md](./database-design.md)
**Status:** Draft for review

Every flow below assumes the offline-first, edge-node reality from architecture.md: a screen's "loading" state is rare (data is local-first), but a persistent, honest **sync status indicator** is not optional — trainers and trainees in low-connectivity TTIs/IZCs need to trust that their work was saved before they trust anything else about the app.

---

## 0. Shared UX Foundations

### 0.1 Credential Portal (shared entry point, all roles)

1. Splash screen shows institution branding + Ministry crest, language toggle (English / Dzongkha) visible before login — bilingual support starts at the very first screen, not after login.
2. Single login form: **Login ID** (Student ID or Staff ID, per `users.login_id`) + password. No self-registration — accounts are Admin-provisioned only (PRD FR1), so the screen has no "sign up" link, only "Forgot password? Contact your Admin."
3. On submit, the client authenticates against the **local Edge Node first** (architecture.md §4) — login works even with zero internet, as long as the device has reached the campus network at least once before (credentials cached locally after first successful login).
4. On successful login, the app reads the user's role(s) from `user_roles` and routes to the correct themed dashboard. If a user holds more than one role (e.g., Trainer + Exam Controller), a lightweight **role switcher** appears in the top bar instead of a second login — switching context, not re-authenticating.
5. First-login onboarding (all roles): a 3-screen, skippable walkthrough covering (a) the offline/sync indicator meaning, (b) where to change language, (c) how to reach help/support contact. Never a mandatory tutorial that blocks getting to real content.

### 0.2 Persistent Global UI Elements (all roles, all screens)

- **Sync status chip** (top bar, always visible): `● Synced` (green dot) / `◐ Syncing…` / `○ Offline — N pending` / `▲ Conflict — review needed` (only for Trainers/Exam Controllers, since conflicts are grading-related per architecture.md §7). Tapping it opens a simple sync detail list, not a technical log.
- **Language toggle** (EN/DZ), always in the top bar, one tap, no page reload required for static UI chrome (content bilingual availability depends on the resource itself — see empty states below).
- **Notification bell** with unread count, consistent placement across all four dashboards.

### 0.3 Information Architecture (site map)

```
Login (Credential Portal)
│
├── Trainee Dashboard
│   ├── My Modules
│   │   ├── Module Detail (outcome, tutor, schedule)
│   │   ├── Resources (search, download, offline library)
│   │   └── Assessments & Assignments
│   │       ├── Assignment Detail → Submit
│   │       └── Submission Status & Feedback Thread
│   ├── My Results
│   │   ├── Progress Overview (bar graph, competency chart)
│   │   └── Certificates
│   ├── Notifications
│   └── My Profile (limited self-edit fields)
│
├── Trainer Dashboard
│   ├── My Modules
│   │   ├── Roster (enrolled trainees)
│   │   ├── Resources (upload/manage)
│   │   └── Assignments & Assessments (create/manage)
│   ├── Grading Queue
│   │   └── Submission Review → Score + Feedback
│   ├── Class Progress & Analytics
│   ├── Notifications
│   └── My Profile
│
├── Exam Controller Dashboard
│   ├── Assessment Schedule (review/approve)
│   ├── Grading Oversight (consistency view across trainers)
│   ├── Certification Queue (approve/dispute)
│   ├── Sync Conflict Queue (grading conflicts needing decision)
│   ├── Reports & Compliance
│   ├── Notifications
│   └── My Profile
│
└── Admin Dashboard
    ├── User Management (create/edit accounts, roles)
    ├── Trainee Records (profiles, Eradicate Trainee workflow)
    ├── Institution & Module Setup (trades, classes, modules)
    ├── Resource Governance (permissions, review status)
    ├── System Health (storage/capacity, sync status across devices)
    ├── Notifications (compose general notices)
    └── Reports (institutional KPIs, Ministry rollups)
```

### 0.4 Color / Theme Separation

| Role | Primary color | Rationale |
|---|---|---|
| Trainee | **Blue / Teal** | Calm, approachable — the highest-volume, most mobile-heavy user |
| Trainer | **Green** | Distinct from Trainee; commonly associated with "grading/approval" actions, avoids confusion with Trainee blue |
| Exam Controller | **Amber / Orange** | Signals "review/decision authority" — visually distinct from both Trainee and Trainer, deliberately close to a "caution/attention" hue since this role deals with disputes and approvals |
| Admin | **Deep Purple / Slate Grey** | Neutral, authoritative, visually distinct from all three operational roles — reinforces that Admin is configuration/oversight, not day-to-day academic work |

Applied to: top app bar background, primary button color, and the role's dashboard header — **never** to indicate status/meaning (errors, warnings, success always use standard semantic colors, e.g. red/green/amber, regardless of role theme) so status color and role color are never confused. Every role theme is validated for **WCAG 2.1 AA contrast** against both white and dark-mode backgrounds, and no information is conveyed by color alone (icons/text labels always pair with color-coded states) — required given low-end-device users may have low-quality or sun-glared screens.

---

## 1. Trainee Dashboard

### 1.1 Login and Onboarding
Shared credential portal (§0.1). First-time onboarding highlights: how to download a module's resources for offline use, and how to check submission status.

### 1.2 Main Dashboard Layout
Single-column, mobile-first card layout (scrolls vertically, no complex multi-panel grid — matches low-end device/small-screen reality):
1. Header: name, trade, photo, sync status chip.
2. **"Due Soon"** card — upcoming assignment deadlines, sorted soonest-first, red accent if <24h.
3. **Progress summary** card — overall progress horizontal bar graph + competency chart (PRD FR24), tap to expand to full Results screen.
4. **My Modules** — horizontally scrollable module cards (name, tutor, next session).
5. **Recent Feedback** — latest unread comments from trainers.
6. Bottom tab bar: Home / Modules / Results / Notifications.

### 1.3 Navigation Structure
Bottom tab bar (4 items max — thumb-reachable on mobile) rather than a side drawer, since Trainees are the most mobile/small-screen-dominant user group. Module → Resources/Assignments is a drill-down within the Modules tab, not a separate top-level tab.

### 1.4 Key Screens
- **Module Detail** — learning outcome, tutor, start/end dates, tabs for Resources / Assignments.
- **Resource Library (per module)** — searchable/filterable list; each item shows a **download icon** (not yet downloaded) or **checkmark** (available offline); tapping a non-downloaded resource on a metered/offline connection prompts confirmation before using data.
- **Assignment Detail → Submit** — shows allowed file types and due date prominently; file picker; submit button disabled until a valid file type is attached.
- **Submission Status & Feedback Thread** — status pill (`Draft` / `Queued` / `Submitted` / `Graded`), score once graded, threaded comments (text or voice-note playback).
- **My Results** — horizontal bar graph (overall progress), competency chart, module-by-module list with mark/GPA, and a **Certificates** section (view/download PDF once approved).

### 1.5 Core Actions
Download resource for offline use; submit assignment; view grade/feedback; reply to feedback (text or voice note); view/download certificate; edit own profile fields (contact number, email — not Citizenship ID, which is Admin-only per PRD §5.1/§9).

### 1.6 Empty States
- No modules yet: "You're not enrolled in any modules yet. Your trainer or admin will add you once your class starts." (no dead-end — includes a "Contact Admin" affordance).
- No resources downloaded: "Nothing downloaded yet. Download resources while you have a connection so you can study offline." with a prominent "Browse Resources" CTA.
- No feedback yet: "No feedback on this submission yet — your trainer will respond after reviewing it."

### 1.7 Error States
- Submission upload fails (disallowed file type): inline error naming exactly which types are allowed, not a generic "upload failed."
- Attempting to submit after the due date while offline: submission is still queued locally and marked, but the UI clearly flags "This will be marked **late** once synced" so there's no false expectation of an on-time submission.
- Sync conflict is never shown to a Trainee (conflicts on grading data are a Trainer/Exam Controller concern, per architecture.md §7) — a Trainee only ever sees `Submitted`/`Graded`, never sync-internal states.

### 1.8 Offline Behavior
Full read access to any pre-downloaded module content, results, and past feedback with zero network dependency. Submissions, new comments, and resource downloads-in-progress all queue locally with the shared sync chip (§0.2) reflecting pending count. Explicitly **no blocking spinners** for offline actions — an offline submit succeeds instantly from the user's point of view (queued locally), sync happens invisibly in the background.

### 1.9 Notification Behavior
In-app inbox is primary and offline-durable (delivered next LAN sync if the device was offline when generated). Push notification when the device has direct internet. Types per PRD §15: submission deadline (24h), grading complete, new resource, result declaration, assessment schedule, general notices.

### 1.10 Accessibility Considerations
Bilingual content indicator on every resource/module (shows EN/DZ/Both, so a Trainee isn't surprised by language mismatch); voice-note support for feedback benefits lower-literacy users; minimum touch target size for mobile (44×44px); high-contrast mode; text scaling support (respect OS-level font size settings, don't hardcode text sizes).

---

## 2. Trainer Dashboard

### 2.1 Login and Onboarding
Shared credential portal. Onboarding highlights: the grading queue, and how manual score entry interacts with MCQ auto-grading (so trainers don't duplicate work already auto-graded).

### 2.2 Main Dashboard Layout
Two-zone layout (still single-column-first on mobile, expands to two-column on tablet/desktop, since Trainers more often use a larger screen in an office/staff room):
1. Header: name, sync status chip, role switcher if also Exam Controller.
2. **Grading Queue** card — count of pending submissions across all modules, sorted by deadline urgency.
3. **My Modules** — cards showing enrollment count, average progress.
4. **Class Progress** — compact chart per module (e.g., % on-track vs. at-risk, sourced from the same underlying data as AI at-risk flags — see §2.9 AI note).

### 2.3 Navigation Structure
Side drawer (desktop/tablet) or bottom tabs (mobile): Home / Grading Queue / Modules / Notifications. Grading Queue is elevated to its own top-level nav item (not buried under Modules) because it's the highest-frequency action.

### 2.4 Key Screens
- **Grading Queue** — flat list across all modules, filterable by module/assignment; each row shows trainee name, submission time, auto-grade status if applicable (MCQ), and a "Grade" action.
- **Submission Review** — split view: submission file(s)/preview on one side, scoring + feedback panel on the other. MCQ auto-grade result shown read-only at top (`auto_grade_logs`), manual score field below for subjective components, feedback text/voice-note input.
- **Roster** — per-module trainee list with individual progress indicators; tapping a trainee shows their results history for that module **only** (no cross-module or personal-identity data beyond what's needed, per the edit-accessibility rule in PRD §5.1).
- **Resource Management** — upload new resource (title EN/DZ, format, tags, permission level), view existing resources with review/update-history trail.

### 2.5 Core Actions
Grade a submission (accept auto-grade or override, enter manual score); give feedback (text/voice); upload/update module resources; view class progress; propose an assessment (routes to Exam Controller for approval, per architecture.md's certification-approval flow).

### 2.6 Empty States
- Empty grading queue: "You're all caught up — no pending submissions." (positive framing, not a blank void).
- New module with no resources yet: prompts "Add your first resource" directly from the empty state, not a separate menu hunt.

### 2.7 Error States
- Attempting to grade above `assessments.max_score`: inline validation blocks submit with the max score shown.
- Two devices with conflicting grade edits for the same submission: on sync, the Trainer sees a **Conflict** card in the Grading Queue ("You graded this submission differently on two devices — choose which score to keep") showing both versions side-by-side with timestamps — this is the human-resolution step from architecture.md §7, not silently auto-merged.

### 2.8 Offline Behavior
Grading, feedback, and resource uploads all work offline and queue for sync (architecture.md §7 tiered strategy: grades are optimistic-concurrency-checked, not auto-merged, on conflict). A trainer grading an entire class offline sees each graded item flip to "queued" instantly, then "synced" once the device reaches the edge node.

### 2.9 Notification Behavior
Grading-queue-relevant notifications: new submission received, assessment approved/rejected by Exam Controller, sync conflict detected (high priority — surfaced immediately, not just in the passive notification list). **AI note**: any AI-generated "at-risk trainee" flag or intervention suggestion (PRD §16/architecture.md §9) appears as a distinctly styled **Suggestion card** (not a normal notification) requiring explicit "Apply" / "Dismiss" — visually differentiated (e.g., a small "AI suggested" tag) so it's never mistaken for a human-confirmed fact.

### 2.10 Accessibility Considerations
Voice-note feedback input (mic button) as a first-class alternative to typing; keyboard shortcuts for the grading queue on desktop (next/previous submission, quick-score entry) to reduce repetitive-task friction for trainers grading many submissions; bilingual resource authoring fields side-by-side (EN/DZ) rather than a toggle, since trainers are producing bilingual content, not just consuming it.

---

## 3. Exam Controller Dashboard

### 3.1 Login and Onboarding
Shared credential portal. Onboarding highlights: the Certification Queue and Sync Conflict Queue, since these are the two screens unique to this role's authority.

### 3.2 Main Dashboard Layout
Desktop/tablet-optimized (this role most often works from an institution office), two-column:
1. Header: name/institution, sync status chip.
2. **Certification Queue** — count pending Exam Controller approval (`results.status = 'pending_approval'`).
3. **Grading Consistency** panel — flags modules/trainers with unusual score distributions (a lightweight AI-assisted signal, not an accusation — framed as "worth a look," see §3.9).
4. **Assessment Schedule** — upcoming assessments awaiting approval.
5. **Sync Conflict Queue** — open grading conflicts across the institution needing resolution.

### 3.3 Navigation Structure
Side drawer: Home / Certification Queue / Grading Oversight / Assessment Schedule / Sync Conflicts / Reports / Notifications.

### 3.4 Key Screens
- **Certification Queue** — list of computed `results` awaiting approval; row shows trainee, module, score, mark/GPA, outcome (certified/repeat); tapping opens full detail with grading history and any linked feedback for context before approving.
- **Result Detail / Approve** — shows the full grade breakdown (auto-graded + manually graded components), the certification-scale mapping applied (PRD §13 table, non-editable), and Approve / Dispute actions. Disputing routes back to the relevant Trainer with a required reason.
- **Sync Conflict Queue** — each conflict shows both competing versions of a grade (device/timestamp/value), with a clear "choose one" or "enter final value" resolution action, logged to `sync_conflicts`.
- **Assessment Schedule Review** — approve/reject Trainer-proposed assessments before they go live to trainees.
- **Reports** — institutional compliance/KPI views, exportable for Ministry reporting.

### 3.5 Core Actions
Approve/dispute a certification result; resolve a sync conflict; approve/reject an assessment schedule; review grading-consistency flags; generate compliance reports.

### 3.6 Empty States
- Empty certification queue: "No results awaiting approval right now."
- No sync conflicts: "No open conflicts — grading data is fully synced and consistent."

### 3.7 Error States
- Attempting to approve a result with an unresolved sync conflict on the same submission: blocked with an explicit message — "Resolve the grading conflict on this submission before approving certification" — since approving over an unresolved conflict would certify against ambiguous data (a data-integrity safeguard, not just a UX nicety).
- Approving a certificate action while offline: allowed (queued), but the certificate's `status` stays `draft` until the approval itself has synced back to wherever the authoritative record lives (architecture.md §7 — certification is never provisionally finalized offline).

### 3.8 Offline Behavior
Review and preliminary approve/dispute decisions can be made offline and queue for sync; however, the UI is explicit that a certificate is not "final" (and not shown as such to the Trainee) until the approval has synced and the Certification module has confirmed a complete, conflict-free grade set (architecture.md §7 data flow §"Certification").

### 3.9 Notification Behavior
High-priority notification for new sync conflicts (this role is the designated resolver, per architecture.md §7); result-declaration triggers only fire to trainees after Exam Controller approval, not before. AI-assisted "grading consistency" flags are presented as a **review prompt**, never an automated decision — explicitly framed as advisory ("3 submissions in Module X were graded notably lower than the module average — worth a review") consistent with the "AI must never remove the human review step" rule (PRD §16).

### 3.10 Accessibility Considerations
Data-dense tables (certification queue, grading consistency) use sortable/filterable columns with keyboard navigation; side-by-side conflict comparison uses both color **and** explicit labels ("Device A — 14:02", "Device B — 14:15") so the distinction never relies on color alone; export-to-PDF/CSV for reports respects the bilingual setting.

---

## 4. Admin Dashboard

### 4.1 Login and Onboarding
Shared credential portal. Onboarding highlights: user provisioning flow and the Eradicate Trainee confirmation safeguard, since this is the role's most consequential, hardest-to-reverse action.

### 4.2 Main Dashboard Layout
Desktop-first (office-based role), dense information layout acceptable here (unlike Trainee/Trainer, which prioritize mobile simplicity):
1. Header: institution name, sync status across all devices at the institution.
2. **System Health** card — storage/capacity utilization (against the 25 TB planning ceiling, per architecture.md §12), active user count (against ~1,500 planning baseline), edge-node connectivity status.
3. **Pending Actions** card — pending Eradicate Trainee confirmations, unresolved account issues.
4. **Institutional KPIs** — resource usage/gap summary (supports the pilot success measure), completion/certification rates.

### 4.3 Navigation Structure
Side drawer: Home / Users / Trainee Records / Institution Setup / Resources / System Health / Notifications / Reports.

### 4.4 Key Screens
- **User Management** — create/edit accounts, assign role(s) via `user_roles`, reset credential (never displays a plaintext password, only triggers a reset flow), suspend/deactivate.
- **Trainee Records** — full personal-identity view/edit (Admin-only, per the PRD edit-accessibility matrix); includes the **Eradicate Trainee** action.
- **Eradicate Trainee flow (critical safeguard screen)**: Admin selects a completed trainee → system shows a summary of what will happen (identity fields redacted, academic/certificate records preserved, per database-design.md §9) → **explicit confirmation dialog** requiring the Admin to type/confirm intent → action is logged to `audit_logs` and an `eradication_requests` record is created → Admin receives a **pre-action notification** before the action finalizes, per PRD FR6 (i.e., confirmation is not instantaneous-and-silent — there's a deliberate checkpoint).
- **Institution & Module Setup** — trades, classes, modules, assigning module tutors.
- **Resource Governance** — permission-level management, review-status oversight across all uploaded resources.
- **System Health** — storage/capacity, per-institution sync status, flags any Edge Node that hasn't synced in an unusually long time.

### 4.5 Core Actions
Provision/edit/deactivate accounts; edit any trainee/trainer personal detail; execute (with confirmation) Eradicate Trainee; configure trades/classes/modules; manage resource permissions; compose general notifications (holidays, practical class logistics); monitor system capacity.

### 4.6 Empty States
- No pending actions: "Nothing needs your attention right now."
- New institution setup: guided "Set up your first trade and class" empty-state flow rather than a blank configuration screen.

### 4.7 Error States
- Attempting to eradicate a trainee who hasn't completed their course: blocked with an explanation ("This trainee is still active in one or more modules"), preventing accidental data loss for an in-progress trainee.
- Duplicate Citizenship ID or login ID on account creation: inline validation against the DB's `UNIQUE` constraints (database-design.md §3), surfaced before submission where possible.
- Storage approaching capacity: proactive warning banner on System Health (not just a hard failure once the limit is hit).

### 4.8 Offline Behavior
Most Admin configuration actions (user creation, module setup) function against the local Edge Node and sync upward like any other data. The Eradicate Trainee **confirmation step itself is recommended to require a live connection to the Edge Node** (not deferred entirely offline) given its irreversible, sensitive nature — flagged here as a UX recommendation to validate with the Ministry, analogous to how certification approval isn't finalized offline (architecture.md §7).

### 4.9 Notification Behavior
Pre-action notification before Eradicate Trainee finalizes (PRD FR6, explicit requirement); system-health alerts (storage approaching capacity, an Edge Node not syncing); Admin composes and broadcasts general notifications to some/all users via `notifications`/`notification_recipients`.

### 4.10 Accessibility Considerations
Confirmation dialogs for destructive actions use clear, non-jargon language ("This will remove [Name]'s personal details permanently. Their certificate and academic record will be kept.") rather than a generic "Are you sure?"; dense tables remain keyboard-navigable; bilingual notification composition (Admin can write the same general notice in both EN and DZ before broadcasting).

---

## 5. User Journeys

### 5.1 Trainee Submission Journey
1. Trainee opens app (possibly fully offline) → Home shows "Due Soon" card for an assignment due in 20 hours.
2. Taps assignment → Assignment Detail shows allowed file types and due date.
3. Taps "Submit" → file picker → selects a file of an allowed type → local hash computed, submission written to local store instantly, status = `Queued`.
4. UI confirms "Submitted — will sync when connected" with the sync chip showing `1 pending`.
5. Device reaches campus Wi-Fi later → sync chip shows `Syncing…` → submission pushed to Edge Node, status updates to `Submitted`, Trainer notified.
6. Trainee later receives a `grading_complete` notification → opens Submission Status screen → sees score + trainer feedback (text or voice-note) → can reply.

### 5.2 Trainer Grading Journey
1. Trainer opens Grading Queue, sorted by deadline urgency, sees new submission from the journey above.
2. Opens Submission Review → sees submitted file, any auto-graded MCQ component already scored.
3. Enters manual score for the subjective component, adds a short voice-note ("Good technique on step 3, revisit the safety check in step 5") → taps Save.
4. If offline at the time: grade is saved locally as `pending_sync`; if a second device later has a conflicting grade for the same submission, it surfaces as a Conflict card on next sync (§2.7) rather than silently overwriting.
5. Once synced, the trainee receives a `grading_complete` notification (§5.1 step 6).
6. Trainer moves to the next item in the queue — designed for fast sequential grading (keyboard shortcuts on desktop, §2.10).

### 5.3 Exam Controller Result Management Journey
1. Once all grading for a module's assessments is complete and synced, the Certification module computes `results` and the record lands in the Exam Controller's Certification Queue as `pending_approval`.
2. Exam Controller opens the Result Detail screen — reviews score breakdown, the certification-scale mapping applied (fixed table, not editable), and any linked grading history.
3. If everything checks out: taps **Approve** → `results.status = 'approved'`, `certificates` record moves to `approved`, trainee is notified (`result_declaration`).
4. If something looks wrong (e.g., a grading-consistency flag pointed here): taps **Dispute**, enters a required reason, which routes back to the Trainer for review — the result stays `pending_approval`/`disputed` until re-resolved, never auto-certifying over a flagged concern.
5. If a sync conflict exists on an underlying grade for this result, the Approve action is blocked (§3.7) until the Exam Controller resolves it via the Sync Conflict Queue first.

### 5.4 Admin Oversight and Record Update Journey
1. Admin notices (via System Health) that an Edge Node hasn't synced in several days → investigates, contacts the institution — an operational, not purely UI, follow-up, but the dashboard is what surfaces the signal.
2. Separately, a trainee completes their course. Admin opens Trainee Records, finds the trainee, confirms `trainee_profiles.status` should move to reflect completion.
3. Admin initiates **Eradicate Trainee**: reviews the summary of what will be redacted vs. retained, explicitly confirms intent.
4. System creates an `eradication_requests` record (`pending_confirmation`), sends the Admin a pre-action notification (per PRD FR6) — this is a deliberate pause, not an instant action — Admin confirms a second time in the notification/follow-up flow.
5. Action finalizes: PII fields on `trainee_profiles` are redacted, the action is written to `audit_logs`, and the trainee's certificate/result records remain intact and verifiable, per database-design.md §9.
6. Admin can later filter Trainee Records by status to distinguish active/completed/eradicated trainees.

---

## 6. Wireframe Descriptions (Key Screens)

**Trainee — Home Dashboard (mobile, single column)**
```
┌─────────────────────────────┐
│ ☰  TVET e-Gateway   EN|DZ  🔔│  <- top bar: menu, lang toggle, notif bell
│ ● Synced                     │  <- sync chip
├─────────────────────────────┤
│ Hi, Tashi          [photo]  │
├─────────────────────────────┤
│ ⏰ Due Soon                  │
│  • Electrical Wiring HW —    │
│    due in 20h        [Open] │
├─────────────────────────────┤
│ 📊 Your Progress             │
│  [====progress bar====] 68% │
│  [competency radar chart]   │
├─────────────────────────────┤
│ 📚 My Modules  ▸ scroll →    │
│  [Card] [Card] [Card]       │
├─────────────────────────────┤
│ 💬 Recent Feedback           │
│  "Good technique on step 3" │
├─────────────────────────────┤
│  Home | Modules | Results | 🔔│  <- bottom tab bar
└─────────────────────────────┘
```

**Trainer — Submission Review (tablet/desktop, split view)**
```
┌───────────────────────────────────────────────────┐
│ ☰  Grading Queue (12 pending)      ● Synced    🔔  │
├───────────────────────┬────────────────────────────┤
│  Submission Preview    │  Grading Panel             │
│  [file viewer /        │  Auto-grade (MCQ): 8/10    │
│   image/PDF preview]   │  ─────────────────────     │
│                        │  Manual score: [___] / 20  │
│                        │  Feedback:                 │
│                        │  [ text box ]  🎙 voice     │
│                        │  [ Save & Next ]            │
└───────────────────────┴────────────────────────────┘
```

**Exam Controller — Certification Queue (desktop table)**
```
┌───────────────────────────────────────────────────────────┐
│ Certification Queue (7 pending approval)                   │
├───────────┬─────────┬───────┬─────┬────────────┬──────────┤
│ Trainee   │ Module  │ Score │ Mark│ Outcome    │ Action   │
├───────────┼─────────┼───────┼─────┼────────────┼──────────┤
│ P. Wangmo │ Weld-101│  84   │  B  │ Certified  │ [Review] │
│ K. Dorji  │ Weld-101│  52   │  E  │ Repeat     │ [Review] │
│ ⚠ S. Choden│ Elec-201│ 61  │  D  │ Certified  │ [Review] │  <- ⚠ = conflict flag
└───────────┴─────────┴───────┴─────┴────────────┴──────────┘
```

**Admin — Eradicate Trainee Confirmation (modal)**
```
┌───────────────────────────────────────────┐
│  ⚠ Eradicate Trainee Record                │
│                                             │
│  You are about to remove personal details  │
│  for: Sonam Choden (Student ID 2023-114)   │
│                                             │
│  This WILL remove: Citizenship ID, contact  │
│  info, profile photo.                      │
│  This will NOT remove: certificates, module │
│  results (kept for verification).          │
│                                             │
│  Type "ERADICATE" to confirm:               │
│  [_______________]                          │
│                                             │
│        [ Cancel ]     [ Confirm ]           │
└───────────────────────────────────────────┘
```

---

## 7. UX Principles for Low-Bandwidth and Mobile-First Use

1. **Local-first, not loading-first.** Every screen renders from local data immediately; network activity happens silently in the background and is only ever surfaced through the sync chip — never a blocking spinner on a core read action.
2. **Every irreversible or deferred consequence is stated explicitly in-UI**, not left implicit — "will sync when connected," "will be marked late," "kept for verification" — because in an intermittent-connectivity environment, users can't rely on "it probably went through."
3. **Explicit, opt-in downloads over silent caching.** Especially for large resource files, the user chooses what to pre-download rather than the app guessing — respects that connectivity/data may be costly or limited.
4. **Single-column, bottom-nav layouts for the two mobile-first roles (Trainee, Trainer)**; denser, desktop-optimized layouts are acceptable for Admin/Exam Controller, who more often work from an institution office.
5. **No feature requires a live connection to be usable, except where data integrity genuinely demands it** (final certification approval, Eradicate Trainee) — and in those specific cases, the UI says so plainly rather than failing silently.
6. **Bilingual is a first-class layout concern, not a translation afterthought** — text containers accommodate variable-length Dzongkha/English strings without truncation or broken layouts; language toggle never requires a full app reload.
7. **Conflicts and AI suggestions are visually distinct from confirmed facts.** A sync conflict, an AI-generated at-risk flag, or a suggested intervention always uses a clearly different visual treatment (bordered "review" card, explicit "AI suggested" tag) from settled, human-confirmed data — reinforcing the PRD's human-control principle at the interface level, not just in the backend.
8. **Design for interrupted sessions.** Because connectivity may drop mid-action, every multi-step flow (submission, grading, account creation) preserves partial input locally and can resume — never forces a user to redo work because a network call failed midway.

---

*This document is derived from [PRD.md](./PRD.md), [architecture.md](./architecture.md), and [database-design.md](./database-design.md), and implements the Ministry's UI/UX Flow Prompt. It completes the four-document TVET e-Gateway planning set.*
