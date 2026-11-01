# ApoorvaSetu

Integrated AICTE Approval Workflow Automation, Compliance Monitoring and Alert Management System —
built for AICTE Problem Statement 26262.

ApoorvaSetu digitises the national approval lifecycle: routing applications by type, tracking
stage-wise SLAs, managing Expert Visit Committees (EVC), monitoring time-bound undertakings and
document validity, and escalating delays to the right authority — while keeping every statutory
decision with a human competent authority.

See [docs/AICTE-26262-IMPLEMENTATION.md](docs/AICTE-26262-IMPLEMENTATION.md) for the full
architecture, phase plan, tasks, test plan, security model and demo script.

---

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env   # optional; demo mode runs with no configuration
npm run dev            # http://localhost:5173
```

The app starts in **demo mode** with seeded institutions, applications, EVC visits, compliance
records and documents — no backend required.

### Run with Docker

One container serves the built SPA, the Express back end and the assistant APIs on a single
origin. Demo mode needs no `.env` and no database.

```bash
docker compose up --build -d   # http://localhost:8080
docker compose ps              # health status
docker compose logs -f app
docker compose down
```

- **First build** takes a few minutes (dependencies install inside the image); later builds are
  much faster.
- **AI assistant**: copy `.env.example` to `.env` and set `GEMINI_API_KEY`, then
  `docker compose up -d --force-recreate`. Runtime env changes do not need a rebuild.
- **Supabase mode**: `VITE_DATA_MODE`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are
  inlined at build time — change them in `.env`, then `docker compose up -d --build`.
- **Rebuild rules**: source or `package-lock.json` changes need `--build`; runtime env changes
  need `--force-recreate`.
- **Port**: publish on another port with `APP_PORT=8090 docker compose up -d --build`.
- **Not included**: the hourly deadline sweep (`api/cron/sweep.ts`, Vercel only) and hot reload
  (use `npm run dev` on the host for that).

Unknown `/api/*` paths return JSON 404, and deep links such as `/applications` return
`index.html`, so browser refresh works on every route.

### Demo accounts

All seeded accounts use the demo password `Apoorva@2026`.

| Role | Email | Scope |
|---|---|---|
| Super Administrator | `superadmin@apoorvasetu.demo` | Everything, including system configuration |
| AICTE Central Admin | `aicteadmin@apoorvasetu.demo` | National approvals, authority decisions |
| Regional Officer (Northern) | `regional@apoorvasetu.demo` | Northern region only |
| EVC Committee Member | `evc@apoorvasetu.demo` | Assigned inspections |
| Institution Administrator | `institute@apoorvasetu.demo` | Own institution (INST-101) |

Demo authentication is simulated and intentionally labelled as such in the UI. It exists to make
the workflow demonstrable offline; it is not a production credential system.

### Seeded demo walkthrough

Every seeded date is relative to the day the demo first loads, so the SLA tiers stay true. Sign in as
an administrator and open the account menu to advance the **Demo clock** (`Today`, `+3d`, `+7d`,
`+14d`) or open **Scenario guide** (`/demo-scenarios`) for the 12 scripted scenes, from on-track
cases and approaching deadlines to breached stages, overdue EVC reports, expired leases and a
recorded human approval. The clock only changes deadline evaluation; approvals, rejections and
verifications always require an authorised officer. **Reset Demo Data** re-seeds the workspace.

---

## Data modes

| Mode | Trigger | Behaviour |
|---|---|---|
| `demo` (default) | No Supabase configuration, or `VITE_DATA_MODE=demo` | localStorage persistence, seeded data, no network |
| `supabase` | `VITE_DATA_MODE=supabase` plus `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Supabase reads/writes, Auth, RLS and Storage |

Environment variables:

```bash
VITE_DATA_MODE=demo                    # or supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...                     # AI assistant (server-side only)
AI_PROVIDER=gemini
AI_MODEL=gemini-3-flash-preview
```

The repository layer is selected in `src/services/repositories/index.ts`. Demo storage lives under
`aicte_approval_system_data_v4_*` and migrates legacy v3 keys on first read.

> Supabase mode requires the migrations in `supabase/migrations/` to be applied first. Demo mode is
> independent of the backend and always boots with an empty environment.

---

## Workflow model

Applications are resolved to one of six routes by type:

| Route | Typical request | Path |
|---|---|---|
| Scrutiny only | Increase in intake, new course | Submitted → Scrutiny → Approval → Final |
| Scrutiny + EVC | Extension of Approval | Submitted → Scrutiny → EVC → Approval → Final |
| Scrutiny + EVC + SAC | New technical campus | Submitted → Scrutiny → EVC → SAC → Approval → Final |
| EVC only | Closure | Submitted → EVC → Approval → Final |
| Scrutiny + SAC | Reduction in intake | Submitted → Scrutiny → SAC → Approval → Final |
| SAC appeal | Appeal against rejection | Submitted → SAC → Final |

Guarantees enforced by `src/workflow/engine.ts`:

- Stages cannot be skipped or reversed with a forward action.
- A case cannot leave EVC before the inspection report is submitted.
- Outstanding deficiencies block forwarding; returns pause the SLA.
- Resubmission resumes the stage clock at the returned-from stage.
- Final approval requires all undertakings verified (override is authority-only and audited).
- `APPROVE` / `REJECT` are restricted to SUPER_ADMIN and AICTE_ADMIN and record the competent
  authority by name.
- Regional officers cannot act on another region's cases; version checks reject stale edits.
- Every transition emits a domain event and an audit entry with before/after state and a shared
  correlation ID.

---

## Roles and permissions

Five roles: `SUPER_ADMIN`, `AICTE_ADMIN`, `REGIONAL_OFFICER`, `EVC_MEMBER`, `INSTITUTION_ADMIN`.
Permissions are declared in `src/types/index.ts` and mapped per role in
`src/services/authService.ts`. Pages filter data through `src/services/rbacService.ts`.

In demo mode these checks are client-side simulations. In Supabase mode the same scope must be
enforced by Row Level Security; client checks are UX only.

---

## Design system

The interface is a calm institutional desk: warm paper ground, quiet ink, one cobalt accent, and
Manrope at a single type scale. The direction is locked in [design.md](design.md); no screen
introduces a colour, font, radius or shadow outside it.

- **Tokens** live in one `@theme` block in `src/index.css` and generate the Tailwind utilities used
  everywhere (`bg-paper`, `text-ink-2`, `border-line`, `rounded-card`, `shadow-raise`, …). Raw hex
  values appear only in the token block and `src/utils/statusTone.ts`.
- **Primitives** live in `src/components/ui/`: `Button`, `IconButton`, `Card`, `PageHeader`,
  `StatTile`, `Badge`, `DataTable`, `Field`/`Input`/`Select`/`Textarea`, `Modal`, `Drawer`, `Tabs`,
  `EmptyState`, `Notice`, `ProgressBar`, `Skeleton`, `Spinner`, `Tooltip`, `Avatar`. Pages compose
  these instead of re-styling shells.
- **Status colour** comes from `statusTone()` so the same state reads the same on every screen.
- **Motion** is CSS only (`transform`/`opacity`, 120–450ms), with `page-enter`, `panel-enter`,
  `pop-enter` and `toast-enter` classes, and a `prefers-reduced-motion` fallback that removes all of
  it except spinner rotation.
- **Accessibility**: one global `:focus-visible` ring, labelled inputs and icon buttons, focus
  trapped overlays, `role="status"` toasts, captioned tables with `scope="col"` headers.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port 5173 (AI middleware included) |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | Preview the production build (SPA only, no assistant API) |
| `docker compose up --build` | Build and run the full app at http://localhost:8080 |
| `npm run lint` | oxlint |
| `npm test` | Vitest watch mode |
| `npm run test:run` | Vitest single run (CI) |
| `npm run test:coverage` | Coverage for workflow, dates and repositories |

---

## Project structure

```
src/
  workflow/            Pure domain: stages, routes, reason codes, engine, config
  utils/dates.ts       Mockable clock, ISO/display parsing, business-day and SLA math
  services/
    authService.ts     Demo identity, permissions, audit log
    rbacService.ts     Role/region/institute scoping helpers
    repositories/      Repository contract + local and Supabase implementations
  context/             App and auth providers (useApp / useAuth facades)
  pages/               Role dashboards and workflow screens
  components/
    ui/                Shared design-system primitives
    common/            Shell chrome (header, sidebar, route guard)
    dashboard/         Dashboard panels and charts
    modals/            Case detail, compliance, EVC, report and tracking dialogs
supabase/              Schema, migrations and RLS tests (production path)
docs/                  Implementation plan and phase tracking
design.md              Locked design system (tokens, type, motion, components)
```

---

## Testing

```bash
npm run test:run
```

Current suite:

- `src/workflow/routes.test.ts` — route paths and type mapping.
- `src/workflow/engine.test.ts` — guards, return/resubmit, revert, authority decisions, audit.
- `src/utils/dates.test.ts` — parsing, business days, SLA tiers.
- `src/services/repositories/localRepository.test.ts` — v3 → v4 migration, audit cap, reset.

---

## Deployment

The Vite build is static and rewrites all routes to `index.html` (see `vercel.json`). The AI
assistant is exposed through a Vercel function (`api/assistant/chat.ts`) and a Vite dev middleware;
API keys stay server-side.

For a self-hosted deployment, the same image runs on any container host: publish port 3001, inject
`PORT` and the runtime secrets, and put TLS and compression in front. The local compose file is a
production-style single-container run, not a Vercel replacement — the hourly sweep and serverless
functions stay on Vercel.

Before enabling Supabase mode in a shared environment, apply the migrations and run
`supabase/tests/rls.sql` to confirm cross-region and cross-institution isolation.
