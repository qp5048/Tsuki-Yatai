# Design

This repository holds three portfolio sites, each with its own visual world. Tsuki Yatai (`tsuki-yatai/`) and Hearthnet (`hearthnet/`) keep the tokens at the top of their own `css/style.css`. This file records the newest world, Valvskolan (`skolan/`), built from its direction contract in `.impeccable/surfaces/skolan-index-html.md`.

## Valvskolan — a school under the rock

Every page is a Stockholm metro station: whitewashed bedrock, a vault painted by an artist, and signage for everything practical.

### Colour
Restrained ground, committed paint per page.

| Token | Value | Role |
|---|---|---|
| `--rock` | `#eef0ed` | Page ground, under a generated rock-relief texture (SVG feTurbulence + feDiffuseLighting at 34% strength) |
| `--rock-2` / `--rock-edge` | `#e2e6e2` / `#c7cdc9` | Quiet panels, hairlines cut into the rock |
| `--ink` / `--ink-2` / `--ink-3` | `#1b2023` / `#4b5459` / `#626b70` | Graphite text, all ≥5:1 on rock |
| `--plate` | `#163563` | Station name plates and primary buttons |
| `--board` / `--amber` | `#0f1418` / `#ffb547` | Departure boards and their figures |
| `--line-low` / `--line-mid` / `--line-high` | `#287a3a` / `#d23b2e` / `#1f6ec4` | Year groups drawn as metro lines: F–3 green, 4–6 red, 7–9 blue |
| `--paint`, `--paint-2`, `--paint-ink` | per page | The station's painting: cobalt (home), spruce (timetable), night (calendar), sky (news), clay (about) |

Text never sits on paint without a solid plate or the rock behind it.

### Type
- **Familjen Grotesk** (Stockholm foundry Familjen) for everything: 700 for plates and headings, 400–600 for text. Scale steps `--step--1` to `--step-5` (display max 6rem).
- **Azeret Mono** only for times and dates on boards and lists, with tabular figures.

### Signature components
- **Vault** (`js/paint.js`): a seeded, rough-rimmed superellipse vault drawn in SVG, fitted to each element's shape, with a generative painting (vines, forest, stars, arcs, waves). It brushes itself on once at load; reduced motion shows it finished.
- **Station plate** (`.plate`): navy with a white inner keyline; the logo and every page title.
- **Departure board** (`.board`): dark panel, amber times, a "Now" tag, rows that flap in when the class changes.
- **Line navigation** (`.line-nav`): pages as stations on a rail; the current page is the filled stop.
- **Line bullets** (`.bullet`): year-group discs reused in filters, lists and the calendar.
- **Platform edge**: the footer opens with the yellow platform stripe.

### Shape and depth
Signs are rectangles with 8–14px radii, never pills (chips are the only round controls). Shadows are offset and soft, tinted navy or graphite.

### Motion
One authored moment per page (the painting brushing on), plus responsive motion only: board rows flapping on class change, the toast sliding up. Everything is visible before animation and respects `prefers-reduced-motion`.

### Layout
Max width 1240px, gutter `clamp(16px, 4vw, 48px)` plus safe-area insets. Lists are ruled (3px graphite rule on top, hairlines between rows) instead of cards; panels appear only where a tool needs a surface (details, allergens, booking).
