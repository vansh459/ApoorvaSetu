# Lens L4 — Security, identity and authority boundary (static half)

Scope of this file: how a caller is authenticated, what that caller is allowed to do, what the
browser is trusted with, and what the transport exposes. It covers the two auth systems that exist
in this repo (the real server session and the in-browser `authService`), the authorization matrix
on the write API, the secrets that ship in the bundle, response headers, CORS/CSRF, the upload and
download path, and the assistant surface.

Probes S-22, S-24, S-28, S-29, S-30, S-31, S-34, S-37 in `evidence/raw/`; the live header and CORS
transcripts were taken against the running demo container (`apoorvasetu:local`, `:8080`, healthy)
on 2026-11-01. The Postgres-overlay confirmations ran as Pass C rounds 1-9b and are reconciled in
§4.16, which supersedes the §4.13 table wherever they disagree. No external service was contacted —
the Supabase tenant in §4.11 was read from source only.

---

## 4.1 The real authentication path is good, and worth saying out loud

`server/session.ts` + `server/routes/auth.ts` + `server/password.ts` are a competent implementation
and most of what a security reviewer worries about is already handled:

* 32 random bytes per session token (`session.ts:37` `createSessionToken` → `randomBytes(32)`),
  stored **only** as a sha256 lookup hash (`session.ts:31`), so a database dump does not yield
  usable cookies;
* `HttpOnly`, `SameSite=Lax`, `Path=/`, explicit expiry (`session.ts:48-56,84`);
* scrypt password hashes with a per-user 16-byte salt and `timingSafeEqual` comparison
  (`password.ts:8-25`), plus a `DUMMY_PASSWORD_HASH` so an unknown email costs the same time as a
  wrong password (`auth.ts:29,65`) — that is user-enumeration defence done properly;
* `resolveSession` re-checks `revokedAt`, `expiresAt` **and** `user.isActive` on every request
  (`session.ts:141-142`), so deactivation is immediate, and the user row (with `permissions`) is
  loaded fresh — a permission change takes effect on the next request, not the next login;
* login throttling per `ip:email`, 8 attempts / 15 min, with `Retry-After` (`auth.ts:51-60`,
  `rateLimit.ts:23-36`) and a failure audit row with the real client IP (`auth.ts:67-78`);
* logout revokes the session row (`auth.ts:160-164`).

Everything below is the part that is *not* like that.

---

## 4.2 L4-01 — A "server-side signing secret" is compiled into the public bundle (P1, confirmed)

`src/services/authService.ts:27-28`:

```
// Server-side secret key for HMAC token signing (tamper resistance)
const SERVER_SIGNING_SECRET = 'apoorvasetu_sih2026_production_hmac_secret_key_84920';
```

`grep -c` finds the literal string **once** in the built SPA
(`dist/assets/index-Cd-UkX3f.js`) and **once** in the 1,268,336-byte bundle the container actually
serves (`/app/dist/assets/index-Coh4Rwc6.js`) — `evidence/raw/S22_secret_in_bundle.txt` and
`evidence/raw/S22b_served_bundle_greps.txt`, which also confirms `lazy(` → 0 in both. It is not
tree-shaken away, because ten UI modules import
`authService` statically (`ProtectedRoute.tsx:4`, every role dashboard, `CaseSummaryDrawer.tsx:12`,
…) and there is no route-level code splitting (S-23: 0 `lazy()`).

Three things follow, in ascending order of seriousness:

1. **The name and the comment are false.** There is no server-side consumer:
   `grep -rn "SERVER_SIGNING_SECRET|computeHMAC|apoorvasetu_session_token" server/` returns nothing
   (`evidence/raw/S37_hmac_server_consumers.txt`). The cookie this module sets
   (`apoorvasetu_session_token`) is never read by the API, which uses `apoorvasetu_sid`
   (`session.ts:10`). So this is a client-side self-check whose secret is visible to the client.
2. **The primitive is not HMAC.** `computeHMAC` (`authService.ts:50-67`) is a DJB2-style pair of
   32-bit rolling hashes over `secret::$::data::$::secret`, rendered to hex — it is not
   `crypto.createHmac('sha256', …)`, has no SHA-2 construction, and a length-extension-style or
   collision attack is not even the problem: the secret is in the same file as the verifier.
   `generateToken` (`:195-203`) therefore provides no tamper resistance that an attacker with DevTools
   does not already have — they can call `authService` itself.
3. **It is presented as security in the product.** `verifyToken` (`:204-218`) is the gate behind
   `validateSession` → `authorizeAction`, which is labelled *"Backend Authorization Middleware"*
   (`authService.ts:529-533`) and writes `SECURITY_ACCESS_DENIED` (`:555`) /
   `SECURITY_JURISDICTION_VIOLATION` (`:573`) audit rows — into `localStorage` under
   `apoorvasetu_audit_v1` (`auditService.ts:7`, see L2-04). In demo mode that whole chain *is* the
   authorization layer.

Why P1 and not P0: the secret grants nothing today. Demo mode has no server to fool (all `/api/data`
routes return 503 without a database, `session.ts:157-159`), and in Postgres/Supabase mode the
server ignores this token entirely. It becomes a P0 the moment anyone wires it up — which is exactly
what the comment invites. The same file also embeds `password === DEMO_PASSWORD` as the *only*
credential check (`:258`), i.e. demo "authentication" accepts one shared password for all five roles.

Fix: delete `SERVER_SIGNING_SECRET`, `computeHMAC`, `generateToken`, `verifyToken`, `setCookie` and
the fake "backend middleware" from the client module, or move them behind an explicit
`isDemoMode()` guard with a comment stating they are UX state, not security. Effort S. Do not
"rotate the secret" — a secret in a browser bundle is not rotatable.

## 4.3 L4-02 — The API creates accounts whose password is the string printed on the login page (P1, confirmed)

`server/routes/admin.ts:112`:

```ts
const password = optionalString(body.password, 'password', 200) ?? DEMO_PASSWORD;
…
passwordHash: hashPassword(password)   // :136
```

`DEMO_PASSWORD` is imported from the *seed data* module (`admin.ts:19` ← `src/data/demoUsers.ts:5`
= `'Apoorva@2026'`) and it is (a) in the shipped bundle twice (`S34_credentials_and_tenant.txt`),
(b) rendered on the login screen for evaluators (`Login.tsx:299`, `:357`) and (c) auto-filled into
the password field on demo-account click (`Login.tsx:128`). So `POST /api/admin/users` without a
`password` key — which the type of the body does not require — produces a live Postgres account
authenticated by a globally known, never-rotating constant. Contrast the update route, which *does*
validate: `admin.ts:192-194` requires `min: 8` on an explicit password.

Trigger requires `users.create`, so this is not anonymous account takeover; it is a foot-gun that
puts a known-credential account inside a real dataset, with no first-login change requirement
(there is no self-service password endpoint at all). In a demo where the evaluator creates a
"regional officer for the presentation", that officer's credentials are the ones on the login page.

Fix: drop the `?? DEMO_PASSWORD` default, require `password` with `min: 8`, and keep
`DEMO_PASSWORD` out of any module the server imports (put it in `src/data/demoUsers.ts` only if the
seed path genuinely needs it — it does, so gate the admin route instead). Effort S. Confirmed live in
Pass C, round 3, P-06 — and note the endpoint is `POST /api/users`, not `/api/admin/users`; see §4.16.1.

## 4.4 L4-03 — The operational objects have no permission gate, and "present" scope lets an unscoped row be written by anyone signed in (P1, confirmed static)

`saveHandler` short-circuits authorization when a spec declares no permissions
(`server/routes/data.ts:118-120`):

```ts
const user =
  spec.permissions.length > 0 ? assertAnyPermission(req, spec.permissions) : requireUser(req);
```

Three specs do exactly that — `notificationSpec` (`:351`), `alertSpec` (`:382`), `escalationSpec`
(`:405`) — while the other regulated objects all name permissions (`:154`, `:210`, `:229`, `:268`,
`:303`). `requireUser` (`scope.ts:11-14`) checks only that a session exists. So **INSTITUTION_ADMIN,
EVC_MEMBER and REGIONAL_OFFICER can all create, rewrite and resolve alerts and notifications**.

Scope is the only remaining barrier, and for the two broadcast-style specs it is deliberately weak:
`scopeMode: 'present'` routes to `assertPresentScope` (`scope.ts:84-92`), which skips a check
entirely when the field is `null`. A notification with `targetRegion: null, targetInstituteId: null`
— i.e. a *system-wide* notice — passes for every role. Concretely, an institution account can `PUT
/api/data/notifications/…` a platform-wide notice into the central queue, or `POST` one that every
role's snapshot returns, with no `compliance.*` or `system.*` permission and no audit row (L3-01).

Related, same object family: `raisedBy` on an escalation is taken from the session *except* when the
client supplies the sentinel — `data.ts:423` `raisedBy: escalation.raisedBy === AUTOMATED_RAISER ?
AUTOMATED_RAISER : user.name`, where `AUTOMATED_RAISER = 'Automated SLA Monitor'`
(`src/workflow/alerts.ts:61`, exported to the browser). Any authenticated user may therefore sign
an escalation as *machine-generated*, which is precisely the distinction the human-authority
invariant depends on. Severity P1 on the strength of the authority rule, not the data risk.

Fix: give the three specs real permissions (`alerts.manage`, `notifications.publish`,
`escalations.resolve` — all exist in `Permission`), keep `requireUser` only where the record is
genuinely self-scoped, and make `assertPresentScope` require a central role when *both* jurisdiction
fields are null. Never accept `AUTOMATED_RAISER` from a body; set it only in the scheduler that this
audit has not found (L2-01). Effort M.

## 4.5 L4-04 — No security response headers anywhere (P2, confirmed)

`evidence/raw/S28_live_headers_demo.txt` is a full `curl -i` of `/`, `/api/health` and
`/api/assistant/status` from the running container. The complete set of headers the app emits is
`Vary`, `Access-Control-*`, `Accept-Ranges`, `Cache-Control`, `ETag`, `Content-Type`,
`Content-Length`, `Date`, `Connection`, `Keep-Alive`. Grep over `server/`, `index.html` and
`Dockerfile` for `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Strict-Transport-Security` → **no matches**
(`S28b_header_inventory.txt`); only `X-Content-Type-Options: nosniff` on file downloads
(`files.ts:210`) and `X-Accel-Buffering` on SSE (`events.ts:27-31`) are set.

Consequences ranked by likelihood in this app: no CSP means the un-minified inline `index.html` plus
any stored XSS becomes full session theft — the XSS surface itself is clean today (S-24: zero
`dangerouslySetInnerHTML`, `innerHTML`, `eval`), but the AI assistant renders model text and
`actionLinks` come from a server-side static KB, so the trust is one refactor away. No
`X-Frame-Options`/`frame-ancestors` means the login form and every approval action can be framed —
for a system whose whole purpose is an accountable approve/reject click, that is the finding. No
`Strict-Transport-Security` matters only once TLS exists, but combined with `COOKIE_SECURE=0`
default (`session.ts:45-47`) a deployment that forgets the env var ships the session cookie over
plain HTTP.

Fix: one `app.use` in `server/index.ts` after `cors` setting `Content-Security-Policy`
(`default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'` + the two
`https://fonts…` sources the Hallmark design actually uses), `X-Frame-Options: DENY`,
`Referrer-Policy: same-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`,
and default `COOKIE_SECURE` to on unless `NODE_ENV=development`. Effort S. Measured on `:8081` in Pass C:
**none** of the five headers are present on either the SPA document or an API response — §4.16.3. The
iframe test was not run (not-run list in `00-baseline.md`).

## 4.6 L4-05 — With no allowlist configured, CORS grants any localhost port credentialed read **and** the write-origin guard passes (P2, confirmed)

`.env.example:54` ships `AI_ALLOWED_ORIGINS=` empty and nothing sets `APP_ORIGIN`. `allowedOrigins()`
(`authGuard.ts:163-170`) filters empties, so the list is `[]`, and `originAllowed` (`aiGuard.ts:115-120`)
falls through to `if (allowedOrigins.length > 0) return false;` → instead it applies
`/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/`.

Live proof against the container (`S29_cors_reflection.txt`):

```
Origin: http://localhost:9999   → Access-Control-Allow-Origin: http://localhost:9999
                                   Access-Control-Allow-Credentials: true
Origin: https://evil.example    → (no Access-Control-Allow-Origin header)
OPTIONS … /api/admin/users with Allow-Request-Method: DELETE → 204, ACAO :9999, credentials true,
        Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
```

Why the `SameSite=Lax` cookie does not save this: site is *scheme + registrable host*, ports are
ignored, so `http://localhost:9999` and `http://localhost:8080` are **same-site** — the browser sends
`apoorvasetu_sid`. The same function backs the state-changing origin guard (`index.ts:49-62`), so a
page on any other local port can both read `/api/snapshot` and `PUT` regulated rows. The realistic
vector is an evaluator or developer with another project's dev server running, or any downloaded
sample app they `npm start`. Not remote-exploitable: a public page fails both the regex and (for a
non-localhost site) Lax.

Fix: ship a default deny — if the allowlist is empty, allow *only* the exact request `Host` origin
(`http://localhost:${PORT}` and `http://127.0.0.1:${PORT}`), and set `APP_ORIGIN` in
`docker-compose.yml` so the documented local run is explicit. Effort S.

## 4.7 L4-06 — CSV exports have no formula-injection guard (P2, confirmed static)

`escapeCsvValue` (`src/utils/csv.ts:8-10`) quotes and doubles `"` — which is correct *CSV* quoting —
and nothing else. `buildCsv` (`:13-19`) prepends a BOM and joins. There is no leading-`=`, `+`, `-`,
`@`, tab or CR filtering anywhere (grep in `S31_csv_and_limiter.txt` → `NO FORMULA GUARD`).

Callers are `src/pages/Reports.tsx:120` and `src/components/modals/GenerateReportModal.tsx:65`, i.e.
the compliance/pendency reports a regulator exports and opens in Excel. The cell values are
report-table fields built from user-entered strings — institution name, applicant name, undertaking
text, document titles, audit `details`. `=HYPERLINK("http://…","See annexure")` or
`=cmd|' /C calc'!A0`-class payloads therefore execute in the recipient's spreadsheet. This is a
classic second-order attack and it targets exactly the person the product is built for.

Fix: in `escapeCsvValue`, prefix `'` (or wrap in quotes and prepend a space) when the string starts
with `= + - @ \t \r`; add one vitest case per prefix — `src/utils/csv.test.ts` already holds six
cases, so this is a 10-line change. Effort S.

## 4.8 L4-07 — The assistant is unauthenticated in demo mode and discloses its configuration to anyone (P2, confirmed)

* `GET /api/assistant/status` (`index.ts:112-119`) is mounted before any auth and answers
  `{"isConfigured":false,"provider":"gemini","model":"gemini-3-flash-preview"}` to an anonymous
  caller — captured live in `S28_live_headers_demo.txt`. It leaks provider/model and whether a key
  is present; low impact, but it is the only endpoint with no gate at all.
* `POST /api/assistant/chat` (`index.ts:122-190`) calls `verifyCaller`, which in the absence of both
  Supabase config and a database returns `{ ok: true, caller: { userId: 'demo-guest', role: 'GUEST',
  mode: 'demo' } }` (`authGuard.ts:100-102`) — i.e. **anonymous access to a paid LLM** the moment a
  `GEMINI_API_KEY` is present. Rate limiting keys demo callers by client IP at 20/min
  (`aiGuard.ts:13-14`, `authGuard.ts:142-150`) and bodies are capped at 64 KB with 2 000 chars per
  message and 20 history items (`aiGuard.ts:12-18,33-70`), so the abuse cost is bounded credits, not
  CPU. `resolveDemoRole` (`:126-128`) lets the anonymous caller choose which role's system prompt
  framing it receives, from the closed set.
* The good news, recorded because it is a real control: model output cannot drive navigation by
  itself — `actionLinks` come from the static `src/data/platformKnowledgeBase.ts`, not from the
  model (verified while tracing `assistantService`), and there is no HTML sink (S-24). Prompt
  injection into `/api/assistant/chat` therefore has no authority to escalate to. Assistant history
  (`routes/assistant.ts`) is `requireSession`-gated (`:40`) and filtered by `userId` (`:44-48`).

Fix: put `requireSession`/`verifyCaller` in front of `/api/assistant/status` (or fold `isConfigured`
into `/api/health`, which is already public and already reports `database`/`storage`), and in demo
mode refuse the chat endpoint when a key is configured unless `ALLOW_DEMO_ASSISTANT=1`. Effort S.

## 4.9 L4-08 — Login throttle state is never evicted: an unbounded `Map` in a 32-bit-ish process (P2, confirmed static)

`server/rateLimit.ts:11` holds `const buckets = new Map<string, Bucket>()` keyed by
`${clientIp}:${email}` (`:19-21`). `recordLoginFailure` (`:39-47`) inserts on demand; expiry is
handled lazily by `resetAt <= now` in `checkLoginRate` (`:25-29`) but **nothing deletes the entry**,
and `clearLoginRate` (`:49-51`) only runs on a successful login. A cheap `POST /api/auth/login`
flood with random `email` values grows the map without bound — the same limiter also gates nothing
else. The contrast is instructive: the shared limiter in `src/services/aiGuard.ts:96-101` *does*
prune once `buckets.size > 5000`. On the host this audit runs on (8 GB, container RSS measured at
65.9 MiB in baseline §9) that is a slow leak rather than an incident, but the app is explicitly
marketed as an on-prem deployment for a government desk, where it runs for months.

Fix: reuse `createRateLimiter` from `aiGuard.ts` (it already takes `windowMs`/`max`/`now` and is
tested) instead of the second implementation here, or sweep expired keys on a timer. Effort S.
Pass C ran 80+ failed logins (round 1, P-14): `docker stats` 153.5 → 153.2 MiB, so no measurable growth
from buckets; `GET /api/health` exposes no RSS surface
(`{"status":"ok","service":…,"database":"connected","storage":"local","timestamp":…}`). §4.16.5 carries
the throttle findings that the probe did turn up.

## 4.10 L4-09 — Credential and role changes do not revoke live sessions (P2, confirmed static)

`admin.ts:192-194` overwrites `passwordHash`; `:176-181` overwrites `role` and re-derives
`permissions`; neither touches the `Session` table. The only revocation in the codebase is logout
(`auth.ts:160-164`). `resolveSession` (`session.ts:141-142`) checks `revokedAt`, `expiresAt` and
`isActive` — so a *deactivated* account is cut off, and a *re-role*d account gets its new
permissions immediately (the user row is re-read), but an account whose password was reset keeps any
already-issued 12-hour (or 30-day `rememberMe`) cookie valid. OWASP ASVS 3.3.3 / V6.1.
There is also no idle timeout: `lastUsedAt` is only written for the touch interval
(`session.ts:144-145`), never compared.

Fix: in the admin PUT, when `passwordHash` or `role` changed,
`prisma.session.deleteMany({ where: { userId, revokedAt: null } })` (or stamp `revokedAt`) and note
it in the audit `newState`; add a `Session.lastUsedAt`-based idle cap of e.g. 8 h for non-`rememberMe`
sessions. Effort S. Confirmed in Pass C, round 3, P-07: after a password reset the old cookie still
returns `GET /api/snapshot` = 200, while deactivating the account does revoke it (401) — the fix already
exists on the toggle path. §4.16.6.

## 4.11 L4-10 — A real external Supabase tenant is the compiled-in fallback URL (P2, confirmed static)

`src/services/supabaseClient.ts:3`:

```ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wnzbxgokbydjgnpkvucc.supabase.co';
```

The module is imported by five client services (`assistantService`, `dbService`,
`repositories/index`, `supabaseRepository`, `supabaseAuthService`) and there is no lazy loading
(S-23), so the tenant reference is in the shipped bundle — `grep -c "wnzbxgokbydjgnpkvucc"` → 1 in
the local build **and** 1 in the container-served bundle (`S34_credentials_and_tenant.txt`,
`S22b_served_bundle_greps.txt`). Two problems: a project identifier that belongs to someone is
committed to a repository that gets handed to judges and, apparently, pushed to a remote; and a
*silent* fallback — build supabase mode without `VITE_SUPABASE_URL` and the app talks to that tenant
instead of refusing to start, which is the opposite of "demo mode boots with an empty environment".
The anon key correctly comes from env (`:4`, with `isSupabaseConfigured` requiring length > 20 at
`:6-11`), so nothing usable is exposed — but `createClient` at `:13-15` still runs with
`'placeholder-anon-key'`, which means module load reaches for a network client even when unconfigured.

**Not probed.** Per the audit ground rules nothing was requested against that host; the finding is
from source only. *(Confirm with the owner whether the project ref is theirs — if it is, delete the
project or rotate; if it is not, the fix is the same.)*

Fix: `const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''` and construct the client lazily
inside `isSupabaseConfigured` checks. Effort S.

## 4.12 L4-11 through L4-15 — Smaller items, recorded so the clean list below is honest

* **L4-11 — SSE is a global channel** (`events.ts:19,51-55`, mounted at `index.ts:182-184` behind
  `requireSession`): frames carry only `{tables, rev}`, but *which* tables changed is visible to
  every signed-in role, including tables a role cannot read (e.g. `users`, `rolePermissions`,
  `auditLogs`). It is a low-grade activity oracle, and the client reacts by refetching the whole
  snapshot (L8-04), so a busy tenant amplifies load. No cap on `clients` size either — one session
  can hold many sockets with 25 s keepalives (`:17,38-40`), bounded in practice by session count.
  Fix: filter `broadcast` tables by role. P3.
* **L4-12 — Assistant history accepts client-chosen primary keys** (`routes/assistant.ts:30`
  `id: optionalString(message.id,'message.id',120) ?? randomUUID()`) inside a `deleteMany`+`createMany`
  transaction (`:72-84`). A duplicate id in one array, or an id already owned by another user, fails
  with P2002 → the global handler turns it into a 409 (`index.ts:236`). No cross-user write is
  possible (the `where` is `userId`-scoped), but one account can permanently occupy a UUID another
  account will try to reuse and break their save. Fix: always generate the id server-side. P3.
* **L4-13 — Session and audit metadata are fabricated in demo mode**: `authService.ts:300` hardcodes
  `ipAddress: '10.24.1.84'` into its in-browser session registry and `:781` stamps every client-side
  audit row as `'127.0.0.1'`, both of which are rendered in the active-sessions and audit UIs. The
  server path records the real IP (`auth.ts:78` `clientIp(req)`). Fictional provenance in a trail
  that is sold as tamper-evident is the kind of thing an evaluator reads as tampering. P3.
* **L4-14 — `COOKIE_SECURE` defaults to off** (`session.ts:45-47`) and is not set in
  `docker-compose.postgres.yml`, so any TLS deployment that forgets the variable sends an
  `HttpOnly` but non-`Secure` cookie. Fold into L4-04's fix. P3.
* Checked and **not** a finding: `/api/admin/reset` is double-gated — `role !== 'SUPER_ADMIN'` *and*
  the env kill switch `ALLOW_DEMO_RESET !== '1'` (`data.ts:614-617`). `SEED_ON_START` hygiene is
  L3-09.

## 4.13 What is clean, and should stay clean

Checked with a probe, not assumed:

| Area | Result | Evidence |
|---|---|---|
| SQL injection | No string SQL. Only `$queryRaw` is `SELECT 1`; zero `$queryRawUnsafe`/`$executeRaw*` | `S16_rawsql.txt` |
| XSS sinks | 0 `dangerouslySetInnerHTML`, 0 `innerHTML =`, 0 `eval(` in `src/` | `S24_xss.txt` |
| Password hash exposure | `toUser` (`mappers/admin.ts:73-93`) omits `passwordHash`; `passwordHash` appears in only 4 server sites, none a response | §S-33 transcript |
| Session token strength | `randomBytes(32)` base64url, sha256 lookup, `HttpOnly`, `SameSite=Lax` | `session.ts:10,31,37,48-56` |
| Password verification | scrypt + random salt + `timingSafeEqual` + dummy-hash timing parity | `password.ts:8-25`, `auth.ts:29,65` |
| CSRF | Global origin check on every non-GET (`index.ts:49-62`) **plus** `SameSite=Lax`; the 9 GET handlers (`index.ts:68,96,112,182`; `admin.ts:95`, `auth.ts:131`, `data.ts:465`, `assistant.ts:42`, `files.ts:191`) only read — the single write on a GET is the `lastUsedAt` touch (`session.ts:144-145`). `/api/admin/reset` is a POST | grep + read of 45 handlers |
| Upload integrity | `express.raw({limit: maxUploadBytes()})` at the route, real byte count re-checked after receipt, uploader-owned key check, key shape validated | `files.ts:48,161,181-183`, `storage/keys.ts:15-19` |
| Download authorization | `canRead(user, record.uploaderId, record.scope)` on both presign (`:149`) and direct read (`:202`); `nosniff` + `private, no-store` | `files.ts:40,149,202,209-211` |
| Error non-leakage | `errorHandler` maps `HttpError` to `{error, text}`; unknown errors → generic 500, stack never serialized | `server/http.ts`, L3 §3.11 |
| Privileged secrets in the bundle | `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `GEMINI_API_KEY` all appear only under `server/` and are read from `process.env` there; the only `import.meta.env` reads are `VITE_SUPABASE_URL`/`_ANON_KEY` | `S22`, §S-34 grep |
| Identity from the body | `verifyCaller` derives role/scope from the DB profile, never the body (`authGuard.ts:82-138`); server routes take the actor from `req.auth` (`scope.ts:11-14`) | read |
| DB port exposure | compose publishes only `APP_PORT`; Postgres has no `ports:` mapping in the overlay | baseline §10 |
| Model output → navigation | `actionLinks` are looked up in a static KB, not emitted by the model | `assistantService`, `platformKnowledgeBase.ts` |

## 4.14 Deferred to Pass B/C — the security claims this lens cannot close from source

| Probe | What it must show |
|---|---|
| P-05 | As `INSTITUTION_ADMIN`, `POST /api/data/alerts` with `region: null, instituteId: null` → expect 200 today (L4-03); after the fix, 403. Also `PUT` a central notification. |
| P-06 | `POST /api/admin/users` with no `password`, then `POST /api/auth/login` with `Apoorva@2026` → expect 200 today (L4-02). |
| P-07 | Log in → admin resets the password → replay the old `apoorvasetu_sid` → expect 200 today (L4-09). |
| P-09 | `POST /api/data/audit` with `source:'cron'` and a forged `action` → expect 200 and a row indistinguishable from a machine event (L3-01/L4-03). |
| P-12 | Escalation `POST` with `raisedBy:'Automated SLA Monitor'` → expect the literal to be stored against a human session (L4-03). |
| P-14 | 200 failed logins across random emails, then `docker stats` delta; confirm `Retry-After` and no bucket eviction (L4-08). |
| P-15 | Header set on `:8081` after the L4-04 fix; frame the app in an `<iframe>` locally and screenshot into `evidence/qa/`. |
| D-09 | Demo-mode UI: does any screen read like the client is authoritative (the "Official AICTE sign-in" chip, active-sessions IP table)? Screenshot with the DevTools Application tab open. |

## 4.15 Authority-boundary summary for the synthesis

The system has **one strong authentication layer and three weak authorization layers** that all fail
in the same direction — the caller decides what is recorded:

1. field-level authority is enforced for regulated *transitions* (`workflow.ts`) but bypassed by the
   generic write API (L3-01, L9-01);
2. object-level authority is missing entirely for alerts/notifications/escalations (L4-03);
3. provenance (`source`, `raisedBy`, `verifiedBy` in demo mode) is supplied by the caller rather than
   stamped by the server (L3-01, L4-03, L9-03).

That trio, not the leaked HMAC string, is what a security reviewer would call the actual risk in
this product: the audit trail is an accurate record of what the browser said, which for an
approvals system is not the same thing.

## 4.16 Pass C reconciliation (rounds 1-9b) — what ran, what was proved, what changed

Transcripts: `evidence/curl/P_pass_c_output.txt` (P-01…P-22), `…_round2_output.txt`,
`…_round3_output.txt`, `…_round4_output.txt`, `…_round5_output.txt`, `…_round6_output.txt`,
`…_round9_output.txt`, `…_round9b_output.txt`. §4.1-§4.15 is the static reading; where Pass C
disagrees, this section supersedes it.

### 4.16.1 L4-02 — confirmed end to end, with two citation corrections

Round 3, P-06. The endpoint is **`POST /api/users`**, not `POST /api/admin/users` as §4.3 and the
§4.14 table say — `adminRouter` is mounted at `/api` and its paths are `/users`, so round 1's probe
answered 404 `NOT_FOUND` and proved nothing. Re-run correctly:

* `POST /api/users {"name":"Probe Zero Password","email":"probe.nopass@…","role":"AICTE_ADMIN"}` with
  **no `password` key** → **201**; the row carries `scrypt$7bb8b5d2d0a…`, i.e. `admin.ts:112`
  substituted `DEMO_PASSWORD`.
* `POST /api/auth/login` with the constant printed on the login screen → **200**, and the session
  carries the full 19-permission `AICTE_ADMIN` set including `applications.approve` and
  `applications.reject`. Anyone who can read the login page can now sign in as a real administrator of
  the live dataset. Severity stays P1 (it needs `users.create` to plant) but the demo path makes it
  trivial: "create an officer for the presentation" is step one of the script.
* Control: an explicit `password:"Distinct@2026"` → a different hash, so scrypt and the per-user salt
  are fine; the flaw is the default. Distinct hashes across the table went 1-of-5 → 3-of-7, confirming
  §4.3's "every seeded account shares one hash".

### 4.16.2 L4-03 — confirmed, and each of the three weak layers now has a number

* `INSTITUTION_ADMIN` created a **national** alert (`ALRT-PROBE-05`, `region=NULL`,
  `instituteId=NULL`, `targetRoles:["SUPER_ADMIN"]`) → **201**. `EVC_MEMBER` created a
  `SUPER_ADMIN`-targeted notification → **201** (`data.ts` alert/notification/escalation specs declare
  `permissions: []`, `evidence/raw/S30_empty_permission_specs.txt`).
* Provenance is caller-chosen: `POST /api/audit` with `source:'cron'` and `action:APPLICATION_APPROVED`
  under an `INSTITUTION_ADMIN` session → **201**; the stored row is
  `LOG-MVY4ILYX-F7CA09|APPLICATION_APPROVED|AICTE/2026/12872|USR-INSTITUTE-ADMIN|INSTITUTION_ADMIN|cron`
  and is indistinguishable from a machine event. `previousState`/`newState` are plain strings ≤1000, so
  the "before/after" the docs advertise is whatever the caller asserts.
* `POST /api/escalations` with `raisedBy:"Automated SLA Monitor"` → stored **verbatim**
  (`ESCL-PROBE-12|Automated SLA Monitor|Northern|Open|40`). Read together with `data.ts:423`, the rule
  is: a human-looking `raisedBy` is replaced by the session identity, a *machine-sounding* one is not —
  which is the opposite of what the invariant needs. Escalation squatting on that same surface is in
  `lens-L3.md` §3.13.7.
* The one-way doors do not hold the other way: `documents`/`compliance`/`undertakings` block an
  *incoming* `Verified`/`Rejected` (403 `REGULATED_FIELD`, confirmed) but an `INSTITUTION_ADMIN` moved
  **its own already-Verified document back to `Pending`** with a generic `PUT` → **200**, audit rows
  61 → 61, while the `verifiedBy` attribution stayed on the row (P-31). The same officer then
  un-filed an EVC committee report (`reportSubmitted true → false`, status `Completed → Scheduled`) →
  **200**, no audit (P-33, `data.ts:207-224` has no guard at all).
* Scope, on the other hand, is consistently enforced — a strength worth protecting: cross-institute
  application `PUT` → 403, out-of-region EVC visit `PUT` → 403, out-of-region document verify → 403
  `SCOPE_DENIED`, out-of-region undertaking `PUT` → 403, `PUT /api/config` and
  `PUT /api/roles/:id/permissions` by a non-admin → 403 (P-05, P-17, P-25, P-27, P-32).

### 4.16.3 L4-04 / L4-05 — headers and CORS measured on the overlay

Round 1 P-15 and round 3 P-15b. On `:8081` the SPA document and API responses carry **no**
`Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` or HSTS — §4.5 is
confirmed as written, and the iframe test it promised was **not run** (recorded in the not-run list).
CORS behaves as §4.6 predicted, with one important nuance: a credentialed `POST`/`PUT` from a foreign
`Origin` is refused with **403 `ORIGIN_NOT_ALLOWED`** (a real guard, in place, working), but the same
`POST` with **no `Origin` header at all** is accepted → **201** (`ALRT-PROBE-15B`). For a non-browser
client that is by design; combined with `SameSite=Lax` it does not open a browser CSRF hole. So
L4-05's severity is P2 and its wording should be "any localhost port is trusted", not "the write guard
is bypassable".

### 4.16.4 L4-07 — the assistant surface, measured in Postgres mode

Round 4 P-30 and round 5 P-37. `GET /api/assistant/status` is **unauthenticated** and answers
`{"isConfigured":false,"provider":"gemini","model":"gemini-3-flash-preview"}` — §4.8's disclosure claim
confirmed in the mode that matters, and demo mode is the only mode where `userRole` comes from the
body (`authGuard.ts:159-162`); in Postgres mode the greeting follows the session for all five personas
and an unauthenticated `POST /api/assistant/chat` → **401**. A 200 KB chat body → **413**
(`MAX_BODY_BYTES` 64 KB). With no key configured the surface still answers from the local fallback, so
an evaluator sees a working assistant and no provider — worth one sentence in the demo script rather
than a finding.

### 4.16.5 L4-08 — throttle: what it covers, what it costs, and what it does not record

Round 1, P-14. The limiter bites on the **6th attempt of one account** (5×401 then 429), returns
`Retry-After: 889`, and then refuses the **correct** password too — a real self-inflicted lockout
vector, since any party who can cause 5 failed logins as `superadmin@apoorvasetu.demo` locks the
evaluator out for ~15 minutes during the demo. 40 failures across 40 *distinct unknown* emails all
returned 401 (per-identity buckets, as §4.11 reasoned), at 52-116 ms each — scrypt is charged even for
unknown emails, which is the right trade. `docker stats` across the whole probe:
`153.5 → 153.2 MiB`, i.e. no measurable growth from 80+ buckets; the unbounded-`Map` claim is a
long-horizon concern, not a demonstrated leak. New fact from the same probe: **none of the
unknown-email failures are in the audit trail** — 80 attempts left the `FAILED_LOGIN_BAD_PASSWORD`
count at 9 (those came from the known-account hammering test), so credential-stuffing against
non-existent users is invisible to the one screen an evaluator would check. Re-checked later against
the table: every `FAILED_LOGIN_BAD_PASSWORD` row carries a real `userId` — `USR-SUPERADMIN` ×9 plus the
probe user ×1 — and none of the 80 distinct unknown emails produced a row, because the record is keyed
to a user that does not exist. The restart-reset behaviour remains a static
inference from the in-memory `Map`; it was not runtime-tested.

### 4.16.6 L4-09 — confirmed, with the asymmetry spelled out

Round 3, P-07 (round 1's and round 2's versions of this probe used wrong paths and proved nothing —
recorded so nobody re-uses them). With a live 43-char `apoorvasetu_sid` cookie for
`USR-MVY4M8L8-190E`: `PUT /api/users/:id` resetting the password → the **old cookie still returns
`GET /api/snapshot` = 200**; the old password is then refused (401) and the new one works (200). So a
credential rotation does not end an existing session. `POST /api/users/:id/toggle` (deactivate) **does**
end it — the same cookie then gets 401 — so the gap is specifically "password/role changes", and the
fix is the one already proven to work on the deactivate path: revoke `sessions` rows for that user in
the update route. Round 2's P-26 adds the surrounding hygiene: 15 live sessions for 5 users (no cap on
concurrent sessions), logout revokes exactly the calling session (15 → 14, old cookie → 401),
`rememberMe` yields a 30-day cookie vs 12 hours without, flags are `HttpOnly; SameSite=Lax` with no
`Secure` (correct over plain http locally). Round 7 then found the sessions table itself is never
pruned: **65 rows, 0 expired**, and the only `deleteMany` calls in `server/` delete assistant messages
(`server/routes/assistant.ts:73,95`).

### 4.16.7 L4-01 and L4-10 — bundle and tenant claims re-checked against the served artefact

`S22_secret_in_bundle.txt` / `S22b_served_bundle_greps.txt` stand: the HMAC-ish signing string and the
`Apoorva@2026` literal are both present in the shipped `index-*.js` (2 occurrences of the credential,
counted from the served bundle in round 2, P-06). L4-10's external Supabase fallback URL was not
re-tested at runtime; no probe contacted it, and it must not be (§4.11 wording is retained as a static
finding).

### 4.16.8 New L4 items from the live half

| id | sev | title | proof |
|---|---|---|---|
| L4-16 | **P0** | A document verification can be *requested as a rejection* and is answered by recording a verification: `POST /api/documents/:id/verify` has no outcome branch, so `{"decision":"Rejected","competentAuthority":"Automated Rejection Pipeline"}` → **200**, row becomes `status:"Verified"`, `verifiedBy:"Dr. R. K. Sharma"`, and the authority string the officer typed is discarded | round 6 P-38; the sibling undertaking endpoint (`workflow.ts:201-269`) does branch on `outcome` — its reject arm answered 409 then 400 `"reason must be a string."`, which is what proves the document arm is missing rather than hidden |
| L4-17 | P1 | A live session can rewrite a shared notification for every reader: `EVC_MEMBER` `PUT /api/notifications/NOTIF-3` → **200**, flipping `read=false → true` and `priority medium → low` (round 8's comparator is what proves the seed value was
`medium`), and the institution then sees the tampered row | round 5 P-35; there is one `read` column for a multi-role audience, so "mark read" is inherently global |
| L4-18 | P1 | Unparsable dates are accepted into regulated deadline columns: `expiryDate:"not-a-date"` stored on a **Verified** document row, while the UI's own `parseDate` returns `null` for it | round 1 P-18; `payload.ts:252,274,275,302` only require a string ≤100. Ordering consequence measured in `lens-L3.md` §3.13.3 (P-48, rolled back) |
| L4-19 | P2 | Brute force against non-existent accounts leaves no trace: 80 failed logins across distinct emails changed the `FAILED_LOGIN_BAD_PASSWORD` count by 0 | round 1 P-14 |
| L4-20 | P2 | The audit trail can be buried by any session; there is no read path past row 200 | round 7 P-42, and `lens-L3.md` §3.13.4 |
| L4-21 | P1 | `PUT /api/roles/:role/permissions` rewrites the effective permissions of **every** user of that role (`admin.ts:273`) and writes **no** audit row, while the three user routes beside it do | round 10 P-52, no-op body, audit count 95 → 95; §4.16.9 |

### 4.16.9 P-52 (round 10) — authority changes that write no trail

`PUT /api/roles/:role/permissions` is the one admin mutation in `server/routes/admin.ts` with **no**
`writeAudit` call, and it is the one with the widest blast radius: `admin.ts:273` follows the upsert with
`user.updateMany({ where: { role }, data: { permissions } })`, so a single click rewrites the effective
permission array of **every user holding that role**. Measured with a deliberate no-op body — the role's
own current list, `["evc.read","evc.report.submit","institutes.read","documents.read"]`:
HTTP **200**, `role_permissions` unchanged (verified), `USR-EVC-MEMBER.permissions` unchanged (verified),
and `audit_logs` **95 → 95** with no row naming the action. The three user routes in the same file
(`:140` create, `:199` update, `:232` toggle) each do call `writeAudit`, so this is an omission in one
handler, not a file-wide design.

Two consequences worth stating in the synthesis. (1) An evaluator who edits the EVC or Regional matrix
mid-demo changes what those personas can do, and the Audit Logs screen will show nothing about it — the
screen that exists to answer "who changed what". (2) It also explains L5-13's demo/Postgres split:
enforcement reads `user.permissions` (`src/services/rbacService.ts:113-117`, with `SUPER_ADMIN` an
unconditional wildcard), and that array is *copied from* the matrix at create (`admin.ts:118`) and on
matrix rewrite (`:273`). The matrix is therefore not dead — but it is a cache of the ACL, not the ACL,
and a user row can be edited to disagree with its own role without any trail.

### 4.16.10 Corrections, withdrawals and harness honesty

* **Corrected**: `POST /api/admin/users` → `POST /api/users` (§4.3, §4.14 P-06). Same for the reset and
  toggle paths used in §4.14 P-07: `PUT /api/users/:id`, `POST /api/users/:id/toggle`.
* **Withdrawn**: the round-4 in-script claim that the generic `PUT` wrote
  `stage:"Final Approval", status:"Approved"` on `AICTE/2026/12869`. The transcript prints **403** and
  the row stayed `Scrutiny / Re-scrutiny | Returned | v1` — the applications two-way guard
  (`data.ts:198-204`) holds, and the comment was written from the intent of the probe, not its result.
  L4-03 must not be supported with that example; use P-31/P-33 instead.
* **Withdrawn**: the round-3 storage 500s. `PUT /api/files/object` → 500 and `GET` → 404 were caused by
  *this audit container being created without `UPLOAD_DIR`*; `docker-compose.postgres.yml:12-16` sets
  `UPLOAD_DIR=/app/data/uploads` and mounts a named volume, and round 4, started with the same
  environment, got `PUT` 204 / `GET` 200 / traversal 400 / oversize 413. No product defect.
* **Not a defect, recorded as a strength**: the local storage driver authorises correctly —
  non-owner `PUT` → 403, `POST /complete` by another account → 403, `EVC_MEMBER` without
  `documents.verify` → 403, unauthenticated → 401, `../etc/passwd` and `/app/etc/passwd` keys → 400,
  other-users' keys → 404, 27 MB `PUT` → 413, 0-byte `PUT` → 400, and downloads carry
  `X-Content-Type-Options: nosniff` + `Cache-Control: private, max-age=0, no-store` (round 4, P-28).
* **State after all of it**: `evidence/curl/P_pass_c_round8_output.txt` reports
  **total field differences: 0** against the seed after six restores; the one deliberate exception is
  `AICTE/2026/12875`, left one stage ahead of the seed because Pass C advanced it through the audited
  transition endpoint and rolling it back would leave an audit row describing an effect the row no
  longer has. Two facts that are themselves findings, not housekeeping: `DOC-502` could only be
  restored by direct `UPDATE` (no sanctioned API path can move a row out of `Expired`, §3.13.10 of
  `lens-L3.md`), and 9 audit rows now point at probe entities and users that no longer exist — the
  orphan-audit condition of L3-02, reached by accident.
