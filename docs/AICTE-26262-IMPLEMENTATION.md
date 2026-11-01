# ApoorvaSetu — AICTE Problem Statement 26262

**Integrated AICTE Approval Workflow Automation, Compliance Monitoring and Alert Management System**

This document is the single source of truth for scope, architecture, phases, tasks and acceptance
criteria. It maps every requirement in problem statement 26262 (requirements A–F) to a demonstrable
capability in the application.

---

## 1. Problem statement → capability map

| Requirement | What the evaluator must see | Phase | Status |
|---|---|---|---|
| Automated routing of applications | Application type resolves to a canonical route; stage path, owner and due date are derived automatically | P2 | Done |
| Return / revert with recorded reasons | Structured reason codes, deficiency register, resubmission resumes at the returned-from stage | P2 | Done |
| Human oversight safeguard | Only a competent authority can approve/reject; automation never decides | P2 | Done |
| Role dashboards, pendency, ageing, bottlenecks | Computed selectors feeding every dashboard; drill-down reconciles with lists | P8 | Done |
| EVC queue, scheduling, reminders, escalation | Queue generated from routing; visit linked to application; report SLA; auto-advance on completion | P5 | Done |
| Undertakings and compliance monitoring | Conditions with due dates, evidence, verification, escalation to final approval | P6 | Done |
| Lease / document validity | Expiry tiers, renewal chain, alerts and escalation | P7 | Done |
| Notifications, escalation, reports | Event pipeline, configurable rules, escalation matrix, six real reports | P3, P4, P9 | Done |
| Audit trail | Append-only audit with before/after state, correlation IDs, production persistence | P3, P10 | Done; production is insert-only, UPDATE/DELETE revoked |
| Secure RBAC and scoping | Demo guards plus production Auth/RLS/Storage | P10 | Done |

**Regulatory rule:** automation may route, remind, verify documents and escalate. It must never
approve, reject or decide. `APPROVE`, `REJECT` and `VERIFY` always require an identified human with
the correct role, and the human's name is written to the decision record.

---

## 2. Scope decisions

1. **Hybrid fidelity.** The offline demo runs entirely on `localStorage` with rich seeded scenarios.
   `VITE_DATA_MODE=supabase` switches to real Supabase Auth, RLS, Storage and quotas. Demo mode must
   never depend on a configured backend.
2. **Full A–F scope**, phased so every evaluation criterion is demonstrable end to end.
3. **Vitest** for workflow, SLA, escalation and repository-contract tests.
4. **Hallmark** design skill is mandatory for every new or redesigned screen.

**Out of scope:** live AICTE system integration (adapter stub only), real email/SMS delivery
(simulated queue), payments, OCR, native PDF generation (print-to-PDF only), a native mobile app.

---

## 3. Architecture

Dependency direction is strictly **pure domain → repository → React adapters**. No React or
`localStorage` imports are allowed inside the domain layer.

```
src/workflow/                  Pure TypeScript, unit-testable
  stages.ts                    Canonical stages + STAGE_META (single source of truth)
  routes.ts                    Application type → ordered stage path + type options
  codes.ts                     Deficiency / return / decision reason codes
  sla.ts                       Deadline tiers (on-track / approaching / due / breached / paused)
  engine.ts                    canTransition + applyTransition + return/revert/decide
  escalations.ts               Escalation matrix evaluation
  alerts.ts                    sweep(state, now, config) → deduped alerts
  undertakings.ts              Condition catalogue, route plans, due dates, derived status buckets
  notifications.ts             DomainEvent[] → targeted notifications
  caseSummary.ts               Standardised case summary builder
  selectors.ts                 Pendency, ageing, workload, bottlenecks, EVC queue, expiries
  config.ts                    Default SLAs, thresholds, escalation matrix
  types.ts                     WorkflowEvent, CommandResult, Alert, RouteId, ActorRef

src/services/repositories/
  types.ts                     Repository contract
  localRepository.ts           localStorage implementation (v3 → v4 migration)
  supabaseRepository.ts        Supabase implementation
  index.ts                     getRepository() via VITE_DATA_MODE (default: demo)

src/services/eventDispatcher.ts  Persist → audit → notify → sweep
src/utils/dates.ts               ISO parsing, calendar/business day math, mockable clock
```

### Context split without changing page imports

`src/context/AppContext.tsx` is a thin facade over three concerns:

- **DataProvider** — hydration, repository access, entity state.
- **WorkflowProvider** — commands built on the engine.
- **NotificationProvider** — alert sweep, toasts, notification state.

`useApp()` keeps its shape, so pages only change where they consume new fields or actions.

### Command pipeline

Every mutation returns `CommandResult = { app?, events, audit }`. The dispatcher persists, appends
audit with before/after JSON and a correlation ID, generates notifications and runs the alert
sweep. Pages never write audit or notification rows directly.

### Alert scheduling

- **Demo:** sweep on mount, after every command, and every 60 seconds.
- **Production:** `api/cron/sweep.ts` guarded by `CRON_SECRET`, scheduled hourly in `vercel.json`.
- **Idempotency:** `dedupeKey = rule:entityId:tier:bucket`, unique index in Postgres, map in the
  local repository. Sweeps can run repeatedly without producing duplicates.

### Realtime

The repository exposes `subscribe(table, cb)`. Demo mode is a no-op (same-tab state). Production
uses Supabase `postgres_changes` channels for applications, alerts, notifications, compliance and
documents, so dashboards update without a refresh.

---

## 4. Canonical stages and routes

Operational stages (`src/workflow/stages.ts`):

```
Submitted
  → Scrutiny / Re-scrutiny
  → Expert Visit Committee (EVC)
  → SAC / SHC
  → Compliance / Undertaking Verification
  → Approval (Subject to Undertaking)
  → Final Approval
```

Legacy values (`Initial Scrutiny`, `Regional Review`, `Final AICTE Review`, `Other Stages`) remain
in the type union for seed compatibility and are mapped through `legacyAliasOf`. UI renders from
`STAGE_META` and `OPERATIONAL_STAGES` only.

Routes (`src/workflow/routes.ts`):

| Route | Used for | Stage path |
|---|---|---|
| `ROUTE_SCRUTINY_ONLY` | Increase in intake, new course, integrated course | Submitted → Scrutiny → Approval → Final |
| `ROUTE_SCRUTINY_EVC` | Extension of Approval (default fallback) | Submitted → Scrutiny → EVC → Approval → Final |
| `ROUTE_EVC_SAC` | New technical campus / new institution | Submitted → Scrutiny → EVC → SAC → Approval → Final |
| `ROUTE_EVC_ONLY` | Closure of programs / institution | Submitted → EVC → Approval → Final |
| `ROUTE_SCRUTINY_SAC` | Reduction in intake, program closure | Submitted → Scrutiny → SAC → Approval → Final |
| `ROUTE_SAC_APPEAL` | Appeal against rejection | Submitted → SAC → Final |

---

## 5. Data model additions

All new fields are optional so existing seed data keeps compiling and loading.

- `Application` + `routeId`, `stageEnteredAt`, `stageDueAt`, `slaTier`, `assignedOfficerId`,
  `deficiencies[]`, `returns[]`, `decision`, `caseSummary`, `evcVisitId`, `version`, `lastActionBy`.
- `ApplicationTimelineEvent` + `enteredAt`, `dueAt`, `actorId`, `action`.
- `Undertaking` — condition, due date, evidence, submission/verification, escalation level.
- `DocumentItem` + `documentTypeCode`, `renewalOfId`, `renewalStatus`, `verifiedBy`, `storagePath`,
  `expiryTier`.
- `EVCVisit` + `applicationId`, `scheduledAt`, `reportDueAt`, `reportSubmittedAt`, `slaTier`,
  `escalationLevel`, `report`.
- `SystemAlert`, `NotificationItem.dedupeKey`, `EscalationItem.level`, `AuditLog.eventType` /
  `correlationId` / `source`.
- `SystemConfig` + `stageSlas`, `escalationMatrix`, `notificationRules`, `documentWarningDays`,
  `undertakingWarningDays`, `businessDaysOnly`.

### Default SLAs

| Stage | Days | Approaching at |
|---|---|---|
| Submitted | 2 | 80% |
| Scrutiny / Re-scrutiny | 30 | 80% |
| Expert Visit Committee (EVC) | 21 | 80% |
| SAC / SHC | 21 | 80% |
| Compliance / Undertaking Verification | 15 | 80% |
| Approval (Subject to Undertaking) | 15 | 80% |
| Final Approval | 10 | 80% |

EVC report SLA: 7 days after the visit. Undertaking reminders: 30 / 15 / 7 / 0 days. Document
warnings: 60 / 30 / 7 days. Escalation: L1 at +3 days, L2 at +7, L3 at +14. All values are editable
from System Config and consumed by the engine.

### Database (production path)

`supabase/schema.sql` plus `supabase/migrations/` add the fields above, new tables
(`undertakings`, `alerts`, `workflow_events`, `profiles`, `notification_events`) and indexes:

- `applications(region, stage)`, `applications(stage_due_at)`, `applications(institute_id)`
- `alerts(dedupe_key)` unique
- `audit_logs(correlation_id)`

`audit_logs` is insert-only: UPDATE/DELETE are revoked and a trigger rejects mutation. Documents
live in the `documents` Storage bucket under `institute/{instituteId}/{applicationId}/{docId}`.

---

## 6. Transition rules implemented in the engine

`canTransition` denies an action when any of the following is true:

- Application is already approved or rejected.
- `expectedVersion` does not match (optimistic concurrency).
- A regional officer targets another region.
- The role is not permitted for the action:
  - `FORWARD`, `RETURN`, `REVERT` → SUPER_ADMIN, AICTE_ADMIN, REGIONAL_OFFICER
  - `APPROVE`, `REJECT` → SUPER_ADMIN, AICTE_ADMIN only
  - `RESUBMIT` → INSTITUTION_ADMIN, SUPER_ADMIN
- `FORWARD` while the case is returned or has an open deficiency.
- `FORWARD` skips a stage, reverses a stage, or runs past the final stage.
- `FORWARD` leaves EVC without a submitted report or completed visit.
- `FORWARD` leaves Compliance with pending undertakings.
- `RETURN` lacks a valid reason code or a written note.
- `REVERT` lacks a reason or targets a later/unknown stage.
- `APPROVE` is attempted before Final Approval, or while undertakings are pending.
- `REJECT` lacks a statutory reason code and note.
- `RESUBMIT` is attempted on a case that is not returned.

`applyTransition` stamps `stageEnteredAt` / `stageDueAt`, increments `version`, updates the
timeline with the acting officer, writes `decision.competentAuthority` for approvals/rejections and
emits a domain event plus a before/after audit draft sharing one correlation ID.

---

## 7. Phases and tasks

### P1 — Foundations, docs, test harness (2 days) — **COMPLETE**

- [x] Implementation plan document (this file).
- [x] Real README with setup, roles, demo accounts and data modes.
- [x] Vitest + happy-dom + coverage scripts and `vitest.config.ts`.
- [x] Domain types and `src/workflow/{stages,routes,codes,config,types}.ts`.
- [x] `src/utils/dates.ts` with injectable clock.
- [x] Repository contract, local repository and v3 → v4 storage migration.
- [x] Stage arrays de-duplicated in Workflow, ApplicationDetailModal, TrackApplicationModal,
      Applications and SubmitApplication.
- [x] Initial tests: routes, engine, dates/SLA, repository migration (49 tests green).

**Acceptance:** build, lint and tests green; offline demo unchanged; legacy storage migrates.

### P2 — Workflow engine, routing, guards (3 days) — **COMPLETE**

- [x] Route paths for all six routes; unknown types fall back to Scrutiny + EVC.
- [x] `canTransition` / `applyTransition` with role, route, EVC and undertaking guards.
- [x] Structured `RETURN` with deficiency and return records; `RESUBMIT` resumes the stage clock.
- [x] `REVERT` to earlier stages with a recorded reason.
- [x] Authority-gated `APPROVE` / `REJECT` with `competentAuthority`.
- [x] Submission honors submitted ID/type/intake and persists the resolved route.
- [x] Reason-code picker plus mandatory officer note for return and rejection.
- [x] Inline denial reasons for blocked actions; role-forbidden actions are hidden.
- [x] Stale-write protection via `version` and automatic refresh on conflict.
- [x] Case dossier shows open deficiencies, decision authority and read-only terminal state.
- [x] "New Application" hidden for roles without `applications.create`.
- [x] Tracking page renders the route-derived milestone list with statutory deadlines.

**Acceptance:** all route tests pass; no index+1 transitions remain; approve at Scrutiny is blocked
with a visible reason; every transition produces an audited timeline event.

### P3 — Events, notifications, audit (2.5 days) — COMPLETE

- [x] Domain event catalog and audit drafts with correlation IDs in the engine.
- [x] Event dispatcher wired into every command: submission, transitions, EVC schedule/reschedule/
      cancel, compliance upload/verify and document upload all emit `DomainEvent`s before they
      persist.
- [x] `src/workflow/notifications.ts` maps each event to role-, region- and institute-scoped
      notification drafts with a stable `dedupeKey` (`type:entity:event:role:institute`) and
      `eventType`; `dispatchNotifications` drops duplicates and stamps display timestamps. Static
      records remain seed-only.
- [x] `src/services/auditService.ts` is the single write path: `appendAudit` stores before/after
      state, correlation ID, event type and source, caps at 2000 rows, migrates the legacy
      `apoorvasetu_audit_v1` store, and writes through the repository (local or Supabase).
      `authService.addAuditLog` now delegates to it, so logins, user and config changes land in the
      same trail as workflow actions.
- [x] Audit explorer filters (search, actor role, entity type, event type, correlation ID) plus a
      detail drawer rendering the previous/new state JSON and an append-only footer note.
- [x] Notifications screen counts are role-scoped, timestamps are real event dates, and entity
      links persist read state through the repository.
- [x] `notifications.test.ts` covers targeting, priorities, dedupe-key uniqueness and missing-app
      resilience (58 tests green).

**Acceptance:** one action → one audit row, one event, correct targeted notifications; the audit
chain reconstructs a case from submission to decision. Verified live: forwarding
`AICTE/2025/12875` produced exactly one `FORWARD / application.forwarded` row (correlation
`COR-…`) with diffable state and two notifications (regional officer + institution).

### P4 — SLA, alerts, escalation (3 days) — COMPLETE

- [x] `src/workflow/sla.ts` resolves every statutory clock from one place: stage windows honour
      `stageEnteredAt` / `stageDueAt` and pause on returns, business-day mode skips weekends and
      holidays, and the same tier vocabulary (On Track, Approaching, Due Today, Breached, Paused)
      drives applications, EVC reports, undertakings and documents. SLA re-computes on stage entry
      and whenever a deficiency or return is resolved.
- [x] `src/workflow/alerts.ts` sweeps applications, EVC reports, undertakings and documents into
      deduped alerts (`rule:entityType:entityId:tier`) with severity, region scope and deep links.
      The escalation matrix (L1 +3d, L2 +7d, L3 +14d) upgrades monotonically, resolves lower levels
      when a higher one fires, and auto-resolves automated escalations once the deadline condition
      clears. Manual escalations are never touched by the sweep.
- [x] Demo scheduler: `AppContext` runs the sweep on mount, after every command that changes an
      application, EVC visit, undertaking or document, and on a 60-second interval (StrictMode-safe
      via a timeout-scheduled kick and a ref).
- [x] `RegionalEscalations.tsx` is now data-driven: status tabs (Open, Under Review, Resolved, All),
      region scoping for regional officers, level and breach-day badges, acknowledge and resolve
      actions, and a create-escalation modal. Acknowledgements and resolutions persist in the
      repository and write audit rows with `source: 'system'`.
- [x] `api/cron/sweep.ts` runs the same domain sweep server-side for Supabase mode using the
      service-role key, requires `CRON_SECRET`, upserts alerts on `dedupe_key`, persists escalation
      changes, refreshes `applications.sla_tier`, and is scheduled hourly in `vercel.json`.
- [x] System Config exposes per-stage SLA days, undertaking/document warning windows, L1–L3 breach
      days with their target roles, and the business-day clock toggle; the engine reads these
      through `resolveWorkflowConfig` rather than defaults.
- [x] `sla.test.ts` and `alerts.test.ts` cover tiers, weekend skipping, EVC/undertaking/document
      windows, level-3 escalation, idempotent double sweeps, tier advancement, monotonic upgrades
      and auto-resolution (72 tests green).

**Acceptance:** seeded at-risk cases produce the right tiers; sweeping twice produces no
duplicates; escalations survive reload and stop when the cause is resolved. Verified live: the
mount sweep raised 12 alerts (8 stage breaches, 4 expired documents) and 12 escalations from the
seed data, acknowledging one moved it to Under Review, and a full reload kept the same 12 records
with the acknowledgement intact — no duplicates. Clearing the underlying condition is proven by
the auto-resolve test in `alerts.test.ts`.

### P5 — EVC integration (2 days) — COMPLETE

- [x] `ScheduleEVCModal` requires an application (candidate list comes from `evcScheduleCandidates`:
      non-terminal, EVC-route, at EVC or next-in-route, no active visit), stores `scheduledAt`,
      derives `reportDueAt` from the configured report SLA, and runs a guarded `applyTransition` when
      the case is not yet at EVC. Submission, application stage, visit and audit commit together.
- [x] EVC work queue (`/evc/queue`) is derived from route + stage, not a static list: four live
      counts (Awaiting scheduling, Scheduled, Report overdue, Completed), search, state tabs,
      committee/visit dates, overdue days, and actions to schedule or open the case. Scoped by role
      through `filterApplicationsForUser`.
- [x] Reschedule and cancel validate state (completed or signed reports cannot be moved), persist
      the new `scheduledAt` / `reportDueAt`, regenerate notifications and write before/after audit.
- [x] `completeEVC` persists the `InspectionReport` (scores, safety, recommendation, remarks,
      evidence), marks the visit Completed with `reportSubmittedAt`, and advances the application
      only when the recommendation is Recommended or Conditional. **Not Recommended leaves the case
      at EVC for the competent authority** — automation never approves or rejects.
- [x] The 12-item statutory checklist (`src/workflow/evc.ts`) gates report signing: submission is
      blocked until every item is assessed, and both checklist state and evidence files persist
      against the linked visit. Completed reports render read-only.
- [x] `src/workflow/evc.ts` also repairs legacy seed visits: `normalizeEVCVisit` derives
      `scheduledAt` / `reportDueAt` from the display date, and `linkLegacyVisits` binds unlinked
      visits to their institute's case once, so the queue, SLA sweep and workflow guards see one
      record.
- [x] `evcReportWindow` derives a deadline for visits that lack `reportDueAt`, so legacy scheduled
      inspections surface as overdue instead of silently staying on track. Sweeps now also
      auto-resolve alerts whose underlying condition cleared (audited as `ALERT_AUTO_RESOLVED`),
      and the cron persists those resolutions.
- [x] New `evc.test.ts` (12 tests) covers checklist completion, candidate selection, queue states
      (including legacy overdue visits), legacy normalisation and linking; SLA tests cover the
      derived report deadline.

**Acceptance:** scheduling moves the case; completing the report moves it onward; overdue EVC
appears in alerts and escalation; no EVC action is toast-only. Verified live as Super Admin:
scheduling XYZ College advanced `AICTE/2025/12875` to EVC with a linked visit
(`scheduledAt 2026-11-08`, report due `2026-11-15`, version 2); completing all 12 checklist items and
signing a Recommended report moved the case to SAC/SHC (version 3) and emitted
`SAVE_EVC_CHECKLIST → COMPLETE_EVC → FORWARD` audit rows plus notifications. Signing ABC
`AICTE/2025/12876` as **Not Recommended** left the case at EVC while the visit became Completed. The
queue now reports 2 overdue inspections, 1 scheduled and 1 completed; the previously breached ABC
alert auto-resolved and its L3 escalation closed on the next sweep. Rescheduling NIT Rourkela
(`EVC-8801`) to 20 Nov 2026 updated `scheduledAt`, re-derived the report deadline and wrote a
`RESCHEDULE_EVC` diff; cancelling GGSIPU (`EVC-8803`) persisted `Cancelled`, wrote `CANCEL_EVC` and
cleared its overdue alert and L3 escalation.

### P6 — Undertakings and compliance lifecycle (2 days) — COMPLETE

- [x] `src/workflow/undertakings.ts` owns the condition catalogue (`UND_LAND_CONVERSION`,
      `UND_FACULTY_RETENTION`, `UND_FEE_REFUND`, `UND_BARRIER_FREE`, `UND_FIRE_NOC`,
      `UND_LAB_AUGMENTATION`), route-based default condition sets, deterministic due dates and
      derived status buckets (Pending / Submitted / Overdue / Verified / Rejected). Entering
      `Approval (Subject to Undertaking)` through the engine plans and persists the undertakings for
      that route; officers can also record a condition against any live case.
- [x] `AppContext` exposes `createUndertaking`, `submitUndertakingEvidence`, `verifyUndertaking`
      and `rejectUndertaking`. Every command checks permission and region/institute scope, writes an
      audit row with before/after state (`CREATE_UNDERTAKING`, `SUBMIT_UNDERTAKING_EVIDENCE`,
      `VERIFY_UNDERTAKING`, `REJECT_UNDERTAKING`), dispatches the matching domain event, and the
      verification records `verifiedBy` (human oversight).
- [x] `Compliance.tsx` is rewritten around records instead of literals: five computed summary cards
      (Open, Awaiting evidence, Submitted, Overdue, Verified), tabs that mirror the same buckets, a
      searchable table showing the latest evidence file and any rejection reason, and an empty state
      per filter. Counts are derived from `summariseUndertakings`, so card, tab and table totals
      always reconcile.
- [x] Overdue undertakings flow through the existing alert sweep and escalation matrix, including
      the case where the evidence was submitted after the due date (shown as “N day(s) overdue —
      evidence submitted” and still reviewable). Verification, rejection and resubmission resolve
      or re-open the condition and the sweep auto-resolves the alert/escalation on the next pass.
- [x] Final approval is gated: `Grant Final Approval` stays disabled with the reason “Pending
      undertakings must be verified before final approval” until every open condition on the case is
      verified; the engine also blocks approval when a route-required undertaking record is missing.
      Only AICTE_ADMIN/SUPER_ADMIN may approve, and the decision records the competent authority.
- [x] Seed data (`initialUndertakings`, `UND-2601 … UND-2607`) covers overdue, awaiting evidence,
      submitted, verified and rejected states across two institutions; persisted stores that are
      empty are reseeded so new clones see the same demonstration.
- [x] `undertakings.test.ts` (8 tests) covers condition uniqueness, route defaults, planning,
      explicit due dates, bucket classification (including overdue-but-submitted) and summary
      reconciliation.

**Acceptance:** overdue undertakings escalate; verification is audited and unlocks the workflow;
summary counts reconcile with the filtered table. Verified live as Super Admin: the seed showed
All 7 / Open 4 / Awaiting 2 / Submitted 1 / Overdue 1 / Verified 2 / Rejected 1 with the 12-day
overdue `UND-2601` escalated. Submitting evidence moved it to Submitted (still flagged overdue);
verifying it wrote `VERIFY_UNDERTAKING` and auto-resolved alert `ALT-MVWT0VQG-756V` and escalation
`ESC-MVWT0VQG-P38C`. Rejecting `UND-2605` with a reason produced `REJECT_UNDERTAKING`, a targeted
institution notification and a resubmission path; the resubmitted evidence returned it to
Submitted and verification cleared it. `AICTE/2025/12873` advanced to Final Approval with pending
conditions and `Grant Final Approval` was disabled with the visible reason; after
`UND-2604`, `UND-2605` and the newly recorded fire-safety condition were verified, the action became
available and the approval was granted (status Approved). All eight records now reconcile across
cards, tabs and table.

### P7 — Lease and document validity (2 days) — COMPLETE

- [x] `src/workflow/documents.ts` owns the statutory document catalogue (nine types with validity
      months and title keywords), `inferDocumentType` for legacy records, `normalizeDocument` to
      convert display dates to ISO and backfill type codes, and `addMonths` calendar arithmetic with
      month-end clamping for default expiry dates. Uploads now take issue date, expiry date, type and
      real file metadata; the hardcoded `INST-101` and `2028-06-30` values are gone.
- [x] Expiry tiers are computed from the configured warning windows (60 / 30 / 7 days): Valid,
      Expiring soon, Critical and Expired, each with a badge, filter tab and count. The five summary
      cards, seven tabs and the cards render from `summariseDocuments`, so they always reconcile.
- [x] Renewal lifecycle is a three-step chain: `Request renewal` (`renewalStatus: Requested`) →
      `Submit renewal` creates a linked record with `renewalOfId` and future expiry
      (`renewalStatus: Submitted`) → officer `Verify` uses `verifyDocumentInList` to mark the renewal
      Verified and the predecessor Superseded in one state update. Rejection carries a required reason
      and returns the predecessor to a resubmittable state; a rejected renewal stays in the renewal
      queue so the institution can resubmit.
- [x] Permissions and human oversight are enforced per action: `documents.upload` for request/submit,
      `documents.verify` plus region/institute scope for verify/reject, and every action writes
      before/after audit (`UPLOAD_DOCUMENT`, `REQUEST_DOCUMENT_RENEWAL`, `SUBMIT_DOCUMENT_RENEWAL`,
      `VERIFY_DOCUMENT`, `REJECT_DOCUMENT`) plus a targeted domain event. Verification records
      `verifiedBy`; automation never verifies a document.
- [x] The alert sweep (`alerts.ts`) evaluates active documents only: superseded, rejected and renewal
      records are skipped, so a verified renewal lets the previous `document.expiry` alert auto-resolve
      and stops its escalation. A new `supersedes DocumentItem` migration column pair
      (`renewal_of_id`, `renewal_status`, `renewal_note`) is mapped in the Supabase repository and the
      consolidated schema.
- [x] `InstitutionAdminDashboard` “renewals needed” is now the computed `documentsForRenewal` list
      (days left, tier, link to the full repository) instead of a literal count.
- [x] Seed data covers the scenes: expired conveyance deed (321 days), 30-year lease expiring in
      7 days, valid fire NOC and stability certificate, expiring affiliation with a submitted renewal,
      expiring financials and barrier-free affidavit awaiting verification.
- [x] `documents.test.ts` (13 tests) covers inference, normalisation, month-end clamping, tier
      boundaries, renewal-queue eligibility, summary reconciliation, atomic supersession, rejection
      and sweep idempotency.

**Acceptance:** a lease expiring in 7 days alerts at the right tier; a verified renewal clears the
alert and resets validity; no expiry value is hardcoded. Verified live end-to-end: as Institution
Admin on `/documents`, the 30-year lease (DOC-507) showed Critical · “Renewal due in 7 day(s)” and
the expired conveyance deed (DOC-501) showed 321 days overdue. Requesting renewal on DOC-507 raised
the notification count and switched the action to **Submit renewal**; submitting a 30-year extension
(expiry 08 Nov 2056) created a linked record “Renewal of DOC-507”. Signing in as AICTE Central Admin,
the renewal appeared as pending for verification; verifying it as Amit Sharma set the renewal
Verified, marked DOC-507 **Superseded by DOC-MVXHE1YL-L1P**, dropped the Critical card count 1 → 0,
and persisted the `document.expiry:Document:DOC-507:Critical` alert as **Resolved** with no open
escalation. A Postgres-level `renewal_of_id` foreign key keeps the chain intact in Supabase mode.

### P8 — Computed dashboards and pendency (3 days) — done

- [x] `src/workflow/selectors.ts` is the single computed layer: pipeline metrics, stage pendency,
      ageing buckets, region breakdown, region × stage matrix, officer workload, bottleneck ranking,
      EVC queue and pending reports, compliance snapshot, alert summary and per-application progress.
- [x] Every role dashboard now reads that layer through the user-scoped repositories:
      Super Admin (regional registers, cycle state, alert counts), AICTE Admin (pipeline + latest
      activity), Regional Officer (jurisdiction metrics, stage pendency, visit and document queues,
      compliance cards), EVC Member (assigned visits, report queue, next report due) and Institution
      Admin (application progress, linked visit, SLA footer, own undertakings). Shared widgets —
      stage movement, regional donut, EVC list, recent applications and compliance validity — were
      rebuilt on the same selectors; no literal statistic remains in dashboard JSX.
- [x] `/pendency` (Super Admin, AICTE Admin, Regional Officer) shows stage pendency with SLA targets,
      ageing profile, bottleneck ranking, region × stage matrix and officer workload. Every row,
      matrix cell and ranking entry drills into `/applications?stage=…&region=…`, which the
      Applications page already reads from the query string.
- [x] `/alerts` Alert Center lists role-scoped alerts with status, severity and record-type filters,
      text search, summary counts, entity deep links, manual sweep, and acknowledge/resolve actions.
      Resolving requires review or verification authority; every action is written to the audit log.
      `filterAlertsForUser` scopes alerts by region, institute and target role (5 tests).
- [x] Supabase mode subscribes to the nine synced tables and coalesces change bursts into one
      snapshot refresh, so a second officer's write appears without a reload. Demo mode is untouched.
- [x] Sidebar now carries Pendency & Workload and Alert Center entries, and notification/alert
      badges use real counts instead of fallback numbers.
- [x] Hallmark/sloplint run against both new routes: 0 FAIL, 0 REFLEX, 0 WARN. Rendered checks at
      531 px show zero horizontal overflow; the new tables scroll inside their own containers.

**Acceptance:** dashboard totals reconcile with the drill-down lists because both read the same
selector over the same RBAC-scoped data. Verified live with four roles: AICTE Admin (10
applications, 9 breached, stage and region mixes), Regional Officer (Northern only, 2 active),
EVC Member (assigned committee scope) and Institution Admin (own institute only). The Alert Center
raised 13 deadline alerts from the sweep; acknowledging moved one to Acknowledged and resolving
moved it out of the Active tab while the summary counts updated. EVC Member access to `/pendency`
is refused with the 403 role screen. `tsc -b`, 129 tests and the production build pass.

### P9 — Reports, exports, case summaries (2 days) — done

- [x] `src/workflow/reports.ts` is the pure report layer: `REPORT_CATALOG` defines six reports
      (stage pendency, EVC inspection status, undertaking compliance, document validity, overdue
      register, regional performance) and `buildReport(kind, context)` produces header columns plus
      rows from the same selectors and SLA helpers the dashboards use. No literal row remains.
- [x] `src/utils/csv.ts` exports RFC-style CSV with a UTF-8 byte-order mark, CRLF rows and doubled
      quotes, so Excel opens regional names correctly and every field stays column-aligned.
      `reportFilename` names both the scope (`national` or the region) and the export date.
- [x] `/reports` was rebuilt on live role-scoped data. Four RBAC filters scope applications, visits,
      undertakings and documents before any count is taken; one regional filter applies to all six
      reports, cards, preview and download. Each card shows its true row count, the preview shows the
      first ten rows, and a zero-row selection disables export with an explicit empty state.
- [x] The Generate Report modal (AICTE Admin dashboard quick action) shares the same builders and
      role scope, offers the region only when the user is not region-locked, states the exact row
      count and blocks export at zero rows.
- [x] `src/components/modals/CaseSummaryDrawer.tsx` opens from every application row ("Summary").
      It reconstructs route, current stage, SLA window, stage age, progress timeline, deficiencies,
      decision (with the competent-authority rule), linked EVC visit and report state, undertakings
      with their bucket, at-risk documents and the four communication drafts. Escape and the backdrop
      close it; focus moves to the close button on open. Print rules in `src/index.css` isolate the
      drawer (`position: static`, full width, overflow visible) so the browser print target is the
      case itself, not the dashboard behind it.
- [x] `src/workflow/templates.ts` issues the four standard notices. The approval communication only
      quotes a decision that an identified human already recorded and states that the workflow never
      approves or rejects; the escalation notice states that no decision was taken automatically.
- [x] Tests: `reports.test.ts` (9) covers catalogue integrity, each report's shape and ordering,
      overdue filtering and filename scoping; `csv.test.ts` (6) covers BOM, CRLF, quoting and missing
      keys; `templates.test.ts` (5) covers deficiencies, SLA wording and the human-authority rule.
- [x] Hallmark/sloplint against `/reports`: 0 FAIL, 0 REFLEX, 0 WARN.

**Acceptance:** verified live in the browser. AICTE Admin, All regions: 9 active, 7 pendency rows,
5 EVC rows, 7 undertakings, 8 documents, 9 overdue, 6 regions; selecting Northern Region drops the
same figures to 2 / 2 / 0 / 3 / 2 / 1 and the download disables at zero rows. Regional Officer sees
only a disabled Northern filter and 2 active cases. A captured `blob` from the in-page export began
with the byte-order mark and the exact header row, and the anchor carried
`aicte-evc-status-northern-2026-11-01.csv`. The modal produced the same scoped file. The case-summary
drawer for AICTE/2025/12876 showed the route, 355 days overdue, progress, a pending visit, two
attention documents and the drafts; Escape closed it. `tsc -b`, 149 tests, 0 lint errors and the
production build pass; no console error and no horizontal page overflow at 526 px.

### P10 — Security, Supabase production path, AI hardening (3.5 days) — done

- [x] `supabase/migrations/20261101090000_production_hardening.sql` is idempotent and adds the
      missing columns and tables (`profiles`, `undertakings`, `alerts`, `escalations`,
      `webhook_outbox`), the `handle_new_user()` trigger on `auth.users`, and scope helpers
      `public.app_role()`, `app_region()`, `app_institute()`, `app_committee()`, `app_name()`,
      `is_admin()`, `is_evc_assigned_to()`.
- [x] `supabase/schema.sql` now bootstraps tables and demo rows **deny by default**: RLS is enabled
      and no permissive policy is created; the role-scoped policies live in the migration.
- [x] Real Supabase Auth behind `VITE_DATA_MODE=supabase` through
      `src/services/supabaseAuthService.ts` (`signInWithPassword`, `getUser`, session subscription,
      profile mapping). `AuthContext` selects the remote or demo path at runtime; the login screen
      keeps the demo helper behind a labelled "Demo Credentials" control and shows an official
      sign-in badge in production.
- [x] RLS rewrite: institutions see their own rows, regional officers their region, EVC members
      their assigned visits, admins everything; insert/update/delete policies carry `WITH CHECK`;
      `guard_profile_scope()` stops privilege or scope changes; decision and verification guards
      require an authenticated human; `audit_logs` rejects UPDATE and DELETE through a trigger and
      revoked grants; the outbox is service-role only.
- [x] Storage: private `institute-documents` bucket, per-institute and per-region folder policies,
      25 MB file-size limit and PDF/JPEG/PNG/DOCX MIME allowlist. Uploads are still simulated
      metadata in this build, so any future browser read must use a short-lived signed URL.
- [x] AI hardening in `src/services/aiGuard.ts` (pure) and `server/authGuard.ts` (Supabase
      verification), wired into the Vite middleware, the Express server and the Vercel handler.
      The caller is resolved with `auth.getUser(token)` and their role read from `profiles`; the
      request body never supplies identity or scope in production. Demo mode accepts only a role
      from the closed `UserRole` set. Each endpoint also enforces a 20-request/minute per-user (or
      per-IP) limit, a 64 KB body cap, a 2000-character message, history length caps, a JSON origin
      allowlist via `AI_ALLOWED_ORIGINS`, and no credentials with wildcard CORS. The browser client
      attaches the access token as a bearer token in Supabase mode.
- [x] Integration adapter stub in `src/services/integration/`: an audited demo outbox (500 entries,
      idempotency keys, delivery recording) plus `server/webhookOutbox.ts`, a service-role writer
      for the production `webhook_outbox`. Any outbound approval/rejection/verification event is
      refused unless it carries `competentAuthority` or `verifiedBy`, so the integration boundary
      cannot imply an automated decision.
- [x] `supabase/tests/rls.sql` proves cross-region and cross-institution isolation, forbidden
      writes, blocked institution verification, blocked audit mutation and anonymous read denial.
- **Acceptance evidence:** no `.env` present, so the app booted in demo mode; the demo assistant
  replied with the resolved role; the three AI entry points return 401/403 without a valid caller,
  403 for a disallowed origin, 400 for a missing, oversized or malformed body, and 429 on the 21st
  request in a minute. `tsc -b` is clean, 173 tests pass, lint reports 0 errors, the production
  build succeeds, and the browser console stayed clean.

### P11 — Demo scenarios, Hallmark polish, E2E QA (2.5 days) — done

- [x] `src/data/seedScenarios.ts` ships 12 scripted scenes keyed to real seed records: on track in
      EVC (AICTE/2026/12876), approaching scrutiny (12875), due today at SAC (12874), breached with an
      escalation (12867), returned with a deficiency (12869), EVC report overdue (EVC-8801),
      undertaking overdue (UND-2601), lease expiring in 7 days (DOC-507), lease expired (DOC-501),
      verified renewal chain (DOC-509 → DOC-510), pending officer verification (DOC-506) and a
      recorded human approval (12872).
- [x] Every seed date is derived from `seedDate()` / `seedStamp()` offsets at load time, so tiers stay
      true however long the project sits between walkthroughs; `Reset Demo Data` re-seeds from the
      same relative anchors.
- [x] Admin-only demo clock in the account menu (`Today`, `+3d`, `+7d`, `+14d`) and a scenario guide
      at `/demo-scenarios` (SUPER_ADMIN, AICTE_ADMIN). The clock only changes deadline evaluation:
      it never approves, rejects or verifies, and the page says so.
- [x] Hallmark app-screen pass with `sloplint --scope app` on the new screen: 0 FAIL; the two
      remaining notes are recorded waivers (no disabled controls on this screen; the project's
      existing Tailwind palette is its design system). Global `:focus-visible` rule added to
      `src/index.css`, and the account trigger is now a real button with `aria-expanded` and Escape
      handling.
- [x] Regression fixes found by the QA pass: undertaking and document alerts now target
      `AICTE_ADMIN` as well as `INSTITUTION_ADMIN` and `REGIONAL_OFFICER`, so the Alert Center shows
      the full sweep for the central admin (covered by new `alerts.test.ts` assertions).
- [x] `supabase/tests/rls.sql` remains the production isolation proof from P10; this phase added the
      deadline-scene QA pass, while the transition, EVC, compliance, document and report legs of the
      demo script carry their live verification evidence in P2–P9.

**Acceptance:** verified live in the browser at 531 px and in headless Chrome at 1280, 1440 and 1920
px — zero horizontal overflow, the clock presets wrap 2 → 4 columns and the 12 scene cards sit in
one column below `lg` and two above it. Fresh boot
as `aicteadmin@apoorvasetu.demo` shows 2026 IDs, relative dates and 10 open alerts (4 application
stages, 1 EVC report, 2 undertakings, 3 documents). Advancing the demo clock:

| Clock | Observed change |
|---|---|
| +3d | 12875 still approaching (1 day left); UND-2602 remains inside its window |
| +7d | 12875 and 12874 breached (L1/L2 escalations); DOC-507 critical; EVC-8801 L2 |
| +14d | DOC-507 expired (L2); 12874 at L3 (14 days); 12875 at L2; new approaching alerts open for 12876, 12870, 12868 and UND-2605; 17 open alerts |

Returning to Today resolves the future-tier alerts and restores the 10-alert baseline. `tsc -b`, 174
tests and the production build pass; lint reports 0 errors.

**Demo route map**

| Screen | Route | Scene |
|---|---|---|
| Dashboard | `/` | Role-scoped pipeline and alert counts |
| Applications | `/applications` | On track, approaching, due today, breached, returned |
| Pendency & Workload | `/pendency` | Stage ageing, bottlenecks, officer load |
| EVC Scheduling / Queue | `/evc-scheduling`, `/evc/queue` | Visit 8801 report overdue; 8803/8806 complete |
| Undertakings & Compliance | `/compliance` | UND-2601 overdue, UND-2602 submitted |
| Documents | `/documents` | DOC-507 expiring, DOC-501 expired, DOC-509 renewal chain |
| Reports & Evidence | `/reports` | Six scoped exports and case summaries |
| Alert Center | `/alerts` | Every swept alert with acknowledge/resolve |
| Regional Escalations | `/regional/escalations` | L1–L3 escalation ladder (SUPER_ADMIN, REGIONAL_OFFICER) |
| Scenario guide | `/demo-scenarios` | Demo clock and the 12 seeded scenes |


---

## 8. Test plan

| File | Covers |
|---|---|
| `src/workflow/routes.test.ts` | Contiguous operational paths; type → route mapping; no EVC/SAC on scrutiny-only; EVC-only skips scrutiny; unknown-type fallback |
| `src/workflow/engine.test.ts` | Stage skips, backward forwards, role denials, region isolation, EVC report gate, return/resubmit lifecycle, revert, authority-only approval, pending undertakings, version conflicts, audit before/after |
| `src/utils/dates.test.ts` | ISO/display parsing, calendar and business days, SLA tiers at 80% / due / breached / paused |
| `src/services/repositories/localRepository.test.ts` | v4 round-trip, v3 migration, corrupt JSON fallback, audit cap, reset, demo-mode no-ops |
| `src/workflow/sla.test.ts` | Stage, EVC, undertaking and document windows; business-day mode; paused clocks |
| `src/workflow/alerts.test.ts` | Dedupe keys, idempotent double sweep, tier advancement, auto-resolution, region scoping |
| `src/workflow/notifications.test.ts` | Event → recipient mapping, disabled rules, entity links |
| `src/workflow/evc.test.ts` | Checklist completion, candidate selection, queue states and legacy normalisation |
| `src/workflow/undertakings.test.ts` | Condition catalogue, route defaults, planning, due dates, bucket derivation, summary reconciliation |
| `src/workflow/selectors.test.ts` | Pipeline reconciliation, stage pendency, ageing, region and officer breakdowns, bottleneck ranking, EVC queue, compliance snapshot, alert summary, progress and visit linking |
| `src/workflow/reports.test.ts` | Six-report catalogue, per-report shape and ordering, overdue filtering, regional totals, filename scoping |
| `src/workflow/templates.test.ts` | Return deficiencies, reminder SLA wording, escalation with no automated decision, approval quoting a recorded competent authority |
| `src/utils/csv.test.ts` | Quoting, BOM, CRLF, header-only exports, column order and missing keys |
| `src/services/rbacService.test.ts` | Alert scoping by status, role, region and institution |
| `src/services/aiGuard.test.ts` | Chat body schema and length limits, byte cap, per-key rate limiting and windows, origin allowlist, demo role closed set |
| `src/services/integration/webhookQueue.test.ts` | Outbox entry shape and idempotency, authority gate for decisions and verification, audit draft, payload cap, queue cap, delivery recording |
| `supabase/tests/rls.sql` | Cross-region and cross-institution isolation, forbidden writes, blocked institution verification, audit immutability, anonymous denial |

Run:

```bash
npm run test:run       # CI
npm run test           # watch
npm run test:coverage  # coverage report
```

---

## 9. Security model (hybrid)

| Concern | Demo (localStorage) | Production (Supabase) |
|---|---|---|
| Identity | Simulated session, shared demo password, labelled | Supabase Auth + `profiles` trigger |
| RBAC | Client checks (simulated) | RLS via JWT claim helpers; client checks are UX-only |
| Scope | `filter*ForUser` helpers | Institution / region / EVC / admin policies |
| Audit | Append-only by convention, capped | Insert-only, UPDATE/DELETE revoked, trigger-enforced |
| Documents | Metadata only | Private bucket, per-institute folders, 25 MB and MIME limits; reads require signed URLs |
| AI | Best-effort rate limit | JWT verified, role server-derived, rate limited |
| Cron | Client tick | `CRON_SECRET` + service-role client |
| Decisions | Authority-role guard + recorded authority | Same guard + DB constraint + audit |

---

## 10. Verification

1. `npm install && npm run lint && npm run test:run && npm run build`
2. Demo mode: `npm run dev`, then run each seeded scene.
3. Supabase mode: apply migrations, set `VITE_DATA_MODE=supabase` and keys, run
   `supabase/tests/rls.sql`, verify cross-role isolation.
4. End-to-end demo script (≈7 minutes):
   - Create an EoA → auto-route to Scrutiny → return with `DOC_MISSING` → resubmit resumes →
     forward to EVC.
   - Approve at Scrutiny is blocked; approve at Final Approval by the competent authority; audit
     shows before/after.
   - Schedule EVC from the queue → stage moves → report overdue escalates L1 → submit report and
     the case auto-advances.
   - Pendency dashboard shows region/stage/officer ageing; drill into a breached case.
   - Conditional approval creates an undertaking → evidence submitted → officer verifies; an
     overdue variant escalates.
   - Lease expiring in 7 days alerts → renewal submitted/verified → old document superseded.
   - Export region-performance CSV; audit explorer chains alert → escalation → action by
     correlation ID.
5. Hallmark verification gates on every new or changed screen.

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Dual-repository drift | One contract test suite; Supabase mapping isolated in `supabaseRepository` |
| Alert noise | Deterministic dedupe keys, configurable thresholds, idempotency tests |
| Non-ISO seed dates | ISO `*At` fields for math; display strings derived; migration normalizer |
| Context split regressions | Split behind an unchanged `useApp()`; no page rewrites during P2 |
| RLS complexity | Migrations plus SQL isolation tests; demo path unaffected |
| Scope creep | Six fixed reports, print-to-PDF only, adapter stub only |

**Estimated effort:** ~28 developer-days sequentially. P5, P6 and P7 can run in parallel after P4.

---

## 12. Deliverables

- Working demo with all A–F flows and seeded evaluation scenarios.
- This implementation document.
- `README.md` with setup, roles, demo accounts and data modes.
- `supabase/migrations/`, consolidated `schema.sql`, `supabase/tests/rls.sql`.
- Vitest suite with CI-ready scripts.
