# Stage 0 — Baseline

Audit of SIH26262 (ApoorvaSetu), read-only Stages 0–2.
Pinned commit `794e54c1fba0b3c56a0f3a41fe74e7e57ff06415` (`main`, == pushed tip) — `evidence/raw/git-head.txt`.
Date 2026-11-01. Host: Windows 10 (10.0.26200), x64, 12 threads, Docker Desktop.

Every claim in this file is backed by a transcript under `docs/audit/evidence/raw/`.
Line numbers are quoted with the file path because they drift; re-verify before editing.

---

## 1. Actual stack

Discovered, not assumed. The audit prompt's "intended stack" (Next.js monorepo, Drizzle,
Mailpit, pnpm) does not describe this repository; per the approved scope the real stack is
audited and equivalents are substituted (see §10, Not-applicable ledger).

| Layer | Actually present | Evidence |
|---|---|---|
| Frontend | React 19 SPA, Vite 8.3.5 (`rolldown`), Tailwind 4, React Router 7, Recharts, lucide-react | `evidence/raw/baseline-build.txt`, `package.json` |
| Backend | Express 5 single server in `server/`, TS executed directly via `node --experimental-strip-types` | `package.json` script `server` |
| Runtime | Node v24.16.0, npm 11.13.0 (host); container is Node-based image | command output; `Dockerfile` |
| Database | PostgreSQL 17 in Docker through **Prisma 6.19.3** (schema `prisma/schema.prisma`, 16 models) | `evidence/raw/baseline-inventory.txt` |
| Second data path | Supabase-js client (`@supabase/supabase-js`) with `supabaseRepository` + SQL hardening migration | `src/services/repositories/`, `supabase/migrations/20261101090000_production_hardening.sql` |
| Data modes | `demo` (browser localStorage) \| `supabase` \| `postgres` (server API), selected at build time by `VITE_DATA_MODE` | `src/services/repositories/dataMode.ts`, `docs/POSTGRES-DATA-LAYER.md` |
| Auth | Custom server sessions: scrypt password hash, `apoorvasetu_sid` HttpOnly cookie, `sessions` table | `server/password.ts`, `server/session.ts` |
| Storage | Pluggable adapters: `local` (disk under `UPLOAD_DIR`) and `supabase`; presign → PUT → signed GET | `server/storage/{index,local,supabase}.ts`, `server/routes/files.ts` |
| Email/SMTP | **None.** Notifications are in-app rows (`notification_items`, `system_alerts`); no Mailpit, no nodemailer, no SMTP env | grep of `server/` and `package.json` deps |
| AI assistant | `@google/genai` behind `server/aiService.ts` + `/api/assistant/*` | `server/index.ts:112`, `server/routes/assistant.ts` |
| Monorepo | **None.** One npm package at the root; no `apps/`, no `packages/`, no pnpm workspace | repo root listing |
| Tests | vitest 3.2.7, `environment: 'node'`, v8 coverage; **no Playwright / no browser E2E harness** | `vitest.config.ts`, `evidence/raw/baseline-tests.txt` |
| Lint | oxlint (116 rules), not ESLint | `evidence/raw/baseline-lint.txt` |
| Container | One image `apoorvasetu`, compose base (demo) + `docker-compose.postgres.yml` overlay (db + app) | `evidence/raw/baseline-artifacts.txt` |
| Serverless leftovers | `api/cron/sweep.ts`, `api/assistant/chat.ts` + `vercel.json` cron `0 * * * *`, Supabase-only | §7 |

Repo size: 143 TS/TSX under `src/` (30,212 lines, 26 page components), 39 TS under `server/`
(5,322 lines), 26 test files, 2 migrations sets (`prisma/migrations`, `supabase/migrations`).

## 2. Folder map

```
/            app entry, vite.config.ts, vitest.config.ts, oxlint, vercel.json, Dockerfile,
             docker-compose.yml, docker-compose.postgres.yml, .env.example
src/         SPA: App.tsx (routes), pages/ (26), components/, context/AppContext.tsx (~2,400 lines,
             the whole client-side workflow driver), services/ (repositories per data mode,
             rbacService, aiGuard, fileStorage, assistantService), workflow/ (pure engine:
             engine, routes, stages, sla, alerts, undertakings, documents, evc, compliance,
             notifications, reports, selectors, templates, config, codes), utils/, types/
server/      Express app: index.ts, session, password, authGuard, scope, validate, payload,
             rateLimit, events (SSE), audit, db, domain, http, mappers/, routes/ (auth, data,
             workflow, admin, files, assistant), storage/, webhookOutbox.ts, entrypoint.sh
prisma/      schema.prisma, migrations/, seed.ts
supabase/    migrations/20261101090000_production_hardening.sql
api/         vercel functions (cron sweep, assistant chat) — Supabase path only
public/      static assets, fonts, images (see §9 weight)
docs/        AICTE-26262-IMPLEMENTATION.md, POSTGRES-DATA-LAYER.md, audit/ (this folder)
```

## 3. Commands

### 3.1 Work from a clean checkout, no prerequisites (exit 0)

| Command | Result | Evidence |
|---|---|---|
| `npx tsc -b` | exit 0, no output | `raw/baseline-tsc.txt` |
| `npm run test:run` | 26 files / 232 tests passed, 11.26 s | `raw/baseline-tests.txt` |
| `npm run test:coverage` | exit 0, coverage table below | `raw/baseline-coverage.txt` |
| `npm run lint` | **22 warnings, 0 errors**, exit 0, 188 files | `raw/baseline-lint.txt` |
| `npm run build` | exit 0, `✓ built in 2.92 s`, chunk-size warning | `raw/baseline-build.txt` |
| `docker compose up -d --build` (demo) | healthy container on `:8080` | `raw/baseline-artifacts.txt` |
| `curl http://localhost:8080/api/health` | 200 | §9 |

There is **no `verify` script** (the prompt assumes `pnpm verify`). The equivalent gate is the
four commands above; the audit ran all four and all pass.

### 3.2 Fail without prerequisites (recorded verbatim, not worked around)

| Command | Failure | Reading |
|---|---|---|
| `npx prisma migrate deploy` (no `.env`) | `Error code: P1012`, `Environment variable not found: DIRECT_URL` at `prisma/schema.prisma:9`, `Validation Error Count: 1`, **exit 1** | Expected: Postgres mode needs `DATABASE_URL`/`DIRECT_URL`. But the same command is what README tells a fresh user to run, and Prisma 6 fails *at schema validation*, before it can say "database not configured". |
| same, stderr line 1 | `warn The configuration property package.json#prisma is deprecated and will be removed in Prisma 7` | `package.json:22-24` still uses the deprecated seed hook |

No `.env` exists in the repo (`ls .env` → not found); `.env` is gitignored. Demo mode boots with
an empty environment, as designed.

### 3.3 Documented but not usable as written

| Item | Problem |
|---|---|
| `README.md:18` "Requirements: Node.js 20+ and npm." | `npm run server` is `node --experimental-strip-types …`, which needs Node ≥ 22.6. Node 20 exits with an unknown-flag error. Verified flag requirement from the script text; Node 20 not installed on this host, so the failure itself is *suspected* (see §11). |
| `README.md:91` `docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build` | Both files declare `app` with `build:`, so `--build` rebuilds and **retags `apoorvasetu:local` with the Postgres build**, silently replacing the demo image. The audit avoids this with a temporary third overlay that renames the image (`apoorvasetu:audit-pg`); a normal user following the README loses the demo build. |
| `vercel.json` crons → `/api/cron/sweep` | No Vercel deploy in this project (`docs/POSTGRES-DATA-LAYER.md` defers cloud). The function is never invoked by the Docker path — see §7. |

## 4. Tests and coverage

26 files, **232 tests, all passing**, `environment: 'node'`.

**Scope caveat — this is the most important thing to know before quoting any coverage number.**
`vitest.config.ts` limits coverage to three globs:

```ts
coverage: { provider: 'v8',
  include: ['src/workflow/**/*.ts', 'src/utils/dates.ts', 'src/services/repositories/**/*.ts'] }
```

So "75 % overall" describes the workflow engine, `dates.ts` and the repositories. **The entire
Express server (`server/**`, 5,322 lines) is excluded from the coverage report even though eight
server test files run**, and so is every component, page and `AppContext.tsx`. `include` also
overrides the default exclude, so the `.test.ts` files themselves appear as 0-covered rows
(`types.ts` 0 %, `workflow/types.ts` 0 %) — artefacts, not real gaps.

Per-directory (from `raw/baseline-coverage.txt`):

| Area | Stmts | Notes |
|---|---|---|
| All files (as reported) | 75.33 % | scope caveat above |
| `src/workflow` | 89.08 % | engine 93.91 %, alerts 90.88 %, documents 96.97 %, evc 96.27 % |
| `src/workflow/notifications.ts` | **46.84 %** | weakest engine module; `templates.ts` branch 52.94 % |
| `src/workflow/config.ts` | 67.04 % (funcs 0 %) | policy-as-data defaults unexercised |
| `src/utils/dates.ts` | 83.33 % | |
| `src/services/repositories` | **30.11 %** | supabaseRepository **4.91 %**, postgresRepository 58.9 %, localRepository 76.85 %, index.ts 76.47 % |
| `server/**` | not reported | tests exist for session, scope, mappers, payload, validate, rateLimit, storage/keys |
| `src/pages`, `src/components`, `src/context` | not reported | no component/DOM tests at all; `happy-dom` is installed but unused |

Consequence for the audit: any defect in the HTTP layer (auth, scoping, uploads, snapshot) is
**not covered by a green test suite**, and the two remote repositories are the least tested code
in the data layer that the demo will actually run on.

## 5. UI surface census — 26 SPA routes (`src/App.tsx`)

| Route | Page | Guard group |
|---|---|---|
| `/login` | Login | public |
| `/` | Dashboard | all |
| `/admin/users`, `/admin/roles`, `/admin/system-config`, `/admin/audit-logs` | Admin | admin |
| `/regional/escalations` | Escalations | regional |
| `/evc/queue`, `/evc/my-visits`, `/evc/checklist`, `/evc/evidence` | EVC | committee |
| `/institution/profile`, `/institution/apply`, `/institution/tracking` | Institution | institution |
| `/applications`, `/institutes`, `/workflow`, `/evc-scheduling`, `/compliance`, `/documents`, `/regions-officials`, `/pendency`, `/reports` | Operations | officer/central |
| `/alerts`, `/notifications` | AlertCenter, Notifications | all |
| `/demo-scenarios` | DemoScenarios | demo-only |
| `*` | redirect → `/` | |

Route-level guards are the client's; the server re-checks per request (verified in Pass C, probes P-01…P-04).

## 6. API census — every handler (`server/`)

Mounted at `server/index.ts:109` (`/api/auth`) and `:188-192` (`/api` for admin, workflow, files,
assistant, data); `server/index.ts:200` returns 404 for unknown `/api/*`, then SPA fallback.

Health & platform:
- `GET  /api/health` — `server/index.ts:68` (no auth)
- `GET  /api/ready` — `server/index.ts:96` (no auth; 200 only when DB reachable)
- `GET  /api/assistant/status` — `server/index.ts:112` (**no auth**)
- `POST /api/assistant/chat` — `server/index.ts:122`
- `GET  /api/events` — `server/index.ts:182` (`requireSession`, SSE)

Auth (`server/routes/auth.ts`): `POST /login` :43, `GET /session` :132, `POST /logout` :150.

Data write API (`server/routes/data.ts`) — 15 generated CRUD endpoints plus 4 hand-written:
- `POST/PUT /applications` `:448-449`, `/evc-visits` `:450-451`, `/compliance` `:452-453`,
  `/documents` `:454-455`, `/undertakings` `:456-457`, `/notifications` `:458-459`,
  `/alerts` `:460-461`, `/escalations` `:462-463` — all through one `saveHandler` (`:116-148`)
- `GET  /snapshot` `:465-500`
- `POST /audit` `:566-586`
- `PUT  /config` `:594-595`
- `POST /admin/reset` `:610-611`

Workflow (`server/routes/workflow.ts`): `POST /applications/:id/transitions` :66,
`POST /compliance/:id/verify` :158, `POST /undertakings/:id/verify` :202, `POST /documents/:id/verify` :272.

Files (`server/routes/files.ts`): `POST /files/presign` :57, `POST /files/complete` :111,
`POST /files/signed-url` :138, `PUT /files/object` :160, `GET /files/object` :192.

Admin (`server/routes/admin.ts`): `GET /users` :96, `POST /users` :105, `PUT /users/:id` :158,
`POST /users/:id/toggle` :217, `PUT /roles/:role/permissions` :252.

Assistant (`server/routes/assistant.ts`): `GET/PUT/DELETE /assistant/history` :43, :63, :93.

**Total: 45 handlers** — 5 platform + 3 auth + 20 data (16 generated CRUD + snapshot + audit +
config + reset) + 4 workflow + 5 files + 5 admin + 3 assistant history.
Only `/api/health`, `/api/ready`, `/api/assistant/status` are reachable without a session —
`/api/assistant/status` is the one that returns data (see L4).

## 7. Background / scheduled work ("worker jobs")

The prompt assumes `apps/worker`. There is no worker process. What actually runs:

| Job | Where | Trigger | Runs in Docker? |
|---|---|---|---|
| Deadline/alert/escalation sweep | `src/workflow/alerts.ts` `sweepDeadlines()`, driven by `src/context/AppContext.tsx:2097` (kick `setTimeout 0`) and `:2102` `setInterval(60_000)` | **Only while a signed-in browser tab is open** | No — client-side |
| Manual "Run sweep" | `src/pages/AlertCenter.tsx:108` button → `runSweep` | Human click | No — client-side |
| Remote sweep write-back | `src/context/AppContext.tsx:2017` `runSweep`, gated to SUPER_ADMIN when remote | Inside the interval above | No — client-side |
| SSE keepalive | `server/events.ts:38` `setInterval` | per connected client | **Yes** |
| Webhook outbox | `server/webhookOutbox.ts` | called from the write path | Yes, request-scoped, no timer |
| Hourly cron sweep | `api/cron/sweep.ts` + `vercel.json` (`0 * * * *`) | Vercel scheduler, `CRON_SECRET` bearer header, writes through `@supabase/supabase-js` | **No** — not reachable from the Express/Docker path at all |

Two consequences recorded for the lenses: (a) in Postgres mode, alert timeliness — one of the six
graded criteria — depends on an open tab and on a SUPER_ADMIN being that tab (§7 → L2/L9); (b) the
serverless sweep writes to Supabase tables `alerts` / `escalations`, while the Prisma schema maps the
same domain to `system_alerts` / `escalation_items`, so the two paths cannot share a database
(→ L3, L10).

## 8. Data-layer census

Prisma models → tables (`prisma/schema.prisma`, `@@map`), 16 total:
`applications`, `institutes`, `evc_visits`, `compliance_records`, `document_items`, `undertakings`,
`notification_items`, `system_alerts`, `escalation_items`, `audit_logs`, `system_config`,
`role_permissions`, `users`, `sessions`, `assistant_messages`, `file_objects`.
Full model/line index in `raw/baseline-inventory.txt`.

Supabase path (separate SQL migration): the same domain tables plus a `documents`/`alerts`/
`escalations` naming used by `api/cron/sweep.ts`, RLS policies and an insert-only trigger on the
audit table (`supabase/migrations/20261101090000_production_hardening.sql:707-722`).

## 9. Runtime baseline (demo profile, measured)

| Measurement | Value |
|---|---|
| Images | `apoorvasetu:local` 1.07 GB (`c25b5f905cd8`), `apoorvasetu:p14-postgres` 1.07 GB (`feac33ad5875`) |
| Container | `apoorvasetu-app-1`, `0.0.0.0:8080->3001`, status `Up (healthy)` |
| `docker stats` (no-stream) | CPU 0.00 %, **memory 65.89 MiB / 3.505 GiB (1.84 %)** |
| `GET /api/health` | 200 |
| `GET /api/ready` (demo, no DB) | 503 `{"ready":false,"database":"unconfigured"}` |
| `GET /api/snapshot` (demo, no DB) | 503 `{"error":"DATABASE_UNCONFIGURED",…}` |
| `GET /api/assistant/status` (no session) | 200 `{"isConfigured":false,"provider":"gemini","model":"gemini-3-flash-preview"}` |
| JS bundle | `dist/assets/index-Cd-UkX3f.js` **1,268,336 B raw / 340,596 B gzip** (byte counts from disk; Vite reports 1,268.33 kB / 343.63 kB) |
| CSS | 54,210 B / **10,363 B gzip** |
| `index.html` | 896 B / 486 B |
| Served JS inside container | 1,268,336 B — identical to local build, so demo container ships the same single chunk |
| `public/` images shipped | `screenshots/dashboard.png` 200,420 B, `stat-cards-reference-full.png` 132,714 B, `stat-cards-reference.png` 92,439 B, `aicte-banner.png` 34,310 B, fonts 24,532 + 15,160 B |

The two `screenshots/*` and `stat-cards-reference*` files (≈ 425 KB, more than the gzipped bundle)
are design-reference artefacts served to every visitor — recorded for L6/L8/L10.

## 10. Not-applicable-on-this-stack ledger

Checks from the prompt that describe a different repository. Per the approved scope these are
**not filed as findings**; each is mapped to its real equivalent.

| Prompt assumption | Why N/A | Equivalent actually audited |
|---|---|---|
| Next.js monorepo (`apps/web`, `apps/worker`, `packages/core`, `packages/db`) | Vite SPA + Express in one package | Same lens, applied to `src/`, `server/`, `src/workflow/` |
| Drizzle ORM, Neon-compatible | Prisma 6.19.3 + Postgres 17, local Docker (Neon deferred by choice) | Prisma schema, migrations, `$queryRaw` scan |
| Mailpit / SMTP delivery | No mail transport exists | In-app notification/alert rows + their text quality |
| `pnpm` lockfile, `pnpm verify` | npm + `package-lock.json`; no verify script | §3.1 four-command gate |
| Playwright-based `/qa` + `/browse` | No Playwright; `browse.exe` (extensionless binary) is not runnable here | `browser-use` MCP driving the real app, `curl` transcripts |
| gstack `/review`, `/cso`, `/benchmark`, `/office-hours`, `/ship` | Not registered as invocable skills in this environment (only `gstack` index is); `gstack-cso-launcher.exe` present but doctor-unverified | Checklist order taken from those SKILL.md files; results recorded in §11 where a check could not run |
| Vercel/`vercel.json` deployment, RLS as the live authorization | Deployment deferred by explicit project decision | Express `scope.ts` + route guards are the live authorization; Supabase RLS audited as the alternate path |
| "route versioning for old applications" | No route-version column | Checked as an engine question instead (`src/workflow/routes.ts`) |

## 11. Not-run ledger, and the advisories that did run

Stage 0 wrote this table as a list of debts. Every row now carries its resolution, so the synthesis
can distinguish "not run because it was impossible here" from "not run because Pass C chose not to".

| Check | Why not run at Stage 0 | Where it stands |
|---|---|---|
| Node 20 reproduction of `npm run server` | Only Node 24.16.0 installed; installing a second runtime would mutate the environment | **Still not run.** Round 14 confirmed the *code* half: the clone's `package.json` declares no `engines` field and nothing in `server/` reads `process.versions`, so the README:17 "Node.js 20+" claim is unenforced and the `--experimental-strip-types` failure on 20.x is inferred from the flag, not observed. `evidence/curl/P_pass_c_round14_output.txt` §7 |
| gstack `/qa`, `/design-review`, `/cso`, `/devex-review` as invocable skills | Not registered; the sub-skill files are read as checklists | **Not run as skills, run as checklists.** Pass B used the `qa`/`design-review`/`a11y` checklists against `:8080` (`evidence/qa/`), Pass C used the `cso` checklist as the L4 probe order. No gstack tool executed anything |
| `/browse` native binary | `browse/dist/browse.exe` exists; the skill probes the extensionless path and refuses | **Not run** — `browser-use` MCP drove the real app instead (Pass B), and every Postgres claim rests on `curl` transcripts, which are stronger evidence than screenshots |
| 10-minute soak / memory growth | Scheduled in Pass C with `docker stats` sampling (L8) | **Run, shorter than planned**: 240 s idle soak with one held SSE stream plus 20 concurrent snapshots and a restart, rounds 7 and 11-12. RSS 518.1 → 518.1 MiB, 83.9/99.9 MiB after restart. The memory-pressure framing was **withdrawn** (L8 §8.9.6, L3 §3.13.6). A 10-minute curve is still not measured |
| 10× seed load on the worker | No worker process (§7); equivalent = 10× snapshot size against `/api/snapshot` + Postgres | **Run and exceeded**: ~200× seed (apps 2010, docs 2814, users 1407, audit 4636) in round 7, `GET /api/snapshot` superadmin **5,018,221 B in 1024-1285 ms**, institute 642,694 B in 518-980 ms. Everything inflated was deleted afterwards (`round7:P-96`) |
| `EXPLAIN` on the ten heaviest queries | Needs the Postgres overlay; Pass C, `evidence/psql/` | **Run** — round 7 P-43 (index inventory + plans for all twelve snapshot reads at seed) and P-43b (same plans at 200×). Outcome: indexes are a **strength**, the unbounded `SELECT *` is the finding (L3 §3.13.6) |
| Fresh-clone README walkthrough | Cloning into a temp dir during Pass A/C, read-only, no push | **Run — rounds 14 and 14b**: `git clone` of the pinned commit `794e54c` into a never-built directory, then `npm ci` → `npm run build` → lint → test → boot on `:8090`/`:8091` with no `.env`, then teardown and a proof the audited container was untouched. It found something Stage 0 could not: **`npm run build` fails on a clean clone** (64 `error TS`, all downstream of the un-generated Prisma client) and `npx prisma generate` in 1.00 s makes the same build exit 0 — L10-06. Transcripts `evidence/curl/P_pass_c_round14_output.txt`, `P_pass_c_round14b_output.txt`; findings in L10 §10.10 |
| Full L5/L9 demo script timing | Pass B/C per plan | **Half run.** Pass B timed the flows in demo mode (`:8080`, `evidence/qa/`); **no browser ever opened `:8081`**, so every "what an evaluator sees in Postgres mode" claim stays static (L9 §9.6.9). Pass C replaced that walk with API-level transcripts |

### 11.1 Dependency advisories (run at Stage 0 — `raw/baseline-npm-audit.txt`)

| Scope | Result | Ship status |
|---|---|---|
| `npm audit` (all) | **11 vulnerabilities — 5 moderate, 3 high, 3 critical**, exit 1 | — |
| `npm audit --omit=dev` | **3 high**, exit 1 | these are the ones inside the Docker image |

The 3 critical + most moderate are dev-only (`tinypool` prototype-pollution → RCE ≤ 2.1.1,
`@vitest/mocker` path traversal ≤ 4.1.11, `glob`/`minimatch`, `test-exclude`) — they affect the test
harness, not the deployed container.

The 3 production highs are one chain: `deepmerge-ts <8.0.0` (stack exhaustion, GHSA-ggr8-5vv4-36mx)
← `@prisma/config` ← `prisma`. Note that **`prisma` (the CLI) is listed in `dependencies`, not
`devDependencies`**, so the CLI and its config package are installed into the runtime image — that is
what pulls the advisory into production and makes `npm audit --omit=dev` non-clean. Every listed fix
is `npm audit fix --force`, i.e. a breaking major bump (prisma 6.19 → 7.10.1, vitest 3.2 → 5.0.5,
happy-dom 18 → 21), which the audit rules put out of Stage 2 scope and gate behind an explicit ask.

### 11.2 Checks Pass C deliberately left un-run

These are debts the audit created by choosing a boundary, not oversights. Each one is a line in the
synthesis's "not covered" section, and each says what it would take.

| Left un-run | Why | Cost of running it |
|---|---|---|
| The Supabase mode driver — RLS policies, the storage bucket, `supabase/tests/rls.sql` | The audited stack is the local Postgres overlay on `:8081`. The `supabase/migrations/20261101090000_production_hardening.sql` path (triggers, revokes, 700+ lines of policy) was **read, never executed**, so every "production Auth/RLS/Storage: Done" claim in `docs/AICTE-26262-IMPLEMENTATION.md` is unproven in both directions | A Supabase project or a Postgres image with the migration applied; `psql -f supabase/tests/rls.sql` (which no script or CI file runs today) |
| `POST /api/admin/reset` with a superadmin session | It calls `clearDatabase`. The audited container's environment has no `ALLOW_DEMO_RESET`, so the route 403s before touching data — proven by the env dump and the 401 unauthenticated, which is the evidence recorded (L9 §9.6.5) | Drops the dataset; would need a re-seed and a fresh volume to stay honest |
| Any browser walk of `:8081` | Pass C answered questions at the HTTP layer, where the answers are reproducible transcripts. Consequence: the login panel's demo credentials, the inert demo-clock control, the audit drawer and the CSV export under Postgres mode are all **static-only** (L9 §9.6.9, L5) | ~30 min of `browser-use` against the Postgres build, signed in as each persona |
| Two app containers behind one proxy | `rateLimit.ts:11` (`Map`), `events.ts` (in-memory `revision`) and the SSE fan-out are process-local, so a second replica changes behaviour — asserted from source, never measured | `docker compose up --scale app=2` + a load balancer; the finding would then be confirmed instead of inferred |
| Assistant with a real `GEMINI_API_KEY` | No key in the environment; `/api/assistant/status` answers `isConfigured:false` and the 503 path is the only one exercised | A paid key, and a quota the audit should not spend |
| Node 20 boot (see §11) | Would mean installing a second runtime on the host | `nvm install 20` — an environment mutation the audit rules out |
| Restore from a `pg_dump`, disk-full, and a 10-minute soak | Only `migrate deploy` / `SEED_ON_START` boot paths were observed (rounds 11-12 restarts and Stage 0's `raw/baseline-db-deploy-noenv.txt`) | A scratch volume and time; no finding currently depends on them |

## 12. Configuration surface

From `.env.example` + `docs/POSTGRES-DATA-LAYER.md:140-160`, all server-side except the first:
`VITE_DATA_MODE` (build-time), `DATABASE_URL`/`DIRECT_URL`, `SEED_ON_START`, `SEED_FORCE`,
`ALLOW_DEMO_RESET`, `COOKIE_SECURE`, `APP_ORIGIN`, `STORAGE_DRIVER`, `UPLOAD_DIR`, `UPLOAD_MAX_MB`,
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_STORAGE_BUCKET`,
`GEMINI_API_KEY`/`AI_PROVIDER`/`AI_MODEL`/`AI_ALLOWED_ORIGINS`, `CRON_SECRET`.
No credentials are committed; `.env` is gitignored and absent (§3.2).

Two untracked artefacts exist in the working tree at Stage 0 time and are **not** part of the app:
`coverage/` (generated by `npm run test:coverage`) is not listed in `.gitignore` and therefore shows
up in `git status` — recorded for L10. `dist/`, `node_modules/`, `.env` are ignored.

## 13. What Stage 0 proves, and what it does not

Green at the pinned commit: type-check, 232 tests, lint (0 errors), production build, demo container
healthy, `/api/health` 200. The repository is not broken at boot.

One qualifier belongs here now that the fresh-clone test has run (rounds 14/14b): that green build is
green **in this working tree**, where `npx prisma generate` had already been run during the P14 work.
A clean clone of the same commit fails `npm run build` with 64 TypeScript errors until the client is
generated (L10-06). So "the repository builds" is true of the audited state, not of the deliverable
state — which is why the clone test was worth running late rather than trusting Stage 0.

Stage 0 deliberately establishes three things the rest of the audit is built on:
1. the **coverage blind spot** (§4) — the HTTP layer and every UI file are outside the reported numbers;
2. the **sweep is a browser tab** (§7) — alert timeliness has no server-side guarantee in Docker;
3. the **two data paths diverge** (§3.3, §7, §8) — Supabase/Prisma table naming, and the README command
   that overwrites the demo image.

Everything else in this audit is a finding with its own evidence.
