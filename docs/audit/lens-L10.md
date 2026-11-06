# Lens L10 — DevOps and repository hygiene

Probes: `.dockerignore`, `Dockerfile`, both compose files, `server/entrypoint.sh`, `package.json`,
three tsconfigs, `.oxlintrc.json`, `.gitignore`, README and the two docs files. Everything below is
either quoted from a file or from `evidence/raw/`.

## 10.1 Container build — mostly right

`Dockerfile` is a genuine 5-stage build (`base` → `deps` → `build` → `prod-deps` → `runner`):

| Property | State |
|---|---|
| Non-root runtime | ✔ `USER node` (`:61`), `--chown=node:node` on every copied layer |
| HEALTHCHECK | ✔ `:63-64`, `node -e fetch(…)`, 30 s interval, 45 s start period |
| Build cache | ✔ `--mount=type=cache,target=/root/.npm`, `npm ci` on lockfile, layer order copies sources after config |
| Prisma engine dependency | ✔ openssl installed in `base` (`:7-9`) so all stages get it — the fix that landed in P14.6 |
| `.dockerignore` | ✔ covers `node_modules`, `dist`, `coverage`, `.env*`, `.git`, and — unusually well — `docs`, `supabase`, `api`, `**/*.test.ts(x)` |
| Secrets in image | ✔ none; `VITE_*` are build args and unset by default (`:22-27`), `.env` is ignored |
| Attack surface | `COPY src ./src` (`:58`) puts 30 k lines of SPA source in the runtime image — justified in the comment (the API imports the shared workflow/RBAC modules), but it means the shipped container contains the client HMAC secret as plain source too (L4-01) |
| Init/restart | ✔ `init: true`, `restart: unless-stopped`, `stop_grace_period: 5s` |
| Image size | 1.07 GB — Node 24-slim + prod deps including the `prisma` CLI, which `entrypoint.sh` genuinely needs at runtime for `migrate deploy`. Trim candidate: `@supabase/supabase-js` is installed in the runner but unused by the Postgres path |

## 10.2 L10-01 — No resource limits anywhere (P2, confirmed)

Neither compose file sets `mem_limit`, `cpus`, `deploy.resources` or `read_only`/
`security_opt: [no-new-privileges:true]`. The audit brief names explicit budgets (web ≈ 384 MB,
db ≈ 256 MB) on an 8 GB host; idle RSS is 66 MB (baseline §9), so today's headroom is fine, but the
unbounded `GET /api/snapshot` (L3-06) can allocate without a ceiling and take the host — and the
demo — down. One `mem_limit` pair on `app` and `db` is the cheapest insurance in this whole lens.

## 10.3 L10-02 — TypeScript runs with `strict` disabled (P1 for a codebase this central to decisions)

```
$ grep -n "strict" tsconfig*.json
(no output)
```

Neither `tsconfig.app.json` nor `tsconfig.node.json` sets `"strict": true`, so
`strictNullChecks`, `noImplicitAny`, `strictFunctionTypes` and friends are all **off** for both the
SPA and the Express server. Consequences visible in the code as written:

* non-null assertions where the value is only guaranteed by convention — e.g.
  `user.region!` inside the snapshot escalation filter (`server/routes/data.ts:511`);
* `targetRole` cast through `as NotificationItem['targetRole']` without validation
  (`server/payload.ts`) — a type lie the compiler cannot catch because of the cast *and* the missing
  strictness;
* optional repository methods (`src/services/repositories/types.ts`) callable on the wrong mode.

It also means the green `npx tsc -b` in the baseline (§3.1) is a **much weaker** guarantee than it
appears, and the audit rule "do not loosen type strictness" has nothing to loosen — the work is to
turn it on. Realistic effort: `strictNullChecks: true` first (surfaces the genuine bugs), full
`strict` last. The two tsconfigs also disagree on hygiene flags (`noUnusedLocals`/`noUnusedParameters`
true for `server/**`, false for `src/**`), which is why 8 of the 22 lint warnings are
`no-unused-vars`.

## 10.4 L10-03 — No CI; every gate is a human remembering to run it (P2, confirmed)

There is no `.github/`, no CI config, no git hooks, no `verify` script. The four commands that make
up the real gate (`tsc -b`, `test:run`, `lint`, `build`) are documented in prose
(`docs/AICTE-26262-IMPLEMENTATION.md:733-739`, `README.md:214`) but nothing runs them. The
repository's own isolation proof, `supabase/tests/rls.sql` — which is the only thing that
demonstrates audit immutability (L3-05) and cross-tenant isolation — **has no runner at all**:
it appears in the test-plan table (`:730`) but not in the `Run:` block, and no npm script invokes
`psql`. That is how a false "Done" for append-only audit survived a phase that shipped the test for it.

## 10.5 L10-04 — README/dev-loop inaccuracies (P2, confirmed)

| Location | Says | Reality |
|---|---|---|
| `README.md:18` | "Requirements: Node.js 20+ and npm" | `npm run server` is `node --experimental-strip-types` (Node ≥ 22.6, host has 24.16); `package.json` has **no `engines` field** to enforce or even document it |
| `README.md:91` | `docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build` | both files build `app` with `image: apoorvasetu:local`, so this rebuild **overwrites the demo image**; the demo↔postgres switch the README sells silently destroys the other build |
| `README.md:91` / `docs/POSTGRES-DATA-LAYER.md` | same command, no prerequisite list | `docker compose … up` fails at `npx prisma migrate deploy` with `P1012 … Environment variable not found: DIRECT_URL` when no `.env` exists (`raw/baseline-db-deploy-noenv.txt`) — correct behaviour, undocumented error |
| `docker-compose.postgres.yml:9-10` | hard-coded `DATABASE_URL`/`DIRECT_URL` | compose `environment:` **overrides** `env_file:`, so the documented Neon instruction "Set `DATABASE_URL` to the pooled URL" (`docs/POSTGRES-DATA-LAYER.md`, step 2) is silently ignored when the overlay is in play. A user following both docs ends up on the local container while believing they are on Neon |
| `README.md:104` | "Demo storage lives under `aicte_approval_system_data_v4_*`" | true for domain data, but audit lives under `apoorvasetu_audit_v4` and config under `apoorvaset_config_v1` (`src/services/repositories/localRepository.ts:17-31`) — a typo'd third namespace the doc never mentions (L2-04 is the functional version of this) |
| `docs/POSTGRES-DATA-LAYER.md:163` | "(the existing `CRON_SECRET` sweep endpoint) replaces this gate when it lands" | the endpoint is Vercel/Supabase-only and cannot write the Prisma tables (L2-01); it is not a drop-in replacement |

## 10.6 L10-05 — `package.json` hygiene (P3)

* `"prisma": { "seed": … }` (`package.json:22-24`) is **deprecated**: every `prisma` CLI invocation
  prints `warn The configuration property package.json#prisma is deprecated and will be removed in
  Prisma 7` (`raw/baseline-db-deploy-noenv.txt`). One-line move to `prisma.config.ts`.
* No `verify` script composing the four gates; no `typecheck` script (`tsc -b` only runs as part of
  `build`).
* `prisma` CLI in `dependencies` — justified (entrypoint migrations) but worth a comment, since it
  looks like a mistake and it is what pulls the only production advisory into the image (§11.1).
* `happy-dom` in `devDependencies`, unused (L2-09).

## 10.7 Lint posture

`oxlint`, 116 rules, **22 warnings / 0 errors** in 283 ms over 188 files (`raw/baseline-lint.txt`).
`.oxlintrc.json` escalates `react/rules-of-hooks` to error — good, and it means the hook-order
correctness claim is machine-checked. The warning distribution is informative:

| Rule | Count | Reading |
|---|---|---|
| `react(set-state-in-effect)` | 5 | all in `AppContext.tsx` (e.g. `:277`, `:391`) — cascading renders, matches L8-03 |
| `eslint(no-unused-vars)` | 9 | dead imports/state, incl. `regionalOffices`, `Card`, `NotificationItem`, `setPid`, `setDueDate` |
| `react(only-export-components)` | 3 | Fast Refresh broken in 3 files |
| `react(purity)` | 2 | `src/context/AppContext.tsx:396` — `Date.now()` and `Math.random()` called inside the render body (`showToast` id), the same impurity family as L2-02 |
| `react-hooks(exhaustive-deps)` | 2 | `useMemo` with unnecessary deps |
| `react(refs)` | 1 | ref access during render |

Because oxlint is not wired into CI and the exit code is 0, these warnings have no owner. Zero
errors is not the same as clean.

## 10.8 `.gitignore` (P3, confirmed)

`.gitignore` covers logs, `node_modules`, `dist`, `.env*`, editor dirs and the Hallmark capture
folders — but **not `coverage/`**, which `npm run test:coverage` writes. It is the first thing to
appear in `git status` after running the documented test gate
(`?? coverage/` was present at Stage 0; `coverage/` is, however, correctly listed in `.dockerignore`).

## 10.9 Environment and secrets posture (summary; detail in L4)

`.env.example` is annotated and complete; no `.env` in the tree; `COOKIE_SECURE` documented;
`SEED_FORCE` and `ALLOW_DEMO_RESET` default off ✔. The one credential that *is* committed is the
Postgres pair `apoorvasetu/apoorvasetu` in `docker-compose.postgres.yml:31-33` — acceptable for a
local container whose port is **not published** (`db` has no `ports:` mapping, so it is
host-internal ✔), but it must never be copy-pasted into a hosted compose file, and nothing in the
docs says so.

## 10.10 Fresh-clone test — **run** (rounds 14 and 14b)

Evidence: `evidence/curl/P_pass_c_round14_clone.sh` / `_output.txt` and
`P_pass_c_round14b_gen.sh` / `_output.txt`. Round 14 cloned `794e54c` into a directory that had never
seen a build and ran the documented commands in order, capturing every exit code; round 14b cloned
again into `%TEMP%` and root-caused the one command that failed. Both rounds left the audited
container alone (the closing `docker stats` + row counts in each transcript are identical to the
opening ones: `apps=10 docs=10 und=7 audit=149 sessions=113`).
One transcript artefact to read correctly: both rounds end with `rm: cannot remove … Device or
resource busy` / `clone deleted: FAILED`, because `kill $(cat server.pid)` under Git Bash does not
terminate the Windows `node.exe` child that still holds `node_modules`. The listener was identified by
command line (`node --experimental-strip-types server/index.ts`, PIDs 27428 and 23268), killed with
`taskkill /PID`, and both directories removed afterwards; `git status --porcelain` then showed exactly
one entry outside `docs/audit/` (`?? coverage/`, Stage 0's own test output), so nothing was left in the
repository and no scratch file is tracked.

| Step (clone of `794e54c`, 237 tracked files, no `dist/`, no `.env`) | Result |
|---|---|
| `git clone` | exit 0 — clone is clean, `HEAD` = parent `HEAD` |
| `npm ci --no-audit --no-fund` | **exit 0**, 367 packages in **79,236 ms**, `node_modules` 567 MB, 2 deprecation warnings (`node-domexception`, `glob@10.5.0`) |
| `npm run build` (`tsc -b && vite build`) | **exit 1 — 64 `error TS` lines** (`TS2305 TS2339 TS2694 TS7006 TS7053`) in 5,329 ms. `dist/` not produced |
| `npm run lint` | exit 0 — 22 warnings, 0 errors on 188 files |
| `npm run test:run` | exit 0 — 26 files, **232 tests passed**, 7.08 s |
| `PORT=8090 node --experimental-strip-types server/index.ts` (no `.env`) | boots, logs `dist/ not found - serving API only`; `/api/ready` **503**, `GET /` **404 139 B**, `GET /applications` **404**, `/api/snapshot` 503 |
| after `npx prisma generate` (exit 0, 1.00 s) + `npm run build` | **exit 0, 0 TS errors**, `dist/` 1,881 kB; `GET /` → **200 896 B**, `/applications` → 200 |

### L10-06 — the production build is not reproducible from a clean clone (P1, confirmed)

Root cause, isolated by round 14b step 2/4: after `npm ci` the Prisma client on disk is still the
**stub** — `node_modules/.prisma/client/index.d.ts` is **3,989 B** — because nothing generates it for
the host path (`package.json` has **no `postinstall` and no `prepare`** script; `@prisma/client`'s own
postinstall only lays down its default stub). `tsc -b` then fails on every import of a generated type
(`Module '"@prisma/client"' has no exported member 'User' / 'Session' / 'SystemAlert' …`) and the
implicit-`any` errors in `server/routes/*.ts` are downstream of the same missing types. Running
`npx prisma generate` takes **1.00 s**, replaces the stub with a **960,171 B** client, and the
identical `npm run build` then exits **0** with zero errors. Same commit, same `node_modules`, one
step added.

Why it is P1 and not P0: both paths a judge actually takes still work. `README.md:16-23` tells the
host user `npm run dev`, which is Vite (esbuild strips types and never type-checks), and
`Dockerfile:35` / `:44` run `npx prisma generate` inside the image before `npm run build`, so the
container is immune — which is exactly why Stage 0 measured a green build and this audit's own
four-command gate looked fine. What breaks is everything else: `npm run build` and `npm run preview`
on a fresh host clone, any CI that clones and builds (there is none — L10-03), and the audit gate
itself as a reproducibility claim. `npm run server` after a failed build is the worst user experience
of it: the process starts happily, prints one advisory line to stdout, and serves **404 for `/`**
(measured 404 139 B vs 200 896 B once `dist/` exists) — a silently degraded boot rather than an error.
Fix (effort S): `"postinstall": "prisma generate"` in `package.json`, **or** one README line under
Quick start saying `npm run build` requires `npx prisma generate` first; plus fail fast in
`server/index.ts` when `VITE_DATA_MODE`-served `dist/` is missing. Note the interaction with
`--omit=dev` installs: `prisma` is in `dependencies`, so the generate step survives a production
install (see §11.1 of `00-baseline.md` — the same dependency-placement choice that pulls the only
production advisory into the image).

### L10-07 — README's API-404 promise holds only when a database is configured (P3, confirmed)

`README.md:53-54`: "Unknown `/api/*` paths return JSON 404". On the audited Postgres container that is
true — `GET /api/documents/:id/reject` returned `{"error":"NOT_FOUND","text":"Unknown API endpoint."}`
with **404** (round 6, P-38). On a DB-less demo boot the same path returns
**503 `{"error":"DATABASE_UNCONFIGURED",…}`** (round 14b step 6), because the readiness gate runs
ahead of the 404 handler. Consequence is small — a wrong status code and a wrong error body for a
typo'd path — but it is the reason a newcomer cannot distinguish "this route does not exist" from "no
database", and the sentence in the README should carry that condition. Effort S.

### 10.10.1 What the clone confirmed as clean, and one documentation gap

- `npm ci` from the committed lockfile works with **no** manual steps, is deterministic, and the test
  suite passes unchanged (232/232) — the lockfile is honest.
- Lint exits 0 with the same 22 warnings Stage 0 recorded, so the repo state did not drift.
- The built SPA from a clone carries `index-Cd-UkX3f.js` — the same chunk hash the audited container
  serves, so the shipped bundle is reproducible from source (L8 §8.9.3).
- SPA fallback (`/applications` → 200 once `dist/` exists) and `GEMINI_API_KEY`-absent warning path
  both behave as documented.
- **Not runnable as written**: `README.md:91`'s Postgres leg. `docker-compose.postgres.yml` publishes
  no host port for `db` (measured: 0 `ports:` occurrences under `db:`, and `docker port
  apoorvasetu-db-1` prints nothing), so a host-side `npm run db:migrate` / `db:studio` / `db:seed`
  against `localhost:5432` — which `docs/POSTGRES-DATA-LAYER.md:100-115` implies — has no listener.
  The migrations that *do* run are inside the container entrypoint, so this is a documentation gap,
  not a broken migration (it is recorded as part of L10-04's inaccuracies rather than a new id).
- The Node-20 claim stays **unmeasured**: this host has only Node 24.16.0, `package.json` declares no
  `engines` field and nothing in `server/` reads `process.versions`, so README:17 "Node.js 20+" is
  unenforced and the `--experimental-strip-types` failure on 20.x is inferred from the flag. Round 14
  §7 says this explicitly so nobody quotes the clone as having reproduced it.
