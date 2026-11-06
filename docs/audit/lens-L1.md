# Lens L1 — Product, PS fit and the first sixty seconds

**What this lens is.** The plan runs L1 last, on purpose: it is a roll-up of what L2-L10 proved, asked
from the buyer's side rather than the code's. Nine lenses say whether the system is correct; this one
says what an AICTE evaluation panel sees in the first minute, which of the product's advertised
differentiators survive contact with the running Postgres build, and what should be cut before a demo.
No new probes were run to write it — every number below is quoted from `00-baseline.md`,
`lens-L2…L10.md` and the transcripts in `evidence/`, with the section cited. Where a claim rests on
code reading only, it says **static**.

Commit audited: `794e54c`. Modes audited: demo container `:8080` (Pass B, browser) and Postgres
container `:8081` (Pass C, HTTP + `psql`). The audited stack is the local Docker overlay; the Supabase
"production" path was read but never executed (see §1.7).

---

## 1.1 The first sixty seconds, measured

A judge following `README.md:16-23` on a laptop gets this, in order:

| t | what happens | measurement | lens |
|---|---|---|---|
| 0 s | `git clone` + `npm install` | 367 packages, **79.2 s** from the committed lockfile on an 8 GB host; `node_modules` 567 MB | L10 §10.10 |
| — | `npm run build` (if the judge tries it, or runs the documented gate) | **fails: 64 TypeScript errors**, because the Prisma client is still the 3,989 B stub; `npx prisma generate` fixes it in 1.00 s and the same build then exits 0. `npm run dev` (the README's actual host path) never type-checks, so it hides this | **L10-06** |
| 0-2 s | browser opens `http://localhost:5173` (dev) or `:8080` (container) | SPA shell **1,356,306 B** transferred — the server sends no `Content-Encoding` despite `Accept-Encoding: gzip, br`; the gzipped equivalent is 351,445 B | L8 §8.9.2 (**L8-07**) |
| 2-4 s | login screen renders | Demo mode: persona picker with the shared password `Apoorva@2026` printed twice, one 200,420 B design PNG referenced only by `Login.tsx:184` | L4-02, L6-07, L8-02 |
| 4-6 s | sign-in | server: **214-396 ms** for one credential check (scrypt, `0.396/0.255/0.214` s measured), 8 sequential sign-ins in 1,348 ms; wrong password and unknown email cost the same as the right one (no timing leak) | L8 §8.9.7, L3 §3.13.6 |
| 6-10 s | first dashboard paint | `GET /api/snapshot` — **mean 161 ms / 69.3 KB** for a superadmin at seed volume, 6.9 KB for an institution. Container RSS 84-130 MiB; `/api/ready` answers 200 after 5.1-10.0 s from a cold start | L8 §8.9.1, round 11/12 |
| 10-60 s | the judge looks for the thing the README sells | **the deadline alerts centre is empty unless some tab has already run the sweep** — there is no server-side scheduler; `api/cron/sweep.ts` is Vercel-only and the in-container sweep runs in a logged-in browser tab, gated to SUPER_ADMIN | **L2-01**, L9 §9.4 |

Verdict on the first minute: it is **fast enough and honest about being a demo**, but two of the six
things the README promises are not in the box — the sweep (L2-01) and, in Postgres mode, the demo
clock (L9-05). The third is invisible to a judge but fatal to the audit story: the append-only claim
printed inside the audit drawer is false in the running database (L3-05).

## 1.2 The six PS criteria, scored from what Pass C could prove

This is L9 §9.2 after its §9.6 reconciliation — the version that has lived up to a request.

| Criterion | Grade | What settles it |
|---|---|---|
| Workflow accuracy | **Strong (A-)** | one engine shared by client and server, 22 engine tests, illegal arcs refused with typed denial codes (`STAGE_SKIP`, `NO_NEXT_STAGE`, `NOT_AUTHORITY_STAGE`); a real transition replayed twice returns **200 then 409 `VERSION_CONFLICT`** with exactly **1** audit row. Nothing about the state machine was found wrong |
| Timeliness of alerts | **Weak (D)** | no server-side host for the sweep (L2-01); alerts appear only while a tab is open, and only a SUPER_ADMIN tab writes them back. Live probes confirmed the consequence, not the mechanism: an escalation can be pre-empted by a placeholder row written by the least-privileged role (L3-07, round 6 P-40) |
| Reliability of deadline tracking | **Weak (D+)** | the deadline *columns* are writable by the party whose deadline it is — `dueDate`, `expiryDate`, `escalationLevel`, `renewalStatus` — with no name and no record (L9-01, six live variants, `audit 148 → 148` every time). Dates are TEXT with two coexisting formats and no validation: `expiryDate:"not-a-date"` was stored on a **Verified** row (L4-18) |
| Visibility of pending cases | **Adequate (C)** | pendency/ageing/bottleneck selectors are computed and role-filtered server-side and were verified against the seed (L3 §3.13.10: `total field differences: 0`). Two visible defects: the notification list renders in an order that measured **0 of 5** positions correct (round 9 P-46) and the `/documents` screen shows "Valid 6" and "Valid 4" for the same table (L5-03/L6-02) |
| Reduction in manual follow-up | **Adequate in-app, absent off-app (C-)** | reminders, escalation matrix and SLA tiers exist; there is **no email/SMS transport at all** (`notificationEmailAlerts` is an inert flag), so nothing reaches a person who is not already looking at the screen |
| Completeness of the audit trail | **Not met in the demoed mode (F)** | of 148 live rows: **11** carry any before/after state, **1** carries a correlation ID, **0** generic writes produce a row at all, `pg_trigger` count is **0**, `UPDATE/DELETE/TRUNCATE` are granted to the app role, and the UI states the opposite property to the evaluator (`AuditLogs.tsx:366`). The provenance field `source` is chosen by whoever posts the row (L3-01, §3.13.1) |

## 1.3 Differentiators: what the product claims makes it special, tested

| Claim | Reality in the audited build | Evidence |
|---|---|---|
| **Policy-as-data** (routes, stages, SLA config outside code) | **True, and it is the best idea in the repo.** `src/workflow/routes.ts` + `config.ts` are pure modules the server imports directly, so demo and Postgres modes cannot disagree about legality (L2 "structurally right" §1). Caveat: `config.ts` functions are 0 % covered by tests (baseline §4) and the SLA-edit probe (P-11) showed a config change does not re-derive an in-flight case's due date | L2 §head, `evidence/raw/S20_layering.txt`, baseline §4 |
| **Dual-clock SLA** (real clock + demo clock) | **Half true.** `sweepDeadlines` accepts an injected `now` (`alerts.ts:290`) — genuine seam — but the two clocks disagree inside one request in Postgres mode: the client computes tiers from the simulated date while `server/audit.ts:16` stamps wall time (L2-03). Measured: every Pass C audit row is timestamped `"01 Nov 2026, 06:07 PM"` for a request made at 18:07Z, whatever the demo clock said | L2-03, L9 §9.6.5 |
| **Simulated clock** (advance `Today/+3d/+7d/+14d`) | **Inert in the mode with a real database.** `AppContext.tsx:2233` refuses `setDemoClockOffset` whenever `getDataMode() !== 'demo'`. README:71-80 tells the evaluator to use it. So the headline demo move does nothing against Postgres — and the login screen in that mode still says "Demo environment" and offers the persona picker | **L9-05**, `round13` timestamps |
| **Hash-chained, append-only audit** | **False.** No hash, prev-hash, sequence or chain column exists in any schema; `pg_trigger` on `audit_logs` = **0**; a probe `UPDATE` rewrote a real row's `details` to "REWRITTEN BY THIS PROBE…" and a `DELETE` removed a row (both rolled back inside the transaction, so nothing persisted). The trigger and the `revoke update, delete, truncate` do exist — in `supabase/migrations/20261101090000_production_hardening.sql:707-722`, a path the Postgres build never runs | **L3-05**, §3.13.5, `evidence/raw/S17_audit_chain.txt` |

## 1.4 What a judge will see that makes the product look unfinished

Ranked by how likely a panel is to hit it, not by severity.

1. **Reject on a document and the row comes back Verified.** The regulated endpoint is verify-only;
   the request body is ignored (L3-10 = L4-16, round 6 P-38: `{"decision":"Rejected",
   "competentAuthority":"Automated Rejection Pipeline"}` → **200**, stored `status:"Verified"`).
   The rejection the UI actually performs is a generic `PUT` plus a `POST /api/audit` whose wording
   the server stores verbatim (L3-11, P-39). **This is the single most damaging demo-path defect.**
2. **An empty alerts centre** on a cold boot (L2-01), with a "Run sweep" button that is itself
   client-side (§1.1).
3. **"Valid 6" and "Valid 4" on one screen**, where the KPI tile is the button that switches the list
   to the other number (L5-03/L6-02), and `/pendency` printing 43 literal `0` cells in the failing
   contrast token (L6-01/L7-02).
4. **Sidebar labels "Alert center10"** — accessible name and visual name both run the badge into the
   words (L6-06/L7-09).
5. **The demo can only walk one region.** `/regions-officials` lists six offices; the user table has
   exactly one `REGIONAL_OFFICER` (Northern), so an officer persona for Eastern/Western/Southern has
   nothing to open (L5-11).
6. **A keyboard user cannot use the mobile drawer**: closed, it stays in the tab order — 14 of 35
   stops are off-screen from the very first Tab (L7-01). No skip link anywhere (L7-03).
7. **The audit drawer's own sentence** — "append-only and cannot be edited or deleted" — is checkable
   in thirty seconds by anyone with the container (`psql` is one `docker exec` away).

## 1.5 What to protect (do not let a fix wave break these)

- The **shared pure workflow core** and the **transitions router**: one `$transaction`, session-stamped
  `verifiedBy`, `expectedVersion` → 409, one audit row per regulated act. Pass C attacked this path from
  six directions and it held every time; it is the part of the system that already meets the PS's
  regulatory rule (`docs/AICTE-26262-IMPLEMENTATION.md:26-28`).
- **Scope enforcement**: out-of-region and out-of-institute writes returned 403 `SCOPE_DENIED` in every
  probe that tested it (rounds 5, 6, 12) — the hole is *which columns*, not *which rows*.
- **Session design**: random token, SHA-256 lookup, DB-side expiry, `httpOnly` + `SameSite=Lax`, and
  `clearLoginRate` on success with a dummy-hash path so unknown emails cost the same.
- **Index and query hygiene**: full inventory, every filtered column indexed, the capped audit read is
  an `Index Scan Backward`; the reads are 0.4-6 ms even at 200× seed. The snapshot problem is the
  unbounded `SELECT *`, not the planner.
- **Upload safety**: allowlisted content types, declared size at presign *and* real byte length at PUT,
  key validated against `..`, UUID-namespaced names, `nosniff` + `private, no-store` on download.
- **Dialog accessibility primitives**: focus trap, `Escape`, focus return, `role="dialog"`, scoped
  table headers, captions, one global `:focus-visible` ring. L7's deductions are all at the edges of a
  system that is already right.
- **The destructive reset is double-gated**: SUPER_ADMIN **and** `ALLOW_DEMO_RESET=1`; the flag is
  absent from the audited container, and the audit deliberately never exercised it.

## 1.6 What to cut, with the bytes it saves

| Cut | Saves / why | source |
|---|---|---|
| `public/screenshots/*` + `stat-cards-reference*` (design artefacts shipped to every visitor) | **313,784 B of 322,665 B under `public/` is unreferenced**; `Login.tsx:184` is the only reference to the 200,420 B PNG | L8-02, §8.9.4 |
| The legacy Supabase client and `src/services/supabaseClient.ts` from the demo build | shipped in the single 1.27 MB chunk while `VITE_DATA_MODE=demo`; dead weight on the path the judge takes | baseline §4/S-16, L2-09 |
| `server/webhookOutbox.ts` (Supabase-only, invoked by no route) and `Skeleton.tsx` (referenced by zero files) | dead code the tests do not cover, so it also costs review attention | L2-09, D-13 |
| `notificationEmailAlerts` in System config | an inert toggle that promises a transport the product does not have — worse than absent, because a judge will click it | S-19, baseline §7 |
| The "Demo clock" control **in Postgres mode** (hide it, don't fake it) | it does nothing there; either honour an offset server-side or remove the control and say so in the demo script | L9-05 |
| The `append-only` sentence in `AuditLogs.tsx:366` | it is the one claim in the UI that the running database contradicts; replace with "insert-only in production mode" once the trigger ships | L3-05, §9.6.6 |
| The shared-password persona picker **in Postgres mode** | `Login.tsx:38` keys off `'supabase'`, so the real-DB build renders demo credentials and a "Demo environment" badge | L9-05, L4-02, S-15 |

## 1.7 The three risks to winning, and what each one costs

1. **The decision path can be forged by the party being decided about** — AUD cluster
   [L9-01 / L9-03 / L9-07 / L3-12 / L9-04]. An institution moves its own undertaking deadline a year
   out, marks its own renewal `Verified`, and the row that records the evidence link is nulled by the
   same request. Three P0s, one root cause: the generic write API is a second, ungoverned door into the
   regulated columns. Fix is nine `SaveSpec.update` functions + a column allow-list — effort **M** each,
   and it is the fix that changes what the PS scorecard says about "reliability of deadline tracking".
2. **A negative decision cannot be made correctly** — [L3-10 / L4-16 / L3-11]. There is no server path
   for "Reject a document"; the endpoint built for regulation answers a rejection by recording a
   verification, and the UI works around it with an unaudited write plus a self-authored audit row. If a
   judge asks for a rejection during the demo, the product visibly lies, in the audit trail, twice.
   Effort **S-M** (add the `outcome` branch that `undertakings` already has, then point the client at it).
3. **The audit trail is not what the documentation says it is** — [L3-01 / L3-05 / L9-06]. 0 of 148
   generic writes recorded, 11 rows with any state, 1 correlation id, no trigger, and a UI sentence
   asserting immutability. The `supabase/migrations` file already contains the trigger and the revokes;
   what is missing is the decision to run them in the mode being demoed, and to stop claiming the
   property until then. Effort **S** for the trigger/revokes, **M** for writing a row on every generic
   write path.

## 1.8 Lens score

**L1 score: 5 / 10** (a product judgement, not an engineering one).

Justification: the workflow engine, the transitions router, the verification endpoint, scope
enforcement, session design and upload safety are all genuinely good and survived every attempt to
break them — that is most of the PS's functional surface, and it works. Deductions: the three risks in
§1.7 land exactly on the two things an AICTE panel is instructed to grade (a recorded human decision,
and a trustworthy trail), the headline demo interactions are inert or misleading in the mode that has a
real database, and the alerts story — "timeliness" — has no server-side host at all. A judge who reads
`docs/AICTE-26262-IMPLEMENTATION.md` against the running build will find three "Done" rows that are not.

Per-lens scores proposed for the roll-up card: L2 (architecture) and L3 (backend) are set in
`AUDIT_REPORT.md` from the finding populations in `evidence/raw/rollup-*.tsv`; L5 **5/10**, L6 **7/10**,
L7 **6/10** are the lenses' own scores; L8 **6/10** and L9 **4/10** are the proposed scores stated in
those files; L10 and L4 are set in the report.

## 1.9 Not covered by this lens

No browser ever opened the Postgres build at `:8081` (Pass C answered at the HTTP layer), so every
"what the evaluator sees in Postgres mode" statement above is static-only except where a transcript is
cited — the login panel, the demo-clock control, the audit drawer and the CSV export all still need a
`:8081` walk (L9 §9.6.9, baseline §11.2). The Supabase production path — RLS policies, storage bucket,
`supabase/tests/rls.sql` — was read but never executed, so no claim in §1.3 about "production Auth/RLS"
is proven in either direction. Official PS 26262 text is not in the repository, so §1.2 grades the six
criteria named in the audit brief against the repo's own capability map
(`docs/AICTE-26262-IMPLEMENTATION.md:13-24`), which is the nearest available proxy (L9 basis note).
