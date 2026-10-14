# Pilot report 2: glossary applied, source audit, titles tier + 4 docs re-run

Date: 2026-10-14. Status: **stopped; waiting for your decisions below. Task 26 (full run) not started.**
Everything is `status: machine`. Nothing is marked reviewed. No deploy, no hooks or settings touched.

## 1. What changed since the first pilot report

| Your decision | Done |
|---|---|
| 1. Glossary: apply section 3 with your edits, add improvised terms, 宕机/挂起, vi style rule | Applied to both glossaries (full files in section 6). Prompt rules 11–14 added; rule 3 documents the inline-code exception; the Vietnamese-numbers rule is vi-only (also fixed a bug where the meta prompt printed it for en) |
| 2. Han inside inline code accepted | Documented in prompt rule 3 and the README translation rules |
| 3. Audit of micro-services and translated-article candidates | Section 2 below; full text in `docs/superpowers/reports/source-audit.md`. Default applied: 10 docs on hold, zh page + fallback banner + source credit |
| 4. Re-run titles tier and the pilot docs in both locales | Done for 4 docs (see ruling below); both `meta.json` regenerated |
| Fix vi hystrix 降级 wording and the meta title for the local-cache fallback doc | Re-translated under the new glossary; one leftover split is open (finding V1) |
| en microservices-introduction meta title = H1; gate | New gate `title-h1-mismatch`: the meta title of every locale must equal the H1 of the doc file (NFC + whitespace only), including zh. 0 mismatches on the real content; a fixture reproduces the exact earlier case |

**Ruling I made:** `microservices-introduction` was both a pilot doc (item 4) and on the audit list (item 3). I applied item 3: it is not re-translated, and its two pilot translations (en, vi) are removed from the served tree (they stay in git history before commit 16f5c88). The re-run therefore covers 4 docs: why-mq, distributed-system-cap, hystrix-introduction, find-top-1-ip. If you want the old files back, say so.

**Other things built to enforce your decisions:**
- `content/advanced-java/translation-policy.json`: 10 held docs. `pnpm translate prompt` and `stamp` refuse a held doc, batching skips them, `check:translations` errors if a translation exists for one (and for unknown keys).
- `content/advanced-java/source-credits.json`: 5 credits (Fowler/Lewis; Richardson parts 1, 5, 6, 7), rendered on the doc page in every locale. The footer no longer claims CC-BY-SA over a credited original; it says the Chinese translation was published upstream under CC-BY-SA-4.0 and the original is not licensed by this site. The credit URLs are unverified (see audit).
- Titles tier (nav labels) is still translated for held docs; their pages open the zh text with the fallback banner. Say if you want those titles left in zh.

## 2. Audit table

## Audit table

| # | Doc (section `micro-services` unless noted) | Likely source and author | Upstream credits it? | How closely zh tracks the original | Rights picture | Recommendation |
|---|---|---|---|---|---|---|
| 1 | `microservices-introduction` (zh 33.6 KB, 15.6K chars) | "Microservices", Martin Fowler and James Lewis, martinfowler.com, 2014-03-25 | **Yes, in the first line**: "翻译自 Martin Fowler 网站 Microservices 一文". Translator not named; no license statement | A complete translation: same sections, same footnotes [1]–[15] (footnote text left in English), same examples (comparethemarket.com, Amazon "you build, you run it", Netflix, etc.) | martinfowler.com carries a copyright notice (© Martin Fowler); I know of no open license. Treat as all rights reserved. The zh translation's own license is unknown | **Exclude from translation** (default). Keep zh with fallback banner and a source credit. Remove the pilot en/vi translations from the served tree (done in this change; they remain in git history). Owner may instead ask Fowler/ThoughtWorks for permission or link out |
| 2 | `advantages-and-disadvantages-of-microservice` (15 KB) | "Introduction to Microservices", Chris Richardson, NGINX blog, May 2015, part 1 of the 7-part series later published as the e-book *Microservices: From Design to Deployment* (Richardson and Floyd Smith, NGINX) | **No.** No source line, no author | A full translation. Section order matches the original (monolith, monolithic hell, microservices tackling complexity, benefits, drawbacks, summary). Figures come with it (`_assets`: monolithic-application-architecture-diagram etc.) | NGINX/F5 copyright (e-book is free to read; I could not read its terms). A separate Chinese translation of the book by DocsHome is CC BY-NC-SA 4.0, but **this zh text is a different translation** (wording and numbering differ from DocsHome), so its own rights are unknown. The images are NGINX's | **Exclude** (default). Credit Richardson/NGINX on the page |
| 3 | `choose-microservice-deployment-strategy` (12 KB) | "Choosing a Deployment Strategy" (series part 6, NGINX blog), Chris Richardson | **No** | Full translation (multiple service instances per host, per VM, per container, serverless/AWS Lambda; same order) | As row 2 | **Exclude**; credit |
| 4 | `event-driven-data-management-for-microservices` (13.5 KB) | "Event-Driven Data Management for Microservices" (series part 5, NGINX blog), Chris Richardson | **No** | Full translation. Verified against the structure of the DocsHome translation of the same chapter: same sections (1.1 distributed data problem, 1.2 event-driven architecture, 1.3 achieving atomicity: local transaction publish, transaction-log mining, event sourcing, 1.4 summary). Wording differs, so it is not a copy of DocsHome | As row 2 | **Exclude**; credit |
| 5 | `migrating-from-a-monolithic-architecture-to-a-microservices-architecture` (8.9 KB) | "Refactoring a Monolith into Microservices" (series part 7, NGINX blog), Chris Richardson | **No** | Full translation (strategies 1–3: stop digging, split frontend and backend, extract services; Strangler application, anti-corruption layer) | As row 2 | **Exclude**; credit |
| 6 | `how-eureka-enable-service-discovery-and-service-registration` (13.5 KB) | Chinese original article on Eureka call flow (author unknown; probably a Chinese tech blog). Its intro paraphrases the service-discovery chapter of Richardson's series (series part 4) and it quotes the Netflix/Eureka README | **Partly.** Reference list at the end names Netflix Eureka and Richardson's "Service Discovery in a Microservices Architecture" | Mostly original Chinese commentary and code walk-through; only the introduction is derived | Author unknown, so the article's own license is unknown | **Hold** pending the owner. Probably acceptable to translate if the author is found or the intro is rewritten; otherwise exclude |
| 7 | `whats-microservice-how-to-communicate` (9 KB) | Chinese study notes, concept credited to Fowler's article with a link | Yes (link to Fowler) | Original notes with code samples | Upstream author's (石杉 project) | **Hold**, low risk; owner decides |
| 8 | `micro-service-governance` (2.3 KB) | Chinese outline of governance topics | n/a | Original | Upstream author's | **Hold**, low risk |
| 9 | `micro-services-technology-stack` (7.5 KB) | Chinese survey of tools; quotes the one-line descriptions from the tool projects' own READMEs (ZooKeeper, Hystrix, Sentinel, Zuul) | Links to each project | Original, with short quotations | Quoted descriptions come from Apache-2.0 / Netflix projects | **Hold**, low risk |
| 10 | `high-availability/sentinel-vs-hystrix` (13 KB) | Probably adapted from the Alibaba Sentinel wiki page comparing Sentinel and Hystrix (the long English quotation and the comparison table are the tell). **Not verified** | Partly (quoted English descriptions) | Unknown (not compared) | Sentinel is Apache-2.0; if adapted, the notice requirement is attribution | **Hold**. Needs a source check before any translation |

### Other docs checked, not held

| Doc | Observation | Action |
|---|---|---|
| `high-availability/hystrix-introduction` and the other 9 `hystrix-*` docs | Lecture notes that cite the Netflix Hystrix wiki ("参考 Hystrix Home"). Commentary and examples are original, structure follows the wiki | Not held; credit stays as the doc's own first line. The owner already included `hystrix-introduction` in the re-run |
| `distributed-system/distributed-system-cap` | One sentence cites a HashiCorp page ("原文地址") for a Consul claim | Not held |
| all other docs | No translation markers, no English quotation blocks beyond tool descriptions; they read as original Chinese lecture notes (the upstream project is a Chinese course's notes) | Not held |

The scan is heuristic: a doc that was translated without any marker and in a natural Chinese register would not be caught. The ten rows above are what the evidence supports.

Limits: I could not read the original NGINX pages or the e-book's copyright page, and I did not diff the zh text against the originals paragraph by paragraph. The DocsHome Chinese translation of the Richardson book is CC BY-NC-SA 4.0, but the zh text in this repo is a different translation (wording and heading numbering differ), so its rights are unknown.

## 3. The second pilot

Files: `content/advanced-java/{en,vi}/meta.json` and `{en,vi}/{high-concurrency/why-mq,distributed-system/distributed-system-cap,high-availability/hystrix-introduction,big-data/find-top-1-ip}.md`.

Gate: `pnpm check:translations` → 8 translations, 0 errors, 0 warnings, 0 stale. Attempts: all 1 except en find-top-1-ip (2: the first added backticks the source lacks).

Independent Opus review (read-only; the gate could not be re-run by the reviewer):
- **en: usable as-is.** No Critical/Important. Minor: dropped "fallback" in hystrix-introduction:38; added "per second" in why-mq:115; added "documentation" in cap:63; "crashes" for 崩溃 collides with 宕机 = crash.
- **vi: usable with fixes.** All first-pilot defects verified fixed (figures, API, 'ràng buộc về thời gian', no 万/vạn/w, hang vs crash, 'tính sẵn sàng', 'hàng đợi thông điệp', H1 = meta title, only the `一致性` span has Han).
  Open items:
  - **V1 (Important)** 降级 still has two renderings in the nav (group "Ngắt mạch và suy giảm dịch vụ" vs doc "Cơ chế fallback…"). Cause: the glossary value you approved, "fallback / suy giảm dịch vụ (degradation)", allows two terms. Recommended: one term, `"降级": "fallback (suy giảm dịch vụ)"`.
  - **V2 (Important)** `find-top-1-ip.md:17` 重复次数 → "số lần lặp" reads as loop iterations; should be "số lần xuất hiện".
  - **V3 (Important)** glossary contradicts itself: 消息积压 "tồn đọng tin nhắn" vs 消息 = "thông điệp" everywhere else. Recommended "tồn đọng thông điệp".
  - Minor: first-use parenthetical missing for 超时 and 降级; 不可用 two renderings; 崩溃 'sập' vs 'sụp đổ'; two awkward phrases in cap:50/56/63; stray quotation marks in why-mq:128/132; section label "Kiến trúc tính sẵn sàng cao" vs title "kiến trúc … có tính sẵn sàng cao".
  - **navTitle policy differs between locales** (en often keeps the question form, vi shortens). Pick one policy.
- **Meta titles audit (81 docs):** 9 titles contradict the glossary (7 en, 2 vi): en hystrix-fallback ("Fallback Degradation…"), find-top-100-words / find-no-repeat-number / find-a-number-if-exists / topk-problems-and-solutions ("Large-Scale Data" used for 大量数据/大数据, which is the glossary value for 海量数据), distributed-system-g2 "System Decomposition" vs "Why Split a System?", redis-cas "Concurrent Write Contention"; vi high-availability-g2 (V1), whats-microservice-how-to-communicate ("các microservice"). No untranslated Chinese in either meta file; no duplicate nav labels inside a section.

**Glossary additions the reviewer recommends (not applied; yours to approve):** 依赖服务 dependency service / dịch vụ phụ thuộc; 资源隔离 resource isolation / cô lập tài nguyên; 容错 fault tolerance / chịu lỗi; 快速失败 fail fast / fail-fast; 优雅降级 graceful degradation / fallback êm dịu; 近实时 near real-time / gần thời gian thực; 热修改 hot modification / sửa đổi nóng; 泳道 swimlane / swimlane (làn bơi); 吞吐量 throughput / thông lượng; 时效性 latency / độ trễ (en currently "timeliness"); 单机 single-node / trên một máy; 副本 replica / bản sao; 积压 backlog / tồn đọng; 崩溃 collapse / sụp đổ; 挂了/挂掉/跪了 go down / sập; 不可用 unavailable / không khả dụng; 异步 asynchrony / bất đồng bộ; 发布订阅 publish/subscribe (Pub/Sub); 缓存击穿 cache breakdown; 哨兵 Sentinel; 系统拆分 system splitting / tách hệ thống; 技术选型 technology selection / lựa chọn công nghệ; 分而治之 divide and conquer / chia để trị; 哈希取余 hash modulo / băm rồi lấy phần dư; 大数据 big data / dữ liệu lớn; 大量数据 large amounts of data / lượng dữ liệu lớn; 重复次数 occurrence count / số lần xuất hiện; 频数 frequency / tần suất. The full lists of what each translator improvised are in the SDD workspace (`pilot2-en-report.md`, `pilot2-vi-report.md`).

I did not apply any of these, nor fix the open translation items, because several are glossary decisions that change the other documents too; fixing them now would just be re-done.

## 4. Measured token usage (second pilot)

| Run | Measured subagent tokens | Notes |
|---|---|---|
| en translator (meta + 4 docs) | 66,341 | est. output ~10K (meta ~3.5k, docs ~6.7k) |
| vi translator (meta + 4 docs) | 78,690 | est. output ~17K (meta ~5.5k, docs ~11.3k) |
| Opus quality review (both locales + titles tier) | 100,039 | |
| 28A + 28B implementation and review rounds | ~0.4M total | one-off tooling, not per-run |

The 4 docs are 11,492 zh characters; the meta (titles tier) is about a third of the translators' output and is a one-off cost.

## 5. Updated projection for the full run

Remaining after the holds and the pilot: **67 docs, 205,399 zh characters** (81 − 10 held − 4 pilot; 76 → 67 docs).

| | en | vi | total |
|---|---|---|---|
| Docs-only subagent tokens (pilot 2 scaled by zh chars, meta removed ≈ 67%) | ~0.80M | ~0.94M | **~1.74M** |
| + retries (pilot rate: 1 of 8 translations retried, ~+10–15%) | | | ~1.95–2.0M |
| + review (sampled, same ratio as pilot 2: ~100K per ~11.5K chars if every doc is reviewed ~1.8M; a 10–15% sample plus all gate-flagged docs) | | | ~0.25–0.45M |
| **Total** | | | **~2.2–2.5M tokens** |

Caveats: pilot 2 is only 11.5K characters, so this extrapolates from small samples; the vi/en ratio (1.18×) and the meta-share assumption carry most of the uncertainty. If the 5 low-risk held docs (rows 6–10 of the audit) are released for translation, add about 17%. If every translated doc is reviewed by Opus rather than sampled, add ~1.8M.

## 6. Glossary files as applied

`content/advanced-java/glossary.en.json`:

```json
{
  "高并发": "high concurrency",
  "分布式系统": "distributed system",
  "分布式": "distributed",
  "高可用": "high availability",
  "微服务": "microservices",
  "海量数据": "large-scale data",
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
  "主从": "master/replica",
  "集群": "cluster",
  "持久化": "persistence",
  "过期": "expiration",
  "消息积压": "message backlog",
  "顺序性": "ordering",
  "重复消费": "duplicate consumption",
  "可靠性": "reliability",
  "接口": "API/interface",
  "临时耦合": "temporal coupling",
  "解耦": "decoupling",
  "削峰": "peak shaving",
  "最终一致性": "eventual consistency",
  "有界上下文": "bounded context",
  "混合持久化": "polyglot persistence",
  "小顶堆": "min-heap",
  "大顶堆": "max-heap",
  "哑管": "dumb pipes",
  "康威定律": "Conway's law",
  "舱壁隔离": "bulkhead isolation",
  "编排": "orchestration",
  "编舞": "choreography",
  "持续交付": "continuous delivery",
  "宕机": "crash/outage",
  "挂起": "hang"
}
```

`content/advanced-java/glossary.vi.json`:

```json
{
  "高并发": "tải đồng thời cao (high concurrency)",
  "分布式系统": "hệ thống phân tán",
  "分布式": "phân tán",
  "高可用": "tính sẵn sàng cao",
  "微服务": "microservices",
  "海量数据": "dữ liệu quy mô lớn",
  "消息队列": "hàng đợi thông điệp (message queue)",
  "幂等性": "tính idempotent",
  "分布式锁": "khóa phân tán",
  "分布式事务": "giao dịch phân tán",
  "熔断": "ngắt mạch (circuit breaking)",
  "断路器": "circuit breaker (bộ ngắt mạch)",
  "降级": "fallback / suy giảm dịch vụ (degradation)",
  "限流": "giới hạn lưu lượng (rate limiting)",
  "缓存": "bộ nhớ đệm (cache)",
  "缓存雪崩": "cache avalanche (tuyết lở bộ nhớ đệm)",
  "缓存穿透": "cache penetration (xuyên thủng bộ nhớ đệm)",
  "分库分表": "sharding (phân mảnh CSDL và bảng)",
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
  "可用性": "tính sẵn sàng",
  "分区容错性": "khả năng chịu phân vùng",
  "主从": "master/replica (master-slave)",
  "集群": "cụm (cluster)",
  "持久化": "lưu trữ bền vững (persistence)",
  "过期": "hết hạn",
  "消息积压": "tồn đọng tin nhắn",
  "顺序性": "tính thứ tự",
  "重复消费": "tiêu thụ trùng lặp",
  "可靠性": "độ tin cậy",
  "接口": "API",
  "临时耦合": "ràng buộc về thời gian (temporal coupling)",
  "万": "chục nghìn",
  "十万": "trăm nghìn",
  "解耦": "tách rời (decoupling)",
  "削峰": "san phẳng đỉnh tải (peak shaving)",
  "最终一致性": "nhất quán cuối cùng (eventual consistency)",
  "有界上下文": "ngữ cảnh có biên (bounded context)",
  "混合持久化": "polyglot persistence (lưu trữ bền vững hỗn hợp)",
  "小顶堆": "min-heap",
  "大顶堆": "max-heap",
  "哑管": "đường ống ngốc (dumb pipes)",
  "康威定律": "định luật Conway (Conway's law)",
  "舱壁隔离": "bulkhead (cô lập theo khoang)",
  "编排": "điều phối (orchestration)",
  "编舞": "phối hợp theo sự kiện (choreography)",
  "持续交付": "phân phối liên tục (continuous delivery)",
  "宕机": "sập",
  "挂起": "treo"
}
```

## 7. Diff of the vi `meta.json` titles (102 changed fields of 185)

Rows show section/group names and, for docs, `docs.title` and `docs.navTitle` that changed from the first pilot (commit ad5a036) to now; unchanged fields are omitted.

| key | zh | previous vi | new vi |
|---|---|---|---|
| sections:high-concurrency | 高并发架构 | Kiến trúc đồng thời cao | Kiến trúc tải đồng thời cao |
| sections:big-data | 海量数据处理 | Xử lý dữ liệu khối lượng lớn | Xử lý dữ liệu quy mô lớn |
| groups:mq-interview | 消息队列 | Hàng đợi tin nhắn | Hàng đợi thông điệp |
| groups:high-concurrency-g4 | 分库分表 | Chia nhỏ cơ sở dữ liệu và bảng | Sharding |
| groups:high-concurrency-g6 | 高并发系统 | Hệ thống đồng thời cao | Hệ thống tải đồng thời cao |
| groups:high-availability-g1 | Hystrix 高可用 | Tính sẵn sàng cao với Hystrix | Hystrix và tính sẵn sàng cao |
| groups:high-availability-g2 | 熔断与降级 | Ngắt mạch và hạ cấp dịch vụ | Ngắt mạch và suy giảm dịch vụ |
| groups:big-data-g1 | 海量数据处理 | Xử lý dữ liệu khối lượng lớn | Xử lý dữ liệu quy mô lớn |
| docs.title:mq-interview | 消息队列面试场景 | Các tình huống phỏng vấn về hàng đợi tin nhắn | Các tình huống phỏng vấn về hàng đợi thông điệp |
| docs.navTitle:mq-interview | 消息队列 | Hàng đợi tin nhắn | Hàng đợi thông điệp |
| docs.title:why-mq | 为什么使用消息队列？ | Tại sao nên dùng hàng đợi tin nhắn? | Tại sao phải sử dụng hàng đợi thông điệp? |
| docs.navTitle:why-mq | 为什么使用消息队列？ | Tại sao nên dùng hàng đợi tin nhắn? | Tại sao dùng hàng đợi thông điệp? |
| docs.title:how-to-ensure-high-availability-of-message-queues | 如何保证消息队列的高可用？ | Làm thế nào để đảm bảo tính sẵn sàng cao của hàng đợi tin nhắn? | Làm thế nào để đảm bảo tính sẵn sàng cao của hàng đợi thông điệp? |
| docs.navTitle:how-to-ensure-high-availability-of-message-queues | 如何保证消息队列的高可用？ | Đảm bảo tính sẵn sàng cao của hàng đợi tin nhắn | Đảm bảo tính sẵn sàng cao của hàng đợi thông điệp |
| docs.title:how-to-ensure-that-messages-are-not-repeatedly-consumed | 如何保证消息不被重复消费？ | Làm thế nào để đảm bảo tin nhắn không bị tiêu thụ trùng lặp? | Làm thế nào để đảm bảo thông điệp không bị tiêu thụ trùng lặp? |
| docs.navTitle:how-to-ensure-that-messages-are-not-repeatedly-consumed | 如何保证消息不被重复消费？ | Tránh tiêu thụ trùng lặp tin nhắn | Tránh tiêu thụ trùng lặp thông điệp |
| docs.title:how-to-ensure-the-reliable-transmission-of-messages | 如何保证消息的可靠性传输？ | Làm thế nào để đảm bảo truyền tin nhắn đáng tin cậy? | Làm thế nào để đảm bảo độ tin cậy khi truyền thông điệp? |
| docs.navTitle:how-to-ensure-the-reliable-transmission-of-messages | 如何保证消息的可靠性传输？ | Truyền tin nhắn đáng tin cậy | Độ tin cậy khi truyền thông điệp |
| docs.title:how-to-ensure-the-order-of-messages | 如何保证消息的顺序性？ | Làm thế nào để đảm bảo tính thứ tự của tin nhắn? | Làm thế nào để đảm bảo tính thứ tự của thông điệp? |
| docs.navTitle:how-to-ensure-the-order-of-messages | 如何保证消息的顺序性？ | Đảm bảo tính thứ tự của tin nhắn | Tính thứ tự của thông điệp |
| docs.title:mq-time-delay-and-expired-failure | 如何解决消息队列的延时以及过期失效问题？ | Làm thế nào để xử lý vấn đề tin nhắn bị trễ và hết hạn trong hàng đợi tin nhắn? | Làm thế nào để xử lý vấn đề độ trễ và thông điệp hết hạn trong hàng đợi thông điệp? |
| docs.navTitle:mq-time-delay-and-expired-failure | 如何解决消息队列的延时及过期问题？ | Xử lý tin nhắn bị trễ và hết hạn | Độ trễ và thông điệp hết hạn |
| docs.title:mq-design | 如何设计一个消息队列？ | Làm thế nào để thiết kế một hàng đợi tin nhắn? | Làm thế nào để thiết kế một hàng đợi thông điệp? |
| docs.navTitle:mq-design | 如何设计一个消息队列？ | Thiết kế một hàng đợi tin nhắn | Thiết kế hàng đợi thông điệp |
| docs.navTitle:es-optimizing-query-performance | ES 查询性能优化 | Tối ưu hiệu năng truy vấn ES | Tối ưu hiệu năng truy vấn của ES |
| docs.title:es-production-cluster | ES 生产集群架构 | Kiến trúc cụm ES trong môi trường production | Kiến trúc cụm ES trên môi trường production |
| docs.navTitle:es-production-cluster | ES 生产集群架构 | Cụm ES trong production | Kiến trúc cụm ES production |
| docs.title:why-cache | 缓存的使用方式 | Cách sử dụng bộ nhớ đệm | Các cách sử dụng bộ nhớ đệm |
| docs.navTitle:redis-single-thread-model | Redis 和 Memcached 区别 | Redis và Memcached khác nhau gì | Redis và Memcached khác nhau thế nào |
| docs.navTitle:redis-data-types | Redis 数据类型和场景 | Kiểu dữ liệu Redis và tình huống dùng | Kiểu dữ liệu Redis và tình huống sử dụng |
| docs.title:how-to-ensure-high-concurrency-and-high-availability-of-redis | 如何保证 redis 的高并发和高可用？ | Làm thế nào để đảm bảo đồng thời cao và tính sẵn sàng cao cho Redis? | Làm thế nào để đảm bảo tải đồng thời cao và tính sẵn sàng cao cho Redis? |
| docs.navTitle:how-to-ensure-high-concurrency-and-high-availability-of-redis | Redis 高并发与高可用 | Redis: đồng thời cao và sẵn sàng cao | Tải đồng thời cao và tính sẵn sàng cao của Redis |
| docs.title:redis-master-slave | Redis 主从架构 | Kiến trúc primary/replica của Redis | Kiến trúc master/replica của Redis |
| docs.navTitle:redis-master-slave | Redis 主从架构 | Kiến trúc primary/replica của Redis | Kiến trúc master/replica của Redis |
| docs.title:redis-sentinel | Redis 哨兵集群实现高可用 | Cụm Sentinel của Redis đảm bảo tính sẵn sàng cao | Đạt tính sẵn sàng cao bằng cụm Sentinel của Redis |
| docs.navTitle:redis-sentinel | 哨兵集群实现高可用 | Cụm Sentinel đảm bảo sẵn sàng cao | Cụm Sentinel và tính sẵn sàng cao |
| docs.navTitle:redis-caching-avalanche-and-caching-penetration | 缓存雪崩穿透击穿 | Avalanche, penetration, breakdown | Cache avalanche, penetration, breakdown |
| docs.title:redis-consistence | 缓存与数据库一致性问题 | Vấn đề nhất quán giữa bộ nhớ đệm và cơ sở dữ liệu | Vấn đề tính nhất quán giữa bộ nhớ đệm và cơ sở dữ liệu |
| docs.navTitle:redis-consistence | 缓存与数据库一致性 | Nhất quán giữa cache và cơ sở dữ liệu | Tính nhất quán giữa bộ nhớ đệm và cơ sở dữ liệu |
| docs.title:redis-production-environment | Redis 生产部署方案 | Phương án triển khai Redis trong production | Phương án triển khai Redis trên môi trường production |
| docs.navTitle:redis-production-environment | Redis 生产部署方案 | Triển khai Redis trong production | Triển khai Redis production |
| docs.title:database-shard | 为什么要分库分表？ | Tại sao cần chia nhỏ cơ sở dữ liệu và bảng? | Tại sao phải dùng sharding? |
| docs.navTitle:database-shard | 为什么要分库分表？ | Tại sao cần sharding? | Tại sao dùng sharding? |
| docs.title:database-shard-global-id-generate | 主键 ID 如何处理？ | Xử lý ID khóa chính như thế nào? | Xử lý khóa chính ID như thế nào? |
| docs.navTitle:database-shard-global-id-generate | 主键 ID 如何处理？ | Xử lý ID khóa chính | Xử lý khóa chính ID |
| docs.title:high-concurrency-design | 如何设计一个高并发系统 | Làm thế nào để thiết kế một hệ thống đồng thời cao | Làm thế nào để thiết kế một hệ thống tải đồng thời cao? |
| docs.navTitle:high-concurrency-design | 如何设计一个高并发系统？ | Thiết kế hệ thống đồng thời cao | Thiết kế hệ thống tải đồng thời cao |
| docs.title:how-to-limit-current | 如何限流？在工作中是怎么做的？说一下具体的实现？ | Làm thế nào để giới hạn lưu lượng? Trong công việc bạn đã làm thế nào? Hãy nói về cách triển khai cụ thể. | Làm thế nào để giới hạn lưu lượng? Bạn đã làm trong công việc ra sao? Hãy nói về cách triển khai cụ thể. |
| docs.title:distributed-system-interview | 分布式系统面试连环炮 | Chuỗi câu hỏi phỏng vấn dồn dập về hệ thống phân tán | Chuỗi câu hỏi phỏng vấn liên hoàn về hệ thống phân tán |
| docs.navTitle:distributed-system-interview | 面试连环炮 | Chuỗi câu hỏi dồn dập | Chuỗi câu hỏi phỏng vấn liên hoàn |
| docs.title:why-dubbo | 为什么要拆分系统？ | Tại sao cần tách hệ thống? | Tại sao phải tách hệ thống? |
| docs.navTitle:why-dubbo | 为什么要拆分系统？ | Tại sao cần tách hệ thống? | Tại sao phải tách hệ thống? |
| docs.title:dubbo-load-balancing | Dubbo 负载均衡策略和集群容错策略 | Chiến lược cân bằng tải và chịu lỗi cụm của Dubbo | Chiến lược cân bằng tải và chiến lược chịu lỗi cụm của Dubbo |
| docs.navTitle:dubbo-load-balancing | Dubbo 负载与容错策略 | Cân bằng tải và chịu lỗi của Dubbo | Cân bằng tải và chịu lỗi cụm của Dubbo |
| docs.navTitle:dubbo-spi | Dubbo 的 SPI 思想 | Tư tưởng SPI của Dubbo | Cơ chế SPI của Dubbo |
| docs.title:dubbo-service-management | 如何基于 Dubbo 进行服务治理 | Làm thế nào để quản trị dịch vụ dựa trên Dubbo | Làm thế nào để quản trị dịch vụ dựa trên Dubbo? |
| docs.navTitle:dubbo-service-management | 服务治理方案 | Phương án quản trị dịch vụ | Quản trị dịch vụ với Dubbo |
| docs.title:distributed-system-idempotency | 分布式服务接口的幂等性如何设计？ | Thiết kế tính idempotent cho giao diện dịch vụ phân tán như thế nào? | Làm thế nào để thiết kế tính idempotent cho API của dịch vụ phân tán? |
| docs.navTitle:distributed-system-idempotency | 接口幂等性设计 | Thiết kế tính idempotent cho giao diện | Thiết kế tính idempotent cho API |
| docs.title:distributed-system-request-sequence | 分布式服务接口请求的顺序性如何保证？ | Làm thế nào để đảm bảo tính thứ tự của các yêu cầu tới giao diện dịch vụ phân tán? | Làm thế nào để đảm bảo tính thứ tự của các yêu cầu tới API của dịch vụ phân tán? |
| docs.navTitle:distributed-system-request-sequence | 接口顺序性设计 | Thiết kế tính thứ tự cho giao diện | Đảm bảo tính thứ tự của yêu cầu tới API |
| docs.navTitle:dubbo-rpc-design | 设计 Dubbo 类似的 RPC 框架 | Thiết kế framework RPC kiểu Dubbo | Thiết kế framework RPC tương tự Dubbo |
| docs.navTitle:distributed-system-cap | CAP 定理中的 P 是什么？ | P trong định lý CAP là gì? | Định lý CAP |
| docs.navTitle:zookeeper-application-scenarios | Zookeeper 应用场景 | Tình huống ứng dụng Zookeeper | Tình huống sử dụng Zookeeper |
| docs.title:distributed-lock-redis-vs-zookeeper | Redis vs Zookeeper 实现分布式锁 | Redis vs Zookeeper khi triển khai khóa phân tán | Triển khai khóa phân tán: Redis và Zookeeper |
| docs.navTitle:distributed-lock-redis-vs-zookeeper | Redis vs Zookeeper 实现分布式锁 | Redis vs Zookeeper cho khóa phân tán | Khóa phân tán: Redis và Zookeeper |
| docs.title:hystrix-introduction | 用 Hystrix 构建高可用服务架构 | Xây dựng kiến trúc dịch vụ có tính sẵn sàng cao bằng Hystrix | Xây dựng kiến trúc dịch vụ có tính sẵn sàng cao với Hystrix |
| docs.navTitle:e-commerce-website-detail-page-architecture | 详情页架构设计 | Kiến trúc trang chi tiết | Kiến trúc trang chi tiết sản phẩm |
| docs.title:hystrix-thread-pool-isolation | 基于 Hystrix 线程池技术实现资源隔离 | Cô lập tài nguyên dựa trên kỹ thuật thread pool của Hystrix | Cô lập tài nguyên bằng thread pool của Hystrix |
| docs.title:hystrix-semphore-isolation | 基于 Hystrix 信号量机制实现资源隔离 | Cô lập tài nguyên dựa trên cơ chế semaphore của Hystrix | Cô lập tài nguyên bằng cơ chế semaphore của Hystrix |
| docs.navTitle:hystrix-process | 执行原理 | Nguyên lý thực thi | Nguyên lý thực thi của Hystrix |
| docs.title:hystrix-request-cache | 基于 request cache 请求缓存技术优化批量商品数据查询接口 | Tối ưu giao diện truy vấn hàng loạt dữ liệu sản phẩm bằng kỹ thuật request cache | Tối ưu API truy vấn dữ liệu sản phẩm hàng loạt bằng request cache |
| docs.navTitle:hystrix-request-cache | Request Cache 缓存 | Request cache | Tối ưu bằng request cache |
| docs.title:hystrix-fallback | 基于本地缓存的 fallback 降级机制 | Cơ chế hạ cấp fallback dựa trên bộ nhớ đệm cục bộ | Cơ chế fallback dựa trên bộ nhớ đệm cục bộ |
| docs.navTitle:hystrix-fallback | 本地降级缓存 | Bộ nhớ đệm hạ cấp cục bộ | Fallback bằng bộ nhớ đệm cục bộ |
| docs.navTitle:hystrix-circuit-breaker | 断路器原理 | Nguyên lý circuit breaker | Nguyên lý của circuit breaker |
| docs.title:hystrix-thread-pool-current-limiting | 深入 Hystrix 线程池隔离与接口限流 | Tìm hiểu sâu cô lập thread pool và giới hạn lưu lượng giao diện của Hystrix | Tìm hiểu sâu cô lập bằng thread pool và giới hạn lưu lượng API trong Hystrix |
| docs.navTitle:hystrix-thread-pool-current-limiting | 限流与线程池隔离 | Giới hạn lưu lượng và cô lập thread pool | Giới hạn lưu lượng và cô lập bằng thread pool |
| docs.title:hystrix-timeout | 基于 timeout 机制为服务接口调用超时提供安全保护 | Bảo vệ an toàn cho việc gọi giao diện dịch vụ bị hết thời gian chờ bằng cơ chế timeout | Bảo vệ việc gọi API dịch vụ khỏi hết thời gian chờ bằng cơ chế timeout |
| docs.navTitle:sentinel-vs-hystrix | Sentinel vs Hystrix | Sentinel vs Hystrix | Sentinel và Hystrix |
| docs.navTitle:migrating-from-a-monolithic-architecture-to-a-microservices-architecture | 从单体到微服务 | Từ monolith sang microservices | Chuyển từ monolith sang microservices |
| docs.title:whats-microservice-how-to-communicate | 什么是微服务？微服务之间是如何独立通讯的？ | Microservices là gì? Các microservices giao tiếp độc lập với nhau như thế nào? | Microservices là gì? Các microservice giao tiếp độc lập với nhau như thế nào? |
| docs.navTitle:whats-microservice-how-to-communicate | 微服务间通信机制 | Cơ chế giao tiếp giữa các microservices | Cách các microservice giao tiếp |
| docs.navTitle:micro-service-governance | 微服务治理策略 | Chiến lược quản trị microservices | Quản trị microservices |
| docs.title:how-eureka-enable-service-discovery-and-service-registration | 服务发现组件 Eureka 的几个主要调用过程 | Các quy trình gọi chính của thành phần service discovery Eureka | Các quy trình gọi chính của thành phần khám phá dịch vụ Eureka |
| docs.navTitle:how-eureka-enable-service-discovery-and-service-registration | Eureka 服务注册发现 | Đăng ký và phát hiện dịch vụ với Eureka | Đăng ký và khám phá dịch vụ của Eureka |
| docs.title:find-common-urls | 如何从大量的 URL 中找出相同的 URL？ | Làm thế nào để tìm các URL trùng nhau trong một lượng lớn URL? | Làm thế nào để tìm các URL trùng nhau trong lượng lớn URL? |
| docs.navTitle:find-common-urls | 查找相同 URL | Tìm URL trùng nhau | Tìm các URL trùng nhau |
| docs.title:find-top-100-words | 如何从大量数据中找出高频词？ | Làm thế nào để tìm các từ xuất hiện nhiều nhất trong lượng lớn dữ liệu? | Làm thế nào để tìm các từ xuất hiện nhiều nhất trong lượng dữ liệu lớn? |
| docs.navTitle:find-top-100-words | 查找高频词 | Tìm từ có tần suất cao | Tìm các từ xuất hiện nhiều nhất |
| docs.title:find-no-repeat-number | 如何在大量的数据中找出不重复的整数？ | Làm thế nào để tìm các số nguyên không lặp trong lượng lớn dữ liệu? | Làm thế nào để tìm các số nguyên không trùng lặp trong lượng dữ liệu lớn? |
| docs.navTitle:find-no-repeat-number | 找出不重复整数 | Tìm số nguyên không lặp | Tìm số nguyên không trùng lặp |
| docs.title:find-a-number-if-exists | 如何在大量的数据中判断一个数是否存在？ | Làm thế nào để kiểm tra một số có tồn tại trong lượng lớn dữ liệu hay không? | Làm thế nào để kiểm tra một số có tồn tại trong lượng dữ liệu lớn hay không? |
| docs.navTitle:find-a-number-if-exists | 判断数是否存在 | Kiểm tra số có tồn tại không | Kiểm tra một số có tồn tại không |
| docs.title:find-hotest-query-string | 如何查询最热门的查询串？ | Làm thế nào để tìm chuỗi truy vấn phổ biến nhất? | Làm thế nào để truy vấn các chuỗi truy vấn phổ biến nhất? |
| docs.navTitle:find-hotest-query-string | 查询最热门查询串 | Tìm chuỗi truy vấn phổ biến nhất | Truy vấn chuỗi truy vấn phổ biến nhất |
| docs.navTitle:sort-the-query-strings-by-counts | 根据频率排序查询串 | Sắp xếp chuỗi truy vấn theo tần suất | Sắp xếp query theo tần suất |
| docs.title:topk-problems-and-solutions | 大数据中 TopK 问题的常用套路 | Các cách tiếp cận thường dùng cho bài toán TopK trong dữ liệu lớn | Các hướng giải thường dùng cho bài toán TopK trong dữ liệu lớn |
| docs.navTitle:topk-problems-and-solutions | 讲讲大数据中 TopK 问题的常用套路？ | Cách tiếp cận thường dùng cho bài toán TopK | Hướng giải bài toán TopK |
| docs.navTitle:redis-rehash | 有了解过 Redis rehash 的过程吗？ | Bạn có hiểu quá trình rehash của Redis không? | Quá trình rehash của Redis |
| docs.title:advantages-and-disadvantages-of-microservice | 微服务架构的优势与不足 | Ưu điểm và hạn chế của kiến trúc microservices | Ưu điểm và nhược điểm của kiến trúc microservices |
| docs.navTitle:advantages-and-disadvantages-of-microservice | 微服务架构的优势与不足 | Ưu điểm và hạn chế của microservices | Ưu và nhược điểm của microservices |

## 8. Decisions I need from you

1. **Open translation findings V1–V3 and the glossary additions** in section 3: approve, edit or reject. If you approve V1 (single 降级 term) and V3 I will apply them, fix the 9 meta titles and the Minor items, and re-stamp the 4 docs (about 0.15M tokens) so the corpus is consistent before the full run.
2. **navTitle policy** for both locales (one policy: shortened title, or equal to the title, or an explicit nav-label style).
3. **Audit decisions per doc** (section 2): rows 1–5 default exclude; rows 6–10 translate / rewrite / exclude. Row 10 needs a source check first (I can do it).
4. **Titles of held docs** in the nav: keep translated, or leave in zh.
5. **Credit URLs** (rows 1–5): unverified; please confirm or give me the canonical ones.
6. **Full run approval** (Task 26): not started.
