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

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port 5173 (AI middleware included) |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | Preview the production build |
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
  components/          UI, dashboards and modals
supabase/              Schema, migrations and RLS tests (production path)
docs/                  Implementation plan and phase tracking
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

Before enabling Supabase mode in a shared environment, apply the migrations and run
`supabase/tests/rls.sql` to confirm cross-region and cross-institution isolation.
