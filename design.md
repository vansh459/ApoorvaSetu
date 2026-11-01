# ApoorvaSetu design system

Locked 2026-11-01. Every screen uses these tokens; do not introduce a colour, font, radius or
shadow outside this file and `src/index.css`.

**Idea:** a calm institutional desk. Warm paper, quiet ink, one cobalt thread. The work is the only
loud thing on the screen.

## Colour

| Token | Value | Use |
|---|---|---|
| `paper` | `#F7F5F1` | app ground, sidebar, login left |
| `surface` | `#FFFFFF` | cards, header, modals, sheets |
| `surface-2` | `#FBFAF7` | inset fields, table heads, quiet bands |
| `line` | `#E7E2D8` | hairlines, dividers, card borders |
| `line-strong` | `#D5CFC2` | control borders, scrollbar thumb |
| `ink` | `#17181B` | headings, body |
| `ink-2` | `#6B6862` | secondary copy, labels (≈5:1 on paper) |
| `ink-3` | `#9A958A` | icons and disabled only, never body text |
| `action` | `#17181B` | primary buttons (near-black) |
| `accent` | `#2B4C7E` | links, active nav, focus ring, info |
| `accent-soft` | `#EDF1F7` | active tints, selected rows |
| `success` / `-soft` | `#1F6B45` / `#E9F2EC` | approved, verified, resolved |
| `warning` / `-soft` | `#8A5A12` / `#FAF1E0` | pending, approaching, due soon |
| `danger` / `-soft` | `#97302A` / `#F8EAE8` | breached, rejected, overdue |
| `chart-1…6` | cobalt, teal, ochre, plum, clay, slate | charts only |

Rules: one accent per screen. Status colour only appears in badges, chart marks and small icons.
No gradients except the `.wash-accent` ambient wash behind the login panel.

## Type

Manrope, 400–700 (self-hosted variable, `public/fonts/`). 600 is the display weight; 700 is emphasis.

| Role | Size / line | Class |
|---|---|---|
| Caption, badge, table meta | 12 / 16 | `text-xs` |
| Label, nav, controls | 13 / 18 | `text-label` |
| Body | 14 / 21 | `text-sm` |
| Lead | 16 / 24 | `text-base` |
| Section title | 20 / 28 | `text-xl` |
| Page title | 24 / 32 | `text-2xl` |
| Display | 32 / 40 | `text-3xl` |
| Hero (login only) | 40 / 44 | `text-display` |

Never use 10px or 11px. Labels are sentence case — no tracked capitals, no eyebrow pills.
Numbers use tabular figures (set on `body`).

## Space, shape, elevation

- 4px base, 8px rhythm. Section gap 24px; card padding 20–24px; page gutter 16 / 24 / 40 / 64px.
- Content cap `max-w-app` (1440px); gutters grow at 1920, the measure does not.
- Radii: `rounded-control` 10px (inputs, buttons), `rounded-card` 14px (surfaces),
  `rounded-modal` 20px (dialogs, sheets), `rounded-full` for pills and badges.
- Elevation: `shadow-raise` for resting interactive cards and the active nav pill,
  `shadow-lift` for hover and the login card, `shadow-overlay` for popovers and modals.
  No coloured shadows, no `shadow-2xl`.

## Motion

Only `transform` and `opacity`. Nothing animates width, height, top or left.

| Element | Motion | Duration |
|---|---|---|
| Page change | fade + 6px rise | 220ms `ease-swift` |
| Modal | backdrop fade; panel fade + 4px + scale .985 | 140 / 180ms |
| Popover | fade + 4px | 140ms |
| Toast | fade + 8px | 180ms |
| Button press | scale .98 | 120ms |
| Interactive card | lift 2px + shadow | 180ms |
| Progress bar | scaleX from left | 450ms |

`prefers-reduced-motion` removes all of it; spinners keep rotating.

## Glass

Only four surfaces: the sticky header (`glass-header`), modal backdrop, assistant panel, mobile
scrim. Never on cards, tables or stat tiles.

## Components

- `Button` primary = ink fill; secondary = white + hairline; ghost = transparent; danger = danger
  soft/full only for destructive confirmation; link = accent text.
- `Card` is the only surface. No card inside a card; use a hairline divider instead.
- `PageHeader` opens every page: title 24/32, one-line description, actions on the right.
- `StatTile` is the only KPI shape: label, value 30/36 semibold, optional delta and 18px icon.
- `Badge` is the only status shape; tone comes from `statusTone()`.
- `DataTable` is the only table shell: 12px sentence-case header on `surface-2`, 52px rows,
  hairline dividers, hover wash, tabular numbers, keyboard-activatable rows.
- `Modal`/`Drawer` are the only overlays: portal, labelled, focus-trapped, restored.
- `Field` is the only form control set: label above, 13px, hint/error below, 40px control.
- The assistant lives behind one header icon button (`aria-pressed` while open); it opens as a
  bottom-right panel, so no floating launcher ever sits over page actions.

## Copy

Sentence case. No exclamation marks. No emoji. Numbers are never invented. Empty states say what
is empty and what to do next.
