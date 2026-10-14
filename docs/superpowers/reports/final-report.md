# Final report: advanced-java (Next.js 16) deployed

Date: 2026-10-14. Deployed commit: `5bbcb5d0b609` (main). All translations are `status: machine`; nothing is marked reviewed.

## 1. URLs

| | URL |
|---|---|
| **Production** (default domain, no custom domain) | https://advanced-java-sigma.vercel.app |
| Production deployment | https://advanced-java-r3f5s44zt-khanhnguyendevs-projects.vercel.app (id `dpl_BqmbwUJrcCrrfChAhB1A3PqqgLyo`) |
| First deployment (pilot state, commit `c4f4012`) | https://advanced-java-35le1ehda-khanhnguyendevs-projects.vercel.app |

**Deviation, stated plainly:** the Phase 2 "preview" was not a preview. Vercel assigns a project's first deployment to production (its CLI said so), so the pilot-state site (8 translated docs) was briefly the production alias. The CLI route (token from `.env.local`, never printed) was used because the repo has no git remote and no Vercel link. The production alias now serves the full site above. The site is publicly reachable (unauthenticated requests return 200).

## 2. Counts per locale (collection advanced-java, 81 docs)

| | en | vi | zh |
|---|---|---|---|
| Translated (machine) | 74 | 74 | 81 (source) |
| Held / excluded (zh page + fallback banner) | 7 | 7 | n/a |
| Set aside (gate failures after 2 attempts) | 0 | 0 | n/a |

Held docs (7 per locale): excluded by your decision, with the original-source credit on the page in every locale: `microservices-introduction`, `advantages-and-disadvantages-of-microservice`, `choose-microservice-deployment-strategy`, `event-driven-data-management-for-microservices`, `migrating-from-a-monolithic-architecture-to-a-microservices-architecture`; held pending (unresolved source): `how-eureka-enable-service-discovery-and-service-registration`, `high-availability/sentinel-vs-hystrix`.
Translated in this run: 70 docs per locale in 9 batches (4 pilot docs re-run under the new glossary), plus the titles tier for all 81 docs.
Two docs needed a second stamp attempt in en (es-optimizing-query-performance, database-shard); in vi two (how-to-ensure-high-availability-of-message-queues, es-write-query-search); redis-sentinel (vi) was re-stamped after a stray Han character.

## 3. Results on the deployed commit

| Check | Result |
|---|---|
| `check:translations` | 148 translations (74 en + 74 vi), 0 errors, 8 warnings (length-ratio 1.29–1.47 on code-heavy vi docs), 0 stale |
| vitest | 55 files, 417 tests passed |
| typecheck (after build) | exit 0 |
| `next build` | OK; static build assertion: **243 doc routes prerendered**; the only dynamic routes are the `[...rest]` catch-all and the proxy |
| e2e (Playwright) | 64 passed: locale negotiation, fallback canonical, switcher position, search zh/vi/en, sitemap, CJK font bytes (vi page and fallback page), unprefixed paths, axe on home/doc/section/about/search |
| Search gate on the full corpus (before the last content fixes) | Pagefind zh 20/20, vi 8/8, en 11/11; first search 187,707 B gzip; total index 2,176,328 B gzip. Orama fails (vi accent, size) |
| Live smoke (production alias) | `/en`, vi and zh doc, held doc (credit + fallback canonical to /zh), vi fallback of an excluded doc (credit URL f5.com), sitemap (en 82, vi 82, zh 89 URLs), robots, pagefind assets: all 200. Live search returns 10 results for "message queue" (en), "hang doi thong diep" (vi, no accents) and "消息队列" (zh) |

## 4. Measured tokens against the projection

| | Measured (subagent tokens) | Projected (pilot-report-2) |
|---|---|---|
| Full-run translators, en (9 batches) | 675,886 (3.08 per zh char) | ~0.80M |
| Full-run translators, vi (9 batches) | 787,173 (3.59 per zh char) | ~0.94M |
| Docs-only total | 1.46M | ~1.74M (+ retries to ~2.0M) |
| Titles tier + 4 pilot docs re-run (en 66,544; vi 78,342) | 144,886 | ~0.15M |
| Reviewers (en 90,879; vi 163,948) | 254,827 | ~0.25–0.45M |
| Fix task + 29A tooling | ~89K | n/a |
| **Total** | **~1.95M** | **~2.2–2.5M** |

Per-character cost stayed below the first-batch limit (1.5× the pilot reference) in every batch; no STOP condition triggered. Batch 4 (3 docs, code-heavy) was the highest at 4.22 en / 4.74 vi per zh char.

## 5. Reviewer findings not applied (for your review)

Only the Critical findings were applied: two wrong figures (vi `hàng chục tỷ` for 几十亿, in database-shard-dynamic-expand and the same error in database-shard) and find-common-urls (see below). Also applied, as pipeline artifacts rather than translation wording: the leaked prompt delimiter `-----` removed from 13 vi docs, plus a new gate rule `stray-delimiter`.

**Needs your decision**
- **Source erratum, find-common-urls:** the zh says "file size enlarged two times" and then computes 300×5 = 1.5G. Both translations originally said "five times" (correcting the source). I restored the source's number ("two times") because a translation must keep numbers; the inconsistency is the upstream's. Choose: keep faithful, or correct both locales.
- **en and vi are not consistent on H2 casing**: 23 docs use "Interview Question / Interviewer Psychology / Answer Analysis", 19 use sentence case; big-data docs use Title Case.

**Important, not applied**
- vi: Java-type 接口 rendered "API" instead of "interface" in hystrix-request-cache:33 and whats-microservice-how-to-communicate:96.
- vi `distributed-lock-redis-vs-zookeeper`: Java comments in tryLock()/unlock() (lines ~266–282, 312–313) are still Chinese.
- vi `redis-sentinel`:13 invents a Vietnamese name ("tên tiếng Việt là lính gác"); `hystrix-request-cache`:15 puts the cache gloss on memory.
- en: 主观/客观宕机 has two renderings (outage/crash) in redis-cluster and the sentinel doc.
- A lone full-width parenthesis remains in vi hystrix-thread-pool-current-limiting prose (punctuation, not Chinese text).
- Han inside Java string literals in code blocks is kept (byte-for-byte rule); a few docs keep Chinese comments in code.

**Minor** (about 25; full lists in the reviewer outputs recorded in the SDD ledger): wording nits, a few missing first-use parentheticals, "online" vs "in production", "slave"/"replica" alternation, 废弃 rendered "removed" instead of "deprecated".

**Glossary candidates to approve** (en 11, vi 15): 主观宕机/客观宕机, 主备切换, 主备, 从节点, 水平拆分/垂直拆分, 横向扩容, 调用链路, 预热, 线上, 协调节点, 热点; 脑裂, 故障转移, 镜像集群, 冷备, 中间件, 写并发, 库 (CSDL vs cơ sở dữ liệu), 节点 (node vs nút), 单体, 前缀树, 请求上下文, 生产环境, Java-type 接口. The translators' own non-glossary term lists are in the SDD workspace (`batch-NN-{en,vi}-report.md`).

## 6. Audit rows 6 and 10; credit URLs

- **Row 6** (`how-eureka-…`): searched again with the title and a distinctive sentence; source still unknown. **Unresolved, held.**
- **Row 10** (`sentinel-vs-hystrix`): **verified**: adapted from the Sentinel wiki page "Sentinel 与 Hystrix 的对比" (opening paragraph and the 11-row table match). alibaba/Sentinel declares Apache-2.0; the wiki has no separate license statement. Held.
- **Credit URLs** (fetched; the four nginx.com URLs you recalled all 301 to a generic F5 product page, so the f5.com URLs are used):
  - https://martinfowler.com/articles/microservices.html: 200, "Microservices", James Lewis and Martin Fowler, 25 March 2014, "© Martin Fowler".
  - https://www.f5.com/company/blog/nginx/introduction-to-microservices: "Introduction to Microservices | F5", Chris Richardson, May 19, 2015, ©F5.
  - https://www.f5.com/company/blog/nginx/event-driven-data-management-microservices: "Event-Driven Data Management for Microservices | F5", December 04, 2015.
  - https://www.f5.com/company/blog/nginx/deploying-microservices: "Choosing a Microservices Deployment Strategy", February 10, 2016.
  - https://www.f5.com/company/blog/nginx/refactoring-a-monolith-into-microservices: "Refactoring a Monolith into Microservices | F5", March 08, 2016.
  All four Richardson pages state "©2026 F5, Inc. All Rights Reserved".

## 7. Still unverified or open (spec §14)

- **U8** Git integration for your account type: not verified (CLI route used; no repo remote). To use Git integration later: create the GitHub repo, import it, and turn off "Auto-assign Custom Production Domains".
- **U16** provenance of the 126 upstream images: unknown; listed on `/about`, not relicensed.
- **U10** glyph coverage: exercised by e2e pages, no visual audit.
- The credited originals' licenses: all rights reserved (Fowler, F5); the zh translations' own license unknown. Held docs are excluded accordingly.
- `scripts/commit.sh` (agent helper with a session trailer) is still in the repo; delete before making the repo public if undesired.

## 8. Constraints kept

No hooks or settings touched. The token was read from `.env.local` into the environment only (never printed, never passed as a flag, `.env.local` is gitignored). No history deleted, no force-push (there is no remote). Nothing marked reviewed.
