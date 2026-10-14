# Diagram pilot report (2026-10-14)

Branch `diagrams-pilot`, HEAD `108d638`. Preview (Vercel Authentication on, team login required): https://advanced-java-mhmafr6m9-khanhnguyendevs-projects.vercel.app/en/review/diagrams (also `/vi/…`, `/zh/…`). Production does not serve the route (404, `DIAGRAM_REVIEW` unset there). No upstream image or doc was changed.

## Results

- 5 diagrams x zh/en/vi, light and dark: `pnpm check:diagrams` 5 diagrams, 0 errors. `pnpm test` 472 passed, 2 skipped; typecheck clean.
- e2e on the review route (1280 and 360px, light and dark, real fonts): 4 passed; exactly 30 SVGs and 300 node groups; no overflow; every node's text inside its shape.
- Review: four reviewer passes. First found 4 important issues (blank translations passed; scene fields unescaped; duplicate SVG ids; vacuous e2e) plus content issues (B4 two-way arrows). All fixed; the last pass found only malformed-file hardening, also fixed.

## Spot-check of the vision pass (5 pilot images, by hand)

True label instances: 71 (XA 7, system-design 24, request-sequence 21 text lines, request-cache 9, trie 10).

| Measure | Result |
|---|---|
| Text strings mistranscribed | 0 |
| Labels missed entirely | 2 of 71 (2.8%): the two `1` arrow labels in `hystrix-request-cache` |
| Stated `label_count` field correct | 0 of 5 (stated 6/20/14/8/9 vs true 7/24/21/9/10) |
| Misclassified | 1 of 5: `distributed-system-request-sequence` is a flow diagram, not a sequence diagram |

Trust: transcriptions are reliable; counts run about 20 to 25% low, so the 1,440-label estimate is more likely about 1,800 label instances (core scope about 1,150). There is no true sequence diagram outside the 8 held Eureka ones.

## Measured cost (sub-agent tokens; main session about 135k on top)

| Work | Tokens |
|---|---|
| Inventory, 126 images (5 agents, incl. one re-run each for output path) | 631k |
| Framework (renderer, gate, PNG tool) | 72k |
| Review route + e2e | 56k |
| 5 diagrams x 3 locales (44k, 47k, 50k, 64k, 77k) | 282k, avg 56k |
| Review and fix rounds (4 reviews, 4 fixes) | 666k |
| Total | 1.71M |

## Projection for the remaining 76 diagrams

Per diagram: simple about 47k, medium about 62k, dense about 80k, from the pilot. Remaining mix about 35 simple, 26 medium, 15 dense.

- Drawing: about 4.5M tokens (range 3.8M to 5.5M).
- Review and fixes at one reviewer per batch of about 10 diagrams: about 1.3M. Adding a label-collision gate first (about 70k) should cut fix rounds.
- Total about 5.8M tokens (range 5M to 7.5M).
- Time: agents take 1 to 2.5 minutes each; at 5 in parallel about 16 waves, so drawing is about 40 to 60 minutes and the full run about 2 hours wall-clock including review, if run in one sitting.

## Known gaps for the full run

1. The gate does not check text against nodes and edges (label overlap was caught by eye on two pilot diagrams). Add a label-collision check before the full run.
2. `/en/review/diagrams` prerenders a 404 stub in a plain build (harmless; noindex, not in sitemap or search).
3. Vertical text in upstream (MQ and queue boxes in the request-sequence diagram) is rendered horizontal in taller boxes.
4. Glossary gaps seen in the pilot: 接入服务, 扛读高并发 (translated by the agents; owner may prefer other terms).
5. The `diagram:` markdown scheme, inline SVG in docs, `/about` credit list and `ASSETS.md` section are specified but not built; they are part of the full run.
