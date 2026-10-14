# Drawing task (one diagram per agent)

Applies to every entry of `docs/superpowers/plans/diagram-run-manifest.json`. The dispatch prompt gives you the entry (`id`, `upstream`, `batch`, `complexity`) and the output directory. Everything else is here.

## Read first
1. `docs/superpowers/plans/2026-10-14-diagram-pilot.md`: Data model, Render rules, Gate (still authoritative for the file format).
2. `docs/superpowers/specs/2026-10-14-diagram-redraw-design.md`: sections 0 and 3.
3. `content/advanced-java/glossary.diagram-labels.json` (global label glossary) and every `content/advanced-java/_diagrams/**/*.glossary.json` sidecar (entries from diagrams drawn in parallel). Also the prose glossaries `content/advanced-java/glossary.{en,vi}.json`.
4. The pilot diagrams as worked examples (`content/advanced-java/_diagrams/high-concurrency/high-concurrency-design/`, `.../distributed-system/distributed-system-request-sequence/`).

## Steps
1. View the upstream image (`content/advanced-java/_assets/<upstream>`). Count every label instance (repeats count separately; a multi-line text block is one label). Write the list in your head with positions; you will report the count. Do not skip small arrow labels (digits, "Y", "N").
2. Write `<name>.diagram.json` in the output dir. Reproduce the upstream arrangement, arrow topology and reading order (within about 10% positions). Rules learned in the pilot:
   - Box sizes: size for the longest locale (vi is usually widest). Prefer hard `\n` between words over a narrow box; never break inside a word.
   - Vertical text upstream is drawn horizontally in a taller box (approved rule).
   - Put edge endpoints exactly on node boundaries; place arrow tips on the box edge, not inside it. Two-way arrows are `"arrow": "both"`.
   - Label `at` is the vertical centre of the text. Leave 4px of air to edges and nodes; the gate checks text against all nodes, all edges and other text (code `TEXT_COLLISION`).
   - Circles hold text only inside the inscribed square (`w / sqrt 2`); use `pill` or a bigger circle for long labels.
   - Mark identifiers, code, numbers with units and URLs as `literals` so they stay identical in every locale.
   - Use `role: accent` sparingly (the upstream's emphasised node or edge), `muted` for secondary nodes, `style: dashed` where upstream is dashed.
   - `license` is always `"derived"`. If you think a diagram is not traced from the upstream arrangement, say so in the report; do not set `"original"` yourself.
3. Write `<name>.labels.zh.json` with the exact upstream text (keep upstream typos). For English-origin diagrams (upstream labels are English) the reference file is `en` (`status: "source"`, `source_lang: "en"`) and `zh`/`vi` are translations. `_title` and `_desc` are your own one-sentence text in each locale.
4. Translate en and vi:
   - If a label's reference text has an entry in the glossary (global or any sidecar), you MUST use that entry's translation (capitalisation may follow the layout).
   - Otherwise translate using the `terms` of the global glossary, the prose glossaries and the terminology already used in the doc `content/advanced-java/{en,vi}/<section>/<slug>.md` (read the relevant paragraphs). Keep terms consistent with those; do not invent a second translation of a term the glossary already has.
   - Record every label you translated yourself as a new entry in `<name>.glossary.json` (`{ "labels": [ { "zh": ..., "en": ..., "vi": ... } ] }`, reference-locale text as key field). Never edit the global glossary file.
   - en/vi `meta`: `status: "machine"`, `from` = sha256 hex of the reference-locale labels file bytes (use `shasum -a 256` or `npx tsx`; recompute after any edit of the reference file).
5. Run `pnpm check:diagrams -- --id <id>` until 0 errors. Rasterize zh, en and vi with `pnpm diagrams:png <id> <locale> light` and Read each PNG; also one dark PNG. Compare with the upstream image. Iterate until the arrangement matches, nothing crowds or overlaps, and the longest locale fits.
6. Limits: at most 8 gate runs and 3 visual iterations. If the gate is still red, or you cannot get a faithful layout, DELETE all files you created for this diagram (including the sidecar) and reply `SET_ASIDE:` with the reason and the last gate output. Do not leave a half-finished diagram.
7. If the framework itself blocks you (a missing shape, a gate rule that is wrong), stop and reply `FRAMEWORK_BLOCKER:` with a minimal description. Do not edit framework files.

## Boundaries
Only create files for your own diagram in its output directory (`<name>.diagram.json`, `<name>.labels.{zh,en,vi}.json`, optional `<name>.glossary.json`). Do not run `pnpm test`, the e2e or `pnpm build`; do not commit or push; do not touch `~/.claude`, hooks, settings, upstream images or docs under `content/advanced-java/{zh,en,vi}`. Temp files only in `.diagrams-out/` or `/tmp/adv-java-inv/`.

## Report (keep it short)
- Files written, or `SET_ASIDE` / `FRAMEWORK_BLOCKER`.
- Label instances counted (number) and diagram node/edge counts.
- Raw `pnpm check:diagrams -- --id <id>` output (last run) and the number of gate runs and visual iterations.
- New glossary entries (zh | en | vi), one per line.
- Anything you are unsure of (a label you could not read, a translation choice, a layout deviation, a candidate for `license: original`).

## Lessons from batches B01 and B02 (apply to every diagram)
- Do not invent emphasis: use `role: accent/muted` or `style: accent/dashed` only where upstream visibly shows a distinct colour, fill or dashed line. Default everything else. Do not shade alternating nodes.
- A node needs a `label.key`; for unlabelled shapes use a key whose text is `""` in every locale (the gate accepts blank when the reference is blank).
- `group` nodes need a label too; their label is drawn top-left. If upstream draws a title outside the box, use a free text for it and give the group a blank-text key.
- Vertical text: horizontal in a taller/wider box (approved rule). Ellipses: use `pill` (or `circle` for round ones).
- Reuse sibling diagrams' sidecar entries (`**/*.glossary.json`) for shared labels; keep the same line-break-insensitive text. Do not reword an existing entry.
- Re-rasterize after your LAST edit and Read the final vi PNG (longest locale) before reporting; say which PNGs you actually read.
- Arrow labels: put them 4px clear of the edge (the gate checks text against edges).
