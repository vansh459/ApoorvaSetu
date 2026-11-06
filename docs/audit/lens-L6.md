# Lens L6 — Interface design and visual system

Scope: the token layer, typography, density, colour, component consistency, responsive patterns and
the copy that renders on screen. Evidence is the running demo build at 632×570 CSS px (the only
viewport available — see §6.5) plus `src/index.css`, the shared primitives and a class census.
Accessibility consequences of the same defects are filed under L7; the contrast numbers come from
`evidence/raw/D21_a11y_census_contrast_semantics.txt` §1, measured on 19 routes of the running
build.

Score: **7 / 10** — this is a designed product, not a component-kit screenshot: one font family, a
real token layer, disciplined spacing, print and reduced-motion support, and no ad-hoc colour in
components. The deductions are a low-vision colour token that is the app's most-used secondary
text style, one label that renders two different numbers on the same screen, three different
responsive strategies for one data pattern, and capitalisation drift between the engine's enum
strings and the UI's labels.

---

## 6.1 What is good here (and worth protecting)

- **A genuine token layer, used by components.** `src/index.css:50-75` defines `--color-paper
  #F7F5F1`, `--color-surface #FFFFFF`, `--color-ink/-2/-3`, `--color-accent #2B4C7E`, the soft
  danger/success pairs, radii and shadows; `--font-sans: Manrope …` at `:82` with three `@font-face`
  sources (latin `:18-27`, latin-ext `:29-38`, fallback `:40-47`). A census of `src/**/*.tsx`
  returns **zero** hard-coded hex values in components — colour only enters through classes.
- **Semantic tokens exist for type**: `--text-label 0.8125rem/1.125rem` and `--text-display
  2.5rem/2.75rem` (`src/index.css:85-88`).
- **Motion is opt-in and respectful.** 66 `transition-colors` uses, one each of
  `transition-transform`/`shadow`/`opacity`; `@media (prefers-reduced-motion: reduce)` at
  `src/index.css:334-345` clamps animation and transition durations and neutralises the
  `.page-enter` / `.overlay-enter` classes. `@media print` exists at `:369` — unusual and welcome
  for a dossier product.
- **Focus is a designed state, not a browser accident**: a global ring at
  `src/index.css:145-149` (`outline: 2px solid var(--color-accent); outline-offset: 2px`).
- **Icon affordances are labelled.** Icon-only controls go through `IconButton`/`Avatar` with real
  accessible names (measured live: "Close navigation", "Open navigation", "Mark read", "Inspect",
  "Remove <file>"), and decorative `<svg>` carries `aria-hidden="true"` (e.g.
  `src/pages/evc/EvidenceUpload.tsx:112-113,149-151`).
- **Empty states are designed, not blank**: `EmptyState` is used on `/evc/evidence` and
  `/applications` zero-result; the audit trail renders `—` for null cells rather than "null"
  (`src/pages/Reports.tsx:133`).
- **Tabular honesty**: `/reports` tables expose a real `<caption>` ("Document validity preview"),
  and `/admin/users`, `/applications` do too — screen-reader-anchored tables, not floating grids.

## 6.2 Findings

| id | sev | what | where | evidence | conf |
|---|---|---|---|---|---|
| L6-01 | P1 | `--color-ink-3: #9A958A` (`index.css:57`) fails WCAG AA wherever it carries meaning, measured live: **2.74:1** on paper (`#f7f5f1`), **2.98:1** on white, **2.86:1** on `surface-2`; every other text token measured ≥ 5.10:1. The rendered text uses are narrower than the source count suggests — 43 `text-ink-3` occurrences across 25 files, but most are `aria-hidden` icons — and the ones that do carry information are the sidebar group headings ("Workspace/Oversight/System", `Sidebar.tsx:280`, 12 px/500 on paper), the placeholder rule (`index.css:151-153`, e.g. "Search applications, institutes, regions" at 14 px on white), the 43 literal `0` data cells on `/pendency` (`Pendency.tsx:84,91,142,162`) and the unselected permission chip (`RolePermissions.tsx:210`). Card metadata lines are `text-ink-2` and pass. AA-safe replacement computes to `#736E66` (4.9:1 on paper); the token is defined once, so the fix is one line and a re-census. The accessibility half is L7-02. | `src/index.css:57`, `:151-153`; consumers listed left | `evidence/raw/D21_a11y_census_contrast_semantics.txt` §1, §7 | confirmed |
| L6-02 | P2 | Two numbers, one label, one screen. The `/documents` KPI tile says **Valid 6** with the caption "No action required" and the filter chip right below says **Valid 4** — and the tile is the button that switches the list to the chip's predicate, so the contradiction is self-triggering (L5-03 is the data half; the design half is that nothing on the tile tells the reader the two counts answer different questions). The tile row also sums to 9 under a headline of 10 with no caption explaining the difference. | `src/pages/Documents.tsx:440-479` tiles, `:454` click handler, `:420-424` chip counts | `evidence/raw/D16_documents_valid_two_counts.txt` | confirmed |
| L6-03 | P2 | Three responsive strategies for one pattern. `/applications` renders a mobile `ul` **and** a desktop `table` as sibling blocks (`:391` `space-y-2 md:hidden`, `:426` `hidden md:block`); `/documents` renders only `article` cards at every width; `/reports`, `/admin/users` and `/pendency` render a `DataTable` that keeps a 640–1113 px min-width inside a scrolling box, so 52–525 px of columns sit off-view at 632 px (the keyboard half of that is L7-04). A judge rotating a tablet gets a different information architecture per page. Checked and **not** a defect: the `/applications` mobile cards keep their own "Inspect" action (8 cards, 8 buttons measured), so nothing is lost below `md` there. | `src/pages/Applications.tsx:391`, `:426`; `src/pages/Documents.tsx:554`; `src/components/ui/DataTable.tsx:45-51` | page sweep transcripts (`evidence/qa/L05_*`), `evidence/raw/D21_a11y_census_contrast_semantics.txt` §5 | confirmed |
| L6-04 | P3 | Capitalisation drift between the tier enum and the tier label. The document register on `/reports` prints **Expiring Soon** (raw `validity.tier`), the `/documents` chips and tiles print **Expiring soon**, and the badge on a card prints the sentence from `validityLabel()` ("Expires in 45 day(s)"). One concept, three renderings, and the CSV that leaves the product keeps the raw one. | `src/workflow/reports.ts:258+` (tier rendered raw) vs `src/pages/Documents.tsx:92-97` (`TIER_LABEL`) vs `src/workflow/documents.ts:145-160` | `evidence/raw/D16_documents_valid_two_counts.txt` §report table | confirmed |
| L6-05 | P3 | Density is set by `text-xs` by default rather than by a semantic token. Class census across `src/**/*.tsx`: `text-xs` 268, `text-sm` 187, `text-label` 55, `text-base` 7, `text-lg` 5, `text-xl` 3, `text-2xl` 5, `text-3xl` 2. Two-thirds of the app's type is 12 px — which is exactly the size band where L6-01 bites — and the defined `--text-label` token is bypassed 5:1 by raw `text-xs`. | `src/index.css:85`; consumer census | census above | confirmed |
| L6-06 | P3 | Count-bearing labels run their number into the words with no separator, in both the visual and the accessible name: sidebar items render "Alert center10" / "Notifications17", and `/reports` cards render "9 rowsDocument validityActive land, fire, affiliation and finance records…" as one unbroken string. The card pattern is fine visually (the number is a badge) but the accessible name inherits the concatenation (L7-09). | `src/components/common/Sidebar.tsx` item renderer (badge `<span>` sibling); `src/pages/Reports.tsx` report-card buttons | `evidence/raw/D20_keyboard_traversal.txt` stop list, `evidence/raw/D21_a11y_census_contrast_semantics.txt` §4 | confirmed |
| L6-07 | P3 | The login screen prints the shared credential in a `font-mono` chip and again in a sentence, so the product's security story is visually undermined at its front door (the credential itself is L4-02). | `src/pages/auth/Login.tsx:299`, `:357` | `evidence/raw/S34_credentials_and_tenant.txt` | confirmed |
| L6-08 | P3 | Screen titles are inconsistent about register: "Undertakings and compliance", "Document repository", "Reports and evidence", "Inspection evidence" (sentence case, no role word) vs "Regional offices", "Institutes", "Pendency & workload" (one uses `&`), and the H1 on `/institutes` is "Institutes" while the sidebar item, the API label and the CSV column all say "Institutions". One noun, two spellings, in a product whose whole subject is a national registry. | `src/pages/Institutes.tsx` header vs `src/components/common/Sidebar.tsx` nav entry vs `src/services/rbacService.ts` entity naming | page sweep (`/institutes` H1 "Institutes", nav "Institutions") | confirmed |

Fix effort: L6-01 S (one token + re-census), L6-02 S, L6-03 M, L6-04 S, L6-05 M (mechanical,
touches many files), L6-06 S, L6-07 S (depends on L4-02), L6-08 S.

## 6.3 Copy-level notes that did not become findings

- `/regional/escalations` labels the acting office "Northern Regional Office" for a Super
  Administrator session (filed as L5-12, a functional mislabel rather than a design fault).
- "Tamper-proof attachments" (`src/pages/evc/EvidenceUpload.tsx:66`) and "Records added here are
  listed in the signed report" (`:140`) are copy that overstates the mechanism — filed under L5-08
  and L9 because the claim, not the typography, is the problem.
- The disabled save button on `/evc/checklist` reads "Checklist saved" and flips to "Save
  checklist" when dirty. Past tense on a disabled action is a slightly unusual affordance, but the
  adjacent "1/12 assessed" progress bar carries the state, so it reads correctly.

## 6.4 Design-system debt worth naming for the fix plan

`DataTable` has no small-screen contract (L6-03) and `StatTile` accepts a free-text `delta` that
different pages use for units, captions and counts interchangeably ("Across the scoped repository",
"31 to 60 days", "No action required", "45 need renewal") — that is why L6-02 could happen without
anyone noticing: the tile has no slot for "of what". A `StatTile` that takes
`{ value, total?, unit?, caption }` and renders "6 of 10 records" would make both L6-02 and the
`/reports` mismatch self-evident.

## 6.5 What I could not measure

- No rendered screenshots after `evidence/qa/L06_apply_03_wizard_step2_632.png`: the browser
  surface reports `visibilityState=hidden` and `take_screenshot` fails with
  `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`. Colour, spacing and contrast conclusions therefore come
  from computed styles plus a canvas rasterisation census (which is how the `oklab()` mis-parse
  artefact was caught and discarded), not from eyeballed pixels.
- No 375 / 768 / 1280 renders (no viewport emulation; live viewport 632×570 CSS px, dpr 1.25).
  Breakpoint claims are made from the `md:`/`lg:` class inventory and the measured 632 px layout,
  and are labelled as such.
- Kerning, optical alignment and icon-grid rhythm cannot be judged from computed styles; this lens
  deliberately files no finding of that kind.
