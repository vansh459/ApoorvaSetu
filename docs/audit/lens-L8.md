# Lens L8 — Performance and resources

Proven from build output, source and one `docker stats` sample at Stage 0
(`evidence/raw/baseline-build.txt`, `baseline-artifacts.txt`, `S23_bundle_hygiene.txt`,
`S27_render.txt`). Live measurements — cold start, soak, snapshot cost at inflated volume, `EXPLAIN`,
first-load transfer — ran in Pass C (rounds 7, 11, 12).

**Read §8.9 first.** It supersedes the *(Pass C)* placeholders in §8.2, §8.4, §8.5 and §8.6, promotes
two new confirmed findings (L8-07 compression, L8-08 SSE fan-out), downgrades the memory framing from
P2 to P3 hygiene, and withdraws the "five personas serialise on scrypt" severity.

## 8.1 Bundle: one chunk, no split points (P2, confirmed)

```
dist/assets/index-Cd-UkX3f.js   1,268,336 B raw / 340,596 B gzip
dist/assets/index-C_JiYy3N.css     54,210 B raw /  10,363 B gzip
dist/index.html                      896 B raw /     486 B gzip
```

Vite's own reporter warns `(!) Some chunks are larger than 500 kB after minification`
(`baseline-build.txt`). Cause is structural, not incidental:

| Fact | Evidence |
|---|---|
| 0 route-level `lazy()` calls in `src/App.tsx`, 32 static imports | `S23_bundle_hygiene.txt` |
| All 26 pages, all modals, all dashboards therefore in the entry chunk | `baseline-inventory.txt` |
| `recharts` (one import site, but eager) + `lucide-react` used in 55 files | `S23_bundle_hygiene.txt` |
| Demo seed data ships in every mode: `src/data/initialData.ts` 37,650 B + `platformKnowledgeBase.ts` 23,110 B + `seedScenarios.ts` 6,364 B + `demoUsers.ts` 5,266 B ≈ **72 KB of source** imported unconditionally by `AppContext.tsx:27` | `ls -la src/data`, grep output |

A Postgres-mode user — whose data comes from `/api/snapshot` — still downloads the entire demo
dataset and every role's dashboard. 344 KB gzip is survivable on a LAN demo but is the first thing a
judge's dev-tools will show.

Cheapest slice of fix: `React.lazy` + `Suspense` on the route table (26 entry points, one file
touched), and gate `src/data/initialData.ts` behind `getDataMode() === 'demo'` with a dynamic import.

## 8.2 Static assets: 425 KB of design-reference images served to everyone (P2, confirmed)

`public/` ships `screenshots/dashboard.png` 200,420 B, `stat-cards-reference-full.png` 132,714 B,
`stat-cards-reference.png` 92,439 B — files that are design references, not product assets, plus
`aicte-banner.png` 34,310 B (`baseline-artifacts.txt`). The three reference PNGs total more than the
gzipped JS bundle and are fetched by whatever page references them. *(Pass B: confirm which routes
request them; if any is referenced from a live screen it is a visual-quality issue too.)*

## 8.3 Render cost: single root context, no memoisation anywhere (P2, confirmed)

| Metric | Value |
|---|---|
| `src/context/AppContext.tsx` | **2,355 lines**, 19 `useState`, **0 `useMemo`** (`S27_render.txt`) |
| `React.memo` / `memo(` across `src/` | **0 occurrences** |
| Files calling `useApp()` | 34 |

Every state change in the provider — including the 60-second sweep interval at
`AppContext.tsx:2102` and every SSE-triggered refetch — re-renders the whole consumer tree, and the
selectors that feed the dashboards (`src/workflow/selectors.ts`) recompute on each of those renders.
On a demo laptop this is invisible for a second; it is the reason a sweep tick can feel like a
flicker. Fix is mechanical: memoise the derived collections the pages read, or split the context
into data vs actions.

## 8.4 Server cost per request (P2, from L3-06)

`GET /api/snapshot` runs 13 queries and materialises whole tables (9 unbounded `findMany`), filters
in Node, and JSON-stringifies everything on **every** load and every SSE broadcast-triggered refresh.
That is the dominant server cost and the dominant memory risk on the 8 GB host. The
10×-seed-load measurement in Pass C decides whether this is P2 or P1.

## 8.5 Container footprint (baseline, one sample)

| Measurement | Value |
|---|---|
| `docker stats` demo app, idle | **65.89 MiB / 3.505 GiB (1.84 %)**, CPU 0.00 % |
| Image size | 1.07 GB (`apoorvasetu:local`) — two identical-size tags exist |
| `docker-compose.yml` memory limits | **none set** for `app`; none for `db` in the overlay |

Idle RSS of 66 MB is genuinely good. But with no `mem_limit`/`deploy.resources.limits` anywhere and
Postgres + Node sharing an 8 GB host, the "8 GB machine" constraint in the audit brief is protected
only by luck. Recorded again in L10.

The 1.07 GB image is mostly Node 24 + `npm ci --omit=dev` including the `prisma` CLI (needed at
runtime by `server/entrypoint.sh` for `migrate deploy`, so this one is justified) and
`@google/genai` + `@supabase/supabase-js` (the latter unused in the Postgres path — trim candidate).

## 8.6 Startup and slow paths *(Pass C)*

Cold start (container up → `/api/ready` 200), per-route timings for `/api/snapshot`,
`/api/auth/login` (scrypt cost is CPU-bound: `server/password.ts` uses `scryptSync`, which blocks
the event loop — measured in Pass C), and a 10-minute soak with `docker stats` sampling are scheduled
against the Postgres overlay. `EXPLAIN` on the ten heaviest query shapes goes with them.

One static note on login cost: `scryptSync` (`server/password.ts:10`) is synchronous. Each sign-in
freezes the single Node process for the duration of the KDF, so the demo's "five personas in five
tabs" moment serialises. Flagged here; measured in Pass C before assigning severity.

## 8.7 What is already fast

`express.static` with `Cache-Control: public, max-age=31536000, immutable` on hashed assets
(`index.ts:210-212`); ETag on everything else; `init: true` + `restart: unless-stopped`; SSE instead
of polling (`server/events.ts`); file downloads marked `private, no-store` so documents never sit in
a shared cache (`files.ts:211`); 13 queries issued in parallel rather than sequentially.

## 8.8 Finding ids for this lens (the static half shipped without them)

L8-01 = §8.1 bundle, L8-02 = §8.2 static assets, L8-03 = §8.3 render cost, L8-04 = §8.4 server cost
per request, L8-05 = §8.5 container footprint, L8-06 = §8.6 startup and login cost, L8-07/L8-08 = new,
confirmed by Pass C (§8.9.2, §8.9.5). Referenced elsewhere as L8-03/L8-04 already.

## 8.9 Pass C reconciliation — the live numbers §8.4 and §8.6 owed

Evidence: `evidence/curl/P_pass_c_round7_output.txt` (P-43 index inventory + `EXPLAIN` at seed, P-43b
the same plans at ~200× volume, P-44 soak, P-45 per-persona payload),
`evidence/curl/P_pass_c_round11_output.txt` (P-55 login cost, P-56/P-57 restart),
`evidence/curl/P_pass_c_round12_output.txt` (P-61 second restart). §8.9.2 and the first-load asset
figures were measured directly on `:8081` after round 12 with
`curl -D - -H 'Accept-Encoding: gzip, br'` per resource.

### 8.9.1 L8-04 — snapshot cost: stays P2, but the cause is Node, not the database

| Volume | superadmin | institute |
|---|---|---|
| seed (10 apps / 14 docs / 7 users / 76 audit) | 77.5 KB, **mean 161 ms** over 30 sequential (`4838 ms`) | 6.9 KB |
| ~200× (2010 apps / 2814 docs / 1407 users / 4636 audit) | **5,018,221 B in 1024–1285 ms** (5 runs) | **642,694 B in 518–980 ms** |

The Postgres side is not the problem and the index inventory is a strength: 16 tables, every FK,
`region`, `status`, `stage`, `dueDate`/`expiryDate`, `tokenHash`, `dedupeKey` and
`entityType+entityId` pair indexed (`round7:26-41`); at seed volume all twelve snapshot reads execute
in ≤ 0.695 ms, and at 200× the worst is the `users` sort at 5.675 ms — the audit feed correctly uses
`Index Scan Backward using audit_logs_pkey … Execution Time: 0.421 ms`. So ~1.1 s per 5 MB is object
materialisation from 13 unbounded `findMany` + `JSON.stringify` of the whole payload (`data.ts:486`),
plus §8.9.2's missing compression on the way out.

The tenant does not share the cost saving: `data.ts:486` reads the entire `applications` table and
`filterApplicationsForUser` runs in JS (`round7:138` — the app never issues the `WHERE` that the
region plan would use), so the server does identical work for a superadmin and for an institute that
only sees 1 row. That is why the institute payload at 200× is still 642 KB: the filter shrinks the
response, not the read.

Fix, in the order the numbers support it: per-entity `select`/`take` (pagination for `audit_logs`,
which L3-04 already needs), then persona-shaped columns, then — only then — anything planner-side.
`mem_limit` and indexes are not this finding.

### 8.9.2 L8-07 (new, P2, confirmed) — nothing compresses the response

First load of the SPA on the Postgres overlay, each request sent with
`Accept-Encoding: gzip, br`, every response returning **no `Content-Encoding`**:

| Resource | Bytes on the wire |
|---|---|
| `/assets/index-BcxMUUtC.js` | 1,268,340 |
| `/assets/index-BPZa8P-O.css` | 53,684 |
| `/fonts/manrope-latin.woff2` | 24,532 |
| `/apoorvasetu-icon.png` | 8,854 |
| `/` (index.html) | 896 |
| **total shell** | **1,356,306 B ≈ 1.29 MiB** |

The same files gzip to 340,596 + 10,363 + 486 B (§8.1), so the shell is **3.86× larger than it needs
to be** on the first paint of every demo. Cause is structural: `compression` is absent from
`dependencies` (`@google/genai, @prisma/client, @supabase/supabase-js, cors, dotenv, express, lucide-react, prisma, react, react-dom, react-router-dom, recharts`) and
`server/index.ts:206` serves `dist` with plain `express.static`. Two consequences for the fix: the
asset responses currently carry only `Vary: Origin` (from `cors`), so any compression middleware must
also emit `Vary: Accept-Encoding` or a shared cache can serve the wrong representation; and it must
not be applied ahead of the `private, no-store` download route (`files.ts:211`).

Measured on `:8081` only — the demo container was stopped for rounds 11–12 (`docker ps` shows
`apoorvasetu-audit-pg` + `apoorvasetu-db-1`) — but both profiles run the same `server/index.ts`, so
`:8080` behaves the same; that half is inferred, not measured.

### 8.9.3 L8-01 — shipped bundle vs the bundle §8.1 measured

The image and the local `dist/` are the same tree but different builds
(`index-BcxMUUtC.js` 1,268,340 B vs `index-Cd-UkX3f.js` 1,268,336 B;
`index-BPZa8P-O.css` 53,684 B vs `index-C_JiYy3N.css` 54,210 B). Nothing hinges on the 4-byte and
526-byte deltas — Vite's chunk hash is in the filename, not the file — but the report should quote
the wire numbers, because those are what a judge's dev-tools show. 0 route-level `lazy()` calls,
32 static imports and Vite's own `(!) Some chunks are larger than 500 kB after minification` stand as
written.

### 8.9.4 L8-02 — the Pass B question is answered, and the answer is the worse branch

`public/screenshots/dashboard.png` (200,420 B) **is** requested, by
`src/pages/auth/Login.tsx:184`, wrapped in `hidden … lg:block` with `loading="lazy"`. So at ≥ 1024 px
— the demo-projector width — the login screen, which is the first page every viewer loads, pulls a
200 KB design-reference PNG as product UI; below `lg` the lazy image is not fetched. It is
simultaneously a transfer issue and a visual-quality one (a screenshot of an earlier design is now a
selling point on the sign-in fold).

The unreferenced half of `public/` is bigger than §8.2 guessed. Files with **0 occurrences** anywhere
in `src/` or `index.html`:

```
stat-cards-reference-full.png 132,714   aicte-banner.png          34,310
stat-cards-reference.png       92,439   aicte-logo.png            17,159
favicon.svg                     9,522   apoorvasetu-full.png      21,710
icons.svg                       5,055   apoorvasetu-logo.svg         875
= 313,784 B of 322,665 B of top-level public/ files
```

(`apoorvasetu-icon.png` and the two `manrope` woff2 are the only referenced ones.) Vite copies all of
them into `dist/` and `express.static` serves them, so the dead weight is in the image and on the
disk regardless of who asks. Fix is `git rm` + a decision on the login panel; anything touching that
panel's look goes through the Hallmark skill, per the project rule.

### 8.9.5 L8-03 — the render finding survives; the SSE finding gets a defect and a strength

Idle SSE cost is genuinely cheap: one held listener over 240 s of silence produced 23 stream lines —
`: keepalive` comments on `KEEPALIVE_MS = 25_000` (`server/events.ts:17,38-40`) — and exactly **1**
event, the initial `event: ready / data: {"rev":445}`, i.e. no refetch storm. The 500 ms trailing
debounce in `AppContext.tsx:323-326` also works as designed: one burst of row changes became one
refresh.

**L8-08 (new, P2, confirmed by source + the round 7 stream):** the change signal is table-blind on
both ends. `postgresRepository.subscribe(_table, callback)` discards its first argument
(`:268`) and multiplexes every table onto one `EventSource` (`:271-277`), so a single `change` frame
fires every entry of `REMOTE_SYNC_TABLES` (`AppContext.tsx:74`); all of them call the same
`scheduleRefresh`, which bumps `remoteRevision` and re-runs `loadRemoteData()` — a **full**
`/api/snapshot`, 77.5 KB at seed and 5 MB at 200×, per open tab, for one notification insert. Worse,
the frames carry no `id:` field (`server/events.ts:35,53`), so `EventSource`'s `Last-Event-ID` replay
has nothing to ask for, and the client never reads the `rev` it is sent. A tab that is backgrounded
through a broadcast (or reconnects across one) stays stale until the next unrelated change or a manual
refresh — the same silent-staleness family as L3-04's truncated feed, and it is why the `rev` counter
being in-memory (`revision = 0` at `:20`, reset by `:59`) is not a bug today: nobody consumes it.
Fix: pass the table set through, and either use it or stop sending it.

### 8.9.6 L8-05 — leak framing withdrawn; the limit claim needs a correction

The soak is flat: 518.1 → 518.3 → 518.6 → 518.5 → 518.1 MiB across 240 s with one listener and 65
sessions. No trend, so **the "dominant memory risk" wording in §8.4/§8.5 is withdrawn as unsupported**.
What is real: the 518 MiB high-water was created by the 200× volume test plus 30 sequential and 20
concurrent snapshots, and it was never returned — the *same container* idles at **83.9 MiB** (round 11
P-56) and **99.9 MiB** (round 12 P-61) after a restart. Node keeps what it grabbed for the rest of the
session.

Correction to §8.5's "no memory limits … anywhere": compose really has no `mem_limit` /
`deploy.resources`, but `Dockerfile:28` sets `NODE_OPTIONS=--max-old-space-size=2048`. The cap exists
and is the wrong number: the `docker stats` denominator is **3.505 GiB** — the WSL VM, not the 8 GB
host — so a Node heap allowed to reach 2 GiB is ~57 % of the machine the container can see, with
Postgres' own buffers on top. Failure mode is the VM evicting the database's page cache, not a tidy
OOM-kill of one process. That makes the one-line `mem_limit` a **P3 hygiene** item for the right
reason (noisy-neighbour protection on the stated 8 GB constraint), not the P2 "memory risk" §8.4
sketched. Also unchanged: image 1.07 GB, `@supabase/supabase-js` unused by the Postgres path.

### 8.9.7 L8-06 — startup and login cost, decided

| Measurement | Value |
|---|---|
| `/api/ready` 200 after `docker restart` of the app | **9,975 ms** (round 11), **5,071 ms** (round 12) |
| Single sign-in, HTTP time | 0.214 / 0.255 / 0.396 s |
| 8 sequential sign-ins | 1,348 ms (≈168 ms each) |
| 8 concurrent / 16 concurrent (same email each batch) | **692 ms / 1,348 ms** |
| Marginal capacity | ≈ 85 ms per sign-in ⇒ ~12 logins/s, no gain past it |
| right / wrong / unknown user | 0.120 / 0.132 / 0.098 s — no enumeration timing leak |
| Seed guard across restart | `SEED_ON_START=1` did **not** duplicate: 10 distinct app ids (`prisma/seed.ts:8` counts users first) — strength |
| Rows after both restarts | apps=10 users=5, audit 140 → 142 (only legitimate login rows), sessions 104 → 106 |

16 concurrent taking exactly 2× 8 concurrent is the signature of one serialised resource and is
consistent with `scryptSync` (`server/password.ts:10`) blocking the event loop. But the §8.6 worry is
**immaterial at demo scale**: five personas in five tabs is ~0.85 s of serialised KDF, so
`scryptSync` → async `scrypt` stays **P3** and the report must not inflate it. The throughput ceiling
(~12 logins/s) only matters if the demo does a scripted load test — nothing in the brief asks for one.
The `X-Forwarded-For`-keyed limiter (round 12 P-59: rotating header ⇒ ten consecutive 401s, cap never
reached) is an **authorization/abuse** finding and lives in L4 §4.16; it is not filed here so it does
not get counted twice.

### 8.9.8 Final L8 severities

| id | title | severity | confidence |
|---|---|---|---|
| L8-01 | one 1.27 MB entry chunk, no `lazy()` | P2 | confirmed |
| L8-02 | 313,784 B of `public/` unreferenced + 200 KB design PNG on the login fold | P2 | confirmed |
| L8-03 | 2,355-line root context, 0 `useMemo`, 0 `React.memo`, 34 consumers | P2 | confirmed (static) |
| L8-04 | `/api/snapshot` = 13 unbounded reads, materialised and stringified per request; 5 MB / 1.0–1.3 s at 200× | P2 | confirmed (measured) |
| L8-05 | no compose `mem_limit` while `NODE_OPTIONS=--max-old-space-size=2048` exceeds the 3.5 GiB VM share | P3 | confirmed (was P2 "risk") |
| L8-06 | `scryptSync` serialises sign-ins at ~85 ms each | P3 | confirmed (measured) |
| L8-07 | no response compression: 1,356,306 B shell where ~351 KB suffices | P2 | confirmed (measured) |
| L8-08 | table-blind SSE fan-out, no `id:` on frames, `rev` published and never consumed | P2 | confirmed |

Proposed lens score **6/10** — complete index inventory, flat soak, debounced refresh, `no-store`
downloads and immutable hashed assets are real engineering; the score is held down by L8-07 (a
one-dependency fix nobody took), L8-04's tenant-blind reads, L8-02's dead weight and L8-08's
half-wired realtime layer. Final score is set in L1 / `AUDIT_REPORT.md`.

### 8.9.9 Not run

True first boot (fresh DB volume, `compose up`) — only `docker restart` of a warm stack was timed;
the demo profile's cold start and its compression behaviour (container stopped for rounds 11–12);
exactly-10× seed volume (round 7 inflated ~200× instead, so this lens has seed and 200× but no 10×
point); Vite dev-server timings; browser-side first-contentful-paint or TTFB (no usable browser
surface after the `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE` event recorded in L5 §5.3 — every number here
is `curl`- or `psql`-measured); a sustained multi-minute soak (240 s is the whole observation window);
`PRIO`-style concurrent snapshot load across *different* personas at once.
