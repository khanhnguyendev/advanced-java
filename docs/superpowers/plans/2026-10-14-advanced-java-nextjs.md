# advanced-java on Next.js 16 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the multilingual (vi/en/zh) Next.js 16 reading site for the doocs/advanced-java corpus, with a scalable collection model, a gated machine-translation pipeline, and a static Vercel deployment.

**Architecture:** Content is plain markdown in `content/<collection>/<locale>/…`, ordered by `collection.json`. A custom remark/rehype pipeline (links resolved → sanitize → heading ids → highlight) renders it inside a fully static `next-intl` App Router site; `proxy.ts` only negotiates the locale on unprefixed paths. Translations are produced offline by subagents and verified by a `check:translations` gate.

**Tech Stack:** Next.js 16.4.0, React 19, next-intl 4.14.9, TypeScript, unified/remark/rehype, Shiki via rehype-pretty-code, Vitest, Playwright, pnpm 10.34.5, Node ≥ 20.9. Search engine (Pagefind 1.5.2 or `@orama/orama` 3.1.18) is chosen by the Task 23 gate.

**Spec:** `docs/superpowers/specs/2026-10-13-advanced-java-nextjs-design.md` (approved 2026-10-14). Product context: `PRODUCT.md`. Upstream checkout: `ref/` (doocs/advanced-java, commit `1a35221`). Executors read both the spec and this plan.

## Global Constraints

Copied from the spec; every task's requirements include these.

- Next.js 16 latest (verified `next@16.4.0`), Node `>=20.9.0`, pnpm 10.34.5. `next-intl@4.14.9` (peer `next ^16`).
- Locales `vi`, `en`, `zh`; **default `en`**; source locale `zh`. Negotiation order: cookie → `Accept-Language` → `en`.
- Fallback chain: `vi → en → zh`, `en → zh`, `zh → zh`.
- Routes: `/{locale}/{collection}/{section}/{slug}`, locale always prefixed; slugs English and locale-independent.
- **Full static generation, no ISR.** `revalidate = false`, `dynamicParams = false`, `cacheComponents` **off** and explicit in `next.config`. Every locale layout and page calls `setRequestLocale(locale)`. The build must fail if any doc route is dynamic; the only allow-listed non-prerendered route is `/[locale]/[...rest]` (calls `notFound()` only).
- `proxy.ts` (not `middleware.ts`), `next-intl` `createMiddleware(routing)`, matcher exactly: `['/', '/((?!(?:en|vi|zh)(?:/|$)|_next|api|.*\\..*).+)']`. Unprefixed paths redirect (307) to the negotiated locale. The language switcher is the only writer of the `NEXT_LOCALE` cookie (`path=/`, 1 year, `SameSite=Lax`).
- Content is plain markdown through remark/rehype. MDX only for our own pages. Raw `<` and `{` in prose must never break rendering.
- Heading ids: `h<index>-<readable-slug>`, `index` = 1-based order of `h2`–`h6` headings (h1 has none), plus `data-hi="<index>"`. Anchor resolution matches on the `h<index>` prefix alone.
- Stored internal links are locale-neutral: `doc:<collection>/<section>/<slug>[#h<n>]`, `section:<collection>/<section>`, `home:`, `asset:<section>/<slug>/<file>`. Resolved at render time to the **route** locale. `doc:…#h<n>` resolves to the full target heading id so it works without JavaScript.
- Staleness hash: `sha256:v1:<hex>` of the canonical form of the parsed zh markdown (spec 4.7). `status` is `machine` or `reviewed`; **only the owner sets `reviewed`**; no agent or script writes it.
- vi and en are translated **directly from zh**, never from each other.
- Licenses: **CC-BY-SA-4.0** for `content/` text and translations; **MIT** for application code; images per spec §12 (only where we have the right; unknown provenance listed under "Image credits", not relicensed). Root `README.md` and `/about` state the split. Attribution and a statement of changes with a link to the upstream file at commit `1a35221` on every page.
- Fonts: `Noto Serif SC` loaded with `next/font` `preload: false`, applied only under `:lang(zh)` inside the doc body; UI chrome (including the "中文" switcher label) uses system CJK fallback; vi/en pages with no Han glyphs download **zero CJK font bytes**.
- Comments are out of v1. No analytics. No ISR. No upstream re-sync.
- Deploy: Vercel **Git integration** preferred; no deploy token on disk or read by an agent. **No deploy of any kind is performed by this plan**; production promotion is the owner's action.
- **Pilot is a hard stop** (Task 22). The full translation run (Task 26) does not start until the owner approves the pilot report.
- Commits: use `./scripts/commit.sh "<type>: <message>"` (created in Task 1); it appends the required attribution trailers.
- Do not touch Claude Code hooks or settings.

## Spec deltas found while planning (the plan wins where it differs; spec updated by Task 27)

1. **Raw HTML allowlist** (spec §5): imported docs contain raw inline `<sub>` (30×), `<sup>` (8×) and `<br>` (12×) outside code. The sanitizer allowlist is `br`, `sub`, `sup`, `img`, table family (not only `br`).
2. **Importer HTML rule** (spec §4.4 step 7): in imported docs only `br`, `sub`, `sup` and table elements may appear as raw HTML; anything else fails the import and is listed in the report (none today).
3. **Anchor remap** (spec §4.4 step 6): the target heading is `#### [circuitBreaker.sleepWindowInMilliseconds](https://github.com/Netflix/Hystrix/wiki/…)`, i.e. a heading whose text is the same words as the fragment but not a VitePress slug. Remap uses lenient matching (lowercase, letters and digits only) of the fragment against heading plain text, and fails on zero or multiple matches.
4. **Upstream file links** (spec §12): `collection.json` also stores `upstreamFiles[slug]` = `docs/<section>/<original-file>.md` so every page can link the exact upstream file (the apostrophe file's original name differs from its slug).
5. **Image src restriction** (spec §5) is implemented as a small plugin `rehypeRestrictImages` that runs after link resolution and before `rehype-sanitize`.

## Review Focus

The five inputs the spec implies but most likely to bite a reader; each has a pinning test in the owning task.

1. **Raw angle brackets and braces in prose** (`Map<String, Object>`, `{}`, `a < b`): must render literally, never crash or vanish. A valid-looking tag such as `<T>` outside code would vanish at render, so the importer and `check:translations` reject it (`raw-html`). Pinned in Tasks 7, 10 and 20.
2. **Headings with empty or duplicate readable slugs** (inline code only, emoji, CJK-only, same text twice): ids stay unique and valid (`h3`, `h4-…`). Pinned in Tasks 6 and 8.
3. **Hash beyond the heading count or stale slug** (`#h99`, `#h3-old-slug` after reword): lands on the last / right heading, never the top, never an error. Pinned in Tasks 14 and 17.
4. **`localStorage` unavailable or throwing** (private mode, blocked storage): resume flag and set-aside degrade silently. Pinned in Task 17.
5. **vi request where en is missing but zh exists, and a translation whose zh source changed**: serves zh with the right notice; stale translation shows the "original updated" note and is still served. Pinned in Tasks 11 and 16.

---

## File Structure

```
package.json  tsconfig.json  next.config.ts  vitest.config.ts  playwright.config.ts
proxy.ts                               # locale negotiation + unprefixed redirect (Task 12)
LICENSE (MIT)  README.md  PRODUCT.md  DESIGN.md (Impeccable, Task 27)  .gitignore
scripts/
  commit.sh                            # Task 1
  copy-assets.ts                       # Task 7 (prebuild: content/_assets -> public/_content)
  import-upstream.ts                   # Task 7 (run once)
  import/{slugs,links,sidebar,anchors,html-guard}.ts   # Tasks 4-7
  assert-static-build.ts               # Task 13 (postbuild)
  check-translations.ts                # Task 20
  translate/{prompt,stamp,meta,cost,batches,cli}.ts    # Task 21
  search-gate/{corpus,run}.ts + queries.json           # Task 23
  build-search-index.ts                # Task 24
lib/
  content/{types,collection,hash,fallback,headings-index}.ts   # Tasks 2,3,11,13
  render/{headings,heading-ids,links,images,pipeline}.ts       # Tasks 6,8,9,10
  check/{comments,compare}.ts                                  # Task 20
  search/{fold,types,rank,orama|pagefind}.ts                   # Tasks 23,24
  locale-cookie.ts anchor.ts messages.ts resume.ts notices.ts nav.ts steps.ts upstream.ts seo.ts stats.ts switcher.ts
i18n/{routing,request}.ts              # Task 12
messages/{en,vi,zh}.json               # Task 12
app/
  layout.tsx  not-found.tsx  sitemap.ts  globals.css  fonts.ts
  [locale]/{layout,page,not-found}.tsx  about/page.tsx
  [locale]/[...rest]/page.tsx
  [locale]/[collection]/page.tsx
  [locale]/[collection]/[section]/page.tsx
  [locale]/[collection]/[section]/[slug]/page.tsx
components/                            # Tasks 14-18, 24
content/
  LICENSE (CC-BY-SA-4.0)  ASSETS.md
  advanced-java/{collection.json, import-report.md, glossary.{en,vi}.json, translation-exceptions.json}
  advanced-java/{zh,vi,en}/{meta.json, <section>/<slug>.md}
  advanced-java/_assets/<section>/<slug>/...
tests/ ...                             # unit tests mirroring lib/ and scripts/
e2e/ ...                               # Playwright specs (Task 25)
docs/superpowers/{specs,plans,decisions,reports}/
```

---

## Task 1: Project scaffold, licenses, commit helper

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `scripts/commit.sh`, `LICENSE`, `content/LICENSE`, `README.md`, `app/layout.tsx`, `app/page.tsx`, `tests/repo.test.ts`

**Interfaces:**
- Produces: `pnpm test`, `pnpm typecheck`, `pnpm build` commands; `./scripts/commit.sh "<msg>"`; path alias `@/*` → project root; `LICENSE` (MIT) and `content/LICENSE` (CC-BY-SA-4.0).

- [ ] **Step 1: Initialize git and write config files**

Run in `/Users/ryan/ws/3.DSA/advanced-java`:

```bash
git init -b main
mkdir -p scripts content tests app
```

Create `.gitignore`:

```
node_modules
.next
out
ref/
public/_content
.env
.env.*
!.env.example
.translation/
.search-gate/
test-results
playwright-report
*.tsbuildinfo
.DS_Store
.impeccable/mocks
.impeccable/review
.impeccable/build
```

Create `package.json`:

```json
{
  "name": "advanced-java-site",
  "private": true,
  "license": "MIT",
  "packageManager": "pnpm@10.34.5",
  "engines": { "node": ">=20.9.0" },
  "scripts": {
    "dev": "next dev",
    "prebuild": "tsx scripts/copy-assets.ts",
    "build": "next build",
    "postbuild": "tsx scripts/assert-static-build.ts",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "import:upstream": "tsx scripts/import-upstream.ts",
    "check:translations": "tsx scripts/check-translations.ts",
    "e2e": "playwright test"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "ref", ".next"]
}
```

Create `next.config.ts` (the plugin path is created in Task 12; until then a stub is not needed because this task builds without next-intl):

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  cacheComponents: false,
};

export default config;
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    testTimeout: 30000,
  },
});
```

Create `scripts/commit.sh` and make it executable:

```bash
#!/usr/bin/env bash
set -euo pipefail
msg="${1:?commit message required}"
git commit -m "$msg" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBeGNR6YnfKc9qnqKeezyt"
```

```bash
chmod +x scripts/commit.sh
```

Create temporary `app/layout.tsx` and `app/page.tsx` (replaced in Tasks 12–13):

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// app/page.tsx
export default function Page() {
  return <main>advanced-java</main>;
}
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add next@16.4.0 react@^19 react-dom@^19
pnpm add -D typescript @types/node @types/react @types/react-dom vitest tsx
```

Expected: install succeeds; `package.json` now lists them. If Next 16.4.0 prints an unknown `cacheComponents` key warning during build, remove the key and record in `docs/superpowers/decisions/next-config.md` that the default is off (U3).

- [ ] **Step 3: Write the failing repo-license test**

Create `tests/repo.test.ts`:

```ts
import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('license split (spec §12)', () => {
  it('root LICENSE is MIT', () => {
    expect(existsSync('LICENSE')).toBe(true);
    expect(readFileSync('LICENSE', 'utf8')).toContain('MIT License');
  });

  it('content/LICENSE is CC-BY-SA-4.0', () => {
    expect(existsSync('content/LICENSE')).toBe(true);
    expect(readFileSync('content/LICENSE', 'utf8')).toContain('Attribution-ShareAlike 4.0 International');
  });

  it('package.json declares MIT', () => {
    expect(JSON.parse(readFileSync('package.json', 'utf8')).license).toBe('MIT');
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL (`LICENSE` / `content/LICENSE` missing).

- [ ] **Step 5: Add the license files and README stub**

```bash
cp ref/LICENSE content/LICENSE
head -3 content/LICENSE
```

Expected: the file's text includes "Attribution-ShareAlike 4.0 International". Create `LICENSE`:

```
MIT License

Copyright (c) 2026 advanced-java-site contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Create `README.md`:

```markdown
# advanced-java (Next.js)

Multilingual (vi / en / zh) reading site for the doocs/advanced-java corpus.

## Licenses

- **Code** (everything outside `content/`): MIT, see `LICENSE`.
- **Content** (`content/` text and translations): CC-BY-SA-4.0, see `content/LICENSE`.
  Original content by Doocs and 中华石杉, upstream: https://github.com/doocs/advanced-java .
  vi and en pages are translated and adapted from the Chinese original; zh pages are reformatted from it.
  Images are included only where we have the right to license them; see `content/ASSETS.md`.
```

- [ ] **Step 6: Run tests, typecheck and build**

Run: `pnpm test && pnpm typecheck`
Expected: PASS.

Run: `SKIP_ASSERT=1 pnpm exec next build`
Expected: build succeeds (the `postbuild` script does not exist yet; run `next build` directly here).

- [ ] **Step 7: Commit**

```bash
git add -A
./scripts/commit.sh "chore: scaffold Next 16 app, MIT code license, CC-BY-SA content license"
```

---

## Task 2: Content types and collection loader

**Files:**
- Create: `lib/content/types.ts`, `lib/content/collection.ts`
- Test: `tests/content/collection.test.ts`, `tests/fixtures/content/demo/collection.json`, `tests/fixtures/content/demo/en/meta.json`

**Interfaces:**
- Produces (used by every later task):

```ts
// lib/content/types.ts
export const LOCALES = ['en', 'vi', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export type DocStatus = 'machine' | 'reviewed';
export interface GroupConfig { id: string; docs: string[]; lead?: string }
export interface SectionConfig { id: string; prefix: string; groups: GroupConfig[] }
export interface CollectionConfig {
  id: string;
  sourceLocale: Locale;
  tabColor: string;
  fallback: Record<Locale, Locale[]>;
  sections: SectionConfig[];
  ids: Record<string, string>;
  upstream: { repo: string; commit: string };
  upstreamFiles: Record<string, string>;
}
export interface DocRef { collection: string; section: string; group: string; slug: string; catalogId: string }
export interface DocFrontmatter { source: { locale: Locale; slug: string; hash: string }; status: DocStatus; translatedAt: string }
export interface LocaleMeta {
  sections: Record<string, string>;
  groups: Record<string, string>;
  docs: Record<string, { title: string; navTitle: string }>;
}
// lib/content/collection.ts
export function contentRoot(): string; // process.env.CONTENT_ROOT ?? path.join(process.cwd(), 'content')
export function loadCollection(root: string, id: string): CollectionConfig;
export function listDocs(c: CollectionConfig): DocRef[];
export function loadMeta(root: string, collection: string, locale: Locale): LocaleMeta;
export function docFile(root: string, collection: string, locale: Locale, section: string, slug: string): string;
export function sectionOf(c: CollectionConfig, slug: string): string | undefined;
```

- [ ] **Step 1: Write the failing test and fixtures**

`tests/fixtures/content/demo/collection.json`:

```json
{
  "id": "demo",
  "sourceLocale": "zh",
  "tabColor": "#2f5bea",
  "fallback": { "vi": ["en", "zh"], "en": ["zh"], "zh": ["zh"] },
  "sections": [
    {
      "id": "alpha",
      "prefix": "AL",
      "groups": [
        { "id": "g1", "lead": "intro", "docs": ["intro", "second"] },
        { "id": "g2", "docs": ["third"] }
      ]
    }
  ],
  "ids": { "intro": "AL-01", "second": "AL-02", "third": "AL-03" },
  "upstream": { "repo": "https://github.com/doocs/advanced-java", "commit": "1a35221" },
  "upstreamFiles": { "intro": "docs/alpha/intro.md", "second": "docs/alpha/second.md", "third": "docs/alpha/third.md" }
}
```

`tests/fixtures/content/demo/en/meta.json`:

```json
{
  "sections": { "alpha": "Alpha" },
  "groups": { "g1": "Group one", "g2": "Group two" },
  "docs": { "intro": { "title": "Introduction", "navTitle": "Intro" } }
}
```

`tests/content/collection.test.ts`:

```ts
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { listDocs, loadCollection, loadMeta, docFile, sectionOf } from '@/lib/content/collection';

const root = path.resolve(__dirname, '../fixtures/content');

describe('collection loader', () => {
  it('loads and lists docs in order with catalog ids', () => {
    const c = loadCollection(root, 'demo');
    const docs = listDocs(c);
    expect(docs.map((d) => d.slug)).toEqual(['intro', 'second', 'third']);
    expect(docs.map((d) => d.catalogId)).toEqual(['AL-01', 'AL-02', 'AL-03']);
    expect(docs[0]).toMatchObject({ collection: 'demo', section: 'alpha', group: 'g1' });
  });

  it('finds the section of a slug', () => {
    const c = loadCollection(root, 'demo');
    expect(sectionOf(c, 'third')).toBe('alpha');
    expect(sectionOf(c, 'nope')).toBeUndefined();
  });

  it('rejects a doc with no catalog id', () => {
    const c = loadCollection(root, 'demo');
    delete c.ids.second;
    expect(() => listDocs(c)).toThrow(/catalog id.*second/i);
  });

  it('returns empty meta for a locale with no meta.json', () => {
    expect(loadMeta(root, 'demo', 'vi')).toEqual({ sections: {}, groups: {}, docs: {} });
  });

  it('reads localized meta', () => {
    expect(loadMeta(root, 'demo', 'en').docs.intro.title).toBe('Introduction');
  });

  it('builds the doc file path', () => {
    expect(docFile('/r', 'demo', 'vi', 'alpha', 'intro')).toBe('/r/demo/vi/alpha/intro.md');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/content/collection.test.ts`
Expected: FAIL, "Cannot find module '@/lib/content/collection'".

- [ ] **Step 3: Write minimal implementation**

`lib/content/types.ts`: exactly the declarations in **Interfaces** above.

`lib/content/collection.ts`:

```ts
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { CollectionConfig, DocRef, Locale, LocaleMeta } from './types';

export function contentRoot(): string {
  return process.env.CONTENT_ROOT ?? path.join(process.cwd(), 'content');
}

export function loadCollection(root: string, id: string): CollectionConfig {
  const file = path.join(root, id, 'collection.json');
  const c = JSON.parse(readFileSync(file, 'utf8')) as CollectionConfig;
  if (c.id !== id) throw new Error(`collection.json id "${c.id}" does not match folder "${id}"`);
  return c;
}

export function listDocs(c: CollectionConfig): DocRef[] {
  const out: DocRef[] = [];
  const seen = new Set<string>();
  for (const s of c.sections) {
    for (const g of s.groups) {
      for (const slug of g.docs) {
        if (seen.has(slug)) throw new Error(`duplicate slug "${slug}" in collection ${c.id}`);
        seen.add(slug);
        const catalogId = c.ids[slug];
        if (!catalogId) throw new Error(`missing catalog id for slug "${slug}"`);
        out.push({ collection: c.id, section: s.id, group: g.id, slug, catalogId });
      }
    }
  }
  return out;
}

export function sectionOf(c: CollectionConfig, slug: string): string | undefined {
  for (const s of c.sections) for (const g of s.groups) if (g.docs.includes(slug)) return s.id;
  return undefined;
}

export function loadMeta(root: string, collection: string, locale: Locale): LocaleMeta {
  const file = path.join(root, collection, locale, 'meta.json');
  if (!existsSync(file)) return { sections: {}, groups: {}, docs: {} };
  return JSON.parse(readFileSync(file, 'utf8')) as LocaleMeta;
}

export function docFile(root: string, collection: string, locale: Locale, section: string, slug: string): string {
  return path.join(root, collection, locale, section, `${slug}.md`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/content/collection.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && ./scripts/commit.sh "feat: content types and collection loader"
```

---

## Task 3: Canonical staleness hash (spec 4.7)

**Files:**
- Create: `lib/content/hash.ts`
- Test: `tests/content/hash.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export const CANON_VERSION = 'v1'; export function canonicalHash(markdown: string): string` returning `sha256:v1:<64 hex>`; `export function canonicalStream(markdown: string): string[]` (exported for debugging/tests).

- [ ] **Step 1: Install parser dependencies**

```bash
pnpm add unified remark-parse remark-gfm
pnpm add -D @types/mdast
```

- [ ] **Step 2: Write the failing test**

`tests/content/hash.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canonicalHash, CANON_VERSION } from '@/lib/content/hash';

const FENCE = '```';
const base = [
  '# Title',
  '',
  'First paragraph with *emphasis* and a [link](doc:demo/alpha/second).',
  '',
  '- one',
  '- two',
  '',
  '| a | b |',
  '| - | - |',
  '| 1 | 2 |',
  '',
  FENCE + 'java',
  'int  x = 1;',
  FENCE,
  '',
  'Use `a  b` here.',
  '',
].join('\n');

describe('canonicalHash', () => {
  it('has the versioned prefix', () => {
    expect(canonicalHash(base)).toMatch(/^sha256:v1:[0-9a-f]{64}$/);
    expect(CANON_VERSION).toBe('v1');
  });

  it('ignores CRLF and a BOM', () => {
    expect(canonicalHash('\uFEFF' + base.replace(/\n/g, '\r\n'))).toBe(canonicalHash(base));
  });

  it('ignores whitespace-only blank lines', () => {
    expect(canonicalHash(base.replace(/\n\n/g, '\n   \n'))).toBe(canonicalHash(base));
  });

  it('ignores line re-wrapping inside a paragraph', () => {
    const wrapped = base.replace('First paragraph with *emphasis* and', 'First paragraph\nwith *emphasis*\nand');
    expect(canonicalHash(wrapped)).toBe(canonicalHash(base));
  });

  it('ignores table padding and delimiter dash counts', () => {
    const padded = base.replace('| a | b |\n| - | - |\n| 1 | 2 |', '| a   | b   |\n| --- | --- |\n| 1   | 2   |');
    expect(canonicalHash(padded)).toBe(canonicalHash(base));
  });

  it('ignores bullet and emphasis marker characters', () => {
    const alt = base.replace('- one\n- two', '* one\n* two').replace('*emphasis*', '_emphasis_');
    expect(canonicalHash(alt)).toBe(canonicalHash(base));
  });

  it('ignores a leading frontmatter block', () => {
    expect(canonicalHash('---\nstatus: machine\n---\n' + base)).toBe(canonicalHash(base));
  });

  it('changes when whitespace inside a code block changes', () => {
    expect(canonicalHash(base.replace('int  x = 1;', 'int x = 1;'))).not.toBe(canonicalHash(base));
  });

  it('changes when whitespace inside an inline code span changes', () => {
    expect(canonicalHash(base.replace('`a  b`', '`a b`'))).not.toBe(canonicalHash(base));
  });

  it('changes when prose, link target or heading changes', () => {
    expect(canonicalHash(base.replace('First paragraph', 'Second paragraph'))).not.toBe(canonicalHash(base));
    expect(canonicalHash(base.replace('doc:demo/alpha/second', 'doc:demo/alpha/third'))).not.toBe(canonicalHash(base));
    expect(canonicalHash(base.replace('# Title', '## Title'))).not.toBe(canonicalHash(base));
  });

  it('keeps a hard break significant', () => {
    expect(canonicalHash('a  \nb\n')).not.toBe(canonicalHash('a\nb\n'));
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run tests/content/hash.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Write minimal implementation**

`lib/content/hash.ts`:

```ts
import { createHash } from 'node:crypto';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

export const CANON_VERSION = 'v1';

const collapse = (s: string) => s.replace(/\s+/g, ' ');
const rtrimLines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');

function stripFrontmatter(src: string): string {
  const s = src.replace(/^﻿/, '').normalize('NFC').replace(/\r\n?/g, '\n');
  return s.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function emit(node: any, out: string[]): void {
  switch (node.type) {
    case 'text':
      out.push('t:' + collapse(node.value));
      return;
    case 'inlineCode':
      out.push('ic:' + node.value);
      return;
    case 'code':
      out.push(`code:${node.lang ?? ''}:` + rtrimLines(node.value));
      return;
    case 'html':
      out.push('html:' + collapse(String(node.value).trim()));
      return;
    case 'break':
      out.push('br');
      return;
    case 'image':
      out.push(`img:${node.url}:${node.title ?? ''}:${node.alt ?? ''}`);
      return;
    case 'heading':
      out.push('h' + node.depth);
      break;
    case 'list':
      out.push('list:' + (node.ordered ? 'o' + (node.start ?? 1) : 'u'));
      break;
    case 'link':
      out.push(`a:${node.url}:${node.title ?? ''}`);
      break;
    case 'table':
      out.push('table:' + (node.align ?? []).map((a: string | null) => a ?? 'n').join(','));
      break;
    default:
      out.push(node.type);
  }
  if (node.children) {
    for (const c of node.children) emit(c, out);
    out.push('/');
  }
}

export function canonicalStream(markdown: string): string[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(stripFrontmatter(markdown));
  const out: string[] = [];
  emit(tree, out);
  return out;
}

export function canonicalHash(markdown: string): string {
  const h = createHash('sha256').update(canonicalStream(markdown).join('\n')).digest('hex');
  return `sha256:${CANON_VERSION}:${h}`;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run tests/content/hash.test.ts`
Expected: PASS. If a case fails because of how the test input was built, fix the **test input**, never the canonicalization rule (the rule is spec 4.7).

- [ ] **Step 6: Commit**

```bash
git add -A && ./scripts/commit.sh "feat: canonical AST staleness hash (v1)"
```

## Task 4: Slug sanitizing and link-target rewriting (importer building blocks)

**Files:**
- Create: `scripts/import/slugs.ts`, `scripts/import/links.ts`
- Test: `tests/import/slugs.test.ts`, `tests/import/links.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:

```ts
// scripts/import/slugs.ts
export function sanitizeSlug(fileName: string): string; // 'what\'s-x.md' -> 'whats-x'
// scripts/import/links.ts
export type Rewrite = string | { unwrap: true } | null;
export type LinkKind = 'link' | 'image';
export function rewriteLinkTargets(
  md: string,
  fn: (url: string, kind: LinkKind) => Rewrite,
): { text: string; unlocatable: string[] };
export interface LinkEnv {
  collection: string;
  sourceFile: string; // upstream key of the doc being processed: 'docs/<section>/<file>.md'
  slugByUpstream: Map<string, { section: string; slug: string }>;
  sectionReadmes: Map<string, string>; // 'docs/<section>/README.md' -> section id
  promos: Set<string>;
  assetFor: (sourceFile: string, relPath: string) => string | undefined; // -> 'asset:<section>/<slug>/<file>'
}
export type Classified = Rewrite | { fail: string };
export function classifyLink(url: string, env: LinkEnv): Classified;
```

- [ ] **Step 1: Install helper dependencies**

```bash
pnpm add unist-util-visit mdast-util-to-string
```

- [ ] **Step 2: Write the failing tests**

`tests/import/slugs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sanitizeSlug } from '../../scripts/import/slugs';

describe('sanitizeSlug', () => {
  it('keeps ordinary upstream slugs unchanged', () => {
    expect(sanitizeSlug('why-mq.md')).toBe('why-mq');
    expect(sanitizeSlug('redis-caching-avalanche-and-caching-penetration.md')).toBe(
      'redis-caching-avalanche-and-caching-penetration',
    );
  });
  it('drops the apostrophe', () => {
    expect(sanitizeSlug("what's-microservice-how-to-communicate.md")).toBe('whats-microservice-how-to-communicate');
  });
  it('normalizes case and separators', () => {
    expect(sanitizeSlug('Hello_World  Doc.md')).toBe('hello-world-doc');
  });
});
```

`tests/import/links.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { classifyLink, rewriteLinkTargets, type LinkEnv } from '../../scripts/import/links';

const env: LinkEnv = {
  collection: 'c',
  sourceFile: 'docs/alpha/why.md',
  slugByUpstream: new Map([
    ['docs/alpha/why.md', { section: 'alpha', slug: 'why' }],
    ['docs/alpha/what\'s-this.md', { section: 'alpha', slug: 'whats-this' }],
    ['docs/beta/other.md', { section: 'beta', slug: 'other' }],
  ]),
  sectionReadmes: new Map([['docs/alpha/README.md', 'alpha']]),
  promos: new Set(['docs/extra-page/offer.md']),
  assetFor: (src, rel) => (rel === './images/d.png' ? 'asset:alpha/why/d.png' : undefined),
};

describe('classifyLink', () => {
  it('leaves external, mailto and already-neutral urls alone', () => {
    expect(classifyLink('https://example.com/a.md', env)).toBeNull();
    expect(classifyLink('mailto:a@b.c', env)).toBeNull();
    expect(classifyLink('doc:c/alpha/why', env)).toBeNull();
  });
  it('rewrites a relative doc link', () => {
    expect(classifyLink("./what's-this.md", env)).toBe('doc:c/alpha/whats-this');
  });
  it('rewrites an absolute /docs/ link and a cross-section relative link', () => {
    expect(classifyLink('/docs/beta/other.md', env)).toBe('doc:c/beta/other');
    expect(classifyLink('../beta/other.md', env)).toBe('doc:c/beta/other');
  });
  it('rewrites a section README link to section:', () => {
    expect(classifyLink('./README.md', env)).toBe('section:c/alpha');
  });
  it('rewrites index.md to home:', () => {
    expect(classifyLink('../index.md', env)).toBe('home:');
  });
  it('unwraps a promo link', () => {
    expect(classifyLink('../extra-page/offer.md', env)).toEqual({ unwrap: true });
  });
  it('rewrites an image to asset:', () => {
    expect(classifyLink('./images/d.png', env)).toBe('asset:alpha/why/d.png');
  });
  it('fails on an unresolved internal doc link', () => {
    expect(classifyLink('./missing.md', env)).toEqual({ fail: expect.stringContaining('missing.md') });
  });
  it('fails on an image with no source file', () => {
    expect(classifyLink('./images/nope.png', env)).toEqual({ fail: expect.stringContaining('nope.png') });
  });
  it('keeps a fragment on a doc link', () => {
    expect(classifyLink('./why.md#h2', env)).toBe('doc:c/alpha/why#h2');
  });
});

describe('rewriteLinkTargets', () => {
  it('rewrites link and image destinations in place without reformatting the rest', () => {
    const md = 'Intro  text  with   spacing.\n\nSee [a](./x.md) and ![i](./images/d.png "t").\n';
    const { text, unlocatable } = rewriteLinkTargets(md, (url, kind) =>
      kind === 'image' ? 'asset:alpha/why/d.png' : url === './x.md' ? 'doc:c/alpha/x' : null,
    );
    expect(text).toBe('Intro  text  with   spacing.\n\nSee [a](doc:c/alpha/x) and ![i](asset:alpha/why/d.png "t").\n');
    expect(unlocatable).toEqual([]);
  });
  it('unwraps a link to its label', () => {
    const { text } = rewriteLinkTargets('A [the **promo**](./offer.md) here.\n', () => ({ unwrap: true }));
    expect(text).toBe('A the **promo** here.\n');
  });
  it('does not touch fenced code', () => {
    const md = '```md\n[a](./x.md)\n```\n';
    const { text } = rewriteLinkTargets(md, () => 'doc:c/a/x');
    expect(text).toBe(md);
  });
  it('reports a rewritable link whose destination cannot be located in the source', () => {
    const md = '[a](<./sp ace.md>)\n';
    const { unlocatable } = rewriteLinkTargets(md, () => 'doc:c/a/x');
    expect(unlocatable).toEqual(['./sp ace.md']);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run tests/import/slugs.test.ts tests/import/links.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 4: Write the implementation**

`scripts/import/slugs.ts`:

```ts
export function sanitizeSlug(fileName: string): string {
  return fileName
    .replace(/\.md$/i, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’`]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

`scripts/import/links.ts`:

```ts
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';

export type Rewrite = string | { unwrap: true } | null;
export type LinkKind = 'link' | 'image';

export function rewriteLinkTargets(
  md: string,
  fn: (url: string, kind: LinkKind) => Rewrite,
): { text: string; unlocatable: string[] } {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(md);
  const edits: { start: number; end: number; text: string }[] = [];
  const unlocatable: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visit(tree, (node: any) => {
    if (node.type !== 'link' && node.type !== 'image' && node.type !== 'definition') return;
    const kind: LinkKind = node.type === 'image' ? 'image' : 'link';
    const r = fn(node.url, kind);
    if (r === null) return;
    const start: number = node.position.start.offset;
    const end: number = node.position.end.offset;
    const slice = md.slice(start, end);
    let at: number;
    if (node.type === 'definition') {
      const colon = slice.indexOf(']:');
      at = colon === -1 ? -1 : slice.indexOf(node.url, colon);
      if (at === -1) return void unlocatable.push(node.url);
      if (typeof r === 'string') edits.push({ start: start + at, end: start + at + node.url.length, text: r });
      return;
    }
    const marker = '](' + node.url;
    at = slice.lastIndexOf(marker);
    if (at === -1) return void unlocatable.push(node.url);
    if (typeof r === 'object') {
      if (node.type === 'link') edits.push({ start, end, text: slice.slice(1, at) });
      return;
    }
    edits.push({ start: start + at + 2, end: start + at + 2 + node.url.length, text: r });
  });

  edits.sort((a, b) => b.start - a.start);
  let text = md;
  for (const e of edits) text = text.slice(0, e.start) + e.text + text.slice(e.end);
  return { text, unlocatable };
}

export interface LinkEnv {
  collection: string;
  sourceFile: string;
  slugByUpstream: Map<string, { section: string; slug: string }>;
  sectionReadmes: Map<string, string>;
  promos: Set<string>;
  assetFor: (sourceFile: string, relPath: string) => string | undefined;
}
export type Classified = Rewrite | { fail: string };

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const IMAGE = /\.(png|jpe?g|gif|svg|webp)$/i;

export function classifyLink(url: string, env: LinkEnv): Classified {
  if (SCHEME.test(url) || url.startsWith('#') || url.startsWith('//')) return null;
  const hashAt = url.indexOf('#');
  const pathPart = hashAt === -1 ? url : url.slice(0, hashAt);
  const frag = hashAt === -1 ? '' : url.slice(hashAt);

  if (IMAGE.test(pathPart)) {
    const a = env.assetFor(env.sourceFile, pathPart);
    return a ? a : { fail: `image not found for ${url} (from ${env.sourceFile})` };
  }
  if (!/\.md$/i.test(pathPart)) return { fail: `unsupported internal link target ${url} (from ${env.sourceFile})` };

  let key: string;
  if (pathPart.startsWith('/docs/')) key = pathPart.slice(1);
  else if (pathPart.startsWith('/')) key = 'docs' + pathPart;
  else key = path.posix.normalize(path.posix.join(path.posix.dirname(env.sourceFile), pathPart));

  const doc = env.slugByUpstream.get(key);
  if (doc) return `doc:${env.collection}/${doc.section}/${doc.slug}${frag}`;
  const sec = env.sectionReadmes.get(key);
  if (sec) return `section:${env.collection}/${sec}`;
  if (key === 'docs/index.md') return 'home:';
  if (env.promos.has(key)) return { unwrap: true };
  return { fail: `unresolved internal link ${url} -> ${key} (from ${env.sourceFile})` };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run tests/import/slugs.test.ts tests/import/links.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && ./scripts/commit.sh "feat: importer slug sanitizing and link-target rewriting"
```

---

## Task 5: Sidebar parsing and unlisted-doc placement

**Files:**
- Create: `scripts/import/sidebar.ts`
- Test: `tests/import/sidebar.test.ts`

**Interfaces:**
- Consumes: `sanitizeSlug` (Task 4).
- Produces:

```ts
export interface ParsedItem { text: string; link?: string; items?: ParsedItem[] }
export function loadSidebar(configPath: string): ParsedItem[];
export const SECTION_PREFIXES: Record<string, string>; // high-concurrency:'HC', distributed-system:'DS', high-availability:'HA', micro-services:'MS', big-data:'BD'
export interface PlanGroup { id: string; title: string; lead?: string; docs: string[] }
export interface PlanSection { id: string; title: string; groups: PlanGroup[] }
export interface PlanDoc { slug: string; section: string; navTitle: string; upstreamFile: string } // upstreamFile: 'docs/<section>/<file>.md'
export interface ImportPlan { sections: PlanSection[]; docs: Record<string, PlanDoc>; external: string[] }
export function planFromSidebar(items: ParsedItem[]): ImportPlan;
export function readmeOrder(readmeMd: string): { file: string; title: string }[]; // upstream keys in README order
export function placeUnlisted(plan: ImportPlan, readme: { file: string; title: string }[], unlisted: string[]): ImportPlan;
```

- [ ] **Step 1: Write the failing tests**

`tests/import/sidebar.test.ts`:

```ts
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadSidebar, placeUnlisted, planFromSidebar, readmeOrder } from '../../scripts/import/sidebar';

const CONFIG = `import { defineConfig } from "vitepress";

export default defineConfig({
  title: "t",
  themeConfig: {
    footer: { copyright: \`Copyright \${new Date().getFullYear()}\` },
    sidebar: [
      { text: "Alpha", collapsed: true, items: [
        { text: "Queue", link: "/alpha/queue-lead.md", collapsed: true, items: [
          { text: "Why", link: "/alpha/why.md" },
          { text: "What's", link: "/alpha/what's-this.md" },
        ]},
        { text: "Single", link: "/alpha/single.md" },
        { text: "Repo", link: "https://github.com/doocs/advanced-java" },
      ]},
    ],
  },
  vite: { build: { chunkSizeWarningLimit: 1000 } },
});
`;

function writeConfig() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'sb-'));
  const f = path.join(dir, 'config.mts');
  writeFileSync(f, CONFIG);
  return f;
}

describe('sidebar', () => {
  it('evaluates the VitePress config and plans sections, groups and leads', () => {
    const plan = planFromSidebar(loadSidebar(writeConfig()));
    expect(plan.sections.map((s) => s.id)).toEqual(['alpha']);
    const groups = plan.sections[0].groups;
    expect(groups[0]).toMatchObject({ title: 'Queue', lead: 'queue-lead', docs: ['queue-lead', 'why', 'whats-this'] });
    expect(groups[1].docs).toEqual(['single']);
    expect(plan.docs['whats-this']).toMatchObject({
      section: 'alpha',
      navTitle: "What's",
      upstreamFile: "docs/alpha/what's-this.md",
    });
    expect(plan.external).toEqual(['https://github.com/doocs/advanced-java']);
  });

  it('parses the root README order', () => {
    const md = '# t\n\n## A\n\n-   [Why](/docs/alpha/why.md)\n-   [Unlisted](/docs/alpha/unlisted.md)\n-   [Single](/docs/alpha/single.md)\n';
    expect(readmeOrder(md)).toEqual([
      { file: 'docs/alpha/why.md', title: 'Why' },
      { file: 'docs/alpha/unlisted.md', title: 'Unlisted' },
      { file: 'docs/alpha/single.md', title: 'Single' },
    ]);
  });

  it('places an unlisted doc right after its README predecessor', () => {
    const plan = planFromSidebar(loadSidebar(writeConfig()));
    const readme = readmeOrder('-   [Why](/docs/alpha/why.md)\n-   [Unlisted](/docs/alpha/unlisted.md)\n');
    const placed = placeUnlisted(plan, readme, ['docs/alpha/unlisted.md']);
    expect(placed.sections[0].groups[0].docs).toEqual(['queue-lead', 'why', 'unlisted', 'whats-this']);
    expect(placed.docs.unlisted.navTitle).toBe('Unlisted');
  });

  it('throws when an unlisted doc is not in the README', () => {
    const plan = planFromSidebar(loadSidebar(writeConfig()));
    expect(() => placeUnlisted(plan, [], ['docs/alpha/ghost.md'])).toThrow(/ghost\.md/);
  });
});

describe.skipIf(!existsSync('ref/docs/.vitepress/config.mts'))('real upstream sidebar', () => {
  it('plans 5 sections and 78 docs with 1 external link', () => {
    const plan = planFromSidebar(loadSidebar('ref/docs/.vitepress/config.mts'));
    expect(plan.sections.map((s) => s.id)).toEqual([
      'high-concurrency',
      'distributed-system',
      'high-availability',
      'micro-services',
      'big-data',
    ]);
    expect(Object.keys(plan.docs)).toHaveLength(78);
    expect(plan.external).toHaveLength(1);
    expect(plan.docs['whats-microservice-how-to-communicate'].upstreamFile).toBe(
      "docs/micro-services/what's-microservice-how-to-communicate.md",
    );
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/import/sidebar.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`scripts/import/sidebar.ts`:

```ts
import { readFileSync } from 'node:fs';
import { sanitizeSlug } from './slugs';

export interface ParsedItem { text: string; link?: string; items?: ParsedItem[] }

export const SECTION_PREFIXES: Record<string, string> = {
  'high-concurrency': 'HC',
  'distributed-system': 'DS',
  'high-availability': 'HA',
  'micro-services': 'MS',
  'big-data': 'BD',
};

export function loadSidebar(configPath: string): ParsedItem[] {
  let src = readFileSync(configPath, 'utf8');
  src = src.replace(/^\s*import[^;\n]*;?\s*$/gm, '');
  const idx = src.indexOf('export default');
  if (idx === -1) throw new Error(`no default export in ${configPath}`);
  src = src.slice(idx).replace(/^export default\s+defineConfig\(/, 'return (');
  const cfg = new Function(src)() as { themeConfig?: { sidebar?: ParsedItem[] } };
  const sidebar = cfg.themeConfig?.sidebar;
  if (!Array.isArray(sidebar)) throw new Error('themeConfig.sidebar is not an array');
  return sidebar;
}

export interface PlanGroup { id: string; title: string; lead?: string; docs: string[] }
export interface PlanSection { id: string; title: string; groups: PlanGroup[] }
export interface PlanDoc { slug: string; section: string; navTitle: string; upstreamFile: string }
export interface ImportPlan { sections: PlanSection[]; docs: Record<string, PlanDoc>; external: string[] }

const isExternal = (l: string) => /^https?:\/\//.test(l);

function toDoc(link: string, navTitle: string): PlanDoc {
  const m = /^\/([^/]+)\/(.+\.md)$/.exec(link);
  if (!m) throw new Error(`unexpected sidebar link ${link}`);
  return { slug: sanitizeSlug(m[2]), section: m[1], navTitle, upstreamFile: `docs/${m[1]}/${m[2]}` };
}

export function planFromSidebar(items: ParsedItem[]): ImportPlan {
  const plan: ImportPlan = { sections: [], docs: {}, external: [] };
  const add = (d: PlanDoc) => {
    if (plan.docs[d.slug]) throw new Error(`duplicate slug ${d.slug}`);
    plan.docs[d.slug] = d;
  };

  for (const top of items) {
    if (!top.items?.length) continue;
    const firstLink = findFirstLink(top);
    if (!firstLink) continue;
    const sectionId = toDoc(firstLink, '').section;
    const section: PlanSection = { id: sectionId, title: top.text, groups: [] };
    let gi = 0;
    let loose: PlanGroup | undefined;

    for (const child of top.items) {
      if (child.link && isExternal(child.link)) {
        plan.external.push(child.link);
        continue;
      }
      if (child.items?.length) {
        gi += 1;
        const docs: string[] = [];
        let lead: string | undefined;
        if (child.link) {
          const d = toDoc(child.link, child.text);
          add(d);
          docs.push(d.slug);
          lead = d.slug;
        }
        const collect = (item: ParsedItem) => {
          if (item.link) {
            if (isExternal(item.link)) plan.external.push(item.link);
            else {
              const d = toDoc(item.link, item.text);
              if (!plan.docs[d.slug]) {
                add(d);
                docs.push(d.slug);
              }
            }
          }
          for (const c of item.items ?? []) collect(c);
        };
        for (const leaf of child.items) collect(leaf);
        section.groups.push({ id: lead ?? `${sectionId}-g${gi}`, title: child.text, lead, docs });
      } else if (child.link) {
        const d = toDoc(child.link, child.text);
        add(d);
        if (!loose) {
          gi += 1;
          loose = { id: `${sectionId}-g${gi}`, title: top.text, docs: [] };
          section.groups.push(loose);
        }
        loose.docs.push(d.slug);
      }
    }
    plan.sections.push(section);
  }
  return plan;
}

function findFirstLink(item: ParsedItem): string | undefined {
  if (item.link && !isExternal(item.link)) return item.link;
  for (const c of item.items ?? []) {
    const l = findFirstLink(c);
    if (l) return l;
  }
  return undefined;
}

export function readmeOrder(readmeMd: string): { file: string; title: string }[] {
  const out: { file: string; title: string }[] = [];
  const re = /^\s*[-*]\s+\[([^\]]+)\]\(\/(docs\/[^)]+\.md)\)/gm;
  for (let m = re.exec(readmeMd); m; m = re.exec(readmeMd)) out.push({ file: m[2], title: m[1] });
  return out;
}

export function placeUnlisted(
  plan: ImportPlan,
  readme: { file: string; title: string }[],
  unlisted: string[],
): ImportPlan {
  const next: ImportPlan = JSON.parse(JSON.stringify(plan));
  const slugByFile = (f: string) => Object.values(next.docs).find((d) => d.upstreamFile === f)?.slug;

  for (const file of unlisted) {
    const at = readme.findIndex((r) => r.file === file);
    if (at === -1) throw new Error(`unlisted doc ${file} is not listed in the root README; cannot position it`);
    const m = /^docs\/([^/]+)\/(.+\.md)$/.exec(file)!;
    let predecessor: string | undefined;
    for (let i = at - 1; i >= 0 && !predecessor; i--) predecessor = slugByFile(readme[i].file);
    if (!predecessor) throw new Error(`no placed predecessor for ${file} in the root README`);
    const pred = next.docs[predecessor];
    if (pred.section !== m[1]) throw new Error(`predecessor of ${file} is in another section (${pred.section})`);
    const slug = sanitizeSlug(m[2]);
    const group = next.sections.flatMap((s) => s.groups).find((g) => g.docs.includes(predecessor!))!;
    group.docs.splice(group.docs.indexOf(predecessor) + 1, 0, slug);
    next.docs[slug] = { slug, section: m[1], navTitle: readme[at].title, upstreamFile: file };
  }
  return next;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm vitest run tests/import/sidebar.test.ts`
Expected: PASS (the real-upstream case runs because `ref/` exists; the dedupe for repeated leads is exercised there).

- [ ] **Step 5: Commit**

```bash
git add -A && ./scripts/commit.sh "feat: importer sidebar parsing and unlisted-doc placement"
```

---

## Task 6: Heading model, readable slugs and anchor remapping

**Files:**
- Create: `lib/render/headings.ts`, `scripts/import/anchors.ts`
- Test: `tests/render/headings.test.ts`, `tests/import/anchors.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:

```ts
// lib/render/headings.ts
export interface HeadingInfo { index: number; depth: number; text: string; id: string }
export function readableSlug(text: string): string;
export function headingId(index: number, text: string): string; // 'h3-why-mq' or 'h3' when slug is empty
export function extractHeadings(md: string): HeadingInfo[];     // h2–h6 in document order, 1-based index
export function firstH1(md: string): string | undefined;
// scripts/import/anchors.ts
export function lenientKey(s: string): string;
export function remapFragment(fragment: string, headings: { index: number; text: string }[]): number; // throws unless exactly one match
```

- [ ] **Step 1: Write the failing tests**

`tests/render/headings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { extractHeadings, firstH1, headingId, readableSlug } from '@/lib/render/headings';

const FENCE = '```';

describe('readableSlug / headingId', () => {
  it('slugifies Latin text', () => {
    expect(readableSlug('Why use a Message Queue?')).toBe('why-use-a-message-queue');
  });
  it('keeps CJK letters', () => {
    expect(readableSlug('为什么使用消息队列？')).toBe('为什么使用消息队列');
  });
  it('strips Vietnamese combining marks but keeps đ', () => {
    expect(readableSlug('Độ trễ của hàng đợi')).toBe('đo-tre-cua-hang-đoi');
  });
  it('truncates long slugs to 48 characters without a trailing hyphen', () => {
    const s = readableSlug('a '.repeat(60));
    expect(s.length).toBeLessThanOrEqual(48);
    expect(s.endsWith('-')).toBe(false);
  });
  it('produces h<index> when the slug is empty (emoji or punctuation only)', () => {
    expect(headingId(3, '🔥🔥')).toBe('h3');
    expect(headingId(4, '？？')).toBe('h4');
  });
  it('produces h<index>-<slug> otherwise', () => {
    expect(headingId(3, 'Why MQ')).toBe('h3-why-mq');
  });
});

describe('extractHeadings', () => {
  const md = [
    '# Title',
    '',
    '## Same',
    '',
    '### `inline code only`',
    '',
    '## Same',
    '',
    FENCE,
    '## not a heading',
    FENCE,
    '',
    '##### Deep',
    '',
  ].join('\n');

  it('indexes h2–h6 in document order, skipping h1 and code', () => {
    const hs = extractHeadings(md);
    expect(hs.map((h) => [h.index, h.depth, h.text])).toEqual([
      [1, 2, 'Same'],
      [2, 3, 'inline code only'],
      [3, 2, 'Same'],
      [4, 5, 'Deep'],
    ]);
  });
  it('keeps ids unique even when heading text repeats', () => {
    const ids = extractHeadings(md).map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['h1-same', 'h2-inline-code-only', 'h3-same', 'h4-deep']);
  });
  it('uses link text, not the url, for a heading that is a link', () => {
    const hs = extractHeadings('## [circuitBreaker.sleepWindowInMilliseconds](https://example.com/x)\n');
    expect(hs[0].text).toBe('circuitBreaker.sleepWindowInMilliseconds');
  });
  it('extracts the first h1', () => {
    expect(firstH1(md)).toBe('Title');
    expect(firstH1('## only h2\n')).toBeUndefined();
  });
});
```

`tests/import/anchors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lenientKey, remapFragment } from '../../scripts/import/anchors';

const headings = [
  { index: 1, text: 'Half-Open' },
  { index: 2, text: 'circuitBreaker.sleepWindowInMilliseconds' },
  { index: 3, text: 'circuitBreaker.errorThresholdPercentage' },
];

describe('anchor remap', () => {
  it('normalizes case and punctuation', () => {
    expect(lenientKey('circuitBreaker.sleepWindowInMilliseconds')).toBe('circuitbreakersleepwindowinmilliseconds');
  });
  it('maps the upstream fragment to a heading index', () => {
    expect(remapFragment('circuitBreaker.sleepWindowInMilliseconds', headings)).toBe(2);
    expect(remapFragment('circuitbreaker-sleepwindowinmilliseconds', headings)).toBe(2);
  });
  it('decodes percent-encoded fragments', () => {
    expect(remapFragment('%E6%B6%88%E6%81%AF', [{ index: 7, text: '消息' }])).toBe(7);
  });
  it('throws on no match', () => {
    expect(() => remapFragment('nope', headings)).toThrow(/matches 0 headings/);
  });
  it('throws on an ambiguous match', () => {
    expect(() => remapFragment('same', [{ index: 1, text: 'Same' }, { index: 2, text: 'same!' }])).toThrow(
      /matches 2 headings/,
    );
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/render/headings.test.ts tests/import/anchors.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`lib/render/headings.ts`:

```ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';

export interface HeadingInfo { index: number; depth: number; text: string; id: string }

export function readableSlug(text: string): string {
  const s = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return Array.from(s).slice(0, 48).join('').replace(/-+$/, '');
}

export function headingId(index: number, text: string): string {
  const s = readableSlug(text);
  return s ? `h${index}-${s}` : `h${index}`;
}

function parse(md: string) {
  return unified().use(remarkParse).use(remarkGfm).parse(md);
}

export function extractHeadings(md: string): HeadingInfo[] {
  const out: HeadingInfo[] = [];
  let index = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visit(parse(md), 'heading', (node: any) => {
    if (node.depth < 2) return;
    index += 1;
    const text = toString(node, { includeHtml: false, includeImageAlt: false }).trim();
    out.push({ index, depth: node.depth, text, id: headingId(index, text) });
  });
  return out;
}

export function firstH1(md: string): string | undefined {
  let found: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visit(parse(md), 'heading', (node: any) => {
    if (node.depth === 1 && found === undefined) found = toString(node, { includeHtml: false, includeImageAlt: false }).trim();
  });
  return found;
}
```

`scripts/import/anchors.ts`:

```ts
export function lenientKey(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

export function remapFragment(fragment: string, headings: { index: number; text: string }[]): number {
  let frag = fragment.replace(/^#/, '');
  try {
    frag = decodeURIComponent(frag);
  } catch {
    /* keep the raw fragment */
  }
  const key = lenientKey(frag);
  const hits = headings.filter((h) => lenientKey(h.text) === key);
  if (hits.length !== 1) {
    throw new Error(`anchor "${fragment}" matches ${hits.length} headings`);
  }
  return hits[0].index;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm vitest run tests/render/headings.test.ts tests/import/anchors.test.ts`
Expected: PASS. (If the Vietnamese expectation fails, check that `đ` (U+0111) has no NFKD decomposition and remains `đ`; adjust the test only if that fact is wrong, and document it.)

- [ ] **Step 5: Commit**

```bash
git add -A && ./scripts/commit.sh "feat: heading model, readable slugs, anchor remapping"
```

---

## Task 7: Import runner (run once), asset copy, report

**Files:**
- Create: `scripts/import/html-guard.ts`, `scripts/import-upstream.ts`, `scripts/copy-assets.ts`
- Test: `tests/import/html-guard.test.ts`, `tests/import/run-import.test.ts`, `tests/import/real-upstream.test.ts`, `tests/import/copy-assets.test.ts`
- Output (committed, produced by running the script): `content/advanced-java/**`, `content/advanced-java/import-report.md`

**Interfaces:**
- Consumes: `sanitizeSlug`, `rewriteLinkTargets`, `classifyLink`, `LinkEnv` (Task 4); `loadSidebar`, `planFromSidebar`, `readmeOrder`, `placeUnlisted`, `SECTION_PREFIXES`, `ImportPlan` (Task 5); `extractHeadings`, `firstH1` and `remapFragment` (Task 6); `CollectionConfig`, `LocaleMeta` (Task 2).
- Produces:

```ts
// scripts/import/html-guard.ts
export const ALLOWED_HTML = new Set(['br','sub','sup','table','thead','tbody','tfoot','tr','th','td','caption']);
export function disallowedHtml(md: string): { tag: string; line: number }[];
// scripts/import-upstream.ts
export interface ImportOptions {
  upstreamRoot: string;   // folder containing docs/ and README.md
  outRoot: string;        // content root, e.g. 'content'
  collection: string;     // 'advanced-java'
  commit: string;         // full upstream commit sha
  prefixes?: Record<string, string>; // defaults to SECTION_PREFIXES
  repo?: string;          // defaults to 'https://github.com/doocs/advanced-java'
}
export interface ImportResult { docCount: number; reportPath: string }
export function runImport(opts: ImportOptions): ImportResult; // throws Error listing every problem, writes nothing on failure
// scripts/copy-assets.ts
export function copyAssets(contentRoot: string, publicRoot: string): number; // returns files copied
```

- [ ] **Step 1: Write the failing html-guard and copy-assets tests**

`tests/import/html-guard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { disallowedHtml } from '../../scripts/import/html-guard';

const FENCE = '```';

describe('disallowedHtml', () => {
  it('allows br, sub, sup and table elements', () => {
    expect(disallowedHtml('a<br>b <sub>2</sub> <sup>3</sup>\n\n<table><tr><td>x</td></tr></table>\n')).toEqual([]);
  });
  it('flags div, img, iframe and unknown tags with their line', () => {
    const r = disallowedHtml('ok\n\n<div style="x">hi</div>\n\n<img src="a.png">\n');
    expect(r.map((x) => x.tag).sort()).toEqual(['div', 'img']);
    expect(r.find((x) => x.tag === 'div')!.line).toBe(3);
  });
  it('ignores angle brackets in code spans and fenced code', () => {
    const md = 'Use `Map<String, Object>` here.\n\n' + FENCE + 'java\nList<Integer> xs;\n<div>\n' + FENCE + '\n';
    expect(disallowedHtml(md)).toEqual([]);
  });
});
```

`tests/import/copy-assets.test.ts`:

```ts
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { copyAssets } from '../../scripts/copy-assets';

describe('copyAssets', () => {
  it('copies _assets of every collection to public/_content', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ca-'));
    const content = path.join(root, 'content');
    const pub = path.join(root, 'public');
    mkdirSync(path.join(content, 'demo/_assets/alpha/why'), { recursive: true });
    writeFileSync(path.join(content, 'demo/_assets/alpha/why/d.png'), 'png');
    mkdirSync(path.join(content, 'demo/zh/alpha'), { recursive: true });
    writeFileSync(path.join(content, 'demo/zh/alpha/why.md'), '# x');
    expect(copyAssets(content, pub)).toBe(1);
    expect(readFileSync(path.join(pub, '_content/demo/alpha/why/d.png'), 'utf8')).toBe('png');
    expect(existsSync(path.join(pub, '_content/demo/zh'))).toBe(false);
  });
  it('returns 0 when there is no content yet', () => {
    expect(copyAssets('/nonexistent-content', '/tmp/ignored-public')).toBe(0);
  });
});
```

- [ ] **Step 2: Write the failing import-runner tests (fixture upstream built in code)**

`tests/import/run-import.test.ts`:

```ts
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runImport } from '../../scripts/import-upstream';

const FENCE = '```';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const CONFIG = `import { defineConfig } from "vitepress";
export default defineConfig({
  themeConfig: {
    sidebar: [
      { text: "Alpha", collapsed: true, items: [
        { text: "Queue", link: "/alpha/queue-lead.md", collapsed: true, items: [
          { text: "Why", link: "/alpha/why.md" },
          { text: "What's", link: "/alpha/what's-this.md" },
        ]},
        { text: "Single", link: "/alpha/single.md" },
      ]},
    ],
  },
});
`;

function write(root: string, rel: string, data: string | Buffer) {
  const f = path.join(root, rel);
  mkdirSync(path.dirname(f), { recursive: true });
  writeFileSync(f, data);
}

function makeUpstream(extra: Record<string, string> = {}) {
  const up = mkdtempSync(path.join(os.tmpdir(), 'up-'));
  write(up, 'docs/.vitepress/config.mts', CONFIG);
  write(up, 'README.md', '# t\n\n-   [Why](/docs/alpha/why.md)\n-   [Unlisted one](/docs/alpha/unlisted.md)\n-   [Single](/docs/alpha/single.md)\n');
  write(up, 'docs/index.md', '---\nlayout: home\n---\n');
  write(up, 'docs/alpha/README.md', '# Alpha\n\n- [Why](./why.md)\n');
  write(up, 'docs/alpha/queue-lead.md', [
    '# Queue lead', '', '## Part A', '',
    'See [why](./why.md), [readme](./README.md), [home](../index.md) and [promo](../extra-page/offer.md).', '',
    FENCE + 'text', 'x', FENCE, '',
  ].join('\n'));
  write(up, 'docs/alpha/why.md', [
    '# Why', '', '## Q', '',
    'Image ![d](./images/d.png)', '',
    "Go to [quirky](./what's-this.md) and [circuit](#circuit.breaker).", '',
    '## circuit.breaker', '', 'Text with <sub>x</sub> and a<br>b.', '',
  ].join('\n'));
  write(up, "docs/alpha/what's-this.md", '# Quirk\n\nBody.\n');
  write(up, 'docs/alpha/single.md', '# Single\n');
  write(up, 'docs/alpha/unlisted.md', '# Unlisted\n');
  write(up, 'docs/alpha/images/d.png', PNG);
  write(up, 'docs/extra-page/README.md', '# Extra\n');
  write(up, 'docs/extra-page/offer.md', '<p align="center">promo</p>\n');
  for (const [rel, data] of Object.entries(extra)) write(up, rel, data);
  return up;
}

const base = { collection: 'fixture', commit: 'a'.repeat(40), prefixes: { alpha: 'AL' } };

describe('runImport (fixture upstream)', () => {
  it('imports docs, rewrites links, copies assets and writes the collection', () => {
    const up = makeUpstream();
    const out = mkdtempSync(path.join(os.tmpdir(), 'out-'));
    const r = runImport({ upstreamRoot: up, outRoot: out, ...base });
    expect(r.docCount).toBe(5);

    const c = JSON.parse(readFileSync(path.join(out, 'fixture/collection.json'), 'utf8'));
    expect(c.sourceLocale).toBe('zh');
    expect(c.sections[0].groups[0]).toMatchObject({ lead: 'queue-lead', docs: ['queue-lead', 'why', 'unlisted', 'whats-this'] });
    expect(c.ids).toEqual({ 'queue-lead': 'AL-01', why: 'AL-02', unlisted: 'AL-03', 'whats-this': 'AL-04', single: 'AL-05' });
    expect(c.upstreamFiles['whats-this']).toBe("docs/alpha/what's-this.md");
    expect(c.upstream.commit).toBe('a'.repeat(40));

    const why = readFileSync(path.join(out, 'fixture/zh/alpha/why.md'), 'utf8');
    expect(why).toContain('![d](asset:alpha/why/d.png)');
    expect(why).toContain('(doc:fixture/alpha/whats-this)');
    expect(why).toContain('(#h2)');
    expect(why).toContain('<sub>x</sub>');

    const lead = readFileSync(path.join(out, 'fixture/zh/alpha/queue-lead.md'), 'utf8');
    expect(lead).toContain('(doc:fixture/alpha/why)');
    expect(lead).toContain('(section:fixture/alpha)');
    expect(lead).toContain('(home:)');
    expect(lead).toContain('and promo.');
    expect(lead).not.toContain('offer.md');

    expect(existsSync(path.join(out, 'fixture/_assets/alpha/why/d.png'))).toBe(true);
    expect(existsSync(path.join(out, 'fixture/zh/extra-page'))).toBe(false);

    const meta = JSON.parse(readFileSync(path.join(out, 'fixture/zh/meta.json'), 'utf8'));
    expect(meta.docs.why).toEqual({ title: 'Why', navTitle: 'Why' });
    expect(meta.docs['whats-this']).toEqual({ title: 'Quirk', navTitle: "What's" });
    expect(meta.groups['queue-lead']).toBe('Queue');
    expect(meta.sections.alpha).toBe('Alpha');

    const report = readFileSync(r.reportPath, 'utf8');
    expect(report).toContain("what's-this.md");
    expect(report).toContain('offer.md');
    expect(report).toContain('unlisted.md');
  });

  it('fails, writing nothing, on a disallowed raw HTML tag', () => {
    const up = makeUpstream({ 'docs/alpha/single.md': '# Single\n\n<div style="x">bad</div>\n' });
    const out = mkdtempSync(path.join(os.tmpdir(), 'out-'));
    expect(() => runImport({ upstreamRoot: up, outRoot: out, ...base })).toThrow(/single\.md.*div/s);
    expect(existsSync(path.join(out, 'fixture'))).toBe(false);
  });

  it('fails on an unresolved internal link', () => {
    const up = makeUpstream({ 'docs/alpha/single.md': '# Single\n\n[x](./missing.md)\n' });
    const out = mkdtempSync(path.join(os.tmpdir(), 'out-'));
    expect(() => runImport({ upstreamRoot: up, outRoot: out, ...base })).toThrow(/missing\.md/);
  });

  it('fails when an unlisted doc is not in the root README', () => {
    const up = makeUpstream({ 'docs/alpha/ghost.md': '# Ghost\n' });
    const out = mkdtempSync(path.join(os.tmpdir(), 'out-'));
    expect(() => runImport({ upstreamRoot: up, outRoot: out, ...base })).toThrow(/ghost\.md/);
  });

  it('fails when an in-page anchor matches no heading', () => {
    const up = makeUpstream({ 'docs/alpha/single.md': '# Single\n\n## Real\n\n[x](#nowhere)\n' });
    const out = mkdtempSync(path.join(os.tmpdir(), 'out-'));
    expect(() => runImport({ upstreamRoot: up, outRoot: out, ...base })).toThrow(/nowhere/);
  });
});
```

`tests/import/real-upstream.test.ts`:

```ts
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runImport } from '../../scripts/import-upstream';

describe.skipIf(!existsSync('ref/docs/.vitepress/config.mts'))('real upstream import', () => {
  it('imports 81 docs in 5 sections with unique catalog ids and no failures', () => {
    const out = mkdtempSync(path.join(os.tmpdir(), 'real-'));
    const commit = execSync('git -C ref rev-parse HEAD').toString().trim();
    const r = runImport({ upstreamRoot: 'ref', outRoot: out, collection: 'advanced-java', commit });
    expect(r.docCount).toBe(81);
    const c = JSON.parse(readFileSync(path.join(out, 'advanced-java/collection.json'), 'utf8'));
    expect(c.sections.map((s: { id: string }) => s.id)).toHaveLength(5);
    const ids = Object.values(c.ids) as string[];
    expect(new Set(ids).size).toBe(81);
    expect(ids.filter((i) => i.startsWith('HC-')).length).toBeGreaterThan(0);
    expect(c.upstreamFiles['whats-microservice-how-to-communicate']).toBe(
      "docs/micro-services/what's-microservice-how-to-communicate.md",
    );
    const report = readFileSync(path.join(out, 'advanced-java/import-report.md'), 'utf8');
    for (const promo of ['advanced.md', 'offer.md', 'rights-defending-action.md', 'subscriptions-for-doocs.md']) {
      expect(report).toContain(promo);
    }
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run tests/import/html-guard.test.ts tests/import/copy-assets.test.ts tests/import/run-import.test.ts tests/import/real-upstream.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement html-guard and copy-assets**

`scripts/import/html-guard.ts`:

```ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';

export const ALLOWED_HTML = new Set(['br', 'sub', 'sup', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption']);

export function disallowedHtml(md: string): { tag: string; line: number }[] {
  const out: { tag: string; line: number }[] = [];
  const tree = unified().use(remarkParse).use(remarkGfm).parse(md);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visit(tree, 'html', (node: any) => {
    const re = /<\/?([A-Za-z][A-Za-z0-9-]*)/g;
    for (let m = re.exec(node.value); m; m = re.exec(node.value)) {
      const tag = m[1].toLowerCase();
      if (!ALLOWED_HTML.has(tag)) out.push({ tag, line: node.position.start.line });
    }
  });
  return out;
}
```

`scripts/copy-assets.ts`:

```ts
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

function countFiles(dir: string): number {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    n += statSync(p).isDirectory() ? countFiles(p) : 1;
  }
  return n;
}

export function copyAssets(contentRoot: string, publicRoot: string): number {
  if (!existsSync(contentRoot)) return 0;
  let copied = 0;
  for (const collection of readdirSync(contentRoot)) {
    const assets = path.join(contentRoot, collection, '_assets');
    if (!existsSync(assets) || !statSync(assets).isDirectory()) continue;
    const dest = path.join(publicRoot, '_content', collection);
    mkdirSync(dest, { recursive: true });
    cpSync(assets, dest, { recursive: true });
    copied += countFiles(assets);
  }
  return copied;
}

if (path.basename(process.argv[1] ?? '') === 'copy-assets.ts') {
  const n = copyAssets(path.join(process.cwd(), 'content'), path.join(process.cwd(), 'public'));
  console.log(`copied ${n} asset file(s) to public/_content`);
}
```

- [ ] **Step 5: Implement the import runner**

`scripts/import-upstream.ts`:

```ts
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import type { CollectionConfig, LocaleMeta } from '../lib/content/types';
import { extractHeadings, firstH1 } from '../lib/render/headings';
import { remapFragment } from './import/anchors';
import { disallowedHtml } from './import/html-guard';
import { classifyLink, rewriteLinkTargets, type LinkEnv } from './import/links';
import { SECTION_PREFIXES, loadSidebar, placeUnlisted, planFromSidebar, readmeOrder } from './import/sidebar';

export interface ImportOptions {
  upstreamRoot: string;
  outRoot: string;
  collection: string;
  commit: string;
  prefixes?: Record<string, string>;
  repo?: string;
}
export interface ImportResult { docCount: number; reportPath: string }

function walk(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === '.vitepress' || name === 'node_modules' || name === 'public') continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else if (name.endsWith('.md')) out.push('docs/' + path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

export function runImport(opts: ImportOptions): ImportResult {
  const prefixes = opts.prefixes ?? SECTION_PREFIXES;
  const repo = opts.repo ?? 'https://github.com/doocs/advanced-java';
  const docsDir = path.join(opts.upstreamRoot, 'docs');
  const errors: string[] = [];

  // 1. plan from sidebar, then place unlisted docs by the root README
  let plan = planFromSidebar(loadSidebar(path.join(docsDir, '.vitepress/config.mts')));
  const allMd = walk(docsDir, docsDir);
  const readmes = new Map<string, string>();
  for (const s of plan.sections) readmes.set(`docs/${s.id}/README.md`, s.id);
  const listed = new Set(Object.values(plan.docs).map((d) => d.upstreamFile));
  const skipped: { file: string; reason: string }[] = [];
  const promos = new Set<string>();
  const unlisted: string[] = [];

  for (const f of allMd) {
    if (listed.has(f)) continue;
    if (f === 'docs/index.md') skipped.push({ file: f, reason: 'home page replaced by our own' });
    else if (/^docs\/[^/]+\/README\.md$/.test(f)) skipped.push({ file: f, reason: 'section index, generated from collection.json' });
    else if (f.startsWith('docs/extra-page/')) {
      promos.add(f);
      skipped.push({ file: f, reason: 'promo page, not imported' });
    } else unlisted.push(f);
  }
  const readme = readmeOrder(readFileSync(path.join(opts.upstreamRoot, 'README.md'), 'utf8'));
  try {
    plan = placeUnlisted(plan, readme, unlisted);
  } catch (e) {
    errors.push((e as Error).message);
  }
  for (const f of unlisted) {
    const d = Object.values(plan.docs).find((x) => x.upstreamFile === f);
    if (d) skipped.push({ file: f, reason: `unlisted in sidebar; placed after its root-README predecessor` });
  }
  for (const s of plan.sections) if (!prefixes[s.id]) errors.push(`no catalog prefix for section ${s.id}`);

  // 2. catalog ids in section → group → doc order
  const ids: Record<string, string> = {};
  for (const s of plan.sections) {
    let n = 0;
    for (const g of s.groups) for (const slug of g.docs) ids[slug] = `${prefixes[s.id] ?? 'XX'}-${String(++n).padStart(2, '0')}`;
  }

  // 3. per-doc processing (in memory)
  const slugByUpstream = new Map(Object.values(plan.docs).map((d) => [d.upstreamFile, { section: d.section, slug: d.slug }]));
  const outputs: { section: string; slug: string; text: string }[] = [];
  const assets: { from: string; section: string; slug: string; file: string; bytes: number }[] = [];
  const titleDiffs: { slug: string; h1: string; nav: string }[] = [];
  const meta: LocaleMeta = { sections: {}, groups: {}, docs: {} };

  for (const s of plan.sections) {
    meta.sections[s.id] = s.title;
    for (const g of s.groups) meta.groups[g.id] = g.title;
  }

  for (const doc of Object.values(plan.docs)) {
    const srcPath = path.join(opts.upstreamRoot, doc.upstreamFile);
    const md = readFileSync(srcPath, 'utf8');

    for (const bad of disallowedHtml(md)) errors.push(`${doc.upstreamFile}:${bad.line}: raw HTML <${bad.tag}> is not allowed`);

    const headings = extractHeadings(md);
    const h1 = firstH1(md);
    if (!h1 && !doc.navTitle) errors.push(`${doc.upstreamFile}: no H1 and no sidebar title`);
    meta.docs[doc.slug] = { title: h1 ?? doc.navTitle, navTitle: doc.navTitle };
    if (h1 && h1 !== doc.navTitle) titleDiffs.push({ slug: doc.slug, h1, nav: doc.navTitle });

    const env: LinkEnv = {
      collection: opts.collection,
      sourceFile: doc.upstreamFile,
      slugByUpstream,
      sectionReadmes: readmes,
      promos,
      assetFor: (sourceFile, rel) => {
        const abs = path.join(opts.upstreamRoot, path.posix.dirname(sourceFile), rel);
        if (!existsSync(abs)) return undefined;
        const file = path.basename(abs);
        assets.push({ from: abs, section: doc.section, slug: doc.slug, file, bytes: statSync(abs).size });
        return `asset:${doc.section}/${doc.slug}/${file}`;
      },
    };

    const { text, unlocatable } = rewriteLinkTargets(md, (url) => {
      if (url.startsWith('#')) {
        try {
          return `#h${remapFragment(url, headings)}`;
        } catch (e) {
          errors.push(`${doc.upstreamFile}: ${(e as Error).message}`);
          return null;
        }
      }
      const c = classifyLink(url, env);
      if (c && typeof c === 'object' && 'fail' in c) {
        errors.push(c.fail);
        return null;
      }
      return c;
    });
    for (const u of unlocatable) errors.push(`${doc.upstreamFile}: cannot locate link destination "${u}" in source`);
    outputs.push({ section: doc.section, slug: doc.slug, text });
  }

  if (errors.length) throw new Error(`import failed with ${errors.length} problem(s):\n- ` + errors.join('\n- '));

  // 4. write
  const root = path.join(opts.outRoot, opts.collection);
  for (const o of outputs) {
    const f = path.join(root, 'zh', o.section, `${o.slug}.md`);
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(f, o.text);
  }
  for (const a of assets) {
    const dest = path.join(root, '_assets', a.section, a.slug, a.file);
    mkdirSync(path.dirname(dest), { recursive: true });
    cpSync(a.from, dest);
  }

  const collection: CollectionConfig = {
    id: opts.collection,
    sourceLocale: 'zh',
    tabColor: '#2f5bea',
    fallback: { vi: ['en', 'zh'], en: ['zh'], zh: ['zh'] },
    sections: plan.sections.map((s) => ({
      id: s.id,
      prefix: prefixes[s.id],
      groups: s.groups.map((g) => ({ id: g.id, docs: g.docs, ...(g.lead ? { lead: g.lead } : {}) })),
    })),
    ids,
    upstream: { repo, commit: opts.commit },
    upstreamFiles: Object.fromEntries(Object.values(plan.docs).map((d) => [d.slug, d.upstreamFile])),
  };
  writeFileSync(path.join(root, 'collection.json'), JSON.stringify(collection, null, 2) + '\n');
  writeFileSync(path.join(root, 'zh', 'meta.json'), JSON.stringify(meta, null, 2) + '\n');

  // 5. report
  const renamed = Object.values(plan.docs).filter((d) => path.posix.basename(d.upstreamFile, '.md') !== d.slug);
  const lines = [
    `# Import report`,
    '',
    `- upstream: ${repo} @ ${opts.commit}`,
    `- docs imported: ${outputs.length}`,
    `- sections: ${plan.sections.map((s) => s.id).join(', ')}`,
    `- images copied: ${assets.length}`,
    '',
    '## Skipped files',
    ...skipped.map((s) => `- ${s.file}: ${s.reason}`),
    '',
    '## External sidebar entries skipped',
    ...(plan.external.length ? plan.external.map((e) => `- ${e}`) : ['- none']),
    '',
    '## Renamed slugs',
    ...(renamed.length ? renamed.map((d) => `- ${d.upstreamFile} -> ${d.slug}`) : ['- none']),
    '',
    `## H1 differs from sidebar title (${titleDiffs.length}); both kept (docTitle / navTitle)`,
    ...titleDiffs.map((t) => `- ${t.slug}: "${t.h1}" vs "${t.nav}"`),
    '',
    '## Images (provenance unknown; see content/ASSETS.md)',
    ...assets.map((a) => `- ${a.section}/${a.slug}/${a.file} (${a.bytes} bytes)`),
    '',
  ];
  const reportPath = path.join(root, 'import-report.md');
  writeFileSync(reportPath, lines.join('\n'));
  return { docCount: outputs.length, reportPath };
}

if (path.basename(process.argv[1] ?? '') === 'import-upstream.ts') {
  const commit = execSync('git -C ref rev-parse HEAD').toString().trim();
  const r = runImport({ upstreamRoot: 'ref', outRoot: 'content', collection: 'advanced-java', commit });
  console.log(`imported ${r.docCount} docs; report: ${r.reportPath}`);
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm vitest run tests/import`
Expected: PASS, including the real-upstream test (81 docs). If a real-upstream problem is reported (for example a disallowed tag), the importer's error lists file and line; **fix the importer rule or report the upstream defect, never loosen the check silently**.

- [ ] **Step 7: Run the import once for real and commit the output**

```bash
pnpm import:upstream
find content/advanced-java/zh -name '*.md' | wc -l   # expect 81
git -C ref rev-parse --short HEAD                    # expect 1a35221
cat > content/ASSETS.md <<'EOF'
# Image provenance

Images under `advanced-java/_assets` come from the upstream repository
https://github.com/doocs/advanced-java (commit recorded in `collection.json`).
Upstream does not record per-image provenance; some diagrams may be third-party.
They are listed in `advanced-java/import-report.md`. Images whose origin is not
established are credited to the upstream repository on `/about` and are not
relicensed by this project.
EOF
pnpm test
git add -A && ./scripts/commit.sh "feat: import upstream corpus (81 docs, zh) with report and assets"
```

Expected: `81`, `1a35221`, all tests PASS. This is the only time `pnpm import:upstream` is run; the output is now the source of truth.

## Task 8: Rehype heading-id plugin

**Files:**
- Create: `lib/render/heading-ids.ts`
- Test: `tests/render/heading-ids.test.ts`

**Interfaces:**
- Consumes: `headingId`, `extractHeadings` (Task 6).
- Produces: `export function rehypeHeadingIds(): (tree: Root) => void`. Sets `id="h<n>-<slug>"` and `data-hi="<n>"` on every `h2`–`h6` element in document order. Its ids equal `extractHeadings(md)[i].id`.

- [ ] **Step 1: Install rehype dependencies**

```bash
pnpm add remark-rehype rehype-raw rehype-sanitize rehype-stringify rehype-parse hast-util-to-string rehype-pretty-code shiki
pnpm add -D @types/hast
```

- [ ] **Step 2: Write the failing test**

`tests/render/heading-ids.test.ts`:

```ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { describe, expect, it } from 'vitest';
import { rehypeHeadingIds } from '@/lib/render/heading-ids';
import { extractHeadings } from '@/lib/render/headings';

const FENCE = '```';
async function render(md: string): Promise<string> {
  const f = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeHeadingIds)
    .use(rehypeStringify)
    .process(md);
  return String(f);
}

const md = [
  '# Title',
  '',
  '## Hello World',
  '',
  '### `Map<String, Object>` generics',
  '',
  '## 🔥',
  '',
  FENCE,
  '## fenced, not a heading',
  FENCE,
  '',
  '## Hello World',
  '',
  '###### Deepest',
  '',
].join('\n');

describe('rehypeHeadingIds', () => {
  it('assigns id and data-hi to h2–h6 only', async () => {
    const html = await render(md);
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<h2 id="h1-hello-world" data-hi="1">Hello World</h2>');
    expect(html).toContain('data-hi="2"');
    expect(html).toContain('<h2 id="h3" data-hi="3">🔥</h2>');
    expect(html).toContain('<h2 id="h4-hello-world" data-hi="4">Hello World</h2>');
    expect(html).toContain('<h6 id="h5-deepest" data-hi="5">Deepest</h6>');
  });

  it('produces exactly the ids that extractHeadings predicts (parity)', async () => {
    const html = await render(md);
    const rendered = [...html.matchAll(/<h[2-6] id="([^"]+)" data-hi="(\d+)"/g)].map((m) => m[1]);
    expect(rendered).toEqual(extractHeadings(md).map((h) => h.id));
  });

  it('keeps ids unique when text repeats', async () => {
    const html = await render(md);
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm vitest run tests/render/heading-ids.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement**

`lib/render/heading-ids.ts`:

```ts
import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import { visit } from 'unist-util-visit';
import { headingId } from './headings';

const LEVELS = new Set(['h2', 'h3', 'h4', 'h5', 'h6']);

export function rehypeHeadingIds() {
  return (tree: Root) => {
    let index = 0;
    visit(tree, 'element', (node: Element) => {
      if (!LEVELS.has(node.tagName)) return;
      index += 1;
      node.properties = {
        ...node.properties,
        id: headingId(index, toString(node).trim()),
        dataHi: String(index),
      };
    });
  };
}
```

- [ ] **Step 5: Run to verify pass, then commit**

Run: `pnpm vitest run tests/render/heading-ids.test.ts && pnpm typecheck`
Expected: PASS.

```bash
git add -A && ./scripts/commit.sh "feat: rehype heading ids with data-hi and parity with extractHeadings"
```

---

## Task 9: Link resolver plugin (`doc:`, `section:`, `home:`, `asset:`, same-doc `#hN`)

**Files:**
- Create: `lib/render/links.ts`
- Test: `tests/render/links.test.ts`

**Interfaces:**
- Consumes: `HeadingInfo` (Task 6), `Locale` (Task 2).
- Produces:

```ts
export interface LinkContext {
  collection: string;                       // collection of the doc being rendered (used for asset:)
  routeLocale: Locale;                      // locale in the current URL
  currentHeadings: HeadingInfo[];           // headings of the doc being rendered (for same-doc #hN)
  headingsOf: (collection: string, section: string, slug: string) => HeadingInfo[] | null; // null => doc does not exist
}
export function resolveHref(url: string, ctx: LinkContext): string;   // throws Error on unresolvable targets
export function rehypeResolveLinks(ctx: LinkContext): (tree: Root) => void; // a[href] and img[src]
```

- [ ] **Step 1: Write the failing test**

`tests/render/links.test.ts`:

```ts
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import { describe, expect, it } from 'vitest';
import { rehypeResolveLinks, resolveHref, type LinkContext } from '@/lib/render/links';

const target = [
  { index: 1, depth: 2, text: 'One', id: 'h1-one' },
  { index: 3, depth: 2, text: 'Third part', id: 'h3-third-part' },
];
const ctx: LinkContext = {
  collection: 'demo',
  routeLocale: 'vi',
  currentHeadings: [{ index: 1, depth: 2, text: 'Hello World', id: 'h1-hello-world' }],
  headingsOf: (c, s, slug) => (c === 'demo' && s === 'alpha' && slug === 'second' ? target : null),
};

describe('resolveHref', () => {
  it('resolves doc: to the route locale', () => {
    expect(resolveHref('doc:demo/alpha/second', ctx)).toBe('/vi/demo/alpha/second');
  });
  it('resolves doc:…#hN to the full heading id of the target', () => {
    expect(resolveHref('doc:demo/alpha/second#h3', ctx)).toBe('/vi/demo/alpha/second#h3-third-part');
  });
  it('resolves section: and home:', () => {
    expect(resolveHref('section:demo/alpha', ctx)).toBe('/vi/demo/alpha');
    expect(resolveHref('home:', ctx)).toBe('/vi');
  });
  it('resolves asset: to /_content', () => {
    expect(resolveHref('asset:alpha/intro/d.png', ctx)).toBe('/_content/demo/alpha/intro/d.png');
  });
  it('resolves a same-document #hN to the full id', () => {
    expect(resolveHref('#h1', ctx)).toBe('#h1-hello-world');
  });
  it('leaves external and other fragments alone', () => {
    expect(resolveHref('https://example.com/a', ctx)).toBe('https://example.com/a');
    expect(resolveHref('#custom', ctx)).toBe('#custom');
  });
  it('throws when the doc does not exist', () => {
    expect(() => resolveHref('doc:demo/alpha/missing', ctx)).toThrow(/missing/);
  });
  it('throws when the heading index does not exist in the target', () => {
    expect(() => resolveHref('doc:demo/alpha/second#h2', ctx)).toThrow(/h2/);
  });
  it('throws on a same-document #hN beyond the heading count', () => {
    expect(() => resolveHref('#h9', ctx)).toThrow(/h9/);
  });
});

describe('rehypeResolveLinks', () => {
  it('rewrites a[href] and img[src] in raw html too', async () => {
    const html = String(
      await unified()
        .use(rehypeParse, { fragment: true })
        .use(rehypeResolveLinks, ctx)
        .use(rehypeStringify)
        .process('<p><a href="doc:demo/alpha/second#h3">x</a><img src="asset:alpha/intro/d.png" alt=""></p>'),
    );
    expect(html).toContain('href="/vi/demo/alpha/second#h3-third-part"');
    expect(html).toContain('src="/_content/demo/alpha/intro/d.png"');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/render/links.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`lib/render/links.ts`:

```ts
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';
import type { Locale } from '../content/types';
import type { HeadingInfo } from './headings';

export interface LinkContext {
  collection: string;
  routeLocale: Locale;
  currentHeadings: HeadingInfo[];
  headingsOf: (collection: string, section: string, slug: string) => HeadingInfo[] | null;
}

export function resolveHref(url: string, ctx: LinkContext): string {
  const loc = ctx.routeLocale;

  let m = /^doc:([^/#]+)\/([^/#]+)\/([^#]+?)(?:#h(\d+))?$/.exec(url);
  if (m) {
    const [, collection, section, slug, n] = m;
    const headings = ctx.headingsOf(collection, section, slug);
    if (!headings) throw new Error(`doc link target not found: ${url}`);
    const base = `/${loc}/${collection}/${section}/${slug}`;
    if (!n) return base;
    const h = headings.find((x) => x.index === Number(n));
    if (!h) throw new Error(`doc link ${url}: target has no heading h${n}`);
    return `${base}#${h.id}`;
  }

  m = /^section:([^/#]+)\/([^/#]+)$/.exec(url);
  if (m) return `/${loc}/${m[1]}/${m[2]}`;

  if (url === 'home:') return `/${loc}`;

  m = /^asset:(.+)$/.exec(url);
  if (m) return `/_content/${ctx.collection}/${m[1]}`;

  m = /^#h(\d+)$/.exec(url);
  if (m) {
    const h = ctx.currentHeadings.find((x) => x.index === Number(m![1]));
    if (!h) throw new Error(`same-document link ${url}: no heading h${m[1]}`);
    return `#${h.id}`;
  }

  if (/^(doc|section|home|asset):/.test(url)) throw new Error(`malformed link: ${url}`);
  return url;
}

export function rehypeResolveLinks(ctx: LinkContext) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const prop = node.tagName === 'a' ? 'href' : node.tagName === 'img' ? 'src' : null;
      if (!prop) return;
      const v = node.properties?.[prop];
      if (typeof v === 'string') node.properties![prop] = resolveHref(v, ctx);
    });
  };
}
```

- [ ] **Step 4: Run to verify pass, then commit**

Run: `pnpm vitest run tests/render/links.test.ts && pnpm typecheck`
Expected: PASS.

```bash
git add -A && ./scripts/commit.sh "feat: locale-neutral link resolver plugin"
```

---

## Task 10: Render pipeline (sanitize, headings, highlighting) with the required fixture test

**Files:**
- Create: `lib/render/images.ts`, `lib/render/pipeline.ts`
- Test: `tests/render/pipeline.test.ts`

**Interfaces:**
- Consumes: `rehypeResolveLinks`, `LinkContext` (Task 9); `rehypeHeadingIds` (Task 8); `extractHeadings`, `HeadingInfo` (Task 6).
- Produces:

```ts
export function rehypeRestrictImages(prefix?: string): (tree: Root) => void; // removes <img> whose src does not start with prefix (default '/_content/')
export const sanitizeSchema: Options; // rehype-sanitize schema
export async function renderMarkdown(md: string, ctx: LinkContext): Promise<{ html: string; headings: HeadingInfo[] }>;
```

- [ ] **Step 1: Write the failing test (spec §5 required test + Review Focus 1)**

`tests/render/pipeline.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { extractHeadings } from '@/lib/render/headings';
import type { LinkContext } from '@/lib/render/links';
import { renderMarkdown } from '@/lib/render/pipeline';

const FENCE = '```';
const md = [
  '# Title',
  '',
  '## Hello World',
  '',
  FENCE + 'java',
  'public class A { Map<String, Object> m = new HashMap<>(); }',
  FENCE,
  '',
  'Prose generics Map<String, Object>, braces {} and a < b && c > d stay literal.',
  '',
  'Line one<br>line two, H<sub>2</sub>O and x<sup>2</sup>.',
  '',
  '| a | b |',
  '| - | - |',
  '| 1 | 2 |',
  '',
  '<script>alert(1)</script>',
  '',
  '<iframe src="https://example.com"></iframe>',
  '',
  '[bad](javascript:alert(1))',
  '',
  '[to second](doc:demo/alpha/second#h3) and [up](#h1)',
  '',
  '![ok](asset:alpha/intro/d.png) and <img src="https://evil.example/x.png" alt="evil">',
  '',
].join('\n');

const ctx: LinkContext = {
  collection: 'demo',
  routeLocale: 'vi',
  currentHeadings: extractHeadings(md),
  headingsOf: (c, s, slug) =>
    c === 'demo' && s === 'alpha' && slug === 'second'
      ? [{ index: 3, depth: 2, text: 'Third part', id: 'h3-third-part' }]
      : null,
};

const decode = (s: string) =>
  s.replace(/&#x3C;|&lt;/g, '<').replace(/&#x3E;|&gt;/g, '>').replace(/&#x26;|&amp;/g, '&');

describe('renderMarkdown', () => {
  it('renders heading ids exactly as the scheme defines (no user-content prefix)', async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toContain('<h2 id="h1-hello-world" data-hi="1">Hello World</h2>');
    expect(html).not.toContain('user-content');
  });

  it('keeps highlighting markup after sanitize', async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toMatch(/<pre[^>]*data-language="java"/);
    expect(html).toMatch(/<span[^>]*style="[^"]*--shiki/);
  });

  it('keeps br, sub, sup and tables', async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toContain('<br>');
    expect(html).toContain('<sub>2</sub>');
    expect(html).toContain('<sup>2</sup>');
    expect(html).toContain('<table>');
  });

  it('strips scripts, iframes and javascript: urls', async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('javascript:');
  });

  it('resolves neutral links and restricts images', async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toContain('href="/vi/demo/alpha/second#h3-third-part"');
    expect(html).toContain('href="#h1-hello-world"');
    expect(html).toContain('src="/_content/demo/alpha/intro/d.png"');
    expect(html).not.toContain('evil.example');
  });

  it('renders prose angle brackets and braces literally', async () => {
    const { html } = await renderMarkdown(md, ctx);
    const text = decode(html);
    expect(text).toContain('Prose generics Map<String, Object>, braces {} and a < b && c > d stay literal.');
  });

  it('returns the heading list of the document', async () => {
    const { headings } = await renderMarkdown(md, ctx);
    expect(headings.map((h) => h.id)).toEqual(['h1-hello-world']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/render/pipeline.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`lib/render/images.ts`:

```ts
import type { Element, Root } from 'hast';
import { SKIP, visit } from 'unist-util-visit';

export function rehypeRestrictImages(prefix = '/_content/') {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'img' || !parent || index === undefined) return;
      const src = node.properties?.src;
      if (typeof src === 'string' && src.startsWith(prefix)) return;
      parent.children.splice(index, 1);
      return [SKIP, index];
    });
  };
}
```

`lib/render/pipeline.ts`:

```ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema, type Options } from 'rehype-sanitize';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeStringify from 'rehype-stringify';
import { rehypeHeadingIds } from './heading-ids';
import { extractHeadings, type HeadingInfo } from './headings';
import { rehypeRestrictImages } from './images';
import { rehypeResolveLinks, type LinkContext } from './links';

const base = defaultSchema.attributes ?? {};

export const sanitizeSchema: Options = {
  ...defaultSchema,
  clobberPrefix: '',
  tagNames: Array.from(new Set([...(defaultSchema.tagNames ?? []), 'br', 'sub', 'sup'])),
  attributes: {
    ...base,
    // ids are produced only by our own plugin, after sanitize
    '*': (base['*'] ?? []).filter((a) => (Array.isArray(a) ? a[0] : a) !== 'id'),
    code: [...(base.code ?? []), ['className', /^language-./]],
    img: ['src', 'alt', 'title', 'width', 'height'],
  },
  protocols: { ...defaultSchema.protocols, href: ['http', 'https', 'mailto'], src: [] },
};

export async function renderMarkdown(
  md: string,
  ctx: LinkContext,
): Promise<{ html: string; headings: HeadingInfo[] }> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeResolveLinks, ctx)
    .use(rehypeRestrictImages)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeHeadingIds)
    .use(rehypePrettyCode, { theme: { light: 'github-light', dark: 'github-dark' }, keepBackground: false })
    .use(rehypeStringify)
    .process(md);
  return { html: String(file), headings: extractHeadings(md) };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm vitest run tests/render/pipeline.test.ts && pnpm typecheck`
Expected: PASS. **If only the Shiki assertions fail** because the installed `rehype-pretty-code` emits different attribute names, print `html` for the java block, then change the test to assert the actual markers (a `<pre>` carrying the language and `<span>` tokens carrying inline `style` colors). Do not delete or weaken the "highlighting survives sanitize" assertion; it protects spec §5 / U6. Record the observed markup in `docs/superpowers/decisions/render-pipeline.md`.

- [ ] **Step 5: Commit**

```bash
git add -A && ./scripts/commit.sh "feat: render pipeline (resolve links, sanitize, heading ids, highlight)"
```

---

## Task 11: Fallback resolver and heading index

**Files:**
- Create: `lib/content/fallback.ts`, `lib/content/headings-index.ts`, fixtures `tests/fixtures/content/demo/{zh,en}/alpha/*.md`
- Test: `tests/content/fallback.test.ts`

**Interfaces:**
- Consumes: `CollectionConfig`, `Locale`, `DocFrontmatter` (Task 2); `docFile` (Task 2); `canonicalHash` (Task 3); `extractHeadings`, `HeadingInfo` (Task 6).
- Produces:

```ts
// lib/content/fallback.ts
export interface ResolvedDoc {
  requested: Locale; served: Locale; fallback: boolean; file: string;
  frontmatter?: DocFrontmatter; body: string;
}
export function chainFor(c: CollectionConfig, locale: Locale): Locale[];   // [locale, ...fallback] deduped
export function resolveDoc(root: string, c: CollectionConfig, locale: Locale, section: string, slug: string): ResolvedDoc | null;
export function availableLocales(root: string, c: CollectionConfig, section: string, slug: string): Locale[];
export function zhHashOf(root: string, c: CollectionConfig, section: string, slug: string): string; // canonical hash of the source-locale body
// lib/content/headings-index.ts
export function headingsFor(root: string, c: CollectionConfig, locale: Locale, section: string, slug: string): HeadingInfo[] | null;
```

- [ ] **Step 1: Add fixtures**

`tests/fixtures/content/demo/zh/alpha/intro.md`:

```markdown
# 介绍

## 第一节

正文。
```

`tests/fixtures/content/demo/zh/alpha/second.md`:

```markdown
# 第二

## A

## B

## C
```

`tests/fixtures/content/demo/zh/alpha/third.md`:

```markdown
# 第三
```

`tests/fixtures/content/demo/en/alpha/intro.md`:

```markdown
---
source:
  locale: zh
  slug: intro
  hash: sha256:v1:deadbeef
status: machine
translatedAt: 2026-10-13
---

# Introduction

## First

Body.
```

- [ ] **Step 2: Install frontmatter parser and write the failing test**

```bash
pnpm add gray-matter
```

`tests/content/fallback.test.ts`:

```ts
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCollection } from '@/lib/content/collection';
import { availableLocales, chainFor, resolveDoc, zhHashOf } from '@/lib/content/fallback';
import { canonicalHash } from '@/lib/content/hash';
import { headingsFor } from '@/lib/content/headings-index';

const root = path.resolve(__dirname, '../fixtures/content');
const c = loadCollection(root, 'demo');

describe('fallback chain', () => {
  it('builds the configured chain without duplicates', () => {
    expect(chainFor(c, 'vi')).toEqual(['vi', 'en', 'zh']);
    expect(chainFor(c, 'en')).toEqual(['en', 'zh']);
    expect(chainFor(c, 'zh')).toEqual(['zh']);
  });

  it('serves the requested locale when it exists', () => {
    const r = resolveDoc(root, c, 'en', 'alpha', 'intro')!;
    expect(r).toMatchObject({ requested: 'en', served: 'en', fallback: false });
    expect(r.frontmatter).toMatchObject({ status: 'machine', source: { locale: 'zh', slug: 'intro' } });
    expect(r.body).toContain('# Introduction');
    expect(r.body).not.toContain('status: machine');
  });

  it('vi falls back to en when en exists', () => {
    const r = resolveDoc(root, c, 'vi', 'alpha', 'intro')!;
    expect(r).toMatchObject({ requested: 'vi', served: 'en', fallback: true });
  });

  it('vi skips a missing en and lands on zh', () => {
    const r = resolveDoc(root, c, 'vi', 'alpha', 'second')!;
    expect(r).toMatchObject({ requested: 'vi', served: 'zh', fallback: true });
    expect(r.frontmatter).toBeUndefined();
  });

  it('en falls back to zh; zh serves zh without a fallback flag', () => {
    expect(resolveDoc(root, c, 'en', 'alpha', 'third')).toMatchObject({ served: 'zh', fallback: true });
    expect(resolveDoc(root, c, 'zh', 'alpha', 'third')).toMatchObject({ served: 'zh', fallback: false });
  });

  it('returns null for a doc that exists in no locale', () => {
    expect(resolveDoc(root, c, 'vi', 'alpha', 'nope')).toBeNull();
  });

  it('lists available locales', () => {
    expect(availableLocales(root, c, 'alpha', 'intro').sort()).toEqual(['en', 'zh']);
    expect(availableLocales(root, c, 'alpha', 'second')).toEqual(['zh']);
  });

  it('computes the zh canonical hash', () => {
    const zh = resolveDoc(root, c, 'zh', 'alpha', 'intro')!;
    expect(zhHashOf(root, c, 'alpha', 'intro')).toBe(canonicalHash(zh.body));
  });
});

describe('headingsFor', () => {
  it('returns the headings of the language that will be served', () => {
    expect(headingsFor(root, c, 'vi', 'alpha', 'intro')!.map((h) => h.id)).toEqual(['h1-first']);
    expect(headingsFor(root, c, 'zh', 'alpha', 'intro')!.map((h) => h.id)).toEqual(['h1-第一节']);
    expect(headingsFor(root, c, 'vi', 'alpha', 'second')!.map((h) => h.index)).toEqual([1, 2, 3]);
  });
  it('returns null for a missing doc', () => {
    expect(headingsFor(root, c, 'vi', 'alpha', 'nope')).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm vitest run tests/content/fallback.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement**

`lib/content/fallback.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { docFile } from './collection';
import { canonicalHash } from './hash';
import type { CollectionConfig, DocFrontmatter, Locale } from './types';

export interface ResolvedDoc {
  requested: Locale;
  served: Locale;
  fallback: boolean;
  file: string;
  frontmatter?: DocFrontmatter;
  body: string;
}

export function chainFor(c: CollectionConfig, locale: Locale): Locale[] {
  return Array.from(new Set<Locale>([locale, ...(c.fallback[locale] ?? [])]));
}

export function resolveDoc(
  root: string,
  c: CollectionConfig,
  locale: Locale,
  section: string,
  slug: string,
): ResolvedDoc | null {
  for (const served of chainFor(c, locale)) {
    const file = docFile(root, c.id, served, section, slug);
    if (!existsSync(file)) continue;
    const parsed = matter(readFileSync(file, 'utf8'));
    const isSource = served === c.sourceLocale;
    return {
      requested: locale,
      served,
      fallback: served !== locale,
      file,
      frontmatter: isSource ? undefined : (parsed.data as DocFrontmatter),
      body: parsed.content.replace(/^\n+/, ''),
    };
  }
  return null;
}

export function availableLocales(root: string, c: CollectionConfig, section: string, slug: string): Locale[] {
  return (['en', 'vi', 'zh'] as Locale[]).filter((l) => existsSync(docFile(root, c.id, l, section, slug)));
}

export function zhHashOf(root: string, c: CollectionConfig, section: string, slug: string): string {
  const file = docFile(root, c.id, c.sourceLocale, section, slug);
  return canonicalHash(matter(readFileSync(file, 'utf8')).content);
}
```

`lib/content/headings-index.ts`:

```ts
import { extractHeadings, type HeadingInfo } from '../render/headings';
import { resolveDoc } from './fallback';
import type { CollectionConfig, Locale } from './types';

const memo = new Map<string, HeadingInfo[] | null>();

export function headingsFor(
  root: string,
  c: CollectionConfig,
  locale: Locale,
  section: string,
  slug: string,
): HeadingInfo[] | null {
  const key = `${root}|${c.id}|${locale}|${section}|${slug}`;
  if (memo.has(key)) return memo.get(key)!;
  const doc = resolveDoc(root, c, locale, section, slug);
  const out = doc ? extractHeadings(doc.body) : null;
  memo.set(key, out);
  return out;
}
```

- [ ] **Step 5: Run to verify pass, then commit**

Run: `pnpm vitest run tests/content && pnpm typecheck`
Expected: PASS.

```bash
git add -A && ./scripts/commit.sh "feat: locale fallback resolver and heading index"
```

---

## Task 12: i18n config, messages, `proxy.ts`

**Files:**
- Create: `i18n/routing.ts`, `i18n/request.ts`, `lib/messages.ts`, `messages/en.json`, `messages/vi.json`, `messages/zh.json`, `proxy.ts`
- Modify: `next.config.ts`
- Test: `tests/i18n/messages.test.ts`, `tests/i18n/matcher.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (uses `LOCALES` constant values `en|vi|zh`).
- Produces: `routing` (next-intl routing config), `deepMerge<T>(base: T, override: Partial<T>): T`, message keys listed below, `config.matcher` exported from `proxy.ts`.

Message key contract used by later tasks (all three files must contain every key): `site.title`, `site.tagline`, `nav.{search,language,theme,readingMode,menu,contents,previous,next,home,collections}`, `doc.{fallbackNotice,machine,stale,viewOriginal,idLabel,translated,fallback,machineStatus}`, `resume.{mark,resume,updated,setAside,setAsideList,empty}`, `steps.{question,psychology,answer,section}`, `attribution.{license,credit,changesZh,changesTranslated,sourceFile,aboutLink}`, `languages.{en,vi,zh}`, `notFound.{title,body,home}`, `about.{title,codeLicense,contentLicense,images,imageCredits}`.

- [ ] **Step 1: Install**

```bash
pnpm add next-intl@4.14.9
pnpm add -D jsdom @testing-library/react @testing-library/dom
```

- [ ] **Step 2: Write the failing tests**

`tests/i18n/messages.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deepMerge } from '@/lib/messages';

function keys(o: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}
const load = (l: string) => JSON.parse(readFileSync(`messages/${l}.json`, 'utf8'));

describe('deepMerge', () => {
  it('overrides leaves and keeps missing keys from the base', () => {
    const base = { a: { x: 'en-x', y: 'en-y' }, b: 'en-b' };
    expect(deepMerge(base, { a: { x: 'vi-x' } } as never)).toEqual({ a: { x: 'vi-x', y: 'en-y' }, b: 'en-b' });
  });
});

describe('message catalogs', () => {
  it('vi and zh define every key that en defines', () => {
    const en = keys(load('en')).sort();
    expect(keys(load('vi')).sort()).toEqual(en);
    expect(keys(load('zh')).sort()).toEqual(en);
  });
  it('the fallback notice names both languages', () => {
    for (const l of ['en', 'vi', 'zh']) {
      const m = load(l).doc.fallbackNotice as string;
      expect(m).toContain('{requested}');
      expect(m).toContain('{served}');
    }
  });
});
```

`tests/i18n/matcher.test.ts` (reads the matcher out of `proxy.ts` source because Next requires `config` to be a static literal, so it cannot be imported from another module):

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const src = readFileSync('proxy.ts', 'utf8');
const literal = /matcher:\s*(\[[\s\S]*?\])\s*,?\s*}/.exec(src);
const matcher = new Function('return ' + literal![1])() as string[];
const rest = new RegExp('^' + matcher[1] + '$');

describe('proxy matcher (spec 6.2)', () => {
  it('is exactly the specified matcher', () => {
    expect(matcher).toEqual(['/', '/((?!(?:en|vi|zh)(?:/|$)|_next|api|.*\\..*).+)']);
  });
  it('runs on unprefixed paths', () => {
    expect(rest.test('/advanced-java/high-concurrency/why-mq')).toBe(true);
    expect(rest.test('/foo/bar')).toBe(true);
    expect(rest.test('/envelope')).toBe(true); // starts with "en" but is not a locale segment
  });
  it('never runs on locale-prefixed paths', () => {
    expect(rest.test('/en/advanced-java/x')).toBe(false);
    expect(rest.test('/vi/advanced-java/x')).toBe(false);
    expect(rest.test('/zh')).toBe(false);
    expect(rest.test('/vi/')).toBe(false);
  });
  it('never runs on assets, _next or api', () => {
    expect(rest.test('/_next/static/chunk.js')).toBe(false);
    expect(rest.test('/favicon.ico')).toBe(false);
    expect(rest.test('/_content/advanced-java/a/b/d.png')).toBe(false);
    expect(rest.test('/api/x')).toBe(false);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm vitest run tests/i18n`
Expected: FAIL (modules and files missing).

- [ ] **Step 4: Implement config, messages and proxy**

`i18n/routing.ts`:

```ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'vi', 'zh'],
  defaultLocale: 'en',
  localePrefix: 'always',
  localeDetection: true,
  localeCookie: { name: 'NEXT_LOCALE', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', path: '/' },
});
```

`lib/messages.ts`:

```ts
type Dict = { [k: string]: string | Dict };

export function deepMerge<T extends Dict>(base: T, override: Partial<T> | undefined): T {
  if (!override) return base;
  const out: Dict = { ...base };
  for (const [k, v] of Object.entries(override)) {
    const b = out[k];
    out[k] =
      typeof v === 'object' && v !== null && typeof b === 'object' && b !== null
        ? deepMerge(b as Dict, v as Dict)
        : (v as string | Dict);
  }
  return out as T;
}
```

`i18n/request.ts`:

```ts
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { deepMerge } from '@/lib/messages';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const en = (await import('../messages/en.json')).default;
  const own = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages: deepMerge(en, own) };
});
```

`proxy.ts`:

```ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const handler = createMiddleware(routing);

export default handler;
export { handler as proxy };

export const config = {
  matcher: ['/', '/((?!(?:en|vi|zh)(?:/|$)|_next|api|.*\\..*).+)'],
};
```

`next.config.ts` (replace):

```ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const config: NextConfig = {
  cacheComponents: false,
};

export default withNextIntl(config);
```

`messages/en.json`:

```json
{
  "site": { "title": "advanced-java", "tagline": "Java architecture, explained" },
  "nav": {
    "search": "Search",
    "language": "Language",
    "theme": "Theme",
    "readingMode": "Reading mode",
    "menu": "Menu",
    "contents": "Contents",
    "previous": "Previous",
    "next": "Next",
    "home": "Home",
    "collections": "Notebooks"
  },
  "doc": {
    "fallbackNotice": "This page is not translated into {requested} yet. Showing the {served} original.",
    "machine": "Machine translated, may contain errors.",
    "stale": "The Chinese original was updated after this translation; this page may be out of date.",
    "viewOriginal": "View original",
    "idLabel": "ID",
    "translated": "Translated",
    "fallback": "Not translated",
    "machineStatus": "Machine translated"
  },
  "resume": {
    "mark": "Mark here",
    "resume": "Resume where you stopped",
    "updated": "This page was updated since you left; showing the nearest place.",
    "setAside": "Set aside",
    "setAsideList": "Set-aside list",
    "empty": "Nothing set aside yet."
  },
  "steps": { "question": "Question", "psychology": "Interviewer psychology", "answer": "Answer", "section": "Section" },
  "attribution": {
    "license": "Content licensed under CC-BY-SA-4.0",
    "credit": "Original by Doocs and 中华石杉",
    "changesZh": "Reformatted from the original.",
    "changesTranslated": "Translated and adapted from the Chinese original.",
    "sourceFile": "Upstream file",
    "aboutLink": "About and licenses"
  },
  "languages": { "en": "English", "vi": "Tiếng Việt", "zh": "中文" },
  "notFound": { "title": "Page not found", "body": "This page does not exist.", "home": "Back to the shelf" },
  "about": {
    "title": "About and licenses",
    "codeLicense": "The site code is MIT licensed.",
    "contentLicense": "The content (text and translations) is licensed CC-BY-SA-4.0.",
    "images": "Images are included only where we have the right to license them; others are credited to the upstream repository and are not relicensed.",
    "imageCredits": "Image credits"
  }
}
```

`messages/vi.json`:

```json
{
  "site": { "title": "advanced-java", "tagline": "Kiến trúc Java, giải thích rõ ràng" },
  "nav": {
    "search": "Tìm kiếm",
    "language": "Ngôn ngữ",
    "theme": "Giao diện",
    "readingMode": "Chế độ đọc",
    "menu": "Menu",
    "contents": "Mục lục",
    "previous": "Trước",
    "next": "Tiếp",
    "home": "Trang chủ",
    "collections": "Sổ tay"
  },
  "doc": {
    "fallbackNotice": "Trang này chưa được dịch sang {requested}. Đang hiển thị bản gốc {served}.",
    "machine": "Bản dịch máy, có thể có lỗi.",
    "stale": "Bản gốc tiếng Trung đã được cập nhật sau bản dịch này; trang có thể đã cũ.",
    "viewOriginal": "Xem bản gốc",
    "idLabel": "Mã",
    "translated": "Đã dịch",
    "fallback": "Chưa dịch",
    "machineStatus": "Dịch máy"
  },
  "resume": {
    "mark": "Đánh dấu ở đây",
    "resume": "Đọc tiếp chỗ đã dừng",
    "updated": "Trang đã được cập nhật kể từ lần bạn đọc; đang hiển thị vị trí gần nhất.",
    "setAside": "Để dành",
    "setAsideList": "Danh sách để dành",
    "empty": "Chưa có gì được để dành."
  },
  "steps": { "question": "Câu hỏi", "psychology": "Tâm lý người phỏng vấn", "answer": "Trả lời", "section": "Phần" },
  "attribution": {
    "license": "Nội dung theo giấy phép CC-BY-SA-4.0",
    "credit": "Bản gốc của Doocs và 中华石杉",
    "changesZh": "Đã định dạng lại từ bản gốc.",
    "changesTranslated": "Được dịch và chuyển thể từ bản gốc tiếng Trung.",
    "sourceFile": "Tệp gốc",
    "aboutLink": "Giới thiệu và giấy phép"
  },
  "languages": { "en": "English", "vi": "Tiếng Việt", "zh": "中文" },
  "notFound": { "title": "Không tìm thấy trang", "body": "Trang này không tồn tại.", "home": "Về trang chủ" },
  "about": {
    "title": "Giới thiệu và giấy phép",
    "codeLicense": "Mã nguồn của trang theo giấy phép MIT.",
    "contentLicense": "Nội dung (văn bản và bản dịch) theo giấy phép CC-BY-SA-4.0.",
    "images": "Hình ảnh chỉ được đưa vào khi chúng tôi có quyền cấp phép; các hình khác được ghi công cho kho gốc và không được cấp phép lại.",
    "imageCredits": "Ghi công hình ảnh"
  }
}
```

`messages/zh.json`:

```json
{
  "site": { "title": "advanced-java", "tagline": "把 Java 架构讲清楚" },
  "nav": {
    "search": "搜索",
    "language": "语言",
    "theme": "主题",
    "readingMode": "阅读模式",
    "menu": "菜单",
    "contents": "目录",
    "previous": "上一篇",
    "next": "下一篇",
    "home": "首页",
    "collections": "笔记本"
  },
  "doc": {
    "fallbackNotice": "本页尚未翻译为{requested}，当前显示{served}原文。",
    "machine": "机器翻译，可能存在错误。",
    "stale": "本译文之后中文原文已更新，本页可能已过时。",
    "viewOriginal": "查看原文",
    "idLabel": "编号",
    "translated": "已翻译",
    "fallback": "未翻译",
    "machineStatus": "机器翻译"
  },
  "resume": {
    "mark": "标记此处",
    "resume": "从上次停下的地方继续",
    "updated": "本页在你离开后已更新，已定位到最近的位置。",
    "setAside": "收藏",
    "setAsideList": "收藏列表",
    "empty": "还没有收藏。"
  },
  "steps": { "question": "面试题", "psychology": "面试官心理分析", "answer": "面试题剖析", "section": "章节" },
  "attribution": {
    "license": "内容采用 CC-BY-SA-4.0 许可",
    "credit": "原作者 Doocs 与 中华石杉",
    "changesZh": "由原文重新排版。",
    "changesTranslated": "译自并改编自中文原文。",
    "sourceFile": "上游文件",
    "aboutLink": "关于与许可"
  },
  "languages": { "en": "English", "vi": "Tiếng Việt", "zh": "中文" },
  "notFound": { "title": "页面不存在", "body": "该页面不存在。", "home": "返回首页" },
  "about": {
    "title": "关于与许可",
    "codeLicense": "站点代码采用 MIT 许可。",
    "contentLicense": "内容（文本与译文）采用 CC-BY-SA-4.0 许可。",
    "images": "图片仅在我们有权授权时收录；其余图片归属上游仓库，不由本项目重新授权。",
    "imageCredits": "图片来源"
  }
}
```

- [ ] **Step 5: Run to verify pass, then commit**

Run: `pnpm vitest run tests/i18n && pnpm typecheck`
Expected: PASS. (U1/U2 are verified at runtime in Task 13 and Task 25.)

```bash
git add -A && ./scripts/commit.sh "feat: next-intl routing, message catalogs, proxy with exact matcher"
```

---

## Task 13: Static App Router pages and the build assertion

**Files:**
- Create: `app/layout.tsx` (replace), `app/not-found.tsx`, `app/[locale]/layout.tsx`, `app/[locale]/page.tsx`, `app/[locale]/not-found.tsx`, `app/[locale]/[...rest]/page.tsx`, `app/[locale]/[collection]/page.tsx`, `app/[locale]/[collection]/[section]/page.tsx`, `app/[locale]/[collection]/[section]/[slug]/page.tsx`, `scripts/assert-static-build.ts`
- Delete: `app/page.tsx`
- Modify: `lib/content/collection.ts` (add `listCollections`)
- Test: `tests/content/collections.test.ts`, `tests/build/static-check.test.ts`

**Interfaces:**
- Consumes: `routing` (Task 12), `loadCollection`, `listDocs`, `contentRoot` (Task 2), `resolveDoc` (Task 11), `renderMarkdown` (Task 10), `extractHeadings`, `headingsFor`.
- Produces:

```ts
// lib/content/collection.ts
export function listCollections(root: string): string[]; // folder names containing collection.json
// scripts/assert-static-build.ts
export interface StaticCheckInput {
  prerenderedRoutes: Record<string, { initialRevalidateSeconds?: number | false }>; // '/en/advanced-java/…' → info
  prerenderedPatterns: Record<string, { fallback?: boolean | string | null }>;       // '/[locale]/…' → info
  appPatterns: string[];                                                             // every '/[locale]/…' app route pattern
  expectedDocRoutes: string[];
  allowDynamic: string[];
}
export function checkStaticBuild(i: StaticCheckInput): string[]; // problems, empty when OK
```

- [ ] **Step 1: Write the failing tests**

`tests/content/collections.test.ts`:

```ts
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { listCollections } from '@/lib/content/collection';

describe('listCollections', () => {
  it('lists folders that contain collection.json', () => {
    expect(listCollections(path.resolve(__dirname, '../fixtures/content'))).toEqual(['demo']);
  });
  it('returns [] for a missing root', () => {
    expect(listCollections('/nonexistent-root')).toEqual([]);
  });
});
```

`tests/build/static-check.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkStaticBuild, type StaticCheckInput } from '../../scripts/assert-static-build';

const good: StaticCheckInput = {
  prerenderedRoutes: {
    '/en/c/a/x': { initialRevalidateSeconds: false },
    '/vi/c/a/x': { initialRevalidateSeconds: false },
  },
  prerenderedPatterns: {
    '/[locale]/[collection]/[section]/[slug]': { fallback: false },
  },
  appPatterns: ['/[locale]/[collection]/[section]/[slug]', '/[locale]/[...rest]'],
  expectedDocRoutes: ['/en/c/a/x', '/vi/c/a/x'],
  allowDynamic: ['/[locale]/[...rest]'],
};

describe('checkStaticBuild', () => {
  it('passes when every doc route is prerendered and only the catch-all is dynamic', () => {
    expect(checkStaticBuild(good)).toEqual([]);
  });
  it('fails when an expected doc route is not prerendered', () => {
    const r = checkStaticBuild({ ...good, expectedDocRoutes: [...good.expectedDocRoutes, '/zh/c/a/x'] });
    expect(r.join('\n')).toMatch(/\/zh\/c\/a\/x/);
  });
  it('fails when a prerendered route has a revalidate value', () => {
    const r = checkStaticBuild({
      ...good,
      prerenderedRoutes: { ...good.prerenderedRoutes, '/en/c/a/x': { initialRevalidateSeconds: 60 } },
    });
    expect(r.join('\n')).toMatch(/revalidate/i);
  });
  it('fails when an app route under /[locale] is dynamic and not allow-listed', () => {
    const r = checkStaticBuild({ ...good, appPatterns: [...good.appPatterns, '/[locale]/[collection]/live'] });
    expect(r.join('\n')).toMatch(/\/\[locale\]\/\[collection\]\/live/);
  });
  it('fails when a prerendered pattern allows on-demand params', () => {
    const r = checkStaticBuild({
      ...good,
      prerenderedPatterns: { '/[locale]/[collection]/[section]/[slug]': { fallback: null } },
    });
    expect(r.join('\n')).toMatch(/dynamicParams|fallback/i);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/content/collections.test.ts tests/build/static-check.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `listCollections` and `checkStaticBuild`**

Append to `lib/content/collection.ts`:

```ts
import { readdirSync, statSync } from 'node:fs';

export function listCollections(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((n) => statSync(path.join(root, n)).isDirectory() && existsSync(path.join(root, n, 'collection.json')))
    .sort();
}
```

(Merge the `readdirSync, statSync` names into the existing `node:fs` import line.)

`scripts/assert-static-build.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { contentRoot, listCollections, listDocs, loadCollection } from '../lib/content/collection';
import { LOCALES } from '../lib/content/types';

export interface StaticCheckInput {
  prerenderedRoutes: Record<string, { initialRevalidateSeconds?: number | false }>;
  prerenderedPatterns: Record<string, { fallback?: boolean | string | null }>;
  appPatterns: string[];
  expectedDocRoutes: string[];
  allowDynamic: string[];
}

export function checkStaticBuild(i: StaticCheckInput): string[] {
  const problems: string[] = [];

  for (const r of i.expectedDocRoutes) {
    if (!(r in i.prerenderedRoutes)) problems.push(`doc route not prerendered: ${r}`);
  }
  for (const [route, info] of Object.entries(i.prerenderedRoutes)) {
    if (info.initialRevalidateSeconds !== false && info.initialRevalidateSeconds !== undefined) {
      problems.push(`route ${route} has a revalidate value (${String(info.initialRevalidateSeconds)}); expected false`);
    }
  }
  for (const p of i.appPatterns) {
    if (!p.startsWith('/[locale]')) continue;
    if (!p.includes('[')) continue;
    if (i.allowDynamic.includes(p)) continue;
    if (!(p in i.prerenderedPatterns)) problems.push(`dynamic route is not statically generated: ${p}`);
  }
  for (const [p, info] of Object.entries(i.prerenderedPatterns)) {
    if (!p.startsWith('/[locale]')) continue;
    if (info.fallback !== false) {
      problems.push(`pattern ${p} allows on-demand params (fallback=${String(info.fallback)}); dynamicParams must be false`);
    }
  }
  return problems;
}

function readJson<T>(file: string): T {
  if (!existsSync(file)) throw new Error(`missing build output: ${file}`);
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

if (path.basename(process.argv[1] ?? '') === 'assert-static-build.ts') {
  // U11: the manifest shapes below are verified against the pinned Next version in Task 13 Step 8.
  const prerender = readJson<{
    routes: Record<string, { initialRevalidateSeconds?: number | false }>;
    dynamicRoutes: Record<string, { fallback?: boolean | string | null }>;
  }>('.next/prerender-manifest.json');
  const appPathRoutes = readJson<Record<string, string>>('.next/server/app-path-routes-manifest.json');

  const root = contentRoot();
  const expected: string[] = [];
  for (const id of listCollections(root)) {
    for (const d of listDocs(loadCollection(root, id))) {
      for (const l of LOCALES) expected.push(`/${l}/${id}/${d.section}/${d.slug}`);
    }
  }
  const problems = checkStaticBuild({
    prerenderedRoutes: prerender.routes,
    prerenderedPatterns: prerender.dynamicRoutes,
    appPatterns: Array.from(new Set(Object.values(appPathRoutes))),
    expectedDocRoutes: expected,
    allowDynamic: ['/[locale]/[...rest]'],
  });
  if (problems.length) {
    console.error('static build assertion FAILED:\n- ' + problems.join('\n- '));
    process.exit(1);
  }
  console.log(`static build assertion OK (${expected.length} doc routes prerendered)`);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm vitest run tests/content/collections.test.ts tests/build/static-check.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the routes**

Delete `app/page.tsx`. Replace `app/layout.tsx`:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

`app/not-found.tsx` (unlocalized last resort; the proxy redirects most such paths):

```tsx
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <main>
          <h1>Page not found</h1>
          <p><a href="/">Back to the shelf</a></p>
        </main>
      </body>
    </html>
  );
}
```

`app/[locale]/layout.tsx`:

```tsx
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

`app/[locale]/not-found.tsx`:

```tsx
import { useTranslations } from 'next-intl';

export default function LocaleNotFound() {
  const t = useTranslations('notFound');
  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('body')}</p>
    </main>
  );
}
```

`app/[locale]/[...rest]/page.tsx` (the only allow-listed dynamic route; reads no content):

```tsx
import { notFound } from 'next/navigation';

export default function CatchAll() {
  notFound();
}
```

`app/[locale]/page.tsx` (shelf; replaced by the designed shelf in Task 18):

```tsx
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { contentRoot, listCollections } from '@/lib/content/collection';
import { routing } from '@/i18n/routing';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Shelf({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const collections = listCollections(contentRoot());
  return (
    <main>
      <h1>advanced-java</h1>
      <ul>
        {collections.map((c) => (
          <li key={c}>
            <a href={`/${locale}/${c}`}>{c}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

`app/[locale]/[collection]/page.tsx`:

```tsx
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { contentRoot, listCollections, loadCollection } from '@/lib/content/collection';
import { routing } from '@/i18n/routing';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  const root = contentRoot();
  return routing.locales.flatMap((locale) => listCollections(root).map((collection) => ({ locale, collection })));
}

export default async function CollectionPage({ params }: { params: Promise<{ locale: string; collection: string }> }) {
  const { locale, collection } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const c = loadCollection(contentRoot(), collection);
  return (
    <main>
      <h1>{c.id}</h1>
      <ul>
        {c.sections.map((s) => (
          <li key={s.id}>
            <a href={`/${locale}/${collection}/${s.id}`}>{s.id}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

`app/[locale]/[collection]/[section]/page.tsx`:

```tsx
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { contentRoot, listCollections, listDocs, loadCollection } from '@/lib/content/collection';
import { routing } from '@/i18n/routing';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  const root = contentRoot();
  return routing.locales.flatMap((locale) =>
    listCollections(root).flatMap((collection) =>
      loadCollection(root, collection).sections.map((s) => ({ locale, collection, section: s.id })),
    ),
  );
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ locale: string; collection: string; section: string }>;
}) {
  const { locale, collection, section } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const c = loadCollection(contentRoot(), collection);
  const docs = listDocs(c).filter((d) => d.section === section);
  if (!docs.length) notFound();
  return (
    <main>
      <h1>{section}</h1>
      <ul>
        {docs.map((d) => (
          <li key={d.slug}>
            <a href={`/${locale}/${collection}/${section}/${d.slug}`}>
              {d.catalogId} {d.slug}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

`app/[locale]/[collection]/[section]/[slug]/page.tsx`:

```tsx
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { contentRoot, listCollections, listDocs, loadCollection } from '@/lib/content/collection';
import { resolveDoc } from '@/lib/content/fallback';
import { headingsFor } from '@/lib/content/headings-index';
import { LOCALES, type Locale } from '@/lib/content/types';
import { extractHeadings } from '@/lib/render/headings';
import { renderMarkdown } from '@/lib/render/pipeline';
import { routing } from '@/i18n/routing';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  const root = contentRoot();
  const out: { locale: string; collection: string; section: string; slug: string }[] = [];
  for (const collection of listCollections(root)) {
    for (const d of listDocs(loadCollection(root, collection))) {
      for (const locale of LOCALES) out.push({ locale, collection, section: d.section, slug: d.slug });
    }
  }
  return out;
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ locale: string; collection: string; section: string; slug: string }>;
}) {
  const { locale, collection, section, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const root = contentRoot();
  const c = loadCollection(root, collection);
  const doc = resolveDoc(root, c, locale as Locale, section, slug);
  if (!doc) notFound();

  const { html } = await renderMarkdown(doc.body, {
    collection,
    routeLocale: locale as Locale,
    currentHeadings: extractHeadings(doc.body),
    headingsOf: (cc, ss, sl) => headingsFor(root, loadCollection(root, cc), locale as Locale, ss, sl),
  });

  return (
    <main>
      <article lang={doc.served === 'zh' ? 'zh-Hans' : doc.served} dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
```

- [ ] **Step 6: Typecheck and unit tests**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 7: Build and run the assertion (verifies U1, U2, U3, U11, U12)**

```bash
pnpm exec tsx scripts/copy-assets.ts
pnpm exec next build
```

Expected: build succeeds with the route table listing `/[locale]/[collection]/[section]/[slug]` as static (`●`/SSG) and `/[locale]/[...rest]` as dynamic (`ƒ`). Then inspect the manifest shapes the script assumes:

```bash
node -e "const m=require('./.next/prerender-manifest.json'); console.log(Object.keys(m)); console.log(Object.keys(m.routes).length, Object.keys(m.dynamicRoutes).slice(0,5)); console.log(Object.values(m.routes)[0]); console.log(Object.values(m.dynamicRoutes)[0])"
node -e "console.log(require('./.next/server/app-path-routes-manifest.json'))" | head -30
```

If a field name differs (e.g. the revalidate field, the `fallback` field, or the manifest file name), **edit only the CLI block of `scripts/assert-static-build.ts`** to map the real shapes into `StaticCheckInput`, keep `checkStaticBuild` and its tests unchanged, and write the observed shapes into `docs/superpowers/decisions/next-build-manifests.md`.

Run: `pnpm exec tsx scripts/assert-static-build.ts`
Expected: `static build assertion OK (243 doc routes prerendered)`.

- [ ] **Step 8: Smoke-test the running server (U1, U12)**

```bash
pnpm exec next start -p 4010 &
sleep 4
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -H 'Accept-Language: vi' http://localhost:4010/advanced-java/high-concurrency/why-mq
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:4010/advanced-java/high-concurrency/why-mq
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4010/vi/advanced-java/high-concurrency/why-mq
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4010/vi/foo/bar
kill %1
```

Expected: `307 http://localhost:4010/vi/advanced-java/high-concurrency/why-mq`; `307 http://localhost:4010/en/advanced-java/high-concurrency/why-mq`; `200`; `404`. If the redirect is not 307 or not produced, fix `proxy.ts` (for example keep only the export form Next 16.4 accepts) and record the result in `docs/superpowers/decisions/proxy.md`.

- [ ] **Step 9: Commit**

```bash
git add -A && ./scripts/commit.sh "feat: static localized routes, catch-all 404, build assertion script"
```

## Task 14: Locale cookie, anchor resolver, language switcher

**Files:**
- Create: `lib/locale-cookie.ts`, `lib/anchor.ts`, `components/AnchorResolver.tsx`, `components/LanguageSwitcher.tsx`
- Test: `tests/client/locale-cookie.test.ts`, `tests/client/anchor.test.ts`, `tests/client/language-switcher.test.tsx`

**Interfaces:**
- Consumes: `Locale` (Task 2).
- Produces:

```ts
// lib/locale-cookie.ts
export const LOCALE_COOKIE = 'NEXT_LOCALE';
export function localeCookieString(locale: Locale): string;
export function writeLocaleCookie(locale: Locale, doc?: { cookie: string }): void;
// lib/anchor.ts
export function parseHeadingHash(hash: string): number | null;      // '#h3-old-slug' -> 3, '#h3' -> 3, '#intro' -> null
export function findHeadingElement(root: ParentNode, index: number): Element | null; // last heading when index too big, first when < 1
export function resolveHashInDocument(doc: Document, hash: string): Element | null;
export function currentHeadingIndex(root: ParentNode, offset?: number): number | null;
// components/LanguageSwitcher.tsx ('use client')
export type SwitcherStatus = 'translated' | 'machine' | 'fallback';
export interface SwitcherItem { locale: Locale; label: string; status: SwitcherStatus; href: string }
export function LanguageSwitcher(props: { items: SwitcherItem[]; current: Locale; navigate?: (url: string) => void }): JSX.Element;
```

- [ ] **Step 1: Write the failing tests**

`tests/client/locale-cookie.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { localeCookieString, writeLocaleCookie } from '@/lib/locale-cookie';

describe('locale cookie', () => {
  it('has the exact attributes from the spec', () => {
    expect(localeCookieString('vi')).toBe('NEXT_LOCALE=vi; path=/; max-age=31536000; samesite=lax');
  });
  it('writes to the given document-like object', () => {
    const doc = { cookie: '' };
    writeLocaleCookie('zh', doc);
    expect(doc.cookie).toBe('NEXT_LOCALE=zh; path=/; max-age=31536000; samesite=lax');
  });
});
```

`tests/client/anchor.test.ts`:

```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { currentHeadingIndex, findHeadingElement, parseHeadingHash, resolveHashInDocument } from '@/lib/anchor';

function mount(count: number) {
  document.body.innerHTML = Array.from(
    { length: count },
    (_, i) => `<h2 id="h${i + 1}-slug-${i + 1}" data-hi="${i + 1}">T${i + 1}</h2>`,
  ).join('');
}

describe('parseHeadingHash', () => {
  it('reads the index and ignores the slug', () => {
    expect(parseHeadingHash('#h3-old-slug')).toBe(3);
    expect(parseHeadingHash('#h12')).toBe(12);
    expect(parseHeadingHash('h4-x')).toBe(4);
  });
  it('returns null for non-heading hashes', () => {
    expect(parseHeadingHash('#intro')).toBeNull();
    expect(parseHeadingHash('#hello')).toBeNull();
    expect(parseHeadingHash('')).toBeNull();
  });
});

describe('heading resolution', () => {
  beforeEach(() => mount(3));
  it('resolves a stale slug on the right heading', () => {
    expect(resolveHashInDocument(document, '#h2-totally-old-slug')?.id).toBe('h2-slug-2');
  });
  it('resolves an index beyond the count to the last heading, never null', () => {
    expect(resolveHashInDocument(document, '#h99')?.id).toBe('h3-slug-3');
  });
  it('resolves index 0 to the first heading', () => {
    expect(findHeadingElement(document, 0)?.id).toBe('h1-slug-1');
  });
  it('returns null when the page has no indexed headings', () => {
    document.body.innerHTML = '<p>none</p>';
    expect(resolveHashInDocument(document, '#h1')).toBeNull();
  });
});

describe('currentHeadingIndex', () => {
  it('returns the last heading whose top is at or above the offset', () => {
    mount(3);
    const tops = [-300, 40, 500];
    document.querySelectorAll('[data-hi]').forEach((el, i) => {
      (el as HTMLElement).getBoundingClientRect = () => ({ top: tops[i] }) as DOMRect;
    });
    expect(currentHeadingIndex(document, 96)).toBe(2);
  });
  it('returns null before the first heading', () => {
    mount(2);
    document.querySelectorAll('[data-hi]').forEach((el) => {
      (el as HTMLElement).getBoundingClientRect = () => ({ top: 400 }) as DOMRect;
    });
    expect(currentHeadingIndex(document, 96)).toBeNull();
  });
});
```

`tests/client/language-switcher.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import en from '../../messages/en.json';

const items = [
  { locale: 'en' as const, label: 'English', status: 'translated' as const, href: '/en/c/a/x' },
  { locale: 'vi' as const, label: 'Tiếng Việt', status: 'machine' as const, href: '/vi/c/a/x' },
  { locale: 'zh' as const, label: '中文', status: 'fallback' as const, href: '/zh/c/a/x' },
];

function wrap(ui: React.ReactElement) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    document.cookie = 'NEXT_LOCALE=; max-age=0; path=/';
    document.body.innerHTML = '';
  });

  it('lists every locale with its status', () => {
    render(wrap(<LanguageSwitcher items={items} current="en" />));
    expect(screen.getByRole('link', { name: /Tiếng Việt/ }).textContent).toContain('Machine translated');
    expect(screen.getByRole('link', { name: /中文/ }).textContent).toContain('Not translated');
  });

  it('writes the locale cookie and navigates keeping the heading position', () => {
    const h = document.createElement('h2');
    h.setAttribute('data-hi', '4');
    h.getBoundingClientRect = () => ({ top: 10 }) as DOMRect;
    document.body.appendChild(h);
    const navigate = vi.fn();
    render(wrap(<LanguageSwitcher items={items} current="en" navigate={navigate} />));
    fireEvent.click(screen.getByRole('link', { name: /Tiếng Việt/ }));
    expect(document.cookie).toContain('NEXT_LOCALE=vi');
    expect(navigate).toHaveBeenCalledWith('/vi/c/a/x#h4');
  });

  it('navigates without a hash when no heading is above the fold', () => {
    const navigate = vi.fn();
    render(wrap(<LanguageSwitcher items={items} current="en" navigate={navigate} />));
    fireEvent.click(screen.getByRole('link', { name: /中文/ }));
    expect(navigate).toHaveBeenCalledWith('/zh/c/a/x');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/client`
Expected: FAIL (modules missing). Also add `.tsx` handling: `vitest.config.ts` already includes `tests/**/*.test.{ts,tsx}`; add `esbuild: { jsx: 'automatic' }` to `vitest.config.ts` if JSX fails to compile.

- [ ] **Step 3: Implement**

`lib/locale-cookie.ts`:

```ts
import type { Locale } from './content/types';

export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function localeCookieString(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function writeLocaleCookie(locale: Locale, doc: { cookie: string } = document): void {
  doc.cookie = localeCookieString(locale);
}
```

`lib/anchor.ts`:

```ts
export function parseHeadingHash(hash: string): number | null {
  const m = /^#?h(\d+)(?:-|$)/.exec(hash);
  return m ? Number(m[1]) : null;
}

function headingElements(root: ParentNode): Element[] {
  return Array.from(root.querySelectorAll('[data-hi]'));
}

export function findHeadingElement(root: ParentNode, index: number): Element | null {
  const els = headingElements(root);
  if (!els.length) return null;
  if (index < 1) return els[0];
  return els.find((e) => e.getAttribute('data-hi') === String(index)) ?? els[els.length - 1];
}

export function resolveHashInDocument(doc: Document, hash: string): Element | null {
  const n = parseHeadingHash(hash);
  return n === null ? null : findHeadingElement(doc, n);
}

export function currentHeadingIndex(root: ParentNode, offset = 96): number | null {
  let current: number | null = null;
  for (const el of headingElements(root)) {
    if (el.getBoundingClientRect().top <= offset) current = Number(el.getAttribute('data-hi'));
    else break;
  }
  return current;
}
```

`components/AnchorResolver.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { resolveHashInDocument } from '@/lib/anchor';

export function AnchorResolver() {
  useEffect(() => {
    const go = () => {
      if (!window.location.hash) return;
      const el = resolveHashInDocument(document, window.location.hash);
      if (!el) return;
      el.scrollIntoView();
      if (el.id && window.location.hash !== `#${el.id}`) {
        window.history.replaceState(null, '', `#${el.id}`);
      }
    };
    go();
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, []);
  return null;
}
```

`components/LanguageSwitcher.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { currentHeadingIndex } from '@/lib/anchor';
import type { Locale } from '@/lib/content/types';
import { writeLocaleCookie } from '@/lib/locale-cookie';

export type SwitcherStatus = 'translated' | 'machine' | 'fallback';
export interface SwitcherItem { locale: Locale; label: string; status: SwitcherStatus; href: string }

export function LanguageSwitcher({
  items,
  current,
  navigate = (url: string) => window.location.assign(url),
}: {
  items: SwitcherItem[];
  current: Locale;
  navigate?: (url: string) => void;
}) {
  const t = useTranslations('doc');
  const statusLabel = (s: SwitcherStatus) =>
    s === 'translated' ? t('translated') : s === 'machine' ? t('machineStatus') : t('fallback');

  return (
    <nav aria-label="Language" className="lang-switcher">
      <ul>
        {items.map((it) => (
          <li key={it.locale}>
            <a
              href={it.href}
              lang={it.locale === 'zh' ? 'zh-Hans' : it.locale}
              aria-current={it.locale === current ? 'true' : undefined}
              data-status={it.status}
              onClick={(e) => {
                e.preventDefault();
                writeLocaleCookie(it.locale);
                const idx = currentHeadingIndex(document);
                navigate(idx ? `${it.href}#h${idx}` : it.href);
              }}
            >
              <span className="lang-label ui-cjk">{it.label}</span>
              <span className="lang-status">{statusLabel(it.status)}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 4: Run to verify pass, then commit**

Run: `pnpm vitest run tests/client && pnpm typecheck`
Expected: PASS.

```bash
git add -A && ./scripts/commit.sh "feat: locale cookie writer, anchor resolver, language switcher"
```

---

## Task 15: Quadrille design system: Impeccable brief, tokens, fonts, theme

> **Executor note.** UI work in this plan follows Impeccable. Before any UI edit in this task or Tasks 16–19 and 24, read `/Users/ryan/.claude/skills/impeccable/reference/craft-floor.md` once. The tokens and structure below are the committed direction from the approved spec (§8); do not run a new direction roll. The finish review is Task 27.

**Files:**
- Create: `app/globals.css`, `app/fonts.ts`, `components/ThemeToggle.tsx`, `components/ReadingModeToggle.tsx`, `docs/superpowers/decisions/design-direction.md`
- Create (Impeccable-managed): `.impeccable/…` surface brief via the script below
- Modify: `app/[locale]/layout.tsx`
- Test: `tests/design/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties `--paper --ink --ink-muted --grid --accent --accent-ink --rule` (light default, `[data-theme="dark"]` and `prefers-color-scheme` dark), font variables `--font-serif --font-ui --font-mono --font-cjk` (exported as class `fontVariables` from `app/fonts.ts`), `[data-reading="on"]` hides the grid, utility classes `.ui` (UI font stack) and `.ui-cjk` (system CJK stack, used by the "中文" label).

- [ ] **Step 1: Load Impeccable context and write the surface brief**

```bash
/Users/ryan/.claude/skills/impeccable/scripts/impeccable context
```

Read `/Users/ryan/.claude/skills/impeccable/reference/craft-floor.md`. Then write the direction contract to a body file and persist it (the brief target is the doc page):

```bash
cat > .impeccable-brief.md <<'EOF'
# Surface brief: doc reading page (Read mode)

## Direction contract
THESIS: The page is an engineer's quadrille notebook: the grid is structural (vertical rhythm, margins, gutters), never a texture behind running text. It refuses the stock docs template of boxed cards, gradient hero and tinted callouts.
OWN-WORLD: Cool blue-white grid paper, near-black ink, one cobalt accent (light); cyanotype, deep Prussian blue with white linework (dark). Serif body, humanist UI sans, mono labels. Notices are dotted-ruled margin notes, not colored banners. No second accent color.
STORY: A reader finds a topic, reads it comfortably in their language, switches language without losing place, and always knows if the page is translated, machine translated, or an out-of-date translation.
FIRST VIEWPORT: Left rail (notebook tab, section/group/doc tree with catalog IDs), centered reading column (66ch Latin/Vietnamese, 38em CJK) with the catalog ID, H1 and one status line above the body; right rail with TOC and numbered margin steps. Grid appears only in the outer margins at about 6% opacity. Primary action: continue reading (resume flag), search at top right.
FORM: Engineer's quadrille notebook, position 5 on the grounded list, seed key 34f55792. Raises: resume flag (cutting bench), numbered margin steps (orizuru), stable catalog IDs (catalog sleeve).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
EOF
/Users/ryan/.claude/skills/impeccable/scripts/impeccable surface-brief write "app/[locale]/[collection]/[section]/[slug]/page.tsx" .impeccable-brief.md
/Users/ryan/.claude/skills/impeccable/scripts/impeccable surface-brief read "app/[locale]/[collection]/[section]/[slug]/page.tsx" | head -40
rm .impeccable-brief.md
```

Expected: the read shows all six blocks and the FINISH line. Also write `docs/superpowers/decisions/design-direction.md` containing the same contract so it lives in version control. Never copy the contract into app source, comments or served files.

- [ ] **Step 2: Write the failing token test**

`tests/design/tokens.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('app/globals.css', 'utf8');

function block(re: RegExp): Record<string, string> {
  const m = re.exec(css);
  if (!m) throw new Error(`block not found: ${re}`);
  return Object.fromEntries([...m[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]));
}

const light = block(/:root\s*{([^}]*)}/);
const darkAttr = block(/:root\[data-theme="dark"\]\s*{([^}]*)}/);
const darkMedia = block(/@media \(prefers-color-scheme: dark\)\s*{\s*:root:not\(\[data-theme="light"\]\)\s*{([^}]*)}/);

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('design tokens', () => {
  it('defines every required token in all three theme blocks', () => {
    for (const set of [light, darkAttr, darkMedia]) {
      for (const k of ['--paper', '--ink', '--ink-muted', '--grid', '--accent', '--accent-ink', '--rule']) {
        expect(set[k], k).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
  it('keeps the media-query dark theme identical to the attribute dark theme', () => {
    expect(darkMedia).toEqual(darkAttr);
  });
  it('meets WCAG AA for text pairs in light and dark', () => {
    for (const set of [light, darkAttr]) {
      expect(ratio(set['--ink'], set['--paper'])).toBeGreaterThanOrEqual(4.5);
      expect(ratio(set['--ink-muted'], set['--paper'])).toBeGreaterThanOrEqual(4.5);
      expect(ratio(set['--accent'], set['--paper'])).toBeGreaterThanOrEqual(4.5);
      expect(ratio(set['--accent-ink'], set['--accent'])).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('hides the grid in reading mode and styles Han text only under :lang(zh)', () => {
    expect(css).toMatch(/\[data-reading="on"\][^{]*{[^}]*background-image:\s*none/s);
    expect(css).toMatch(/\.prose:lang\(zh\)/);
    expect(css).not.toMatch(/\.ui[^{]*{[^}]*--font-cjk/s);
  });
  it('respects reduced motion', () => {
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm vitest run tests/design/tokens.test.ts`
Expected: FAIL (`app/globals.css` missing).

- [ ] **Step 4: Write tokens, fonts, toggles, layout wiring**

`app/globals.css`:

```css
:root {
  --paper: #f4f8fc;
  --ink: #10151f;
  --ink-muted: #46526a;
  --grid: #cfdbea;
  --accent: #1f4fd8;
  --accent-ink: #ffffff;
  --rule: #b9c7da;
  --step: 1.7;
  --measure: 66ch;
}

:root[data-theme="dark"] {
  --paper: #0a2540;
  --ink: #e8f1ff;
  --ink-muted: #a9bfdc;
  --grid: #1d4066;
  --accent: #7fb0ff;
  --accent-ink: #0a2540;
  --rule: #2c5584;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #0a2540;
    --ink: #e8f1ff;
    --ink-muted: #a9bfdc;
    --grid: #1d4066;
    --accent: #7fb0ff;
    --accent-ink: #0a2540;
    --rule: #2c5584;
  }
}

* { box-sizing: border-box; }
html { color-scheme: light dark; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-serif), 'Noto Serif', Georgia, serif;
  line-height: var(--step);
}

/* UI chrome: never loads the CJK web font; Han glyphs use system fonts */
.ui, .ui-cjk, .topbar, .rail, .toc, .margin-steps, .lang-switcher, .notice {
  font-family: var(--font-ui), system-ui, -apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}
.mono { font-family: var(--font-mono), ui-monospace, 'SF Mono', Menlo, monospace; }

.shell {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr) minmax(200px, 260px);
  min-height: 100vh;
  /* the grid lives only in the margins; .reader paints solid paper over it */
  background-image:
    linear-gradient(to right, color-mix(in srgb, var(--grid) 60%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, var(--grid) 60%, transparent) 1px, transparent 1px);
  background-size: 24px 24px;
}
[data-reading="on"] .shell { background-image: none; }

.reader { background: var(--paper); padding: 2rem clamp(1rem, 4vw, 3rem); }
.prose { max-width: var(--measure); margin-inline: auto; }
.prose:lang(zh) { font-family: var(--font-cjk), 'Noto Serif SC', 'Songti SC', serif; line-height: 1.9; max-width: 38em; }
.prose h2, .prose h3, .prose h4 { scroll-margin-top: 5rem; }
.prose a { color: var(--accent); }
.prose pre { overflow-x: auto; padding: 1rem; border: 1px solid var(--rule); }
.prose code { font-family: var(--font-mono), ui-monospace, monospace; font-size: 0.92em; }
.prose img { max-width: 100%; height: auto; }
.prose table { border-collapse: collapse; }
.prose th, .prose td { border: 1px solid var(--rule); padding: 0.4rem 0.7rem; }

.notice { border-left: 2px dotted var(--ink-muted); padding: 0.25rem 0.75rem; margin: 0.5rem 0; color: var(--ink-muted); font-size: 0.9rem; }
.doc-id { font-size: 0.8rem; letter-spacing: 0.04em; color: var(--ink-muted); }

.topbar { display: flex; gap: 1rem; align-items: center; justify-content: space-between; padding: 0.5rem 1rem; border-bottom: 1px solid var(--rule); background: var(--paper); position: sticky; top: 0; z-index: 5; }
.rail, .toc-rail { padding: 1rem; font-size: 0.9rem; }
.rail ul, .toc ul, .margin-steps ol { list-style: none; margin: 0; padding: 0; }
.rail a, .toc a, .margin-steps a { color: inherit; text-decoration: none; }
.rail a[aria-current="page"] { color: var(--accent); font-weight: 600; }
.margin-steps li { display: grid; grid-template-columns: 2rem 1fr; gap: 0.5rem; }

a:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.mobile-nav { display: none; }

@media (max-width: 960px) {
  .shell { grid-template-columns: 1fr; }
  .shell > .rail, .shell > .toc-rail { display: none; }
  .mobile-nav { display: block; padding: 0.5rem 1rem; border-bottom: 1px solid var(--rule); background: var(--paper); }
  .mobile-nav summary { cursor: pointer; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
```

`app/fonts.ts`:

```ts
import { Be_Vietnam_Pro, JetBrains_Mono, Noto_Serif_SC, Source_Serif_4 } from 'next/font/google';

const latin = ['latin', 'latin-ext', 'vietnamese'] as const;

const serif = Source_Serif_4({ subsets: [...latin], variable: '--font-serif', display: 'swap' });
const ui = Be_Vietnam_Pro({ subsets: [...latin], weight: ['400', '500', '600'], variable: '--font-ui', display: 'swap' });
const mono = JetBrains_Mono({ subsets: [...latin], variable: '--font-mono', display: 'swap' });
// CJK: not preloaded; only requested (unicode-range slices) when Han glyphs render under .prose:lang(zh)
const cjk = Noto_Serif_SC({ weight: ['400', '600'], preload: false, variable: '--font-cjk', display: 'swap' });

export const fontVariables = [serif.variable, ui.variable, mono.variable, cjk.variable].join(' ');
```

`components/ThemeToggle.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

function apply(theme: Theme) {
  const el = document.documentElement;
  if (theme === 'system') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', theme);
  try {
    window.localStorage.setItem('theme', theme);
  } catch {
    /* storage unavailable: theme still applies for this page */
  }
}

export function ThemeToggle() {
  const t = useTranslations('nav');
  const [theme, setTheme] = useState<Theme>('system');
  const next: Theme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
  return (
    <button
      type="button"
      className="ui"
      aria-label={t('theme')}
      onClick={() => {
        apply(next);
        setTheme(next);
      }}
    >
      {t('theme')}: {theme}
    </button>
  );
}
```

`components/ReadingModeToggle.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

export function ReadingModeToggle() {
  const t = useTranslations('nav');
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      className="ui"
      aria-pressed={on}
      onClick={() => {
        const next = !on;
        setOn(next);
        if (next) document.documentElement.setAttribute('data-reading', 'on');
        else document.documentElement.removeAttribute('data-reading');
      }}
    >
      {t('readingMode')}
    </button>
  );
}
```

Modify `app/[locale]/layout.tsx`: import `./../globals.css` as `import '../globals.css';`, import `fontVariables` from `@/app/fonts`, put `className={fontVariables}` on `<html>`, and add the pre-hydration theme script as the first child of `<head>`:

```tsx
<html lang={locale} className={fontVariables} suppressHydrationWarning>
  <head>
    <script
      dangerouslySetInnerHTML={{
        __html:
          "try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}",
      }}
    />
  </head>
  <body>
    <NextIntlClientProvider>{children}</NextIntlClientProvider>
  </body>
</html>
```

- [ ] **Step 5: Run to verify pass, build, commit**

Run: `pnpm vitest run tests/design/tokens.test.ts && pnpm typecheck && pnpm exec next build`
Expected: PASS; build succeeds and fonts download at build time (network required). If `Noto_Serif_SC` rejects an option, keep `preload: false` and fix only the option that errored (U4 is verified in Task 25).

```bash
git add -A && ./scripts/commit.sh "feat: Quadrille tokens, fonts, theme and reading-mode toggles"
```

---

## Task 16: Reading shell: notices, nav, steps, header, rails, footer

**Files:**
- Create: `lib/notices.ts`, `lib/nav.ts`, `lib/steps.ts`, `lib/upstream.ts`, `components/{Attribution,DocHeader,Sidebar,Toc,MarginSteps,TopBar,DocFooter}.tsx`
- Modify: `app/[locale]/[collection]/[section]/[slug]/page.tsx`
- Test: `tests/ui/notices.test.ts`, `tests/ui/nav.test.ts`, `tests/ui/steps.test.ts`, `tests/ui/upstream.test.ts`, `tests/ui/doc-header.test.tsx`

**Interfaces:**
- Consumes: `resolveDoc`, `zhHashOf`, `availableLocales` (Task 11); `loadMeta`, `listDocs`, `CollectionConfig` (Task 2); `extractHeadings`, `HeadingInfo` (Task 6); `LanguageSwitcher`, `AnchorResolver` (Task 14); `ThemeToggle`, `ReadingModeToggle` (Task 15).
- Produces:

```ts
// lib/notices.ts
export type NoticeKind = 'fallback' | 'machine' | 'stale';
export function computeNotices(i: {
  requested: Locale; served: Locale; sourceLocale: Locale;
  status?: DocStatus; sourceHash?: string; zhHash: string;
}): NoticeKind[];                                    // order: fallback, machine, stale
// lib/nav.ts
export interface NavDoc { slug: string; catalogId: string; title: string; status: 'translated' | 'machine' | 'fallback'; href: string }
export interface NavGroup { id: string; title: string; docs: NavDoc[] }
export interface NavSection { id: string; title: string; groups: NavGroup[] }
export function buildNav(root: string, c: CollectionConfig, locale: Locale): NavSection[];
export function flatDocs(nav: NavSection[]): NavDoc[];
// lib/steps.ts
export type DocShape = 'qa' | 'plain';
export function docShape(zhHeadings: { depth: number; text: string }[]): DocShape;
export interface Step { number: number; labelKey: 'question' | 'psychology' | 'answer' | null; text: string; id: string }
export function stepsFor(headings: HeadingInfo[], shape: DocShape): Step[];
// lib/upstream.ts
export function upstreamFileUrl(c: CollectionConfig, slug: string): string;
```

- [ ] **Step 1: Write the failing logic tests**

`tests/ui/notices.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeNotices } from '@/lib/notices';

const base = { sourceLocale: 'zh' as const, zhHash: 'h1' };

describe('computeNotices', () => {
  it('shows nothing for the source locale', () => {
    expect(computeNotices({ ...base, requested: 'zh', served: 'zh' })).toEqual([]);
  });
  it('fallback only: vi served zh', () => {
    expect(computeNotices({ ...base, requested: 'vi', served: 'zh' })).toEqual(['fallback']);
  });
  it('fallback + machine: vi served a machine en', () => {
    expect(
      computeNotices({ ...base, requested: 'vi', served: 'en', status: 'machine', sourceHash: 'h1' }),
    ).toEqual(['fallback', 'machine']);
  });
  it('machine only', () => {
    expect(computeNotices({ ...base, requested: 'vi', served: 'vi', status: 'machine', sourceHash: 'h1' })).toEqual([
      'machine',
    ]);
  });
  it('stale when the zh hash changed, even for reviewed', () => {
    expect(computeNotices({ ...base, requested: 'vi', served: 'vi', status: 'reviewed', sourceHash: 'old' })).toEqual([
      'stale',
    ]);
  });
  it('machine + stale together', () => {
    expect(computeNotices({ ...base, requested: 'en', served: 'en', status: 'machine', sourceHash: 'old' })).toEqual([
      'machine',
      'stale',
    ]);
  });
});
```

`tests/ui/steps.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { docShape, stepsFor } from '@/lib/steps';

const qa = [
  { depth: 2, text: '面试题' },
  { depth: 2, text: '面试官心理分析' },
  { depth: 2, text: '面试题剖析' },
  { depth: 3, text: '细节' },
];

describe('docShape', () => {
  it('detects the three-part interview shape from the zh headings', () => {
    expect(docShape(qa)).toBe('qa');
  });
  it('is plain for tutorial and problem/solution docs', () => {
    expect(docShape([{ depth: 2, text: 'Hystrix 是什么？' }, { depth: 2, text: 'Hystrix 的历史' }])).toBe('plain');
    expect(docShape([{ depth: 2, text: '题目描述' }, { depth: 2, text: '解答思路' }, { depth: 2, text: '方法总结' }])).toBe(
      'plain',
    );
  });
});

describe('stepsFor', () => {
  const hs = [
    { index: 1, depth: 2, text: 'A', id: 'h1-a' },
    { index: 2, depth: 3, text: 'A1', id: 'h2-a1' },
    { index: 3, depth: 2, text: 'B', id: 'h3-b' },
    { index: 4, depth: 2, text: 'C', id: 'h4-c' },
    { index: 5, depth: 2, text: 'D', id: 'h5-d' },
  ];
  it('numbers the h2 headings and labels the first three for qa docs', () => {
    const s = stepsFor(hs, 'qa');
    expect(s.map((x) => [x.number, x.labelKey, x.id])).toEqual([
      [1, 'question', 'h1-a'],
      [2, 'psychology', 'h3-b'],
      [3, 'answer', 'h4-c'],
      [4, null, 'h5-d'],
    ]);
  });
  it('uses plain numbers for other docs', () => {
    expect(stepsFor(hs, 'plain').every((x) => x.labelKey === null)).toBe(true);
  });
});
```

`tests/ui/upstream.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { upstreamFileUrl } from '@/lib/upstream';
import type { CollectionConfig } from '@/lib/content/types';

const c = {
  upstream: { repo: 'https://github.com/doocs/advanced-java', commit: '1a35221' },
  upstreamFiles: {
    'why-mq': 'docs/high-concurrency/why-mq.md',
    whats: "docs/micro-services/what's-microservice-how-to-communicate.md",
  },
} as unknown as CollectionConfig;

describe('upstreamFileUrl', () => {
  it('links the exact upstream file at the recorded commit', () => {
    expect(upstreamFileUrl(c, 'why-mq')).toBe(
      'https://github.com/doocs/advanced-java/blob/1a35221/docs/high-concurrency/why-mq.md',
    );
  });
  it('encodes the apostrophe', () => {
    expect(upstreamFileUrl(c, 'whats')).toBe(
      'https://github.com/doocs/advanced-java/blob/1a35221/docs/micro-services/what%27s-microservice-how-to-communicate.md',
    );
  });
  it('throws for an unknown slug', () => {
    expect(() => upstreamFileUrl(c, 'nope')).toThrow(/nope/);
  });
});
```

`tests/ui/nav.test.ts`:

```ts
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCollection } from '@/lib/content/collection';
import { buildNav, flatDocs } from '@/lib/nav';

const root = path.resolve(__dirname, '../fixtures/content');
const c = loadCollection(root, 'demo');

describe('buildNav', () => {
  it('lists sections, groups and docs with catalog ids and locale-prefixed hrefs', () => {
    const nav = buildNav(root, c, 'en');
    expect(nav[0].id).toBe('alpha');
    const docs = flatDocs(nav);
    expect(docs.map((d) => d.catalogId)).toEqual(['AL-01', 'AL-02', 'AL-03']);
    expect(docs[0].href).toBe('/en/demo/alpha/intro');
  });
  it('uses the localized nav title when present and falls back to the slug', () => {
    const docs = flatDocs(buildNav(root, c, 'en'));
    expect(docs[0].title).toBe('Intro');
    expect(docs[1].title).toBe('second');
  });
  it('marks status: translated/machine/fallback', () => {
    const en = Object.fromEntries(flatDocs(buildNav(root, c, 'en')).map((d) => [d.slug, d.status]));
    expect(en).toEqual({ intro: 'machine', second: 'fallback', third: 'fallback' });
    const zh = Object.fromEntries(flatDocs(buildNav(root, c, 'zh')).map((d) => [d.slug, d.status]));
    expect(zh).toEqual({ intro: 'translated', second: 'translated', third: 'translated' });
  });
});
```

`tests/ui/doc-header.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { DocHeader } from '@/components/DocHeader';
import en from '../../messages/en.json';

const wrap = (ui: React.ReactElement) => (
  <NextIntlClientProvider locale="en" messages={en}>
    {ui}
  </NextIntlClientProvider>
);

describe('DocHeader', () => {
  it('shows id and title and no notices for the source language', () => {
    render(wrap(<DocHeader catalogId="HC-03" title="Why MQ" notices={[]} requestedName="中文" servedName="中文" originalHref="/x" />));
    expect(screen.getByText('HC-03')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Why MQ');
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('names both languages in the fallback notice', () => {
    render(wrap(<DocHeader catalogId="HC-03" title="t" notices={['fallback']} requestedName="Tiếng Việt" servedName="中文" originalHref="/x" />));
    expect(screen.getByRole('note').textContent).toBe(
      'This page is not translated into Tiếng Việt yet. Showing the 中文 original.',
    );
  });

  it('shows the machine note and a stale note with a link to the original', () => {
    render(wrap(<DocHeader catalogId="HC-03" title="t" notices={['machine', 'stale']} requestedName="English" servedName="English" originalHref="https://example.com/u" />));
    const notes = screen.getAllByRole('note').map((n) => n.textContent ?? '');
    expect(notes[0]).toBe('Machine translated, may contain errors.');
    expect(notes[1]).toContain('The Chinese original was updated after this translation');
    expect(screen.getByRole('link', { name: 'View original' }).getAttribute('href')).toBe('https://example.com/u');
  });
});
```

Fixture needed by `nav.test.ts`: extend `tests/fixtures/content/demo/en/meta.json` so `docs.intro.navTitle` is `"Intro"` (already in Task 2 fixture) and leave `second` untitled.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/ui`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement the logic modules**

`lib/notices.ts`:

```ts
import type { DocStatus, Locale } from './content/types';

export type NoticeKind = 'fallback' | 'machine' | 'stale';

export function computeNotices(i: {
  requested: Locale;
  served: Locale;
  sourceLocale: Locale;
  status?: DocStatus;
  sourceHash?: string;
  zhHash: string;
}): NoticeKind[] {
  const out: NoticeKind[] = [];
  const translated = i.served !== i.sourceLocale;
  if (i.served !== i.requested) out.push('fallback');
  if (translated && i.status === 'machine') out.push('machine');
  if (translated && i.sourceHash && i.sourceHash !== i.zhHash) out.push('stale');
  return out;
}
```

`lib/steps.ts`:

```ts
import type { HeadingInfo } from './render/headings';

export type DocShape = 'qa' | 'plain';
const QA = ['面试题', '面试官心理分析', '面试题剖析'];

export function docShape(zhHeadings: { depth: number; text: string }[]): DocShape {
  const h2 = zhHeadings.filter((h) => h.depth === 2).map((h) => h.text.trim());
  return QA.every((t, i) => h2[i] === t) ? 'qa' : 'plain';
}

export interface Step { number: number; labelKey: 'question' | 'psychology' | 'answer' | null; text: string; id: string }

export function stepsFor(headings: HeadingInfo[], shape: DocShape): Step[] {
  const keys = ['question', 'psychology', 'answer'] as const;
  return headings
    .filter((h) => h.depth === 2)
    .map((h, i) => ({
      number: i + 1,
      labelKey: shape === 'qa' && i < 3 ? keys[i] : null,
      text: h.text,
      id: h.id,
    }));
}
```

`lib/upstream.ts`:

```ts
import type { CollectionConfig } from './content/types';

export function upstreamFileUrl(c: CollectionConfig, slug: string): string {
  const file = c.upstreamFiles[slug];
  if (!file) throw new Error(`no upstream file recorded for slug "${slug}"`);
  const enc = encodeURI(file).replace(/'/g, '%27');
  return `${c.upstream.repo}/blob/${c.upstream.commit}/${enc}`;
}
```

`lib/nav.ts`:

```ts
import { loadMeta } from './content/collection';
import { resolveDoc } from './content/fallback';
import type { CollectionConfig, Locale } from './content/types';

export interface NavDoc { slug: string; catalogId: string; title: string; status: 'translated' | 'machine' | 'fallback'; href: string }
export interface NavGroup { id: string; title: string; docs: NavDoc[] }
export interface NavSection { id: string; title: string; groups: NavGroup[] }

export function buildNav(root: string, c: CollectionConfig, locale: Locale): NavSection[] {
  const own = loadMeta(root, c.id, locale);
  const src = loadMeta(root, c.id, c.sourceLocale);
  const pick = <T,>(a: T | undefined, b: T | undefined, d: T) => a ?? b ?? d;

  return c.sections.map((s) => ({
    id: s.id,
    title: pick(own.sections[s.id], src.sections[s.id], s.id),
    groups: s.groups.map((g) => ({
      id: g.id,
      title: pick(own.groups[g.id], src.groups[g.id], g.id),
      docs: g.docs.map((slug) => {
        const r = resolveDoc(root, c, locale, s.id, slug);
        const status: NavDoc['status'] =
          !r || r.fallback ? 'fallback' : r.served === c.sourceLocale || r.frontmatter?.status === 'reviewed' ? 'translated' : 'machine';
        return {
          slug,
          catalogId: c.ids[slug],
          title: pick(own.docs[slug]?.navTitle, src.docs[slug]?.navTitle, slug),
          status,
          href: `/${locale}/${c.id}/${s.id}/${slug}`,
        };
      }),
    })),
  }));
}

export function flatDocs(nav: NavSection[]): NavDoc[] {
  return nav.flatMap((s) => s.groups.flatMap((g) => g.docs));
}
```

- [ ] **Step 4: Implement the components**

`components/Attribution.tsx`:

```tsx
import { useTranslations } from 'next-intl';

export function Attribution({
  kind,
  fileUrl,
  aboutHref,
}: {
  kind: 'zh' | 'translated';
  fileUrl: string;
  aboutHref: string;
}) {
  const t = useTranslations('attribution');
  return (
    <footer className="attribution ui">
      <p>
        <a href="https://creativecommons.org/licenses/by-sa/4.0/">{t('license')}</a>. {t('credit')}.{' '}
        {kind === 'zh' ? t('changesZh') : t('changesTranslated')}{' '}
        <a href={fileUrl}>{t('sourceFile')}</a>. <a href={aboutHref}>{t('aboutLink')}</a>
      </p>
    </footer>
  );
}
```

`components/DocHeader.tsx`:

```tsx
import { useTranslations } from 'next-intl';
import type { NoticeKind } from '@/lib/notices';

export function DocHeader({
  catalogId,
  title,
  notices,
  requestedName,
  servedName,
  originalHref,
}: {
  catalogId: string;
  title: string;
  notices: NoticeKind[];
  requestedName: string;
  servedName: string;
  originalHref: string;
}) {
  const t = useTranslations('doc');
  return (
    <header className="doc-header">
      <p className="doc-id mono">{catalogId}</p>
      <h1>{title}</h1>
      {notices.map((n) => (
        <p key={n} role="note" className="notice">
          {n === 'fallback' && t('fallbackNotice', { requested: requestedName, served: servedName })}
          {n === 'machine' && t('machine')}
          {n === 'stale' && (
            <>
              {t('stale')} <a href={originalHref}>{t('viewOriginal')}</a>
            </>
          )}
        </p>
      ))}
    </header>
  );
}
```

`components/Sidebar.tsx`:

```tsx
import type { NavSection } from '@/lib/nav';

export function Sidebar({ nav, currentSlug }: { nav: NavSection[]; currentSlug: string }) {
  return (
    <nav className="rail" aria-label="Contents">
      {nav.map((s) => (
        <section key={s.id}>
          <h2 className="ui">{s.title}</h2>
          {s.groups.map((g) => (
            <div key={g.id}>
              <h3 className="ui">{g.title}</h3>
              <ul>
                {g.docs.map((d) => (
                  <li key={d.slug}>
                    <a href={d.href} aria-current={d.slug === currentSlug ? 'page' : undefined} data-status={d.status}>
                      <span className="doc-id mono">{d.catalogId}</span> {d.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </nav>
  );
}
```

`components/Toc.tsx`:

```tsx
import { useTranslations } from 'next-intl';
import type { HeadingInfo } from '@/lib/render/headings';

export function Toc({ headings }: { headings: HeadingInfo[] }) {
  const t = useTranslations('nav');
  const shown = headings.filter((h) => h.depth <= 4);
  if (!shown.length) return null;
  return (
    <nav className="toc" aria-label={t('contents')}>
      <ul>
        {shown.map((h) => (
          <li key={h.id} style={{ paddingInlineStart: `${(h.depth - 2) * 0.75}rem` }}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

`components/MarginSteps.tsx`:

```tsx
import { useTranslations } from 'next-intl';
import type { Step } from '@/lib/steps';

export function MarginSteps({ steps }: { steps: Step[] }) {
  const t = useTranslations('steps');
  if (!steps.length) return null;
  return (
    <aside className="margin-steps" aria-label={t('section')}>
      <ol>
        {steps.map((s) => (
          <li key={s.id}>
            <span className="mono">{String(s.number).padStart(2, '0')}</span>
            <a href={`#${s.id}`}>{s.labelKey ? t(s.labelKey) : s.text}</a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
```

`components/TopBar.tsx` (search trigger is wired in Task 24):

```tsx
import { useTranslations } from 'next-intl';
import { LanguageSwitcher, type SwitcherItem } from './LanguageSwitcher';
import { ReadingModeToggle } from './ReadingModeToggle';
import { ThemeToggle } from './ThemeToggle';
import type { Locale } from '@/lib/content/types';

export function TopBar({
  locale,
  collectionId,
  collectionTitle,
  homeHref,
  switcher,
}: {
  locale: Locale;
  collectionId: string; // used by the search box (Task 24)
  collectionTitle: string;
  homeHref: string;
  switcher: SwitcherItem[];
}) {
  const t = useTranslations('nav');
  return (
    <header className="topbar">
      <a className="ui" href={homeHref}>
        {collectionTitle}
      </a>
      <div id="search-slot" aria-label={t('search')} />
      <LanguageSwitcher items={switcher} current={locale} />
      <ThemeToggle />
      <ReadingModeToggle />
    </header>
  );
}
```

`components/DocFooter.tsx`:

```tsx
import { useTranslations } from 'next-intl';
import type { NavDoc } from '@/lib/nav';

export function DocFooter({ prev, next }: { prev?: NavDoc; next?: NavDoc }) {
  const t = useTranslations('nav');
  return (
    <nav className="doc-footer ui" aria-label="Pagination">
      {prev ? (
        <a rel="prev" href={prev.href}>
          ← {t('previous')}: {prev.title}
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a rel="next" href={next.href}>
          {t('next')}: {next.title} →
        </a>
      ) : null}
    </nav>
  );
}
```

`components/MobileNav.tsx` (the spec's mobile drawer; plain `<details>`, no JavaScript):

```tsx
export function MobileNav({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="mobile-nav ui">
      <summary>{label}</summary>
      {children}
    </details>
  );
}
```

- [ ] **Step 5: Assemble the doc page**

Replace the whole file `app/[locale]/[collection]/[section]/[slug]/page.tsx`:

```tsx
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AnchorResolver } from '@/components/AnchorResolver';
import { Attribution } from '@/components/Attribution';
import { DocFooter } from '@/components/DocFooter';
import { DocHeader } from '@/components/DocHeader';
import type { SwitcherItem } from '@/components/LanguageSwitcher';
import { MarginSteps } from '@/components/MarginSteps';
import { MobileNav } from '@/components/MobileNav';
import { Sidebar } from '@/components/Sidebar';
import { Toc } from '@/components/Toc';
import { TopBar } from '@/components/TopBar';
import { routing } from '@/i18n/routing';
import { contentRoot, listCollections, listDocs, loadCollection, loadMeta } from '@/lib/content/collection';
import { availableLocales, resolveDoc, zhHashOf } from '@/lib/content/fallback';
import { headingsFor } from '@/lib/content/headings-index';
import { LOCALES, type Locale } from '@/lib/content/types';
import { buildNav, flatDocs } from '@/lib/nav';
import { computeNotices } from '@/lib/notices';
import { extractHeadings } from '@/lib/render/headings';
import { renderMarkdown } from '@/lib/render/pipeline';
import { docShape, stepsFor } from '@/lib/steps';
import { upstreamFileUrl } from '@/lib/upstream';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  const root = contentRoot();
  const out: { locale: string; collection: string; section: string; slug: string }[] = [];
  for (const collection of listCollections(root)) {
    for (const d of listDocs(loadCollection(root, collection))) {
      for (const locale of LOCALES) out.push({ locale, collection, section: d.section, slug: d.slug });
    }
  }
  return out;
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ locale: string; collection: string; section: string; slug: string }>;
}) {
  const { locale, collection, section, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const loc = locale as Locale;
  const root = contentRoot();
  const c = loadCollection(root, collection);
  const doc = resolveDoc(root, c, loc, section, slug);
  if (!doc) notFound();

  const { html, headings } = await renderMarkdown(doc.body, {
    collection,
    routeLocale: loc,
    currentHeadings: extractHeadings(doc.body),
    headingsOf: (cc, ss, sl) => headingsFor(root, loadCollection(root, cc), loc, ss, sl),
  });

  const names = await getTranslations('languages');
  const tn = await getTranslations('nav');
  const nav = buildNav(root, c, loc);
  const flat = flatDocs(nav);
  const at = flat.findIndex((d) => d.slug === slug);

  const zhHash = zhHashOf(root, c, section, slug);
  const zhDoc = resolveDoc(root, c, c.sourceLocale, section, slug)!;
  const zhHeadings = extractHeadings(zhDoc.body);
  const notices = computeNotices({
    requested: loc,
    served: doc.served,
    sourceLocale: c.sourceLocale,
    status: doc.frontmatter?.status,
    sourceHash: doc.frontmatter?.source.hash,
    zhHash,
  });
  const title =
    loadMeta(root, c.id, doc.served).docs[slug]?.title ??
    loadMeta(root, c.id, c.sourceLocale).docs[slug]?.title ??
    slug;

  const have = new Set(availableLocales(root, c, section, slug));
  const switcher: SwitcherItem[] = LOCALES.map((l) => ({
    locale: l,
    label: names(l),
    href: `/${l}/${collection}/${section}/${slug}`,
    status: !have.has(l)
      ? 'fallback'
      : l === c.sourceLocale || resolveDoc(root, c, l, section, slug)!.frontmatter?.status === 'reviewed'
        ? 'translated'
        : 'machine',
  }));

  return (
    <div className="shell">
      <div style={{ gridColumn: '1 / -1' }}>
        <TopBar locale={loc} collectionId={c.id} collectionTitle={c.id} homeHref={`/${loc}`} switcher={switcher} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <MobileNav label={tn('menu')}>
          <Sidebar nav={nav} currentSlug={slug} />
          <Toc headings={headings} />
        </MobileNav>
      </div>
      <Sidebar nav={nav} currentSlug={slug} />
      <div className="reader">
        <DocHeader
          catalogId={c.ids[slug]}
          title={title}
          notices={notices}
          requestedName={names(loc)}
          servedName={names(doc.served)}
          originalHref={upstreamFileUrl(c, slug)}
        />
        <article
          className="prose"
          lang={doc.served === 'zh' ? 'zh-Hans' : doc.served}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <DocFooter prev={flat[at - 1]} next={flat[at + 1]} />
        <Attribution
          kind={doc.served === 'zh' ? 'zh' : 'translated'}
          fileUrl={upstreamFileUrl(c, slug)}
          aboutHref={`/${loc}/about`}
        />
      </div>
      <div className="toc-rail">
        <Toc headings={headings} />
        <MarginSteps steps={stepsFor(headings, docShape(zhHeadings))} />
      </div>
      <AnchorResolver />
    </div>
  );
}
```

- [ ] **Step 6: Run to verify pass, build, commit**

Run: `pnpm vitest run tests/ui && pnpm typecheck && pnpm exec next build && pnpm exec tsx scripts/assert-static-build.ts`
Expected: PASS; assertion OK.

```bash
git add -A && ./scripts/commit.sh "feat: reading shell (header notices, nav, margin steps, footer attribution)"
```

---

## Task 17: Resume flag and set-aside

**Files:**
- Create: `lib/resume.ts`, `components/ResumeFlag.tsx`, `components/SetAside.tsx`
- Modify: `app/[locale]/[collection]/[section]/[slug]/page.tsx` (mount `ResumeFlag` and `SetAside`)
- Test: `tests/client/resume.test.ts`

**Interfaces:**
- Consumes: `currentHeadingIndex` (Task 14).
- Produces:

```ts
export interface FlagRecord { headingIndex: number; headingText: string; headingCount: number; zhHash: string; savedAt: number }
export function safeStorage(): Storage | null;
export function flagKey(collection: string, catalogId: string): string;     // 'flag:<collection>:<catalogId>'
export function saveFlag(store: Storage | null, key: string, rec: FlagRecord): boolean;
export function restoreFlag(
  store: Storage | null,
  key: string,
  current: { headings: { index: number; text: string }[]; zhHash: string },
): { index: number; changed: boolean } | null;
export function asideKey(collection: string): string;                        // 'aside:<collection>'
export function readAside(store: Storage | null, key: string): string[];
export function toggleAside(store: Storage | null, key: string, catalogId: string): string[]; // returns the new list
```

- [ ] **Step 1: Write the failing test**

`tests/client/resume.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  asideKey, flagKey, readAside, restoreFlag, safeStorage, saveFlag, toggleAside, type FlagRecord,
} from '@/lib/resume';

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}
class ThrowingStorage extends MemoryStorage {
  getItem(): string | null { throw new Error('blocked'); }
  setItem(): void { throw new Error('blocked'); }
}

const heads = (...texts: string[]) => texts.map((text, i) => ({ index: i + 1, text }));
const rec = (over: Partial<FlagRecord> = {}): FlagRecord => ({
  headingIndex: 3, headingText: 'Third', headingCount: 5, zhHash: 'h1', savedAt: 1, ...over,
});

describe('resume flag', () => {
  const key = flagKey('c', 'HC-03');

  it('restores the saved index when the zh hash is unchanged', () => {
    const s = new MemoryStorage();
    saveFlag(s, key, rec());
    expect(restoreFlag(s, key, { headings: heads('A', 'B', 'Third', 'D', 'E'), zhHash: 'h1' })).toEqual({
      index: 3,
      changed: false,
    });
  });

  it('after a heading is inserted before it, finds the same text at its new index', () => {
    const s = new MemoryStorage();
    saveFlag(s, key, rec());
    const r = restoreFlag(s, key, { headings: heads('New', 'A', 'B', 'Third', 'D', 'E'), zhHash: 'h2' });
    expect(r).toEqual({ index: 4, changed: true });
  });

  it('after the saved heading is removed, scales to the nearest existing heading, never 0', () => {
    const s = new MemoryStorage();
    saveFlag(s, key, rec({ headingIndex: 5, headingText: 'Gone', headingCount: 5 }));
    const r = restoreFlag(s, key, { headings: heads('A', 'B'), zhHash: 'h2' })!;
    expect(r.changed).toBe(true);
    expect(r.index).toBeGreaterThanOrEqual(1);
    expect(r.index).toBeLessThanOrEqual(2);
  });

  it('clamps an out-of-range index when the hash matches', () => {
    const s = new MemoryStorage();
    saveFlag(s, key, rec({ headingIndex: 99 }));
    expect(restoreFlag(s, key, { headings: heads('A', 'B'), zhHash: 'h1' })).toEqual({ index: 2, changed: false });
  });

  it('prefers the duplicate-text heading nearest the saved index', () => {
    const s = new MemoryStorage();
    saveFlag(s, key, rec({ headingIndex: 6, headingText: 'Same', headingCount: 6 }));
    const r = restoreFlag(s, key, { headings: heads('Same', 'x', 'y', 'Same', 'z', 'w'), zhHash: 'h2' });
    expect(r).toEqual({ index: 4, changed: true });
  });

  it('returns null with no record, corrupted json, or no headings', () => {
    const s = new MemoryStorage();
    expect(restoreFlag(s, key, { headings: heads('A'), zhHash: 'h1' })).toBeNull();
    s.setItem(key, '{not json');
    expect(restoreFlag(s, key, { headings: heads('A'), zhHash: 'h1' })).toBeNull();
    saveFlag(s, key, rec());
    expect(restoreFlag(s, key, { headings: [], zhHash: 'h1' })).toBeNull();
  });
});

describe('storage failures (Review Focus 4)', () => {
  it('never throws when storage is null or throws', () => {
    const t = new ThrowingStorage();
    expect(saveFlag(null, 'k', rec())).toBe(false);
    expect(saveFlag(t, 'k', rec())).toBe(false);
    expect(restoreFlag(t, 'k', { headings: heads('A'), zhHash: 'h' })).toBeNull();
    expect(readAside(t, 'k')).toEqual([]);
    expect(toggleAside(t, 'k', 'HC-01')).toEqual([]);
  });
  it('safeStorage returns null outside a browser', () => {
    expect(safeStorage()).toBeNull();
  });
});

describe('set aside', () => {
  it('toggles an id in and out, keeping order and uniqueness', () => {
    const s = new MemoryStorage();
    const k = asideKey('c');
    expect(toggleAside(s, k, 'HC-01')).toEqual(['HC-01']);
    expect(toggleAside(s, k, 'HC-02')).toEqual(['HC-01', 'HC-02']);
    expect(toggleAside(s, k, 'HC-01')).toEqual(['HC-02']);
    expect(readAside(s, k)).toEqual(['HC-02']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/client/resume.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`lib/resume.ts`:

```ts
export interface FlagRecord {
  headingIndex: number;
  headingText: string;
  headingCount: number;
  zhHash: string;
  savedAt: number;
}

export function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const s = window.localStorage;
    s.setItem('__probe', '1');
    s.removeItem('__probe');
    return s;
  } catch {
    return null;
  }
}

export const flagKey = (collection: string, catalogId: string) => `flag:${collection}:${catalogId}`;
export const asideKey = (collection: string) => `aside:${collection}`;

export function saveFlag(store: Storage | null, key: string, rec: FlagRecord): boolean {
  try {
    if (!store) return false;
    store.setItem(key, JSON.stringify(rec));
    return true;
  } catch {
    return false;
  }
}

const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

export function restoreFlag(
  store: Storage | null,
  key: string,
  current: { headings: { index: number; text: string }[]; zhHash: string },
): { index: number; changed: boolean } | null {
  let rec: FlagRecord;
  try {
    const raw = store?.getItem(key);
    if (!raw) return null;
    rec = JSON.parse(raw) as FlagRecord;
  } catch {
    return null;
  }
  const count = current.headings.length;
  if (!count || typeof rec.headingIndex !== 'number') return null;

  if (rec.zhHash === current.zhHash) {
    return { index: clamp(rec.headingIndex, 1, count), changed: false };
  }
  const same = current.headings.filter((h) => norm(h.text) === norm(rec.headingText));
  if (same.length) {
    const nearest = same.reduce((a, b) =>
      Math.abs(a.index - rec.headingIndex) <= Math.abs(b.index - rec.headingIndex) ? a : b,
    );
    return { index: nearest.index, changed: true };
  }
  const scaled = Math.round((rec.headingIndex * count) / Math.max(rec.headingCount || 1, 1));
  return { index: clamp(scaled, 1, count), changed: true };
}

export function readAside(store: Storage | null, key: string): string[] {
  try {
    const raw = store?.getItem(key);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleAside(store: Storage | null, key: string, catalogId: string): string[] {
  const list = readAside(store, key);
  const next = list.includes(catalogId) ? list.filter((x) => x !== catalogId) : [...list, catalogId];
  try {
    store?.setItem(key, JSON.stringify(next));
  } catch {
    return list;
  }
  return store ? next : [];
}
```

`components/ResumeFlag.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { currentHeadingIndex, findHeadingElement } from '@/lib/anchor';
import { flagKey, restoreFlag, safeStorage, saveFlag } from '@/lib/resume';

const MIN_DWELL_MS = 8000;

export function ResumeFlag({
  collection,
  catalogId,
  zhHash,
  headings,
}: {
  collection: string;
  catalogId: string;
  zhHash: string;
  headings: { index: number; text: string }[];
}) {
  const t = useTranslations('resume');
  const [note, setNote] = useState(false);
  const opened = useRef(Date.now());
  const key = flagKey(collection, catalogId);

  const save = () => {
    const idx = currentHeadingIndex(document);
    const h = headings.find((x) => x.index === idx);
    if (!idx || !h) return;
    saveFlag(safeStorage(), key, {
      headingIndex: idx,
      headingText: h.text,
      headingCount: headings.length,
      zhHash,
      savedAt: Date.now(),
    });
  };

  useEffect(() => {
    if (!window.location.hash) {
      const r = restoreFlag(safeStorage(), key, { headings, zhHash });
      if (r) {
        findHeadingElement(document, r.index)?.scrollIntoView();
        setNote(r.changed);
      }
    }
    const onHide = () => Date.now() - opened.current >= MIN_DWELL_MS && save();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      onHide();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="resume ui">
      <button type="button" onClick={save}>
        {t('mark')}
      </button>
      {note ? (
        <p role="note" className="notice">
          {t('updated')}
        </p>
      ) : null}
    </div>
  );
}
```

`components/SetAside.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { asideKey, readAside, safeStorage, toggleAside } from '@/lib/resume';

export function SetAside({ collection, catalogId }: { collection: string; catalogId: string }) {
  const t = useTranslations('resume');
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(readAside(safeStorage(), asideKey(collection)).includes(catalogId));
  }, [collection, catalogId]);
  return (
    <button
      type="button"
      className="ui"
      aria-pressed={on}
      onClick={() => setOn(toggleAside(safeStorage(), asideKey(collection), catalogId).includes(catalogId))}
    >
      {t('setAside')}
    </button>
  );
}
```

In the doc page (Task 16), render inside `.reader` after `DocHeader`:

```tsx
<ResumeFlag collection={collection} catalogId={c.ids[slug]} zhHash={zhHash} headings={headings.map((h) => ({ index: h.index, text: h.text }))} />
<SetAside collection={collection} catalogId={c.ids[slug]} />
```

(add the two imports.)

- [ ] **Step 4: Run to verify pass, then commit**

Run: `pnpm vitest run tests/client/resume.test.ts && pnpm typecheck`
Expected: PASS.

```bash
git add -A && ./scripts/commit.sh "feat: resume flag with edit-tolerant restore, set-aside list"
```

---

## Task 18: Shelf, collection and section pages, About, translation stats

**Files:**
- Create: `lib/stats.ts`, `app/[locale]/about/page.tsx`, `components/Shelf.tsx`
- Modify: `app/[locale]/page.tsx`, `app/[locale]/[collection]/page.tsx`, `app/[locale]/[collection]/[section]/page.tsx`
- Test: `tests/ui/stats.test.ts`, `tests/ui/shelf.test.tsx`

**Interfaces:**
- Consumes: `buildNav`, `flatDocs` (Task 16); `listCollections`, `loadCollection`, `listDocs`, `contentRoot`.
- Produces:

```ts
// lib/stats.ts
export interface CollectionStats { collection: string; total: number; perLocale: Record<Locale, number> } // docs with a real file in that locale
export function collectionStats(root: string, c: CollectionConfig): CollectionStats;
```

- [ ] **Step 1: Write the failing tests**

`tests/ui/stats.test.ts`:

```ts
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCollection } from '@/lib/content/collection';
import { collectionStats } from '@/lib/stats';

const root = path.resolve(__dirname, '../fixtures/content');

describe('collectionStats', () => {
  it('counts real files per locale, not fallbacks', () => {
    const s = collectionStats(root, loadCollection(root, 'demo'));
    expect(s).toEqual({ collection: 'demo', total: 3, perLocale: { en: 1, vi: 0, zh: 3 } });
  });
});
```

`tests/ui/shelf.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { Shelf } from '@/components/Shelf';
import en from '../../messages/en.json';

describe('Shelf', () => {
  it('renders one notebook per collection with per-locale counts and links', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <Shelf
          locale="en"
          items={[{ collection: 'advanced-java', title: 'advanced-java', tabColor: '#2f5bea', total: 81, perLocale: { en: 3, vi: 5, zh: 81 } }]}
        />
      </NextIntlClientProvider>,
    );
    const link = screen.getByRole('link', { name: /advanced-java/ });
    expect(link.getAttribute('href')).toBe('/en/advanced-java');
    expect(screen.getByText('3 / 81')).toBeTruthy();
    expect(screen.getByText('81 / 81')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/ui/stats.test.ts tests/ui/shelf.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`lib/stats.ts`:

```ts
import { existsSync } from 'node:fs';
import { docFile, listDocs } from './content/collection';
import { LOCALES, type CollectionConfig, type Locale } from './content/types';

export interface CollectionStats { collection: string; total: number; perLocale: Record<Locale, number> }

export function collectionStats(root: string, c: CollectionConfig): CollectionStats {
  const docs = listDocs(c);
  const perLocale = { en: 0, vi: 0, zh: 0 } as Record<Locale, number>;
  for (const l of LOCALES) {
    perLocale[l] = docs.filter((d) => existsSync(docFile(root, c.id, l, d.section, d.slug))).length;
  }
  return { collection: c.id, total: docs.length, perLocale };
}
```

`components/Shelf.tsx`:

```tsx
import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/content/types';

export interface ShelfItem {
  collection: string;
  title: string;
  tabColor: string;
  total: number;
  perLocale: Record<Locale, number>;
}

export function Shelf({ locale, items }: { locale: Locale; items: ShelfItem[] }) {
  const t = useTranslations();
  return (
    <main className="shelf">
      <h1>{t('site.title')}</h1>
      <p className="ui">{t('site.tagline')}</p>
      <ul className="spines">
        {items.map((it) => (
          <li key={it.collection} style={{ borderInlineStart: `6px solid ${it.tabColor}` }}>
            <a href={`/${locale}/${it.collection}`}>
              <span className="spine-title">{it.title}</span>
            </a>
            <dl className="ui">
              {(['en', 'vi', 'zh'] as Locale[]).map((l) => (
                <div key={l}>
                  <dt className="ui-cjk">{t(`languages.${l}`)}</dt>
                  <dd className="mono">{`${it.perLocale[l]} / ${it.total}`}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <p className="ui">
        <a href={`/${locale}/about`}>{t('attribution.aboutLink')}</a>
      </p>
    </main>
  );
}
```

`lib/switcher.ts` (language switcher items for index pages, where every locale exists):

```ts
import { LOCALES, type Locale } from './content/types';
import type { SwitcherItem } from '@/components/LanguageSwitcher';

export function indexSwitcher(pathAfterLocale: string, label: (l: Locale) => string): SwitcherItem[] {
  return LOCALES.map((l) => ({
    locale: l,
    label: label(l),
    status: 'translated' as const,
    href: `/${l}${pathAfterLocale}`,
  }));
}
```

`app/[locale]/page.tsx`:

```tsx
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Shelf, type ShelfItem } from '@/components/Shelf';
import { routing } from '@/i18n/routing';
import { contentRoot, listCollections, loadCollection } from '@/lib/content/collection';
import type { Locale } from '@/lib/content/types';
import { collectionStats } from '@/lib/stats';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ShelfPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const root = contentRoot();
  const items: ShelfItem[] = listCollections(root).map((id) => {
    const c = loadCollection(root, id);
    const s = collectionStats(root, c);
    return { collection: id, title: id, tabColor: c.tabColor, total: s.total, perLocale: s.perLocale };
  });
  return <Shelf locale={locale as Locale} items={items} />;
}
```

`app/[locale]/[collection]/page.tsx` (keep `dynamicParams`, `revalidate` and `generateStaticParams` from Task 13; replace the default export and add imports):

```tsx
import { getTranslations } from 'next-intl/server';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { indexSwitcher } from '@/lib/switcher';
import { buildNav } from '@/lib/nav';
import type { Locale } from '@/lib/content/types';

export default async function CollectionPage({ params }: { params: Promise<{ locale: string; collection: string }> }) {
  const { locale, collection } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const loc = locale as Locale;
  const root = contentRoot();
  const c = loadCollection(root, collection);
  const names = await getTranslations('languages');
  const nav = buildNav(root, c, loc);
  return (
    <div className="shell">
      <div style={{ gridColumn: '1 / -1' }}>
        <TopBar
          locale={loc}
          collectionId={c.id}
          collectionTitle={c.id}
          homeHref={`/${loc}`}
          switcher={indexSwitcher(`/${collection}`, (l) => names(l))}
        />
      </div>
      <Sidebar nav={nav} currentSlug="" />
      <div className="reader">
        <div className="prose">
          <h1>{c.id}</h1>
          <ul>
            {nav.map((s) => (
              <li key={s.id}>
                <a href={`/${loc}/${collection}/${s.id}`}>{s.title}</a>{' '}
                <span className="mono">{s.groups.reduce((n, g) => n + g.docs.length, 0)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="toc-rail" />
    </div>
  );
}
```

`app/[locale]/[collection]/[section]/page.tsx` (keep the Task 13 exports; replace the default export, add the same imports):

```tsx
export default async function SectionPage({
  params,
}: {
  params: Promise<{ locale: string; collection: string; section: string }>;
}) {
  const { locale, collection, section } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const loc = locale as Locale;
  const root = contentRoot();
  const c = loadCollection(root, collection);
  const names = await getTranslations('languages');
  const nav = buildNav(root, c, loc);
  const sec = nav.find((s) => s.id === section);
  if (!sec) notFound();
  return (
    <div className="shell">
      <div style={{ gridColumn: '1 / -1' }}>
        <TopBar
          locale={loc}
          collectionId={c.id}
          collectionTitle={c.id}
          homeHref={`/${loc}`}
          switcher={indexSwitcher(`/${collection}/${section}`, (l) => names(l))}
        />
      </div>
      <Sidebar nav={nav} currentSlug="" />
      <div className="reader">
        <div className="prose">
          <h1>{sec.title}</h1>
          {sec.groups.map((g) => (
            <section key={g.id}>
              <h2>{g.title}</h2>
              <ul>
                {g.docs.map((d) => (
                  <li key={d.slug}>
                    <a href={d.href} data-status={d.status}>
                      <span className="doc-id mono">{d.catalogId}</span> {d.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <div className="toc-rail" />
    </div>
  );
}
```

`app/[locale]/about/page.tsx`:

```tsx
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { contentRoot, listCollections, loadCollection } from '@/lib/content/collection';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function About({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const a = await getTranslations('attribution');
  const root = contentRoot();
  const upstream = listCollections(root).map((id) => loadCollection(root, id).upstream);
  return (
    <main className="reader">
      <article className="prose">
        <h1>{t('title')}</h1>
        <p>{t('codeLicense')} <a href="https://opensource.org/license/mit">MIT</a></p>
        <p>
          {t('contentLicense')}{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC-BY-SA-4.0</a>
        </p>
        <p>{a('credit')}. <a href="https://github.com/doocs/advanced-java">doocs/advanced-java</a></p>
        <p>{a('changesZh')} {a('changesTranslated')}</p>
        <h2>{t('imageCredits')}</h2>
        <p>{t('images')}</p>
        <ul>
          {upstream.map((u) => (
            <li key={u.commit}>
              <a href={`${u.repo}/tree/${u.commit}`}>{u.repo}</a> @ {u.commit}
            </li>
          ))}
        </ul>
      </article>
    </main>
  );
}
```

Finalize `README.md` (already states the split in Task 1): add a "Development" section listing `pnpm test`, `pnpm build`, `pnpm e2e`, `pnpm check:translations`.

- [ ] **Step 4: Run to verify pass, build, commit**

Run: `pnpm vitest run tests/ui && pnpm typecheck && pnpm exec next build && pnpm exec tsx scripts/assert-static-build.ts`
Expected: PASS; assertion OK.

```bash
git add -A && ./scripts/commit.sh "feat: notebook shelf, collection/section pages, about and license page"
```

## Task 19: SEO: canonical, hreflang, sitemap (spec 6.5)

**Files:**
- Create: `lib/seo.ts`, `app/sitemap.ts`
- Modify: `app/[locale]/[collection]/[section]/[slug]/page.tsx` (add `generateMetadata`), `app/[locale]/layout.tsx` (add `metadataBase`)
- Test: `tests/ui/seo.test.ts`

**Interfaces:**
- Consumes: `availableLocales`, `chainFor`, `resolveDoc` (Task 11); `listCollections`, `loadCollection`, `listDocs` (Tasks 2, 13).
- Produces:

```ts
export const HREFLANG: Record<Locale, string>; // en:'en', vi:'vi', zh:'zh-Hans'
export interface DocAlternates { canonical: string; languages: Record<string, string> } // paths, hreflang keys incl. 'x-default'
export function docAlternates(root: string, c: CollectionConfig, requested: Locale, section: string, slug: string): DocAlternates;
export interface SitemapEntry { path: string; alternates: Record<string, string> }
export function sitemapEntries(root: string): SitemapEntry[]; // real translations only
export function siteUrl(): string;                            // NEXT_PUBLIC_SITE_URL ?? https://$VERCEL_PROJECT_PRODUCTION_URL ?? http://localhost:3000
```

- [ ] **Step 1: Write the failing test**

`tests/ui/seo.test.ts`:

```ts
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCollection } from '@/lib/content/collection';
import { docAlternates, sitemapEntries } from '@/lib/seo';

const root = path.resolve(__dirname, '../fixtures/content');
const c = loadCollection(root, 'demo');

describe('docAlternates', () => {
  it('real translation: canonical is itself; hreflang only for real translations', () => {
    const a = docAlternates(root, c, 'en', 'alpha', 'intro');
    expect(a.canonical).toBe('/en/demo/alpha/intro');
    expect(a.languages).toEqual({
      en: '/en/demo/alpha/intro',
      'zh-Hans': '/zh/demo/alpha/intro',
      'x-default': '/en/demo/alpha/intro',
    });
  });
  it('fallback page: canonical points at the real-language page, vi is not an alternate', () => {
    const a = docAlternates(root, c, 'vi', 'alpha', 'intro');
    expect(a.canonical).toBe('/en/demo/alpha/intro');
    expect(a.languages.vi).toBeUndefined();
  });
  it('zh-only doc requested in en: canonical is the zh page', () => {
    const a = docAlternates(root, c, 'en', 'alpha', 'second');
    expect(a.canonical).toBe('/zh/demo/alpha/second');
    expect(a.languages).toEqual({ 'zh-Hans': '/zh/demo/alpha/second', 'x-default': '/zh/demo/alpha/second' });
  });
});

describe('sitemapEntries', () => {
  it('lists real translations only, never fallback pages', () => {
    const paths = sitemapEntries(root).map((e) => e.path).sort();
    expect(paths).toEqual([
      '/en/demo/alpha/intro',
      '/zh/demo/alpha/intro',
      '/zh/demo/alpha/second',
      '/zh/demo/alpha/third',
    ]);
  });
  it('carries alternates among real translations only', () => {
    const e = sitemapEntries(root).find((x) => x.path === '/en/demo/alpha/intro')!;
    expect(Object.keys(e.alternates).sort()).toEqual(['en', 'zh-Hans']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/ui/seo.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`lib/seo.ts`:

```ts
import { listCollections, listDocs, loadCollection } from './content/collection';
import { availableLocales, chainFor } from './content/fallback';
import type { CollectionConfig, Locale } from './content/types';

export const HREFLANG: Record<Locale, string> = { en: 'en', vi: 'vi', zh: 'zh-Hans' };

export interface DocAlternates { canonical: string; languages: Record<string, string> }

export function docAlternates(
  root: string,
  c: CollectionConfig,
  requested: Locale,
  section: string,
  slug: string,
): DocAlternates {
  const have = availableLocales(root, c, section, slug);
  const path = (l: Locale) => `/${l}/${c.id}/${section}/${slug}`;
  const served = chainFor(c, requested).find((l) => have.includes(l)) ?? c.sourceLocale;
  const languages: Record<string, string> = {};
  for (const l of have) languages[HREFLANG[l]] = path(l);
  const def = have.includes('en') ? 'en' : c.sourceLocale;
  languages['x-default'] = path(def as Locale);
  return { canonical: path(served), languages };
}

export interface SitemapEntry { path: string; alternates: Record<string, string> }

export function sitemapEntries(root: string): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  for (const id of listCollections(root)) {
    const c = loadCollection(root, id);
    for (const d of listDocs(c)) {
      const have = availableLocales(root, c, d.section, d.slug);
      const alternates: Record<string, string> = {};
      for (const l of have) alternates[HREFLANG[l]] = `/${l}/${id}/${d.section}/${d.slug}`;
      for (const l of have) out.push({ path: `/${l}/${id}/${d.section}/${d.slug}`, alternates });
    }
  }
  return out;
}

export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'http://localhost:3000';
}
```

`app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next';
import { contentRoot } from '@/lib/content/collection';
import { sitemapEntries, siteUrl } from '@/lib/seo';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return sitemapEntries(contentRoot()).map((e) => ({
    url: base + e.path,
    alternates: { languages: Object.fromEntries(Object.entries(e.alternates).map(([k, v]) => [k, base + v])) },
  }));
}
```

In `app/[locale]/layout.tsx` add `export const metadata = { metadataBase: new URL(siteUrl()) };` (import `siteUrl` from `@/lib/seo`).

In the doc page add:

```tsx
import type { Metadata } from 'next';
import { docAlternates } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; collection: string; section: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, collection, section, slug } = await params;
  const root = contentRoot();
  const c = loadCollection(root, collection);
  const alt = docAlternates(root, c, locale as Locale, section, slug);
  const doc = resolveDoc(root, c, locale as Locale, section, slug);
  const title =
    loadMeta(root, c.id, doc?.served ?? c.sourceLocale).docs[slug]?.title ??
    loadMeta(root, c.id, c.sourceLocale).docs[slug]?.title ??
    slug;
  return { title, alternates: { canonical: alt.canonical, languages: alt.languages } };
}
```

- [ ] **Step 4: Run to verify pass, build, assert, commit**

Run: `pnpm vitest run tests/ui/seo.test.ts && pnpm typecheck && pnpm exec next build && pnpm exec tsx scripts/assert-static-build.ts`
Expected: PASS; `sitemap.xml` is prerendered (check `.next/server/app/sitemap.xml.body` exists).

```bash
git add -A && ./scripts/commit.sh "feat: canonical, hreflang and real-translation-only sitemap"
```

---

## Task 20: `check:translations` gates (spec 4.8)

**Files:**
- Create: `lib/check/comments.ts`, `lib/check/compare.ts`, `scripts/check-translations.ts`
- Test: `tests/check/comments.test.ts`, `tests/check/compare.test.ts`, `tests/check/collection-check.test.ts`

**Interfaces:**
- Consumes: `canonicalHash` (Task 3); `disallowedHtml` (Task 7); `loadCollection`, `listDocs`, `docFile` (Task 2); `DocFrontmatter` (Task 2).
- Produces:

```ts
// lib/check/comments.ts
export type CommentFamily = 'c' | 'hash' | 'xml' | 'sql' | 'json' | 'none';
export function commentFamily(lang: string | null | undefined): CommentFamily;
export function stripComments(code: string, family: CommentFamily): string;
// lib/check/compare.ts
export interface Issue { level: 'error' | 'warn'; code: string; message: string }
export function compareTranslation(zhMd: string, trMd: string, opts?: { exceptions?: string[] }): Issue[];
export interface CheckReport { checked: number; errors: string[]; warnings: string[]; stale: string[] }
export function checkCollection(root: string, id: string): CheckReport;
export function restampTranslation(root: string, id: string, locale: Locale, slug: string): void;
```

Issue codes: `heading-structure`, `code-block-count`, `code-block-lang`, `code-block:<i>`, `code-block-lines:<i>`, `inline-code`, `link-targets`, `raw-html`, `cjk-residue` (errors); `length-ratio` (warn).

- [ ] **Step 1: Write the failing tests**

`tests/check/comments.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { commentFamily, stripComments } from '@/lib/check/comments';

describe('commentFamily', () => {
  it('maps languages to comment syntaxes', () => {
    expect(commentFamily('java')).toBe('c');
    expect(commentFamily('yaml')).toBe('hash');
    expect(commentFamily('xml')).toBe('xml');
    expect(commentFamily('sql')).toBe('sql');
    expect(commentFamily('json')).toBe('json');
    expect(commentFamily('diff')).toBe('none');
    expect(commentFamily(undefined)).toBe('none');
  });
});

describe('stripComments', () => {
  it('strips c-style line and block comments', () => {
    const code = 'int a = 1; // 初始化\n/* 多行\n注释 */\nint b = 2;';
    expect(stripComments(code, 'c').replace(/\s+/g, ' ').trim()).toBe('int a = 1; int b = 2;');
  });
  it('strips hash, xml and sql comments', () => {
    expect(stripComments('a: 1 # 注释', 'hash').trim()).toBe('a: 1');
    expect(stripComments('<a><!-- 注释 --></a>', 'xml')).toBe('<a></a>');
    expect(stripComments('select 1 -- 注释', 'sql').trim()).toBe('select 1');
  });
  it('leaves json and none untouched', () => {
    expect(stripComments('{"a": "//x"}', 'json')).toBe('{"a": "//x"}');
    expect(stripComments('# not a comment here', 'none')).toBe('# not a comment here');
  });
});
```

`tests/check/compare.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { compareTranslation } from '@/lib/check/compare';

const F = '```';
const zh = [
  '# 为什么使用消息队列？',
  '',
  '## 面试题',
  '',
  '使用 `Kafka` 和 `RabbitMQ`，参见 [另一篇](doc:c/s/other) 和 ![图](asset:s/why/d.png)。',
  '',
  F + 'java',
  'int a = 1; // 初始化',
  F,
  '',
  F,
  '┌──中文──┐',
  '│ 队列 │',
  F,
  '',
].join('\n');

const good = [
  '# Why use a message queue?',
  '',
  '## Interview question',
  '',
  'Use `Kafka` and `RabbitMQ`, see [another](doc:c/s/other) and ![diagram](asset:s/why/d.png).',
  '',
  F + 'java',
  'int a = 1; // initialize',
  F,
  '',
  F,
  '┌─ENG─┐',
  '│ queue │',
  F,
  '',
].join('\n');

const codes = (i: { code: string }[]) => i.map((x) => x.code);

describe('compareTranslation', () => {
  it('passes a faithful translation (translated code comment and diagram text allowed)', () => {
    expect(compareTranslation(zh, good).filter((i) => i.level === 'error')).toEqual([]);
  });
  it('fails when heading structure differs', () => {
    const bad = good.replace('## Interview question', '### Interview question');
    expect(codes(compareTranslation(zh, bad))).toContain('heading-structure');
  });
  it('fails when code (not a comment) changes', () => {
    const bad = good.replace('int a = 1;', 'int a = 2;');
    expect(codes(compareTranslation(zh, bad))).toContain('code-block:0');
  });
  it('fails when a code block language tag changes or a block is dropped', () => {
    expect(codes(compareTranslation(zh, good.replace(F + 'java', F + 'kotlin')))).toContain('code-block-lang');
    expect(codes(compareTranslation(zh, good.replace(/\n```\n┌─ENG─┐[\s\S]*$/, '\n')))).toContain('code-block-count');
  });
  it('fails when a text diagram changes its line count', () => {
    const bad = good.replace('│ queue │\n', '');
    expect(codes(compareTranslation(zh, bad))).toContain('code-block-lines:1');
  });
  it('fails when an inline code span is altered', () => {
    expect(codes(compareTranslation(zh, good.replace('`Kafka`', '`kafka`')))).toContain('inline-code');
  });
  it('fails when a link or asset target is altered', () => {
    expect(codes(compareTranslation(zh, good.replace('doc:c/s/other', 'doc:c/s/else')))).toContain('link-targets');
    expect(codes(compareTranslation(zh, good.replace('asset:s/why/d.png', 'asset:s/why/e.png')))).toContain('link-targets');
  });
  it('fails on residual Han text outside code', () => {
    const bad = good.replace('Use `Kafka`', '请使用这个消息队列系统来解耦。Use `Kafka`');
    expect(codes(compareTranslation(zh, bad))).toContain('cjk-residue');
  });
  it('fails on raw html that is not allowed (a valid-looking tag would vanish at render)', () => {
    const bad = good.replace('Use `Kafka`', 'Use <T> and `Kafka`');
    expect(codes(compareTranslation(zh, bad))).toContain('raw-html');
  });
  it('honours reviewed exceptions by issue code', () => {
    const bad = good.replace('`Kafka`', '`kafka`');
    const r = compareTranslation(zh, bad, { exceptions: ['inline-code'] });
    expect(codes(r)).not.toContain('inline-code');
  });
});
```

`tests/check/collection-check.test.ts`:

```ts
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkCollection, restampTranslation } from '@/lib/check/compare';
import { canonicalHash } from '@/lib/content/hash';

function build(frontmatter: string, viBody = '# Tiêu đề\n\n## Phần\n\nNội dung.\n') {
  const root = mkdtempSync(path.join(os.tmpdir(), 'chk-'));
  const w = (rel: string, data: string) => {
    const f = path.join(root, rel);
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(f, data);
  };
  w('c/collection.json', JSON.stringify({
    id: 'c', sourceLocale: 'zh', tabColor: '#000000',
    fallback: { vi: ['en', 'zh'], en: ['zh'], zh: ['zh'] },
    sections: [{ id: 's', prefix: 'S', groups: [{ id: 'g', docs: ['a'] }] }],
    ids: { a: 'S-01' }, upstream: { repo: 'r', commit: 'c' }, upstreamFiles: { a: 'docs/s/a.md' },
  }));
  const zh = '# 标题\n\n## 章节\n\n内容。\n';
  w('c/zh/s/a.md', zh);
  w('c/vi/s/a.md', frontmatter + viBody);
  return { root, zh };
}

describe('checkCollection', () => {
  it('passes a valid machine translation made directly from zh', () => {
    const { root, zh } = build(
      `---\nsource:\n  locale: zh\n  slug: a\n  hash: ${canonicalHash(zh)}\nstatus: machine\ntranslatedAt: 2026-10-13\n---\n\n`,
    );
    const r = checkCollection(root, 'c');
    expect(r.errors).toEqual([]);
    expect(r.stale).toEqual([]);
    expect(r.checked).toBe(1);
  });
  it('errors when a translation was not made directly from zh', () => {
    const { root } = build('---\nsource:\n  locale: en\n  slug: a\n  hash: x\nstatus: machine\ntranslatedAt: 2026-10-13\n---\n\n');
    expect(checkCollection(root, 'c').errors.join('\n')).toMatch(/directly from zh/);
  });
  it('errors on an invalid status value', () => {
    const { root, zh } = build(
      `---\nsource:\n  locale: zh\n  slug: a\n  hash: ${canonicalHash(zh)}\nstatus: approved\ntranslatedAt: 2026-10-13\n---\n\n`,
    );
    expect(checkCollection(root, 'c').errors.join('\n')).toMatch(/status/);
  });
  it('lists a stale translation as stale (warning), not an error', () => {
    const { root } = build('---\nsource:\n  locale: zh\n  slug: a\n  hash: sha256:v1:old\nstatus: machine\ntranslatedAt: 2026-10-13\n---\n\n');
    const r = checkCollection(root, 'c');
    expect(r.errors).toEqual([]);
    expect(r.stale).toEqual(['vi/s/a']);
  });
  it('restamp updates source.hash to the current zh hash', () => {
    const { root, zh } = build('---\nsource:\n  locale: zh\n  slug: a\n  hash: sha256:v1:old\nstatus: machine\ntranslatedAt: 2026-10-13\n---\n\n');
    restampTranslation(root, 'c', 'vi', 'a');
    expect(readFileSync(path.join(root, 'c/vi/s/a.md'), 'utf8')).toContain(canonicalHash(zh));
    expect(checkCollection(root, 'c').stale).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/check`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `lib/check/comments.ts`**

```ts
export type CommentFamily = 'c' | 'hash' | 'xml' | 'sql' | 'json' | 'none';

const FAMILY: Record<string, CommentFamily> = {
  java: 'c', javascript: 'c', js: 'c', typescript: 'c', ts: 'c', go: 'c', c: 'c', cpp: 'c', 'c++': 'c',
  scala: 'c', kotlin: 'c', groovy: 'c', rust: 'c', proto: 'c',
  python: 'hash', py: 'hash', shell: 'hash', bash: 'hash', sh: 'hash', yaml: 'hash', yml: 'hash',
  properties: 'hash', conf: 'hash', ruby: 'hash', dockerfile: 'hash',
  xml: 'xml', html: 'xml', sql: 'sql', json: 'json',
};

export function commentFamily(lang: string | null | undefined): CommentFamily {
  return FAMILY[(lang ?? '').toLowerCase()] ?? 'none';
}

export function stripComments(code: string, family: CommentFamily): string {
  switch (family) {
    case 'c':
      return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    case 'sql':
      return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
    case 'hash':
      return code.replace(/#.*$/gm, '');
    case 'xml':
      return code.replace(/<!--[\s\S]*?-->/g, '');
    default:
      return code;
  }
}
```

- [ ] **Step 4: Implement `lib/check/compare.ts`**

```ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { disallowedHtml } from '../../scripts/import/html-guard';
import { docFile, listDocs, loadCollection } from '../content/collection';
import { canonicalHash } from '../content/hash';
import type { DocFrontmatter, Locale } from '../content/types';
import { commentFamily, stripComments } from './comments';

export interface Issue { level: 'error' | 'warn'; code: string; message: string }

interface Facts {
  headings: number[];
  blocks: { lang: string; value: string }[];
  inline: string[];
  targets: string[];
  prose: string;
}

function facts(md: string): Facts {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(md);
  const f: Facts = { headings: [], blocks: [], inline: [], targets: [], prose: '' };
  const prose: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visit(tree, (node: any) => {
    switch (node.type) {
      case 'heading':
        f.headings.push(node.depth);
        break;
      case 'code':
        f.blocks.push({ lang: String(node.lang ?? '').toLowerCase(), value: node.value });
        break;
      case 'inlineCode':
        f.inline.push(node.value);
        break;
      case 'link':
      case 'image':
      case 'definition':
        f.targets.push(node.url);
        break;
      case 'text':
        prose.push(node.value);
        break;
    }
  });
  f.prose = prose.join(' ');
  return f;
}

function diffMultiset(a: string[], b: string[]): string[] {
  const count = new Map<string, number>();
  for (const x of a) count.set(x, (count.get(x) ?? 0) + 1);
  for (const x of b) count.set(x, (count.get(x) ?? 0) - 1);
  return [...count.entries()].filter(([, n]) => n !== 0).map(([k, n]) => `${n > 0 ? '-' : '+'}${k}`);
}

const normBlock = (s: string) =>
  s
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.trim() !== '')
    .join('\n');

export function compareTranslation(zhMd: string, trMd: string, opts: { exceptions?: string[] } = {}): Issue[] {
  const out: Issue[] = [];
  const err = (code: string, message: string) => out.push({ level: 'error', code, message });
  let zh: Facts;
  let tr: Facts;
  try {
    zh = facts(zhMd);
    tr = facts(trMd);
  } catch (e) {
    return [{ level: 'error', code: 'parse', message: (e as Error).message }];
  }

  if (zh.headings.join(',') !== tr.headings.join(',')) {
    err('heading-structure', `heading levels differ: zh [${zh.headings.join(',')}] vs translation [${tr.headings.join(',')}]`);
  }

  if (zh.blocks.length !== tr.blocks.length) {
    err('code-block-count', `fenced blocks: zh ${zh.blocks.length} vs translation ${tr.blocks.length}`);
  } else {
    zh.blocks.forEach((a, i) => {
      const b = tr.blocks[i];
      if (a.lang !== b.lang) return err('code-block-lang', `block ${i}: lang "${a.lang}" vs "${b.lang}"`);
      const textual = a.lang === '' || a.lang === 'text' || a.lang === 'txt';
      if (textual) {
        const la = normBlock(a.value).split('\n').length;
        const lb = normBlock(b.value).split('\n').length;
        if (la !== lb) err(`code-block-lines:${i}`, `text block ${i}: ${la} lines vs ${lb}`);
      } else {
        const fam = commentFamily(a.lang);
        if (normBlock(stripComments(a.value, fam)) !== normBlock(stripComments(b.value, fam))) {
          err(`code-block:${i}`, `code block ${i} (${a.lang}) differs outside comments`);
        }
      }
    });
  }

  const inline = diffMultiset(zh.inline, tr.inline);
  if (inline.length) err('inline-code', `inline code differs: ${inline.slice(0, 5).join(' | ')}`);

  const targets = diffMultiset(zh.targets, tr.targets);
  if (targets.length) err('link-targets', `link/asset targets differ: ${targets.slice(0, 5).join(' | ')}`);

  for (const h of disallowedHtml(trMd)) err('raw-html', `line ${h.line}: raw HTML <${h.tag}> is not allowed`);

  const han = (tr.prose.match(/\p{Script=Han}/gu) ?? []).length;
  const letters = (tr.prose.match(/[\p{L}\p{N}]/gu) ?? []).length || 1;
  if (han > 5 && han / letters > 0.02) err('cjk-residue', `${han} Han characters remain in prose outside code`);

  if (zhMd.length > 50) {
    const ratio = trMd.length / zhMd.length;
    if (ratio < 0.8 || ratio > 8) {
      out.push({ level: 'warn', code: 'length-ratio', message: `length ratio ${ratio.toFixed(2)} outside [0.8, 8]` });
    }
  }

  const skip = new Set(opts.exceptions ?? []);
  return out.filter((i) => !skip.has(i.code));
}

export interface CheckReport { checked: number; errors: string[]; warnings: string[]; stale: string[] }

export function checkCollection(root: string, id: string): CheckReport {
  const c = loadCollection(root, id);
  const report: CheckReport = { checked: 0, errors: [], warnings: [], stale: [] };
  const exFile = path.join(root, id, 'translation-exceptions.json');
  const exceptions: Record<string, string[]> = existsSync(exFile) ? JSON.parse(readFileSync(exFile, 'utf8')) : {};

  for (const d of listDocs(c)) {
    const zhFile = docFile(root, id, c.sourceLocale, d.section, d.slug);
    if (!existsSync(zhFile)) {
      report.errors.push(`${c.sourceLocale}/${d.section}/${d.slug}: source file missing`);
      continue;
    }
    const zhBody = matter(readFileSync(zhFile, 'utf8')).content;
    const zhHash = canonicalHash(zhBody);

    for (const locale of (['en', 'vi'] as Locale[]).filter((l) => l !== c.sourceLocale)) {
      const file = docFile(root, id, locale, d.section, d.slug);
      if (!existsSync(file)) continue;
      const tag = `${locale}/${d.section}/${d.slug}`;
      report.checked += 1;
      const parsed = matter(readFileSync(file, 'utf8'));
      const fm = parsed.data as Partial<DocFrontmatter>;

      if (!fm.source || !fm.source.hash) report.errors.push(`${tag}: missing source frontmatter`);
      else {
        if (fm.source.locale !== c.sourceLocale)
          report.errors.push(`${tag}: must be translated directly from ${c.sourceLocale} (source.locale is "${fm.source.locale}")`);
        if (fm.source.slug !== d.slug) report.errors.push(`${tag}: source.slug "${fm.source.slug}" does not match`);
        if (fm.source.hash !== zhHash) report.stale.push(tag);
      }
      if (fm.status !== 'machine' && fm.status !== 'reviewed') {
        report.errors.push(`${tag}: status must be "machine" or "reviewed" (got "${String(fm.status)}")`);
      }

      const issues = compareTranslation(zhBody, parsed.content, { exceptions: exceptions[tag] });
      for (const i of issues) (i.level === 'error' ? report.errors : report.warnings).push(`${tag}: [${i.code}] ${i.message}`);
    }
  }
  return report;
}

export function restampTranslation(root: string, id: string, locale: Locale, slug: string): void {
  const c = loadCollection(root, id);
  const d = listDocs(c).find((x) => x.slug === slug);
  if (!d) throw new Error(`unknown slug ${slug}`);
  const zhBody = matter(readFileSync(docFile(root, id, c.sourceLocale, d.section, slug), 'utf8')).content;
  const file = docFile(root, id, locale, d.section, slug);
  const parsed = matter(readFileSync(file, 'utf8'));
  parsed.data.source = { ...(parsed.data.source ?? {}), hash: canonicalHash(zhBody) };
  writeFileSync(file, matter.stringify(parsed.content, parsed.data));
}
```

`scripts/check-translations.ts`:

```ts
import path from 'node:path';
import { contentRoot, listCollections } from '../lib/content/collection';
import type { Locale } from '../lib/content/types';
import { checkCollection, restampTranslation } from '../lib/check/compare';

if (path.basename(process.argv[1] ?? '') === 'check-translations.ts') {
  const root = contentRoot();
  const args = process.argv.slice(2);
  const restamp = args.indexOf('--restamp');
  if (restamp !== -1) {
    const [collection, locale, slug] = args[restamp + 1].split('/') as [string, Locale, string];
    restampTranslation(root, collection, locale, slug);
    console.log(`restamped ${collection}/${locale}/${slug}`);
    process.exit(0);
  }
  let failed = false;
  for (const id of listCollections(root)) {
    const r = checkCollection(root, id);
    console.log(`${id}: checked ${r.checked} translation(s); ${r.errors.length} error(s), ${r.warnings.length} warning(s), ${r.stale.length} stale`);
    for (const e of r.errors) console.error('  ERROR ' + e);
    for (const w of r.warnings) console.warn('  warn  ' + w);
    for (const s of r.stale) console.warn('  stale ' + s);
    if (r.errors.length) failed = true;
  }
  process.exit(failed ? 1 : 0);
}
```

Usage: `pnpm check:translations` or `pnpm check:translations --restamp advanced-java/vi/why-mq`.

- [ ] **Step 5: Run to verify pass, commit**

Run: `pnpm vitest run tests/check && pnpm typecheck && pnpm check:translations`
Expected: tests PASS; `advanced-java: checked 0 translation(s); 0 error(s)…` and exit 0.

```bash
git add -A && ./scripts/commit.sh "feat: check:translations gates (structure, code, links, CJK residue, staleness)"
```

---

## Task 21: Translation tooling: glossary, prompt builder, stamp, meta tier, cost projection

**Files:**
- Create: `scripts/translate/prompt.ts`, `scripts/translate/stamp.ts`, `scripts/translate/meta.ts`, `scripts/translate/cost.ts`, `scripts/translate/batches.ts`, `scripts/translate/cli.ts`, `content/advanced-java/glossary.en.json`, `content/advanced-java/glossary.vi.json`, `content/advanced-java/translation-exceptions.json`
- Test: `tests/translate/prompt.test.ts`, `tests/translate/stamp.test.ts`, `tests/translate/meta.test.ts`, `tests/translate/cost.test.ts`, `tests/translate/batches.test.ts`

**Interfaces:**
- Consumes: `compareTranslation` (Task 20); `canonicalHash` (Task 3); `resolveDoc` (Task 11); `listDocs`, `loadMeta`, `docFile`, `loadCollection` (Task 2).
- Produces:

```ts
export type Glossary = Record<string, string>;
// prompt.ts
export function buildPrompt(i: { locale: 'en' | 'vi'; slug: string; zhBody: string; glossary: Glossary; keep: string[] }): string;
// stamp.ts
export function stampTranslation(i: {
  root: string; collection: string; locale: 'en' | 'vi'; section: string; slug: string;
  translatedBody: string; today: string;
}): { written: boolean; file: string; issues: Issue[] };       // writes only when there are no error issues; always status 'machine'
// meta.ts
export function buildMetaPrompt(i: { locale: 'en' | 'vi'; zhMeta: LocaleMeta; glossary: Glossary }): string;
export function applyMeta(i: { root: string; collection: string; locale: 'en' | 'vi'; translated: unknown }): { file: string };
// cost.ts
export function projectCost(i: {
  pilot: { slug: string; zhChars: number; outputTokens: number }[]; // per locale pooled
  remainingZhChars: number;
}): { tokensPerZhChar: number; projectedOutputTokens: number };
// batches.ts
export function pendingBatches(root: string, collection: string, locale: 'en' | 'vi', size: number): { section: string; slugs: string[] }[];
```

- [ ] **Step 1: Write the failing tests**

`tests/translate/prompt.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildPrompt } from '@/scripts/translate/prompt';

describe('buildPrompt', () => {
  const p = buildPrompt({
    locale: 'vi',
    slug: 'why-mq',
    zhBody: '# 为什么使用消息队列？\n\n正文。\n',
    glossary: { 消息队列: 'hàng đợi tin nhắn', 幂等性: 'tính idempotent' },
    keep: ['Kafka', 'RabbitMQ'],
  });
  it('states the target language and that the source is Chinese', () => {
    expect(p).toContain('Vietnamese');
    expect(p).toContain('Chinese');
  });
  it('lists glossary entries and names to keep', () => {
    expect(p).toContain('消息队列 → hàng đợi tin nhắn');
    expect(p).toContain('Kafka');
  });
  it('carries the structural rules and the source body', () => {
    expect(p).toMatch(/do not change.*code/i);
    expect(p).toMatch(/same number of headings/i);
    expect(p).toMatch(/doc:|asset:/);
    expect(p).toContain('# 为什么使用消息队列？');
  });
  it('forbids translating from another translation', () => {
    expect(p).toMatch(/directly from the Chinese/i);
  });
});
```

`tests/translate/stamp.test.ts`:

```ts
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { canonicalHash } from '@/lib/content/hash';
import { stampTranslation } from '@/scripts/translate/stamp';

function root() {
  const r = mkdtempSync(path.join(os.tmpdir(), 'stamp-'));
  const w = (rel: string, d: string) => {
    mkdirSync(path.dirname(path.join(r, rel)), { recursive: true });
    writeFileSync(path.join(r, rel), d);
  };
  w('c/collection.json', JSON.stringify({
    id: 'c', sourceLocale: 'zh', tabColor: '#000000', fallback: { vi: ['en', 'zh'], en: ['zh'], zh: ['zh'] },
    sections: [{ id: 's', prefix: 'S', groups: [{ id: 'g', docs: ['a'] }] }], ids: { a: 'S-01' },
    upstream: { repo: 'r', commit: 'c' }, upstreamFiles: { a: 'docs/s/a.md' },
  }));
  w('c/zh/s/a.md', '# 标题\n\n## 章节\n\n使用 `Kafka`。\n');
  return r;
}

describe('stampTranslation', () => {
  it('writes the translation with direct-from-zh frontmatter and status machine', () => {
    const r = root();
    const res = stampTranslation({
      root: r, collection: 'c', locale: 'vi', section: 's', slug: 'a', today: '2026-10-13',
      translatedBody: '# Tiêu đề\n\n## Chương\n\nDùng `Kafka`.\n',
    });
    expect(res.written).toBe(true);
    const parsed = matter(readFileSync(res.file, 'utf8'));
    expect(parsed.data).toMatchObject({
      status: 'machine',
      source: { locale: 'zh', slug: 'a', hash: canonicalHash('# 标题\n\n## 章节\n\n使用 `Kafka`。\n') },
    });
    expect(parsed.data.translatedAt).toBeTruthy();
    expect(parsed.content).toContain('# Tiêu đề');
  });
  it('refuses to write when a gate fails and reports why', () => {
    const r = root();
    const res = stampTranslation({
      root: r, collection: 'c', locale: 'en', section: 's', slug: 'a', today: '2026-10-13',
      translatedBody: '# Title\n\nOnly one heading and `kafka` altered.\n',
    });
    expect(res.written).toBe(false);
    expect(existsSync(res.file)).toBe(false);
    expect(res.issues.map((i) => i.code)).toEqual(expect.arrayContaining(['heading-structure', 'inline-code']));
  });
  it('never writes a status other than machine', () => {
    const r = root();
    const res = stampTranslation({
      root: r, collection: 'c', locale: 'vi', section: 's', slug: 'a', today: '2026-10-13',
      translatedBody: '---\nstatus: reviewed\n---\n\n# Tiêu đề\n\n## Chương\n\nDùng `Kafka`.\n',
    });
    expect(matter(readFileSync(res.file, 'utf8')).data.status).toBe('machine');
  });
});
```

`tests/translate/meta.test.ts`:

```ts
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyMeta, buildMetaPrompt } from '@/scripts/translate/meta';

const zhMeta = {
  sections: { s: '高并发架构' },
  groups: { g: '消息队列' },
  docs: { a: { title: '为什么使用消息队列？', navTitle: '为什么用 MQ' } },
};

describe('meta tier', () => {
  it('prompt includes the zh json and asks for identical keys', () => {
    const p = buildMetaPrompt({ locale: 'en', zhMeta, glossary: { 消息队列: 'message queue' } });
    expect(p).toContain('高并发架构');
    expect(p).toMatch(/identical keys/i);
    expect(p).toContain('消息队列 → message queue');
  });
  it('applyMeta writes valid meta and rejects missing or extra keys', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'meta-'));
    mkdirSync(path.join(root, 'c/zh'), { recursive: true });
    writeFileSync(path.join(root, 'c/zh/meta.json'), JSON.stringify(zhMeta));
    const ok = {
      sections: { s: 'High concurrency' },
      groups: { g: 'Message queues' },
      docs: { a: { title: 'Why use a message queue?', navTitle: 'Why MQ' } },
    };
    const { file } = applyMeta({ root, collection: 'c', locale: 'en', translated: ok });
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(ok);
    expect(() =>
      applyMeta({ root, collection: 'c', locale: 'en', translated: { ...ok, docs: {} } }),
    ).toThrow(/keys/i);
    expect(() =>
      applyMeta({ root, collection: 'c', locale: 'vi', translated: { ...ok, docs: { a: { title: '', navTitle: 'x' } } } }),
    ).toThrow(/empty/i);
  });
});
```

`tests/translate/cost.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { projectCost } from '@/scripts/translate/cost';

describe('projectCost', () => {
  it('projects tokens from measured tokens per zh character', () => {
    const r = projectCost({
      pilot: [
        { slug: 'a', zhChars: 4000, outputTokens: 6000 },
        { slug: 'b', zhChars: 6000, outputTokens: 9000 },
      ],
      remainingZhChars: 100000,
    });
    expect(r.tokensPerZhChar).toBeCloseTo(1.5, 5);
    expect(r.projectedOutputTokens).toBe(150000);
  });
  it('rejects an empty pilot', () => {
    expect(() => projectCost({ pilot: [], remainingZhChars: 1 })).toThrow(/pilot/);
  });
});
```

`tests/translate/batches.test.ts`:

```ts
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { pendingBatches } from '@/scripts/translate/batches';

const root = path.resolve(__dirname, '../fixtures/content');

describe('pendingBatches', () => {
  it('lists docs with no translation in that locale, grouped by section, in batches of the given size', () => {
    expect(pendingBatches(root, 'demo', 'en', 10)).toEqual([{ section: 'alpha', slugs: ['second', 'third'] }]);
    expect(pendingBatches(root, 'demo', 'vi', 2)).toEqual([
      { section: 'alpha', slugs: ['intro', 'second'] },
      { section: 'alpha', slugs: ['third'] },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/translate`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`scripts/translate/prompt.ts`:

```ts
export type Glossary = Record<string, string>;

const LANG = { en: 'English', vi: 'Vietnamese' } as const;

export function buildPrompt(i: {
  locale: 'en' | 'vi';
  slug: string;
  zhBody: string;
  glossary: Glossary;
  keep: string[];
}): string {
  const lang = LANG[i.locale];
  const gloss = Object.entries(i.glossary).map(([zh, t]) => `- ${zh} → ${t}`).join('\n');
  return `You are translating one technical document (slug: ${i.slug}) into ${lang}.

Translate directly from the Chinese source below. Do not use any other translation as a source.

Rules (every rule is checked by an automated gate; a violation rejects the file):
1. Output ONLY the translated markdown body. No frontmatter, no commentary, no surrounding code fence.
2. Keep exactly the same number of headings and the same heading levels (# / ## / ### …), in the same order.
3. Do not change any code. Inside fenced code blocks and inline code spans, translate nothing except comments; the code itself, identifiers, keywords, strings and punctuation stay byte-for-byte.
4. Keep the same number of fenced code blocks, with the same language tags. For plain text/ASCII-diagram blocks keep the same number of lines; you may translate the words inside them.
5. Keep every link and image target exactly as written (targets starting with doc:, section:, home:, asset: or http). Translate only the link text and image alt text.
6. Keep inline HTML only from this set: <br>, <sub>, <sup>, table tags. Do not introduce any other angle-bracket tags in prose; write generics such as Map<String, Object> inside code spans.
7. Translate all prose. No Chinese characters may remain in the prose.
8. Keep product and technology names untranslated: ${i.keep.join(', ')}.
9. Preserve the markdown formatting (lists, tables, emphasis, blockquotes).
10. Use this glossary consistently:
${gloss}

Chinese source:
-----
${i.zhBody}
-----
`;
}
```

`scripts/translate/stamp.ts`:

```ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { docFile, loadCollection } from '../../lib/content/collection';
import { canonicalHash } from '../../lib/content/hash';
import { compareTranslation, type Issue } from '../../lib/check/compare';
import { existsSync } from 'node:fs';

export function stampTranslation(i: {
  root: string;
  collection: string;
  locale: 'en' | 'vi';
  section: string;
  slug: string;
  translatedBody: string;
  today: string;
}): { written: boolean; file: string; issues: Issue[] } {
  const c = loadCollection(i.root, i.collection);
  const zhFile = docFile(i.root, i.collection, c.sourceLocale, i.section, i.slug);
  const zhBody = matter(readFileSync(zhFile, 'utf8')).content;
  const body = matter(i.translatedBody).content.replace(/^\n+/, ''); // drop any frontmatter the model added
  const exFile = path.join(i.root, i.collection, 'translation-exceptions.json');
  const ex: Record<string, string[]> = existsSync(exFile) ? JSON.parse(readFileSync(exFile, 'utf8')) : {};
  const tag = `${i.locale}/${i.section}/${i.slug}`;

  const issues = compareTranslation(zhBody, body, { exceptions: ex[tag] });
  const file = docFile(i.root, i.collection, i.locale, i.section, i.slug);
  if (issues.some((x) => x.level === 'error')) return { written: false, file, issues };

  const data = {
    source: { locale: c.sourceLocale, slug: i.slug, hash: canonicalHash(zhBody) },
    status: 'machine',
    translatedAt: i.today,
  };
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, matter.stringify(body, data));
  return { written: true, file, issues };
}
```

`scripts/translate/meta.ts`:

```ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { LocaleMeta } from '../../lib/content/types';
import type { Glossary } from './prompt';

const LANG = { en: 'English', vi: 'Vietnamese' } as const;

export function buildMetaPrompt(i: { locale: 'en' | 'vi'; zhMeta: LocaleMeta; glossary: Glossary }): string {
  const gloss = Object.entries(i.glossary).map(([zh, t]) => `- ${zh} → ${t}`).join('\n');
  return `Translate the VALUES of this JSON from Chinese into ${LANG[i.locale]}. Return ONLY valid JSON with identical keys and the same structure. Keep product names (Kafka, Redis, Dubbo, Hystrix, ...) untranslated. Every value must be non-empty. Titles are interview-style questions; keep them natural and concise.

Glossary:
${gloss}

JSON:
${JSON.stringify(i.zhMeta, null, 2)}
`;
}

function shape(m: LocaleMeta): string[] {
  const k: string[] = [];
  for (const [a, v] of Object.entries(m.sections)) k.push(`sections.${a}`, typeof v);
  for (const [a, v] of Object.entries(m.groups)) k.push(`groups.${a}`, typeof v);
  for (const [a, v] of Object.entries(m.docs)) k.push(`docs.${a}.title`, typeof v.title, `docs.${a}.navTitle`, typeof v.navTitle);
  return k;
}

export function applyMeta(i: {
  root: string;
  collection: string;
  locale: 'en' | 'vi';
  translated: unknown;
}): { file: string } {
  const zh = JSON.parse(readFileSync(path.join(i.root, i.collection, 'zh', 'meta.json'), 'utf8')) as LocaleMeta;
  const t = i.translated as LocaleMeta;
  if (shape(zh).join('|') !== shape(t).join('|')) throw new Error('translated meta must have identical keys to the zh meta');
  const values = [
    ...Object.values(t.sections),
    ...Object.values(t.groups),
    ...Object.values(t.docs).flatMap((d) => [d.title, d.navTitle]),
  ];
  if (values.some((v) => typeof v !== 'string' || v.trim() === '')) throw new Error('translated meta has an empty value');
  const file = path.join(i.root, i.collection, i.locale, 'meta.json');
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(t, null, 2) + '\n');
  return { file };
}
```

`scripts/translate/cost.ts`:

```ts
export function projectCost(i: {
  pilot: { slug: string; zhChars: number; outputTokens: number }[];
  remainingZhChars: number;
}): { tokensPerZhChar: number; projectedOutputTokens: number } {
  if (!i.pilot.length) throw new Error('projectCost needs at least one pilot measurement');
  const chars = i.pilot.reduce((s, p) => s + p.zhChars, 0);
  const tokens = i.pilot.reduce((s, p) => s + p.outputTokens, 0);
  const tokensPerZhChar = tokens / chars;
  return { tokensPerZhChar, projectedOutputTokens: Math.round(tokensPerZhChar * i.remainingZhChars) };
}
```

`scripts/translate/batches.ts`:

```ts
import { existsSync } from 'node:fs';
import { docFile, listDocs, loadCollection } from '../../lib/content/collection';

export function pendingBatches(
  root: string,
  collection: string,
  locale: 'en' | 'vi',
  size: number,
): { section: string; slugs: string[] }[] {
  const c = loadCollection(root, collection);
  const bySection = new Map<string, string[]>();
  for (const d of listDocs(c)) {
    if (existsSync(docFile(root, collection, locale, d.section, d.slug))) continue;
    bySection.set(d.section, [...(bySection.get(d.section) ?? []), d.slug]);
  }
  const out: { section: string; slugs: string[] }[] = [];
  for (const [section, slugs] of bySection) {
    for (let i = 0; i < slugs.length; i += size) out.push({ section, slugs: slugs.slice(i, i + size) });
  }
  return out;
}
```

`scripts/translate/cli.ts`:

```ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { contentRoot, docFile, listDocs, loadCollection, loadMeta } from '../../lib/content/collection';
import { applyMeta, buildMetaPrompt } from './meta';
import { buildPrompt, type Glossary } from './prompt';
import { stampTranslation } from './stamp';

const KEEP = [
  'Kafka', 'ActiveMQ', 'RabbitMQ', 'RocketMQ', 'Redis', 'Elasticsearch', 'ES', 'Lucene', 'Dubbo', 'ZooKeeper',
  'Hystrix', 'Sentinel', 'Spring Cloud', 'Spring Boot', 'MySQL', 'Nginx', 'JVM', 'Netty', 'Docker', 'Kubernetes',
];

const [cmd, ...rest] = process.argv.slice(2);
const opt = (name: string) => rest[rest.indexOf(`--${name}`) + 1];
const root = contentRoot();
const collection = opt('collection') ?? 'advanced-java';
const locale = opt('locale') as 'en' | 'vi';
const glossary = (): Glossary =>
  JSON.parse(readFileSync(path.join(root, collection, `glossary.${locale}.json`), 'utf8'));

if (cmd === 'prompt') {
  const slug = opt('slug');
  const c = loadCollection(root, collection);
  const d = listDocs(c).find((x) => x.slug === slug);
  if (!d) throw new Error(`unknown slug ${slug}`);
  const zhBody = matter(readFileSync(docFile(root, collection, c.sourceLocale, d.section, slug), 'utf8')).content;
  const out = path.join('.translation', 'prompts', locale, `${slug}.md`);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, buildPrompt({ locale, slug, zhBody, glossary: glossary(), keep: KEEP }));
  console.log(out);
} else if (cmd === 'stamp') {
  const slug = opt('slug');
  const c = loadCollection(root, collection);
  const d = listDocs(c).find((x) => x.slug === slug)!;
  const translatedBody = readFileSync(opt('file'), 'utf8');
  const r = stampTranslation({
    root, collection, locale, section: d.section, slug, translatedBody, today: new Date().toISOString().slice(0, 10),
  });
  for (const i of r.issues) console.log(`${i.level} [${i.code}] ${i.message}`);
  console.log(r.written ? `written ${r.file}` : 'REJECTED, not written');
  process.exit(r.written ? 0 : 1);
} else if (cmd === 'meta-prompt') {
  const c = loadCollection(root, collection);
  const out = path.join('.translation', 'prompts', locale, 'meta.md');
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, buildMetaPrompt({ locale, zhMeta: loadMeta(root, collection, c.sourceLocale), glossary: glossary() }));
  console.log(out);
} else if (cmd === 'meta-apply') {
  const translated = JSON.parse(readFileSync(opt('file'), 'utf8'));
  console.log(applyMeta({ root, collection, locale, translated }).file);
} else {
  console.error('usage: translate <prompt|stamp|meta-prompt|meta-apply> --locale en|vi [--slug s] [--file f]');
  process.exit(2);
}
```

Add to `package.json` scripts: `"translate": "tsx scripts/translate/cli.ts"`.

`content/advanced-java/translation-exceptions.json`:

```json
{}
```

`content/advanced-java/glossary.en.json`:

```json
{
  "高并发": "high concurrency",
  "分布式系统": "distributed system",
  "分布式": "distributed",
  "高可用": "high availability",
  "微服务": "microservices",
  "海量数据": "massive data",
  "消息队列": "message queue",
  "幂等性": "idempotency",
  "分布式锁": "distributed lock",
  "分布式事务": "distributed transaction",
  "熔断": "circuit breaking",
  "断路器": "circuit breaker",
  "降级": "degradation (fallback)",
  "限流": "rate limiting",
  "缓存": "cache",
  "缓存雪崩": "cache avalanche",
  "缓存穿透": "cache penetration",
  "分库分表": "database and table sharding",
  "读写分离": "read/write splitting",
  "搜索引擎": "search engine",
  "倒排索引": "inverted index",
  "面试题": "interview question",
  "面试官": "interviewer",
  "面试官心理分析": "interviewer psychology",
  "面试题剖析": "answer analysis",
  "服务治理": "service governance",
  "负载均衡": "load balancing",
  "序列化": "serialization",
  "注册中心": "service registry",
  "线程池": "thread pool",
  "信号量": "semaphore",
  "隔离": "isolation",
  "超时": "timeout",
  "一致性": "consistency",
  "可用性": "availability",
  "分区容错性": "partition tolerance",
  "主从": "primary/replica",
  "集群": "cluster",
  "持久化": "persistence",
  "过期": "expiration",
  "消息积压": "message backlog",
  "顺序性": "ordering",
  "重复消费": "duplicate consumption",
  "可靠性": "reliability"
}
```

`content/advanced-java/glossary.vi.json`:

```json
{
  "高并发": "đồng thời cao (high concurrency)",
  "分布式系统": "hệ thống phân tán",
  "分布式": "phân tán",
  "高可用": "tính sẵn sàng cao",
  "微服务": "microservices",
  "海量数据": "dữ liệu khối lượng lớn",
  "消息队列": "hàng đợi tin nhắn (message queue)",
  "幂等性": "tính idempotent",
  "分布式锁": "khóa phân tán",
  "分布式事务": "giao dịch phân tán",
  "熔断": "ngắt mạch (circuit breaking)",
  "断路器": "circuit breaker (bộ ngắt mạch)",
  "降级": "hạ cấp dịch vụ (degradation/fallback)",
  "限流": "giới hạn lưu lượng (rate limiting)",
  "缓存": "bộ nhớ đệm (cache)",
  "缓存雪崩": "cache avalanche (tuyết lở bộ nhớ đệm)",
  "缓存穿透": "cache penetration (xuyên thủng bộ nhớ đệm)",
  "分库分表": "chia nhỏ cơ sở dữ liệu và bảng (sharding)",
  "读写分离": "tách đọc/ghi",
  "搜索引擎": "công cụ tìm kiếm",
  "倒排索引": "chỉ mục đảo ngược (inverted index)",
  "面试题": "câu hỏi phỏng vấn",
  "面试官": "người phỏng vấn",
  "面试官心理分析": "tâm lý người phỏng vấn",
  "面试题剖析": "phân tích câu trả lời",
  "服务治理": "quản trị dịch vụ",
  "负载均衡": "cân bằng tải",
  "序列化": "tuần tự hóa (serialization)",
  "注册中心": "trung tâm đăng ký dịch vụ (service registry)",
  "线程池": "thread pool (nhóm luồng)",
  "信号量": "semaphore",
  "隔离": "cô lập (isolation)",
  "超时": "hết thời gian chờ (timeout)",
  "一致性": "tính nhất quán",
  "可用性": "tính khả dụng",
  "分区容错性": "khả năng chịu phân vùng",
  "主从": "primary/replica",
  "集群": "cụm (cluster)",
  "持久化": "lưu trữ bền vững (persistence)",
  "过期": "hết hạn",
  "消息积压": "tồn đọng tin nhắn",
  "顺序性": "tính thứ tự",
  "重复消费": "tiêu thụ trùng lặp",
  "可靠性": "độ tin cậy"
}
```

Note: the `@/scripts/...` import alias in tests requires `scripts` under the project root; `vitest.config.ts` alias `@` → project root already covers `@/scripts/translate/prompt`.

- [ ] **Step 4: Run to verify pass, commit**

Run: `pnpm vitest run tests/translate && pnpm typecheck`
Expected: PASS.

```bash
git add -A && ./scripts/commit.sh "feat: translation tooling (prompt, gated stamp, meta tier, cost projection, batches)"
```

---

## Task 22: Titles-first tier and the 5-doc pilot, then **HARD STOP**

> **This task is content production and reporting. It is executed by dispatching `implementer` subagents with the exact instructions below; the main session reviews and reports. Nothing here edits application code. Task 26 (full run) must not start until the owner approves the report produced in Step 8.**

**Files:**
- Create: `content/advanced-java/{en,vi}/meta.json`, `content/advanced-java/{en,vi}/<section>/<slug>.md` for the 5 pilot slugs, `docs/superpowers/reports/pilot-report.md`, `.translation/` (gitignored working files)

**Pilot docs (spec 9.3; swap only with the owner's say-so):** `high-concurrency/why-mq`, `distributed-system/distributed-system-cap`, `high-availability/hystrix-introduction`, `micro-services/microservices-introduction`, `big-data/find-top-1-ip`.

**Interfaces:**
- Consumes: `pnpm translate …` (Task 21), `pnpm check:translations` (Task 20), glossaries (Task 21).
- Produces: the pilot report with the five required parts (below) for the owner.

- [ ] **Step 1: Verify the pilot slugs exist and sizes**

```bash
for s in high-concurrency/why-mq distributed-system/distributed-system-cap high-availability/hystrix-introduction micro-services/microservices-introduction big-data/find-top-1-ip; do
  f="content/advanced-java/zh/$s.md"; test -f "$f" && wc -m "$f" || echo "MISSING $f"
done
```

Expected: five files with character counts, no `MISSING`. If a slug is missing, stop and ask the owner for a substitute.

- [ ] **Step 2: Titles tier, both locales**

For each `L` in `en vi`:

```bash
pnpm translate meta-prompt --locale L
```

Dispatch one `implementer` subagent per locale with this exact brief:

```
Read .translation/prompts/<L>/meta.md. Produce the translated JSON exactly as instructed
(identical keys, non-empty values) and write it to .translation/out/<L>/meta.json.
Then run: pnpm translate meta-apply --locale <L> --file .translation/out/<L>/meta.json
Return the command output verbatim. Do not edit any other file.
```

Expected: `content/advanced-java/<L>/meta.json` is written. Run `pnpm test && pnpm check:translations`; expected PASS.

- [ ] **Step 3: Generate the 10 pilot prompts**

```bash
for L in en vi; do for s in why-mq distributed-system-cap hystrix-introduction microservices-introduction find-top-1-ip; do
  pnpm translate prompt --locale $L --slug $s
done; done
```

Expected: ten files printed under `.translation/prompts/{en,vi}/`.

- [ ] **Step 4: Dispatch translators (direct from zh, one subagent per locale)**

Dispatch two `implementer` subagents (one for `en`, one for `vi`) with this exact brief (substitute `<L>`):

```
For each slug in [why-mq, distributed-system-cap, hystrix-introduction, microservices-introduction, find-top-1-ip]:
  1. Read .translation/prompts/<L>/<slug>.md and translate the Chinese source into the target language
     following every rule in the prompt. Translate directly from the Chinese; do not read any other
     translation of this document.
  2. Write ONLY the translated markdown body to .translation/out/<L>/<slug>.md
  3. Run: pnpm translate stamp --locale <L> --slug <slug> --file .translation/out/<L>/<slug>.md
  4. If the command prints REJECTED, fix the translation according to the listed issues and re-run the stamp.
     Repeat until it prints "written". Never edit the stamped file by hand and never set status to reviewed.
Return, per slug: the stamp output, the number of stamp attempts, and your best estimate of the output tokens
used (or "unavailable"). Do not edit any other file.
```

- [ ] **Step 5: Run the gate over the pilot**

```bash
pnpm check:translations
```

Expected: `checked 10 translation(s); 0 error(s)`. Record warnings and stale (should be none) for the report.

- [ ] **Step 6: Review pass**

Dispatch the `reviewer` subagent with: the 10 stamped files, their zh sources, the glossaries, and this brief: "Read-only. For each file report mistranslations, glossary violations, untranslated prose, awkward or unnatural Vietnamese, and any change to code. Rank critical / important / minor with file:line and the fix." Fix **only** critical findings by re-dispatching the translator for that slug, re-stamp, and re-run Step 5.

- [ ] **Step 7: Measure cost**

Collect output-token figures returned by the subagents in Step 4 (sum retries). If unavailable, estimate with `ceil(chars / 3)` for Vietnamese and `ceil(chars / 4)` for English output and label every figure "estimate". Compute the projection:

```bash
node --input-type=module -e "
import fs from 'node:fs';
const slugs=['why-mq','distributed-system-cap','hystrix-introduction','microservices-introduction','find-top-1-ip'];
const sections={'why-mq':'high-concurrency','distributed-system-cap':'distributed-system','hystrix-introduction':'high-availability','microservices-introduction':'micro-services','find-top-1-ip':'big-data'};
let pilot=0; for (const s of slugs) pilot+=fs.readFileSync('content/advanced-java/zh/'+sections[s]+'/'+s+'.md','utf8').length;
let all=0; const walk=d=>fs.readdirSync(d,{withFileTypes:true}).forEach(e=>{const p=d+'/'+e.name; e.isDirectory()?walk(p):(p.endsWith('.md')&&(all+=fs.readFileSync(p,'utf8').length))});
walk('content/advanced-java/zh');
console.log(JSON.stringify({pilotZhChars:pilot,totalZhChars:all,remainingZhChars:all-pilot,remainingDocs:76}));
"
```

Use the printed `remainingZhChars` with `projectCost` (Task 21) per locale to produce the projected output tokens for the remaining 76 docs × 2 locales.

- [ ] **Step 8: Write `docs/superpowers/reports/pilot-report.md` and STOP**

The report has exactly these five parts:
1. **The 10 translated files:** relative paths (`content/advanced-java/{en,vi}/<section>/<slug>.md`).
2. **Gate results:** the full `pnpm check:translations` output, plus the reviewer's critical/important findings and what was changed.
3. **The glossary as it stands:** both glossary files verbatim, and any terms the translators had to improvise (list them as proposed additions; do not add them yet).
4. **Measured token usage:** per doc and per locale, labeled measured or estimate, and number of stamp retries per doc.
5. **Projected cost for the remaining 76 docs × 2 locales:** tokens per zh character, projected output tokens, and the assumptions.

Commit the pilot content and report:

```bash
git add -A && ./scripts/commit.sh "content: titles tier and 5-doc pilot (en, vi) with report"
```

Then **stop and report to the owner**: path to the report, the 10 file paths, and "Awaiting your approval before the full run (Task 26). Please read the Vietnamese pilot docs." Do not start Task 26. Tasks 23–25 may proceed in the meantime because they do not depend on the full run.

---

## Task 23: Search gate: Pagefind vs Orama (decided by test)

**Files:**
- Create: `scripts/search-gate/corpus.ts`, `scripts/search-gate/queries.json`, `scripts/search-gate/run.ts`, `lib/search/fold.ts`, `docs/superpowers/decisions/search-engine.md` (produced by the run)
- Test: `tests/search/fold.test.ts`, `tests/search/queries.test.ts`

**Interfaces:**
- Consumes: `resolveDoc`, `listDocs`, `loadMeta`, `loadCollection`, `contentRoot`.
- Produces:

```ts
// lib/search/fold.ts
export function foldDiacritics(s: string): string;  // 'Độ trễ' -> 'Do tre'
// scripts/search-gate/corpus.ts
export interface CorpusDoc { slug: string; section: string; title: string; body: string; lang: Locale; fallback: boolean; href: string }
export function buildCorpus(root: string, collection: string, locale: Locale): CorpusDoc[]; // best available language per doc
```

- [ ] **Step 1: Install engines**

```bash
pnpm add -D pagefind @orama/orama @orama/tokenizers @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 2: Write the failing tests**

`tests/search/fold.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { foldDiacritics } from '@/lib/search/fold';

describe('foldDiacritics', () => {
  it('removes Vietnamese diacritics including đ', () => {
    expect(foldDiacritics('Độ trễ của hàng đợi')).toBe('Do tre cua hang doi');
    expect(foldDiacritics('Đ')).toBe('D');
  });
  it('leaves Latin and Han text unchanged', () => {
    expect(foldDiacritics('message queue')).toBe('message queue');
    expect(foldDiacritics('消息队列')).toBe('消息队列');
  });
});
```

`tests/search/queries.test.ts` (validity guard: expected docs must exist and the query must occur in at least one expected doc):

```ts
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import queries from '../../scripts/search-gate/queries.json';

const zhDir = 'content/advanced-java/zh';
function zhBody(slug: string): string | null {
  const sections = ['high-concurrency', 'distributed-system', 'high-availability', 'micro-services', 'big-data'];
  for (const s of sections) {
    const f = path.join(zhDir, s, `${slug}.md`);
    if (existsSync(f)) return readFileSync(f, 'utf8');
  }
  return null;
}

describe.skipIf(!existsSync(zhDir))('search gate fixture queries', () => {
  for (const q of queries.zh) {
    it(`zh query "${q.q}" is answerable by its expected docs`, () => {
      const bodies = q.anyOf.map(zhBody);
      expect(bodies.every((b) => b !== null), `unknown slug in ${q.anyOf.join(',')}`).toBe(true);
      expect(bodies.some((b) => b!.toLowerCase().includes(q.q.toLowerCase()))).toBe(true);
    });
  }
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm vitest run tests/search`
Expected: FAIL (modules and json missing).

- [ ] **Step 4: Implement fold, corpus and the queries file**

`lib/search/fold.ts`:

```ts
export function foldDiacritics(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}
```

`scripts/search-gate/queries.json` (zh queries are hand-labeled; vi/en title queries are derived from the pilot translations at run time):

```json
{
  "zh": [
    { "q": "消息队列", "anyOf": ["why-mq", "mq-design", "mq-interview"] },
    { "q": "为什么使用消息队列", "anyOf": ["why-mq"] },
    { "q": "分布式锁", "anyOf": ["distributed-lock-redis-vs-zookeeper"] },
    { "q": "幂等性", "anyOf": ["distributed-system-idempotency"] },
    { "q": "CAP 定理", "anyOf": ["distributed-system-cap"] },
    { "q": "断路器", "anyOf": ["hystrix-circuit-breaker"] },
    { "q": "分库分表", "anyOf": ["database-shard"] },
    { "q": "缓存雪崩", "anyOf": ["redis-caching-avalanche-and-caching-penetration"] },
    { "q": "倒排索引", "anyOf": ["es-write-query-search"] },
    { "q": "限流", "anyOf": ["how-to-limit-current"] },
    { "q": "负载均衡", "anyOf": ["dubbo-load-balancing"] },
    { "q": "Kafka", "anyOf": ["why-mq"] },
    { "q": "RabbitMQ", "anyOf": ["why-mq"] },
    { "q": "TopK", "anyOf": ["topk-problems-and-solutions"] },
    { "q": "Hystrix", "anyOf": ["hystrix-introduction"] },
    { "q": "微服务", "anyOf": ["microservices-introduction"] },
    { "q": "访问百度网站最多的 IP", "anyOf": ["find-top-1-ip"] }
  ],
  "derived": {
    "locales": ["vi", "en"],
    "pilotSlugs": ["why-mq", "distributed-system-cap", "hystrix-introduction", "microservices-introduction", "find-top-1-ip"],
    "kinds": ["title", "title-no-accents"]
  }
}
```

If the validity test reports a bad zh expectation, correct the `anyOf` against the real corpus (`grep -rl "<term>" content/advanced-java/zh`); never relax the validity test.

`scripts/search-gate/corpus.ts`:

```ts
import matter from 'gray-matter';
import { toString } from 'mdast-util-to-string';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { listDocs, loadCollection, loadMeta } from '../../lib/content/collection';
import { resolveDoc } from '../../lib/content/fallback';
import type { Locale } from '../../lib/content/types';

export interface CorpusDoc {
  slug: string;
  section: string;
  title: string;
  body: string;
  lang: Locale;
  fallback: boolean;
  href: string;
}

export function plainText(md: string): string {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(matter(md).content);
  return toString(tree, { includeHtml: false });
}

export function buildCorpus(root: string, collection: string, locale: Locale): CorpusDoc[] {
  const c = loadCollection(root, collection);
  const own = loadMeta(root, collection, locale);
  const src = loadMeta(root, collection, c.sourceLocale);
  const out: CorpusDoc[] = [];
  for (const d of listDocs(c)) {
    const r = resolveDoc(root, c, locale, d.section, d.slug);
    if (!r) continue;
    out.push({
      slug: d.slug,
      section: d.section,
      title: own.docs[d.slug]?.title ?? src.docs[d.slug]?.title ?? d.slug,
      body: plainText(r.body),
      lang: r.served,
      fallback: r.fallback,
      href: `/${locale}/${collection}/${d.section}/${d.slug}`,
    });
  }
  return out;
}
```

- [ ] **Step 5: Implement the gate runner**

`scripts/search-gate/run.ts`:

```ts
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { create, insertMultiple, search as oramaSearch, save } from '@orama/orama';
import { chromium } from '@playwright/test';
import { contentRoot } from '../../lib/content/collection';
import { foldDiacritics } from '../../lib/search/fold';
import type { Locale } from '../../lib/content/types';
import { buildCorpus, type CorpusDoc } from './corpus';
import queries from './queries.json';

const COLLECTION = 'advanced-java';
const LOCALES: Locale[] = ['zh', 'vi', 'en'];
const SITE = '.search-gate/site';

interface Q { q: string; anyOf: string[]; kind: string; locale: Locale }
interface Metric { engine: string; locale: Locale; queries: number; hit10: number; top1: number; failures: string[] }

function buildQueries(root: string, corpus: Record<Locale, CorpusDoc[]>): Q[] {
  const out: Q[] = queries.zh.map((x) => ({ ...x, kind: 'hand', locale: 'zh' as Locale }));
  for (const locale of queries.derived.locales as Locale[]) {
    for (const slug of queries.derived.pilotSlugs) {
      const d = corpus[locale].find((x) => x.slug === slug);
      if (!d || d.fallback) continue; // only docs that are really translated
      out.push({ q: d.title, anyOf: [slug], kind: 'title', locale });
      out.push({ q: foldDiacritics(d.title), anyOf: [slug], kind: 'title-no-accents', locale });
    }
  }
  return out;
}

async function score(engine: string, locale: Locale, qs: Q[], run: (q: Q) => Promise<string[]> | string[]): Promise<Metric> {
  const mine = qs.filter((q) => q.locale === locale);
  let hit10 = 0;
  let top1 = 0;
  const failures: string[] = [];
  for (const q of mine) {
    const slugs = await run(q);
    if (q.anyOf.some((s) => slugs.slice(0, 10).includes(s))) hit10 += 1;
    else failures.push(`${q.kind}: ${q.q}`);
    if (q.anyOf.includes(slugs[0])) top1 += 1;
  }
  return { engine, locale, queries: mine.length, hit10, top1, failures };
}

async function oramaGate(corpus: Record<Locale, CorpusDoc[]>, qs: Q[]) {
  const metrics: Metric[] = [];
  const sizes: Record<string, number> = {};
  const latency: number[] = [];
  for (const locale of LOCALES) {
    let components: Record<string, unknown> | undefined;
    let language: string | undefined = 'english';
    if (locale === 'zh') {
      const { createTokenizer } = await import('@orama/tokenizers/mandarin');
      components = { tokenizer: await createTokenizer() };
      language = undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = await create({
      schema: { slug: 'string', title: 'string', body: 'string' } as const,
      ...(language ? { language } : {}),
      ...(components ? { components } : {}),
    });
    await insertMultiple(
      db,
      corpus[locale].map((d) => ({
        slug: d.slug,
        title: d.title,
        // index accented and folded forms so a query in either form matches
        body: locale === 'vi' ? `${d.title} ${d.body} ${foldDiacritics(d.title)} ${foldDiacritics(d.body)}` : `${d.title} ${d.body}`,
      })),
    );
    sizes[locale] = gzipSync(JSON.stringify(await save(db))).length;
    metrics.push(
      await score('orama', locale, qs, async (q) => {
        const t0 = performance.now();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r: any = await oramaSearch(db, { term: q.q, limit: 10 });
        latency.push(performance.now() - t0);
        return (r.hits ?? []).map((h: { document: { slug: string } }) => h.document.slug);
      }),
    );
  }
  return { metrics, sizes, latency };
}

function writePagefindSite(corpus: Record<Locale, CorpusDoc[]>) {
  rmSync('.search-gate', { recursive: true, force: true });
  for (const locale of LOCALES) {
    for (const d of corpus[locale]) {
      const dir = path.join(SITE, locale);
      mkdirSync(dir, { recursive: true });
      const folded = locale === 'vi' ? `<p data-pagefind-weight="0.5">${foldDiacritics(d.title)} ${foldDiacritics(d.body)}</p>` : '';
      writeFileSync(
        path.join(dir, `${d.slug}.html`),
        `<!doctype html><html lang="${locale === 'zh' ? 'zh' : locale}"><head><meta charset="utf-8"><title>${d.title}</title></head>` +
          `<body data-pagefind-body><h1>${d.title}</h1><p>${d.body.replace(/</g, '&lt;')}</p>${folded}</body></html>`,
      );
    }
  }
  execSync(`pnpm exec pagefind --site ${SITE}`, { stdio: 'inherit' });
}

async function pagefindGate(corpus: Record<Locale, CorpusDoc[]>, qs: Q[]) {
  writePagefindSite(corpus);
  const server = createServer((req, res) => {
    const f = path.join(SITE, decodeURIComponent((req.url ?? '/').split('?')[0]));
    try {
      const data = readFileSync(f);
      res.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream');
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(4020, r));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const fetched = new Set<string>();
  page.on('requestfinished', (req) => fetched.add(new URL(req.url()).pathname));
  await page.goto('http://localhost:4020/zh/why-mq.html');

  const metrics: Metric[] = [];
  const latency: number[] = [];
  let firstSearchBytes = 0;
  for (const locale of LOCALES) {
    const mine = qs.filter((q) => q.locale === locale);
    const results: Record<string, string[]> = {};
    for (const q of mine) {
      const t0 = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slugs: string[] = await page.evaluate(async ({ term, language }) => {
        // @ts-expect-error runtime import served by the static server
        const pf = await import('/pagefind/pagefind.js');
        await pf.options({ language });
        const r = await pf.search(term);
        const top = await Promise.all(r.results.slice(0, 10).map((x: { data: () => Promise<{ url: string }> }) => x.data()));
        return top.map((d: { url: string }) => d.url.split('/').pop()!.replace(/\.html$/, ''));
      }, { term: q.q, language: locale });
      latency.push(Date.now() - t0);
      results[q.q + '|' + q.kind] = slugs;
      if (!firstSearchBytes) {
        firstSearchBytes = [...fetched]
          .filter((p) => p.startsWith('/pagefind/'))
          .reduce((s, p) => s + gzipSync(readFileSync(path.join(SITE, p))).length, 0);
      }
    }
    metrics.push(await score('pagefind', locale, qs, (q) => results[q.q + '|' + q.kind] ?? []));
  }
  await browser.close();
  server.close();
  return { metrics, firstSearchBytes, latency };
}

async function main() {
  const root = contentRoot();
  const corpus = Object.fromEntries(LOCALES.map((l) => [l, buildCorpus(root, COLLECTION, l)])) as Record<Locale, CorpusDoc[]>;
  const qs = buildQueries(root, corpus);
  const orama = await oramaGate(corpus, qs);
  const pf = await pagefindGate(corpus, qs);

  const pass = (ms: Metric[], bytes: number) => {
    const zh = ms.find((m) => m.locale === 'zh')!;
    const vi = ms.find((m) => m.locale === 'vi')!;
    const noAccent = vi.failures.every((f) => !f.startsWith('title-no-accents'));
    return zh.hit10 / Math.max(zh.queries, 1) >= 0.9 && noAccent && bytes <= 300 * 1024;
  };
  const oramaFirst = orama.sizes.zh;
  const lines = [
    '# Search engine decision (generated by scripts/search-gate/run.ts)',
    '',
    `Date: ${new Date().toISOString().slice(0, 10)}. Pass bar: zh hit@10 >= 0.9, accent-insensitive vi titles all hit, first-search transfer <= 300 KB gzip.`,
    '',
    '| engine | locale | queries | hit@10 | top1 | failures |',
    '|---|---|---|---|---|---|',
    ...[...orama.metrics, ...pf.metrics].map(
      (m) => `| ${m.engine} | ${m.locale} | ${m.queries} | ${m.hit10} | ${m.top1} | ${m.failures.join('; ') || '-'} |`,
    ),
    '',
    `- orama gzip index size per locale (bytes): ${JSON.stringify(orama.sizes)}`,
    `- pagefind first-search transfer (gzip bytes): ${pf.firstSearchBytes}`,
    `- orama query latency p50 (ms): ${orama.latency.sort((a, b) => a - b)[Math.floor(orama.latency.length / 2)]?.toFixed(2)}`,
    `- pagefind query latency p50 (ms, includes page.evaluate): ${pf.latency.sort((a, b) => a - b)[Math.floor(pf.latency.length / 2)]}`,
    '',
    `- orama passes: ${pass(orama.metrics, oramaFirst)}; pagefind passes: ${pass(pf.metrics, pf.firstSearchBytes)}`,
    '',
    '## Decision',
    '(owner/main session fills after reading the table: if both pass choose the smaller first-search transfer; if only one passes choose it; if neither passes add a custom bigram tokenizer for zh and re-run)',
    '',
  ];
  mkdirSync('docs/superpowers/decisions', { recursive: true });
  writeFileSync('docs/superpowers/decisions/search-engine.md', lines.join('\n'));
  console.log(lines.join('\n'));
}

if (path.basename(process.argv[1] ?? '') === 'run.ts') main();
```

Add to `package.json` scripts: `"search:gate": "tsx scripts/search-gate/run.ts"`.

> Engine API calls above follow the installed majors (`@orama/orama` 3.1.x, `pagefind` 1.5.x). If a signature differs (for example `search` returning a promise, or the Mandarin tokenizer's export name), adjust **only the adapter lines in this file**, keep the fixture and the metrics unchanged, and note the adjustment in the decision doc.

- [ ] **Step 6: Run to verify pass**

Run: `pnpm vitest run tests/search`
Expected: PASS (if a zh expectation is wrong, fix `queries.json` as noted).

- [ ] **Step 7: Run the gate and record the decision**

```bash
pnpm search:gate
```

Expected: a metrics table written to `docs/superpowers/decisions/search-engine.md`. Edit the `## Decision` section: state the chosen engine and the one-line reason following the outcome rule (both pass → smaller transfer; one passes → that one; neither → add a zh bigram tokenizer and re-run). **Commit the decision before Task 24.** Re-run this task's gate after the full translation run (Task 26) as a regression check; the vi/en fixture then covers all derived title queries.

```bash
git add -A && ./scripts/commit.sh "feat: search gate harness, fixtures and engine decision"
```

---

## Task 24: Search UI and index build (engine per Task 23 decision)

**Files:**
- Create: `lib/search/types.ts`, `lib/search/rank.ts`, `scripts/build-search-index.ts`, `components/SearchBox.tsx`
- Create (only the winner): `lib/search/orama.ts` **or** `lib/search/pagefind.ts`
- Modify: `components/TopBar.tsx`, `package.json` (`prebuild`)
- Test: `tests/search/rank.test.ts`, `tests/search/search-box.test.tsx`

**Interfaces:**
- Consumes: `buildCorpus`, `CorpusDoc` (Task 23); `foldDiacritics`; `Locale`.
- Produces:

```ts
// lib/search/types.ts
export interface SearchHit { slug: string; section: string; title: string; excerpt: string; lang: Locale; fallback: boolean; href: string; score: number }
export interface SearchEngine { search(query: string, locale: Locale): Promise<SearchHit[]> }
// lib/search/rank.ts
export function rankHits(hits: SearchHit[]): SearchHit[]; // score desc; at equal score native (fallback=false) before fallback; stable
// components/SearchBox.tsx
export function SearchBox(props: { locale: Locale; engine: SearchEngine }): JSX.Element;
```

- [ ] **Step 1: Write the failing tests**

`tests/search/rank.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { rankHits } from '@/lib/search/rank';
import type { SearchHit } from '@/lib/search/types';

const hit = (slug: string, score: number, fallback: boolean): SearchHit => ({
  slug, section: 's', title: slug, excerpt: '', lang: fallback ? 'zh' : 'vi', fallback, href: `/vi/c/s/${slug}`, score,
});

describe('rankHits', () => {
  it('orders by score descending', () => {
    expect(rankHits([hit('a', 1, false), hit('b', 3, false)]).map((h) => h.slug)).toEqual(['b', 'a']);
  });
  it('puts native-language hits before fallback hits at equal score', () => {
    expect(rankHits([hit('f', 2, true), hit('n', 2, false)]).map((h) => h.slug)).toEqual(['n', 'f']);
  });
  it('is stable for full ties', () => {
    expect(rankHits([hit('x', 1, false), hit('y', 1, false), hit('z', 1, false)]).map((h) => h.slug)).toEqual(['x', 'y', 'z']);
  });
});
```

`tests/search/search-box.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { SearchBox } from '@/components/SearchBox';
import type { SearchEngine, SearchHit } from '@/lib/search/types';
import en from '../../messages/en.json';

const engine: SearchEngine = {
  async search(q) {
    if (q !== 'queue') return [];
    return [
      { slug: 'why-mq', section: 'hc', title: 'Why MQ', excerpt: 'message queue', lang: 'vi', fallback: false, href: '/vi/c/hc/why-mq', score: 2 },
      { slug: 'mq-design', section: 'hc', title: '如何设计一个消息队列', excerpt: '', lang: 'zh', fallback: true, href: '/vi/c/hc/mq-design', score: 1 },
    ] satisfies SearchHit[];
  },
};

describe('SearchBox', () => {
  it('shows results and badges fallback-language hits', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SearchBox locale="vi" engine={engine} />
      </NextIntlClientProvider>,
    );
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'queue' } });
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(2));
    const links = screen.getAllByRole('link');
    expect(links[0].getAttribute('href')).toBe('/vi/c/hc/why-mq');
    expect(links[1].textContent).toContain('中文');
  });
  it('shows nothing for an empty or unmatched query', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SearchBox locale="vi" engine={engine} />
      </NextIntlClientProvider>,
    );
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    await waitFor(() => expect(screen.queryAllByRole('link')).toHaveLength(0));
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/search/rank.test.ts tests/search/search-box.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement shared pieces**

`lib/search/types.ts`:

```ts
import type { Locale } from '../content/types';

export interface SearchHit {
  slug: string;
  section: string;
  title: string;
  excerpt: string;
  lang: Locale;
  fallback: boolean;
  href: string;
  score: number;
}
export interface SearchEngine {
  search(query: string, locale: Locale): Promise<SearchHit[]>;
}
```

`lib/search/rank.ts`:

```ts
import type { SearchHit } from './types';

export function rankHits(hits: SearchHit[]): SearchHit[] {
  return hits
    .map((h, i) => ({ h, i }))
    .sort((a, b) => b.h.score - a.h.score || Number(a.h.fallback) - Number(b.h.fallback) || a.i - b.i)
    .map((x) => x.h);
}
```

`components/SearchBox.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/content/types';
import { rankHits } from '@/lib/search/rank';
import type { SearchEngine, SearchHit } from '@/lib/search/types';

const LANG_NAME: Record<Locale, string> = { en: 'English', vi: 'Tiếng Việt', zh: '中文' };

export function SearchBox({ locale, engine }: { locale: Locale; engine: SearchEngine }) {
  const t = useTranslations('nav');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let live = true;
    if (!q.trim()) {
      setHits([]);
      return;
    }
    engine.search(q, locale).then((r) => live && setHits(rankHits(r).slice(0, 10)));
    return () => {
      live = false;
    };
  }, [q, locale, engine]);

  return (
    <div className="search ui">
      <input
        ref={input}
        type="search"
        role="searchbox"
        value={q}
        placeholder={`${t('search')} (⌘K)`}
        aria-label={t('search')}
        onChange={(e) => setQ(e.target.value)}
      />
      {hits.length > 0 && (
        <ul className="search-results">
          {hits.map((h) => (
            <li key={h.href}>
              <a href={h.href}>
                {h.title}
                {h.fallback && <span className="badge ui-cjk"> {LANG_NAME[h.lang]}</span>}
              </a>
              {h.excerpt && <p>{h.excerpt}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement the winning engine (keep one, delete the other)**

**If Orama won** (`docs/superpowers/decisions/search-engine.md`):

`scripts/build-search-index.ts`:

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { create, insertMultiple, save } from '@orama/orama';
import { contentRoot, listCollections } from '../lib/content/collection';
import { foldDiacritics } from '../lib/search/fold';
import { buildCorpus } from './search-gate/corpus';
import type { Locale } from '../lib/content/types';

async function main() {
  const root = contentRoot();
  const out = path.join('public', 'search');
  mkdirSync(out, { recursive: true });
  for (const collection of listCollections(root)) {
    for (const locale of ['en', 'vi', 'zh'] as Locale[]) {
      const corpus = buildCorpus(root, collection, locale);
      const opts: Record<string, unknown> = locale === 'zh'
        ? { components: { tokenizer: await (await import('@orama/tokenizers/mandarin')).createTokenizer() } }
        : { language: 'english' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db: any = await create({
        schema: { slug: 'string', section: 'string', title: 'string', body: 'string', lang: 'string', fallback: 'boolean', href: 'string' } as const,
        ...opts,
      });
      await insertMultiple(
        db,
        corpus.map((d) => ({
          slug: d.slug,
          section: d.section,
          title: d.title,
          body: locale === 'vi' ? `${d.body} ${foldDiacritics(d.title)} ${foldDiacritics(d.body)}` : d.body,
          lang: d.lang,
          fallback: d.fallback,
          href: d.href,
        })),
      );
      writeFileSync(path.join(out, `${collection}.${locale}.json`), JSON.stringify(await save(db)));
    }
  }
}
if (path.basename(process.argv[1] ?? '') === 'build-search-index.ts') main();
```

`lib/search/orama.ts`:

```ts
import { create, load, search } from '@orama/orama';
import type { Locale } from './../content/types';
import { rankHits } from './rank';
import type { SearchEngine, SearchHit } from './types';

const cache = new Map<string, Promise<unknown>>();

async function db(collection: string, locale: Locale) {
  const key = `${collection}.${locale}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        const raw = await (await fetch(`/search/${key}.json`)).json();
        const opts: Record<string, unknown> =
          locale === 'zh'
            ? { components: { tokenizer: await (await import('@orama/tokenizers/mandarin')).createTokenizer() } }
            : { language: 'english' };
        const d = await create({
          schema: { slug: 'string', section: 'string', title: 'string', body: 'string', lang: 'string', fallback: 'boolean', href: 'string' } as const,
          ...opts,
        });
        load(d, raw);
        return d;
      })(),
    );
  }
  return cache.get(key)!;
}

export function oramaEngine(collection: string): SearchEngine {
  return {
    async search(query, locale) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d: any = await db(collection, locale);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await search(d, { term: query, limit: 20 });
      const hits: SearchHit[] = r.hits.map((h: { score: number; document: Record<string, unknown> }) => ({
        slug: String(h.document.slug),
        section: String(h.document.section),
        title: String(h.document.title),
        excerpt: '',
        lang: h.document.lang as Locale,
        fallback: Boolean(h.document.fallback),
        href: String(h.document.href),
        score: h.score,
      }));
      return rankHits(hits);
    },
  };
}
```

Set `package.json` `prebuild` to `tsx scripts/copy-assets.ts && tsx scripts/build-search-index.ts`; add `public/search` to `.gitignore`.

**If Pagefind won:** replace `scripts/build-search-index.ts` with a script that reuses `writePagefindSite`'s HTML generation (move that function into `scripts/search-gate/corpus.ts` and export it) writing to `.search-index/site`, runs `pnpm exec pagefind --site .search-index/site --output-path public/pagefind`, and implement `lib/search/pagefind.ts` as: dynamic `import(/* webpackIgnore: true */ '/pagefind/pagefind.js')`, `await pf.options({ language: locale })`, `pf.search(query)`, map `r.data()` to `SearchHit` (`url` → `href`, `meta.title`, `excerpt`), `fallback` from a `data-pagefind-meta="fallback:true"` attribute added in the generated HTML (add it in the writer), then `rankHits`. Add `public/pagefind` and `.search-index` to `.gitignore`.

- [ ] **Step 5: Wire into the top bar**

In `components/TopBar.tsx` (which already receives `collectionId` since Task 16) replace the `#search-slot` div with `<SearchBoxClient locale={locale} collection={collectionId} />`, using this tiny client wrapper `components/SearchBoxClient.tsx` that creates the engine once:

```tsx
'use client';

import { useMemo } from 'react';
import { oramaEngine } from '@/lib/search/orama'; // or pagefindEngine per the decision
import type { Locale } from '@/lib/content/types';
import { SearchBox } from './SearchBox';

export function SearchBoxClient({ locale, collection }: { locale: Locale; collection: string }) {
  const engine = useMemo(() => oramaEngine(collection), [collection]);
  return <SearchBox locale={locale} engine={engine} />;
}
```


- [ ] **Step 6: Run to verify pass, build, assert, commit**

Run: `pnpm vitest run tests/search && pnpm typecheck && pnpm exec next build && pnpm exec tsx scripts/assert-static-build.ts`
Expected: PASS; `public/search/advanced-java.{en,vi,zh}.json` (or `public/pagefind`) exist.

```bash
git add -A && ./scripts/commit.sh "feat: static search index and search box (engine per gate decision)"
```

---

## Task 25: End-to-end suite (spec §10)

**Files:**
- Create: `playwright.config.ts`, `e2e/helpers.ts`, `e2e/negotiation.spec.ts`, `e2e/fallback.spec.ts`, `e2e/switcher-and-anchors.spec.ts`, `e2e/fonts.spec.ts`, `e2e/search.spec.ts`, `e2e/a11y.spec.ts`
- Modify: `package.json` (add `@axe-core/playwright`)

**Interfaces:**
- Consumes: the built site (`next build` + `next start`), pilot translations (Task 22).
- Produces: `pnpm e2e` covering locale negotiation, unprefixed redirect, cookie-via-switcher, fallback notice/lang/canonical/sitemap, switcher position keeping and stale-slug anchors, CJK font bytes, search, axe.

- [ ] **Step 1: Install and configure**

```bash
pnpm add -D @axe-core/playwright
```

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  use: { baseURL: 'http://localhost:4010' },
  webServer: {
    command: 'pnpm exec next build && pnpm exec next start -p 4010',
    url: 'http://localhost:4010/en',
    timeout: 600_000,
    reuseExistingServer: true,
  },
});
```

`e2e/helpers.ts`:

```ts
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const C = 'content/advanced-java';
export const SECTIONS = ['high-concurrency', 'distributed-system', 'high-availability', 'micro-services', 'big-data'];

export function sectionOf(slug: string): string {
  for (const s of SECTIONS) if (existsSync(path.join(C, 'zh', s, `${slug}.md`))) return s;
  throw new Error(`no section for ${slug}`);
}

export function hasLocale(locale: 'en' | 'vi', slug: string): boolean {
  return existsSync(path.join(C, locale, sectionOf(slug), `${slug}.md`));
}

export function allSlugs(): string[] {
  return SECTIONS.flatMap((s) => readdirSync(path.join(C, 'zh', s)).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)));
}

export function firstUntranslated(locale: 'en' | 'vi'): string | undefined {
  return allSlugs().find((s) => !hasLocale(locale, s));
}

export const PILOT = 'why-mq';

export function cjkFontUrls(): string[] {
  const dir = '.next/static/css';
  const urls: string[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.css'))) {
    const css = readFileSync(path.join(dir, f), 'utf8');
    for (const m of css.matchAll(/@font-face\s*{[^}]*font-family:\s*['"]?([^;'"]+)['"]?;[^}]*}/g)) {
      if (/Noto_Serif_SC|Noto Serif SC/.test(m[1])) {
        for (const u of m[0].matchAll(/url\(([^)]+)\)/g)) urls.push(u[1].replace(/['"]/g, '').split('/').pop()!);
      }
    }
  }
  return urls;
}
```

- [ ] **Step 2: Negotiation, redirect and cookie-via-switcher**

`e2e/negotiation.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { PILOT, sectionOf } from './helpers';

const path = `/advanced-java/${sectionOf(PILOT)}/${PILOT}`;

test('Accept-Language: vi redirects an unprefixed path to /vi (307)', async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: 'http://localhost:4010', extraHTTPHeaders: { 'accept-language': 'vi' } });
  const r = await ctx.get(path, { maxRedirects: 0 });
  expect(r.status()).toBe(307);
  expect(r.headers()['location']).toContain(`/vi${path}`);
});

test('neither cookie nor header: redirects to /en', async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: 'http://localhost:4010' });
  const r = await ctx.get(path, { maxRedirects: 0 });
  expect(r.status()).toBe(307);
  expect(r.headers()['location']).toContain(`/en${path}`);
});

test('cookie written by the language switcher wins over Accept-Language', async ({ page }) => {
  await page.goto(`/en${path}`);
  await page.getByRole('link', { name: /Tiếng Việt/ }).click();
  await expect(page).toHaveURL(new RegExp(`/vi${path}`));
  const r = await page.context().request.get(path, { maxRedirects: 0, headers: { 'accept-language': 'en' } });
  expect(r.status()).toBe(307);
  expect(r.headers()['location']).toContain(`/vi${path}`);
});

test('unknown unprefixed path redirects then 404s with the localized page', async ({ page }) => {
  await page.goto('/foo/bar');
  await expect(page).toHaveURL(/\/en\/foo\/bar/);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('unknown path under a locale shows the localized 404 via the catch-all', async ({ page }) => {
  await page.goto('/vi/foo/bar');
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
});
```

- [ ] **Step 3: Fallback, canonical, sitemap, stale note**

`e2e/fallback.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { firstUntranslated, hasLocale, PILOT, sectionOf } from './helpers';

test('untranslated vi doc serves zh with the notice, zh lang and canonical to the real page', async ({ page }) => {
  const slug = firstUntranslated('vi');
  test.skip(!slug, 'every doc is translated to vi');
  const section = sectionOf(slug!);
  await page.goto(`/vi/advanced-java/${section}/${slug}`);
  await expect(page.getByRole('note').first()).toContainText('chưa được dịch');
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'zh-Hans');
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toContain(`/zh/advanced-java/${section}/${slug}`);
  const hreflangs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => e.getAttribute('hreflang')));
  expect(hreflangs).not.toContain('vi');
});

test('sitemap lists real translations only', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const slug = firstUntranslated('vi');
  if (slug) expect(xml).not.toContain(`/vi/advanced-java/${sectionOf(slug)}/${slug}`);
  expect(hasLocale('vi', PILOT)).toBe(true);
  expect(xml).toContain(`/vi/advanced-java/${sectionOf(PILOT)}/${PILOT}`);
});

test('a translated vi doc shows the machine note and no fallback notice', async ({ page }) => {
  await page.goto(`/vi/advanced-java/${sectionOf(PILOT)}/${PILOT}`);
  await expect(page.getByRole('note').first()).toContainText('Bản dịch máy');
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'vi');
});
```

- [ ] **Step 4: Switcher position and stale-slug anchors**

`e2e/switcher-and-anchors.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { PILOT, sectionOf } from './helpers';

const url = (l: string) => `/${l}/advanced-java/${sectionOf(PILOT)}/${PILOT}`;

test('a stale slug in the hash still lands on the right heading', async ({ page }) => {
  await page.goto(url('en') + '#h3-this-slug-is-long-gone');
  const id = await page.locator('[data-hi="3"]').first().getAttribute('id');
  await expect.poll(async () => page.evaluate(() => location.hash)).toBe('#' + id);
});

test('a hash beyond the heading count lands on the last heading', async ({ page }) => {
  await page.goto(url('en') + '#h9999');
  const last = await page.locator('[data-hi]').last().getAttribute('id');
  await expect.poll(async () => page.evaluate(() => location.hash)).toBe('#' + last);
});

test('switching language keeps the heading position', async ({ page }) => {
  await page.goto(url('en'));
  const target = page.locator('[data-hi="3"]').first();
  await target.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 5));
  await page.getByRole('link', { name: /Tiếng Việt/ }).click();
  await expect(page).toHaveURL(new RegExp(`/vi/.*#h3`));
});
```

- [ ] **Step 5: CJK font bytes (spec §8.3, amendment 4)**

`e2e/fonts.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { cjkFontUrls, firstUntranslated, PILOT, sectionOf } from './helpers';

test('vi page with a real translation downloads zero CJK font bytes', async ({ page }) => {
  const cjk = new Set(cjkFontUrls());
  expect(cjk.size).toBeGreaterThan(0);
  const requested: string[] = [];
  page.on('request', (r) => {
    const name = r.url().split('/').pop() ?? '';
    if (cjk.has(name)) requested.push(name);
  });
  await page.goto(`/vi/advanced-java/${sectionOf(PILOT)}/${PILOT}`, { waitUntil: 'networkidle' });
  expect(requested).toEqual([]);
  const loaded = await page.evaluate(
    () => [...document.fonts].filter((f) => /Noto.?Serif.?SC/i.test(f.family) && f.status === 'loaded').length,
  );
  expect(loaded).toBe(0);
});

test('fallback page rendering zh requests some, but not all, CJK slices', async ({ page }) => {
  const slug = firstUntranslated('vi');
  test.skip(!slug, 'every doc is translated to vi');
  const cjk = new Set(cjkFontUrls());
  const requested = new Set<string>();
  page.on('request', (r) => {
    const name = r.url().split('/').pop() ?? '';
    if (cjk.has(name)) requested.add(name);
  });
  await page.goto(`/vi/advanced-java/${sectionOf(slug!)}/${slug}`, { waitUntil: 'networkidle' });
  expect(requested.size).toBeGreaterThan(0);
  expect(requested.size).toBeLessThan(cjk.size);
});
```

- [ ] **Step 6: Search and a11y**

`e2e/search.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { PILOT, sectionOf } from './helpers';

test('zh query finds the expected doc', async ({ page }) => {
  await page.goto('/zh/advanced-java');
  await page.getByRole('searchbox').fill('为什么使用消息队列');
  await expect(page.locator(`.search-results a[href$="/${sectionOf(PILOT)}/${PILOT}"]`)).toBeVisible();
});

test('vi query without diacritics finds the translated pilot doc by title', async ({ page, request }) => {
  const title = (await (await request.get(`/vi/advanced-java/${sectionOf(PILOT)}/${PILOT}`)).text()).match(/<h1[^>]*>([^<]+)<\/h1>/)![1];
  const folded = title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  await page.goto('/vi/advanced-java');
  await page.getByRole('searchbox').fill(folded);
  await expect(page.locator(`.search-results a[href$="/${PILOT}"]`)).toBeVisible();
});
```

`e2e/a11y.spec.ts`:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PILOT, sectionOf } from './helpers';

for (const [name, url] of [
  ['shelf', '/en'],
  ['collection', '/en/advanced-java'],
  ['doc', `/en/advanced-java/${sectionOf(PILOT)}/${PILOT}`],
  ['about', '/en/about'],
] as const) {
  test(`axe: ${name} has no serious or critical violations`, async ({ page }) => {
    await page.goto(url);
    const r = await new AxeBuilder({ page }).analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}
```

- [ ] **Step 7: Run and commit**

Run: `pnpm e2e`
Expected: all specs PASS (skipped specs are reported with the reason). Fix real failures in the app, not by weakening assertions. If the `fonts.spec.ts` URL matching finds `cjk.size === 0`, print the @font-face family names from `.next/static/css` and adjust only the regex in `helpers.ts` to the mangled family name next/font produced (U4).

```bash
git add -A && ./scripts/commit.sh "test: end-to-end suite (negotiation, fallback, anchors, fonts, search, a11y)"
```

---

## Task 26: Full translation run (**blocked until the owner approves the pilot report**)

> **Gate.** Do not start this task unless the owner has explicitly approved `docs/superpowers/reports/pilot-report.md`. If the owner changed glossary terms or rules, apply them first (edit the glossary files; re-run Task 22 Steps 5–6 for the pilot docs affected) and only then proceed.

**Files:**
- Create: `content/advanced-java/{en,vi}/<section>/<slug>.md` for the 76 remaining docs; update `content/advanced-java/glossary.{en,vi}.json` only as the owner directed
- Create: `docs/superpowers/reports/full-run-report.md`

**Interfaces:**
- Consumes: `pnpm translate …`, `pendingBatches` (Task 21), `pnpm check:translations` (Task 20).
- Produces: all 81 docs translated to en and vi with `status: machine`, zero gate errors, a report.

- [ ] **Step 1: Confirm approval and list batches**

```bash
node --import tsx -e "
import { pendingBatches } from './scripts/translate/batches.ts';
for (const L of ['en','vi']) console.log(L, JSON.stringify(pendingBatches('content','advanced-java',L,10)));
"
```

Expected: batches of at most 10 slugs per section per locale (about 8 per locale). Save the output to `.translation/batches.json`.

- [ ] **Step 2: Dispatch translators, in waves**

For each batch and each locale, dispatch one `implementer` subagent, at most 4 in flight at a time, with the exact brief from Task 22 Step 4 but with the batch's slug list. Each subagent must stamp every doc (the stamp gate rejects bad output) and return per-slug stamp output and attempts. After each wave:

```bash
pnpm check:translations
git add -A && ./scripts/commit.sh "content: translate batch <section> (<locale>)"
```

Expected: 0 errors after each wave. A doc that cannot pass the gate after 3 attempts is reported with its issues (do not loosen the gate; add a reviewed entry to `translation-exceptions.json` only if the owner approves).

- [ ] **Step 3: Review pass**

Dispatch the `reviewer` subagent over (a) every doc that needed 2+ stamp attempts and (b) a random 10% sample per locale (`shuf -n` over the new files). Same read-only brief as Task 22 Step 6. Fix only critical findings by re-translating that slug and re-stamping.

- [ ] **Step 4: Verify the whole corpus**

```bash
pnpm check:translations
pnpm test
pnpm exec next build && pnpm exec tsx scripts/assert-static-build.ts
pnpm e2e
pnpm search:gate   # regression: vi/en derived title queries now cover all pilot docs; record the table in the decision doc
```

Expected: `checked 162 translation(s); 0 error(s)` (81 docs × 2 locales), static assertion `243 doc routes prerendered`, e2e PASS.

- [ ] **Step 5: Write `docs/superpowers/reports/full-run-report.md` and hand to the owner**

Contents: counts per locale; stamp attempts distribution; docs that needed 3 attempts; reviewer findings summary; measured tokens vs the pilot projection; the 10% sample list for the owner's spot review; reminder that **only the owner** moves a doc to `status: reviewed`.

```bash
git add -A && ./scripts/commit.sh "content: complete en and vi machine translation, full-run report"
```

---

## Task 27: Final verification, spec deltas, deploy handoff (no deploy)

**Files:**
- Modify: `docs/superpowers/specs/2026-10-13-advanced-java-nextjs-design.md` (apply the 5 deltas), `README.md` (deploy section), `PRODUCT.md` (status)
- Create: `docs/superpowers/decisions/` entries from earlier tasks (if not present), `DESIGN.md` (Impeccable documenter)
- Test: the whole suite

**Interfaces:**
- Consumes: everything.
- Produces: a verified branch and the owner's deploy checklist. **No deployment, remote push or token use is performed.**

- [ ] **Step 1: Apply the five plan deltas to the spec**

Edit the spec so it matches what was built: (1) §5 allowlist `br`, `sub`, `sup`, `img`, table family; (2) §4.4 step 7 importer HTML rule; (3) §4.4 step 6 lenient anchor matching and the real heading; (4) §4.1/§12 `upstreamFiles`; (5) §5 `rehypeRestrictImages` between link resolution and sanitize, and order diagram updated. Update §14 rows U1–U16 with "verified in Task N: <result>" for each item verified (U1, U2, U3, U11, U12 in Task 13; U4 in Task 25; U5 in Task 23; U6 in Task 10; U7 in Task 7; U10 in Task 15 build; U13 in Task 25; U14 in Task 3; U15 in Task 9; U16 in Task 7 report). Mark U8 and U9 as pending owner/Task 22.

- [ ] **Step 2: Run the complete verification**

```bash
pnpm test
pnpm typecheck
pnpm check:translations
pnpm exec next build
pnpm exec tsx scripts/assert-static-build.ts
pnpm e2e
git status --short   # expect clean
```

Expected: every command exits 0.

- [ ] **Step 3: Impeccable finish (one batched round, then stop polishing)**

Start the production server (`pnpm exec next start -p 4010`), capture desktop (1440 wide) and mobile (390 wide) full-page screenshots of the home shelf, a translated doc, a fallback doc and `/about` into `.impeccable/review/` (`desktop.png`, `mobile.png` per page; name files `home-desktop.png`, `doc-desktop.png`, …). Run the detector once:

```bash
/Users/ryan/.claude/skills/impeccable/scripts/impeccable detect --json app components
```

Fix everything mechanical in one batch, recapture once, then spawn the shipped finish reviewer and documenter as `/Users/ryan/.claude/skills/impeccable/reference/new-work.md` §7 directs (reviewer first with the screenshots, the direction contract from the surface brief, the craft-floor path and detector findings; documenter second to write `DESIGN.md` and `.impeccable/design.json`). Do not iterate further in the build thread.

- [ ] **Step 4: Whole-branch review**

Dispatch the `reviewer` subagent over the full diff against this plan and the spec (read-only). Fix critical and important findings; list minor ones in the final report.

- [ ] **Step 5: README deploy section and owner checklist**

Append to `README.md`:

```markdown
## Deploying (Vercel Git integration, no token on disk)

1. Create the GitHub repository and push this project (owner action).
2. Install the Vercel GitHub app and import the repository in the Vercel dashboard (Framework: Next.js).
3. Project Settings → Environments → Production → Branch Tracking: turn **off** "Auto-assign Custom Production Domains".
4. Every push to a non-production branch gets a preview deployment. A push to `main` creates a *staged* production deployment.
5. Promote a staged deployment to production from the Deployments page ("Promote"). Nothing is served from production until you do.
```

- [ ] **Step 6: Commit and report**

```bash
git add -A && ./scripts/commit.sh "chore: final verification, spec deltas applied, deploy checklist"
```

Report to the owner: branch state, command results, the Impeccable verdict, the whole-branch review summary, the list of still-open owner items (code license is MIT and done; repo creation and Vercel account type (U8); image provenance review; spot-review of translations and promotion of docs to `reviewed`). **Do not run `vercel`, do not push, do not read `.env.local`.**

