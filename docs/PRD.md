# Product Requirements Document (PRD)
## TVET e-Gateway — Learning Management System for TTIs & IZCs

**Owner:** Department of Workforce Planning & Skills Development, Ministry of Education & Skills Development
**Version:** Draft v1.0 (TeG 1.00 scope)
**Status:** Draft for review

---

## 1. Executive Summary

TVET e-Gateway (the "LMS") is a unified, AI-assisted Learning Management System for Technical Training Institutes (TTIs) and Institutes for Zorig Chusum (IZCs) under the Ministry of Education & Skills Development (MoESD). It replaces manual, paper-based, and fragmented digital processes with a single platform covering trainee/trainer administration, module and resource management, assessment and grading, certification, reporting, and communication.

The system is designed for national-standard vocational training delivery: bilingual content, offline-first operation for low-connectivity campuses, role-based dashboards for four user types (Trainer, Trainee, Admin, Exam Controller), and AI-assisted personalization and administration with mandatory human oversight on governance, grading disputes, and disciplinary matters.

The initial rollout is a **30-day pilot**: digitizing one department at a single TTI, validating resource search/tagging accuracy and the transparency dashboard with a small group of trainers and trainees, before scaling to ~1,500 users and ~25 TB of institutional storage nationally.

---

## 2. Problem Statement

TTIs and IZCs currently lack a unified Learning Management System. Training delivery depends on manual record-keeping and scattered tools (spreadsheets, paper registers, ad-hoc messaging, physical resource libraries). This causes:

- **No blended learning path** — trainers cannot combine in-person practical training with digital content delivery, assessment, or tracking.
- **Inefficiency** — locating a resource, verifying a trainee's status, or compiling institutional KPIs takes days of manual cross-referencing rather than minutes.
- **Inconsistency** — grading, certification, and record-keeping practices vary by trainer and institution, undermining trust in outcomes and complicating national reporting.
- **No accountability trail** — there is no reliable audit trail of who uploaded, reviewed, graded, or changed what, when.
- **No early-warning capability** — at-risk trainees are identified late, if at all, because there is no continuous, cross-module view of trainee performance.

Without a common platform, TTIs and IZCs cannot modernize training delivery or credibly demonstrate compliance with national TVET standards to the Ministry.

---

## 3. Goals and Non-Goals

### 3.1 Goals
- G1: Provide one platform for trainee/trainer records, module delivery, assessment, grading, and certification across all TTIs and IZCs.
- G2: Reduce time-to-locate a resource from days to minutes via structured metadata, tagging, and search.
- G3: Enable blended and offline-first learning so connectivity is not a barrier to access.
- G4: Digitize assessment, grading, and certification with a transparent, standardized criteria model.
- G5: Give institutional and Ministry stakeholders real-time dashboards on trainee progress, resource usage, and compliance KPIs.
- G6: Use AI to personalize learning and automate administrative overhead, while keeping humans in control of governance, mentorship, validation, and disciplinary decisions.
- G7: Protect trainee and institutional data with clear access control and accountability records.
- G8: Prove the model via a scoped 30-day pilot before national scale-up to ~1,500 users / ~25 TB.

### 3.2 Non-Goals (for this phase)
- NG1: Not building a full HR/payroll system for TTI/IZC staff.
- NG2: Not replacing the Ministry's national student information system (SIS) or examinations board systems of record — the LMS integrates with these where applicable, it does not supersede them.
- NG3: Not providing live video conferencing/synchronous virtual classrooms in v1 (offline-first, low-connectivity focus takes priority over live streaming).
- NG4: Not automating final disciplinary, policy, or certification-dispute decisions — these remain human-owned (see §16).
- NG5: Not supporting institutions outside the TVET network (e.g., general secondary schools) in this phase.

---

## 4. User Personas and Roles

The system defines **four primary roles**, each with its own login credentials and a distinct dashboard color/theme for quick visual identification.

### 4.1 Trainee (Student)
- Vocational trainee enrolled in one or more modules/trades at a TTI or IZC.
- Needs: view module content and schedule, submit assignments, download resources for offline use, view grades/feedback, track progress toward certification, receive notifications.
- Edit rights: own personal profile fields only (not scores/grades).

### 4.2 Trainer
- Instructor responsible for one or more modules within a trade.
- Needs: manage module content, set assignments/assessments, grade submissions (manual or reviewed auto-grade), give feedback (text/voice), track class-level and individual progress, view/edit only score-related data for their trainees (not trainees' personal identity data).
- Edit rights: assessment scores and feedback for their own modules/trainees.

### 4.3 Exam Controller
- Owns assessment integrity, scheduling, and certification sign-off.
- Needs: define/approve assessment schedules, oversee grading consistency across trainers/modules, resolve grading disputes, approve final certification decisions, view institution-wide assessment analytics.
- Edit rights: assessment configuration, certification approval status, dispute resolution records.

### 4.4 Admin
- Institutional/Ministry administrator managing users, modules, resources, and compliance.
- Needs: create/manage user accounts and roles, manage module and resource metadata, view all dashboards, action trainee record deletion (with confirmation safeguard), oversee storage/capacity, manage general notifications (holidays, practical class logistics).
- Edit rights: full access to personal details, module details, and system configuration; the only role permitted to delete/eradicate trainee records, and only with an explicit confirmation step.

### 4.5 Secondary stakeholder: Ministry / Department of Workforce Planning & Skills Development
- Not a daily platform operator, but the consumer of aggregated compliance and KPI reporting across TTIs/IZCs for national policy and planning.

---

## 5. Functional Requirements

### 5.1 Identity & Access
- FR1: Each user has a unique login (Student ID / Staff ID) and credentials issued through an admin-managed credential portal.
- FR2: Role-based access control (RBAC) enforcing the edit-accessibility matrix: Trainers edit scores only; Trainees edit their own personal details only; Admin edits all; Exam Controller edits assessment/certification records.
- FR3: Each role sees a distinctly themed/colored dashboard on login.

### 5.2 Personal & Institutional Records
- FR4: Maintain trainee personal information: Name, Citizenship ID, Profile Photo, Contact Number, Email Address, Trade.
- FR5: Maintain module metadata: Module Name, Module Code, Duration, Learning Outcome, Start/End Date, Module Tutor.
- FR6: Support an "Eradicate Trainee" workflow that removes trainee details upon course completion, gated by explicit Admin confirmation and a pre-action notification to Admin.

### 5.3 Module & Resource Management
- FR7: Store resource metadata: Title, Subject/Module, Format, Date Added, Last-Reviewed Date, NCS Code, Module Code.
- FR8: Store content files (digital originals and digitized/converted hard-copy materials: reference guides, past assessments).
- FR9: Track access & accountability records per resource: uploader/reviewer identity, permission level, update history.
- FR10: Track usage logs: views, downloads, search queries — to identify content gaps and popular content.
- FR11: Support tagging and full-text/metadata search across resources with high tagging accuracy (validated in pilot).

### 5.4 Assignments & Submissions
- FR12: Trainees submit assignments as one or more files; system records filename, timestamp, content hash, and submission status.
- FR13: System enforces allowed file types per assignment.
- FR14: Submission deadlines trigger automated reminder notifications (default: 24 hours before deadline).

### 5.5 Assessment, Grading & Certification
- FR15: Support assessment categories: **Formative** (Continuous Assessment, Project-Based Assessment, Class Test), **Diagnostic** (Problem-Based Assessment, Module Assessment), **Summative** (Institutional Assessment).
- FR16: Auto-grade objective (MCQ) assessments and maintain an auto-grade log.
- FR17: Allow trainers to manually enter/override scores ("punch the score manually") with grading status and grader identity recorded.
- FR18: Apply the standardized certification scale:

  | Points Earned | Mark | GPA | Performance Description | Module Certificate Awarded |
  |---|---|---|---|---|
  | 90–100 | A | 4 | Excellent | Yes |
  | 80–89 | B | 3 | Very Good | Yes |
  | 70–79 | C | 2 | Good | Yes |
  | 60–69 | D | 1 | Satisfactory | Yes |
  | 50–59 | E | 0 | Unsatisfactory | Repeat the module |

- FR19: Exam Controller can review/approve grading and resolve disputes before certification is finalized.
- FR20: Generate module certificates automatically for passing scores, subject to Exam Controller sign-off rules to be confirmed (see §20).

### 5.6 Feedback & Communication
- FR21: Support a comment/feedback thread linked to a specific submission: comment ID, linked submission ID, author, text or voice-note content, timestamp, read/unread status.
- FR22: Support an Assignment Portal, Feedback Portal, and Assessment Schedule as distinct functional areas accessible per role.

### 5.7 Notifications
- FR23: In-app notifications for: submission deadline (24-hour warning), grading complete, new resource uploaded/updated, result declaration, assessment schedule changes, and general notices (holidays, practical class schedule/location).

### 5.8 Dashboards & Reporting
- FR24: Trainee dashboard shows: personal information, module details, assessment overview, summary of results (overall progress as horizontal bar graph, competency chart, module progress chart).
- FR25: Trainer dashboard shows class/module-level progress and grading queue.
- FR26: Admin dashboard shows institutional KPIs, user capacity/storage utilization, and system-wide compliance status.
- FR27: Exam Controller dashboard shows assessment schedules, grading consistency indicators, and certification pipeline status.

### 5.9 AI-Assisted Features
- FR28: Personalize module pacing/recommendations per trainee's skill level and learning style.
- FR29: Automate administrative tasks: digitizing assessments, generating reports, reducing manual workload.
- FR30: Provide predictive analytics to flag at-risk trainees and suggest interventions.
- FR31: Support content adaptation/delivery aids for bilingual (Dzongkha/English) materials authored by humans.
- (See §16 for mandatory limits on AI autonomy.)

### 5.10 Offline-First / Low Connectivity
- FR32: Trainers/trainees can pre-download resources while connected and browse/use them fully offline.
- FR33: Uploads, tags, reviews, and submissions made offline are queued locally and sync automatically once connectivity returns, with conflict handling defined (see §11).

---

## 6. Non-Functional Requirements

- NFR1 **Scale:** Support ~1,500 concurrent/registered users and ~25 TB of institutional storage at national rollout.
- NFR2 **Availability:** Core functions (login, offline resource access, submission queuing) must degrade gracefully, not fail, under intermittent connectivity.
- NFR3 **Performance:** Resource search must return results fast enough to meet the pilot success measure (locate a resource in minutes, not days).
- NFR4 **Security:** Role-based access control enforced server-side; credentials (passwords) stored using industry-standard hashing; no plaintext credential storage or transmission.
- NFR5 **Auditability:** All uploads, edits, grading actions, and deletions produce an accountability record (who, what, when).
- NFR6 **Bilingual support:** UI and content support Dzongkha and English.
- NFR7 **Data integrity:** Submission files are hashed at upload to detect tampering/corruption.
- NFR8 **Data retention & deletion:** Trainee record deletion ("Eradicate Trainees") is a controlled, confirmable, notified action — not silently reversible without audit trail.
- NFR9 **Maintainability:** Metadata schemas (resource, module, assessment) must be extensible as the Ministry updates NCS codes/curricula without a system redesign.
- NFR10 **Accessibility:** Meets baseline accessibility requirements (see §10).

---

## 7. User Stories

**Trainee**
- As a trainee, I want to download this week's module resources while I have connectivity so I can study offline afterward.
- As a trainee, I want to submit my assignment and see confirmation (timestamp, status) so I know it was received.
- As a trainee, I want to see my results as a progress bar/competency chart so I understand where I stand toward certification.
- As a trainee, I want to receive a notification 24 hours before a submission deadline so I don't miss it.

**Trainer**
- As a trainer, I want to see all pending submissions for my module in one grading queue so I can grade efficiently.
- As a trainer, I want auto-graded MCQ results available immediately so I only need to manually grade subjective work.
- As a trainer, I want to leave voice-note feedback on a submission so I can give nuanced guidance quickly.
- As a trainer, I want to upload/update module resources and see who last reviewed them.

**Exam Controller**
- As an exam controller, I want to see grading consistency across trainers for the same module so I can catch outliers before certification.
- As an exam controller, I want to review and resolve a grading dispute with full submission and grading history visible.
- As an exam controller, I want to approve the assessment schedule for an institution.

**Admin**
- As an admin, I want to create trainer/trainee/exam controller accounts with the correct role and dashboard.
- As an admin, I want to be prompted for confirmation before a trainee's record is permanently eradicated.
- As an admin, I want to view storage and user-capacity utilization so I can plan for scale.
- As an admin, I want to post general notifications (holidays, practical class location changes) visible to all users.

**Ministry / Department**
- As a Ministry stakeholder, I want an aggregated compliance and KPI dashboard across TTIs/IZCs so I can track national TVET standard adherence.

---

## 8. Key Workflows

1. **Onboarding:** Admin creates trainee/trainer/exam-controller account → credentials issued → user logs into role-specific dashboard.
2. **Module delivery:** Trainer publishes module details and resources → trainees pre-download for offline use → trainees consume content and complete formative assessments.
3. **Assignment submission:** Trainee uploads file(s) → system validates file type, timestamps, hashes → status set to "submitted" → trainer notified.
4. **Grading:** MCQ auto-graded and logged → trainer reviews/grades subjective components manually → grading status updated → trainee notified ("grading complete").
5. **Feedback loop:** Trainer/trainee exchange comments (text/voice) linked to the submission; read/unread status tracked.
6. **Certification:** Aggregate module score computed → mapped to grade/GPA/performance band → if ≥60 points, certificate issued; if 50–59, trainee is flagged to repeat the module → Exam Controller reviews/approves before final issuance.
7. **Dispute resolution:** Exam Controller investigates a contested grade using submission, grading log, and comment history → resolution recorded.
8. **Offline sync:** User pre-downloads content while online → works offline (view, submit, comment, tag) → on reconnect, queued actions sync, conflicts surfaced for resolution.
9. **Trainee record eradication:** Admin initiates deletion post-course-completion → system prompts confirmation → action logged and Admin notified before finalization.
10. **Reporting:** Admin/Exam Controller/Ministry view real-time dashboards aggregating progress, resource usage, and compliance KPIs.

---

## 9. Data and Privacy Requirements

- Personal data collected is limited to what is defined in the brief: Name, Citizenship ID, Profile Photo, Contact Number, Email Address, Trade, Student/Staff ID, and login credentials — no additional personal data should be collected without a defined purpose.
- Access to personal identity data is restricted: Trainers cannot view/edit trainee personal details beyond what is required for grading; only Admin has full access to personal details.
- All access to trainee/institutional records must be logged (accountability records).
- Credentials must never be stored or transmitted in plaintext.
- Submission files and personal data must not be exposed through unauthorized access — this is an explicit "must never" requirement from the Ministry brief.
- Data residency, retention periods, and any Ministry/government data-protection regulations applicable to Bhutan must be confirmed with legal/policy stakeholders (see Open Questions).
- Trainee record deletion must be admin-confirmed, logged, and notified — not a silent or trainer-initiated action.

---

## 10. Accessibility Requirements

- Bilingual UI and content support (Dzongkha and English) as a baseline, not an add-on.
- Support for voice-note feedback/comments as an alternative to text, benefiting trainees/trainers with lower literacy or typing constraints.
- UI must remain usable on lower-end devices and slow/intermittent networks (aligned with the offline-first requirement).
- Follow standard accessibility practices for readable contrast, scalable text, and screen-reader-compatible structure for web/app interfaces (to be validated against WCAG 2.1 AA during design; exact target level to be confirmed with the Ministry).

---

## 11. Offline-First Requirements

- Trainers and trainees can pre-download resources for a module while online.
- All core consumption workflows (viewing resources, browsing modules) must work fully offline once content is downloaded.
- Actions performed offline — uploads, tagging, reviews, submissions, comments — are queued locally.
- On reconnection, queued actions sync automatically.
- Conflict handling: the system must define a resolution strategy for conflicting offline edits (e.g., last-write-wins vs. manual merge) — **flagged as an open question**, given grading/certification data cannot tolerate silent overwrite.
- Sync status must be visible to the user (pending / synced / failed) so trainers/trainees trust the offline experience.

---

## 12. Reporting and Dashboard Requirements

- **Trainee dashboard:** overall progress (horizontal bar graph), competency chart, module progress chart, assessment summary, personal/module details.
- **Trainer dashboard:** grading queue, module-level and individual trainee progress.
- **Admin dashboard:** user capacity and storage utilization (against the 1,500 users / 25 TB ceiling), institutional KPI summary, resource usage/gap analysis.
- **Exam Controller dashboard:** assessment schedule status, grading consistency across trainers, certification pipeline, dispute queue.
- All dashboards reflect real-time (or near-real-time) data, consistent with the "smart monitoring" goal in the brief.
- Ministry-level rollups aggregate across institutions for national compliance reporting (mechanism to be defined — see Open Questions).

---

## 13. Assessment, Grading, and Certification Requirements

- Three assessment tiers must be supported end-to-end: Formative, Diagnostic, Summative — each with the specific sub-types listed in §5.5.
- MCQ auto-grading must maintain a verifiable log (what was graded, when, by what logic/version).
- Manual grading requires recorded grader credentials and grading status.
- Certification scale (grade/GPA/performance band/certificate outcome) is fixed per the table in §5.5 and must not be editable outside an approved change process.
- Module certificates are issued automatically on passing scores but must route through Exam Controller oversight for validation, consistent with the "human validation & oversight" principle in §16.
- Trainees scoring 50–59 (Unsatisfactory) must be flagged to repeat the module rather than certified.

---

## 14. Resource Management Requirements

- Every resource carries metadata: Title, Subject/Module, Format, Date Added, Last-Reviewed Date, NCS Code, Module Code.
- Content includes born-digital files and digitized hard-copy materials (reference guides, past assessments).
- Every resource tracks who uploaded/reviewed it, its permission level, and its update history (accountability).
- Usage logs (views, downloads, searches) must be captured to identify content gaps and popular resources — this directly supports the pilot's success measure.
- Search/tagging must be accurate enough that trainers and trainees can find a resource independently, without needing to ask a specific person — this is the pilot's core validation target.

---

## 15. Notification Requirements

- Submission deadline reminder: 24 hours before due date.
- Grading complete notification to the trainee.
- New resource upload/update notification to affected module trainees.
- Result declaration notification.
- Assessment schedule notification/changes.
- General notifications: holidays, practical class schedule and location — broadcast by Admin.
- Notifications must be deliverable/queued in a way compatible with offline-first use (delivered on reconnect if the device was offline).

---

## 16. AI Feature Requirements and Limits

**What AI is expected to do:**
- Personalized learning: adapt module pacing/recommendations to trainee pace, skill level, and learning style.
- Automated administration: digitize assessments, assist certifications/reporting, reduce manual workload, support the trainee self-service portal.
- Smart monitoring: power real-time dashboards on trainee progress, institutional KPIs, and standards compliance.
- Predictive analytics: identify at-risk trainees early and suggest interventions.
- Innovation enablement: support entrepreneurship modules, digital workshops, and adaptive learning tools.

**What must remain human-owned (non-negotiable):**
- Policy & governance — defining rules/standards and ensuring alignment with national TVET frameworks.
- Content creation — curricula, training modules, bilingual materials (AI may adapt/deliver human-authored content, not originate policy-bearing curriculum).
- Mentorship & guidance — motivation, counseling, discipline.
- Validation & oversight — verifying AI-generated records, resolving disputes, ensuring fairness in certification.
- Final decision-making on grading disputes, certification edge cases, and disciplinary matters.

**What AI must never do:**
- Replace human judgment in policy enforcement, mentorship, or disciplinary decisions.
- Compromise data privacy or enable unauthorized access to trainee/institutional records.
- Remove the human review step for sensitive, exam-related, or disputed content.

Any AI-assisted grading (e.g., MCQ auto-grade) is scoped to objective, unambiguous assessment types; subjective/summative grading remains trainer/Exam-Controller owned.

---

## 17. Assumptions

- A1: The Ministry will provide/confirm the authoritative NCS (National Competency Standard) code list and module code registry the LMS must align to.
- A2: TTIs/IZCs have (or will be provisioned with) sufficient local device/connectivity infrastructure to support the offline-download model.
- A3: Bilingual content (Dzongkha/English) will be authored/provided by TTI/IZC staff; the LMS delivers and adapts it rather than generating original curriculum text.
- A4: The 1,500-user / 25 TB figures represent the initial national target scale post-pilot, not a hard ceiling requiring re-architecture shortly after.
- A5: Existing Ministry systems (if any) for national student records or examinations are out of scope for direct integration in v1, pending confirmation.

---

## 18. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Offline sync conflicts corrupt grading/certification data | High | Define explicit conflict-resolution rules for high-stakes data (grades, certification) before allowing offline edits to those records; consider read-only offline for certification-critical fields |
| Low tagging/metadata quality undermines search (core pilot success measure) | High | Enforce required metadata fields on upload; validate tagging accuracy explicitly during the 30-day pilot before scale-up |
| Over-reliance on AI grading erodes trust or accuracy | Medium | Scope AI auto-grading strictly to objective (MCQ) assessments; require human sign-off on all summative/certification outcomes |
| Unauthorized access to trainee personal data or credentials | High | Enforce RBAC server-side, hash credentials, log all access, restrict personal-detail edit rights to Admin only |
| Accidental/irreversible trainee record deletion | Medium | Require explicit Admin confirmation, pre-action notification, and audit log for the Eradicate Trainees workflow |
| Storage/user growth exceeds 25 TB / 1,500-user planning assumption | Medium | Build capacity monitoring into the Admin dashboard early; treat figures as a planning baseline, not a hardcoded limit |
| Bilingual content gaps reduce adoption | Medium | Track content-language coverage as a KPI; prioritize bilingual parity for pilot-department content first |
| Low connectivity prevents timely sync of grading/certification updates | Medium | Design sync status visibility and retry logic; ensure critical notifications (results, deadlines) are queued for delivery on reconnect |

---

## 19. Success Metrics

Aligned to the Ministry's stated pilot success measure, plus supporting platform KPIs:

- **Primary (pilot):** Time to locate a resource drops from days to minutes.
- **Primary (pilot):** A target share (to be set with the Ministry) of pilot-department resources are accessed/used independently by trainers and trainees without needing to ask a specific person.
- Submission-to-grading turnaround time (median days from submission to grading complete).
- % of assignments submitted on time (before deadline).
- % of trainees achieving certification vs. repeat-module rate, tracked per module/institution.
- Dashboard/report adoption: active weekly usage by Admin/Exam Controller of institutional dashboards.
- Offline sync success rate (% of queued offline actions synced without conflict/error).
- Resource metadata completeness rate (% of resources with all required metadata fields populated).
- User account provisioning-to-first-login time (onboarding efficiency).

---

## 20. Open Questions

- OQ1: What is the exact conflict-resolution policy for offline edits to grading/certification-relevant data (last-write-wins, manual merge, or read-only offline for these fields)?
- OQ2: Does the Exam Controller's certification approval apply to every certificate, or only flagged/disputed cases? (Affects §13/§16 workflow design.)
- OQ3: What data-protection/privacy regulation (if any, e.g., a national data protection framework) governs Citizenship ID and other personal data handling?
- OQ4: Is integration with any existing Ministry system (national SIS, examinations board) required in v1, or fully out of scope?
- OQ5: What is the target accessibility conformance level (e.g., WCAG 2.1 AA) the Ministry requires for public-sector digital services?
- OQ6: What is the retention period for eradicated trainee records' audit logs (permanently retained vs. time-boxed)?
- OQ7: Who owns AI feature quality/bias validation before AI-assisted recommendations (e.g., at-risk flags) are trusted operationally?
- OQ8: What is the target share/percentage for the pilot's "independently accessed resources" success measure?
- OQ9: Will IZCs (arts/crafts institutes) require any assessment or resource-type variations distinct from TTIs (technical trades), given differing curricula?
- OQ10: What devices/OS baseline (mobile, desktop, both) must the offline-first client support at pilot and at national scale?

---

*Source grounding: This PRD is derived from the Ministry of Education & Skills Development / Department of Workforce Planning & Skills Development "TVET e-Gateway" project brief (TeG 1.00) and the accompanying Product Requirements Prompt.*
