# Lens L3 — Backend deep dive (static half)

Scope of this file: every route handler's auth/authorization/validation/error shape, the data model,
and the audit path, read from source. The live half of L3 — `EXPLAIN`, psql state after each probe,
`docker stats` — ran as Pass C; where a claim below still says *(verify in Pass C)*, §3.13 records
what was found or says plainly that it was not run.

Probes S-16, S-17, S-18, S-24, S-26 in `evidence/raw/`. The live half ran as Pass C rounds 1-9b:
`evidence/curl/P_pass_c_probes.sh`, `…_round2.sh` … `…_round9b.sh` with a transcript beside each.
Read §3.13 first — it corrects, quantifies and withdraws parts of §3.1-§3.12. Where the two disagree,
§3.13 wins.

---

## 3.1 Route handlers — the good baseline

45 handlers (baseline §6). Uniform shape: `asyncHandler` + `HttpError(status, code, text)` +
`requireObject`/`parse*` validators; `requireSession` on all four routers
(`data.ts:81`, `workflow.ts:30`, `files.ts:54`, plus admin/assistant); unknown `/api/*` returns JSON
404 (`index.ts:200-202`) rather than the SPA shell. **No raw SQL**: the only `$queryRaw` in the repo
is `` SELECT 1 `` (`index.ts:72,102`) and there are zero `*Unsafe` calls
(`evidence/raw/S16_rawsql.txt`), so SQL injection through string fragments is not a live risk.

## 3.2 L3-01 — The bulk write API records no audit and uses no transaction (P0, confirmed)

`saveHandler` (`server/routes/data.ts:116-147`) does: permission → parse → scope → `find` → `guard` →
`update`/`create` → `broadcast` → respond. There is no `writeAudit` call anywhere in it and no
`$transaction`. Twenty of the 45 handlers (16 generated CRUD + snapshot-adjacent writes) therefore
mutate regulated rows — documents, undertakings, compliance records, EVC visits, escalations — without
producing an audit row, while `workflowRouter` shows exactly how it should be done
(`workflow.ts:83-114`). Pass C confirmed both halves of this at runtime and separated them into
provenance, content and ordering; see §3.13.1.

The trail is filled in only because the *client* separately `POST`s `/api/audit`
(`data.ts:566-592`), whose `action`, `details`, `entityType` and **`source`** all come from the
request body (`source` defaults to `'ui'`, accepts `'system'` and `'cron'`, `data.ts:552,580`).
So in the mode the product is demoed in (Postgres):

* server-side data changes are invisible unless the client chooses to log them;
* a client may label any action as machine-generated (`source:'cron'`) with a real human identity
  attached, or omit the log entirely;
* ordering between an entity write and its log is not guaranteed — the write can succeed and the
  audit POST can fail (different request, no correlation).

Directly contradicts the "completeness of the audit trail" criterion and
`docs/POSTGRES-DATA-LAYER.md:56` ("Append-only audit … stamped server-side") for these 20 handlers.

## 3.3 L3-02 — Enum drift is enforced in the DB by nothing (P1, confirmed)

`evidence/raw/S18_db_constraints.txt`: the init migration contains **0 CHECK constraints** and
**1 foreign key** (`sessions.userId → users.id`). Everything else is bare `TEXT`:
`applications.status`, `document_items.status`, `undertakings.status`, `audit_logs.action`,
`notifications.category`, all `*Id` references.

* Domain values are validated only in `server/payload.ts` `oneOf(...)` — a hand-maintained list that
  must be kept in sync with `src/types/index.ts` unions by hand. `parseNotification`
  (`payload.ts:~266`) casts `targetRole` with `as NotificationItem['targetRole']` **without**
  validating it, so any string is accepted and stored where the type says it is a role.
* `audit_logs.userId` has no FK: an admin deleting/renaming a user leaves audit rows pointing at a
  non-existent actor — in the trail that is supposed to be tamper-evident.
* Orphan-by-construction today: `file_objects.documentId` and `assistant_messages.userId` are plain
  text with no referential guarantee.

## 3.4 L3-03 — All timestamps are TEXT, and the audit stamp is a display string (P1, confirmed)

`prisma/schema.prisma` has 24 date/time fields typed `String` (`evidence/raw/S18b_column_types.txt`);
only 5 real `TIMESTAMP(3)` columns exist, all in `sessions`/`assistant_messages`. Rows written by the
server stamp `audit_logs.timestamp` — and `notification_items.timestamp`, when the API supplies it —
with `formatAuditTimestamp` (`server/audit.ts:16-21`), which produces:

```
`${formatDisplayDate(date)}, ${date.toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit',hour12:true})}`
→ "20 Nov 2026, 09:41 AM"      (formatDisplayDate = en-GB day-first, src/utils/dates.ts)
```

Consequences, all reachable from the code as written — Pass C measured each of them, see §3.13.3:
1. **`GET /snapshot` orders notifications `by: { timestamp: 'desc' }`** (`data.ts:491`) — a text
   comparison over a column that mixes authors and formats. The live rows turned out to be *worse* than
   the day-first display string reasoned here: the seed stores relative labels ("10 mins ago"), so the
   HTTP feed returns 0 of 5 positions in newest-first order. No client re-sort exists
   (`src/pages/Notifications.tsx` has no `.sort(`, `rbacService.ts:324-342` only filters).
2. `audit_logs` is ordered by `id` (`data.ts:499`), where `id` is
   `LOG-${Date.now().toString(36)}-${3 random bytes}` (`server/audit.ts:30`). The "random suffix
   scrambles the order" reasoning was **disproved** at runtime (prefixes strictly monotonic, no
   collisions); what survives is that the seed rows use a different id family, so the feed is
   chronologically wrong at the seam — 11 out-of-order adjacent pairs over 94 rows.
3. No timezone, no second precision, no `TIMESTAMPTZ`, and the `audit_logs_timestamp_idx` index
   (`migration.sql:445`) indexes a column that cannot be range-queried correctly. Minute-granularity
   stamps confirmed: 10 rows share a minute with others, so the timestamp cannot order them either.
4. `orderBy: { dueDate: 'asc' }` on `compliance_records` (`data.ts:489`) and `expiryDate` on documents
   compare display-format text. The live values are ISO and **sort correctly today** (0 rank
   mismatches), so this is not a live defect — it is an unvalidated field: `payload.ts:252,274,275,302`
   accept any string ≤ 100 chars, and two display-format dates inserted in a rolled-back transaction
   reorder the deadline list (`P_pass_c_round9_output.txt`, P-48).

Severity here is not cosmetic: "reliability of deadline tracking" is a graded criterion, the audit
trail has no column that orders it correctly, and the notification feed is mis-ordered on the demo
data as shipped.

## 3.5 L3-04 — Audit is capped and the cap is invisible (P1, confirmed — raised from P2 by §3.13.4)

`data.ts:498-500` gives every `audit.read` holder the **200 most-recent-by-id rows**, with no
pagination parameters anywhere on the endpoint. `docs/AICTE-26262-IMPLEMENTATION.md:23` claims
"before/after state, correlation IDs, production persistence … Done" and the UI states
"Audit records are append-only and cannot be edited or deleted"
(`src/pages/admin/AuditLogs.tsx:366`). Neither the truncation nor its effect is surfaced in the
Audit Logs screen. Measured in Pass C — see §3.13 L3-04b.

## 3.6 L3-05 — Append-only is enforced only in the path that is not running (P0, confirmed)

The insert-only guarantee lives exclusively in
`supabase/migrations/20261101090000_production_hardening.sql:707-722` (`audit_logs_immutable` trigger
plus `revoke update, delete, truncate … from anon, authenticated`). The self-test in
`supabase/tests/rls.sql:196,208` exists but is executed by nothing — no npm script, no vitest test and
no CI file references it.
The Prisma path — the one `docker-compose.postgres.yml` boots — creates `audit_logs` as ordinary
mutable `TEXT` columns with `UPDATE`/`DELETE` permitted and **no trigger**
(`evidence/raw/S17b_prisma_audit_ddl.txt`, and grep for `CREATE TRIGGER` in `prisma/migrations`
returns nothing, `evidence/raw/S17_audit_chain.txt`). There is no hash chain, prev-hash or sequence
column in any schema (`S17_audit_chain.txt`), so nothing in the running database can detect silent
rewriting of history.

This is the highest-value integrity claim in the product. Either enforce it in the Prisma migration
(same trigger + revokes) or stop shipping the sentence that says it exists.

## 3.7 L3-06 — Snapshot loads whole tables, every keystroke-adjacent refresh (P2, confirmed)

`data.ts:486-494`: 9 unbounded `findMany()` calls (applications, institutes, visits, compliance,
documents, notifications, undertakings, alerts, escalations) plus users, role permissions, config and
200 audit rows, all in one `Promise.all`, **filtered in Node afterwards**
(`filterApplicationsForUser` etc., `data.ts:523-531`). No pagination, no `where` by scope, no
`select` of needed columns. Correct results, but the server does O(all rows) work per snapshot for a
user entitled to a handful. Measured at ~200× seed in Pass C: 5.0 MB and ~1.1 s per superadmin
snapshot, with RSS flat over a 240 s soak — the memory framing is withdrawn, see §3.13.6.
Positive: no N+1 — 13 parallel queries, not 13 per row.

## 3.8 L3-07 — Idempotency and dedupe are half-enforced (P1, confirmed)

Alerts are safe: `system_alerts.dedupeKey` is `@unique` (`schema.prisma:213`) and
`alertSpec.create` reads-then-creates (`data.ts:385-391`) — the constraint is the backstop.
Notifications (`:195,198`) and escalations (`:241,249`) have `dedupeKey` **indexed but not unique**,
and both specs dedupe by `findFirst` then insert (`data.ts:357-363`, `:405-412`). Two concurrent
sweeps (two open tabs, which is the L2-01 architecture) can both see "no existing row" and both
insert → duplicate notifications/escalations, the exact defect P14.6 believed it had closed for all
three entity types. Pass C could not produce the race but found the sharper failure in the same code:
a low-privilege session can squat the key first and the genuine escalation is then silently swallowed
— §3.13.7.

## 3.9 L3-08 — Login throttling covers password guessing, nothing covers the rest (info, confirmed)

`server/routes/auth.ts:59` returns "Too many sign-in attempts…" from the limiter in
`server/rateLimit.ts` (per-identity/per-IP in-memory). `/api/assistant/chat` is rate limited
(`index.ts:143`). The 40 data/workflow/admin/file endpoints are not limited; for a demo deployment
this is a reasonable trade, but the in-memory map means limits reset on restart and do not span
instances. Sessions are revoked, never deleted (`auth.ts:163`) — measured after Pass C:
**65 rows, 0 expired, 6 distinct users**, and the only two `deleteMany` calls in `server/` both remove
assistant messages (`server/routes/assistant.ts:73,95`). The restart-reset behaviour of the limiter is
asserted from the in-memory `Map` in `server/rateLimit.ts` and was **not** runtime-tested.

## 3.10 L3-09 — Migration safety (P2, confirmed)

Three migrations (`20261101000000_init`, `20261101134635_assistant_message_created_at`,
`20261101134803_file_object_scope`). `prisma migrate deploy` runs at container start with 30 retries
then gives up **and starts the app anyway** (`server/entrypoint.sh`) — a schema that failed to
migrate serves 500s rather than refusing to boot, and the container still reports healthy via
`/api/health` (`index.ts:68-93`), which answers 200 even when `database:'error'`. There is no
documented rollback path (`db:reset` exists as a script, and README does not warn it destroys data).
`SEED_ON_START=1` is baked into `docker-compose.postgres.yml:11`, so every start runs the seed script;
safety depends entirely on the "empty database only" guard inside `prisma/seed.ts` (and `SEED_FORCE`
can override it).

## 3.11 Checks that came back clean (recorded so they are not re-run)

| Check | Result |
|---|---|
| SQL injection | clean — 2 tagged-template `SELECT 1`, 0 unsafe calls (S-16) |
| XSS | clean — zero `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `eval` in `src/` and `server/` (`S24_xss.txt`); assistant output is rendered as React nodes by a hand-rolled formatter (`ChatMessage.tsx:21-55`) |
| Assistant navigation injection | clean — `actionLinks` come from the server-side static catalogue `src/data/platformKnowledgeBase.ts`, not from model output |
| Upload safety | strong — allowlisted content types, declared size checked at presign **and** real byte length at PUT (`files.ts:69-80,176-183`), `express.raw({limit})` so the body is bounded before buffering (`files.ts:49`), key validated against `..`/leading-slash and per-segment pattern (`storage/keys.ts:15-19`), UUID-namespaced filenames (`keys.ts:22-24`), `X-Content-Type-Options: nosniff` + `private, no-store` on download (`files.ts:210-211`), ownership + scope checks on both read paths |
| Error leakage | clean — generic 500 text, stack logged server-side (`http.ts:27-37`) |
| Indexes vs query patterns | good for the `status`/`region`/`instituteId`/`dueDate` filters actually used (`S26_indexes.txt`); `EXPLAIN` ran in Pass C round 7 (P-43) at both seed and ~200× volume — every filter column is an `Index Scan`, the capped audit read an `Index Scan Backward using audit_logs_pkey` (§3.13.6) |
| Broadcast on write | present on every mutation (`broadcast([table])`, e.g. `data.ts:135,144`) |

## 3.12 Not run yet from this lens

Now closed for everything Pass C could reach: every claim in §3.1-§3.11 has a live counterpart in
§3.13, the `EXPLAIN` and volume numbers were measured at ~200× seed, and the final residue ledger is
§3.13.11. What remains genuinely un-run is short: the Supabase-mode driver (RLS policies, storage
bucket, `supabase/tests/rls.sql`) was never executed in any pass, the audit trail's growth was not
reset for a clean demo, and no browser walk of `:8081` happened (that gap is L9 §9.6.9 and L5). All
three are carried into the not-run ledger in `00-baseline.md` §11.

## 3.13 Pass C reconciliation (rounds 1-13b, `evidence/curl/P_pass_c_*.txt`)

Every number below was printed by a script in this repo and is reproducible. Where Pass C contradicts
§3.1-§3.12, this section supersedes it; §3.13.10 lists the withdrawals so they are not re-litigated in
the synthesis.

### 3.13.1 L3-01 — confirmed at runtime, and it is three defects, not one

Round 6, P-39 (`P_pass_c_round6_output.txt`). The reject the product actually performs:

* `PUT /api/documents/DOC-PROBE-39 {"status":"Rejected", …}` as `USR-REGIONAL-NORTH` → **200**;
  `audit_logs` count **70 → 70**. The server mutated a regulated row and recorded nothing.
* The trail then appears because the browser calls `POST /api/audit` with its own words. It returned
  **201** and stored `action=REJECT_DOCUMENT`, `userRole=REGIONAL_OFFICER`, `source=ui`,
  `details="Document rejected by Dr. R. K. Sharma: wording invented by the client"` — a sentence the
  server never generated and could not check.
* Scope holds: the same PUT by `INSTITUTION_ADMIN` (who has `documents.upload`, not
  `documents.verify`) → **403** for both `Rejected` and `Expired`.

Round 5/6 forged provenance: `source:'cron'` was accepted on an `APPLICATION_APPROVED` row written by
an `INSTITUTION_ADMIN` session (`LOG-MVY4ILYX-F7CA09`) and `source:'system'` on an
`EVC_REPORT_SUBMITTED_BY_AUTOMATION` row (`LOG-MVY4MCHX-3903C3`). `AUDIT_SOURCES = ['ui','system','cron']`
is chosen by the caller (`data.ts:552`). So a human action can be filed as machine-generated under a
real human identity, and no server-side path can contradict it. This is the part that should be
repeated in the report: **the audit feed's provenance field is a client assertion**.

### 3.13.2 L3-02 — enum drift: the unvalidated field is reachable over HTTP, with a consequence

`parseNotification` (`server/payload.ts:316-333`) validates `category`, `priority`, `targetRegion`
with `oneOf`, but `targetRole` is `optionalString(...) as NotificationItem['targetRole']`
(`payload.ts:326`) and `timestamp` is `requireString(..., {max:100})` (`payload.ts:322`) — caller
supplied, no format check. Round 9, P-48 (rolled-back transaction, `P_pass_c_round9_output.txt`) stored
`targetRole='NOT_A_ROLE'` and it persisted verbatim; the five roles the product recognises are
`src/types/index.ts:136-141`. The consequence is not theoretical: `filterNotificationsForUser`
(`src/services/rbacService.ts:334`) drops any row whose `targetRole` does not equal the viewer's role,
so one such write makes a notification **invisible to every persona**, including the one it was meant
for, with no error anywhere. `audit_logs.action` is free text by the same design (§3.13.1).

### 3.13.3 L3-03 — measured, one item withdrawn, one corrected, one sharpened

Measured over the live rows with zero writes (round 9, P-46/P-47):

| column | rows | format actually stored |
|---|---|---|
| `notification_items.timestamp` | 5 | 5 relative labels (`"10 mins ago"`, `"2 days ago"`) — from the seed |
| `audit_logs.timestamp` | 94 | 94 display stamps (`"01 Nov 2026, 05:44 PM"`) — from `formatAuditTimestamp` |

The notification defect is **worse and simpler than §3.4 predicted**: the column holds relative
labels, so `ORDER BY "timestamp" DESC` is comparing English words. The array the browser receives from
`GET /api/snapshot` is `NOTIF-3 > NOTIF-5 > NOTIF-1 > NOTIF-2 > NOTIF-4` where the labels imply
`NOTIF-1 > NOTIF-2 > NOTIF-3 > NOTIF-4 > NOTIF-5` — **0 of 5 positions correct**, so the notification
centre opens with a 3-hour-old item above a 10-minute-old one. No client re-sort exists
(`grep -c '.sort(' src/pages/Notifications.tsx` → 0) and the server-side filter only filters
(`rbacService.ts:324-342`). Round 6 left real evidence of the mixed format too: `NOTIF-3` had been
rewritten through the generic API to a description of the auditor's own choosing.

**Withdrawn** — §3.4 item 4, "same flaw for `dueDate`/`expiryDate`". Those columns hold ISO
`YYYY-MM-DD`, which sorts correctly: a rank comparison of text order against date order over the live
rows returns **0 mismatched rows** on `compliance_records.dueDate` and **0** on
`document_items.expiryDate`. What survives is a validation gap, not a live bug: `payload.ts:252,274,275,302`
accept any string ≤ 100 chars in those fields, and P-48 (rolled back) shows that two display-format
dates in the column reorder the whole deadline list — `'01 Dec 2026'` and `'05 Nov 2026'` both sort
**before** `'2026-09-17'`. Severity stays P1 but the reason changes from "deadline sorting is broken"
to "deadline sorting is correct only while every writer is polite, and nothing checks them".

**Corrected** — §3.4 item 2, "the random suffix makes the latest-200 not the latest-200 by time".
Decoded all 89 machine-written ids: the base36 millisecond prefix is **strictly monotonic** and
**0 ids share a millisecond**, so within the machine block `ORDER BY id DESC` *is* creation order. The
real defect is that the seed rows are a different id family (`LOG-1001`…`LOG-1005`) which sorts as a
text block *below* every `LOG-MVY…` id, so at the seam the feed runs `01 Nov 17:44` → `28 Oct` →
`29 Oct` → `30 Oct 10:15` → `30 Oct 11:24`, i.e. the oldest five entries appear in ascending time
order at the tail. Counted over the live 94-row feed: **11 adjacent pairs out of chronological order**.
And because the display stamp has minute granularity, ordering by the *timestamp* column is not a
usable fix either — 10 rows share minutes with others. The accurate finding: **there is no column in
`audit_logs` that orders the trail correctly** (`id` conflates two id families; `timestamp` is a
display string with no second precision).

### 3.13.4 L3-04 — the cap measured

Round 7, P-42: with 76 real rows in the table, an EVC session (no permission beyond being signed in)
`POST`ed 210 filler rows in 28 s. The superadmin feed then returned **exactly 200 rows, 200 of them
synthetic, 0 real**, and "newest real: NONE". Payload 69.3 KB → 101.9 KB. There is **no other read
path**: `GET /api/audit`, `/api/audit-logs`, `/api/auditLogs`, `/api/logs` all return JSON 404, and
`GET /api/snapshot?auditTake=1000` ignores the parameter. After `DELETE` of the 210 rows the feed
returned all 76. So the sentence in `src/pages/admin/AuditLogs.tsx:366` ("append-only and cannot be
edited or deleted") sits above a view that any low-privilege session can bury completely, and a
regulator-facing screen that cannot show a row past the 200th. Severity P1, not P2: the mitigation is
one line of the writer's choosing (`requirePermission(user,'audit.read')` on the POST) plus pagination.

### 3.13.5 L3-05 — confirmed by rewriting a row, then undoing it

Round 9b, P-50 (`P_pass_c_round9b_output.txt`), against the database `docker-compose.postgres.yml`
actually boots:

* `pg_trigger` for `audit_logs`: **NONE**; `pg_rules`: **NONE**; grants to the app role include
  `UPDATE`, `DELETE`, `TRUNCATE` and `TRIGGER`.
* One `UPDATE` turned a real row into `LOG-MVY63LQI-6C3C32 | APPLICATION_REJECTED | src=cron |
  REWRITTEN BY THIS PROBE: the officer never said this`. A following `DELETE` dropped the count 94 →
  93. `ROLLBACK` restored both; after it the row is present with its original text and the count is 94
  again, so **nothing persisted** — the probe is safe to re-run.
* No hash-chain, prev-hash or sequence column exists in any schema (`prevhash|hashchain|chainindex|rowhash|digest(`
  → none), so a silent rewrite is undetectable after the fact even by a careful reader.

Citation correction for the synthesis: the guard lives in
`supabase/migrations/**20261101090000**_production_hardening.sql:707-722` (`audit_logs_immutable`
trigger + `revoke update, delete, truncate … from anon, authenticated`), not `20261101000000…` as §3.6
says. Also, `supabase/tests/rls.sql:196,208` — which asserts the immutability error message — is run
by **nothing**: `package.json` has no script for it, and no `.ts`/`.js`/CI file references it. So the
product ships an immutability test it never executes against a schema it never deploys in this mode.
`grep -i "create trigger" prisma/` → 0 hits.

### 3.13.6 L3-06 — quantified, and the memory framing withdrawn

Round 7, P-43/P-44, host with 8 GB, one app container + one Postgres container:

| measurement | seed volume | ~200× volume (apps 2010, docs 2814, users 1407, audit 4636) |
|---|---|---|
| individual snapshot queries | 0.4-1.5 ms each | ≈1-6 ms each |
| `GET /api/snapshot` superadmin | 69.3 KB, mean 161 ms over 30 calls | **5,018,221 B, 1024-1285 ms** (5 runs) |
| `GET /api/snapshot` institute | 6.9 KB | **642,694 B, 518-980 ms** |
| 20 concurrent snapshots | — | 1627 ms total |
| `docker stats`, 240 s soak, 1 held SSE stream | 528.9 MiB baseline → 518.1/518.3/518.6/518.5/**518.1** MiB | no growth |

So: **the memory-pressure framing is withdrawn** — RSS is flat across the soak and falls below
baseline. The finding that remains is a bandwidth/CPU one: the payload is bounded by *table size*, not
by what the user is entitled to, and at 200× seed a regional officer's 643 KB snapshot is fetched on
every SSE-triggered refresh (`rev` counter broadcasts a global change, `data.ts:135,144`). The
`EXPLAIN` plans and the index inventory make §3.11's "indexes vs query patterns" row a **strength** —
every filter column, `sessions.tokenHash`, both `dedupeKey`s and the composite
(`entityType`,`entityId`) are indexed, and the capped audit read is an `Index Scan Backward using
audit_logs_pkey`. Any "missing index" framing is withdrawn too; the problem is the unbounded
`SELECT *` with no `WHERE`, then `filterApplicationsForUser` in JS.

Also from this round, on the same theme as L3-09: `sessions` was **65 rows, 0 expired, 6 distinct
users, oldest expiry 2026-11-02, newest 2026-12-01** and the only two `deleteMany` calls in `server/`
both delete assistant messages (`server/routes/assistant.ts:73,95`). Sessions are revoked, never
removed, so the table grows monotonically with every login — Pass C ended on **113 rows** for the same
10 seeded cases, purely because the probes sign in (§3.13.11).
The login limiter's restart behaviour, by contrast, **was** runtime-tested, in round 11 (P-57): after
6 failed attempts against an unknown address, `docker restart` followed by an immediate correct
sign-in returned **200**, so the buckets live in the process's `Map` (`rateLimit.ts:11`) and nowhere
else. That is the correct design for a process-local counter, which is why the real defect on this
path is the **spoofed-header bypass** (round 12, P-59 — a rotating `X-Forwarded-For` never reaches the
cap) and not the storage choice; that half belongs to L4.

### 3.13.7 L3-07 — confirmed, and the dangerous direction is the opposite one

§3.8 predicted duplicates from two concurrent sweeps. Pass C found the sharper failure: **dedupe-key
squatting** (round 6, P-40). `escalation_items.dedupeKey` is indexed but not unique
(`schema.prisma:241,249`), and `escalationSpec.create` does `findFirst`-then-insert (`data.ts:405-412`):

1. an `EVC_MEMBER` `POST /api/escalations` with a valid body (`urgency:"Medium"`, `level:1`,
   `slaBreachDays:1`) and `dedupeKey = "AICTE/2026/12876|SLA_BREACH"` → **201**, row created;
2. the genuine `Critical` / `level:3` / `slaBreachDays:40` escalation for the same case and rule
   arrives → **201, whose `entity` is the placeholder from step 1, and `ESCL-PROBE-40B` was never
   inserted**. The caller is told it succeeded; the regulator's escalation queue silently keeps a
   Medium/L1 row where a Critical/L3 one belongs. No rejection, no audit, no error.
3. reverse order (genuine first, placeholder second) is also a silent 201 no-op — the placeholder
   cannot overwrite, so the squat is permanent.
4. `raisedBy` is session-stamped (`data.ts:423`): the placeholder is stored as "Prof. S. Banerjee",
   not the "Institution" the body claimed. Good — and it is the only part of this path that is.
5. authority: `EVC_MEMBER` then `PUT /api/escalations/ESCL-PROBE-40C {"status":"Resolved"}` on an
   escalation another role raised → **200**, `resolvedAt` stamped. The least-privileged persona in the
   region can close a central escalation. Out-of-region `POST` → 403, so scope holds where it is
   written.

Note for the report: round 5's P-34 was inconclusive only because the probe body used
`urgency:"Low"`; the 400 message (`"urgency must be one of: Medium, High, Critical."`) is what let
round 6 retry with valid enums and turn an inference into a confirmed finding. Alerts remain safe
(`@unique` backstop, `schema.prisma:213`).

### 3.13.8 New findings from the live half

| id | sev | title | where | proof |
|---|---|---|---|---|
| L3-10 | **P0** | The regulated document endpoint is verify-only: a rejection request is answered by recording a verification | `server/routes/workflow.ts:271-344` (no outcome branch, unlike `:201-269`) | round 6 P-38: `POST /api/documents/DOC-PROBE-38/verify` with `{"decision":"Rejected","competentAuthority":"Automated Rejection Pipeline"}` → **200**, stored `status:"Verified"`, `verifiedBy:"Dr. R. K. Sharma"`; `POST /api/documents/:id/reject` → 404; the undertaking endpoint's reject arm demonstrably lives (409 `INVALID_STATE`, then 400 `"reason must be a string."`) |
| L3-11 | **P0** | A negative decision has no server path, so the UI performs it as an unaudited generic write and then authors its own audit row | `src/context/AppContext.tsx:1917-1983`, `src/services/repositories/postgresRepository.ts:228-238`, `data.ts:540-592` | round 6 P-39, both halves measured (§3.13.1) |
| L3-12 | P1 | The one-way guards block only the incoming value, so every other transition is free, and the field they refuse cannot be stored | `data.ts:226-298`, `server/scope.ts:103-119` | round 6 P-38: `verifiedAt` → 403 `REGULATED_FIELD` "stamped from the authenticated session" while `document_items` has **no `verifiedAt` column** (`uploadDate,expiryDate,renewalNote,verifiedBy`); `undertakings` has `verifiedAt,verifiedBy,rejectionReason` |
| L3-13 | P1 | Three write surfaces are declared with `permissions: []`, i.e. any signed-in user may create and edit queue rows | `data.ts` alert/notification/escalation specs; `evidence/raw/S30_empty_permission_specs.txt` | round 6 P-40 items 1, 2 and 5 executed by an EVC session |
| L3-14 | P1 | `evcVisitSpec` has no guard at all and accepts a full-row update | `data.ts:207-224` | **now probed live** — round 5 P-33 (`EVC-8805` `reportSubmitted` flipped both ways by a `REGIONAL_OFFICER` that holds no `evc.report.submit`) and round 13b (the same wholesale-update shape on `undertakings`) |
| L3-15 | P2 | Orphan audit rows are reachable and were reached: `audit_logs.entityId` has no FK | §3.4, `S18_db_constraints.txt` | round 8: after deleting every probe row, 9 audit rows (`VERIFY_DOCUMENT ×5`, `USER_CREATED ×2`, `USER_UPDATED`, `USER_ACTIVATED`, `USER_DEACTIVATED`, `FAILED_LOGIN_BAD_PASSWORD ×10`) still point at entities and users that no longer exist |
| L3-16 | P2 | The advertised correlation IDs are not generated by the server at all | `server/audit.ts:43` copies `draft.correlationId`; no route ever sets it; only the client-authored `POST /api/audit` accepts one (`data.ts:579`) | live census over the final 148-row table (`round13:P-66`): **147 of 148 rows have `correlationId = NULL`**, the single non-NULL value (`COR-1793555085534-u0f4`) is a seed row; the same probe counted **11 of 148** rows carrying any `previousState`/`newState` at all. `docs/AICTE-26262-IMPLEMENTATION.md:23` claims "before/after state, correlation IDs, production persistence … Done" |

Round 13 added one defect of this family that belongs to the data lens but is filed once, under its
PS-facing id: **L9-07** (`lens-L9.md` §9.6.2) — a full-row `PUT` writes the fields the client omitted
(`payload.ts:303/312` default `evidenceDocumentIds` to `[]` and `escalationLevel` to `0`;
`data.ts:333-343` / `:251-258` / `:221-223` persist the parsed object wholesale), which measured as
the **loss of a verified undertaking's evidence link** on a seeded row, reversible only by a direct
`UPDATE`. Treat L3-14 and L9-07 as one fix, not two.

L3-10 is the single most damaging thing Pass C found, and it is on the demo path: an officer who
chooses "Reject" on a document, in the endpoint built for regulated verification, gets a
**Verified** row and an audit entry saying it was verified. The `competentAuthority` string they
supplied is discarded. That is an integrity break of the exact kind the project's own invariant
("APPROVE/REJECT/VERIFY always require an identified human and are recorded with
`competentAuthority`/`verifiedBy`, stamped server-side") is meant to prevent.

### 3.13.9 Withdrawals and corrections — do not restate these in the report

| claim | status | why |
|---|---|---|
| Applications' stage/status guard can be bypassed by `PUT /api/applications` | **withdrawn** | round 4's in-script comment is wrong; at runtime the two-way guard refuses it with 403 (`assertUnchanged(['stage','status','decision','timeline'])`, `data.ts:198-204`) |
| Snapshot creates memory pressure / leak on the 8 GB host | **withdrawn** | RSS flat across 240 s soak and 50 concurrent-load requests (§3.13.6) |
| Snapshot queries need indexes | **withdrawn** | full index inventory; the reads that filter are `Index Scan` (§3.13.6) |
| Random id suffix scrambles the latest-200 audit feed | **corrected** | prefixes monotonic, 0 collisions; the two id *families* are the defect (§3.13.3) |
| `dueDate`/`expiryDate` ordering is wrong across months | **withdrawn as a live bug** | ISO in all live rows, 0 rank mismatches; survives only as the missing-format-validation gap (§3.13.3) |
| `DOC-501` drifted from seed | **withdrawn** | the seed value *is* `Expired`; round 8 confirms 0 differences |
| Notifications are mis-ordered because of day-first display stamps | **replaced by a stronger fact** | they are mis-ordered because they are relative labels — measured over HTTP, 0 of 5 positions right (§3.13.3) |

### 3.13.10 Final state of the audit database

Round 8 rebuilt the seed-vs-database comparator (`P_pass_c_round8.sh`, a `.cjs` script run against
dumps of the six seeded tables) and it reports **total field differences: 0** after 6 restores were
applied (`AICTE/2026/12875.remarks`, `CMP-101.status`, `DOC-507.verifiedBy`, `NOTIF-3`
description/read/priority). One deliberate exception is left in place and must be described that way in
the report: `AICTE/2026/12875` sits one stage ahead of the seed (`Scrutiny / Re-scrutiny` →
`Expert Visit Committee (EVC)`) because Pass C performed a **real, audited**
`POST /api/applications/:id/transitions`; rolling the row back would leave an audit row describing an
effect the row no longer has — which is precisely the L3-01/L3-11 class of problem, demonstrated on the
auditors' own data. Probe residue is nil: 2 probe users, 2 alerts, 1 notification, 4 documents,
2 `file_objects` rows and their 2 on-disk PDFs, and the 4 forged/probe audit rows were listed as they
were deleted. Final counts `apps=10 docs=10 und=7 cmp=5 evc=6 alerts=0 notifs=5 escl=0 users=5 files=0
audit=92`; `audit_logs.source` contains only `ui` and NULL (the 7 seed rows). Rounds 9/9b then added
2 legitimate `USER_LOGIN_SUCCESS` rows (`audit=94`) and, by construction, nothing else: P-48 and P-50
both `ROLLBACK`, and the residue check re-ran clean.

Two honest caveats. (1) Restoring `DOC-502` to its seed state could **not** be done through the
application: `/verify` requires `status:Pending`, so a row the probes had moved to `Expired` was
irreversible except by direct `UPDATE` — a data-reversibility finding in its own right, recorded in the
round-6 ledger. (2) Six undertaking `submittedAt`/`verifiedAt` "differences" the comparator first
flagged were `seedStamp()` time-of-day artefacts, not drift; the comparator now ignores same-day stamps
and prints how many it ignored, because "seed re-run today" and "database written yesterday" cannot
match on a wall-clock-derived value.

### 3.13.11 Where the database actually stands at the end of Pass C

Rounds 10-13b re-ran the same residue checks, so the six **data** tables are still at seed shape —
`round13:P-68` compares the three rows it had mutated field-by-field against a JSON capture taken
before the first request and prints **`total field differences: 0`**, and `round13b` re-checked all
seven seeded undertakings after deleting its own probe row (**mismatches: 0**, `UND-2602`'s
`evidenceDocumentIds` present again). Final counts, read straight from the container after the last
round: `apps=10 docs=10 und=7 cmp=5 evc=6 alerts=0 notifs=5 escl=0 users=5 files=0 audit=149
sessions=113`.

What is **not** restored is the audit trail, and that is deliberate rather than an oversight: the
table is the log of the audit's own requests, so `149` rows decompose as
`USER_LOGIN_SUCCESS ×115` (every probe signs in), `FAILED_LOGIN_BAD_PASSWORD ×17` (rounds 11-12
throttle probes), `USER_CREATED ×2` + `USER_UPDATED` + `USER_ACTIVATED` + `USER_DEACTIVATED` +
`USER_LOGOUT` (the six probe-user lifecycle rows, whose users were deleted), `VERIFY_DOCUMENT ×5` +
`FORWARD ×1` (the regulated endpoint exercised on real and probe rows), and the 5 seed rows whose
`source` is `NULL`. Nine of those rows now point at entities that no longer exist — 4
`VERIFY_DOCUMENT` on deleted `DOC-PROBE-*` ids and the 5 lifecycle rows on deleted users — which is
L3-15 measured, not hypothesised. Consequence for the demo, and it belongs in the pre-demo checklist
rather than in a finding: **an evaluator who opens the audit drawer on this container sees the audit's
own activity first** (a 149-row trail, 115 logins, 9 dangling references), and the 200-row window of
L3-04 is nowhere near full, so nothing is hidden by volume. `prisma migrate reset --force` (or a
fresh volume) before a live demo; no application route can do it, which is the other half of L3-05.
