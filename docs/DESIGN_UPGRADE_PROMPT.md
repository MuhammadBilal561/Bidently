# Bidently — Design Upgrade Prompt

Reference for the Bidently design system. Use these tokens and motion rules
consistently across every screen; do not introduce ad-hoc colors, fonts, or
animation values.

## Visual language

A paper-based, editorial aesthetic: cool paper background, ink-navy text, and a
single "forge ember" accent reserved for the brand mark, primary actions, and
source-citation highlights — not spread across the UI.

## Color tokens (`app/globals.css`)

| Token | Purpose |
|---|---|
| `--paper` | Page background |
| `--surface` | Cards, panels, inputs |
| `--ink` | Primary text |
| `--slate` | Secondary/muted text |
| `--slate-line` | Hairline borders, dividers |
| `--ember` | Brand mark, primary action, citation highlight |
| `--ember-soft` | Selection / ember tint backgrounds |
| `--verified` / `--verified-soft` | Positive states |
| `--attention` / `--attention-soft` | Warning states |

## Shadow tokens

| Token | Use |
|---|---|
| `--shadow-resting` | Default card resting state |
| `--shadow-hover` | Hover / raised card |
| `--shadow-floating` | Modals, popovers, dropdowns |

Shadows are tuned to `--ink` at low opacity so they belong to the palette.

## Typography

- **Display** — Fraunces (`--font-display`): headings, brand
- **Body** — Public Sans (`--font-sans`): interface text
- **Data** — IBM Plex Mono (`--font-mono`): tables, citations, data

## Motion tokens (`lib/motion.ts`)

- ~150ms micro-interactions: hover, press, toggles
- ~300ms panel/card enter-exit, expand/collapse
- ~500ms page-level / section reveals
- Entrances use the expo-out `entrance` easing; state changes use the symmetric
  `stateChange` easing
- Section reveals translate by `revealOffset` (24px) via `whileInView`

Import tokens from `lib/motion.ts` and use `transition={enterTransition(0.1)}`
or `stateTransition()` rather than inventing per-component durations.

## Accessibility

- Keep the `:focus-visible` outline (2px ember, 2px offset) visible on every
  interactive element.
- `prefers-reduced-motion: reduce` disables non-essential animation globally —
  do not bypass it.
