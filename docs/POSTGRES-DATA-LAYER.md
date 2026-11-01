# Postgres data layer (P14)

ApoorvaSetu runs in two data modes. The browser keeps the localStorage demo; the Postgres mode
persists everything in a Neon-compatible Postgres database through Prisma, with server-side auth,
RBAC and regulated workflow actions.

| Mode | Selected by | Data | Auth |
|---|---|---|---|
| Demo (default) | `VITE_DATA_MODE=demo` or empty | localStorage in the browser | Demo accounts in `src/data/demoUsers.ts` |
| Postgres | `VITE_DATA_MODE=postgres` (build arg) | Postgres through `/api/*` | Session cookie, users and sessions in Postgres |

Demo mode boots with an empty environment and no database. Postgres mode needs `DATABASE_URL`;
without it the data routes answer `503 DATABASE_UNCONFIGURED` and the UI stays signed out.

## Architecture

```
Browser (React)                      Express (same container)              Postgres
───────────────                      ────────────────────────              ────────
demo      → localStorage             (no database calls)
postgres  → postgresRepository ─────▶ /api/snapshot, /api/<entity>, /api/applications/:id/transitions
          → postgresAuthService ────▶ /api/auth/*  (HttpOnly session cookie)
          → files ──────────────────▶ /api/files/*  → local disk or Supabase Storage
          → assistant history ──────▶ /api/assistant/history
```

The browser bundle never imports Prisma or any server secret.

## Prisma models

`prisma/schema.prisma` mirrors the domain types one-to-one: `Application`, `Institute`, `EVCVisit`,
`ComplianceRecord`, `DocumentItem`, `Undertaking`, `NotificationItem`, `SystemAlert`,
`EscalationItem`, `AuditLog`, `SystemConfig`, `RolePermission`, `User`, `Session`,
`AssistantMessage` and `FileObject`.

Conventions:

- Human string IDs (`AICTE/2026/12870`), `@@map` to snake_case tables.
- Domain dates stay display strings (`"31 Oct 2026"`) so the API returns exactly what the UI renders.
- Nested collections (`timeline`, `documents`, `decision`, `checklist`, `report`) use `Json`;
  flat string lists use `String[]`.
- No Prisma enums: stage/status values contain spaces and slashes.
- Mappers in `server/mappers/*.ts` convert both directions with `null → undefined`, and never
  import client types from `@prisma/client`-dependent code.

## API surface

| Method / path | Guard | Purpose |
|---|---|---|
| `GET /api/snapshot` | session | All scoped collections, config, role permissions, recent audits |
| `GET /api/events` | session | SSE `{tables, rev}` change feed (25 s keepalive) |
| `POST /api/applications`, `PUT /api/applications/:id` | permission + scope | Application upserts; regulated fields rejected with `403 REGULATED_FIELD` |
| `POST /api/applications/:id/transitions` | session | Runs the shared workflow engine in a transaction; actor comes from the session |
| `POST /api/{undertakings,documents,compliance}/:id/verify` | `*.verify` | Verification stamped with the session user; forged authority rejected |
| `POST/PUT /api/{evc-visits,compliance,documents,undertakings,notifications,alerts,escalations}` | permission + scope | Entity writes; server-owned fields stripped |
| `POST /api/audit` | session | Append-only audit; id/timestamp/actor/IP stamped server-side |
| `PUT /api/config` | `system.config` | System config |
| `GET/POST/PUT /api/users`, `POST /api/users/:id/toggle`, `PUT /api/roles/:role/permissions` | admin permissions | User and role administration |
| `POST /api/admin/reset` | SUPER_ADMIN + `ALLOW_DEMO_RESET=1` | Truncate and reseed |
| `POST /api/files/presign` | `documents.upload` / `evc.report.submit` | Prepare an upload target and register the file |
| `POST /api/files/complete` | session | Confirm a direct (Supabase) upload |
| `POST /api/files/signed-url` | owner or verifying role | 60-second read URL |
| `PUT/GET /api/files/object` | owner (PUT); owner or verifying role (GET) | Local storage driver only |
| `GET/PUT/DELETE /api/assistant/history` | session | Server-persisted chat history |
| `GET /api/health`, `GET /api/ready` | public | Liveness (reports database/storage) and readiness (`SELECT 1`) |

### Regulated actions

The workflow engine in `src/workflow/engine.ts` is shared by the browser and the server.
Transitions run inside `prisma.$transaction`:

1. Load the application and its undertakings, EVC visit and config.
2. Run `applyTransition` with an actor built **from the session**.
3. `updateMany({ where: { id, version: expectedVersion } })`; zero rows means `409 VERSION_CONFLICT`.
4. Append audit rows inside the same transaction.

Approval writes `decision.competentAuthority = "<name> (<role>)"`. Verification endpoints stamp
`verifiedBy` from the session and reject `verifiedBy` / `verifiedAt` / `actor` /
`competentAuthority` in the request body (`403 REGULATED_FIELD`). Automation can route, remind and
escalate, but never approve, reject or verify.

## File storage

`server/storage` exposes one adapter interface with two drivers:

| Driver | Upload | Download | Notes |
|---|---|---|---|
| `local` (default) | Browser `PUT`s to `/api/files/object`, server writes under `UPLOAD_DIR` | Session-authenticated stream | Compose mounts `apoorvasetu_uploads` at `/app/data/uploads` |
| `supabase` | Presigned Supabase upload URL, browser uploads directly | 60-second signed URL | Requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` server-side and a private bucket |

Keys are server-generated as `u-<userId>/<uuid>/<sanitised-file-name>`; only `[A-Za-z0-9._-]`
segments are accepted, so traversal is impossible. Presign validates type (PDF/PNG/JPEG/WebP) and
size (`UPLOAD_MAX_MB`, default 25 MB) and records a `FileObject` row.

Read access: the uploader, plus roles with `documents.verify` for document files and `evc.read` for
inspection evidence. Demo mode keeps the metadata-only simulated upload.

## Local Postgres

```bash
# Postgres only (used by prisma migrate dev / studio)
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d db

# Whole app on Postgres (SPA + API + database, http://localhost:8080)
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build

# Demo container (unchanged)
docker compose up --build
```

The entrypoint waits for the database, runs `prisma migrate deploy`, seeds when
`SEED_ON_START=1` and the database has no users, then starts the API. Migrations are idempotent;
`SEED_FORCE=1` re-applies the demo dataset over existing data.

Scripts: `npm run db:generate`, `db:migrate`, `db:deploy`, `db:seed`, `db:reset`, `db:studio`.

Seed contents: users and password hashes, role permissions, config, institutes, applications,
EVC visits, compliance records, documents, undertakings and notifications. Alerts and escalations
are never seeded; the sweep derives them.

Demo accounts (password `Apoorva@2026`): `superadmin@apoorvasetu.demo`,
`aicteadmin@apoorvasetu.demo`, `regional@apoorvasetu.demo`, `evc@apoorvasetu.demo`,
`institute@apoorvasetu.demo`.

## Connecting Neon + Supabase (later step)

1. Create a Neon free project and copy the **pooled** URL (host contains `-pooler`,
   `?sslmode=require&pgbouncer=true`) and the **direct** URL.
2. Set `DATABASE_URL` to the pooled URL and `DIRECT_URL` to the direct URL.
3. Run `npm run db:deploy` once, then start with `SEED_ON_START=1` for the first boot.
4. Create a free Supabase project and a private `institute-documents` bucket.
5. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `STORAGE_DRIVER=supabase` on the server only.
6. Rebuild the image with `VITE_DATA_MODE=postgres` and smoke-test login, a transition, an upload
   and a download.

Nothing in the repository contains Neon or Supabase credentials.

## Configuration

| Variable | Default | Used by |
|---|---|---|
| `VITE_DATA_MODE` | `demo` | Build-time mode selector |
| `DATABASE_URL` / `DIRECT_URL` | empty | Server, Prisma migrations |
| `SEED_ON_START` | `0` | Entrypoint (seeds only an empty database) |
| `SEED_FORCE` | `0` | Seed script (overwrite existing rows) |
| `ALLOW_DEMO_RESET` | `0` | Enables `POST /api/admin/reset` |
| `COOKIE_SECURE` | `0` | Session cookie `Secure` flag (set to 1 behind HTTPS) |
| `APP_ORIGIN` | empty | Extra allowed browser origin for mutations |
| `STORAGE_DRIVER` | `local` | `local` or `supabase` |
| `UPLOAD_DIR` | `data/uploads` | Local storage root |
| `UPLOAD_MAX_MB` | `25` | Presign size limit |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | empty / `institute-documents` | Supabase storage driver |
| `GEMINI_API_KEY`, `AI_PROVIDER`, `AI_MODEL`, `AI_ALLOWED_ORIGINS` | — | Assistant |
| `CRON_SECRET` | empty | Scheduled sweep endpoint |

See `.env.example` for the annotated list.

## Known limitations

- **The deadline sweep runs from the super admin session.** In Postgres mode the client sweep
  re-raises alerts, escalations and notifications for the whole dataset, so it is gated to
  `SUPER_ADMIN` (`AppContext.runSweep`). Other roles only read their scoped view. Server-side
  scheduling (the existing `CRON_SECRET` sweep endpoint) replaces this gate when it lands.
- Sweep writes are idempotent by `dedupeKey`: a repeated pass returns the existing alert or
  escalation instead of failing, so several sessions or a restart cannot duplicate conditions.
- `POST /api/admin/reset` truncates and reseeds; it stays disabled unless `ALLOW_DEMO_RESET=1`.

## Verification

- `npx tsc -b`, `npm run lint`, `npm run test:run`, `npm run build`.
- Demo container: `docker compose up --build` with an empty `.env`; login, approve, reload.
- Postgres container: compose overlay; migrations + seed in the logs, `/api/ready` returns 200,
  sign in as each demo account, transition an application, upload and open a document, verify an
  undertaking, restart and confirm persistence, check `403` for forged authority and `409` for a
  stale version.

## Phase status

| Phase | Scope | State |
|---|---|---|
| P14.1 | `postgres` mode seams, optional repository methods, demo seed split | Done |
| P14.2 | Prisma schema, init migration, seed, local Postgres compose | Done |
| P14.3 | Server auth: sessions, scrypt, `/api/auth/*`, client auth service | Done |
| P14.4 | Snapshot, write API, audit, admin, SSE, `postgresRepository` | Done |
| P14.5 | Regulated transitions and verifications on the shared engine | Done |
| P14.6 | Storage adapters, presign/signed URLs, uploads, assistant history, Docker, docs | Done |
| Later | Create the Neon project and Supabase bucket, point the deployed image at them | Pending |
