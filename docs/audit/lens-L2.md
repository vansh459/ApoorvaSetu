# Lens L2 — Architecture and engineering review

Method: read the layering, the clock boundary, the state machines, the idempotency and failure-mode
handling. Checklist order from `~/.claude/skills/gstack/plan-eng-review/SKILL.md`; every claim below
is a file:line or a command transcript in `evidence/raw/`. Skill not invocable here → checklist used
directly (see baseline §10).

---

## What is structurally right (protect these)

1. **The core really is a shared pure module.** `src/workflow/*.ts` imports nothing from
   `services/`, `context/`, `pages/` or `components/` — only `../types` and `../utils/dates`
   (`evidence/raw/S20_layering.txt`). The server imports the same engine
   (`server/routes/workflow.ts:8` → `applyTransition`), so demo mode and Postgres mode cannot drift
   on transition legality. This is the single best architectural property in the repo.
2. **The regulated write path is transactional and complete.**
   `server/routes/workflow.ts:83-114`: read → `applyTransition` → `updateMany({where:{id,version}})`
   → `writeAudit(tx,…)` inside one `prisma.$transaction`, then `broadcast`. State change and audit
   event commit together; a lost race returns `VERSION_CONFLICT`, not a half-written row.
3. **Server sessions are not client-decodable.** Random token, sha256 lookup, DB-side expiry
   (`server/session.ts:33,44`), `httpOnly` + `SameSite=Lax` (`server/session.ts:47-52`).
4. **Error handling does not leak.** `server/http.ts:27-37` maps unknown errors to a generic 500 and
   logs server-side; Prisma `P2002`/`P2025` are mapped to 409/404 at `server/index.ts:236-243`.
5. **Clock injection exists at the sweep boundary**: `sweepDeadlines` takes `input.now ?? getNow()`
   (`src/workflow/alerts.ts:290`).

## L2-01 — The deadline engine has no server-side host (P0, confirmed)

Alerts, escalations, notifications and `slaTier` recomputation exist only inside the browser tab:
`src/context/AppContext.tsx:2097` (`setTimeout` kick) and `:2102` (`setInterval(60_000)`), plus the
manual button at `src/pages/AlertCenter.tsx:108`. `server/` contains no scheduler — the only
`setInterval` on the server is the SSE keepalive (`server/events.ts:38`).

The one server-side sweep that exists, `api/cron/sweep.ts` + `vercel.json` (`0 * * * *`), is dead in
this deployment: it is excluded from the image by `.dockerignore` (`api`), it authenticates with
`CRON_SECRET`, and it writes through `@supabase/supabase-js` to tables named `alerts`/`escalations`,
while the Prisma schema in use maps those entities to `system_alerts`/`escalation_items`
(`prisma/schema.prisma:206,229` with `@@map`). It cannot touch the running database even if invoked.

Impact on the graded criteria: "timeliness of alerts" and "reliability of deadline tracking" are
guaranteed only while some user keeps a tab open — and in Postgres mode the write-back is gated to
SUPER_ADMIN (`src/context/AppContext.tsx:2021`), so if no super-admin tab is open, **nothing is ever
raised**. A judge who signs in as a Regional Officer sees alerts that were created by whoever last
had a tab open.
Fix direction: a server-side sweep job (timer or `POST /api/sweep` guarded by `CRON_SECRET`) reusing
`sweepDeadlines`, with the same transaction+audit discipline as the transition route.

## L2-02 — "Pure core" is broken by ID generation (P1, confirmed)

`src/workflow` claims determinism but three modules build identifiers from wall-clock and PRNG:

| Location | Code |
|---|---|
| `src/workflow/alerts.ts:73` | `` `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}` `` |
| `src/workflow/engine.ts:30` | `` `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}` `` |
| `src/workflow/engine.ts:34` | `` `COR-${Date.now()}-${Math.random()…}` `` |
| `src/workflow/undertakings.ts:79` | `` `UND-${Date.now().toString(36)}-${Math.random()…}` `` |

Consequences: (a) the engine is not a pure function of its inputs — the same sweep run twice yields
different ids, so a "simulated clock" replay is not reproducible; (b) `Math.random()` is not
collision-safe across concurrent sessions, and ids are primary keys, so a collision becomes an
insert failure (`P2002` → 409) rather than a duplicate; (c) the ids sort as mixed-length base36
strings, so lexicographic order ≠ creation order (see L3-04).
Fix direction: pass an id factory (or `crypto.randomUUID()`) through the context the engine already
receives; keep `Date.now()` out of `src/workflow`.

## L2-03 — Simulated clock and server clock disagree inside one request (P2, confirmed)

`setDemoClockOffset` is refused outside demo mode (`src/context/AppContext.tsx:2233`), which is
correct for the seeded demo, but the design leaves two clocks in the Postgres path anyway: the client
stamps `notification.timestamp` / `alert.createdAt` from its own `getNow()` while the server stamps
`acknowledgedAt`, `resolvedAt` and every audit `timestamp` with `formatAuditTimestamp()`
(`server/audit.ts:16`, `server/routes/data.ts:88` → `new Date()`). Anywhere both are compared — the
SLA clock, "raised X minutes ago" — the two sources are different timelines. It also means the
demo-clock feature (a headline differentiator) silently does nothing in the mode the judges will run
against the real database.

## L2-04 — Two audit stores in demo mode (P2, confirmed)

`src/services/auditService.ts:7` treats `apoorvasetu_audit_v1` as *legacy* and migrates it into
`apoorvasetu_audit_v4` (`src/services/repositories/localRepository.ts:18`) once per module load
(`legacyMigrated`, `auditService.ts:29-46`). But `src/services/authService.ts:18,140,149` **still
writes auth events into `apoorvasetu_audit_v1`** after that migration has run. Login, failed-password
and logout records therefore live in a store the Audit Logs page does not read until the next page
load — and only if some other audit write triggers the migration again. Sign-in events, the most
audit-relevant rows in the system, are the least reliably visible.
Fix direction: one key, one writer. `authService` should call `auditService` instead of maintaining
its own array.

## L2-05 — Duplicated clock formatter (P3, confirmed)

`formatAuditTimestamp` is implemented twice, character-for-character: `server/audit.ts:16-21`
(default `new Date()`) and `src/services/auditService.ts:22-27` (default `getNow()`). Same string
format, two defaults — precisely the kind of split that produces the L2-03 clock divergence. The
server should import the shared formatter and pass the clock explicitly.

## L2-06 — Six core modules cannot be loaded by the server (P2, confirmed by execution)

`documents.ts:1`, `evc.ts:1`, `notifications.ts:1`, `reports.ts:1`, `selectors.ts:9`, `templates.ts:1`
all import `from '../types'` (extensionless, directory-form). Vite resolves this; Node's
type-stripping loader does not:

```
$ node --experimental-strip-types -e "import('./src/workflow/selectors.ts')…"
FAIL: ERR_MODULE_NOT_FOUND          (evidence/raw/S20_layering.txt)
```

Today the server only loads `engine.ts`, `routes.ts`, `stages.ts`, `codes.ts`, `config.ts`,
`types.ts`, `undertakings.ts`, `alerts.ts`, which all use `../types/index.ts` or `./x.ts` forms, so
nothing breaks. But the module the repository most needs to load server-side — the sweep chain
(`alerts` → `notifications`/`selectors` for the escalation text) — is exactly the set that fails.
This is a trap for the L2-01 fix. One command fixes it: rewrite `'../types'` → `'../types/index.ts'`
and add a guard test that imports every `src/workflow` module under Node.

## L2-07 — Optimistic locking is inconsistent across the write API (P1, confirmed)

`applicationSpec` carries `version` and rejects a stale write with 409
(`server/routes/data.ts:177-197`). The other generated specs do not: `evcSpec.update` (`:221-223`),
`complianceSpec.update` (`:249-259`), `documentSpec.update` (`:278-284`),
`undertakingSpec.update` (`:325-337`), `notificationSpec.update` (`:367-371`),
`alertSpec.update` (`:397-399`), `escalationSpec.update` (`:435-446`) all write
`where: { id }`. Two officers editing the same undertaking — the "two officers act on the same
application" QA case, but on the unguarded entities — silently lose one edit. The `version` column
exists for applications only (see L3 DB census).

## L2-08 — State machines: legal, but the guard is value-based not transition-based (P1, confirmed)

Every `guard` on the generic write path checks only the **incoming** value, never the arc:

| Spec | Guard (file:line) | What still passes |
|---|---|---|
| `applicationSpec` `:198-204` + `update :177-184` | `assertUnchanged(stage,status,decision,timeline)` | nothing — this one is correct |
| `complianceSpec` `:236-244` | blocks incoming `status === 'Verified'` | `Expired`, `Critical`, `escalationLevel`, `dueDate` writable |
| `documentSpec` `:271-279` | blocks incoming `status === 'Verified'` | **`Rejected`, `Superseded`, `expiryDate`, `renewalStatus:'Verified'`** writable |
| `undertakingSpec` `:311-319` | blocks `Verified`/`Rejected` | **`dueDate`, `escalationLevel`, `rejectionReason`** writable |
| `evcSpec` — no guard | — | `status`, `reportSubmitted`, dates writable |
| `notificationSpec` / `alertSpec` / `escalationSpec` — no guard, `permissions: []` | — | create/resolve by any signed-in role |

This is the architectural root of the regulatory findings in L4/L9: the system has *one* correct,
audited, authority-stamped transition machine (`workflowRouter`) and a *second*, unguarded bulk-write
surface (`saveHandler`) over the same rows, distinguished only by per-spec value checks that were
written field-by-field rather than from the state machine. A single rule — "fields the engine owns
are not writable through the bulk API" — would make the whole class impossible.

## L2-09 — Dead and unreachable code (P2, confirmed)

| Item | Evidence |
|---|---|
| `api/cron/sweep.ts` (274 lines) + `api/assistant/chat.ts` (85 lines) + `vercel.json` crons | unreachable in Docker; table names don't match the live schema (L2-01) |
| `src/context/AppContext.tsx:416-478` `randomizeAllNames` / `randomizeCurrentUser` | defined, not wired to any control |
| `happy-dom` in devDependencies | `vitest.config.ts` sets `environment: 'node'`; no DOM test exists |
| `src/services/authService.ts` client HMAC session minting | superseded by `server/session.ts` for the Postgres path, yet still the auth path for `supabase`/`demo` and still shipped in every bundle (see L4-01) |
| `supabaseRepository.ts` at 4.91 % coverage | a whole second data path kept alive in the UI (`getDataMode() === 'supabase'` branches) that no test or run exercises |

## L2-10 — Failure modes (mixed)

| Failure | Behaviour | Verdict |
|---|---|---|
| DB down at boot | `server/entrypoint.sh` retries `migrate deploy` 30× then **starts anyway** ("starting without migrations") | degraded silently; `/api/ready` stays red — acceptable but undocumented in README |
| DB down at runtime | `errorHandler` → generic 500; `/api/health` reports `database:"error"` | good |
| SMTP down | n/a — no mail transport (baseline §1) | PS text about "alerts by email" is unmet by design |
| Worker crash | n/a — no worker; a closed tab is the "crash" (L2-01) | the real risk |
| Clock jump | `getNow()` + offset; server stamps real time (L2-03) | divergent |
| Duplicate sweep | alerts: DB `@unique` on `dedupeKey` (`prisma/schema.prisma:213`) ✔; notifications and escalations: only `@@index` (`:198,:249`) with read-then-write dedupe (`server/routes/data.ts:358-366,405-412`) → **racy duplicates** | half-fixed |

## Not applicable / out of scope for L2

Route versioning of approval routes (baseline §10). Circular imports: none found — `src/workflow`
has no upward imports (S-20). `packages/core` purity: substituted by the `src/workflow` check above.
