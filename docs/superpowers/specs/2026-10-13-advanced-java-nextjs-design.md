# advanced-java on Next.js 16: multilingual docs site (design spec)

Date: 2026-10-13
Status: approved by owner 2026-10-14 (MIT chosen for code); next: implementation plan
Product context: `PRODUCT.md` (project root). Upstream reference checkout: `ref/` (doocs/advanced-java, commit `1a35221`).

## 1. Goal, scope, non-goals

**Goal.** A Next.js 16 reading site for the doocs/advanced-java corpus, in `vi`, `en` and `zh` (zh is the source), built so new doc collections (DSA, Python, ...) are a content folder plus one config entry.

**Success.** A reader finds a topic, reads it comfortably in their language, switches language without losing their place, and sees clearly when a page is not translated yet or machine-translated.

**In scope (v1).** One collection (`advanced-java`, 81 docs, 5 sections), 3 locales, search, light/dark, resume flag, attribution/licensing, full machine translation to vi and en (gated by a pilot, section 9), Vercel deployment.

**Out of scope (v1).** Comments (deferred, mount point reserved), accounts, analytics, custom domain, upstream re-sync (fork once), the 4 upstream promo pages.

**Visual mode.** Read (long-form docs). Direction: "Quadrille" (section 8).

## 2. Decisions log

| # | Decision | Source |
|---|---|---|
| D1 | Approach C: thin custom stack (next-intl + markdown pipeline + own UI + own search); Fumadocs headless core only if the page tree becomes painful | user |
| D2 | Content is plain markdown (remark/rehype); MDX only for our own pages | user |
| D3 | Fork once; no upstream re-sync; import script is run once and recorded | user |
| D4 | Locales `vi`, `en`, `zh`; default `en`; negotiation cookie → `Accept-Language` → `en` | user |
| D5 | Fallback chain: `vi → en → zh`, `en → zh`, `zh → zh` | user |
| D6 | Hosting: Vercel; deploy path decided in section 11 | user |
| D7 | Design direction chosen by Impeccable (user delegated): Quadrille | user + skill |
| D8 | Full static generation; no ISR | user |
| D9 | Import the 3 unlisted content docs; do not import the 4 promo pages | user |
| D10 | Comments out of v1 | user |
| D11 | Search engine chosen by test gate (Pagefind vs Orama) | user |
| D12 | Titles-first translation tier | user |
| D13 | vi and en are both translated directly from zh, never from each other | user |
| D14 | Licensing split: CC-BY-SA-4.0 for `content/` text and translations, MIT for code; images per 12 | user |
| D15 | `cacheComponents` is off; static model uses route segment config | spec |
| D16 | A translation whose zh source changed is still served, with a reader-facing "original updated" note | spec |
| D17 | The language switcher is the only writer of the locale cookie | spec |

## 3. Upstream facts this design rests on (checked 2026-10-13)

- 92 `.md` files under `ref/docs`: 81 docs, 6 section `README.md`, 4 promo pages (`extra-page/advanced`, `offer`, `rights-defending-action`, `subscriptions-for-doocs`), 1 home (`index.md`). 5 content sections (`high-concurrency`, `distributed-system`, `high-availability`, `micro-services`, `big-data`) plus `extra-page`.
- Order, grouping and nav titles: `docs/.vitepress/config.mts` (78 sidebar doc entries, all resolve to files; the GitHub URL I first counted lives in `socialLinks`, so there are 0 external sidebar entries). 3 content docs exist outside the sidebar (`topk-problems-and-solutions`, `redis-rehash`, `advantages-and-disadvantages-of-microservice`). The **root `README.md`** is the only file that lists all three, each next to a known neighbor (`redis-rehash` after `redis-production-environment`, `advantages-and-disadvantages-of-microservice` after `choose-microservice-deployment-strategy`, `topk-problems-and-solutions` after `find-rank-top-500-numbers`). `redis-rehash` and `advantages-and-disadvantages-of-microservice` also appear in one section README each; `topk-problems-and-solutions` appears in none.
- Links: 96 internal doc links (77 relative `.md`, 19 absolute `/docs/…md`), 0 unresolved. **By source:** 80 live in the 6 section READMEs (not imported, so they disappear with their files) and 16 in imported docs. **By target:** 92 → docs, 1 → a section README (`high-availability/sentinel-vs-hystrix.md` → `./README.md`), 3 → promo pages (all from `extra-page/README.md`, itself not imported), 0 → `index.md`. Of the 16 links in imported docs, 15 target docs and 1 targets a section README. Also 130 external; 0 `github.com/.../blob/` links; 1 in-page anchor (`#circuitBreaker.sleepWindowInMilliseconds`).
- Images: 129 references, all `./images/…` relative to the section; no remote images in docs.
- No VitePress-only syntax. Raw HTML in 11 files (6 section READMEs with promo table + CDN image, 5 others).
- Frontmatter only in `index.md`. The 3 files without an H1 are the promos `extra-page/advanced`, `extra-page/offer`, `extra-page/rights-defending-action`; all 81 imported docs have exactly one H1 and it is their first heading. H1 differs from the sidebar title in 51 docs (sidebar titles are short nav labels).
- One filename contains an apostrophe: `what's-microservice-how-to-communicate.md`.
- Heading shapes vary: Q → interviewer psychology → answer (message queue, Redis, Dubbo), tutorial (Hystrix), problem → approach → summary (big-data).

## 4. Content model and import

### 4.1 Layout

```
content/<collection>/collection.json              # order, groups, catalog IDs, sourceLocale, tab color. Locale-independent.
content/<collection>/glossary.<locale>.json       # translation glossary (en, vi)
content/<collection>/<locale>/meta.json           # localized titles only: section, group, doc title (H1), navTitle. Never order.
content/<collection>/<locale>/<section>/<slug>.md
content/<collection>/_assets/<section>/<slug>/…   # shared images, locale-independent
content/LICENSE                                   # CC-BY-SA-4.0 (section 12)
```

`collection.json`:
- `sourceLocale` (`zh` for advanced-java) and per-locale fallback chain (defaults from D5).
- `sections[] → groups[] → docs[]` (slugs), the **only** source of order. A group whose sidebar entry had its own link (e.g. 消息队列 → `mq-interview`) lists that doc first and flags it `lead: true`.
- `ids[slug]` → catalog ID (`HC-03`, `DS-07`, `HA-…`, `MS-…`, `BD-…`).

### 4.2 Catalog IDs

Assigned once at import (section prefix + zero-padded number in the import-time order), persisted in `collection.json.ids`, **never derived from current order**. A new doc takes the next unused number for its prefix; numbers are never reused. IDs are identical across locales.

### 4.3 Parsing

Markdown through remark/rehype (D2). Raw `<` and `{` in prose never reach an MDX compiler. Pipeline and sanitizer in section 5.

### 4.4 Import script (`scripts/import-upstream`, run once)

Input `ref/docs` + `config.mts` + root `README.md`. Output `content/advanced-java/zh/…`, `collection.json`, `zh/meta.json`, `_assets`, and `import-report.md`.

1. **Order and grouping** from the `config.mts` sidebar. The 3 unlisted content docs are positioned by the **root `README.md`**: immediately after the doc that precedes them there (`redis-rehash` after `redis-production-environment`, `advantages-and-disadvantages-of-microservice` after `choose-microservice-deployment-strategy`, `topk-problems-and-solutions` after `find-rank-top-500-numbers`). Section READMEs are not consulted for order.
2. **Slugs** sanitized (`what's-…` → `whats-…`). A slug map (old → new) is written to the report.
3. **Titles**: `docTitle` = first H1; `navTitle` = sidebar text. Docs where they differ (51) are listed in the report, not treated as errors. If a doc has no H1, `docTitle` falls back to `navTitle`, and the import fails if it has neither. (Today none of the 81 imported docs lacks an H1; the 3 files without one are promos.) Heading indexing is unaffected: the h1 is never indexed (section 5).
4. **Images**: `./images/*` copied to `_assets/<section>/<slug>/`; references rewritten to `asset:` (4.5).
5. **Internal links**, by target type:

   | Target | Count today (from imported docs) | Rewrite |
   |---|---|---|
   | imported doc | 15 | `doc:<collection>/<section>/<slug>[#hN]` |
   | section README (`./README.md`) | 1 | `section:<collection>/<section>`, resolves to the generated section page |
   | `index.md` | 0 | `home:`, resolves to the shelf `/<locale>` |
   | promo page (not imported) | 0 | unwrap to plain text, listed in the report |
   | any other internal target that does not exist | 0 | **import fails** |

   Links whose **source** file is skipped (step 8) are not processed; they are dropped together with their file. That removes 80 section-README links and the 3 promo links in `extra-page/README.md`.
6. **In-page anchor** `#circuitBreaker.sleepWindowInMilliseconds`: remapped to `#h<n>` by matching the VitePress-style heading slug in the source doc to the heading index; fails if unmatched.
7. **Raw HTML**: promo tables, CDN images, `iframe`, styled `div`/`p` stripped; `br` and tables kept (allowlist in section 5).
8. **Skipped, listed in the report**: `index.md` (replaced by our home), the 6 section `README.md` (section pages are generated from `collection.json`), the 4 promos.
9. Records upstream commit `1a35221`.

### 4.5 Locale-neutral links

Stored content never contains a locale in a link. Schemes:

- `doc:<collection>/<section>/<slug>[#h<n>]`
- `section:<collection>/<section>`
- `home:`
- `asset:<section>/<slug>/<file>`
- external URLs unchanged.

Resolved at render time by `rehypeResolveLinks` (section 5):

- `doc:` → `/<route-locale>/<collection>/<section>/<slug>`, where `route-locale` is the locale in the **current URL**, not the content language. A reader on `/vi/…` stays on `/vi/…` even while the body shows zh fallback; a translated doc never sends the reader to a different locale's page.
- With `#h<n>`, the resolver emits the **full heading id of the target** (`#h<n>-<slug>`), looked up in a build-time heading index of the target as it will be served (same fallback resolver), so the link works without JavaScript. If the target has fewer than `n` headings the build fails.
- `section:` → `/<route-locale>/<collection>/<section>`; `home:` → `/<route-locale>`.
- `asset:` → `/_content/<collection>/<section>/<slug>/<file>` (a prebuild step copies `_assets` into the gitignored `public/_content`).
- A target that does not exist fails the build.

### 4.6 Translation frontmatter

Every vi/en doc:

```yaml
---
source:
  locale: zh
  slug: why-mq
  hash: sha256:v1:<hex>   # canonical hash of the zh body (4.7)
status: machine            # machine | reviewed
translatedAt: 2026-10-13
---
```

Both locales are translated **directly from zh**. `vi` is never derived from `en` or the reverse (D13). `status` is `machine` or `reviewed`. Only the project owner sets `reviewed`; no agent or script writes it. Re-translating a doc resets it to `machine`.

### 4.7 Staleness hash

`hash` = `sha256:v1:<hex>` of a **canonical form derived from the parsed markdown**, not from raw text. This makes formatting-only changes (including table re-alignment) irrelevant and keeps code verbatim.

1. Decode UTF-8, drop BOM, NFC-normalize, strip a leading YAML frontmatter block.
2. Parse with `remark-parse` + `remark-gfm` (versions pinned; recorded as `v1`).
3. Emit a canonical token stream in document order:
   - node type plus its significant attributes: heading depth, list `ordered`/`start`, code `lang`, link/image `url` and `title`, image `alt`, table column alignment (as an array, so delimiter-row dash counts never matter);
   - `text`: whitespace runs collapse to one space, trimmed at block edges, so re-wrapped lines and padded table cells are identical;
   - `inlineCode`, fenced `code` and indented `code`: the value **verbatim** (only trailing whitespace per line and trailing blank lines removed); inner spacing is never collapsed;
   - `break` (hard break) emitted as `break`;
   - raw `html`: whitespace runs collapsed;
   - not emitted: emphasis/bullet marker characters, list `spread`, line endings, blank-line counts.
4. SHA-256 the stream.

Consequences: CRLF vs LF, trailing whitespace, line re-wrapping, table padding and delimiter-row dash counts, `*` vs `-` bullets, `*`/`_` emphasis do **not** change the hash; any change to prose, link targets, headings or code (including whitespace inside code) does. Changing the parser or this rule bumps `v1`; all hashes are then re-stamped in one reviewed no-content-diff run (`check:translations --restamp-all`). `--restamp <slug>` records a single reviewed no-op change.

### 4.8 `check:translations`

Run in CI and before any deploy. Per vi/en doc:

| Check | Fails build? |
|---|---|
| Source zh file exists and `source.slug` matches | yes |
| Heading count and levels equal zh (h2–h6) | yes |
| Fenced-code-block count and language tags equal zh | yes |
| **Each fenced block equals its zh counterpart (same ordinal) after comment stripping and trailing-whitespace normalization** (see below) | yes |
| **Inline code spans: the multiset of `inlineCode` values equals zh's** | yes |
| Multiset of locale-neutral link targets (`doc:`, `section:`, `home:`, `asset:`, external) equals zh | yes |
| Parses through the render pipeline without error | yes |
| Residual CJK ratio outside code under threshold (untranslated paragraphs) | yes |
| Body length ratio within sane band per locale | warn |
| zh canonical hash differs from stored `source.hash` (stale) | warn, listed; also shown to readers (6.4) |
| `status` is `reviewed` but file changed since | warn |

**Comment stripping by language tag.** c-like (`java`, `javascript`/`js`, `typescript`/`ts`, `go`, `c`, `cpp`, `scala`, `kotlin`, `groovy`, `rust`, `proto`): `//` and `/* */`. hash-style (`python`/`py`, `shell`/`bash`/`sh`, `yaml`/`yml`, `properties`, `conf`, `ruby`, `dockerfile`): `#`. `xml`/`html`: `<!-- -->`. `sql`: `--` and `/* */`. `json`: no comments, strict equality. Blocks with no language tag or `text`/`txt` (ASCII diagrams, tables) are exempt from equality but must have the same line count; they are listed in the report for sampling.

Genuine, reviewed exceptions (e.g. a code span that legitimately must be translated) go in `content/<collection>/translation-exceptions.json` with a reason; the check reports each exception it applied.

## 5. Render pipeline

```
remark-parse → remark-gfm → remark-rehype{allowDangerousHtml}
  → rehype-raw
  → rehypeResolveLinks (custom: doc:/section:/home:/asset: → real URLs)
  → rehype-sanitize(schema)
  → rehypeHeadingIds (custom) → rehype-pretty-code (Shiki) → render
```

**Order rationale.**
- Links are resolved **before** sanitize, so the sanitizer only ever sees real `http`/`https`/`mailto` URLs and same-site relative paths; the custom schemes (`doc:`, `section:`, `home:`, `asset:`) never need to be allowed through it. Raw HTML `<a href="doc:…">` is resolved too. An unresolvable custom-scheme link makes the resolver throw (build error), so nothing can reach the sanitizer unresolved.
- Sanitize runs **before** ids and highlighting, so it can never prefix ids with `user-content-` or strip highlight classes; those are produced by our own plugins after it.

**Schema.** Allows the markdown/GFM element set, `br`, `sub`, `sup`, `img` and the table family (imported docs contain raw `<sub>`/`<sup>`/`<br>`). `a[href]` protocols: `http`, `https`, `mailto`, plus relative paths and fragments. `img[src]` restricted to the `/_content/` path prefix (remote images are rejected; upstream has none). Drops `script`, `iframe`, `style`, `on*` attributes and inline `style`; `javascript:` and other protocols are stripped. Authored `id`/`class` are not allowed through. `clobberPrefix: ''` is set as a belt-and-braces guard.

**Heading ids.** `h<index>-<readable-slug>`. `index` = 1-based order of `h2`–`h6` headings in the document (the h1 is the title and has no index; upstream uses h2–h5, 6 h5 headings in total). The TOC and margin column display `h2`–`h4` only, but every `h2`–`h6` heading is indexed so deep links to h5 still resolve. Each heading also carries `data-hi="<index>"`. The slug part is derived from the heading text of the rendered locale and is purely decorative.

**Anchor resolution (client).** On load and on `hashchange`, any hash matching `^#h(\d+)` resolves by `[data-hi="<n>"]` alone, scrolls there, and normalizes the URL with `history.replaceState`. If `n` exceeds the heading count, resolve to the last heading. Used by deep links, the language switcher, the resume flag and the remapped upstream anchor. Old or other-locale slugs still land on the right heading. Links emitted by `doc:…#h<n>` already carry the full id (4.5) and work without JavaScript.

**Test (required).** A fixture markdown doc rendered through the full pipeline asserts:
1. a heading renders `<h2 id="h3-…" data-hi="3">` (no `user-content-` prefix);
2. a fenced code block renders `<pre>` with the Shiki class and token spans with colors;
3. `<br>` and a table survive;
4. `<script>`, `<iframe>` and a `javascript:` link are stripped;
5. a `doc:` link resolves to the route locale; `doc:…#h3` resolves to an href carrying the full target heading id; `asset:` resolves to `/_content/…`; an `img` pointing outside `/_content/` is removed.

## 6. i18n, routing, fallback

### 6.1 Routes

`/{locale}/{collection}/{section}/{slug}`, locales always prefixed. Slugs are English and locale-independent, so a doc has the same path in every locale. Section pages `/{locale}/{collection}/{section}` and the shelf `/{locale}` are generated from `collection.json`. Unknown paths under a valid locale are caught by `app/[locale]/[...rest]/page.tsx`, which only calls `notFound()` so the localized `app/[locale]/not-found.tsx` renders (without the catch-all an unmatched URL falls through to the root, unlocalized 404).

### 6.2 Locale negotiation: `proxy.ts`

Next 16 deprecates the `middleware` file convention in favor of `proxy` (verified on `next@16.4.0`: build warns and points at the `middleware-to-proxy` codemod). Negotiation lives in `proxy.ts`, wrapping `next-intl`'s `createMiddleware(routing)` (`next-intl@4.14.9`, peer `next ^16`). Order: cookie → `Accept-Language` → `en`.

**Matcher.** Runs on `/` and on any path whose first segment is not a locale, and never on static assets or `_next`:

```
matcher: ['/', '/((?!(?:en|vi|zh)(?:/|$)|_next|api|.*\\..*).+)']
```

Locale-prefixed pages therefore never invoke the proxy and are served straight from the static output.

**Locale cookie.** Because the matcher keeps the proxy off locale-prefixed paths, next-intl never writes the locale cookie there. The **language switcher is the only writer**: when the reader picks a locale it sets `NEXT_LOCALE` (`path=/`, 1 year, `SameSite=Lax`). A reader who never uses the switcher is negotiated by `Accept-Language` on each unprefixed entry. The cookie wins over `Accept-Language`.

**Unprefixed paths (decision).** A request for a path with no locale prefix (e.g. `/advanced-java/high-concurrency/why-mq`) is **redirected (307) to the negotiated locale**: `/vi/advanced-java/high-concurrency/why-mq` for a Vietnamese browser, `/en/…` otherwise. 307 because the target varies per visitor. A path that does not exist after the redirect gets the locale-aware 404. E2E cases in section 10.

### 6.3 UI strings

`next-intl` with `messages/{vi,en,zh}.json`. A missing key falls back to `en`.

### 6.4 Content fallback

For a requested `(locale, doc)` the resolver returns the first existing file in the chain (D5) and the language actually served.

- The URL stays in the requested locale; no redirect.
- If the served language differs from the route locale, the page shows the "not translated yet, showing the English/Chinese original" notice (in the UI language), and the body wrapper carries the real `lang` (`en` or `zh-Hans`).
- `<html lang>` follows the UI locale.
- If `status: machine`, the header shows a "machine translated, may contain errors" line.
- **Stale translation (D16).** When the doc is served in its translated language and the zh canonical hash differs from `source.hash`, the header shows a quiet note: "The Chinese original was updated after this translation; this page may be out of date", linking to the original. `reviewed` does not suppress it. A stale translation is still served, never hidden.

### 6.5 SEO

- `hreflang` alternates only among real translations.
- A fallback page's canonical points at the page in its real language.
- The sitemap lists real translations only, never fallback pages.

### 6.6 Language switcher

Always visible; shows each locale's status (translated, machine, fallback). Switching keeps `collection/section/slug` and the reading position: the switcher reads the current top heading's `data-hi` and navigates to `#h<n>` in the target locale. Equal heading structure across locales is guaranteed by `check:translations`. The resume flag is keyed by catalog ID, so it survives a language switch.

## 7. Rendering mode: full static

All content is in the repo, so every change arrives via a deploy. **Full static generation; no ISR.** Nothing changes between deploys: reading flag and set-aside are `localStorage`, search is a static index, comments are out of v1, and the only per-request logic is the `/` and unprefixed-path redirect in `proxy.ts`.

- `generateStaticParams` over locale × collection × section × doc: 3 × 81 = **243 doc pages**, plus section pages and shelves.
- Explicit settings on locale layouts and doc pages: `dynamicParams = false` and `revalidate = false` (no time-based revalidation), as route segment config.
- **`cacheComponents` is off** (D15), stated in `next.config`, not left to the default: the segment config above is the static model wanted here, and nothing in v1 needs Cache Components or `use cache`.
- **next-intl static opt-in:** every locale layout and page calls `setRequestLocale(locale)` (the next-intl 4.x API; name and usage re-verified at install, U2) before any translation call, and `generateStaticParams` returns every locale. No `headers()`, `cookies()` or `searchParams` reads in these routes.
- **Build assertion (required).** After `next build`, a script reads the build output (`.next` prerender and routes manifests) and fails if:
  1. any route under `/[locale]/…` is not prerendered (dynamic or on-demand), **except** the allow-listed `/[locale]/[...rest]` catch-all, which only calls `notFound()` and reads no content;
  2. the number of prerendered doc routes ≠ `locales × docs` computed from `collection.json`;
  3. any doc route has a `revalidate` value other than `false`.

## 8. UI shell and design direction

Mode: Read. Direction chosen by Impeccable (user delegated; decision page skipped, the rolled direction taken as assigned).

### 8.1 "Quadrille"

An engineer's quadrille notebook. The grid is structural: it sets vertical rhythm and lives in margins and gutters, not behind running text.

- **Light:** cool blue-white grid paper, near-black ink, one cobalt accent. No cream, no serif-plus-terracotta.
- **Dark:** cyanotype, deep Prussian blue with white linework.
- **Collections are notebooks**: each has a tab color; home is a shelf of notebook spines.
- **Reading mode toggle** hides the grid.

Impeccable raises carried into the design:
- **Resume flag** (from the cutting-bench world): a folded tab marks where you stopped, persisted per doc; plus a "set aside" list.
- **Numbered margin column** (from orizuru folds): steps numbered in the margin, deep-linkable, derived from each doc's actual headings (docs with the Q → psychology → answer shape get labeled steps, the rest plain numbers).
- **Stable catalog IDs** (from the catalog-sleeve world) shown on every doc.

Honest risk: grid paper can turn twee or noisy over long reading. Mitigation: grid at about 6% opacity, margins only, reading-mode toggle. The direction contract and `DESIGN.md` are written at build time by Impeccable.

### 8.2 Shell

- **Top bar:** notebook tab, search (`⌘K`), language switcher with status, theme toggle, reading mode.
- **Left rail:** section → group → doc tree with catalog IDs and a translated/fallback dot; resume flag shown on the entry.
- **Center:** reading column (about 66ch Latin/Vietnamese, about 38 em CJK). Doc header: catalog ID, H1, language status line, machine-translation note.
- **Right rail:** TOC plus the numbered margin steps.
- **Footer:** prev/next, then attribution and license (section 12).
- **Mobile:** rail becomes a drawer, TOC a bottom sheet, prev/next and language in a bottom bar.
- **Home:** shelf of notebook spines with translated/total counts per locale.

### 8.3 Typography and fonts

- Latin and Vietnamese: `Source Serif 4` (body), `Be Vietnam Pro` (UI), `JetBrains Mono` (labels); subsets `latin`, `latin-ext`, `vietnamese`.
- CJK: `Noto Serif SC` via `next/font/google` with **`preload: false`**. It is applied **only** inside the document body under `:lang(zh)`. The language switcher's "中文" label and all UI chrome use the system CJK fallback, so no web-font CJK bytes are requested by chrome.
- Google's `unicode-range` slicing means the browser fetches only slices for glyphs actually rendered. A vi/en page with no Han glyphs downloads **zero CJK font bytes**. A fallback page rendering zh downloads only the slices it needs.
- The document header (H1, language status line) and body share one wrapper whose `lang` is the served content language, so a fallback page's zh title also uses the CJK face. A `lang="zh-Hans"` wrapper on zh content selects the correct Han glyph variants and the CJK line height (about 1.9; Vietnamese about 1.7).
- Reduced motion respected; the flag fold is the only animation.

### 8.4 Resume flag and set-aside

`localStorage` only (no accounts), keyed `<collection>:<catalogID>`, storing `{headingIndex, headingText, headingCount, zhHash, savedAt}`. `zhHash` is the canonical hash (4.7) of the **zh source body** (the doc itself for zh docs, the current zh file for translations), never of the translated body, so switching language or a fallback doc getting translated does not look like an edit; set when the reader leaves a doc after a minimum dwell time or on explicit "mark here".

**Behavior after a zh edit** (headings inserted or removed): on open,
1. if the stored `zhHash` equals the current zh hash, use `headingIndex` (translations share the heading structure by the 4.8 gate);
2. else prefer the heading whose normalized text equals `headingText`, nearest to `headingIndex`;
3. else scale `headingIndex` by `currentCount / savedCount` and clamp to `[1, currentCount]`.

It always lands on an existing heading, never errors and never silently jumps to the top. When the zh source changed (hash differs), a one-line note says so ("this page was updated since you left; showing the nearest place").

## 9. Translation pipeline

Offline tooling, not part of the site runtime.

### 9.1 Rules

- Both vi and en are translated **directly from the zh source** (D13).
- Translate prose, headings, image alt text and comments inside code. Never alter code, identifiers, URLs, image paths, `doc:`/`asset:` targets, heading levels or order.
- Follow `glossary.<locale>.json` (e.g. 消息队列 → `message queue` / `hàng đợi thông điệp`; product names such as Kafka, Dubbo, Hystrix stay as is).
- Output carries the frontmatter in 4.6 with `status: machine`.

### 9.2 Titles-first tier (D12)

All doc titles and nav labels (81 docs, 5 sections and their groups) are translated first, into `<locale>/meta.json`. The tree, switcher and search then work in vi/en for docs whose body still falls back. A new collection must have titles translated before it is published; bodies may lag.

### 9.3 Stages

1. **Glossary seed** from the zh corpus (frequent terms, product names).
2. **Titles tier** for both locales.
3. **Pilot** (hard stop): 5 docs, both locales, one per section, covering the three heading shapes. Proposed: `high-concurrency/why-mq`, `distributed-system/distributed-system-cap`, `high-availability/hystrix-introduction`, `micro-services/microservices-introduction`, `big-data/find-top-1-ip`.
4. **STOP.** Report to the project owner: the 10 translated files, `check:translations` gate results, the glossary as it stands, measured token usage, and a projected cost for the remaining 76 docs × 2 locales. **The full run does not start until the owner approves.** The owner reads the Vietnamese pilot docs.
5. **Full run** in section batches of at most 10 docs per `implementer` subagent, both locales per doc, after approval.
6. **Gate** (`check:translations`, 4.8) plus a `reviewer`-agent pass over a sample and over every gate-flagged doc.
7. **Owner spot review** (about 10%); only the owner moves a doc to `reviewed`.

Cost is an estimate until the pilot measures it.

## 10. Testing

| Layer | What |
|---|---|
| Unit | render pipeline fixture (section 5), hash normalization (4.7), fallback resolver, link rewriter and resolver, anchor resolver, resume-flag restore after heading insert/remove |
| Content gates | import report with zero unresolved links; `check:translations`; build assertion (section 7) |
| E2E (Playwright) | locale negotiation on an unprefixed entry: `Accept-Language: vi`; neither (→ `en`); **cookie via the switcher**: open `/en/…`, pick `vi` in the switcher (it writes `NEXT_LOCALE`), then request an unprefixed path with `Accept-Language: en` → lands on `/vi/…`; no planted cookie |
| | **unprefixed path**: `/advanced-java/high-concurrency/why-mq` → 307 to `/vi/…` with `Accept-Language: vi`, to `/en/…` otherwise; `/foo/bar` → redirect, then the localized 404; `/vi/foo/bar` → localized 404 via the catch-all |
| | stale translation shows the "original updated" note; fallback page: notice shown, body `lang` correct, canonical → real-language page, absent from sitemap, `hreflang` only for real translations |
| | switcher keeps heading position; a stale-slug hash (`#h3-old-slug`) lands on heading 3 |
| | **CJK font bytes**: capture network on one vi page that has a real translation and assert zero requests for the CJK font files and no `Noto Serif SC` `FontFace` with status `loaded` (`document.fonts`); on one fallback page rendering zh assert CJK slice requests > 0 and fewer than the total slice count |
| | search returns expected docs for zh, vi, en fixture queries (section 10.1 gate) |
| a11y | axe on shelf, doc page, search overlay |

### 10.1 Search gate (Pagefind vs Orama)

Decided by test before choosing (D11).

| | Pagefind | Orama (`@orama/orama` + `@orama/tokenizers`) |
|---|---|---|
| Model | post-build index over rendered HTML, chunked fetches | index loaded by the client |
| CJK | unverified | unverified |

Fixture: about 25 hand-labeled queries with expected docs: single hanzi (`消息`), multi-word zh (`分布式锁`), Latin terms inside zh text (`Redis 持久化`, `Kafka`), code-like identifiers, vi with and without diacritics (`độ trễ` / `do tre`), en word forms (`idempotent` / `idempotency`), exact-title queries.

Metrics: recall@10 and precision per locale, first-search transfer (gzip), query latency, build time, index size. Pass bar: zh recall@10 ≥ 0.9; accent-insensitive vi works; first search ≤ about 300 KB gzip; no server. If both pass, choose the smaller transfer; if neither passes, add a custom bigram tokenizer for zh.

### 10.2 Search and fallback docs

One index per locale, one entry per doc, in the doc's best available language, with fields: `lang` (actual content language), `fallback` (bool), localized `title` (always present via the titles-first tier), body in its actual language. A vi query finds fallback docs by title and by Latin terms in zh text, shown with a visible language badge. Native-language hits rank above fallback hits at equal score. Untranslated docs are never silently absent.

## 11. Deploy

**Preferred: Vercel Git integration; no deploy token on disk or read by an agent.**

Per Vercel's documentation (`vercel.com/docs/git`, `vercel.com/docs/deployments/promoting-a-deployment`, fetched 2026-10-13):
- Every push to a non-production branch gets a **preview deployment**; production deployments are created on merges to the **production branch**.
- With **Auto-assign Custom Production Domains** turned off for the Production environment, a push to the production branch creates a **staged** production deployment that is **not** served until it is promoted manually (dashboard "Promote", no rebuild). A preview can also be promoted to production (with a rebuild).
- Therefore "preview per push, production only on explicit promotion" is covered with no token.

**Flow.**
1. Owner creates (or authorizes creation of) a GitHub repository and installs the Vercel GitHub app; owner imports the repo in the Vercel dashboard (Framework: Next.js).
2. Production Environment → Branch Tracking → disable **Auto-assign Custom Production Domains**.
3. Push branches → preview URLs. Merge to `main` → staged production deployment. Owner promotes.

**Token route (fallback only).** Needed only if the Git integration cannot be used (e.g. Hobby team with a private repo in a GitHub organization, which Vercel disallows; or the owner prefers CLI deploys). Then: `VERCEL_TOKEN` provided via the environment (sourced from `.env.local` without printing it, never passed as a flag, never echoed); `.env.local` in `.gitignore` before any commit; preview deploys first, production promotion only on the owner's explicit go-ahead.

**Build.** `next build`, full static, `proxy.ts` for `/` and unprefixed paths. Node `>=20.9.0`. `ref/` excluded from the app build and from version control. Domain undecided (default `*.vercel.app`).

**No deploy is performed as part of this spec or the brainstorming phase.**

## 12. Licensing and attribution

**Split.**
- `content/**` text and translations: **CC-BY-SA-4.0**, `content/LICENSE` carries the full text (copied from the upstream `LICENSE`).
- `content/**/_assets` images: included under CC-BY-SA-4.0 **only where we have the right to license them**. Upstream records no per-image provenance and some diagrams may be third-party. The import report lists every image; `content/ASSETS.md` records provenance as known; images of unknown provenance are listed under "Image credits" on `/about`, sourced to upstream commit `1a35221`, and are not relicensed by us. The owner reviews this list (open item).
- Application code, scripts, UI strings (`messages/*.json`), styles and config: a **separate code license**, `LICENSE` at the repo root.
- **Code license: MIT** (owner decision 2026-10-14). Permissive, conventional for a Next.js app, and no interaction with the CC-BY-SA share-alike on `content/` because the two are separate works in separate directories.
- The root `README.md` and `/about` both state the split and where each applies.

**Attribution (every page footer and `/about`).**
- CC-BY-SA-4.0 with a link to the license text.
- Credit to Doocs and to 中华石杉 as the original content author, with a link to upstream `doocs/advanced-java`.
- A statement of changes on every page: zh pages "reformatted from the original", vi/en pages "translated and adapted from the Chinese original". Each links to the specific upstream file at commit `1a35221`.
- Translated content keeps CC-BY-SA-4.0.

This is a good-faith implementation of the license terms, not legal advice.

## 13. Repository layout (app)

```
app/[locale]/…                  # layouts, shelf, section and doc routes
app/[locale]/[...rest]/page.tsx # notFound() only → localized 404
app/[locale]/not-found.tsx
app/not-found.tsx               # minimal unlocalized fallback
proxy.ts                        # negotiation + unprefixed redirect
messages/{vi,en,zh}.json
content/…                       # section 4.1 (+ ASSETS.md, translation-exceptions.json)
public/_content/                # build-generated copy of _assets (gitignored)
lib/content/                    # loader, fallback resolver, link resolver
lib/render/                     # pipeline (section 5)
lib/search/                     # chosen engine
scripts/import-upstream         # run once
scripts/check-translations
scripts/assert-static-build
PRODUCT.md  DESIGN.md           # Impeccable (DESIGN.md written at build)
LICENSE  content/LICENSE  README.md
ref/                            # upstream checkout, untracked, excluded
```

## 14. Unverified items and where they get verified

| ID | Unverified claim | Verified by (plan phase) |
|---|---|---|
| U1 | `next-intl` `createMiddleware` works as the default export of `proxy.ts` on Next 16.x (type-level only so far), including the Node-only proxy runtime and the section 6.2 matcher | P3 i18n/routing: smoke test of the negotiation cases and the unprefixed redirect  **Status:** verified in Task 13: 307 redirects, 200, 404 smoke on next start; proxy export accepted by Next 16.4.0 |
| U2 | `setRequestLocale` is the correct static-rendering API in `next-intl@4.14.9` with the App Router layout | P3: build with the assertion in section 7  **Status:** verified in Task 13: `setRequestLocale` static build with assertion OK |
| U3 | `revalidate = false` / `dynamicParams = false` segment config is accepted under the pinned Next 16 minor with `cacheComponents` off | P3: build succeeds, assertion passes; if not accepted, record the equivalent setting and revisit D15  **Status:** verified in Task 13: build OK with `cacheComponents: false`, `revalidate=false`, `dynamicParams=false` |
| U4 | `next/font/google` handles `Noto Serif SC` with `preload: false` and serves `unicode-range` slices, giving zero CJK bytes on vi/en pages | P4 UI shell: the E2E network check in section 10  **Status:** verified in Task 25: vi page with a real translation requests 0 CJK font files; fallback zh page requests some, not all (per weight) |
| U5 | Pagefind and Orama CJK behavior | P5 search gate (section 10.1)  **Status:** verified in Task 23: Pagefind chosen (zh 20/20, vi 10/10, en 14/14, first search 187,704 B gzip); re-run after the full translation run |
| U6 | Shiki output classes and styles survive in the final HTML after `rehype-sanitize` ordering | P2 render pipeline: fixture test (section 5)  **Status:** verified in Task 10: fixture test |
| U7 | VitePress heading-slug algorithm can be replicated to remap `#circuitBreaker.sleepWindowInMilliseconds` | P1 import  **Status:** verified in Task 7: lenient anchor matching (heading is a linked heading); remap works |
| U8 | Vercel Git integration works for the owner's account type (Hobby vs Pro, private vs public repo); docs verified, account not | P8 deploy  **Status:** OPEN: needs the owner's GitHub repo + Vercel account type; docs verified only |
| U9 | Token cost of translation (estimate only) | P6 pilot report  **Status:** pilot measured (Task 22 report); full-run cost still an estimate |
| U10 | Glyph coverage: Vietnamese diacritics in `Source Serif 4` / `Be Vietnam Pro` / `JetBrains Mono`, Han in `Noto Serif SC` | P4: glyph coverage check across all three locales  **Status:** partly verified in Task 15/25 (build fonts, no CJK bytes); visual glyph check in the Impeccable finish review |
| U11 | The `.next` manifest format in the pinned Next 16 minor supports the build assertion (section 7) | P3: implement and run the assertion script  **Status:** verified in Task 13: manifest shapes recorded in docs/superpowers/decisions/next-build-manifests.md |
| U12 | The `[...rest]` catch-all is the only non-prerendered route and the assertion's allow-list works; `notFound()` there renders the localized 404 | P3: build assertion + E2E `/vi/foo/bar`  **Status:** verified in Task 13/25: catch-all is the only dynamic route; localized 404 e2e |
| U13 | next-intl's negotiation honors a `NEXT_LOCALE` cookie written by our switcher (name, path, format) | P3: E2E cookie-via-switcher case  **Status:** verified in Task 25: cookie written by the switcher wins over Accept-Language |
| U14 | The AST-canonical hash (4.7) is stable across formatting-only fixture pairs, and across minor `remark` bumps within the pinned range | P1 import: unit tests with formatting-only fixture pairs; versions pinned  **Status:** verified in Task 3: unit tests with formatting-only fixtures (hash v1) |
| U15 | Build-time heading index lookup for `doc:…#h<n>` produces the same ids the heading plugin emits at render | P2 render pipeline: fixture test  **Status:** verified in Task 9/10: resolver + parity tests |
| U16 | Provenance of the upstream images (third-party or not) | P1 import: report; owner review  **Status:** OPEN: provenance of images unknown; listed under About > Image credits (Task 18); owner decision pending |

## 15. Open items for the owner

1. ~~Final code license~~ Resolved: MIT.
2. GitHub repository creation/ownership and Vercel account type (U8).
3. Pilot doc selection (5 proposed in 9.3).
4. `PRODUCT.md` "Users" is still inferred, not confirmed.
5. Image provenance (section 12): decide how to treat images of unknown origin (keep under original terms with credits, as specified, or replace).

## 16. Implementation notes and deviations (recorded 2026-10-14, after execution)

Decisions taken during implementation that refine or deviate from the sections above:

1. **Raw HTML in prose.** Valid-looking tags that are not on the allow-list (for example `List<String>`, `Class<T>`) are escaped to literal text by a remark step before rendering (they would otherwise vanish). Imported docs may carry only `br`, `sub`, `sup` and table elements as raw HTML; anything else fails the import and is rejected by `check:translations`.
2. **Title and H1.** The page header renders the title; the body's first top-level H1 is stripped so every doc page has exactly one `<h1>` (with the served content `lang`).
3. **Review state.** `reviewedHash` (canonical hash of the translation body at review time) is stored with `status: reviewed`; `pnpm check:translations --mark-reviewed <collection>/<locale>/<slug>` is the owner-only way to set both. Exceptions use `{ "<locale>/<section>/<slug>": [{ "code", "reason" }] }` and are reported when applied.
4. **Search.** Pagefind 1.5.2 (decision recorded in docs/superpowers/decisions/search-engine.md). Index generated at build from the content corpus; each page's `<html lang>` is the route locale; fallback docs are flagged by meta; vi indexes carry an accent-folded duplicate.
5. **Top bar.** `.topbar-slot` is the single sticky element; `--topbar-h` is measured at runtime (ResizeObserver) and drives `scroll-margin-top` and the anchor offset. At ≤640px the switcher shows a short status marker (● ◐ ○) plus screen-reader text.
6. **Deviations not built.** The spec's §8.2 mobile *bottom bar* (prev/next + language) was not built; the sticky top bar and drawer serve that role. Comments remain out of v1.
7. **Cost of translation.** See docs/superpowers/reports/pilot-report.md; the full run (Task 26) is gated on owner approval.
8. **Set-aside list view not built.** "Set aside" stores document IDs locally (validated and clamped), but v1 renders no list of them; the keys `resume.setAsideList` / `resume.empty` are reserved for it.
9. **Resume flag on the rail entry not built.** The resume flag shows in the document header area only, not on the left-rail entry (§8.2).
10. **Mobile TOC.** On narrow screens the rails collapse into a `Menu` disclosure (nav, TOC, steps) instead of the bottom sheet described in §8.2; the bottom bar is also not built (see 6).
11. **Check scope.** `check:translations` compares structure, code, links and hashes on the AST; it does not render markdown through the full pipeline. The build does, and fails on unresolved `doc:`, `section:` or `asset:` targets. `check:translations` runs in `prebuild`, so a failing translation blocks the build.
12. **Counts.** The counts quoted in §3/§4.4 (51 H1 differences, 129 image references) are estimates from the first scan; `content/advanced-java/import-report.md` (54 and 127) is authoritative.
13. **Release hygiene.** `scripts/commit.sh` is an agent-session commit helper that appends a session trailer; the owner may delete it before publishing.
14. **Deployment (2026-10-14).** Deployed with the Vercel CLI (token route, the Git integration was not used: the repository has no remote). Vercel assigned the project's first deployment to production, so there was no separate preview; the later production deploy (`vercel deploy --prod`) is on the default `*.vercel.app` alias. U8 (Git integration for the owner's account type) therefore remains **unverified**; the CLI route works for the owner's team scope.
15. **Search gate re-run on the full corpus (2026-10-14).** Pagefind: zh 20/20, vi 8/8, en 11/11, first search 187,707 B gzip, total index 2,176,328 B gzip. Orama still fails (vi accent-insensitive, index size). U5 stays verified. U10 (glyph coverage) was exercised by the e2e CJK/Vietnamese pages but no visual glyph audit was done: still partly unverified. U16 (image provenance) remains open.
16. **Cleanup round (2026-10-14).** `scripts/commit.sh` was removed (item 13 no longer applies). Image provenance (§12, §15.5): per the owner's decision, /about, README and content/ASSETS.md state that all 126 images come from doocs/advanced-java at commit 1a35221 and are included under that repository's license (CC-BY-SA-4.0); their original authorship is not documented upstream. Earlier statements in this document that images "remain under their original terms" are superseded. `high-availability/sentinel-vs-hystrix` was released for translation with a source credit to the Sentinel wiki page (adaptation, Apache-2.0 notice and link). Deploys use Vercel's Git integration once the owner links the repository: a push to `main` deploys to production.
