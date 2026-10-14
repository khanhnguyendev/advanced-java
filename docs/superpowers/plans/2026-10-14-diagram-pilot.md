# Diagram pilot plan (approved scope: spec section 0, 3, 4)

No new dependencies. Upstream images and served docs are not touched. Branch `diagrams-pilot`.

## Data model (fixed; implementers must not change it)

Location: `content/advanced-java/_diagrams/<section>/<slug>/<name>.diagram.json` and `<name>.labels.<zh|en|vi>.json`.

`<name>.diagram.json`:

```json
{
  "id": "<section>/<slug>/<name>",
  "source": { "upstream": "<_assets key, e.g. distributed-system/distributed-transaction/distributed-transaction-XA.png>", "commit": "1a35221" },
  "license": "derived",
  "size": { "w": 560, "h": 360 },
  "nodes": [
    { "id": "n1", "shape": "box|round|pill|circle|group", "x": 0, "y": 0, "w": 120, "h": 48,
      "label": { "key": "n1", "literals": ["productId=1"] }, "role": "default|accent|muted" }
  ],
  "edges": [
    { "points": [[x,y],[x,y]], "arrow": "end|both|none", "style": "solid|dashed|accent",
      "label": { "key": "e1", "at": [x,y], "anchor": "start|middle|end", "literals": [] } }
  ],
  "texts": [ { "key": "t1", "x": 0, "y": 0, "anchor": "start|middle|end", "literals": [] } ],
  "title_key": "_title",
  "desc_key": "_desc"
}
```

- Coordinates are SVG user units in a `viewBox` of `size`. Node `label` text is centred in the node and wrapped to `w - 2*pad` (pad 8); `\n` in a label is a hard line break.
- `literals`: substrings that must appear verbatim in every locale's text for that key; rendered in the mono font; never translated.
- `license` defaults to `"derived"`; `"original"` only when the layout is not traced from the upstream image.
- Shapes: `box` rx 2, `round` rx 10, `pill` rx h/2, `circle` (w == h), `group` = dotted-rule container, no fill, label top-left.

`<name>.labels.<locale>.json`:

```json
{ "meta": { "locale": "zh|en|vi", "status": "source|machine", "from": "<sha256 hex of the zh labels file bytes, en/vi only>", "source_lang": "zh|en" },
  "labels": { "<key>": "<text>", "_title": "...", "_desc": "..." } }
```

`zh` has `status: "source"` (for the 1 English-origin diagram `topk-trie`, zh and vi are translations: `source_lang: "en"`, the en file is `status: "source"` and zh/vi carry `from` = sha256 of the en file; the gate reads `source_lang` from the en/zh file to pick the reference locale).

## Render rules (lib/diagrams/render.ts)

- Pure function `renderDiagram(scene, labels, locale): string`, deterministic, no I/O. Output: one `<svg>` string, `role="img"`, `viewBox`, `width="100%"`, `<title>` and `<desc>` from `_title`/`_desc`, every node `<g data-node="id">` containing its rect and text so a browser test can check bounds.
- Colours only via `var(--ink, #10151f)`, `var(--paper, #f4f8fc)`, `var(--ink-muted, #46526a)`, `var(--grid, #cfdbea)`, `var(--rule, #b9c7da)`, `var(--accent, #1f4fd8)`. Strokes 1.25. Arrowheads are `<marker>` elements with ids prefixed by a hash of the scene id (several SVGs can share a page).
- Fonts: `font-family: var(--font-ui), system-ui, "PingFang SC", "Noto Sans SC", sans-serif` for labels, `var(--font-mono), ui-monospace, Menlo, monospace` for literals; node text 13px, line-height 1.3.
- Text width estimate (lib/diagrams/measure.ts): Han and fullwidth = 1.0em; Latin/Vietnamese in UI sans = 0.56em average, uppercase 0.68em, digits 0.58em; mono = 0.62em; plus 8% safety margin. Wrapping: break at spaces for Latin/Vietnamese, between any characters for Han, never inside a literal.

## Gate (lib/diagrams/gate.ts + scripts/check-diagrams.ts; `pnpm check:diagrams`)

Pure `checkDiagram(scene, labelsByLocale)` returns `{ errors: {code, message, locale?}[] }`. Codes:

1. `KEY_MISSING`, `KEY_ORPHAN`: every key referenced exists in zh, en, vi; no unused keys (other than `_title`, `_desc`, which are required).
2. `HAN_IN_LATIN`: no Han in en/vi text outside literals.
3. `LITERAL_MISSING`: each declared literal appears verbatim in every locale for that key.
4. `OVERFLOW`: estimated wrapped text height > node `h - 2*4`, or any line wider than node `w - 2*8`, in any locale. Free texts and edge labels: line wider than the distance to `size.w` bound.
5. `OUT_OF_VIEWBOX`: any node, edge point or text anchor outside `size`.
6. `NODE_OVERLAP`: two non-group nodes' rects intersect.
7. `HASH_STALE`: en/vi `meta.from` != sha256 of reference file.
8. `LICENSE_INVALID`: `license` not `derived|original`; `SOURCE_MISSING`: `source.upstream` is not an existing file under `content/advanced-java/_assets`.
9. `META_INVALID`: locale in meta mismatches file name or status invalid.

CLI exits non-zero if any error; prints one line per error. It scans every `*.diagram.json` under `content/*/_diagrams`.

## Steps

### Task A: framework (one implementer; TDD)
Files: `lib/diagrams/{types,measure,render,gate,load}.ts`, `scripts/check-diagrams.ts`, `scripts/diagrams-png.ts` (rasterizes one diagram+locale to PNG with Playwright chromium: `pnpm diagrams:png <id> <locale> [light|dark]` -> `.diagrams-out/<name>.<locale>.<theme>.png`; add `.diagrams-out/` to `.gitignore`), `tests/diagrams/{measure,render,gate}.test.ts`, `tests/fixtures/diagrams/*` (a toy 3-node scene with all three locales), `package.json` scripts `check:diagrams` and `diagrams:png`.
Acceptance: `pnpm test` green including new tests; tests cover each gate code with one failing and one passing case; render is byte-identical across two runs; `pnpm typecheck` clean; the existing suite unchanged; `pnpm diagrams:png` works on the fixture and the PNG is readable.

### Tasks B1 to B5: one diagram each (five implementers in parallel, after A)
Each: view the upstream image, write `.diagram.json`, `labels.zh.json` (exact upstream text, including upstream typos; note the typo in `_desc` is not needed), `labels.en.json` and `labels.vi.json` using `content/advanced-java/glossary.{en,vi}.json` and the project's existing en/vi terminology in `content/advanced-java/{en,vi}`; run `pnpm check:diagrams` to zero errors; rasterize zh/en/vi in light and dark, compare with the upstream image, iterate until layout matches the upstream arrangement (same node positions within ~10%, same arrow topology, same reading order). Report: files, gate output, number of iterations, and any label you were unsure of. Do not edit any file outside `content/advanced-java/_diagrams/<section>/<slug>/`.

| Task | Upstream key | `<section>/<slug>/<name>` |
|---|---|---|
| B1 | distributed-system/distributed-transaction/distributed-transaction-XA.png | distributed-system/distributed-transaction/distributed-transaction-xa |
| B2 | high-concurrency/high-concurrency-design/high-concurrency-system-design.png | high-concurrency/high-concurrency-design/high-concurrency-system-design |
| B3 | distributed-system/distributed-system-request-sequence/distributed-system-request-sequence.png | distributed-system/distributed-system-request-sequence/distributed-system-request-sequence |
| B4 | high-availability/hystrix-request-cache/hystrix-request-cache.png | high-availability/hystrix-request-cache/hystrix-request-cache |
| B5 | big-data/topk-problems-and-solutions/topk-trie.png | big-data/topk-problems-and-solutions/topk-trie |

Known label facts (hand-verified): B1 labels `第一阶段，询问\n第二阶段，执行`, `系统`, `事务管理器`, `数据库1/2/3`. B2 has 26 label instances (3 `elastics earch`, 4 plain `数据库` boxes, 2 labelled 主库/从库) and an upstream typo `elastics earch`, kept as-is in zh and written "Elasticsearch" in en and vi; one label key per instance. B3 has 22 instances: three arrow labels (`请求1:orderId=1`, `请求2:orderId=1`, `请求2:orderId=1`, the third is an upstream duplicate of 请求2), user, 接入服务, MQ (vertical), 3 request labels, 3 `系统A`, 3 vertical `内存队列`, a stack `请求3\n请求2\n请求1`, 3 threads. B4 has 9 instances including two arrow labels `1` that the first transcription missed; literals `productId=1`, `productId=2`, `Hystrix Cache`. B5: 10 nodes root,a,c,n,s,t,n,o,d,m; labels are single letters, language-neutral: same text in all three locales (gate must allow identical text), red edges (use `accent` style).

### Task C: review route (one implementer, after A; parallel with B)
Files: `app/[locale]/review/diagrams/page.tsx`, `lib/diagrams/review-data.ts`, `e2e/diagrams-review.spec.ts`, `tests/diagrams/review-data.test.ts`.
- Route is static (`generateStaticParams` for en/vi/zh) and only renders when `process.env.DIAGRAM_REVIEW === '1'` at build time; otherwise `notFound()`. `metadata.robots = { index: false, follow: false }`. Not linked from the shell, not in sitemap, not in the search index.
- For each diagram under `content/*/_diagrams`: heading with id and class, license, upstream key; left column upstream image `/_content/<collection>/<upstream>`; right column inline SVG for zh, en, vi stacked, each wrapped in a 720px max-width and, beneath, a 360px max-width copy (mobile check); gate status list; credit line "Redrawn from the upstream image at commit 1a35221 (doocs/advanced-java), CC-BY-SA-4.0. Original authorship not documented upstream."
- Uses the existing layout and tokens, no new CSS framework. Inline SVG only from `renderDiagram`.
- e2e (`diagrams-review.spec.ts`, runs only when `DIAGRAM_REVIEW=1`): at 1280 and 360 widths, light and dark, assert no horizontal page overflow; for each `g[data-node]` assert the text bbox lies within the node rect (real-font check).
Acceptance: `DIAGRAM_REVIEW=1 pnpm build` succeeds and the postbuild static assertion (`scripts/assert-static-build.ts`) passes; without the env var the route 404s and the build is unchanged; unit tests green.

### Task D: verification and deploy (main session)
Reviewer pass (read-only) over the diff; full `pnpm test`, `pnpm typecheck`, `pnpm check:diagrams`, `DIAGRAM_REVIEW=1 pnpm build`, e2e for the route; commit on `diagrams-pilot`; preview deploy via Vercel CLI (no `--prod`), token from `.env.local` never printed.
