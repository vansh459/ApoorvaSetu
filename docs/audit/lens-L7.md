# Lens L7 — Usability, accessibility and assistive tech

Scope: what a keyboard-only user, a screen-reader user and a low-vision user actually get. Two
halves: a static read of the primitives (`Modal`, `Drawer`, `Field`, `DataTable`, `useDialogFocus`,
`Sidebar`, `Header`, `Toast`) and a live census of the running demo build at 632×570 CSS px — the
only viewport available — across 19 routes. All numbers are in
[evidence/raw/D21_a11y_census_contrast_semantics.txt](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/docs/audit/evidence/raw/D21_a11y_census_contrast_semantics.txt);
the keyboard-traversal counts that overlap are in
[evidence/raw/D20_keyboard_traversal.txt](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/docs/audit/evidence/raw/D20_keyboard_traversal.txt).
Screenshots were not obtainable (see §7.5), so this lens is built on computed styles and the DOM.

Score: **6 / 10** — the primitives are better than most product code: dialogs trap and restore
focus, every control has an accessible name, every table has a caption and scoped headers, and a
real focus ring is defined globally. The deductions are all at the edges of that system: the
navigation drawer was written outside it (and is a keyboard hazard at every width under `lg`), one
colour token fails WCAG AA in the three places it carries meaning, error text is not attached to
the field it describes, dynamic results are silent, and half of the report tables cannot be
scrolled without a mouse.

---

## 7.1 What is good here (and worth protecting)

- **Dialog focus management is complete, and it was measured, not assumed.** `Modal` and `Drawer`
  both go through [src/components/ui/useDialogFocus.ts:6-58](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/components/ui/useDialogFocus.ts#L6):
  first focusable gets focus, Tab/Shift-Tab wrap inside the panel, `Escape` closes, body scroll is
  locked and restored, and focus returns to the opener. Live result from the case file:
  focus on "Close dialog" → trusted `Escape` → dialog gone, `document.activeElement` back on the
  "Inspect" button that opened it, `body.overflow` restored (D-21 §3).
- **Dialog semantics are correct**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` and
  `aria-describedby` both resolve to real elements ("Application AICTE/2026/12870"), panel has
  `tabIndex={-1}`, and its headings start at `h2` so the page keeps exactly one `h1`.
- **No unnamed controls.** Across 19 routes: 0 inputs/selects/textareas without a programmatic
  label, 0 visible buttons without an accessible name, 0 images missing `alt` (the one `<img>` is
  `alt=""` decorative, `Sidebar.tsx:258-262`), 0 duplicate `id`s. `Field` wires `htmlFor`
  ([src/components/ui/Field.tsx:28](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/components/ui/Field.tsx#L28))
  and every consumer passes it.
- **Tables are real tables**: `<caption>` (sr-only, `DataTable.tsx:52`) and `scope="col"` on every
  `<th>` measured (5–7 of 5–7 per table on 7 pages); clickable rows are keyboard-operable
  (`tabIndex=0` + Enter/Space, `DataTable.tsx:87-98`).
- **State is conveyed twice in the shell**: `aria-current="page"` from `NavLink`, `aria-expanded`
  on the notification and profile popovers (`Header.tsx:292`, `:370`), `aria-pressed` on the demo
  clock presets (D-07), `aria-valuenow` on the checklist progress bar (D-18), `role="status"
  aria-live="polite"` on toasts (`Toast.tsx:20-21`), `aria-busy` on the dashboard skeleton
  (`Dashboard.tsx:15`).
- `lang="en"` on `<html>`, a real `document.title`, and one global `:focus-visible` ring
  (`src/index.css:146-148`) that measurably renders on controls.
- **Reduced motion and print are both handled** (`src/index.css:334-345`, `:369`) — see L6 §6.1.

## 7.2 Findings

| id | sev | what | where | evidence | conf |
|---|---|---|---|---|---|
| L7-01 | P1 | The mobile navigation drawer lives outside every rule the rest of the shell follows. Closed at any width under `lg`, it is translated to `x = -256` but stays in the layout and the tab order: 14 of 35 tab stops are off-screen, starting with the brand link, so the first Tab presses land on invisible targets and "Close navigation" is operable while invisible. Opened, it is not a dialog (no `role`, no `aria-modal`), focus does not move into it (`activeElement` stays `BODY`), the 22 stops behind it stay live, and `Escape` does not close it (no keydown handler exists for it at all). WCAG 2.4.3, 2.1.2, 4.1.2. | [src/components/common/Sidebar.tsx:249-255](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/components/common/Sidebar.tsx#L249) (translate only), `:272` (close button always in the order) | D-20 §(1), D-21 §2 | confirmed |
| L7-02 | P2 | `--color-ink-3 #9A958A` fails AA 1.4.3 wherever it carries meaning: 2.74:1 on paper (sidebar group headings "Workspace/Oversight/System", 12 px/500 — the only failing text node on all 19 routes), 2.98:1 on white (the 43 literal `0` data cells on `/pendency`, and every placeholder, e.g. the search hint), 2.86:1 on `surface-2` (unselected permission chip). Every other text token measured ≥ 5.10:1, so one variable change fixes all of it; `#736E66` computes to 4.9:1 on paper. | [src/index.css:57](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/index.css#L57) token, `:151-153` placeholders; consumers `Sidebar.tsx:280`, `src/pages/Pendency.tsx:84,91,142,162`, `src/pages/admin/RolePermissions.tsx:210` | D-21 §1 | confirmed |
| L7-03 | P2 | There is no way to reach the content. No skip link exists on any route (`/skip/` → 0 matches), `<main>` ([src/layouts/DashboardLayout.tsx:41](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/layouts/DashboardLayout.tsx#L41)) has `id === ""` and no `tabIndex`, so nothing could be targeted even if one were added. Combined with L7-01, a keyboard user pays 14 hidden stops plus the whole header on every single page change. WCAG 2.4.1 Bypass Blocks. | `src/layouts/DashboardLayout.tsx:41` (`<main>`, no `id`/`tabIndex`); no skip-link markup in `Header.tsx`, `Sidebar.tsx` or `DashboardLayout.tsx` | D-20 §(2), D-21 §4 | confirmed |
| L7-04 | P2 | Half of the report tables cannot be read in full without a mouse. `DataTable` wraps a fixed-min-width table in a plain `div.overflow-x-auto` with no `tabIndex`, no `role="region"`, no label. At 632 px the container is 588–590 px and the table is 640–1113 px, so 52–525 px of columns are clipped. Where the clipped cells hold controls, Tab works (measured: focusing the last "Deactivate" scrolled `scrollLeft` 0 → 332 and brought it fully inside) — but `/reports`' SLA table has **0 focusable elements and 13 clipped text cells** ("SLA breached", "Due soon", "Average age (days)", "Target days") and `/pendency`'s third table has 0 focusable and 9. WCAG 2.1.1. | [src/components/ui/DataTable.tsx:45-51](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/components/ui/DataTable.tsx#L45) | D-21 §5 | confirmed |
| L7-05 | P2 | Validation is visual only. `Field` renders its error as `<p id="{htmlFor}-error" role="alert">` and its hint as `<p id="{htmlFor}-hint">`, but `aria-describedby` appears **zero** times in `src/**/*.tsx`, so neither paragraph is attached to the control; the CSS hook `aria-[invalid=true]:border-danger` (`Field.tsx:6`) is dead code because nothing ever sets `aria-invalid`. A screen-reader user focusing a rejected field hears its label and "required", never the reason, and the red border is the only signal (1.3.1, 3.3.1, 1.4.1). | `src/components/ui/Field.tsx:6,34,39` and every consumer (`Documents.tsx:942` reject reason, `ApplicationDetailModal.tsx:180,194`, `ScheduleEVCModal.tsx:166-191`, `Compliance.tsx:819`) | D-21 §4 | confirmed |
| L7-06 | P2 | The three busiest dynamic surfaces announce nothing: 0 `[aria-live]`, 0 `[role=status]`, 0 `[role=alert]` nodes exist at rest on all 17 probed routes, and toasts only mount transiently. Specifically — the global search popup (`Header.tsx:219-227`) prints "N matches" visually only, with no `aria-expanded`/`aria-controls` on the input and no `listbox`/`combobox` role; `/applications` "Sort by date" and the filter selects replace the row set silently; the assistant's message log (`AIChatPanel.tsx:150-156`) has no `role="log"`, so a streamed reply never arrives aurally. WCAG 4.1.3. | `src/components/common/Header.tsx:219-227`; `src/components/assistant/AIChatPanel.tsx:150-156`; filter controls on `/applications` | D-21 §4 | confirmed |
| L7-07 | P2 | The drawer toggle does not expose its state or its target: measured `aria-expanded = null`, `aria-controls = null` on the live element, and its name is fixed to "Open navigation" whether open or closed — while the same component correctly does it twice elsewhere (`Header.tsx:292`, `:370`). 4.1.2 Name, Role, Value. | [src/components/common/Header.tsx:184-188](file:///C:/Users/Shiva/Downloads/project/ApoorvaSetu/src/components/common/Header.tsx#L184) | D-20 §(3), D-21 §2 | confirmed |
| L7-08 | P2 | The assistant textarea is the only control in the app with no focus indicator: it carries `outline-none` (`ChatInput.tsx:58`), which beats the base `:focus-visible` rule because Tailwind utilities layer after base. Measured with real focus: `:focus-visible` matches, `outlineStyle: "none"`, `boxShadow: "none"`, and the wrapper that declares `focus-within:shadow-raise` (`:52`) was verified byte-identical focused vs unfocused. WCAG 2.4.7. | `src/components/assistant/ChatInput.tsx:52,58`; layer order `src/index.css:103` (`@layer base`) vs `:146-148` | D-21 §7 | confirmed |
| L7-09 | P3 | Names that run numbers into words: measured accessible names "Alert center10" and "Notifications17" (badge `<span>` glued to the label), and `/reports` cards expose "9 rowsDocument validityActive land, fire…". The visible design is fine; only the name computation is wrong. | `src/components/common/Sidebar.tsx` item renderer (badge sibling), `src/pages/Reports.tsx` report-card buttons | D-20 §(4) | confirmed |
| L7-10 | P3 | Structural rough edges: `h1 → h3` skips on `/institutes` ("ABC Institute of Tech") and `/regions-officials` ("Dr. R. K. Sharma"); an empty `<th>` (zero-length header text) in the first `/pendency` table and on `/workflow`; the donut segments are click-only (`RegionalDonutChart.tsx:66-80`) although the same region filter is keyboard-reachable on `/applications`, so this is redundancy, not a trap. | `src/pages/Institutes.tsx`, `src/pages/RegionsOfficials.tsx`, `src/pages/Pendency.tsx` first table, `src/pages/Workflow.tsx` | D-21 §4, §7 | confirmed |

Fix effort: L7-01 S (add `inert`/`aria-hidden` when closed + `role="dialog"` + `useDialogFocus`
when open — the hook already exists); L7-02 S (one token + re-census, shared with L6-01);
L7-03 S; L7-04 S (three attributes in `DataTable`); L7-05 M (touch `Field` + `Input`/`Select`/
`Textarea` to pass `aria-describedby`/`aria-invalid`, mechanical after that); L7-06 M (one
polite live region in the shell + `role="log"` in the panel); L7-07 S; L7-08 S; L7-09 S; L7-10 S.

## 7.3 Checked and clean — recorded so a fix wave does not "improve" these

- Every `<th>` measured carries `scope="col"`; every table has a caption.
- No unlabelled control, no nameless button, no missing `alt`, no duplicate `id` on 19 routes.
- Dialog focus trap, `Escape`, scroll lock and focus restore all work (measured end-to-end).
- `aria-current="page"` on the active nav item; `aria-pressed` on the clock presets; `aria-valuenow`
  on the checklist progress; toasts `role="status" aria-live="polite"`.
- Native `required` is used instead of `aria-required` (correct; 0 `aria-required` is not a defect).
- Mobile does **not** lose the actions column: `/applications` at 632 px hides the table
  (`hidden md:block`) and renders 8 cards each with their own "Inspect" button (measured). The
  earlier hypothesis that officer actions vanish below `md` is disproved — see D-21 §5.
- Clipped *controls* remain keyboard-reachable because focusing them scrolls the container
  (measured on `/admin/users`).
- `prefers-reduced-motion` is honoured and `@media print` exists.

## 7.4 UX notes that are functional, not accessibility, and are filed elsewhere

The two "Valid" counts on one screen (L5-03/L6-02), the case summary being unreachable at some
widths (L5), the notification list ordering (D-17), the demo-only evidence deletion asymmetry
(D-18) and the "Tamper-proof" claim (L5-08/L9) are recorded there; L7 deliberately does not
double-count them.

## 7.5 Not measured (limits of this pass)

- **No screen-reader transcript.** NVDA/VoiceOver were not driven; all assistive-tech conclusions
  are computed from ARIA attributes, accessible names and DOM geometry, which cannot prove what a
  given reader announces.
- **No rendered screenshots** after `evidence/qa/L06_apply_03_wizard_step2_632.png`
  (`NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`), so focus-ring *appearance* is judged from computed
  styles, not pixels; colour contrast maths is exact but does not capture font hinting weight.
- **No 375 / 768 / 1280 px renders** (no viewport emulation; live viewport 632×570 CSS px, dpr
  1.25). The drawer findings therefore describe the sub-`lg` state observed at 632 px; the
  clipping numbers are for 632 px specifically and the 252–525 px overflow would shrink at 768 px
  and disappear at `xl`. Labeled as measured-at-one-width, not extrapolated.
- `/login`, `/regions-officials` cards and `/institution/profile` were not contrast-censused as
  their own personas; the ink-3 conclusion holds because it is a token, not a page.
- Zoom to 200 % / reflow at 320 px (1.4.4, 1.4.10) could not be exercised without viewport
  emulation — **suspected** only, and filed nowhere.
- Keyboard-only traversal of `/evc/my-visits`, `/evc-scheduling`, `/institution/profile` as their
  own personas is still open; see the not-run ledger in `00-baseline.md`.
