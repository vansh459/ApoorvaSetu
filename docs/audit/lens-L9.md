# Lens L9 — PS compliance and demo readiness

**Read §9.6 first.** It is the Pass C reconciliation (rounds 1–13, including a new round 13 written
specifically to execute the three writes §9.1 and L9-01/L9-03 had only asserted). §9.6 promotes
L9-01/L9-03 from "confirmed statically" to confirmed live, adds **L9-07** (a full-row PUT overwrites
omitted fields — measured data loss on a seeded undertaking), corrects two rows of the §9.2 criteria
table that relied on the withdrawn L3-03 ordering claim, and closes four of L9-06's six items.

**Basis of this matrix, stated so it cannot be misread.** The repository does not contain the
verbatim text of problem statement 26262 (searched: only `docs/AICTE-26262-IMPLEMENTATION.md`,
`README.md` and this audit folder mention "26262"; there is no PS extract file). The auditable promise
is therefore the repo's own "Problem statement → capability map"
(`docs/AICTE-26262-IMPLEMENTATION.md:13-24`), its "Regulatory rule" (`:26-28`), and the six evaluation
criteria named in the audit brief (workflow accuracy, timeliness of alerts, reliability of deadline
tracking, visibility of pending cases, reduction in manual follow-up, completeness of the audit
trail). Anything the official PS requires beyond those is *not assessed* here and is listed at the
end. Live demo-script timing is Pass B/C.

---

## 9.1 Capability map vs implementation

| Claim (`:13-24`) | Documented status | Verified status | Evidence |
|---|---|---|---|
| Automated routing (type → route, stage path, owner, due date) | Done | **Done** | `src/workflow/routes.ts` 97 % stmts; engine derives path, `server/routes/workflow.ts:86` runs the same code server-side |
| Return / revert with recorded reasons | Done | **Done** | `REASON_REQUIRED` denial (`workflow.ts:43`), reason codes in `src/workflow/codes.ts`, `engine.test.ts` 22 tests |
| Human oversight safeguard — "only a competent authority can approve/reject; automation never decides" | Done | **Partial** | The *sweep* never decides (`src/workflow/alerts.ts:421-423` mutates only `slaTier`) ✔. But a `PUT /api/documents/:id` can set `status:'Rejected'` and `PUT /api/evc-visits/:id` can set `reportSubmitted:true` with no authority field and no audit row (L9-01, L9-02) |
| Role dashboards, pendency, ageing, bottlenecks | Done | **Done, with a data-ordering caveat** | selectors 95 % covered; ageing/due sorts run on display-string dates (L3-03) |
| EVC queue, scheduling, reminders, escalation, auto-advance | Done | **Partial** | auto-advance precondition is a row flag, not the checklist (L9-02) |
| Undertakings and compliance monitoring | Done | **Partial** | verification is properly guarded (`data.ts:311-319`, `workflow.ts:201`), but `dueDate` and `escalationLevel` are writable through the bulk API (L9-01) |
| Lease / document validity (tiers, renewal chain, alerts) | Done | **Partial** | renewal verify endpoint is exemplary (`workflow.ts:271-349`); the same row is writable through `PUT /documents/:id` including `renewalStatus:'Verified'` (L9-03) |
| Notifications, escalation, reports | Done | **Partial** | pipeline exists and dedupes; notifications are ordered by a display string (L3-03) and any signed-in role may create/resolve them (L4 in lens L4 file) |
| **Audit trail — "append-only … production is insert-only, UPDATE/DELETE revoked"** | Done | **False in the running path** | trigger + revokes exist only in `supabase/migrations/…_production_hardening.sql:707-722`; the Prisma `audit_logs` table is plain mutable TEXT with no trigger (`evidence/raw/S17_audit_chain.txt`, `S17b_prisma_audit_ddl.txt`), and 20 of 45 handlers write data without writing audit at all (L3-01). The UI states the false property to the evaluator: `src/pages/admin/AuditLogs.tsx:366` |
| **Secure RBAC and scoping — "Demo guards plus production Auth/RLS/Storage: Done"** | Done | **Partial** | server sessions + per-request scope checks are real ✔; but the permission sets on the bulk API are OR-lists that admit the weakest role (L9-04), and the demo HMAC signing secret ships in the public bundle (L4-01) |

## 9.2 Six evaluation criteria

| Criterion | Static verdict | Reasoning |
|---|---|---|
| Workflow accuracy | **Strong** | one engine, shared by client and server; 22 engine tests; illegal arcs denied (`STAGE_SKIP`, `NO_NEXT_STAGE`, `NOT_AUTHORITY_STAGE`, `ALREADY_TERMINAL`, `NOT_RETURNED` — `server/routes/workflow.ts:32-46`) |
| Timeliness of alerts | **Weak — architectural** | no server-side scheduler; alerts only appear while a tab is open, and only a SUPER_ADMIN tab writes them back (L2-01) |
| Reliability of deadline tracking | **Weak — data model** | every deadline is TEXT in a day-first display format; DB-level ordering of due/expiry dates is wrong (L3-03); deadlines are client-extendable (L9-01) |
| Visibility of pending cases | **Adequate** | pendency/alerts/reports computed and role-filtered server-side (`data.ts:503-531`); undermined by out-of-order notification lists and by any role being able to resolve an escalation |
| Reduction in manual follow-up | **Adequate in-app, absent off-app** | reminders, escalations matrix, SLA tiers all automated ✔; no email/SMS transport at all, so "follow-up" only reaches a user already looking at the screen |
| Completeness of the audit trail | **Not met in the demoed mode** | L3-01 (no server audit on bulk writes), L3-04 (200-row window, no pagination), L3-05 (no DB enforcement), L2-04 (auth events land in a different store in demo mode) |

## 9.3 Findings

### L9-01 — Deadlines and rejections are writable without authority or record (P0, confirmed statically)

The Regulatory rule (`docs/AICTE-26262-IMPLEMENTATION.md:26-28`) promises that `APPROVE`, `REJECT`
and `VERIFY` "always require an identified human with the correct role, and the human's name is
written to the decision record". Three writes on the bulk API break the second half, and two break
the first:

| Write | Field | Who can send it | What the server records |
|---|---|---|---|
| `PUT /api/undertakings/:id` | `dueDate` (`server/payload.ts:302`), `escalationLevel` (`:312`) | any holder of `compliance.submit` — **including the institution itself** (`src/services/rbacService.ts:97`) | new date, no name, no audit row |
| `PUT /api/documents/:id` | `status:'Rejected'` (`payload.ts:276`), `expiryDate` (`:275`) | any holder of `documents.upload` **or** `documents.verify` (`data.ts:267`) — institution qualifies | no `verifiedBy`, no reason, no audit row |
| `PUT /api/evc-visits/:id` | `reportSubmitted`, `status:'Completed'` | `evc.report.submit` **or** `evc.schedule` (`data.ts:210`) | no checklist, no audit row, no version check |

"Extend" is the word the audit brief uses for the forbidden automated action; moving an undertaking
`dueDate` or a document `expiryDate` through this endpoint is exactly that, performed by the party
whose deadline it is. *(Pass C probe P-09 executes all three with an INSTITUTION_ADMIN session and
captures the responses and the resulting `audit_logs` count.)*

### L9-02 — The EVC checklist is not a server-side precondition (P1, confirmed)

`src/workflow/engine.ts:229-232` lets a case forward when
`ctx.evcVisit.reportSubmitted || ctx.evcVisit.status === 'Completed'`. The inspection checklist
(`EVCVisitChecklistItem`, `/evc/checklist`, `/evc/evidence`) is never read by the engine or by
`server/routes/workflow.ts:65-133`. The controlled act is therefore a boolean on a row that the
generic API writes. The UI enforces the checklist; the API does not, and only the API is a security
boundary.

### L9-03 — Renewal verification can be self-issued (P0, confirmed)

`server/routes/workflow.ts:293-300` is the authorized path: it requires `documents.verify`, refuses a
client-supplied `verifiedBy`/`verifiedAt` (`rejectProtected`, `:137-148`), stamps `verifiedBy: user.name`,
sets `renewalStatus:'Verified'` and supersedes the predecessor, all in one transaction with an audit
row. `PUT /api/documents/:id` reaches the same columns — `renewalStatus` is parsed straight from the
body (`payload.ts:281-286`) — while `documentSpec.guard` only refuses incoming `status:'Verified'`
(`data.ts:271-279`) and `documentSpec.update` merely preserves `verifiedBy` from the existing row
(`:278-284`). An institution can therefore mark its own renewal `Verified` (with a future
`expiryDate`) and the renewal chain — the exact thing scenario 10 of the seeded demo
("Verified renewal supersedes the old NOC", `src/data/seedScenarios.ts:153`) demonstrates — becomes
self-service. `verifiedBy` stays empty, so the trail shows an unattributed verification.

### L9-04 — Permission OR-lists admit the weakest role (P1, confirmed)

`assertAnyPermission(req, spec.permissions)` (`server/routes/data.ts:119`) accepts **any one** of the
listed permissions. Every spec pairs a creator/submitter permission with an officer/verifier
permission (`documents.upload`+`documents.verify`, `compliance.submit`+`compliance.verify`,
`applications.create`+`applications.review`, `evc.report.submit`+`evc.schedule`, and
`undertakingSpec` lists three, one of which the institution holds). The read path is separately and
correctly scoped, so this is specifically about *writes*: the endpoint that a verifier is supposed to
own is also open to the verified party. The fix is not "add a check" — it is to split create/submit
from verify/reject, which is what `workflowRouter` already does properly.

### L9-05 — The demo's headline interaction is inert in the mode with a real database (P1, confirmed)

`README.md:71-80` tells the evaluator to open the account menu and advance the **Demo clock**
(`Today/+3d/+7d/+14d`) to show SLA breach behaviour. `src/context/AppContext.tsx:2233` refuses
`setDemoClockOffset` whenever `getDataMode() !== 'demo'`. So against the Postgres container — the
build the README also documents (`README.md:91`) and the one the P14 work just shipped — the clock
control does nothing, while `docs/POSTGRES-DATA-LAYER.md` and the server stamp real time
(`server/audit.ts:16`). Related, from the same screen-gating review:

* `src/pages/auth/Login.tsx:38` decides "is this a real sign-in?" with `getDataMode() === 'supabase'`,
  so **postgres mode renders the demo login**: prefilled `aicteadmin@apoorvasetu.demo` /
  `Apoorva@2026` (`:40-41`), the "Demo accounts" panel exposing the shared password (`:295`), and the
  header badge "Demo environment" (`:157`) instead of "Official AICTE sign-in".
* `src/components/common/Header.tsx:443,487` shows **Reset demo data** only when `isAdmin && isDemo`,
  and the confirmation modal (`:487-499`) destroys the workspace with no second confirmation. In demo
  mode that is the design; in a Postgres demo the same handler is reachable via
  `POST /api/admin/reset` when `ALLOW_DEMO_RESET=1` (`server/routes/data.ts:610-617`).

### L9-06 — Claims that need a live run before they can be marked Done

Six scenarios are asserted by the doc and are only provable in a browser: drill-down reconciliation
(P8), report exports matching the on-screen numbers (P9), the 12 seeded scenes
(`src/data/seedScenarios.ts` — 12 titles, README:75 is correct) all landing in the described state,
EVC evidence upload with the storage adapter, undertaking verification by an officer, and the
audit-log drawer showing previous/new state. Pass B walks them; Pass C re-walks the regulated ones
against Postgres.

## 9.4 Live-demo risk register (static view)

| Risk | Likelihood in this build | Mitigation present | Gap |
|---|---|---|---|
| No alerts appear because nobody's tab ran the sweep | High (L2-01) | manual "Run sweep" button (`AlertCenter.tsx:108`) | the button is client-side too; a judge signing in cold sees nothing new |
| Demo clock does nothing | Certain in postgres mode (L9-05) | none | decide: honour an offset server-side, or hide the control and say so |
| Login screen says "Demo environment" during a production-mode demo | Certain in postgres mode | none | one-line mode check |
| `npx prisma migrate deploy` fails on a fresh clone without `.env` | Certain (`raw/baseline-db-deploy-noenv.txt`) | demo mode needs no DB | README:91 does not say which env vars are mandatory before that command |
| Following README:91 overwrites the demo image | Certain (baseline §3.3) | none | documentation fix |
| Node 20 host cannot start the server | Likely (README:18 vs `--experimental-strip-types`) | none | README fix |
| Assistant unavailable (`GEMINI_API_KEY` empty) | Certain locally (`/api/assistant/status` → `isConfigured:false`) | graceful 503 path exists | the assistant panel's behaviour with no key is a Pass B check |
| Memory pressure on 8 GB during demo | Low at idle (66 MB RSS) | single container | no compose limits (L10) |

## 9.5 Not assessed / out of this audit's reach

Official PS section letters A–F verbatim (text not in the repo); "12 scenarios must map 1:1 to the
PS examples" (no PS text to map against); non-functional PS clauses about hosted deployment,
data-retention policy, accessibility statement or language support, none of which appear in the
repo's own scope document; actual judge reaction.

## 9.6 Pass C reconciliation — what a live request settled

Evidence for this section: `evidence/curl/P_pass_c_round5_output.txt` (P-31/P-32/P-33/P-35),
`round6` (P-38/P-39/P-40), `round4` (P-25b), `round2` (P-21), and
**`evidence/curl/P_pass_c_round13.sh` / `_output.txt`** together with
**`P_pass_c_round13b.sh` / `_output.txt`** — two purpose-built rounds that ran the three writes
L9-01/L9-03 asserted but Pass C had never executed, on real seeded rows, with a JSON capture taken
before any request and a field-by-field equality check after the restore (`round13:P-67/P-68`:
`total field differences: 0`).
Their own history is worth stating, because it is the reason the transcripts read oddly: the *first*
execution of round 13 died on a bash quoting error at line 144 — after it had already run the
literal-body probes above that point, and before it reached the restore — leaving one probe row
behind. The second execution aborted safely at a guard added for exactly that risk
("ROUND 13 ABORTED BEFORE ANY WRITE"). The third produced the table below, in which `P-63a` reports
`409 ALREADY_EXISTS` for that leftover row rather than the `201` it was written to capture. Round 13b
then re-ran just that pair cleanly — `201` with `submittedBy` stamped from the session
(`Dr. K. S. Murthy`, i.e. the institution's own user), then `200` with the institution's own deadline
moved a year out and its `evidenceDocumentIds` wiped to `EMPTY` by the field the body omitted — deleted
the probe row by primary key and re-checked all seven seeded undertakings against their seed shape
(**mismatches: 0**, `UND-2602`'s evidence link present again). No finding here rests on the 409.

### 9.6.1 L9-01 — P0, confirmed live in six variants, every one of them silent

| # | Write (session) | HTTP | State change | `audit_logs` |
|---|---|---|---|---|
| 1 | `PUT /api/undertakings/UND-2602` — `dueDate` 2026-11-05 → 2026-12-05, `escalationLevel` 0 → 4 (AICTE_ADMIN, real seeded row) | 200 | deadline moved by a role that is not the undertaking's owner **and** the sweep's own escalation counter set by hand | **148 → 148** |
| 2 | same row re-sent without `escalationLevel` / `evidenceDocumentIds` | 200 | `L4 → L0`, evidence `Faculty_Retention_Bond_2026.pdf → (empty)` | 148 → 148 |
| 3 | `POST` + `PUT /api/undertakings/UND-PROBE-63` (INSTITUTION_ADMIN, own `instituteId`) `dueDate` 2026-11-20 → **2027-11-20**, then `status Submitted → Pending` | 201 / 200 / 200 (`round13b`, `round13:P-63b/c`) | the party whose undertaking it is pushed its own deadline a year out and un-submitted it | **149 → 149** |
| 4 | `PUT /api/compliance/CMP-101` (own record, INSTITUTION_ADMIN) `dueDate` 2026-11-08 → **2027-08-01**, `escalationLevel` 5, then omitted → `NULL` | 200 / 200 | a compliance deadline the doc lists as monitoring-critical, extended 9 months by the institution | 148 → 148 |
| 5 | `PUT /api/documents/DOC-508` `renewalStatus Submitted → Verified` (AICTE_ADMIN) | 200 | renewal verified without the verification endpoint, `verifiedBy` stays `NULL` | 148 → 148 |
| 6 | `POST` + `PUT /api/documents/DOC-PROBE-64` `renewalStatus → Verified`, `expiryDate → 2036-11-01` (INSTITUTION_ADMIN, own row) | 201 / 200 | **the applicant verified its own renewal** — L9-03's exact claim | 148 → 148 |

Controls that held, and therefore narrow the fix: `INSTITUTION_ADMIN` on the Eastern undertaking →
403 `SCOPE_DENIED` ("belongs to another institution"); `DOC-503` out-of-region → 403;
`CMP-104 status Verified` → 403 `REGULATED_FIELD`; the same document body with `status:'Verified'`
added → 403 (P-64b). So the hole is not scope and not the status guard — it is that the guard reads
**only the incoming `status`**, and every other regulated column (`dueDate`, `escalationLevel`,
`renewalStatus`, `reportSubmitted`, evidence links) is unparsed-but-writable. `AICTE_ADMIN` reaches
all of it because `isCentral(user)` returns before any region test (`server/scope.ts:63`).

The PS-relevant framing for the report: `docs/AICTE-26262-IMPLEMENTATION.md:26-28` promises that
approve/reject/verify need "an identified human with the correct role, and the human's name is written
to the decision record". Rows 1–6 above are decision-shaped changes to a decision record with **no
name, no reason and no record**, performed by a role the rule says may not perform them (row 3 and 4
are the applicant itself).

### 9.6.2 L9-07 (new) — a full-row PUT destroys what the client omits (P0, confirmed)

`server/payload.ts:312` is `escalationLevel: optionalNumber(body, 'escalationLevel') ?? 0` and
`:303` is `evidenceDocumentIds: optionalStringList(...) ?? []` (both inside `parseUndertaking`,
`:293`); `undertakingSpec.update` (`server/routes/data.ts:333-343`) then writes the parsed object
wholesale through `toUndertakingData`, carrying over only `verifiedAt`, `verifiedBy` and `submittedBy`.
`complianceSpec.update` (`:251-258`) behaves identically for `escalationLevel`, which
`parseComplianceRecord` (`payload.ts:238`, field at `:257`, no `?? 0`) leaves `undefined` — measured as
`L5 → L-NULL` — and `evcSpec.update` (`data.ts:221-223`) is the barest of all: no `guard`, no
`existing`, no `version`.

Consequence, measured on the seeded row rather than argued: a client that round-trips
`GET /api/snapshot` → edit → `PUT` (which is exactly what `postgresRepository.upsert*` does) **deletes
the evidence links an officer verified against** and resets the SLA escalation counter. Row 2 of the
table above did that to `UND-2602` in one request; only a direct `UPDATE` by primary key put it back.
There is no audit row to explain the loss, which is why this is a second finding rather than a detail
of L9-01: L9-01 is authority, **L9-07 is data loss**. Severity P0 under the brief's own wording
("data loss or integrity break"). Fix: merge the parsed body over `existing` for every key the request
did not contain, or move these routes to genuine partial patches with an explicit absent-vs-null rule
and an allow-list of patchable columns. Effort M (nine specs × their `update`). Confidence: confirmed
(two tables, three fields, reversible only by SQL).

### 9.6.3 L9-02 — unchanged, with the sharper half now measured

`EVC-8805` was flipped `reportSubmitted true → false` and back by a `REGIONAL_OFFICER` whose
permission list is `evc.read, evc.schedule` — it does **not** hold `evc.report.submit`
(`round5:P-33`, and the DB's own `role_permissions` row printed in §9.6.4). The engine's precondition
remains a row flag (`engine.ts:229-232`) that the checklist never gates. Add: `evcSpec` has no
`version` comparison, so this write cannot even lose a race — unlike `applicationSpec`, which 409s
(`round2`/L5-07 measured `VERSION_CONFLICT`).

### 9.6.4 L9-04 — confirmed, and the running ACL proves the worse variant

From `role_permissions` in the live database (not the client copy):

| Spec (`permissions` OR-list) | Who passes it | Why that is the wrong person |
|---|---|---|
| `documentSpec` = `documents.upload`, `documents.verify` | INSTITUTION_ADMIN (upload only) | the verified party can write the verification-shaped fields (L9-07 row 6) |
| `undertakingSpec` = `applications.review`, `compliance.verify`, `compliance.submit` | INSTITUTION_ADMIN via `compliance.submit` | the institution submits undertakings *and* may now edit their deadline/level |
| `complianceSpec` = `compliance.submit`, `compliance.verify` | INSTITUTION_ADMIN | submitter ors with verifier on one endpoint |
| `evcSpec` = `evc.schedule`, `evc.report.submit` | REGIONAL_OFFICER (`evc.schedule`) | **holds no report right at all** and still filed/un-filed the report |
| `escalationSpec`, `notificationSpec`, `alertSpec` | see L4 §4.16.2 | low-privilege sessions wrote national alerts and SUPER_ADMIN-directed notifications |

Two corrections to §9.1's "Secure RBAC" row: the wildcard that matters server-side is
`assertAnyPermission` over `user.permissions` (`data.ts:119`), and `role_permissions` is a **cache** —
`admin.ts:118/180/273` copy it into user rows, so rewriting the matrix silently changes nothing for
existing users, which round 10 (P-52) measured end to end (200 response, matrix unchanged, user
permissions unchanged, zero audit rows → L4-21).

### 9.6.5 L9-05 — settled for the clock, still open for the pixels

* Demo clock: the refusal is `AppContext.tsx:2233` and the server has no notion of an offset
  (`server/audit.ts:16` stamps wall time) — every Pass C row is proof: `"01 Nov 2026, 06:07 PM"` for a
  request made at 18:07Z. **Confirmed.**
* The destructive path is *gated*, and that is a strength worth keeping in the report:
  `POST /api/admin/reset` requires `SUPER_ADMIN` **and** `process.env.ALLOW_DEMO_RESET === '1'`
  (`data.ts:612-618`) before `clearDatabase`. The audited container's environment is
  `UPLOAD_MAX_MB, NODE_ENV, PORT, DATABASE_URL, DIRECT_URL, SEED_ON_START, STORAGE_DRIVER, UPLOAD_DIR`
  — the flag is absent, and unauthenticated → 401. It was deliberately **not** exercised with a
  superadmin session, because a successful call drops the dataset; the code path plus the missing flag
  is the evidence.
* Not settled: the login-screen half of L9-05 (demo credentials panel and "Demo environment" badge
  rendering under `getDataMode()==='postgres'`) is still **static-only** — no browser walk of `:8081`
  happened (§9.6.7).

### 9.6.6 L9-06 — four of the six claims are now closed, one is measurably false

Measured census over all 148 live `audit_logs` rows (`round13:P-66`):

```
rows with a non-empty previousState / newState : 11   (7.4 %)
  of which the seed family LOG-1001…LOG-1005   : 5    (source = '', hand-written)
  of which real server writes                  : 6    (5 VERIFY_DOCUMENT + 1 FORWARD, all produced by this audit)
rows with a correlationId                      : 1    (a seed value, COR-1793555085534-u0f4)
rows with no states at all                     : 137  (every generic write, every login event, every sweep)
```

So the doc's `:23` "before/after state, correlation IDs, production persistence … **Done**" is false
for the running path, and `src/pages/admin/AuditLogs.tsx:366` tells the evaluator the trail is
append-only in a database where round 9b measured `pg_trigger` count **0**, no rewrite rules, and
`UPDATE DELETE TRUNCATE` granted to the application role (the trigger and revokes live only in
`supabase/migrations/20261101090000_production_hardening.sql:707-722`, which the Postgres path never
runs). Closing status of the six: **audit drawer — closed, and false**; **undertaking verification by
an officer — closed and correct** (the regulated endpoint is the one part of the system that behaves
as the PS wants: `verifiedBy` from session, `outcome` branch, 409 `INVALID_STATE` without evidence,
400 without a reason, one transaction, one audit row — recorded as a strength); **EVC evidence upload
— closed at API level** (presign→PUT→signed download, L5-09) **not in the UI**; **the 12 seeded
scenarios — data present** (L3 §3.13.10 `total field differences: 0` against the demo dataset) but
interactions walked in demo mode only; **drill-down reconciliation and report exports — browser-only,
not re-run against Postgres**, and L5-15 already shows the CSV is built from the same capped 200-row
feed, i.e. silently partial.

### 9.6.7 Corrections and withdrawals inside this lens

| Item | Correction |
|---|---|
| §9.2 "Reliability of deadline tracking … DB-level ordering of due/expiry dates is wrong (L3-03)" | **Restated, not repeated.** Round 9 (P-47/P-48) measured the due/expiry rank mismatch as **0 of 5** and L3 §3.13.3 withdrew the live-ordering claim. What survives is: the columns are TEXT with **two coexisting formats** (seed writes `2026-11-05`, the UI writes `01 Nov 2026, 06:07 PM`), so ordering is undefined-by-construction and format is unvalidated (`L4-18` stored `expiryDate:"not-a-date"` on a Verified row). The *demonstrated* ordering failure is the notification list (round 9 P-46: **0 of 5** positions correct), which is a "visibility of pending cases" defect. |
| §9.1 "Role dashboards … ageing/due sorts run on display-string dates" | Same correction; keep the format finding, drop the ordering assertion. |
| §9.1 audit row, `supabase/migrations/…_production_hardening.sql` | Filename is `20261101090000_production_hardening.sql` (round 9b P-50b); the self-test in `supabase/tests/rls.sql:196,208` exists but is executed by nothing. |
| §9.1 "a `PUT /api/documents/:id` can set `status:'Rejected'` … with no authority field and no audit row (L9-01)" | Confirmed for `Pending`/`Expired` (P-21, P-31) and **narrowed**: `status:'Rejected'` from the applicant itself → 403 (P-39d); the rejection the UI actually performs is a generic PUT **plus a browser-authored `POST /api/audit`** whose wording the server stored verbatim (P-39, L3-11/L4-16). |
| §9.1 "20 of 45 handlers write data without writing audit" | Superseded by the live census: **0 generic writes produce audit rows**, so the number that matters for the demoed mode is "every write except `workflowRouter` and `adminRouter`". |
| §9.4 risk row "Memory pressure on 8 GB" | Updated by L8 §8.9.6 — soak flat at 518 MiB, 84–100 MiB after restart; the honest residual is no compose limit while `Dockerfile:28` allows a 2 GiB heap inside a 3.5 GiB VM. |
| §9.4 risk row "Assistant unavailable" | `/api/assistant/status` is **public** and answers `{"isConfigured":false,"provider":"gemini","model":"gemini-3-flash-preview"}` (round 5 P-37) — a cold judge sees the model name before signing in; recorded in L4 §4.16.4. |

### 9.6.8 Final L9 severities

| id | title | severity | confidence |
|---|---|---|---|
| L9-01 | Regulated fields (dueDate, escalationLevel, renewalStatus, reportSubmitted) writable off-endpoint with no name and no record | **P0** | confirmed live, 6 variants |
| L9-02 | EVC checklist is not a server-side precondition | P1 | confirmed |
| L9-03 | Renewal verification self-issued | **P0** | confirmed live, both roles |
| L9-04 | Permission OR-lists admit the wrong role | P1 | confirmed (live ACL) |
| L9-05 | Demo clock inert in the mode with a real database | P1 | confirmed (server-side); login UI half static-only |
| L9-06 | "Before/after state + correlation IDs … Done" vs 11/148 and 1/148 | P1 | confirmed |
| L9-07 | Full-row PUT nulls omitted fields — evidence links destroyed, escalation reset | **P0** | confirmed |

Proposed lens score **4/10** — the workflow engine, the transitions router and the verification
endpoint are genuinely good PS work and they survive every probe; the generic write API bypasses them
for the exact columns the PS grades, and the audit-trail promise is the one the evaluator is told
about in the UI. Final score is set in L1 / `AUDIT_REPORT.md`.

### 9.6.9 Not run in this lens

No browser walk of `:8081`, so every "what the evaluator sees in Postgres mode" claim in §9.1/§9.4
stays static (login panel, demo-clock control, audit drawer, exports). The destructive
`POST /api/admin/reset` was not exercised by design. Drill-down reconciliation and report-export
equality were verified in demo mode only. The Supabase-mode driver (RLS policies, storage bucket,
`supabase/tests/rls.sql`) was never executed — the audited stack is the Postgres overlay, so every
"production Auth/RLS" claim in `docs/AICTE-26262-IMPLEMENTATION.md` remains unproven either way.
