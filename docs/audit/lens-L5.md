# Lens L5 — Functional correctness on the demo path

Scope: does each screen do what it says, with numbers that agree with each other and with the
store, for the persona that is supposed to use it? Probes D-07, D-08, D-11, D-12, D-14, D-16,
D-17, D-18, D-19 and the page sweep in `docs/audit/evidence/raw/`, run against the demo build
(`apoorvasetu:local`, `:8080`) with synthetic seed data on 2026-11-01. Identity/authority angles
are filed under L4 and L3; the numbers-only consequences stay here.

Score: **5 / 10** — every screen renders, no route is dead, and most aggregates were verified to
agree with their store; the deductions are one state-loss bug on the marquee demo interaction
(demo clock), one crash-class defect (any bad value in localStorage = permanent blank page), and a
growing set of "two numbers, one label" inconsistencies on the screens a judge reads first.

---

## 5.1 Findings

| id | sev | what | where | evidence | conf |
|---|---|---|---|---|---|
| L5-01 | P1 | Advancing the demo clock runs two deadline sweeps inside one tick. The first sweep's new alerts are written to localStorage **and** to the audit trail, then discarded when the second sweep recomputes from stale React state — so `Open` drops from 16 to 6 on reload, and the still-breached case AICTE/2026/12874 gets a false `ALERT_AUTO_RESOLVED … "condition cleared"` row while `stage`, `status` and `stageDueAt` are unchanged. `demoClockOffsetDays` is plain `useState`, so the offset is also lost on reload. | `src/context/AppContext.tsx:2232-2249` (offset set + `setTimeout(runSweep,0)`), `:2017-2089` (`runSweep` reads `sweepStateRef.current`), `:2096-2102` (sweep-on-change effect + 60 s interval), `:270` (offset state); `src/workflow/alerts.ts:426-437` | `evidence/raw/D07_demo_clock_double_sweep.txt` | confirmed |
| L5-02 | P1 | A wrong-typed or shape-incomplete value in `aicte_approval_system_data_v4_apps` produces a permanently blank SPA: no error boundary exists anywhere in `src`, no console-visible UI, recovery is `localStorage.clear()`. `readLocal` only guards `JSON.parse` and returns the parsed value as `T` unchecked; the legacy-key copy path can move an old shape into the current key. `writeLocal` swallows `QuotaExceededError` with a `console.warn`, so a full 8 GB-host quota is silent data loss. | `src/services/repositories/localRepository.ts:49-75`, `:77-84`; `src/main.tsx` (whole file, `createRoot(...).render(<StrictMode><App/></StrictMode>)`) | `evidence/raw/D14_fault_injection_blank_spa.txt` | confirmed |
| L5-03 | P2 | On `/documents`, the label "Valid" is computed twice with different predicates and shows two numbers on one screen: KPI tile 6 vs filter chip 4, and the KPI tile *is* the button that switches the list to the other predicate. The extra two are renewal successors (DOC-508 of DOC-504, DOC-509 of DOC-510), which the tier buckets double-count as separate valid instruments — DOC-504 and DOC-508 have the same expiry `2028-03-15` — and DOC-508 is `status: 'Pending'`, never verified, under the caption "No action required". Tier buckets sum to 9 against "on record 10" with no explanation (DOC-510 Superseded is inside `total`, outside every bucket). Same skew leaves the product: `/reports` shows the 9-row document register with no renewal-chain column. | `src/workflow/documents.ts:230-261` (bucket loop `:245-251`, `isActiveDocument :170-173`) vs `src/pages/Documents.tsx:186` (`isRenewalRecord(doc) \|\| doc.status === 'Superseded'`); tiles `:440-479`, chip click `:454`; `src/pages/Reports.tsx:112`, `src/workflow/reports.ts:247-248` | `evidence/raw/D16_documents_valid_two_counts.txt` | confirmed |
| L5-04 | P2 | `/notifications` mixes a generated queue with five seed rows that restate the same events. Seed rows carry no `dedupeKey`, so the suppression rule can never match them: NOTIF-1 "EVC Report Overdue for NIT Rourkela" vs generated "EVC report overdue for AICTE/2026/12871" (same EVC-8801), NOTIF-3 vs generated `undertaking.overdue:UND-2601`, NOTIF-2 vs two `document.expiring` rows. The list also has no comparable clock: generated rows persist a display string ("01 Nov 2026") as `timestamp`, seed rows a literal ("10 mins ago") that never ages, so the "10 minutes ago" item renders as the oldest row of 19. | `src/context/AppContext.tsx:523-532`; `src/data/initialData.ts:1032-1050` (`:1038`); `src/services/rbacService.ts:324-338` | `evidence/raw/D17_notifications_dupes_and_stamps.txt` | confirmed |
| L5-05 | P3 | An expired-document notice contradicts its own title: "Document expired: renewal required — Registered Land Deed & Possession Certificate **expires 17 Sept 2026**" (45 days in the past). One shared sentence is used for both tiers. | `src/workflow/alerts.ts:255` vs `src/workflow/notifications.ts:364-367` | `evidence/raw/D17_notifications_dupes_and_stamps.txt` §c | confirmed |
| L5-06 | P2 | "Reset demo data" is one unconfirmed click that `clearLocal()`s every store and then rewrites the *data-ownership* identity to a random Regional Officer, while the shell and RBAC identity remain Super Administrator. The divergence survives a fresh sign-in: login writes `apoorvasetu_auth_session_v1` + `apoorvasetu_server_sessions_v1` and never touches `aicte_approval_system_data_v4_user`. | `src/components/common/Header.tsx:487-499`; `src/context/AppContext.tsx:2251-2277`; `src/services/repositories/localRepository.ts:86-92` | `evidence/raw/D19_identity_and_audit_attribution.txt` §3 (with the reset capture in the D-12 notes) | confirmed |
| L5-07 | P2 | Transition buttons have no synchronous re-entrancy guard or idempotency key: `runTransition` sets `isSubmitting` inside the handler, so only same-task multi-dispatch slips through — measured divergence `returns: 1` vs three `RETURN` audit rows for one case. Proven benign for ordinary double-clicks (40 ms apart → one row, modal already closed), so the real-world trigger is a retry/replay, which is exactly Pass C P-04. | `src/components/modals/ApplicationDetailModal.tsx:81-100` (`runTransition`, `submitAction`), guards at `:215`, `:218`, `:226`, `:248` | `evidence/raw/D08_double_submit_audit_rows.txt` | confirmed (duplication) / suspected (user-reachable trigger) |
| L5-08 | P1 | Inspection evidence is the one EVC mutation with no client-side authorization check, and server-side the whole visit row — including `checklist` and `evidenceFiles` — is writable on `evc.schedule` alone, which Regional Officer and AICTE Central Admin hold without `evc.report.submit`. Siblings all check: `completeEVC`, `saveVisitChecklist`, `addVisitEvidence`. The screen calls this "Tamper-proof attachments". | `src/context/AppContext.tsx:1188-1194` vs `:1008`, `:1145`, `:1169`; `src/pages/evc/EvidenceUpload.tsx:66`, `:160-168`; `server/routes/data.ts:207-213` + `saveHandler :116-147` | `evidence/raw/D18_evc_checklist_and_evidence_integrity.txt` | confirmed (code) / runtime pending P-17 |
| L5-09 | P3 | In the demo build, attaching evidence gives no feedback: the `!isFileUploadEnabled()` branch stores only `file.name` and returns before the success toast, and no size/hash/uploader is recorded. | `src/pages/evc/EvidenceUpload.tsx:38-41` (return) vs `:47` (toast) | `evidence/raw/D18_evc_checklist_and_evidence_integrity.txt` §5 | confirmed |
| L5-10 | P2 | The officer note field accepts spreadsheet-formula payloads verbatim (`=cmd\|' /c calc' !A1` stored and re-rendered), and the audit CSV export writes 14 unescaped columns, so a note that reaches the trail is a live formula-injection surface for whoever opens the export. Functional half of L4-06. | `src/components/modals/ApplicationDetailModal.tsx` note textarea (no pattern/`maxLength`); `src/utils/csv.ts:21-31` + audit export | `evidence/raw/S31_csv_and_limiter.txt`, `evidence/qa/` D-09 transcript | confirmed |
| L5-11 | P2 | The demo can only walk the Northern region. `/regions-officials` lists 6 offices; the user table has exactly one `REGIONAL_OFFICER` (`USR-REGIONAL-NORTH`, Northern) among 5 accounts; 8 of 10 seeded applications sit in the other 5 regions, so no Regional Officer persona can act on them. "Others Region" is offered in the `/reports` region filter (7 options) with 0 applications, 0 institutes and no office behind it. | `src/data/demoUsers.ts` (5 accounts), `apoorvasetu_users_v1` read-back, `src/services/rbacService.ts` region scoping, `src/App.tsx:229` + `/regions-officials` render | `evidence/raw/D20_keyboard_traversal.txt` sibling notes (§page sweep) | confirmed |
| L5-12 | P3 | `/regional/escalations` prints "Northern Regional Office" as the acting-office label for a Super Administrator session, and the queue's own numbers are right (5 Open, 5 `ESCALATION_RAISED` audit rows, 0 resolved) — so the label is cosmetic drift, not a data problem. | `src/pages/RegionalEscalations.tsx` header block | page sweep transcript | confirmed |
| L5-13 | P2 | Two different permission seeds for a created account, and the enforced one is neither (in demo mode enforcement reads the live role matrix). The client form sends `permissions: []`, the local service overwrites it with `this.rolePermissions[userData.role]`, the server uses `permissionSetFor(role)`. The form has no password field, so `POST /api/admin/users` falls through to the shared `DEMO_PASSWORD` (L4-02). No warning is shown that a newly created officer starts with nothing. | `src/pages/admin/UserManagement.tsx:59-75` (`:74`), `src/services/authService.ts:659`, `server/routes/admin.ts:112-117` | `evidence/raw/S34_credentials_and_tenant.txt`, `D19` notes | confirmed |
| L5-14 | P3 | An unknown path silently redirects to the dashboard (`Route path="*" → Navigate to "/"`), so a mistyped or stale deep link looks like a working dashboard instead of saying "not found". | `src/App.tsx:266` | page sweep | confirmed |
| L5-15 | P2 | The audit trail is silently truncated to 200 rows (`take: 200`, `orderBy: { id: 'desc' }`) with no total or cursor, because its `timestamp` is a display string that cannot be sorted (see L3/L4). For a screen whose premise is "every approval decision", the reader cannot tell they are seeing the last 200 of N. | `server/routes/data.ts:499`; `prisma/schema.prisma:255-276`; `server/audit.ts:16-26` | `evidence/raw/D19_identity_and_audit_attribution.txt` §4 | confirmed |

Fix effort: L5-01 M, L5-02 M, L5-03 S, L5-04 S-M, L5-05 S, L5-06 S, L5-07 S, L5-08 M,
L5-09 S, L5-10 S, L5-11 S-M, L5-12 S, L5-13 S, L5-14 S, L5-15 M (migration-adjacent).

---

## 5.2 Checked and consistent — protect these

The sweep deliberately tried to break aggregates and got agreement on every one of these; each is
a regression test waiting to be written, not a bug.

- `/pendency` region and stage roll-ups match the scoped application array (12 visible controls,
  numbers internally consistent after a real reload).
- `/alerts` KPI arithmetic (Open / Acknowledged / Resolved / Critical) matches the alert array.
- `/workflow` stage tiles are ordinal + count as separate spans (`1`,`0` → reads as "10" in a flat
  text dump); the real counts 0/3/4/1/0/1/1 sum to the 10 stored applications, and their target
  SLAs match `/admin/system-config` (2, 30, 21, 21, 15, 15, 10).
- `/evc/queue` KPIs 0/3/1/0 = 4 = the EVC-stage application count; EVC-8801 "6 days overdue"
  is correct against `reportDueAt 2026-10-26` and today 2026-11-01.
- `/compliance` tabs All 7 / Open 4 / Awaiting evidence 2 / Submitted 1 / Overdue 1 / Verified 2 /
  Rejected 1 reconcile with the undertaking rows.
- `/institutes` 7 approved + 2 under review + 1 notice issued = "Total institutes 10".
- `/reports` row counts (7/6/7/9/2/6) match the scoped store per report; `Documents expired 1`
  matches the `/documents` Expired bucket.
- Header unread badge 17 = `/notifications` "Unread 17" = 17 unread of 19 stored; admin-sees-all
  notification scoping is the documented rule, not a leak.
- EVC checklist persistence works end to end: click → `EVC-8801.checklist` in storage → survives
  reload ("1/12 assessed"); the progress bar's `aria-valuenow=8` is a percentage of 12, correct.
- `/admin/users` Deactivate/Activate round-trip flips the badge and writes the paired audit rows;
  no self-lockout was attempted on the demo path (the server refuses it — `server/routes/admin.ts:224`).

## 5.3 Not run in this lens

- Real two-browser race on one case (Pass C P-04 optimistic-concurrency replay is the better test).
- `/evc/my-visits` and `/evc-scheduling` as `EVC_MEMBER`; `/institution/profile` as
  `INSTITUTION_ADMIN` — those personas' primary flows were covered by `/evc/checklist`,
  `/evc/evidence` and the apply/track wizard, but the two pages themselves were not opened.
- Any screenshot after `evidence/qa/L06_apply_03_wizard_step2_632.png`: the browser surface went
  to `visibilityState=hidden` and `take_screenshot` fails with `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`.
  DOM transcripts are used instead throughout.
- Rendered sweep at 375/768/1280: no viewport emulation is available (live viewport 632×570 CSS
  px, dpr 1.25). Breakpoint behaviour was reasoned from the `md:`/`lg:` class inventory instead, and
  every claim in L5/L6/L7 that needs a width is stated at 632 px.

## 5.4 Pass C reconciliation — which demo-mode findings survive in Postgres mode

The Postgres overlay re-ran the functional questions as HTTP probes (`evidence/curl/P_pass_c_*.txt`).
This is the mapping, because the synthesis has to state each finding **once**, against the mode it is
demoed in.

| L5 finding | what Pass C measured | status |
|---|---|---|
| L5-07 (no re-entrancy guard on transition buttons) | round 1, P-04: the same `expectedVersion:1` sent twice → **200 then 409 `VERSION_CONFLICT`** ("This case was updated by another officer. Reload before acting.") and exactly **1** audit row for the case, which answers the D-08 double-audit question. Omitting `expectedVersion` → **400** then **403**, row unchanged at `Scrutiny / Re-scrutiny v1`, **0** audit rows added. | stays **P2**, but the risk is a confusing reload, not a duplicated regulated action. Any "could double-audit" wording is withdrawn for Postgres mode. |
| L5-08 (EVC evidence writes the whole row, no client authz) | round 1 P-17 and round 5 P-33: a `REGIONAL_OFFICER` holding only `evc.read`+`evc.schedule` (the spec accepts either) `PUT` **EVC-8805** to `status:"Completed"`, `reportSubmitted:true`, `assignedCommittee:"Committee N-1 (probe)"`, `committeeMembers:["Dr. Probe"]` → **200**; then the same call pushed it back to `Scheduled`/`false` → **200**. `audit_logs` 61 → 61 across both. Out-of-region `PUT` → 403. | **upgraded to P1-confirmed** and re-titled: an officer can file *and un-file* a committee report. Server side is `data.ts:207-224` (no guard, full-row update) — this is also L3-14, which was "static only" until now. |
| L5-15 (audit silently truncated to 200) | round 7 P-42: 210 filler rows written by an EVC session in 28 s → the feed returns exactly 200, 200 synthetic, **0 real**; no `GET` alternative exists; `?auditTake=1000` ignored. | confirmed; **P1**, and it now also indicts the CSV export: `src/pages/admin/AuditLogs.tsx:88-102` builds its rows from the same 200-row in-memory feed, so "Export CSV" produces a **partial export with no indication** (and its local `escape()` quotes but does not neutralise a leading `=`, `+`, `-` or `@`, so L5-10 holds in both modes). |
| L5-04 (generated queue mixed with 5 seed rows that restate the same events) | round 9 P-46: in Postgres mode the seed rows are not just duplicates, they are **mis-ordered** — `ORDER BY "timestamp" DESC` over `"10 mins ago"`/`"2 days ago"` labels gives `NOTIF-3 > NOTIF-5 > NOTIF-1 > NOTIF-2 > NOTIF-4`, **0 of 5 positions** newest-first, and no client re-sort exists. Round 5 P-35 adds that any session may `PUT` a seed row (EVC member flipped `NOTIF-3` to `read:true`, `priority:"low"` — the seed value was `medium`, proven by round 8's comparator) and the institution sees the tampered row; round 1 P-05 adds that an `EVC_MEMBER` can create a `SUPER_ADMIN`-targeted notification. | confirmed and widened — the notification centre is not a per-user queue with a global `read` flag; it is one shared table. |
| L5-11 (the demo can only walk the Northern region) | round 7 P-45 / round 8: the overlay user table is 5 rows, one per role, exactly one `REGIONAL_OFFICER` (`USR-REGIONAL-NORTH`, Northern). Every out-of-region write attempt from that persona returned 403 (P-17, P-25, P-32, P-40f), which is the correct behaviour — the limitation is the dataset, not the enforcement. | confirmed as a **demo-data** limitation, not an authorisation bug. |
| L5-13 (two different permission seeds for a created account; the enforced one is neither) | In Postgres mode the caller's `permissions` array is **ignored**: `admin.ts:118/180` set `permissionSetFor(role)` from `role_permissions`, falling back to `ROLE_DEFAULT_PERMISSIONS[role]`, and `hasPermission` reads `user.permissions` (`rbacService.ts:113-117`). Round 3 P-06's probe account came back with the full 19-permission `AICTE_ADMIN` set it never asked for. | **narrowed to demo mode.** The Postgres counterpart is a different finding, recorded as L4-21: the matrix copy at `admin.ts:273` rewrites every user of a role and is the one admin mutation with **no** audit row (round 10 P-52, audit 95 → 95). |
| L5-09 (attaching evidence gives no feedback in the demo build) | The overlay path works at the API level: round 4 P-28 got presign → `PUT` 204 → `GET` 200 with the real byte length re-checked, `nosniff` + `private, no-store` on download, and correct cross-account 403s. The **browser** flow against `:8081` was not walked (see §5.5). | demo-mode claim stands unchanged; do not read it as an upload defect. |
| L5-01, L5-02, L5-06 (clock sweep double-write, blank SPA on malformed localStorage, one-click demo reset) | all three are localStorage/demo-mode mechanisms with no Postgres counterpart; P-30 (round 4) confirms the assistant and SSE behave differently in the overlay (role from session, 401 unauthenticated, `change` events with table names). | unchanged, mode-labelled `demo`. |

### 5.5 Not run in the overlay either

- The React UI against `:8081` as any persona — every Pass C result is HTTP/psql. The screen-level
  consequences (does `/notifications` render the mis-ordered array as-is, does the audit screen show a
  total) are inferred from the code paths named above, not observed in a browser.
- A genuine two-tab concurrent write race (two sessions, one case, simultaneous `expectedVersion`).
  P-04 proves the single-client replay is refused; the simultaneity case is still unmeasured.
- `EXPLAIN` under the 10× seed the L8 lens asked for: Pass C inflated to **~200×** instead and measured
  end-to-end latency and payload size (`lens-L3.md` §3.13.6). Nothing at exactly 10× was recorded.
- The 375/768/1280 sweep, the screenshots after `L06_apply_03_wizard_step2_632.png`, and
  `/evc/my-visits`, `/evc-scheduling`, `/institution/profile` opened as their own personas — carried
  forward from §5.3 and into the not-run ledger in `00-baseline.md`.
