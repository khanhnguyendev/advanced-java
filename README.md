# advanced-java (Next.js)

Multilingual (vi / en / zh) reading site for the doocs/advanced-java corpus.

## Licenses

- **Code** (everything outside `content/`): MIT, see `LICENSE`.
- **Content** (`content/` text and translations): CC-BY-SA-4.0, see `content/LICENSE`.
  Original content by Doocs and 中华石杉, upstream: https://github.com/doocs/advanced-java .
  vi and en pages are translated and adapted from the Chinese original; zh pages are reformatted from it.
  All 125 images (81 of them replaced in the documents by redrawn diagrams, 44 served as is) come from the upstream repository doocs/advanced-java at commit 1a35221 and are included under that repository's license, CC-BY-SA-4.0. Their original authorship is not documented upstream; see `content/ASSETS.md`.

## Development

- `pnpm test`: run the unit and component tests (vitest).
- `pnpm build`: production static build (`next build`); `prebuild` first runs `check:translations` (a broken translation fails the build), then copies content assets to `public/_content` and builds the search index; `postbuild` runs the static-build assertion.
- `pnpm e2e`: run the Playwright end-to-end tests.
- `pnpm check:translations`: verify translation files, hashes and coverage.

## Deploying

Deploys use Vercel's Git integration. A push to `main` deploys to production; other branches get preview deployments.
Optionally set `NEXT_PUBLIC_SITE_URL` (no trailing slash) for canonical/hreflang/sitemap URLs; otherwise `VERCEL_PROJECT_PRODUCTION_URL` is used.

## Translation workflow (machine translation, direct from zh)

```bash
pnpm translate prompt --locale vi --slug why-mq        # writes .translation/prompts/vi/why-mq.md
# translate the Chinese source following the prompt, write the body to .translation/out/vi/why-mq.md
pnpm translate stamp --locale vi --slug why-mq --file .translation/out/vi/why-mq.md   # gated; writes only if all gates pass
pnpm check:translations                                # structure, code, links, staleness
```

Translations are written with `status: machine`. Only the owner marks a document reviewed
(`pnpm check:translations --mark-reviewed advanced-java/vi/why-mq`).

Translation rules:

- Direct from zh only; never translate from another translation.
- Han characters inside an inline code span are a documented exception: the span is kept unchanged and the gloss is written outside it.
- One term per concept: use the glossary files (`content/advanced-java/glossary.{en,vi}.json`) exactly as given; a concept has a single rendering (for example 降级 has no second term).
- Titles first: the meta tier runs before documents. A translated document's H1 equals its meta `title`; `navTitle` is the short upstream sidebar label (a noun phrase, never a question).
- For glossary values written `A (B)`, use A everywhere and write B in parentheses only on first use in a document.
- Vietnamese numbers use Vietnamese units (nghìn, triệu, tỷ), never 万, w or vạn.
- Held docs are not translated (see `content/advanced-java/translation-policy.json`).
