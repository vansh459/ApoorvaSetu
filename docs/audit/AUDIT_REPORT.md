# ApoorvaSetu — Audit report

Commit audited: `794e54c` (all ten lenses, all probes). Baseline: [`00-baseline.md`](00-baseline.md).
Lens files: [`lens-L1.md`](lens-L1.md) … [`lens-L10.md`](lens-L10.md). Fix waves: [`FIX_PLAN.md`](FIX_PLAN.md).
Evidence: `evidence/raw/` (50 files), `evidence/curl/` (17 probe rounds, script + transcript each),
`evidence/psql/`, `evidence/qa/`, ledger [`evidence/probe-log.md`](evidence/probe-log.md).

---

## Verdict

**Not demo-ready for judging.** The regulated workflow engine is genuine, well-tested engineering, but it is
not the path the application actually uses: a generic write API next to it can set every column the rubric
grades — `verifiedBy`, `status`, `dueDate`, `expiryDate`, `escalationLevel`, `renewalStatus`,
`evidenceDocumentIds` — without a transaction, without a server-side audit row and, for three of the
endpoints, without any permission at all. Seven P0 findings are live-probed against the database
`docker-compose.postgres.yml` boots, not theorised.

| | |
|---|---|
| Raw findings recorded in the lenses | 103 (L2 10, L3 17, L4 21, L5 15, L6 8, L7 10, L8 8, L9 7, L10 7) |
| After dedup by root cause | **69** findings, `AUD-001` … `AUD-069` |
| By severity | **7 P0 · 20 P1 · 30 P2 · 12 P3** |
| By confidence | 54 executed live · 14 read from source · 1 mixed |
| Aggregate lens score | **5.2 / 10** |
| Wave 1 (all 7 P0 + the 3 demo-breaking P1s) | **10 rows · 12.6 h ≈ 1.6 working days** — see [`FIX_PLAN.md`](FIX_PLAN.md) |

### The three risks to winning, as findings

1. **A judge can null out evidence links and reset an escalation in one PUT** — `AUD-006` (payload
   wholesale-parse), with `AUD-003` (field guards test only the incoming status), `AUD-011` (no
   constraint backs it up), `AUD-017` (a date that does not parse is stored on a *Verified* row) and
   `AUD-013` (dedupe keys are not unique). Data loss on the graded fields, reproducible with curl.
2. **A rejection is recorded as a verification, and the negative decision that does land is unaudited and
   client-authored** — `AUD-001` (`/documents/:id/verify` has no outcome branch), `AUD-002` (no
   transaction/audit row), `AUD-008` (queue objects declare `permissions: []`). This is the regulatory
   safeguard failing in front of the evaluator.
3. **The audit trail — the product's central trust claim — is mutable, capped, and half-empty** — `AUD-004`
   (no trigger, `UPDATE/DELETE/TRUNCATE` granted in the running schema; immutability exists only in the
   unexecuted Supabase migration), `AUD-009` (200-row cap, buryable by any session), `AUD-010`
   (correlation IDs / before-after state advertised as Done: 1 of 148 rows, 11 of 148).

---

## Scorecard

| Lens | Score | One line of justification |
|---|---|---|
| **L1** Product & PS fit | **5 / 10** | Policy-as-data is true and visible; the dual-clock SLA is half true, the simulated clock is inert in the mode with a real database, and the hash-chained-audit claim is false ([lens-L1.md §1.3](lens-L1.md)). |
| **L2** Architecture | **5 / 10** | A real state-machine core with 232 passing tests, undermined by an engine whose deadline sweep has no server-side host (`AUD-007`), impurity inside the pure core (`AUD-020`) and locking honoured on one of two write paths (`AUD-019`). |
| **L3** Backend | **4 / 10** | Every indexed filter is an `Index Scan`, sessions and uploads are properly built — and the bulk write API commits unaudited, the schema enforces nothing, and history is mutable (`AUD-002/004/011/012`). |
| **L4** Security | **5 / 10** | No SQL injection, no XSS sink, scrypt-hashed passwords, httpOnly session cookies, magic-byte-validated uploads all held. The holes are authorization breadth and a signing secret shipped in the bundle (`AUD-015/016/018`, `AUD-001`). |
| **L5** Functional QA | **5 / 10** | 19 routes render, no dead route, most aggregates tie out to the database; the demo clock double-sweep, the blank-SPA failure mode and the "Valid 6 / Valid 4" split are the ones a judge can hit ([lens-L5.md:9](lens-L5.md#L9)). |
| **L6** UI design | **7 / 10** | A designed product, not a kit screenshot — one type scale, a real token set, no gradient tells. One colour token fails AA where it carries meaning ([lens-L6.md:10](lens-L6.md#L10)). |
| **L7** UX & accessibility | **6 / 10** | Dialogs trap and restore focus, every control has a name, every table has a caption and scoped headers. The drawer is a keyboard hazard under `lg`, and errors/results are unannounced ([lens-L7.md:12](lens-L7.md#L12)). |
| **L8** Performance | **6 / 10** | Complete index inventory, flat 240 s soak, `no-store` correct, debounce working. One 1.27 MB chunk, no compression, and a snapshot that is 5 MB at ~200× ([lens-L8.md:276](lens-L8.md#L276)). |
| **L9** PS compliance & demo | **4 / 10** | The transitions router and verification endpoint survive every probe; the generic write API bypasses them on exactly the graded columns, and several "Done" rows in the implementation doc are not ([lens-L9.md:309](lens-L9.md#L309)). |
| **L10** DevOps & hygiene | **5 / 10** | Multi-stage non-root Docker with healthchecks and two-phase readiness; but `npm run build` fails with 64 errors from a clean clone, `strict` is off and there is no CI ([lens-L10.md:148](lens-L10.md#L148)). |

L5, L6, L7, L8 and L9 are the lens files' own scores. **L1** was set in
[lens-L1.md](lens-L1.md); **L2, L3, L4, L10** were set here from their finding populations, because those
four lens files recorded findings without a score line.

---

## Findings — P0 (7)

| ID | Lens | Finding and impact | Where | Evidence | Fix | Eff | Conf |
|---|---|---|---|---|---|---|---|
| **AUD-001** | L3,L4 | **A rejection request is answered by recording a verification.** `POST /api/documents/:id/verify` has no outcome branch, so `{"decision":"Rejected","competentAuthority":"Automated Rejection Pipeline"}` → 200 and the row comes back `Verified`. The only negative decision a judge can reach is falsified. | [server/routes/workflow.ts:271-344](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/routes/workflow.ts#L271) (sibling arm with a branch: `:201-269`) | `curl/P_pass_c_round6_output.txt` P-38 | Add the decision arm; validate `decision` against the enum and `competentAuthority` against the user; 422 on unknown values; cover both outcomes in tests. | M | live |
| **AUD-002** | L3,L4 | **The bulk write API commits without audit and without a transaction**, and the client authors its own trail: `POST /api/audit` takes `source` from the caller, and `PUT /api/roles/:role/permissions` rewrites every user's effective permissions with **no** audit row while the three routes beside it write one. | [server/routes/data.ts:116-147](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/routes/data.ts#L116), `:566-592`; `src/context/AppContext.tsx:1917-1983`; [server/routes/admin.ts:273](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/routes/admin.ts#L273) | rounds 1, 8, 10 (P-52: audit count 95 → 95) | One `$transaction` per write with the audit row inside it; delete `POST /api/audit` or make it server-only; add the missing row on the role route. | M | live |
| **AUD-003** | L2,L3,L5,L9 | **Guards test the incoming value, not the transition.** Because `guard()` only inspects `body.status`, `dueDate`, `expiryDate`, `escalationLevel`, `renewalStatus`, `reportSubmitted` and `evidenceDocumentIds` are freely writable by roles that cannot perform the transition; a `REGIONAL_OFFICER` with no `evc.report.submit` flipped `reportSubmitted` both ways on `EVC-8805`. | [server/routes/data.ts:207-298](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/routes/data.ts#L207); [server/scope.ts:103-119](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/scope.ts#L103) | rounds 5, 6, 13b (P-33, P-38, P-70) | Guard on the `(from,to)` pair plus a per-field owner table; reject a regulated field in an unrelated payload with 403 `REGULATED_FIELD`. | M | live |
| **AUD-004** | L3,L4 | **Audit history is mutable in the only schema that runs.** `pg_trigger` for `audit_logs`: NONE; grants include `UPDATE`, `DELETE`, `TRUNCATE`. One `UPDATE` rewrote a real officer row, a `DELETE` dropped the count; `ROLLBACK` restored it. No hash chain, prev-hash or sequence column exists in any schema. The insert-only trigger lives only in the Supabase migration nothing executes — under the UI sentence "append-only and cannot be edited or deleted". | `prisma/migrations/*` (absent) vs [supabase/migrations/20261101090000_production_hardening.sql:707-722](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/supabase/migrations/20261101090000_production_hardening.sql#L707) | `curl/P_pass_c_round9b_output.txt` P-50; `raw/S17_audit_chain.txt`, `raw/S17b_prisma_audit_ddl.txt` | Replicate trigger + revokes into the Prisma migration and run `supabase/tests/rls.sql` from a script; or remove the sentence and stop claiming a chain. | M | live |
| **AUD-005** | L9 | **A renewal verification can be self-issued.** Probed live with both roles: the same session can raise and clear the renewal requirement on a document it owns, so "renewal verified by a competent authority" is not enforced anywhere server-side. | [server/routes/workflow.ts:271-344](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/routes/workflow.ts#L271) (no actor-vs-beneficiary rule) | round 6, both roles | Forbid `verifiedBy === raisedBy`/owner, and require a distinct authority record; assert in a test. | M | live |
| **AUD-006** | L9 | **A full-row PUT nulls every field the caller omitted.** `optionalNumber(...) ?? 0` and `optionalStringList(...) ?? []` mean a client that round-trips a partial object destroys evidence links (`evidenceDocumentIds: []`) and resets `escalationLevel` to 0. Silent, unrecoverable data loss on graded columns. | [server/payload.ts:303](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/payload.ts#L303), `:312`, `:187`, `:224`, `:234` | `evidence/raw/` L9 write probes; `curl` round 13b field-diff | PATCH semantics: build the update object only from keys actually present; add a test that an omitted key survives a round-trip. | M | live |
| **AUD-007** | L2,L9,L10 | **The deadline engine has no server-side host.** `sweepDeadlines` runs only from `AppContext`, so alerts exist while a browser tab is open; in Postgres mode write-back is gated to `SUPER_ADMIN`, so a normal session's sweep raises nothing; `api/cron/sweep.ts` is a Vercel artefact no runtime executes. The demo clock — the headline interaction — is inert against a real database. | [src/context/AppContext.tsx:2097-2102](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/context/AppContext.tsx#L2097), `:2021`; `api/cron/sweep.ts` (dead) | `raw/D07_demo_clock_double_sweep.txt`; rounds 2-4 | Move the sweep server-side (timer in `entrypoint`/`index.ts`, or `POST /api/sweep` behind `CRON_SECRET`) reusing the transaction + audit discipline of the transition route. | L | live |

## Findings — P1 (20)

| ID | Lens | Finding and impact | Where | Evidence | Fix | Eff | Conf |
|---|---|---|---|---|---|---|---|
| **AUD-008** | L3,L4,L9 | **Queue objects declare no permission.** `spec.permissions.length > 0 ? assertAnyPermission : requireUser` means alerts, notifications and escalations are writable by any signed-in user; `assertAnyPermission`'s OR-lists admit the weakest role; one `EVC_MEMBER` rewrote a shared notification for every reader (`read false→true`, `priority medium→low`). | [server/routes/data.ts:119](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/routes/data.ts#L119); `server/scope.ts` "present" scope | `raw/S30_empty_permission_specs.txt`; rounds 6 (P-40), 8 | Explicit permission per spec; "present" must reject a row the caller cannot read; AND-semantics where the action is privileged. | M | live |
| **AUD-009** | L3,L4,L5 | **The audit feed is capped at 200 rows with no pagination** and any session can bury the real trail: 210 filler rows in 28 s → the superadmin feed returned 200 rows, 200 synthetic, 0 real. No read path exists past the cap (`?auditTake=` is ignored). | [server/routes/data.ts:499-500](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/routes/data.ts#L499); `src/pages/admin/AuditLogs.tsx:366` | round 7 P-42 | `requirePermission(user,'audit.read')` on the writer, cursor pagination, and a total count in the response. | S | live |
| **AUD-010** | L3,L9 | **Correlation IDs and before/after state are advertised as Done and are not produced.** Live census: 147 of 148 rows have `correlationId = NULL`; 11 of 148 carry any `previousState`/`newState`. The server copies `draft.correlationId`; nothing sets it. | [server/audit.ts:43](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/audit.ts#L43); `docs/AICTE-26262-IMPLEMENTATION.md:23` | round 13 P-66 | Generate a correlation id per request and stamp `previousState`/`newState` inside the transaction; correct the doc row until then. | S | live |
| **AUD-011** | L3 | **Nothing in the schema enforces the enums or the references.** No CHECK/FK on status/renewal/tier columns and `audit_logs.entityId` has no FK, so enum drift is accepted and 9 orphan audit rows (`VERIFY_DOCUMENT ×5`, `USER_CREATED ×2`, …) survived the deletion of every entity they described. | [server/payload.ts:316-333](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/payload.ts#L316); `prisma/schema.prisma` | `raw/S18_db_constraints.txt`; round 8 | Native enum or CHECK per status column via a migration; index-only FK where a hard FK is impossible, plus an orphan sweep; constrain at parse as the second layer. | M | live |
| **AUD-012** | L2,L3 | **Every timestamp is TEXT and the audit stamp is a display string.** Ordering falls back to `id`, date filters compare strings, and the same request carries a simulated client clock and a real server clock — so an "overdue" row and its audit row disagree about when. | [server/audit.ts:16-21](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/audit.ts#L16); `src/utils/dates.ts` (duplicate formatter) | `raw/S19_ts_sorting.txt`; round 2 | `timestamptz` columns + a single formatter, and the server is the only clock for regulated writes. | M | live |
| **AUD-013** | L2,L3 | **Dedupe is a `findFirst`-then-insert over a non-unique index.** `escalation_items.dedupeKey` is indexed but not unique, so an `EVC_MEMBER` can squat a key and a concurrent pair of sweeps writes racy duplicates; `notifications` shares the pattern. Only `system_alerts` is protected by `@unique`. | [prisma/schema.prisma:241](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/prisma/schema.prisma#L241), `:249`; [server/routes/data.ts:405-412](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/routes/data.ts#L405) | round 6 P-40 | Unique index on the key, upsert instead of read-then-write, and a conflict-tolerant insert for the alert path. | S | live |
| **AUD-014** | L3,L8 | **`/api/snapshot` loads whole tables, on every refresh.** 13 unbounded `findMany` calls materialised and stringified per request: 69.3 KB / 161 ms mean at seed, 5,018,221 B / 1024-1285 ms at ~200× volume — the client re-fetches it on a keystroke-adjacent path. | [server/routes/data.ts:486-531](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/routes/data.ts#L486) | rounds 7 (P-43b), `raw/S33_*` | Per-table `select`/`take`, a versioned ETag, and an incremental endpoint driven by the SSE revision that already exists. | M | live |
| **AUD-015** | L4 | **A "server-side" HMAC signing secret is compiled into the public bundle** — `SERVER_SIGNING_SECRET`, `computeHMAC`, `generateToken`, `verifyToken` ship to the browser; the accompanying "Backend Authorization Middleware" is the demo-mode authorization layer. | [src/services/authService.ts:27-28](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/services/authService.ts#L27) | `raw/S22_secret_in_bundle.txt`, `raw/S22b_served_bundle_greps.txt` | Delete the block, or gate it behind `isDemoMode()` and keep it out of the PS build. A bundle secret cannot be rotated. | S | static |
| **AUD-016** | L4,L6 | **The API creates live accounts whose password is the string printed on the login page**: `optionalString(body.password) ?? DEMO_PASSWORD`, and the login screen prints the credential twice (a `font-mono` chip and a sentence). | [server/routes/admin.ts:112](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/routes/admin.ts#L112); `src/pages/auth/Login.tsx:299`, `:357` | round 1; `qa/` login capture | Require an explicit password, force a change on first sign-in, and drop the printed credential in the PS build. | S | live |
| **AUD-017** | L4 | **Unparsable dates are accepted into regulated deadline columns**: `expiryDate:"not-a-date"` stored on a **Verified** document row, while the UI's own `parseDate` returns `null` for the same value — so the row is simultaneously valid and unrenderable. | [server/payload.ts:252](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/payload.ts#L252), `:274`, `:275`, `:302` | round 1 P-18 | Validate the calendar value at the boundary, not the presence of a string; reject with 422. | S | live |
| **AUD-018** | L4 | **Credential and role changes do not revoke live sessions and nothing prunes them.** No idle timeout; `sessions` grew 65 → 113 rows with 0 expired during the audit, because both `deleteMany` calls in `server/` delete assistant messages. | [server/routes/admin.ts:192-194](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/routes/admin.ts#L192); `server/session.ts` | rounds 10, 13 | Delete sessions for the user on password/role change; add an expiry sweep; make the cookie `Secure` by default outside loopback. | S | live |
| **AUD-019** | L2 | **Optimistic locking is honoured on one of two write paths**: `expectedVersion` → 409 in the transitions router, ignored by `saveHandler`, so two officers on one case silently last-write-win through the generic API. | [server/routes/data.ts:177-197](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/routes/data.ts#L177), `:325-337` | static + round 4 | Carry a version on every regulated table and enforce it in `saveHandler`. | M | static |
| **AUD-020** | L2 | **"Pure core" is broken inside the core**: ids come from `Date.now()`/`Math.random()` in `engine.ts` and `alerts.ts`, so the module that the audit trail depends on is not deterministic and cannot be replayed in a test. | [src/workflow/alerts.ts:73](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/workflow/alerts.ts#L73); [src/workflow/engine.ts:30](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/workflow/engine.ts#L30) | `raw/D07_*` | Inject an id factory and the clock together; then property-test the sweep. | S | static |
| **AUD-021** | L5 | **Advancing the demo clock runs two deadline sweeps inside one tick**, and the first sweep's alerts are written to storage *and* to the audit trail before the second recomputes from stale React state — `Open` drops 16 → 6 on reload. | [src/context/AppContext.tsx:2232-2249](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/context/AppContext.tsx#L2232) | `raw/D07_demo_clock_double_sweep.txt` | One sweep per tick, driven off the reducer state; delete the `setTimeout(runSweep, 0)`. | M | live |
| **AUD-022** | L5 | **A corrupt localStorage key produces a permanently blank SPA**: no error boundary exists anywhere in `src`, `readLocal` returns the parsed value as `T` unchecked, and recovery is `localStorage.clear()` — a white screen with no console UI during a demo. | `src/main.tsx`; [src/services/repositories/localRepository.ts:49-84](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/services/repositories/localRepository.ts#L49) | `raw/D14_fault_injection_blank_spa.txt` | Wrap the root in an error boundary with a recovery action; validate the shape on read and fall back per store. | S | static |
| **AUD-023** | L6,L7 | **One colour token fails WCAG AA wherever it carries meaning**: `--color-ink-3: #9A958A` measures 2.74:1 on paper, 2.98:1 on white, 2.86:1 on `surface-2` — sidebar group headings, the 43 literal `0` data cells on `/pendency`, and empty-state text. Every other text token is ≥ 5.10:1. | [src/index.css:57](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/index.css#L57) | `raw/D21_a11y_census_contrast_semantics.txt` | Darken the token to ≥ 4.5:1 (or reserve it for decoration) and re-measure the three call sites. | S | live |
| **AUD-024** | L7 | **The navigation drawer is a keyboard hazard at every width under `lg`**: closed, it is translated to `x = -256` but stays in the layout and the tab order — 14 of 35 tab stops are off-screen, starting with the brand — and its toggle reports neither state nor target (`aria-expanded` null, `aria-controls` null, name fixed to "Open navigation"). | `src/components/common/Sidebar.tsx` | `raw/D20_keyboard_traversal.txt`, `raw/D21_*` §3 | `inert`/`display:none` when closed, or `visibility:hidden`; wire `aria-expanded`, `aria-controls` and a state-aware name. | M | live |
| **AUD-025** | L9 | **The EVC checklist is not a server-side precondition**: approval proceeds with an incomplete checklist, because the check lives in the client wizard only. `reportSubmitted` is writable without it (`AUD-003`). | [server/routes/workflow.ts](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/routes/workflow.ts) | `raw/D18_evc_checklist_and_evidence_integrity.txt` | Re-validate the checklist server-side in the transition, returning 422 with the missing items. | M | live |
| **AUD-026** | L10 | **TypeScript runs with `strict` disabled** for both the SPA and the server — the class of error that produced `AUD-017` and `AUD-006` is what the compiler would have caught. | `tsconfig.app.json`, `tsconfig.node.json` | `raw/baseline-*.txt` | Turn `strict` on in the PR that removes the last `any` in `payload.ts`; budget it as its own wave. | L | static |
| **AUD-027** | L10 | **`npm run build` does not work from a clean clone**: 64 `error TS` lines, no `dist/`, and `npm run server` then degrades to API-only with `GET /` → 404. Nothing generates the Prisma client on the host path — no `postinstall`, no `prepare`, and the README never mentions it. `npm run dev` and the Docker build both mask it. | `package.json` scripts; [README.md:18](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/README.md#L18) | `curl/P_pass_c_round14_output.txt`, `round14b` (`prisma generate` → 0 errors in 1.00 s) | `"postinstall": "prisma generate"`, plus one README line; and fail fast with a message when `dist/` is missing instead of serving 404. | S | live |
## Findings — P2 (30)

| ID | Lens | Finding | Where | Evidence | Fix | Eff | Conf |
|---|---|---|---|---|---|---|---|
| **AUD-028** | L4,L8 | SSE is a global, table-blind channel: every connected session is told a table changed, with no row or scope filter, frames carry no `id:` so a reconnect cannot catch up, and the `rev` the server publishes is never consumed. Low-privilege roles learn which tables moved. | [server/events.ts:19](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/events.ts#L19), `:51-55` | `raw/S28b_header_inventory.txt`; round 12 | Per-table + per-scope topics, `id:` on every frame, and a reconnect that replays from `Last-Event-ID`. | M | live |
| **AUD-029** | L4,L5,L6 | The demo persona model diverges from the enforced identity: "Reset demo data" is one unconfirmed click that clears every store and rewrites the *data-ownership* identity to a random Regional Officer while the shell and RBAC identity stay Super Administrator, and the divergence survives a reload. | `src/context/AppContext.tsx` (reset path) | `qa/` D-09/D-11 captures | Label it "Reset demo data (keeps you as Super Administrator)" or gate the identity change behind a confirm dialog; make one identity the source of truth. | S | live |
| **AUD-030** | L2 | Demo mode keeps two audit stores (a local service and a repository mirror) that can disagree. | `src/services/auditService.ts:7`; `authService.ts:18` | static | one store, one writer | S | static |
| **AUD-031** | L2 | Six `src/workflow` modules cannot be loaded by the server (client imports), which is why the sweep has no host (`AUD-007`). | `src/workflow/selectors.ts:9`; `documents.ts:1` | round 2 execution | split types/pure rules into a shared folder the server can import | M | live |
| **AUD-032** | L3,L4 | Throttling covers password guessing only; nothing limits bulk writes; and the bucket `Map` is never evicted. Restart clears the buckets — verified (200 after `docker restart`). | `server/routes/auth.ts:59`; [server/rateLimit.ts:11](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/rateLimit.ts#L11) | round 11 P-57, round 12 P-59 | per-route budget for writes; LRU or TTL sweep; bind the key to the session, not a header | S | live |
| **AUD-033** | L3 | Migration safety: `entrypoint.sh` retries `migrate deploy` 30× then **starts anyway** — the container is healthy while the schema is behind. | `server/entrypoint.sh`; `docker-compose.postgres.yml:11` | baseline boot log | exit non-zero on unreconciled migrations, or keep `/api/ready` as the gate and say so | S | live |
| **AUD-034** | L4 | No security response headers anywhere: CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS all absent; `COOKIE_SECURE` defaults off and is unset in the Postgres overlay. | `server/index.ts`; [server/session.ts:45-47](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/session.ts#L45) | `raw/S28_live_headers_demo.txt`, `raw/S28b_*` | a `helmet`-style header block; `Secure` by default, off only on explicit loopback | S | live |
| **AUD-035** | L4 | With no allowlist configured, CORS grants any localhost port credentialed reads **and** the write-origin guard passes. | `.ai-guard/authGuard.ts:163-170`, `:115-120` | round 12 | fail closed: no origin configured ⇒ no credentialed cross-origin | S | live |
| **AUD-036** | L4,L5 | CSV exports have no formula-injection guard and officer notes are stored verbatim, so `=cmd\|' /c calc' !A1` reaches a regulator's Excel through the audit export. | `src/utils/csv.ts:8-10` | `raw/S31_csv_and_limiter.txt`; D-09 | prefix `= + - @` on export; neutralise at parse as a second layer | S | static |
| **AUD-037** | L4 | `/api/assistant/status` discloses provider/model to anyone, and chat is unauthenticated in demo mode. | `server/index.ts:112-119`; `authGuard.ts:100-102` | round 11 | require a session on both; strip the model from the public status | S | live |
| **AUD-038** | L4 | A real external Supabase tenant URL is the compiled-in fallback — an unaudited request path to somebody else's project. | `src/services/supabaseClient.ts:3` | `raw/S23_bundle_hygiene.txt` | no fallback: build-time required or feature-flag off | S | static |
| **AUD-039** | L4 | Brute force against non-existent accounts leaves no trace: 80 failed logins across distinct emails changed the `FAILED_LOGIN_BAD_PASSWORD` count by 0. | `server/routes/auth.ts` | round 1 P-14 | one audit event per credential failure, incl. unknown users | S | live |
| **AUD-040** | L5,L6 | Two numbers, one label: `/documents` shows **Valid 6** on the KPI tile and **Valid 4** on the chip below, and the tile is the button that switches to the chip's predicate; the extra two are renewed documents. | `src/pages/Documents.tsx:440-479` | D-16 | one predicate, shared by tile and chip; caption each with what it counts | S | live |
| **AUD-041** | L5 | `/notifications` mixes generated rows with five seed rows restating the same events; seeds carry no `dedupeKey`, so suppression can never match (NOTIF-1 vs the generated report-overdue). | seed + `src/workflow/notifications.ts` | `raw/D17_*` | key the seeds the same way, or drop them and let the engine speak | S | live |
| **AUD-042** | L5 | Transition buttons have no synchronous re-entrancy guard or idempotency key: `isSubmitting` is set inside the handler — 1 application `return` produced 3 `RETURN` audit rows. | `src/context/AppContext.tsx` (`runTransition`) | `raw/D08_double_submit_audit_rows.txt` | set the guard before the await; derive a client idempotency key per action | S | mixed |
| **AUD-043** | L5 | The demo can only walk the Northern region: 6 offices listed, one `REGIONAL_OFFICER` (`USR-REGIONAL-NORTH`), 8 of 10 applications in the other five regions. | `prisma/seed.ts` | page sweep + `raw/P0b_users.txt` | seed one officer per region and give the persona picker a region note | S | live |
| **AUD-044** | L5 | Three sources of truth for a created account's permissions: the form sends `[]`, the local service overwrites from the role matrix, and the server enforces what the row carries — `role_permissions` is a cache copied into user rows. | `src/services/*`; [server/routes/admin.ts](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/server/routes/admin.ts) | D-11 | one source (the matrix) read at request time, or an event-driven copy with a version | M | live |
| **AUD-045** | L6 | Three responsive strategies for one pattern: `/applications` renders both a mobile `ul` and a desktop `table`, `/documents` cards at every width, `/reports` an unbounded table. | `src/pages/Applications.tsx:391`, `:426` | `qa/` 3-viewport captures | pick the card/table breakpoint once and apply it via `DataTable` | M | live |
| **AUD-046** | L7 | No way to reach the content: no skip link on any route, and `<main>` has neither an `id` nor a landmark label. | [src/layouts/DashboardLayout.tsx:41](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/layouts/DashboardLayout.tsx#L41) | `raw/D21_*` | a skip link plus `id="main" aria-label` on the layout | S | live |
| **AUD-047** | L7 | Half of the report tables cannot be read in full without a mouse: `DataTable` wraps a fixed-min-width table in a plain `div.overflow-x-auto` with no `tabIndex`, no `role="region"`, no label. | `src/components/ui/DataTable.tsx` | `raw/D21_*` | `tabIndex=0 role=region aria-label` on the scroller | S | live |
| **AUD-048** | L7 | Validation is visual only: `Field` renders `<p id="{htmlFor}-error" role="alert">`, but `aria-describedby` appears **zero** times in `src/**/*.tsx`, so the error is not attached to the control. | [src/components/ui/Field.tsx:28](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/components/ui/Field.tsx#L28) | `raw/D21_*` | wire `aria-describedby` (and `aria-invalid`) in the primitive | S | live |
| **AUD-049** | L7 | The three busiest dynamic surfaces announce nothing: 0 `[aria-live]`, 0 `[role=status]`, 0 `[role=alert]` at rest on 17 routes — the global search popup is the worst case. | `src/components/common/Header.tsx:219-227` | `raw/D21_*` | a polite live region per surface, results-count on search | S | live |
| **AUD-050** | L7 | The assistant textarea is the only control in the app with no focus indicator: `outline-none` on it beats the global `:focus-visible` rule. | `src/components/assistant/ChatInput.tsx:58` | `raw/D21_*` | drop `outline-none`, keep the ring | S | live |
| **AUD-051** | L8 | One 1,268,336 B (340,596 B gzip) entry chunk, no `lazy()`: the whole app, the assistant and every report ship before the login screen paints. | `src/App.tsx`; `vite.config.ts` | `raw/baseline-build.txt` | route-level `React.lazy` + a manual-chunks budget | M | live |
| **AUD-052** | L8 | 313,784 B of `public/` is unreferenced, and a 200,420 B design-reference PNG sits on the login fold — more than the gzipped bundle. | `public/screenshots/*` | `raw/S23_bundle_hygiene.txt` | delete the artefacts from the shipped image | S | live |
| **AUD-053** | L8 | A 2,355-line root context with 0 `useMemo`, 0 `React.memo` and 34 consumers: every keystroke re-renders the tree behind it. | `src/context/AppContext.tsx` | static read | split the context, then memo the selectors | L | static |
| **AUD-054** | L8 | No response compression: the served shell is 1,356,306 B where ~351 KB suffices. | `server/index.ts` | `raw/S28_live_headers_demo.txt` | `compression()` before the static handler | S | live |
| **AUD-055** | L10,L8 | No resource limits in either compose file, while `NODE_OPTIONS=--max-old-space-size=2048` exceeds the 3.5 GiB VM share the host gives the container. | `docker-compose.yml`, `docker-compose.postgres.yml`; `Dockerfile:28` | `raw/` stats | declare `mem_limit`/`cpus` per service and align the heap cap | S | live |
| **AUD-056** | L10 | No CI: every gate is a human remembering to run `tsc -b`, tests, lint and build — which is how `AUD-027` reached a tagged commit. | repo root (no `.github/`) | static | one workflow running the four commands on push | M | static |
| **AUD-057** | L10 | Documented dev loop is wrong in three places: the README's JSON-404 promise holds only when a database is configured (a DB-less boot answers `/api/nope` with **503 `DATABASE_UNCONFIGURED`**), the Postgres leg is not host-runnable (0 `ports:` under `db:`), and the committed local credential pair carries no "disposable, local only" warning. | [README.md:53-54](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/README.md#L53); `docker-compose.postgres.yml:31-33` | `curl/P_pass_c_round14b_output.txt` | one README pass executed against a fresh clone, with the exit codes pasted in | S | live |

## Findings — P3 (12)

| ID | Lens | Finding | Where | Evidence | Fix | Eff | Conf |
|---|---|---|---|---|---|---|---|
| **AUD-058** | L4 | Assistant history accepts client-chosen primary keys. | `server/routes/assistant.ts:30` | static | server-generated ids | S | static |
| **AUD-059** | L4 | Demo mode fabricates session/audit provenance IPs. | `src/services/authService.ts:300` | static | omit provenance in demo, never invent it | S | static |
| **AUD-060** | L5 | An expired-document notice contradicts its own title: "Document expired … **expires 17 Sept 2026**" (45 days past) — one shared sentence for both tiers. | `src/workflow/notifications.ts` | D-17 | tier-specific copy | S | live |
| **AUD-061** | L5 | Attaching evidence in the demo build gives no feedback: the `!isFileUploadEnabled()` branch stores only `file.name`, returns before the toast, and records no size/hash/uploader. | `src/pages/evc/EvidenceUpload.tsx:38-41` | D-18 | one success path, with what was actually stored | S | live |
| **AUD-062** | L5 | `/regional/escalations` prints "Northern Regional Office" as the acting office for a Super Administrator session; the queue's numbers are right, so it is cosmetic drift. | `src/pages/regional/Escalations.tsx` | page sweep | derive the label from the session | S | live |
| **AUD-063** | L5 | An unknown path silently redirects to the dashboard, so a stale deep link looks like a working app instead of "not found". | `src/App.tsx:266` | page sweep | a 404 route | S | live |
| **AUD-064** | L6 | Register drift across labels: "Expiring Soon" (raw enum) vs "Expiring soon" (chip) vs sentence badge; screen titles mix "Pendency & workload" with "Regional offices". | `src/pages/Reports.tsx:112` | `qa/` captures | one label map, one casing rule | S | live |
| **AUD-065** | L6 | Density is set by `text-xs` as the default rather than a semantic token: 268 `text-xs` vs 7 `text-base` across `src/**/*.tsx`. | global | class census | tokens per role (label/body/data) | M | static |
| **AUD-066** | L6,L7 | Count-bearing labels run the number into the words in both the visual and the accessible name: "Alert center10", "Notifications17", "9 rowsDocument validity…". | `src/components/common/Sidebar.tsx` | `raw/D21_*` | a separator span with its own name | S | live |
| **AUD-067** | L7 | Structural rough edges: `h1 → h3` skips on `/institutes` and `/regions-officials`, an empty `<th>` on `/pendency` and `/workflow`, donut segments conveyed by colour alone. | `src/pages/…` | `raw/D21_*` | fix heading levels, add header text, add a pattern/label | S | live |
| **AUD-068** | L8 | `scryptSync` is synchronous, serialising sign-ins at ~85 ms each (214-396 ms measured end to end). | `server/auth.ts` | round 1 timings | async `scrypt`, or a worker pool | S | live |
| **AUD-069** | L10 | Repo hygiene: `prisma` (the CLI) is in `dependencies`, which is what pulls the only production `npm audit` high into the runtime image; `.gitignore` does not cover `coverage/`, so `git status` is dirty after every `npm run test:coverage`; and 22 lint warnings have no owner because lint is not wired into CI (`AUD-056`). | [package.json:22-24](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/package.json#L22); `.gitignore`; `.oxlintrc.json` | `raw/baseline-npm-audit.txt`, `raw/baseline-lint.txt` | move `prisma` to `devDependencies` (the image already runs `npx prisma generate` at build), add `coverage/` to `.gitignore`, give the warnings an owner or a budget | S | static |

---

## Ten quick wins

Ordered by (impact ÷ effort); all ten are `S` and none needs a schema change.

1. **`"postinstall": "prisma generate"`** — turns `npm run build` from 64 errors to clean on a fresh clone
   (`AUD-027`), the single command a judge types first.
2. **`requirePermission(user,'audit.read')` on `POST /api/audit`** — one line, closes the "any session can
   bury the trail" path (`AUD-009`).
3. **Reject unknown `decision` values in `/documents/:id/verify`** — a `default:` arm that 422s instead of
   verifying (`AUD-001` half-fix, the full fix is M).
4. **Darken `--color-ink-3` to ≥ 4.5:1** — clears the only failing text token across 19 routes (`AUD-023`).
5. **Add `tabIndex={0} role="region" aria-label` to the `DataTable` scroller** — six report tables become
   keyboard-readable (`AUD-047`).
6. **Wire `aria-describedby` + `aria-invalid` inside `Field`** — one primitive edit, every form inherits it
   (`AUD-048`).
7. **`inert` on the closed drawer** — removes 14 phantom tab stops (`AUD-024` half-fix).
8. **`compression()` before the static handler** — 1,356,306 B → ~351 KB served (`AUD-054`).
9. **Delete `SERVER_SIGNING_SECRET`/`computeHMAC`/`generateToken`/`verifyToken` from the client** — a bundle
   secret, removed (`AUD-015`); and the two design-reference PNGs with it (`AUD-052`).
10. **One README pass against a fresh clone** — the JSON-404 sentence, the Postgres host leg, and the
    credential warning (`AUD-057`).

## Strengths worth protecting

These held under every probe; a fix wave must not weaken them.

- **The workflow core is a real engine.** `src/workflow/*` is policy-as-data with a legible state machine per
  object, and `expectedVersion` → 409 in the transitions router is genuine optimistic concurrency
  (`AUD-019` exists *because* the good path is good).
- **232 tests, 26 files, exit 0** and **lint 0 errors / 22 warnings** at the pinned commit; `tsc -b` and
  `vite build` both green in the working tree.
- **Every indexed filter is an `Index Scan`** at seed and at ~200× volume (`EXPLAIN`, round 7); the capped
  audit read is an `Index Scan Backward using audit_logs_pkey`.
- **Session and credential design is correct**: httpOnly cookies, SameSite, scrypt-hashed passwords, a
  process-local limiter whose restart behaviour is the right trade-off for a counter.
- **Uploads are validated by magic bytes**, size-capped, path-traversal-safe keys, served with
  `nosniff`; no XSS sink and no SQL injection found in a raw-SQL scan of `server/`.
- **Dialog accessibility is complete and measured**: focus trapped and restored, `role="dialog"`,
  `aria-modal`, `aria-labelledby`/`describedby` resolving to real elements, `Escape` closing, body scroll
  restored. No unnamed control, no unlabelled input, no table without a caption and `scope="col"` headers,
  across 19 routes.
- **The reset endpoint is double-gated** (`ALLOW_DEMO_RESET` + super-admin) and this audit never exercised it.
- **Reduced-motion and print stylesheets exist**; `no-store` on snapshot/SSE is correct; a 240 s soak is flat
  at 65.89 MiB.

---

## Appendix A — dedup map (103 raw lens findings → 69 AUD rows)

Dedup key = root cause (module symbol + defect class); a symptom keeps its own id here and points at the
row it became. Collisions the plan named are resolved once: audit mutability (L3/L4/L1 → `AUD-004`),
missing in-container sweep (L2/L9/L10 → `AUD-007`), clock purity (L2/L5/L7 → `AUD-012`, `AUD-021`),
snapshot size (L3/L8 → `AUD-014`), persona picker (L4/L5/L6 → `AUD-029`), fire-and-forget audit
(L3/L10 → `AUD-002`).

| AUD | Raw lens findings folded in |
|---|---|
| AUD-001 | L3-10, L4-16 |
| AUD-002 | L3-01, L3-11, L4-21 |
| AUD-003 | L2-08, L3-12, L3-14, L5-08, L9-01 |
| AUD-004 | L3-05 |
| AUD-005 | L9-03 |
| AUD-006 | L9-07 |
| AUD-007 | L2-01, L2-09, L9-05 |
| AUD-008 | L3-13, L4-03, L4-17, L9-04 |
| AUD-009 | L3-04, L3-04b, L4-20, L5-15 |
| AUD-010 | L3-16, L9-06 |
| AUD-011 | L3-02, L3-15 |
| AUD-012 | L3-03, L2-03, L2-05 |
| AUD-013 | L3-07, L2-10 (duplicate-sweep row) |
| AUD-014 | L3-06, L8-04 |
| AUD-015 | L4-01 |
| AUD-016 | L4-02, L6-07 |
| AUD-017 | L4-18 |
| AUD-018 | L4-09, L4-09a (= lens-L4 §4.16.6) |
| AUD-019 | L2-07 |
| AUD-020 | L2-02 |
| AUD-021 | L5-01 |
| AUD-022 | L5-02 |
| AUD-023 | L6-01, L7-02 |
| AUD-024 | L7-01, L7-07 |
| AUD-025 | L9-02 |
| AUD-026 | L10-02 |
| AUD-027 | L10-06 |
| AUD-028 | L8-08, L4-11 |
| AUD-029 | L5-06 |
| AUD-030 | L2-04 |
| AUD-031 | L2-06 |
| AUD-032 | L3-08, L4-08 |
| AUD-033 | L3-09 |
| AUD-034 | L4-04, L4-14 |
| AUD-035 | L4-05 |
| AUD-036 | L4-06, L5-10 |
| AUD-037 | L4-07 |
| AUD-038 | L4-10 |
| AUD-039 | L4-19 |
| AUD-040 | L5-03, L6-02 |
| AUD-041 | L5-04 |
| AUD-042 | L5-07 |
| AUD-043 | L5-11 |
| AUD-044 | L5-13 |
| AUD-045 | L6-03 |
| AUD-046 | L7-03 |
| AUD-047 | L7-04 |
| AUD-048 | L7-05 |
| AUD-049 | L7-06 |
| AUD-050 | L7-08 |
| AUD-051 | L8-01 |
| AUD-052 | L8-02 |
| AUD-053 | L8-03 |
| AUD-054 | L8-07 |
| AUD-055 | L10-01, L8-05 |
| AUD-056 | L10-03 |
| AUD-057 | L10-04, L10-07, lens-L10 §10.9 |
| AUD-058 | L4-12 |
| AUD-059 | L4-13 |
| AUD-060 | L5-05 |
| AUD-061 | L5-09 |
| AUD-062 | L5-12 |
| AUD-063 | L5-14 |
| AUD-064 | L6-04, L6-08 |
| AUD-065 | L6-05 |
| AUD-066 | L6-06, L7-09 |
| AUD-067 | L7-10 |
| AUD-068 | L8-06 |
| AUD-069 | L10-05, lens-L10 §10.8 |

**Recorded, not filed as findings.** `L4-15` is one of the clean-check rows, not a defect, and stays out of
the table; `L4-03b` is the path correction to `L4-03` (the same row), not a second finding. The seven L3
withdrawals (`L3-W1…W7`, each re-probed and refuted) and the L4 storage-500 withdrawal
(`L4-4.16.10-W2`) likewise stay in the lens files and the roll-ups so nobody re-files them: the checks that
*did* hold are recorded as `strength` rows in `evidence/raw/rollup-L23.tsv` (18) and
`evidence/raw/rollup-L410.tsv` (18), and `AUD-027`/`AUD-057` supersede the two `L10` rows that had been
written as "deferred to Pass C".

## Appendix B — severity and confidence distribution

| Severity | Rows | Of which executed live | Read from source | Mixed |
|---|---|---|---|---|
| P0 | 7 | 7 | 0 | 0 |
| P1 | 20 | 15 | 5 | 0 |
| P2 | 30 | 24 | 5 | 1 |
| P3 | 12 | 8 | 4 | 0 |
| **Total** | **69** | **54** | **14** | **1** |

Effort as filed: **45 `S` · 21 `M` · 3 `L`** (`S` ≈ 15 m, `M` ≈ 1 h, `L` ≈ 3 h before the regression-test-first
rule adds 20 %). The three `L` rows are `AUD-026` (`strict` on), `AUD-053` (root-context split) and
`AUD-007`'s server-side sweep host.

| Confidence label | Rows | Meaning |
|---|---|---|
| live | 54 | a request or interaction was executed against the running stack — Postgres at `:8081`, demo at `:8080`, or the container's own CLI — and the transcript is in `evidence/` |
| static | 13 | read from source at `794e54c`; the behaviour follows necessarily from the code, or the runtime path was out of scope for this run (`AUD-035`'s CSV consumer, `AUD-038`'s tenant) |
| mixed | 1 | `AUD-042`: the duplicated audit rows are confirmed, the same-task multi-dispatch trigger is suspected |

## Appendix C — checks deliberately not run

Full ledger in [`00-baseline.md` §11](00-baseline.md) and §11.2; lens-level notes in
[`lens-L10.md` §10.10](lens-L10.md).

| Check | Why not | What it would take |
|---|---|---|
| `POST /api/admin/reset` | Destructive; the audit may not empty the database it is measuring | a throwaway clone of the volume |
| Supabase driver + `supabase/tests/rls.sql` | No project/bucket in scope; the RLS policies are the *alternate* path | a disposable Supabase project |
| A browser walk of the Postgres stack at `:8081` | Only one browser session is available here and it drives the demo at `:8080`; every Postgres finding was probed with curl instead | a second profile pointed at `:8081` |
| Two application containers against one DB | SSE revision state is in-memory, so this is the real scale question | compose `--scale app=2` |
| Live AI prompt-injection probes | No `GEMINI_API_KEY` is configured (`/api/assistant/status` → `isConfigured:false`) | a key, and consent to spend it |
| Node 20 reproduction of `npm run server` | Only Node 24 installed; installing a second runtime mutates the environment | `nvm use 20` |
| 10-minute soak, disk-full, restore-from-dump | A 240 s soak was run and is flat; longer/IO-failure tests were cut for time | `stress-ng` + a volume quota |
| gstack `/qa`, `/design-review`, `/cso`, `/devex-review` as invocable skills; `/browse` | Not registered here (`browse/dist/browse.exe` is an extensionless-probe mismatch); their SKILL.md files were read as checklists | — |

## Appendix D — evidence index

1.2 MB under [`evidence/`](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/docs/audit/evidence/), all of it generated by this audit; nothing in it is app output.
**Transcripts were edited once, before commit:** the eight `Set-Cookie: apoorvasetu_sid=…` session values
and the demo JWT in `raw/D19_*` are redacted, attributes and decoded payload preserved. The reason, the
exact sites and the re-check command are in [`evidence/probe-log.md` → "Redactions"](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/docs/audit/evidence/probe-log.md).

| Path | What it holds | Cited by |
|---|---|---|
| `evidence/probe-log.md` | The ledger of every request made against the Postgres stack: the four rules the rounds obeyed (capture-before-write, restore-by-primary-key, field-diff proof, `%TEMP%` cookie jars), a round table naming what each round wrote and how it was undone, and an **86-row probe index** mapping `P-nn` → round → the transcript heading verbatim | every `live` row |
| `evidence/curl/` | **17 probe rounds, 17 scripts + 17 transcripts** (`P_pass_c_round2 … round14b`). Each script is re-runnable and ends by printing `docker stats` and the row counts, so a reader can see the audited container was left as found | `AUD-001…005`, `008…014`, `017…018`, `021`, `028…029`, `032…033`, `039`, `055`, `057` |
| `evidence/raw/S*` (23 files) | Static probes: `S17_audit_chain`, `S17b_prisma_audit_ddl`, `S18_db_constraints`, `S18b_column_types`, `S19_ts_sorting`, `S22_secret_in_bundle`, `S22b_served_bundle_greps`, `S23_bundle_hygiene`, `S24_xss`, `S25_audit_keys`, `S26_indexes`, `S27_render`, `S28_live_headers_demo`, `S28b_header_inventory`, `S29_cors_reflection`, `S30_empty_permission_specs`, `S31_csv_and_limiter`, `S34_credentials_and_tenant`, `S37_hmac_server_consumers`, `S15_wallclock`, `S16_rawsql`, `S20_layering`, `S21_storage_keys` | `AUD-004`, `011…012`, `015`, `023`, `034…036`, `038`, `051…052`, `054` |
| `evidence/raw/D*` (10 files) | Demo-build probes from the browser: `D07_demo_clock_double_sweep`, `D08_double_submit_audit_rows`, `D11_storage_census_and_apply_validation`, `D14_fault_injection_blank_spa`, `D16_documents_valid_two_counts`, `D17_notifications_dupes_and_stamps`, `D18_evc_checklist_and_evidence_integrity`, `D19_identity_and_audit_attribution`, `D20_keyboard_traversal`, `D21_a11y_census_contrast_semantics` | `AUD-020…025`, `029…030`, `040…042`, `046…050`, `066…067` |
| `evidence/raw/baseline-*` | Stage 0 verbatim outputs: `tsc`, `tests` (232), `lint` (22 warnings / 0 errors), `build`, `coverage`, `npm-audit`, `db-deploy-noenv`, `inventory`, `artifacts` | the scorecard and `AUD-056…057`, `069` |
| `evidence/raw/rollup-L23.tsv` · `rollup-L410.tsv` · `rollup-L567.tsv` · `rollup-L89.tsv` | Per-lens extraction of id/severity/confidence/title/location/evidence/impact/fix: **52 findings** (24 from L2/L3, 28 from L4/L10) plus **36 `strength` rows** (18 + 18 — the checks that held) and **8 withdrawals** (7 from L3, 1 from L4), each with the reason; `rollup-L567` / `rollup-L89` are mechanical and carry findings only | Appendix A |
| `evidence/raw/findings-inventory.txt` | The raw census: 97 anchored rows = 103 ids, with the severity as each lens wrote it | Appendix A |
| `evidence/raw/probe-index.tsv` · `git-head.txt` | The 86-row machine-readable probe index and the pinned `794e54c` snapshot every citation refers to | throughout |
| `evidence/psql/` (2) | `P0_boot_snapshot`, `P0b_users` — the seed-shape reads the reversibility checks diff against | `AUD-003`, `043` |
| `evidence/qa/` (4) | The only obtainable screenshots (632×570 CSS px — the browser would not give a larger viewport here): login default, login overview, applications mobile card, apply wizard step 2 | L5/L6 rows; `lens-L7.md` §7.5 records why no more were possible |
