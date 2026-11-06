# ApoorvaSetu — Fix plan

Input: [`AUDIT_REPORT.md`](AUDIT_REPORT.md) (69 findings, `AUD-001` … `AUD-069`). Commit baseline `794e54c`.
Effort scale from the audit plan: **S ≈ 15 m, M ≈ 1 h, L ≈ 3 h**, each multiplied by 1.2 for the
regression-test-first rule — every fix ships with a test that fails before it and passes after, and no
existing test may be weakened, skipped or re-scoped to make a fix land.

Nothing here is applied yet. **Wave 1 starts only when the waves are named.**

---

## Wave 1 — the seven P0, plus the three P1s that break the demo script

| # | AUD | Sev | What lands | Eff | Depends on |
|---|---|---|---|---|---|
| 1 | **AUD-001** | P0 | Outcome branch in `POST /api/documents/:id/verify`: `decision` validated against the enum, `competentAuthority` validated against the calling user, unknown value → 422, `Rejected` records a rejection and the predecessor stays rejected. Mirror the arm that already exists at `workflow.ts:201-269`. | M | — |
| 2 | **AUD-005** | P0 | No self-issued renewal: the verifying actor must differ from the row's raiser/owner, and the authority identity is stamped server-side, never read from the body. | M | 1 (same file, same handler) |
| 3 | **AUD-003** | P0 | Guards become transition-shaped: a `(from,to)` pair plus a per-field owner table, so `dueDate`, `expiryDate`, `escalationLevel`, `renewalStatus`, `reportSubmitted` and `evidenceDocumentIds` can only move with the transition that owns them — and the EVC checklist becomes a server-side precondition (`AUD-025` closes for free). | M | — |
| 4 | **AUD-006** | P0 | `server/payload.ts` stops defaulting absent keys: build the update object from keys actually present (no `?? 0` / `?? []` on regulated columns), so a full-row PUT cannot null evidence links or reset an escalation level. | M | — |
| 5 | **AUD-002** | P0 | Every `SaveSpec` write runs inside one `$transaction` with its audit row; `POST /api/audit` is removed (or reduced to a server-only internal); `PUT /api/roles/:role/permissions` writes the row its three siblings already write. | M | 3, 4 (same handlers) |
| 6 | **AUD-004** | P0 | Immutability in the schema that runs: the `audit_logs_immutable` trigger + `revoke update, delete, truncate` from the Supabase migration reproduced as a Prisma migration, plus a `GRANT SELECT`-only role for the app user, plus `supabase/tests/rls.sql` wired to an npm script so the assertion executes somewhere. | M | 5 (do not lock yourself out of your own writer) |
| 7 | **AUD-007** | P0 | A server-side host for the deadline sweep: `sweepDeadlines` runs on an in-container timer *and* behind `POST /api/sweep` with `CRON_SECRET`, in the Postgres mode where write-back is currently `SUPER_ADMIN`-gated; the client stops being the clock's only operator, and the demo clock either drives the server or is clearly labelled demo-only. | L | 3, 5, 6 — the sweep must inherit the transaction and audit discipline of the transition route |
| 8 | **AUD-021** | P1 | One sweep per demo-clock tick: the `setTimeout(runSweep, 0)` double-dispatch is removed and the second sweep stops recomputing from stale React state (`Open` 16 → 6 on reload ends here). | M | 7 (same engine, keep the fix small if 7 is late) |
| 9 | **AUD-022** | P1 | A root error boundary with a visible recovery action, and shape-validation on `readLocal` that falls back per store instead of poisoning the whole app. This is the "white screen mid-demo" insurance. | S | — |
| 10 | **AUD-027** | P1 | `"postinstall": "prisma generate"` so `npm run build` works from a clean clone (64 `error TS` → 0), and a fail-fast message when `dist/` is missing instead of an API-only boot with `GET /` → 404. | S | — |

**Wave 1 totals:** **7 M · 1 L · 2 S** → (7×1 h) + 3 h + (2×0.25 h) = **10.5 h**, ×1.2 =
**≈ 12.6 h ≈ 1.6 working days.**

Definition of done for Wave 1: the P-38 rejection probe returns 4xx and the row stays `Rejected`; a PUT
without `evidenceDocumentIds` preserves them; `UPDATE audit_logs …` fails for the app role; a sweep runs
with no browser tab open and produces one audit row per alert; a fresh clone in `%TEMP%` builds clean; and
`npm run test:run` is at or above 232 passing with no test file edited to accommodate a fix.

---

## Wave 2 — the remaining 16 P1, plus the 23 S-effort P2 quick wins

Grouped so a reviewer can see the shape; each line is one row of `AUDIT_REPORT.md`.

### 2a. P1 integrity and authorization (7 M · 9 S)

| AUD | Sev | Item | Eff |
|---|---|---|---|
| AUD-008 | P1 | Explicit `permissions` on the alert/notification/escalation specs; "present" scope refuses a row the caller cannot read; AND-semantics where the action is privileged | M |
| AUD-011 | P1 | Enum/CHECK constraints per status column via migration; FK or orphan-sweep for `audit_logs.entityId` | M |
| AUD-012 | P1 | `timestamptz` columns, one date formatter, the server as the only clock for regulated writes | M |
| AUD-014 | P1 | Snapshot: per-table `select`/`take`, versioned ETag, incremental read driven by the existing `rev` | M |
| AUD-019 | P1 | `expectedVersion` enforced in `saveHandler`, not only in the transitions router | M |
| AUD-024 | P1 | `inert` the closed drawer; wire `aria-expanded`, `aria-controls`, state-aware name | M |
| AUD-025 | P1 | Checklist precondition (falls out of Wave 1 item 3; verify and test independently) | M |
| AUD-009 | P1 | `audit.read` on the audit writer + cursor pagination + total count | S |
| AUD-010 | P1 | Server-generated `correlationId`, `previousState`/`newState` stamped in-transaction; doc row corrected until it ships | S |
| AUD-013 | P1 | Unique index on `dedupeKey`, upsert instead of read-then-write | S |
| AUD-015 | P1 | Delete `SERVER_SIGNING_SECRET` / `computeHMAC` / `generateToken` / `verifyToken` from `authService.ts` | S |
| AUD-016 | P1 | Required password on `POST /api/users`; stop printing the credential on the login screen | S |
| AUD-017 | P1 | Validate the calendar value of every date field, not its presence | S |
| AUD-018 | P1 | Revoke sessions on password/role change; prune expired; `Secure` outside loopback | S |
| AUD-020 | P1 | Injected id factory + injected clock in `engine.ts` / `alerts.ts` | S |
| AUD-023 | P1 | Darken `--color-ink-3` to ≥ 4.5:1; re-measure the three call sites | S |

### 2b. S-effort P2 quick wins (23 S)

Security/transport: **AUD-032** write-budget + bucket TTL · **AUD-034** security headers + `COOKIE_SECURE` ·
**AUD-035** fail-closed CORS · **AUD-036** CSV formula neutralisation · **AUD-037** authenticated assistant ·
**AUD-038** no compiled-in external tenant · **AUD-039** audit the failed logins that are invisible now.

On-screen correctness: **AUD-029** reset-identity label/confirm · **AUD-040** one "Valid" predicate ·
**AUD-041** keyed seed notifications · **AUD-042** re-entrancy guard + idempotency key · **AUD-043** one
officer per region in the seed · **AUD-057** README executed against a fresh clone.

Accessibility: **AUD-046** skip link + `id="main"` · **AUD-047** keyboard-scrollable table region ·
**AUD-048** `aria-describedby`/`aria-invalid` in `Field` · **AUD-049** live regions on the three busiest
surfaces · **AUD-050** focus ring on the assistant textarea.

Ops/size: **AUD-030** one demo audit store · **AUD-033** exit on unreconciled migrations ·
**AUD-052** delete the 425 KB of design artefacts from the shipped image · **AUD-054** `compression()` ·
**AUD-055** `mem_limit`/`cpus` per service.

*(**AUD-026** — `strict: true` — is the 17th remaining P1 and is deliberately **not** here: it needs the
`payload.ts` cleanup Wave 1 item 4 creates, and it cannot be attempted in a 15-minute slot. It is Wave 3,
item 3a. **AUD-031** stays in Wave 3 too, because it is `M`.)*

**Wave 2 totals:** **7 M · 32 S** = (7×1 h) + (32×0.25 h) = **15 h**, ×1.2 = **≈ 18 h ≈ 2.3 working days.**

Definition of done for Wave 2: the six P0-adjacent probes in `evidence/curl/` (P-38, P-40, P-42, P-50, P-52,
P-66) are re-runnable and now fail-to-exploit, `npm run lint` stays at 0 errors, the a11y census in
`raw/D21_*` shows 0 failing text nodes and 0 off-screen tab stops at 632 px, and the contrast/landmark
counts are recorded in a new transcript rather than asserted.

---

## Wave 3 — architecture, performance and the remaining P3 polish

### 3a. P2 `M`/`L`, plus the deferred `AUD-026` (8 rows)

| AUD | Item | Eff |
|---|---|---|
| AUD-026 | `strict: true` for both tsconfigs, then the fallout — the class of bug behind `AUD-006`/`AUD-017` | L |
| AUD-053 | Split the 2,355-line root context; memo the selectors (34 consumers) | L |
| AUD-028 | SSE: per-table/per-scope topics, `id:` on frames, `Last-Event-ID` replay | M |
| AUD-031 | Make the workflow modules importable by the server (unblocks the real server-side sweep) | M |
| AUD-044 | One source of truth for a user's permissions | M |
| AUD-045 | One responsive strategy for list/table, applied through `DataTable` | M |
| AUD-051 | Route-level `lazy()` + a manual-chunks budget | M |
| AUD-056 | CI running the four gate commands on push | M |

*(All eight are `L`/`M` on purpose: none of them fits a quick-win slot, and `AUD-026`/`AUD-053` change
files that Wave 1 and Wave 2 also touch, so they go last to avoid two rewrites of `payload.ts` and
`AppContext.tsx`.)*

### 3b. P3 polish (12 rows, all `S` except `AUD-065`)

**AUD-058** server-generated assistant ids · **AUD-059** stop fabricating provenance IPs · **AUD-060**
tier-specific expiry copy · **AUD-061** an honest evidence-attach success path in demo · **AUD-062** the
acting-office label from the session · **AUD-063** a real 404 route · **AUD-064** one label map and casing
rule · **AUD-065** (`M`) density via semantic tokens instead of 268 `text-xs` · **AUD-066** separate the
count from the name · **AUD-067** heading levels, empty `<th>`, donut pattern · **AUD-068** async `scrypt` ·
**AUD-069** `prisma` → `devDependencies`, `coverage/` in `.gitignore`, lint warnings get an owner.

**Wave 3 totals:** 2 L + 7 M + 11 S = 6 h + 7 h + 2.75 h = **15.75 h**, ×1.2 = **≈ 18.9 h ≈ 2.4 working days.**

---

## Sequence and standing rules

1. **Order inside Wave 1 is not free.** 1→2 (same handler), 3→4→5 (guards before the writer that has to
   audit them), 5→6 (a trigger that rejects writes will reject your own fix if it lands first), 7 last
   (the sweep inherits all of it). Items 9 and 10 are independent and can go first if the goal is to
   de-risk the demo before touching the backend.
2. **Test-first, no weakening.** Each row adds at least one failing test before the code changes. Nothing
   in `src/**/*.test.ts` is deleted, `skip`ped, or loosened; `vitest.config.ts` coverage scopes stay as
   they are unless a row explicitly widens them.
3. **`npm audit --omit=dev` will still be non-clean** after Wave 3 (`deepmerge-ts` ← `@prisma/config` ←
   `prisma`) because every listed fix is a breaking major. Moving `prisma` to `devDependencies`
   (`AUD-069`) removes it from the runtime image, which is the right fix; the version bump is a separate,
   explicitly-approved decision.
4. **Deferred by project decision, so out of all three waves:** creating the Neon project, the Supabase
   bucket, any deployment, and any live `GEMINI_API_KEY` spend.
5. **The destructive paths stay untouched.** `POST /api/admin/reset` is not exercised by any wave; the
   double gate (`ALLOW_DEMO_RESET` + super-admin) is already correct and the fix must keep it that way.
6. **Human authority stays human.** No wave may add an automated approve/reject/extend path; `AUD-001` and
   `AUD-005` in particular must record a named competent authority, not infer one.

## If time is short

The smallest set that makes the demo honest is **Wave 1 items 1-6 + 9 + 10** (≈ 8 h with the test
allowance). That removes the falsified rejection, the unaudited write, the writable graded fields, the
silent null-out, the mutable history, the white screen and the broken first command. `AUD-007` (the server
sweep, `L`) is the one P0 that can be deferred *if* the demo narration says out loud that alerts are
computed on the client — it cannot be deferred if the pitch claims the server raises deadlines.

## Grand total

| Wave | Rows | Raw effort | With ×1.2 | ≈ days (8 h) |
|---|---|---|---|---|
| Wave 1 | 10 | 10.5 h | **12.6 h** | 1.6 |
| Wave 2 | 39 | 15 h | **18.0 h** | 2.3 |
| Wave 3 | 20 | 15.75 h | **18.9 h** | 2.4 |
| **All** | **69** | **41.25 h** | **49.5 h** | **6.2** |
