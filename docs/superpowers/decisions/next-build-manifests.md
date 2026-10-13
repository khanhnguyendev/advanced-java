# Next 16.4.0 build manifests (verified in Task 13)

Verified against `next@16.4.0` on a real build (266 static pages, 243 doc routes).

- `.next/prerender-manifest.json`: keys `version, routes, dynamicRoutes, notFoundRoutes, preview`.
  - `routes`: 266 entries, each with `initialRevalidateSeconds: false`, `srcRoute`, `dataRoute`, ...
  - `dynamicRoutes`: `/[locale]`, `/[locale]/[collection]`, `/[locale]/[collection]/[section]`, `/[locale]/[collection]/[section]/[slug]`, each with `fallback: false` (dynamicParams = false).
- **Difference from the plan:** the app path manifest is `.next/app-path-routes-manifest.json` (not `.next/server/...`). Shape: `{"/[locale]/[...rest]/page": "/[locale]/[...rest]", ...}`.
- `scripts/assert-static-build.ts` reads those two files; only its CLI block depends on shapes.
- Smoke (port 4010): unprefixed path with `Accept-Language: vi` -> 307 `/vi/...`; no header -> 307 `/en/...`; `/vi/.../why-mq` -> 200; `/vi/foo/bar` -> 404.
- proxy.ts: `export default handler; export { handler as proxy }` accepted by Next 16.4.0.
