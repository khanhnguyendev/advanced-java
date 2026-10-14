# Redrawn, localized diagrams (design spec, draft for approval)

Status: Phase 1 and 2 APPROVED 2026-10-14 (decisions in section 0). Pilot in progress. Full inventory: `docs/superpowers/reports/image-inventory.md`.

## 0. Owner decisions (2026-10-14)

1. Provenance: the 22 diagrams in the five excluded docs are out of scope and keep their raster image and the existing original-source credit. Core scope is 87.
2. Credit wording (3.7) approved as written.
3. The 8 Eureka diagrams are held with their doc (audit row 6) and are redrawn only if that doc is cleared. Full-run scope is 79 unless row 6 resolves first.
4. IDE and UI screenshots stay raster. Follow-up (not in this run): replace the five IDE captures with code blocks.
5. Typed SVG renderer confirmed: pure Node, deterministic, inline SVG with theme tokens.
6. Remaining classes: redraw the plain timeline (`Homogenizer-mode.jpg`; `basic-pipeline.png` is in an excluded doc and stays raster); dashboard captures stay raster. `lru.png` (classified "other") is a plain linked-list diagram and is redrawn. Net scope: 79 + 2 = 81, minus 5 pilot = 76 remaining after the pilot, or 68 if the Eureka 8 stay held (the 79 already excluded them: 79 = 87 - 8; 81 includes `lru.png` and `Homogenizer-mode.jpg`).
   - Dropped in the full run (not during the pilot): `220px-Internet_dog.jpg`, referenced at `{zh,en,vi}/high-availability/hystrix-timeout.md` (line 9 in zh, 17 in en and vi); the image line and any blank line it leaves are removed together. `bulkhead-partition.jpg` is kept (it carries the bulkhead metaphor, referenced at `hystrix-thread-pool-current-limiting.md`). `BRP.jpg` kept (wordless). Scale cube and Conway's Law stay (excluded docs).

Licensing of redrawn diagrams: every diagram under `content/` is CC-BY-SA-4.0, credited as redrawn from the upstream image at commit 1a35221. A diagram may carry `"license": "original"` in its source file only when drawn from the concept with its own layout, not traced from the upstream arrangement; the default is `"derived"`. Code stays MIT, content CC-BY-SA-4.0; neither LICENSE file changes.

Sequence mode is dropped from the renderer: the 79-diagram scope contains no true sequence diagram (all 8 are Eureka and held). Add it only if the Eureka doc is cleared.

## 1. Inventory summary (Phase 1)

126 images, each referenced by exactly one doc (49 docs). 119 PNG, 7 JPG. Classified by a vision pass on 2026-10-14; label counts are approximate.

| Class | Count | Redraw? |
|---|---|---|
| Architecture / flow diagram | 100 | yes (minus excluded docs, below) |
| Sequence diagram | 9 | yes (8 are Eureka, 1 request-sequence) |
| Table / text screenshot (IDE, Eureka UI, Sentinel UI) | 7 | no, keep raster |
| Chart | 3 | no, keep raster (2 are Sentinel dashboard captures; `basic-pipeline.png` is a simple timeline and could be redrawn) |
| Photo / branding | 2 | no (cartoon, ship illustration) |
| Other | 5 | no, see below |

By section: high-concurrency 51, micro-services 40, distributed-system 18, high-availability 17, big-data 1 (only `topk-trie.png`).

Label language across all 126: mixed zh+en 58, English-only 46, zh-only 21, none 1. About 1,440 labels in total. 64 images carry code or identifiers that must stay untranslated (class and method names, `productId=1`, `offset=152`, `col1`, `RDB`, `binlog`, ES and Kafka terms).

Diagrams in scope (architecture + sequence = 109):

- 22 sit in the five docs whose translation the owner excluded (Fowler/Richardson). Third-party work; see 2.
- 87 are core: 57 mixed, 21 zh, 9 en; 40 simple, 31 medium, 16 dense; 47 contain code labels; about 940 labels.
- Of the 87, 8 are in the Eureka doc, whose translation is still `pending` (source unknown).
- 78 need zh keys translated into en and vi. 9 are already English: their `en` keys are the original text and only `zh` and `vi` are new.

Not redrawn, with proposal:

| Image | Class | Proposal |
|---|---|---|
| `eureka-server-registry-structure.png`, `…instanceresource-cancellease.png`, `…applicationresource-addinstance.png`, `…instanceresource-renew.png`, `…service-consumer-fetchregistry.png` | IDE screenshots of Java | Keep raster. Better long term: replace with a code block in the doc (text is searchable and translatable comments). Owner call. |
| `eureka-server-homepage.png`, `eureka-instance-registered-currently.png` | Eureka web UI | Keep raster. English UI, nothing to localize. |
| `Sentinel-Dashboard.jpg`, `Slow-Start-Preheating-Mode.jpg` | Dashboard captures | Keep raster, English UI. |
| `Homogenizer-mode.jpg`, `basic-pipeline.png` | Simple English timelines | Keep raster or redraw; low value. |
| `BRP.jpg` | Wordless illustration | Keep raster. |
| `220px-Internet_dog.jpg` | New Yorker cartoon, low-res | Drop candidate: third-party, 220px, English caption only. Owner call. |
| `bulkhead-partition.jpg` | Ship illustration, low-res | Keep or drop; third-party illustration. Owner call. |
| `deal-with-complex-things-2.png`, `conways-law.png`, `lru.png` (classified "other") | Scale cube, Conway's Law, LRU list | The first two are Fowler/Richardson (excluded docs). `lru.png` is a plain linked-list diagram and is redrawable; treat as a diagram. |

## 2. Provenance caveat (needs an owner decision before any run)

Redrawing a diagram does not make it our own work if it is a copy of someone else's figure. Upstream records no authorship (open item U16). Of the 109 diagrams:

- 22 appear in docs that are translations of Fowler/Lewis or Richardson/NGINX articles. The figures are those authors' work (the English-only hexagon diagrams, the scale cube, the sketch, Conway's Law). Redrawn copies would still be derivatives of third-party figures, and the credit line "redrawn from the upstream image, CC-BY-SA-4.0" would assert a licence we cannot grant.
- The rest are Chinese-authored upstream diagrams of unknown provenance. Redrawing them is a closer call but the same logic applies to the label layout; some were themselves redrawn from blog posts.

Recommendation: exclude the 22 from the run (consistent with the owner's exclusion of those docs). For the 87 core diagrams, phrase the credit as fact, not licence: "Redrawn from the upstream image at commit 1a35221 (doocs/advanced-java, CC-BY-SA-4.0). Original authorship not documented upstream." That is what the requested wording says; I would not claim more. If the owner wants the stronger claim, U16 needs resolving first.

## 3. Pipeline design (Phase 2)

### 3.1 Source files

```
content/<collection>/_diagrams/<section>/<slug>/<name>.diagram.json      # structure, locale-independent
content/<collection>/_diagrams/<section>/<slug>/<name>.labels.zh.json    # keys -> original text (source)
content/<collection>/_diagrams/<section>/<slug>/<name>.labels.en.json
content/<collection>/_diagrams/<section>/<slug>/<name>.labels.vi.json
```

`<name>.diagram.json` holds a scene: a grid size, nodes (`id`, kind, x, y, w, h in grid units, `label` key), edges (from, to, waypoints, `label` key, arrowheads), groups, and for sequence diagrams lifelines and messages. Text never appears in it, only keys. `labels.<locale>.json` is `{ "key": "text" }`.

- Identifiers that must not be translated are marked in the structure with `"literal": true`. They live in the structure, not the label files, so they can never diverge per locale.
- The zh file is the reference, taken from the original image. For the 9 English-origin core diagrams the zh file holds the English text, flagged `"source_lang": "en"`; zh and vi are then translations. The review page shows which side is original.
- en and vi go through the same glossary (`glossary.en.json`, `glossary.vi.json`) and translation gate as prose, `status: machine`, with a staleness hash over the zh label file (same mechanism as 4.7 of the main spec).

### 3.2 Mermaid vs hand-written SVG: recommendation

Recommend a **small typed SVG renderer** (a TS module that takes the scene JSON and labels and emits SVG), not Mermaid.

| | Mermaid | Typed SVG renderer |
|---|---|---|
| Build-time render | Needs a headless browser (mermaid-cli/puppeteer) or jsdom shims; heavy and flaky in CI | Pure Node, deterministic, no browser |
| Fidelity to upstream layouts | Auto-layout, ours would differ; crossing arrows (hystrix-request-cache) and free-form hand-drawn layouts cannot be reproduced | Explicit coordinates reproduce the original arrangement |
| Quadrille / cyanotype styling | Theme variables only; fonts and dark mode are patchy | Full control; uses site tokens directly |
| CJK and text fit | Measures text in the browser at render time | Our own measurement via font metrics (see gate) |
| Authoring cost per diagram | Lowest | Higher: coordinates by hand |
| Sequence diagrams | Good fit | Needs a small sequence template (lifelines + messages); 9 diagrams |

Split by class: scene renderer for the 100 flow/architecture diagrams; same renderer with a sequence layout mode for the 9 sequence diagrams. No Mermaid dependency. Authoring cost is mitigated by shared primitives (box, cylinder for DB, queue, cloud, arrow styles) and by the pilot measuring real cost before committing.

Rejected: image-to-SVG tracing (not editable, labels not extractable), image-generation models (excluded by the brief).

### 3.3 Rendering and theme

- Render at build time to static SVG. Output is inlined into the page HTML by a rehype stage that runs after `rehype-sanitize` and only emits SVG from our own renderer (never from authored content), so the sanitize schema (img src restricted to `/_content/`) stays unchanged.
- Inline SVG, not `<img>`, so it inherits the page's CSS variables. Strokes and fills use `var(--ink)`, `var(--grid)`, `var(--rule)`, `var(--cobalt)` and the dark-mode token set already defined in `DESIGN.md`; no hard-coded colours. Dark mode follows automatically.
- Fonts: labels use the site's UI sans (Be Vietnam Pro) and mono (JetBrains Mono) for literals, with Noto Serif SC fallback for Han via the same stacks as the page. No font embedding in the SVG.
- Each SVG has `role="img"`, `<title>` and `<desc>` from per-locale keys (`_title`, `_desc`). The doc's `alt` text stays the source of truth for the figure caption.
- Responsive: `viewBox` with `width:100%; height:auto`; reading column width is the design width. Wide diagrams (>720 design units) get a horizontal scroll container on mobile and a minimum text size, not shrinking below 11px effective.

### 3.4 Referencing from content

Markdown keeps the image node, with a new scheme:

```
![alt](diagram:distributed-system/distributed-transaction/xa)
```

Same node type as `asset:`, so the structure hash and `check:translations` need no change beyond allowing the `diagram:` scheme. The render pipeline resolves it to the SVG for the **rendered body language**. Fallback docs (a zh body shown on an en page) render the zh labels, same rule as text. A diagram missing its locale file falls back to zh labels and the page shows the existing fallback notice; the gate (3.6) makes that a build error for en and vi on any doc that is translated.

During the pilot nothing in `content/*/{zh,en,vi}` changes. Pilot SVGs render only on the review page.

### 3.5 Review tooling

A dev/preview-only route `/review/diagrams` (excluded from the production sitemap and search index, `noindex`) listing every diagram: upstream raster on the left, redrawn SVG on the right, a locale switcher (zh/en/vi), light/dark toggle, and a mobile-width toggle. Each row shows gate status and the label-key diff. A script `pnpm diagrams:review` builds the same page as a static HTML file for local use. The preview deployment carries this route.

### 3.6 Gate (`pnpm check:diagrams`)

1. Every label key referenced in the structure exists in zh, en and vi; no orphan keys.
2. No Han characters in en/vi labels except inside `literal` identifiers.
3. Every `literal` appears byte-identical in all locales.
4. Text fit: each label's measured width (font metrics from the shipped font files, CJK at 1em) fits its box at the font size used, in all three locales; vi is usually the widest. Failure lists the node and locale.
5. Rendered SVG bounding box within `viewBox`; no node overlap; arrows end on node boundaries.
6. Render at 720px column and 360px mobile width without overflow (checked by a Playwright screenshot assertion on the review page, in light and dark).
7. Accessibility: `<title>` present per locale; contrast of ink on paper meets AA in both themes (tokens already verified; check not to regress).
8. Staleness: en/vi label files carry the hash of the zh file they were translated from.

### 3.7 Attribution

- `/about` and the per-image credit list: each redrawn diagram is listed as "Redrawn from the upstream image at commit 1a35221 (doocs/advanced-java), CC-BY-SA-4.0. Original authorship not documented upstream." Rows link to the upstream path.
- `content/ASSETS.md` gains a "Redrawn diagrams" section with the same statement and the mapping from diagram name to upstream image.
- Diagram `<desc>` carries no licence text; the credit lives in the figure caption area of the page, quiet like the existing notices.

## 4. Phase 3 pilot (proposed set, not started)

Chosen from the 87 core diagrams so each class and each risk is covered:

| # | Image | Why |
|---|---|---|
| 1 | `distributed-system/distributed-transaction/distributed-transaction-XA.png` | Simple box-and-arrow, zh only, 6 labels |
| 2 | `high-concurrency/high-concurrency-design/high-concurrency-system-design.png` | Dense architecture, 20 labels, groups and flows, has an upstream typo in a label |
| 3 | `distributed-system/distributed-system-request-sequence/distributed-system-request-sequence.png` | The one non-Eureka "sequence" image; on inspection a flow diagram with `orderId=1` literals, vertical text in queue boxes. Replaces the Eureka sequence chart per decision 3 |
| 4 | `high-availability/hystrix-request-cache/hystrix-request-cache.png` | Code-label diagram (`productId=1`), crossing arrows |
| 5 | `big-data/topk-problems-and-solutions/topk-trie.png` | The only big-data image; English letters, tests the en-origin path and non-box geometry (a tree) |

Pilot outputs: zh, en, vi SVG for each, gate run, review page on a preview deployment, token measurement, projected cost and time for the remaining 82.

## 5. Open decisions for the owner

1. Exclude the 22 Fowler/Richardson diagrams from the run (recommended), or redraw them with a credit to those authors.
2. Credit wording (3.7) is factual and does not claim a licence over third-party figures; confirm or resolve U16 first.
3. IDE screenshots: keep raster, or replace with code blocks in the doc (separate, content-changing task).
4. Drop `220px-Internet_dog.jpg` and `bulkhead-partition.jpg`, or keep with credit.
5. Eureka doc: 8 diagrams are in a `pending` doc. Redraw them in the run, or wait for the source decision.
6. Confirm the typed SVG renderer over Mermaid.
