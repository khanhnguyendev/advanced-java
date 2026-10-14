---
name: advanced-java reader
description: A quiet engineer's quadrille notebook for reading Java architecture notes in English, Vietnamese and Chinese.
colors:
  paper: "#f4f8fc"
  ink: "#10151f"
  ink-muted: "#46526a"
  grid: "#cfdbea"
  rule: "#b9c7da"
  cobalt: "#1f4fd8"
  paper-night: "#0a2540"
  ink-night: "#e8f1ff"
  ink-muted-night: "#a9bfdc"
  grid-night: "#1d4066"
  rule-night: "#3f6fa6"
  cobalt-night: "#7fb0ff"
typography:
  display:
    fontFamily: "Source Serif 4, Noto Serif, Georgia, serif"
    fontSize: "clamp(1.6rem, 6vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Source Serif 4, Noto Serif, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  body-zh:
    fontFamily: "Noto Serif SC, Songti SC, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.9
  ui:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.2
  label:
    fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.02em"
    lineHeight: 1.4
rounded:
  control: "2px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "2rem"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.3rem 0.6rem"
  button-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.cobalt}"
  input-search:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.35rem 0.55rem"
  notice:
    textColor: "{colors.ink-muted}"
    padding: "0.25rem 0.75rem"
---

# Design System: advanced-java reader

## Overview

**Creative North Star: "The Quadrille Notebook"**

A reading site that behaves like an engineer's grid-paper notebook: the grid is structure, never a texture behind running text. Light is cool blue-white paper with near-black ink and one cobalt accent; dark is a cyanotype (deep Prussian blue with white linework). Body is serif for long reading, chrome is a humanist sans, labels and catalog IDs are mono.

Density is calm and reference-like. Notices are dotted-ruled margin notes, controls are thin-ruled and flat, and nothing is boxed in a card. Translation status is not shown anywhere in the UI (owner decision, 2026-10-14).

**Key Characteristics:**
- One accent (cobalt); no second hue anywhere.
- Grid paper appears only in the outer margins (about 6% visual weight); the reading column paints solid paper.
- Ruled rows (1px ink, dotted ink-muted) replace cards and shadows.
- Catalog IDs (HC-02) in mono as stable, citeable handles.
- Same layout in vi, en and zh; CJK uses its own font only inside `:lang(zh)`.

## Colors

A two-ground palette: paper and ink, with cobalt as the only chromatic voice.

### Primary
- **Cobalt Ink** (#1f4fd8 light / #7fb0ff dark): links in prose, the current doc, focus rings, selection tint, the active language underline.

### Neutral
- **Grid Paper** (#f4f8fc) / **Cyanotype Field** (#0a2540): page ground.
- **Pen Ink** (#10151f) / **Chalk White** (#e8f1ff): text, 1px structural rules.
- **Pencil** (#46526a) / **Faded Linework** (#a9bfdc): secondary text, control borders, notices.
- **Grid Line** (#cfdbea) / **Blueprint Grid** (#1d4066): the quadrille grid in margins only.
- **Ruling** (#b9c7da) / **Blueprint Rule** (#3f6fa6): table borders, code block borders, dotted dividers.

### Named Rules
**The One Voice Rule.** Cobalt marks interaction and place (links, current item, focus). It never fills large areas and never decorates.

**The Margin Grid Rule.** The grid is painted on the shell only; `.reader` and `.shelf` cover it. Reading mode removes it entirely. At 960px and below the shell is one column and the grid is not painted at all.

## Typography

**Display / Body:** Source Serif 4 (with Noto Serif, Georgia)
**UI:** Be Vietnam Pro (with system-ui, PingFang SC, Microsoft YaHei)
**Label / Mono:** JetBrains Mono (with ui-monospace, Menlo)
**CJK:** Noto Serif SC, loaded only for `:lang(zh)` content, never preloaded.

**Character:** a bookish serif for reading with a precise sans and mono for the apparatus around it.

### Hierarchy
- **Display** (700, clamp(1.6rem, 6vw, 2.25rem), 1.25): page H1; balanced wrapping.
- **Body** (400, 1rem, 1.7; zh 1.9): reading text; measure 66ch (zh 38em).
- **UI** (400, 0.8125rem, 1.2): top bar, buttons, search, rails.
- **Label** (mono 500, 0.75rem, 0.02em): rail group labels, "On this page", catalog IDs.

### Named Rules
**The Chrome Never Loads CJK Rule.** UI chrome uses system Han fonts; the CJK web font is requested only by zh prose.

## Layout

Three-column shell inside a full-bleed grid: left rail (220-280px), reading column, right rail (200-260px). The 90rem cap is carried by the grid columns (flexible outer columns absorb the rest), so the grid background and the top bar rule run edge to edge. The rails are sticky under the top bar and scroll inside themselves; section groups in the left rail are collapsible `<details>` with the current section open. The sticky `.topbar-slot` spans all columns and publishes its measured height as `--topbar-h` for sticky offsets and anchor scroll margins; the top bar itself only sets a minimum height. Header, notice, actions and body share one reading-column edge.

At 960px and below the shell is one column, the shell grid background is not painted, and `.reader` and `.shelf` share a 16px gutter and the rails are removed. Doc pages gain a fixed bottom dock (Previous, Next, Language, Contents, Menu): Contents opens the TOC and steps in a bottom sheet (70dvh cap), Menu opens the section tree in a left drawer with a Theme control, Language opens a small popover. Pages without a dock (home, collection, section, about) put Language, with Theme in its footer, behind a compact button in the top bar. All three are native `<dialog>` elements opened with `showModal()`; the page behind them does not scroll. Spacing rhythm: 0.25 / 0.5 / 1 / 2rem.

## Elevation & Depth

Flat. Depth is conveyed by rules (1px solid for structure, 1px dotted for secondary division) and by the paper/grid contrast. The only shadow is the search results popover (a soft ambient 0 6px 16px -8px at 40% ink), used because it floats over content. Modal dialogs (drawer, sheet, language popover) sit on a flat backdrop of 45% ink; they carry a 1px Pencil rule, no shadow.

## Shapes

Square-ish: 2px control radius, 1px borders, no pills. Indicators are text-based (a 1px ink rule marks the current rail row; the active language is bold with a 2px cobalt underline).

## Components

### Buttons
- **Shape:** 2px radius, 1px Pencil border, transparent fill, 0.8125rem UI sans.
- **Hover / Focus:** 10% cobalt wash and cobalt border; focus-visible is a 2px cobalt outline with 2px offset. Pressed toggles add a 2px inset cobalt underline. 44px minimum height on coarse pointers.

### Inputs / Fields
- **Style:** the search field matches the buttons (paper fill, 1px Pencil border, 2px radius); hover darkens the border to ink.

### Navigation
- **Top bar:** brand, search, segmented language switcher, theme and reading-mode controls on one ruled strip. At 960px and below it is a single row: brand, search and a compact language button (pages without a dock).
- **Dock and dialogs (<=960px):** bottom dock with Previous / Next as links (unavailable side is plain muted text), and Language / Contents / Menu as buttons; 44px targets. Dialogs close with Esc, the Close button or a backdrop tap; tapping an in-page link closes the sheet or drawer and moves focus to the target heading.
- **Language switcher:** bordered segmented list; current locale bold with cobalt underline; language names only, no status markers or status text.
- **Rails:** mono group labels, dense rows with mono catalog IDs, current row in cobalt with a 1px ink left rule.

### Notices
- Dotted 2px left rule, Pencil text, no fill; used for the resume note only. There are no translation-status notices (machine, stale, fallback).

### Shelf spines
- Ruled rows: ID range in mono at left, title at right, with no per-locale counts; 1px ink top rule, dotted row dividers.

### Home index rows
- Home (single collection): a start/resume action, a normal sans "Sections" heading, then one ruled row per section: ID range (mono), title, and doc count; no translation counts or status. Rows are at least 44px tall.

## Do's and Don'ts

### Do:
- **Do** use cobalt only for links, current place and focus.
- **Do** mark every status with text or shape, never color alone.
- **Do** keep reading text on solid paper at 66ch (zh 38em).
- **Do** use ruled rows (1px / dotted) to group content.

### Don't:
- **Don't** put the grid behind running text or add card containers.
- **Don't** add a second accent color, gradients or hard offset shadows.
- **Don't** load the CJK web font from UI chrome or preload it.

## Known drift (not canonized)
- Small mono label "On this page" and rail group labels sit near the craft-floor "eyebrow" line; they are functional navigation labels, not decorative kickers, and should not be reused as a kicker pattern on new surfaces.
- Wide `pre` blocks and diagrams become focusable, labelled scroll regions on the client (`ScrollRegions`), only where they actually overflow; the render pipeline itself does not add `tabindex`.
- The left rail is rendered twice on doc pages (rail and drawer); a known duplication cost.
- Section groups in the left rail put their heading inside `<summary>`; VoiceOver flattens headings inside a summary, so they are not navigable as headings.
- Reading mode only switches the grid background off; it has no other effect and no control on small screens.
- Translation status UI (per-page notices, switcher markers, per-locale counts) was removed by the owner on 2026-10-14; this knowingly overrides PRODUCT.md principle 3 as originally written.
