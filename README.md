# advanced-java (Next.js)

Multilingual (vi / en / zh) reading site for the doocs/advanced-java corpus.

## Licenses

- **Code** (everything outside `content/`): MIT, see `LICENSE`.
- **Content** (`content/` text and translations): CC-BY-SA-4.0, see `content/LICENSE`.
  Original content by Doocs and 中华石杉, upstream: https://github.com/doocs/advanced-java .
  vi and en pages are translated and adapted from the Chinese original; zh pages are reformatted from it.
  Images are included only where we have the right to license them; see `content/ASSETS.md`.

## Development

- `pnpm test`: run the unit and component tests (vitest).
- `pnpm build`: production static build (`next build`); `prebuild` copies content assets to `public/_content` and `postbuild` runs the static-build assertion.
- `pnpm e2e`: run the Playwright end-to-end tests.
- `pnpm check:translations`: verify translation files, hashes and coverage.
