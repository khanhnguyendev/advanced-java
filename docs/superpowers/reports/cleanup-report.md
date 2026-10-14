# Cleanup round report

Date: 2026-10-14. Deployed commit: `e7a7a1e9672b` (main). Production: **https://advanced-java-sigma.vercel.app** (deployment `dpl_84oVC5tvJGVy7X9MpHEANXLp5Ld9`, https://advanced-java-idexhgteq-khanhnguyendevs-projects.vercel.app). All docs remain `status: machine`; nothing marked reviewed.

## Results on the deployed commit
- `check:translations`: 150 translations (75 en + 75 vi), 0 errors, 8 length-ratio warnings (code-heavy vi docs).
- vitest 422 passed; typecheck exit 0; `next build` OK with the static assertion (243 doc routes, only the catch-all and the proxy are dynamic); e2e 66 passed.
- Live smoke (production alias): `/en`, vi and zh doc, en and vi `sentinel-vs-hystrix` (credit with the Sentinel wiki URL and Apache-2.0 link), held doc with credit, vi page of the still-held eureka article (zh + fallback), `/en/about` (image provenance statement), sitemap: all 200. Live search returns 10 results in en, vi (no accents) and zh.

## What was done, per decision
1. **find-common-urls**: source number kept ("two times") in en and vi, with a translator's note under the line stating the usual answer is five.
2. **Held docs**: rows 1–5 stay excluded; row 6 (how-eureka-…) stays held, source unknown; row 10 (sentinel-vs-hystrix) translated (en, vi) and gated; its page credits the Sentinel wiki page "Sentinel 与 Hystrix 的对比" by name and URL, with an Apache-2.0 notice and link, in every locale (adaptation kind).
3. **Reviewer findings**: Important ones applied; 30 glossary keys added; plain substitutions applied (lists below); H2 sentence case applied to en (165 headings in 37 docs plus the sentinel doc and 10 follow-up fixes); minors listed below.
4. **Image provenance**: /about, README and content/ASSETS.md now state the images come from doocs/advanced-java at commit 1a35221 under CC-BY-SA-4.0 and that their original authorship is not documented upstream.
5. **Git integration prep**: `.gitignore` already covered `.env.*` (so `.env.local`), `ref/`, `.next`, `out`, `public/_content`, `public/pagefind`, `.vercel`; README "Deploying" is now a short section (push to `main` → production, other branches → previews). No remote created, nothing pushed.
6. **Removed**: `scripts/commit.sh` (the only tracked file that existed for this session's tooling). Kept on purpose: `docs/superpowers/*` (spec, plan, reports are project documentation), `.impeccable/surfaces` and `DESIGN.md`/`.impeccable/design.json` (design contract), `scripts/import*` and `scripts/search-gate` (product tooling). Untracked and gitignored local leftovers (not in the repo): the `.superpowers/` workspace with the ledger and briefs, `.impeccable/review` screenshots; delete them if you do not want them on disk.

## Docs changed (glossary application and reviewer fixes)

### Erratum note and Important fixes
## Item 1: find-common-urls erratum note (2 docs)
- en/big-data/find-common-urls.md (1 note)
- vi/big-data/find-common-urls.md (1 note)

## Item 2: reviewer fixes (4 docs, all vi)
- 2a vi/high-availability/hystrix-request-cache.md: `cài đặt API Filter` -> `cài đặt interface Filter` (zh: 实现 Filter 接口). vi/micro-services/whats-microservice-how-to-communicate.md:96 `đăng ký API và lớp triển khai` -> `đăng ký interface và lớp triển khai` (zh: 接口和实现类). en counterparts already say 'interface'; no change.
- 2b vi/distributed-system/distributed-lock-redis-vs-zookeeper.md: 7 Chinese comments translated (lines 266,267,272,278,282,312,313); no other Chinese left in file.
- 2c vi/high-concurrency/redis-sentinel.md:13 -> `tên tiếng Trung là 哨兵`. en redis-sentinel has no equivalent sentence (heading 'Introduction to Sentinel' only); unchanged.
- 2d vi/high-availability/hystrix-request-cache.md: first use of cache term was line 11, so `(cache)` gloss added there (`bộ nhớ đệm (cache)`) and dropped from line 15 (`được lưu vào bộ nhớ`).



### Plain term substitutions (74 lines in 15 docs; before/after in git history)
## Item 3: glossary substitutions
15 docs, 74 changed lines (counts per doc below; before/after in the commit diff c1ec638).
- en/high-concurrency/how-to-ensure-high-concurrency-and-high-availability-of-redis.md: 1 lines (lines 34)
- en/high-concurrency/redis-master-slave.md: 25 lines (lines 11, 19, 20, 21, 22, 23, 24, 26, 28, 32, 34, 44, 63, 65, 72, 73, 80, 81, 86, 91, 93, 97, 105, 109, 109)
- en/high-concurrency/es-optimizing-query-performance.md: 1 lines (lines 61)
- en/high-concurrency/redis-sentinel.md: 7 lines (lines 17, 111, 112, 68, 72, 132, 153)
- en/high-concurrency/redis-cluster.md: 4 lines (lines 25, 124, 132, 134)
- vi/distributed-system/distributed-transaction.md: 4 lines (lines 36, 38, 40, 42)
- vi/distributed-system/distributed-system-cap.md: 7 lines (lines 21, 27, 47, 48, 50, 56, 62)
- vi/distributed-system/dubbo-load-balancing.md: 1 lines (lines 58)
- vi/big-data/find-common-urls.md: 5 lines (lines 45, 47, 49, 51, 61)
- vi/big-data/find-hotest-query-string.md: 2 lines (lines 43, 47)
- vi/high-concurrency/mysql-read-write-separation.md: 6 lines (lines 39, 57, 58, 45, 57, 58)
- vi/high-concurrency/database-shard-dynamic-expand.md: 2 lines (lines 28, 48)
- vi/high-concurrency/high-concurrency-design.md: 4 lines (lines 56, 68, 72, 80)
- vi/high-concurrency/es-introduction.md: 1 lines (lines 36)
- vi/micro-services/micro-services-technology-stack.md: 4 lines (lines 195, 205, 219, 29)

Ambiguous / not applied:
- en/high-concurrency/redis-master-slave.md:107 'also known as master/standby switchover' left (would read 'failover, also known as failover').
- en bare 'slave' (redis-sentinel.md 'elect a slave', 'the slaves', cluster-slave-validity-factor in code) and 'switchover' alone left; 'slave' in redis-master-slave prose outside 'slave node(s)' left.
- en sdown/odown definition lines (redis-sentinel.md 111-112): first '(sdown)/(odown)' gloss dropped to avoid 'sdown is subjectively down (sdown)'.
- vi 'nút' left: why-mq.md:71 and e-commerce-website-detail-page-architecture.md:31 (button); all 'nút thắt' (bottleneck); micro-services/whats-microservice-how-to-communicate.md:66 ('một nút yêu cầu dịch vụ do một nút khác cung cấp', process peers, ambiguous).
- vi 'CSDL' inside `sharding (phân mảnh CSDL và bảng)`: 1 occurrence left (es-production-cluster.md:17). micro-services-technology-stack.md:219 'phân mảnh CSDL và bảng' (not the exact phrase) was substituted.
- vi 'mức đồng thời ghi'/'số lần ghi đồng thời' applied only in mysql-read-write-separation.md and database-shard-dynamic-expand.md (zh 写并发 confirmed).



### Later review-driven fixes (task 31)
# Task 31 report (branch wave23-fix, commit 30d4e01)
All paths under content/advanced-java/ unless noted.
1. en/high-availability/sentinel-vs-hystrix.md (4 fallback restorations)
2. scripts/translate/prompt.ts, tests/translate/prompt.test.ts (repo root)
3. en/high-availability/sentinel-vs-hystrix.md, vi/high-availability/sentinel-vs-hystrix.md
4. vi/high-availability/sentinel-vs-hystrix.md (2 places)
5. vi/high-concurrency/database-shard-dynamic-expand.md
6. glossary.vi.json, vi/high-concurrency/es-production-cluster.md (only remaining CSDL)
7. en/distributed-system/distributed-transaction.md, en/high-availability/e-commerce-website-detail-page-architecture.md,
   en/high-concurrency/how-to-ensure-the-reliable-transmission-of-messages.md, en/high-concurrency/es-introduction.md,
   en/high-concurrency/mq-time-delay-and-expired-failure.md, en/micro-services/micro-services-technology-stack.md,
   en/high-concurrency/database-shard.md, en/high-availability/sentinel-vs-hystrix.md (all H2/H3 sentence-cased)
8. vi/big-data/find-common-urls.md
9. en/high-concurrency/redis-sentinel.md (dropped (sdown)/(odown) at lines 111-112)
10. vi/high-availability/hystrix-request-cache.md (line 15 only; first-use "(cache)" at line 11 kept)
Gates: check:translations 0 errors, 8 warnings; vitest 55 files/422 tests pass; typecheck clean; build OK (243 routes).


### Heading sentence case (en, level >= 2; H1 untouched)
## Item 4: en H2+ sentence case
37 docs, 165 headings changed. Rule: lowercase Title-case non-first word when lowercase form occurs >=3 times in en prose. Deviations: skipped words with >=3 mid-sentence capitalized uses (product names) plus keep-set {Sentinel, Cluster, Session, Boot, Cloud, Server, Client, Stream(s), Zookeeper, Phase}; leading numeric tokens ('1.') not counted as first word. Words like 'Concepts', 'Transactions', 'Best-Effort' left (lowercase form <3).

- en/distributed-system/distributed-transaction.md: 9
- en/distributed-system/distributed-system-cap.md: 4
- en/distributed-system/zookeeper-application-scenarios.md: 5
- en/distributed-system/distributed-session.md: 3
- en/distributed-system/distributed-lock-redis-vs-zookeeper.md: 7
- en/big-data/find-top-1-ip.md: 1
- en/high-concurrency/mq-time-delay-and-expired-failure.md: 8
- en/high-concurrency/mysql-read-write-separation.md: 2
- en/high-concurrency/how-to-ensure-the-reliable-transmission-of-messages.md: 14
- en/high-concurrency/redis-consistence.md: 1
- en/high-concurrency/database-shard.md: 1
- en/high-concurrency/why-mq.md: 7
- en/high-concurrency/redis-caching-avalanche-and-caching-penetration.md: 3
- en/high-concurrency/redis-expiration-policies-and-lru.md: 2
- en/high-concurrency/redis-persistence.md: 2
- en/high-concurrency/es-production-cluster.md: 2
- en/high-concurrency/redis-data-types.md: 3
- en/high-concurrency/how-to-ensure-high-concurrency-and-high-availability-of-redis.md: 2
- en/high-concurrency/es-architecture.md: 2
- en/high-concurrency/how-to-limit-current.md: 6
- en/high-concurrency/redis-single-thread-model.md: 2
- en/high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed.md: 2
- en/high-concurrency/how-to-ensure-high-availability-of-message-queues.md: 7
- en/high-concurrency/es-optimizing-query-performance.md: 5
- en/high-concurrency/how-to-ensure-the-order-of-messages.md: 2
- en/high-concurrency/mq-design.md: 2
- en/high-concurrency/es-write-query-search.md: 9
- en/high-concurrency/high-concurrency-design.md: 5
- en/high-concurrency/why-cache.md: 2
- en/high-concurrency/es-introduction.md: 1
- en/high-availability/hystrix-introduction.md: 3
- en/high-availability/e-commerce-website-detail-page-architecture.md: 2
- en/high-availability/hystrix-process.md: 7
- en/high-availability/hystrix-fallback.md: 2
- en/micro-services/micro-services-technology-stack.md: 17
- en/micro-services/whats-microservice-how-to-communicate.md: 3
- en/micro-services/micro-service-governance.md: 10

Follow-up fixes after review: en `sentinel-vs-hystrix` headings, and the half-cased headings in distributed-transaction, e-commerce-website-detail-page-architecture, how-to-ensure-the-reliable-transmission-of-messages, es-introduction, mq-time-delay-and-expired-failure, micro-services-technology-stack, database-shard.

### Sentinel-vs-hystrix review fixes
en: "fallback" restored where the source uses the English word (4 places); `Metric` statistics rendered "interface" (en and vi); vi: 熔断器 "circuit breaker". Prompt rule 12 now says an English "fallback" in the source stays "fallback".

## Remaining list for your review

**Minor findings not applied** (about 25, from the full-run reviews; wording-level): a few missing first-use parentheticals; "online" vs "in production" (线上) in en; "slave"/"replica" alternation in some en prose; 废弃 rendered "removed" instead of "deprecated" (vi how-to-ensure-high-availability-of-message-queues:49,51); vi 到一定时间 wording (es-write-query-search:66); vi redis-sentinel "trên 2 node trở lên"; vi database-shard-dynamic-expand clock times "6 giờ/10 giờ"; en redis-cluster 时效性 "latency" reads backwards (redis-cluster:52); en dubbo-rpc-design:24 reason clause on the wrong sentence; en why-dubbo:47 "Splitting a distributed system…"; vi hystrix-timeout awkward phrases (:11, :110); mq-interview glosses (delay)/(expiry) not in source. A lone full-width parenthesis in vi hystrix-thread-pool-current-limiting prose.
**Not plain substitutions, left as is:** 线上, 预热, 热点, 单体, 前缀树, 请求上下文, 节点→nút (ambiguous), 主备/主备切换 variants, en bare "slave".
**H2 casing:** sentence case applied to en by a frequency heuristic (keep-set for product names); proposed permanent rule: sentence case for all headings level >= 2, H1 equals the meta title. vi/zh headings were not touched.

**Unresolved**
- `how-eureka-enable-service-discovery-and-service-registration`: source unknown (searched twice); held.
- Rows 1–5 stay excluded pending your later rights decision.
- Source erratum in find-common-urls (two vs five) is noted on the page.

**Unverified / open (spec §14, §16)**
- U8 Git integration for your account type: not tested (deploys were CLI deploys; no remote exists).
- U16 image authorship: unknown, recorded as undocumented upstream.
- U10 glyph coverage: no visual audit.
- The credited originals' licenses: Fowler and F5 pages are © (all rights reserved); the zh translations' own license is unknown. Sentinel wiki: Apache-2.0 per the repository, no separate wiki license statement.
- The earlier first deployment to the project was auto-assigned to production by Vercel (no separate preview ever existed).
