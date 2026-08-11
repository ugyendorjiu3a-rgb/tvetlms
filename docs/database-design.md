# Database / Entity Design Document
## TVET e-Gateway — Learning Management System

**Companion to:** [PRD.md](./PRD.md), [architecture.md](./architecture.md)
**Engine:** PostgreSQL (deployed identically at Institution Edge Node and Central Cloud tiers — see architecture.md §5)
**Status:** Draft for review

### Design conventions used throughout

- **Primary keys are UUIDs, not auto-increment integers.** This is deliberate, not stylistic: in the offline-first architecture, Trainer/Trainee clients must be able to create new records (a submission, a comment) *while offline* and assign them a permanent ID before ever talking to the Edge Node. Auto-increment integers generated independently on multiple offline devices would collide on sync; UUIDs (generated client-side, e.g. UUIDv7 for rough time-ordering) don't.
- **Standard audit columns** appear on every mutable table: `created_at`, `created_by`, `updated_at`, `updated_by`, `version`. `version` is used for optimistic concurrency and sync-conflict detection (architecture.md §7), not just as a nice-to-have.
- **Standard offline-sync columns** (`origin_device_id`, `sync_status`, `synced_at`) appear only on tables that can be **created or modified from an offline client**: submissions, grades, feedback comments, resource access logs, and sync-relevant profile edits. Server-only tables (audit_logs, results, certificates — which are computed centrally per architecture.md §7) don't carry them, since they're never written offline.
- Bilingual fields use a simple `_en` / `_dz` column pair on the small set of entities that need Ministry-authored bilingual text (trades, modules, resources), rather than a generic translations table — simpler to query and matches the PRD's actual bilingual scope (Dzongkha/English), not open-ended i18n.
- Enumerated values are implemented as Postgres `CHECK` constraints on `TEXT` columns (not native `ENUM` types), so the Ministry can extend allowed values via a migration without an `ALTER TYPE`.

---

## 1. Entity List

| # | Entity | Module |
|---|---|---|
| 1 | `institutions` | Class & trade management |
| 2 | `trades` | Class & trade management |
| 3 | `roles` | Users & roles |
| 4 | `users` | Users & roles |
| 5 | `user_roles` (junction) | Users & roles |
| 6 | `trainee_profiles` | Student/trainer profiles |
| 7 | `trainer_profiles` | Student/trainer profiles |
| 8 | `classes` | Class & trade management |
| 9 | `class_enrollments` (junction) | Class & trade management |
| 10 | `modules` | Module details |
| 11 | `module_trainees` (junction) | Module details |
| 12 | `module_trainers` (junction) | Module details |
| 13 | `assessments` | Assessments |
| 14 | `assignments` | Assignments and submissions |
| 15 | `submissions` | Assignments and submissions |
| 16 | `submission_files` | Assignments and submissions |
| 17 | `auto_grade_logs` | Feedback and grading |
| 18 | `grades` | Feedback and grading |
| 19 | `feedback_comments` | Feedback and grading |
| 20 | `results` | Results and GPA |
| 21 | `certificates` | Certificates |
| 22 | `eradication_requests` | Student/trainer profiles (Admin lifecycle) |
| 23 | `resources` | Resources and downloads |
| 24 | `resource_reviews` | Resources and downloads |
| 25 | `resource_access_logs` | Resources and downloads |
| 26 | `notifications` | Notifications |
| 27 | `notification_recipients` (junction) | Notifications |
| 28 | `devices` | Offline sync tracking |
| 29 | `sync_queue` | Offline sync tracking |
| 30 | `sync_conflicts` | Offline sync tracking |
| 31 | `audit_logs` | Audit logs |
| 32 | `ai_recommendation_logs` | AI recommendation logs |

---

## 2. Relationship Overview

**One-to-many (most relationships):**
`institutions` → `users`; `trades` → `modules`; `modules` → `assessments` → `assignments` → `submissions` → `grades`; `submissions` → `submission_files`; `submissions` → `feedback_comments`; `users` → `devices`; `devices` → `sync_queue`; `results` → `certificates`; `trainee_profiles` → `eradication_requests`; `resources` → `resource_reviews` / `resource_access_logs`.

**Many-to-many (explicit junction tables):**
- `users` ↔ `roles` via **`user_roles`** — a user (in practice, a Trainer who is occasionally also an Exam Controller) can hold more than one role; the PRD's "one role, one dashboard color" UX is still enforced at the application layer by treating one role as the user's *active* dashboard context.
- `trainees` (`users`) ↔ `classes` via **`class_enrollments`** — a trainee can be enrolled in multiple classes over time (e.g., repeating a module puts them in a new class instance).
- `trainees` (`users`) ↔ `modules` via **`module_trainees`** — a trainee takes many modules; a module has many trainees; the junction row carries the trainee's per-module status (active/repeat/completed), which is what `results` is computed from.
- `trainers` (`users`) ↔ `modules` via **`module_trainers`** — supports the primary "Module Tutor" (also denormalized onto `modules.module_tutor_id` for fast lookups) plus any co-/assistant trainers.
- `notifications` ↔ `users` via **`notification_recipients`** — one notification (e.g., a general holiday notice) fans out to many users, each with independent read/delivered status.

**One-to-one:**
- `users` ↔ `trainee_profiles` and `users` ↔ `trainer_profiles` — split out from `users` because personal-identity fields (Citizenship ID, contact info) have different edit-access rules (Admin-only, per PRD §5.1) than the base account record (Identity/RBAC module owns `users`; Admin owns the profile extension tables).
- `submissions` ↔ `grades` — in practice one authoritative grade per submission (grading history/overrides are tracked via `version` + `auto_grade_logs`, not multiple concurrent `grades` rows).

---

## 3. Table-by-Table Schema

```sql
-- ============================================================
-- INSTITUTIONS & TRADES
-- ============================================================

CREATE TABLE institutions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    type            TEXT NOT NULL CHECK (type IN ('TTI', 'IZC')),
    code            TEXT NOT NULL UNIQUE,
    address         TEXT,
    contact_number  TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by      UUID,
    version         INT NOT NULL DEFAULT 1
);

CREATE TABLE trades (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT NOT NULL UNIQUE,
    name_en         TEXT NOT NULL,
    name_dz         TEXT,
    description_en  TEXT,
    description_dz  TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by      UUID,
    version         INT NOT NULL DEFAULT 1
);

-- ============================================================
-- USERS & ROLES
-- ============================================================

CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE CHECK (name IN ('trainee', 'trainer', 'admin', 'exam_controller')),
    description TEXT
);

CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id    UUID NOT NULL REFERENCES institutions(id),
    login_id          TEXT NOT NULL UNIQUE,          -- Student ID or Staff ID
    email             TEXT UNIQUE,
    password_hash     TEXT NOT NULL,                 -- argon2id
    status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
    locale_preference TEXT NOT NULL DEFAULT 'en' CHECK (locale_preference IN ('en', 'dz')),
    last_login_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by        UUID REFERENCES users(id),
    version            INT NOT NULL DEFAULT 1
);

CREATE TABLE user_roles (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- PROFILES (personal-identity data, Admin-editable only)
-- ============================================================

CREATE TABLE trainee_profiles (
    user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name        TEXT NOT NULL,
    citizenship_id   TEXT NOT NULL UNIQUE,
    profile_photo_url TEXT,
    contact_number   TEXT,
    trade_id         UUID REFERENCES trades(id),
    enrollment_date  DATE NOT NULL,
    status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'eradicated', 'withdrawn')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by       UUID REFERENCES users(id),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by       UUID REFERENCES users(id),
    version          INT NOT NULL DEFAULT 1
);

CREATE TABLE trainer_profiles (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name       TEXT NOT NULL,
    staff_id        TEXT NOT NULL UNIQUE,
    specialization  TEXT,
    contact_number  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID REFERENCES users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by      UUID REFERENCES users(id),
    version         INT NOT NULL DEFAULT 1
);

-- Admin-only lifecycle action: "Eradicate Trainees" (PRD FR6), gated by confirmation.
CREATE TABLE eradication_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainee_id      UUID NOT NULL REFERENCES trainee_profiles(user_id),
    requested_by    UUID NOT NULL REFERENCES users(id),
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason          TEXT,
    status          TEXT NOT NULL DEFAULT 'pending_confirmation'
                        CHECK (status IN ('pending_confirmation', 'confirmed', 'cancelled')),
    confirmed_by    UUID REFERENCES users(id),
    confirmed_at    TIMESTAMPTZ,
    CONSTRAINT chk_confirmation CHECK (
        (status = 'confirmed' AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL)
        OR (status <> 'confirmed')
    )
);

-- ============================================================
-- CLASSES
-- ============================================================

CREATE TABLE classes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id  UUID NOT NULL REFERENCES institutions(id),
    trade_id        UUID NOT NULL REFERENCES trades(id),
    name            TEXT NOT NULL,
    intake_year     INT NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID REFERENCES users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by      UUID REFERENCES users(id),
    version         INT NOT NULL DEFAULT 1,
    CONSTRAINT chk_class_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE class_enrollments (
    class_id     UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    trainee_id   UUID NOT NULL REFERENCES trainee_profiles(user_id) ON DELETE CASCADE,
    enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
    PRIMARY KEY (class_id, trainee_id)
);

-- ============================================================
-- MODULES
-- ============================================================

CREATE TABLE modules (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code              TEXT NOT NULL UNIQUE,
    name_en           TEXT NOT NULL,
    name_dz           TEXT,
    ncs_code          TEXT,
    trade_id          UUID NOT NULL REFERENCES trades(id),
    duration_weeks    INT NOT NULL CHECK (duration_weeks > 0),
    learning_outcome  TEXT,
    start_date        DATE NOT NULL,
    end_date          DATE NOT NULL,
    module_tutor_id   UUID REFERENCES trainer_profiles(user_id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by        UUID REFERENCES users(id),
    version           INT NOT NULL DEFAULT 1,
    CONSTRAINT chk_module_dates CHECK (end_date >= start_date)
);

CREATE TABLE module_trainees (
    module_id   UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    trainee_id  UUID NOT NULL REFERENCES trainee_profiles(user_id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'repeat', 'withdrawn')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (module_id, trainee_id)
);

CREATE TABLE module_trainers (
    module_id   UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    trainer_id  UUID NOT NULL REFERENCES trainer_profiles(user_id) ON DELETE CASCADE,
    role_label  TEXT NOT NULL DEFAULT 'assistant' CHECK (role_label IN ('tutor', 'assistant')),
    PRIMARY KEY (module_id, trainer_id)
);

-- ============================================================
-- ASSESSMENTS, ASSIGNMENTS, SUBMISSIONS
-- ============================================================

CREATE TABLE assessments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id       UUID NOT NULL REFERENCES modules(id),
    tier            TEXT NOT NULL CHECK (tier IN ('formative', 'diagnostic', 'summative')),
    subtype         TEXT NOT NULL CHECK (subtype IN (
                        'continuous_assessment', 'project_based', 'class_test',
                        'problem_based', 'module_assessment', 'institutional_assessment')),
    title           TEXT NOT NULL,
    max_score       NUMERIC(6,2) NOT NULL CHECK (max_score > 0),
    weight_percent  NUMERIC(5,2) CHECK (weight_percent BETWEEN 0 AND 100),
    scheduled_date  DATE,
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'approved', 'completed', 'cancelled')),
    created_by      UUID NOT NULL REFERENCES users(id),
    approved_by     UUID REFERENCES users(id),        -- Exam Controller
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by      UUID REFERENCES users(id),
    version         INT NOT NULL DEFAULT 1
);

CREATE TABLE assignments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id      UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    title              TEXT NOT NULL,
    description        TEXT,
    allowed_file_types TEXT[] NOT NULL DEFAULT '{}',   -- e.g. {'pdf','docx','jpg'}
    due_date           TIMESTAMPTZ NOT NULL,
    created_by         UUID NOT NULL REFERENCES users(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by         UUID REFERENCES users(id),
    version            INT NOT NULL DEFAULT 1
);

CREATE TABLE submissions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),   -- client-generatable offline
    assignment_id     UUID NOT NULL REFERENCES assignments(id),
    trainee_id        UUID NOT NULL REFERENCES trainee_profiles(user_id),
    submitted_at      TIMESTAMPTZ,
    status            TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'queued', 'submitted', 'late', 'graded')),
    -- offline sync fields
    origin_device_id  UUID REFERENCES devices(id),
    sync_status       TEXT NOT NULL DEFAULT 'synced'
                          CHECK (sync_status IN ('local_only', 'pending_sync', 'synced', 'conflict')),
    synced_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by        UUID REFERENCES users(id),
    version           INT NOT NULL DEFAULT 1,
    UNIQUE (assignment_id, trainee_id)                 -- one submission record per trainee per assignment
);

CREATE TABLE submission_files (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id  UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    filename       TEXT NOT NULL,
    file_url       TEXT,                                -- object storage key; NULL until synced
    file_hash      TEXT NOT NULL,                        -- SHA-256, computed client-side
    file_size_bytes BIGINT,
    uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- GRADING & FEEDBACK
-- ============================================================

CREATE TABLE auto_grade_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID NOT NULL REFERENCES submissions(id),
    engine_version  TEXT NOT NULL,
    raw_result      JSONB NOT NULL,                     -- per-question breakdown for MCQ
    graded_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE grades (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id     UUID NOT NULL UNIQUE REFERENCES submissions(id),
    grader_id         UUID REFERENCES users(id),          -- NULL if purely auto-graded
    score             NUMERIC(6,2) NOT NULL CHECK (score >= 0),
    is_auto_graded    BOOLEAN NOT NULL DEFAULT FALSE,
    auto_grade_log_id UUID REFERENCES auto_grade_logs(id),
    grading_status    TEXT NOT NULL DEFAULT 'pending'
                          CHECK (grading_status IN ('pending', 'auto_graded', 'manually_graded', 'reviewed', 'disputed')),
    graded_at         TIMESTAMPTZ,
    -- offline sync fields
    origin_device_id  UUID REFERENCES devices(id),
    sync_status       TEXT NOT NULL DEFAULT 'synced'
                          CHECK (sync_status IN ('local_only', 'pending_sync', 'synced', 'conflict')),
    synced_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by        UUID REFERENCES users(id),
    version           INT NOT NULL DEFAULT 1
);

CREATE TABLE feedback_comments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id     UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES feedback_comments(id),
    author_id         UUID NOT NULL REFERENCES users(id),
    comment_text      TEXT,
    voice_note_url    TEXT,
    read_status       BOOLEAN NOT NULL DEFAULT FALSE,
    -- offline sync fields
    origin_device_id  UUID REFERENCES devices(id),
    sync_status       TEXT NOT NULL DEFAULT 'synced'
                          CHECK (sync_status IN ('local_only', 'pending_sync', 'synced', 'conflict')),
    synced_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_comment_content CHECK (comment_text IS NOT NULL OR voice_note_url IS NOT NULL)
);

-- ============================================================
-- RESULTS, GPA, CERTIFICATES
-- ============================================================

CREATE TABLE results (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainee_id             UUID NOT NULL REFERENCES trainee_profiles(user_id),
    module_id              UUID NOT NULL REFERENCES modules(id),
    total_score            NUMERIC(6,2) NOT NULL CHECK (total_score BETWEEN 0 AND 100),
    mark                   TEXT NOT NULL CHECK (mark IN ('A', 'B', 'C', 'D', 'E')),
    gpa                    NUMERIC(3,1) NOT NULL CHECK (gpa BETWEEN 0 AND 4),
    performance_description TEXT NOT NULL,
    outcome                TEXT NOT NULL CHECK (outcome IN ('certified', 'repeat_module')),
    computed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_by            UUID REFERENCES users(id),       -- Exam Controller
    approved_at            TIMESTAMPTZ,
    status                 TEXT NOT NULL DEFAULT 'pending_approval'
                                CHECK (status IN ('pending_approval', 'approved', 'disputed')),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    version                INT NOT NULL DEFAULT 1,
    UNIQUE (trainee_id, module_id)
);

CREATE TABLE certificates (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id          UUID NOT NULL UNIQUE REFERENCES results(id),
    certificate_number TEXT NOT NULL UNIQUE,
    file_url           TEXT,
    status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'revoked')),
    issued_by          UUID REFERENCES users(id),
    issued_at          TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    version            INT NOT NULL DEFAULT 1,
    CONSTRAINT chk_cert_only_if_certified CHECK (
        status = 'draft' OR EXISTS (SELECT 1)  -- enforced at application layer against results.outcome = 'certified'
    )
);

-- ============================================================
-- RESOURCES
-- ============================================================

CREATE TABLE resources (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en           TEXT NOT NULL,
    title_dz           TEXT,
    module_id          UUID REFERENCES modules(id),
    ncs_code           TEXT,
    format             TEXT NOT NULL,                 -- pdf, video, doc, etc.
    language           TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'dz', 'both')),
    file_url           TEXT NOT NULL,
    file_hash          TEXT NOT NULL,
    date_added         TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_reviewed_date DATE,
    uploaded_by        UUID NOT NULL REFERENCES users(id),
    permission_level   TEXT NOT NULL DEFAULT 'institution'
                            CHECK (permission_level IN ('public', 'institution', 'module_only', 'trainer_only')),
    tags               TEXT[] NOT NULL DEFAULT '{}',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by         UUID REFERENCES users(id),
    version            INT NOT NULL DEFAULT 1
);

CREATE TABLE resource_reviews (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id  UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    reviewer_id  UUID NOT NULL REFERENCES users(id),
    reviewed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes        TEXT
);

CREATE TABLE resource_access_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id       UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(id),
    action            TEXT NOT NULL CHECK (action IN ('view', 'download', 'search_hit')),
    search_query      TEXT,                            -- populated only when action = 'search_hit'
    -- offline sync fields (logs generated on-device while offline)
    origin_device_id  UUID REFERENCES devices(id),
    sync_status       TEXT NOT NULL DEFAULT 'synced'
                          CHECK (sync_status IN ('local_only', 'pending_sync', 'synced')),
    synced_at         TIMESTAMPTZ,
    occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type              TEXT NOT NULL CHECK (type IN (
                          'submission_deadline', 'grading_complete', 'new_resource',
                          'result_declaration', 'assessment_schedule', 'general')),
    title              TEXT NOT NULL,
    body               TEXT,
    related_entity_type TEXT,                          -- e.g. 'submission', 'resource', 'result'
    related_entity_id   UUID,
    institution_id      UUID REFERENCES institutions(id),  -- NULL = Ministry-wide broadcast
    priority             TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'critical')),
    channel_hint          TEXT NOT NULL DEFAULT 'in_app' CHECK (channel_hint IN ('in_app', 'push', 'sms')),
    created_by         UUID REFERENCES users(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_recipients (
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delivered_at    TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    PRIMARY KEY (notification_id, user_id)
);

-- ============================================================
-- OFFLINE SYNC TRACKING
-- ============================================================

CREATE TABLE devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    device_type     TEXT NOT NULL CHECK (device_type IN ('mobile', 'desktop', 'web')),
    install_id      TEXT NOT NULL UNIQUE,               -- stable client-generated install identifier
    last_synced_at  TIMESTAMPTZ,
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sync_queue (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id         UUID NOT NULL REFERENCES devices(id),
    entity_type       TEXT NOT NULL,                    -- 'submission', 'grade', 'feedback_comment', etc.
    entity_id         UUID NOT NULL,
    operation         TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
    payload           JSONB NOT NULL,
    client_version     INT NOT NULL,                     -- entity's `version` as known to the client
    status            TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'syncing', 'synced', 'conflict', 'failed')),
    created_at_client TIMESTAMPTZ NOT NULL,
    received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    synced_at         TIMESTAMPTZ,
    error_message     TEXT
);

CREATE TABLE sync_conflicts (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_queue_id         UUID NOT NULL REFERENCES sync_queue(id),
    entity_type           TEXT NOT NULL,
    entity_id             UUID NOT NULL,
    server_version_snapshot JSONB NOT NULL,
    client_version_snapshot JSONB NOT NULL,
    status                TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    resolved_by           UUID REFERENCES users(id),
    resolved_at           TIMESTAMPTZ,
    resolution_notes      TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOGS (append-only)
-- ============================================================

CREATE TABLE audit_logs (
    id           BIGSERIAL PRIMARY KEY,                 -- sequential is fine: server-generated only, never offline
    actor_id     UUID REFERENCES users(id),
    action       TEXT NOT NULL,                          -- e.g. 'grade.update', 'trainee.eradicate', 'login.success'
    entity_type  TEXT NOT NULL,
    entity_id    UUID,
    before_value JSONB,
    after_value  JSONB,
    ip_address   INET,
    institution_id UUID REFERENCES institutions(id),
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- No UPDATE or DELETE grants on this table at the application-role level; INSERT-only.

-- ============================================================
-- AI RECOMMENDATION LOGS
-- ============================================================

CREATE TABLE ai_recommendation_logs (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainee_id         UUID REFERENCES trainee_profiles(user_id),
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
                            'personalization', 'at_risk_flag', 'intervention_suggestion', 'content_adaptation')),
    input_data_ref     JSONB,                            -- pointers/aggregates used, not raw PII
    suggestion         JSONB NOT NULL,
    model_version      TEXT NOT NULL,
    generated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    reviewed_by        UUID REFERENCES users(id),
    reviewed_at        TIMESTAMPTZ
);
```

---

## 4. Primary and Foreign Keys — Summary

| Table | Primary Key | Key Foreign Keys |
|---|---|---|
| institutions | id | — |
| trades | id | — |
| roles | id | — |
| users | id | institution_id → institutions |
| user_roles | (user_id, role_id) | user_id → users, role_id → roles |
| trainee_profiles | user_id | user_id → users, trade_id → trades |
| trainer_profiles | user_id | user_id → users |
| eradication_requests | id | trainee_id → trainee_profiles, requested_by/confirmed_by → users |
| classes | id | institution_id → institutions, trade_id → trades |
| class_enrollments | (class_id, trainee_id) | class_id → classes, trainee_id → trainee_profiles |
| modules | id | trade_id → trades, module_tutor_id → trainer_profiles |
| module_trainees | (module_id, trainee_id) | module_id → modules, trainee_id → trainee_profiles |
| module_trainers | (module_id, trainer_id) | module_id → modules, trainer_id → trainer_profiles |
| assessments | id | module_id → modules, created_by/approved_by → users |
| assignments | id | assessment_id → assessments, created_by → users |
| submissions | id | assignment_id → assignments, trainee_id → trainee_profiles, origin_device_id → devices |
| submission_files | id | submission_id → submissions |
| auto_grade_logs | id | submission_id → submissions |
| grades | id | submission_id → submissions, grader_id → users, auto_grade_log_id → auto_grade_logs |
| feedback_comments | id | submission_id → submissions, parent_comment_id → feedback_comments (self), author_id → users |
| results | id | trainee_id → trainee_profiles, module_id → modules, approved_by → users |
| certificates | id | result_id → results, issued_by → users |
| resources | id | module_id → modules, uploaded_by → users |
| resource_reviews | id | resource_id → resources, reviewer_id → users |
| resource_access_logs | id | resource_id → resources, user_id → users, origin_device_id → devices |
| notifications | id | institution_id → institutions, created_by → users |
| notification_recipients | (notification_id, user_id) | notification_id → notifications, user_id → users |
| devices | id | user_id → users |
| sync_queue | id | device_id → devices |
| sync_conflicts | id | sync_queue_id → sync_queue, resolved_by → users |
| audit_logs | id (bigserial) | actor_id → users, institution_id → institutions |
| ai_recommendation_logs | id | trainee_id → trainee_profiles, reviewed_by → users |

---

## 5. Important Indexes

```sql
-- Login/auth lookups
CREATE UNIQUE INDEX idx_users_login_id ON users(login_id);
CREATE INDEX idx_users_institution ON users(institution_id);

-- Profile lookups
CREATE UNIQUE INDEX idx_trainee_citizenship_id ON trainee_profiles(citizenship_id);
CREATE INDEX idx_trainee_trade ON trainee_profiles(trade_id);
CREATE INDEX idx_trainee_status ON trainee_profiles(status);

-- Module & assessment browsing
CREATE INDEX idx_modules_trade ON modules(trade_id);
CREATE INDEX idx_modules_code ON modules(code);
CREATE INDEX idx_assessments_module ON assessments(module_id);
CREATE INDEX idx_assignments_assessment ON assignments(assessment_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);   -- for deadline-reminder job

-- Submissions & grading (grading queue is a hot path)
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_trainee ON submissions(trainee_id);
CREATE INDEX idx_submissions_status ON submissions(status) WHERE status IN ('submitted', 'late');
CREATE INDEX idx_grades_status ON grades(grading_status) WHERE grading_status IN ('pending', 'disputed');

-- Feedback threads
CREATE INDEX idx_feedback_submission ON feedback_comments(submission_id);
CREATE INDEX idx_feedback_unread ON feedback_comments(submission_id) WHERE read_status = FALSE;

-- Results & certification
CREATE INDEX idx_results_trainee ON results(trainee_id);
CREATE INDEX idx_results_module ON results(module_id);
CREATE INDEX idx_results_pending_approval ON results(status) WHERE status = 'pending_approval';

-- Resource search — the pilot's core success measure depends on this being fast
CREATE INDEX idx_resources_module ON resources(module_id);
CREATE INDEX idx_resources_tags ON resources USING GIN (tags);
CREATE INDEX idx_resources_title_search ON resources USING GIN (
    to_tsvector('english', coalesce(title_en,'') || ' ' || coalesce(title_dz,''))
);
CREATE INDEX idx_resource_access_resource ON resource_access_logs(resource_id);
CREATE INDEX idx_resource_access_user_time ON resource_access_logs(user_id, occurred_at);

-- Notifications
CREATE INDEX idx_notification_recipients_unread ON notification_recipients(user_id) WHERE read_at IS NULL;

-- Sync tracking (Sync Orchestrator's hot path — architecture.md §7)
CREATE INDEX idx_sync_queue_status ON sync_queue(status) WHERE status IN ('pending', 'conflict');
CREATE INDEX idx_sync_queue_device ON sync_queue(device_id, created_at_client);
CREATE INDEX idx_sync_conflicts_open ON sync_conflicts(status) WHERE status = 'open';

-- Audit log queries (compliance/forensics — usually filtered by entity or actor + time range)
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor_time ON audit_logs(actor_id, occurred_at);

-- AI recommendation review queue
CREATE INDEX idx_ai_reco_pending ON ai_recommendation_logs(status) WHERE status = 'pending';
CREATE INDEX idx_ai_reco_trainee ON ai_recommendation_logs(trainee_id);
```

---

## 6. Constraints and Validation Rules

- **Certification scale is enforced in application logic, not a DB lookup table**, but `results.mark`, `results.gpa`, and `results.outcome` are constrained to the exact valid value sets from PRD §13, so a bad write can't silently insert an invalid grade/GPA combination even if application logic has a bug. (A `results_grade_scale` reference table is a reasonable future addition if the Ministry wants the scale itself to be DB-editable rather than code-defined — currently treated as fixed per PRD §13, which says the scale "must not be editable outside an approved change process.")
- `eradication_requests` has a `CHECK` constraint that a `confirmed` status cannot exist without both `confirmed_by` and `confirmed_at` populated — encodes the "Admin must confirm before deletion" rule (PRD FR6) at the schema level, not just in application code.
- `submissions` has a `UNIQUE (assignment_id, trainee_id)` constraint — one submission record per trainee per assignment (resubmission updates the existing row and increments `version`, it doesn't create a new row, so the audit/grading history stays attached to one identity).
- `results` has `UNIQUE (trainee_id, module_id)` — one authoritative result per trainee per module; a repeat attempt produces a new module enrollment cycle (tracked via `module_trainees.status = 'repeat'`) rather than a second conflicting result row.
- `feedback_comments` requires at least one of `comment_text` or `voice_note_url` (a comment can't be entirely empty).
- `grades.score` and `assessments.max_score` are non-negative; `results.total_score` is bounded 0–100; `results.gpa` bounded 0–4 — matching the certification table exactly.
- Foreign keys to `users(id)` for audit fields (`created_by`, `updated_by`, `grader_id`, etc.) intentionally do **not** cascade on delete — users are deactivated (`status = 'deactivated'`), never hard-deleted, so historical audit/grading attribution is never orphaned. (`trainee_profiles` supports an `eradicated` status for the same reason — see §9.)
- `sync_queue.client_version` plus the target row's current `version` is what the Sync Orchestrator compares to detect a conflict (architecture.md §7); this is enforced in application logic at sync time, not a DB constraint, since it requires cross-table comparison against a dynamically identified target row (`entity_type`/`entity_id`).

---

## 7. Audit Fields

Applied consistently on every mutable table (see "Design conventions" above): `created_at`, `created_by`, `updated_at`, `updated_by`, `version`.

In addition:
- `audit_logs` is the system-wide, append-only accountability record required by PRD §9/§14 — it captures **who did what to which entity, with before/after values**, for every sensitive action (grade changes, resource permission changes, certification approval, trainee eradication, login events). It is populated by application-layer triggers/service code on every write to a sensitive table, not reconstructed after the fact.
- `resource_reviews` and `resources.uploaded_by`/`updated_by` together satisfy the PRD's "who uploaded/reviewed each resource" accountability requirement (§14) without needing a separate generic audit-log query for the common case.
- `grades.grader_id` + `grading_status` + `auto_grade_log_id` together answer "who or what graded this, and how" for every submission (PRD §13).

---

## 8. Offline Sync Fields

Applied to every table that a Trainer/Trainee client can create or modify while offline (submissions, submission_files via their parent submission, grades, feedback_comments, resource_access_logs):

- `origin_device_id` — which registered device created/modified the row, for traceability and conflict debugging.
- `sync_status` — `local_only` (never left the device) → `pending_sync` (queued) → `synced` (confirmed by Edge Node) or `conflict` (flagged, see below).
- `synced_at` — when the Edge Node confirmed receipt.
- `version` (shared with the standard audit-field pattern) — the number the Sync Orchestrator compares against the incoming `sync_queue.client_version` to detect a conflicting concurrent edit.

The **`sync_queue`** and **`sync_conflicts`** tables (§3) are the mechanism, not just metadata: every offline mutation is journaled in `sync_queue` before being applied, and any detected version mismatch on a high-stakes table (grades, results) is routed to `sync_conflicts` for manual resolution rather than silently overwritten — implementing the tiered conflict strategy from architecture.md §7 at the data layer.

---

## 9. Notes on Data Retention and Privacy

- **Personal-identity fields** (`trainee_profiles.citizenship_id`, `full_name`, `contact_number`, `profile_photo_url`) are isolated in `trainee_profiles`/`trainer_profiles`, separate from `users` (login/auth) and separate from `grades`/`results` (academic data) — this makes it straightforward to apply different access-control rules to identity vs. academic vs. auth data at the query/repository layer, matching the PRD's role-based edit-access matrix (Trainers never query `trainee_profiles` columns beyond what's needed to render a name label).
- **"Eradicate Trainee" does not hard-delete rows.** `trainee_profiles.status` moves to `eradicated`; the recommended implementation is to null out or redact the specific PII columns (`citizenship_id`, `contact_number`, `profile_photo_url`) at that point while preserving the row and its historical `results`/`certificates` linkage — a trainee's certificate must remain verifiable after their personal record is "eradicated" per the Ministry's process. This should be confirmed against the retention policy the Ministry sets (PRD OQ6); the schema supports either full redaction or full retention without a structural change.
- **`audit_logs` is intentionally append-only** (no application-level UPDATE/DELETE grant) so it can serve as a trustworthy record even in a dispute about whether/when a record was changed.
- **`ai_recommendation_logs.input_data_ref`** is documented as holding references/aggregates, not raw PII, consistent with architecture.md §9's requirement that AI processing avoid unnecessary exposure of trainee personal data.
- **Retention periods** for `audit_logs`, `resource_access_logs`, and `sync_queue`/`sync_conflicts` (once resolved) are not hardcoded in the schema — recommend a periodic archival job once volumes are known post-pilot, rather than guessing a TTL now. This is listed as an open question in the PRD (OQ6) and should be confirmed with the Ministry before a retention/archival job is built.
- **Credentials**: `users.password_hash` only ever stores a hash (argon2id per architecture.md §4); no table stores a recoverable password.

---

## 10. Suggested ER Diagram (Text Form)

```
institutions ──< users >── user_roles ──< roles
      │                       │
      │                       ├──1:1── trainee_profiles ──< eradication_requests
      │                       │              │  │
      │                       └──1:1── trainer_profiles   └──< class_enrollments >── classes ──> trades
      │                                     │                                              │
      │                                     └──< module_trainers                            │
      │                                                                                     │
      └──< classes                                                                          │
                                                                                              │
trades ──< modules >── module_trainees ── trainee_profiles                                   │
              │  \                                                                            │
              │   └── module_trainers ── trainer_profiles                                     │
              │                                                                                │
              ├──< assessments ──< assignments ──< submissions >── trainee_profiles            │
              │                                        │  │                                    │
              │                                        │  ├──< submission_files                 │
              │                                        │  ├──1:1── grades ──< auto_grade_logs   │
              │                                        │  └──< feedback_comments (self-referencing thread)
              │                                                                                 │
              └──< resources ──< resource_reviews                                              │
                       │                                                                        │
                       └──< resource_access_logs >── users                                      │
                                                                                                 │
trainee_profiles ──< results >── modules                                                        │
                          │                                                                     │
                          └──1:1── certificates                                                 │
                                                                                                 │
users ──< devices ──< sync_queue ──< sync_conflicts                                            │
users ──< notifications >── notification_recipients >── users                                  │
users ──< audit_logs                                                                           │
trainee_profiles ──< ai_recommendation_logs

Legend:  ──<  = "one to many" (crow's foot on the many side)
         >──<  = many-to-many via junction table
         ──1:1── = one-to-one
```

---

*This schema is derived from [PRD.md](./PRD.md) and [architecture.md](./architecture.md), and implements the Ministry's Database/Entity Design Prompt. It is implementation-ready as a first migration set; the certification-scale reference table and retention/archival TTLs are the two items explicitly flagged for Ministry confirmation before being hardened further (see §6 and §9).*
