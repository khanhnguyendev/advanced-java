# Pilot report: titles tier + 5-doc translation (Task 22)

Date: 2026-10-14. Status: **waiting for owner approval before the full run (Task 26).**
Everything below is machine translation (`status: machine`). Nothing was marked `reviewed`.

## 1. The translated files

Titles tier (all 81 docs, 5 sections, groups):
- `content/advanced-java/en/meta.json`
- `content/advanced-java/vi/meta.json`

Pilot docs (zh → en and zh → vi, each translated directly from zh):

| Doc | en | vi |
|---|---|---|
| high-concurrency / why-mq | `content/advanced-java/en/high-concurrency/why-mq.md` | `content/advanced-java/vi/high-concurrency/why-mq.md` |
| distributed-system / distributed-system-cap | `…/en/distributed-system/distributed-system-cap.md` | `…/vi/distributed-system/distributed-system-cap.md` |
| high-availability / hystrix-introduction | `…/en/high-availability/hystrix-introduction.md` | `…/vi/high-availability/hystrix-introduction.md` |
| micro-services / microservices-introduction | `…/en/micro-services/microservices-introduction.md` | `…/vi/micro-services/microservices-introduction.md` |
| big-data / find-top-1-ip | `…/en/big-data/find-top-1-ip.md` | `…/vi/big-data/find-top-1-ip.md` |

Please read the **Vietnamese** pilot docs. The three most informative are `why-mq` (interview Q&A voice), `hystrix-introduction` (tutorial voice) and `microservices-introduction` (long, 15.6K zh chars).

## 2. Gate results and review

`pnpm check:translations`:

```
advanced-java: checked 10 translation(s); 0 error(s), 0 warning(s), 0 stale, 0 reviewed-changed
```

Stamp attempts (a rejected stamp writes nothing): all docs 1 attempt except `distributed-system-cap` (2 attempts in both locales, rejected on `[inline-code]` for a span containing 一致性).

Independent quality review (Opus reviewer, read-only) verdicts: **en usable with fixes; vi usable with fixes.** Structure is intact in all 10 files (same headings, link/asset targets, table shapes; meta key sets identical).

Applied after review: the one Critical finding (vi `hystrix-introduction`: "数十亿次" had become "hàng chục tỷ", a changed figure) is fixed ("hàng tỷ lượt gọi") and re-stamped; gate still 0 errors.

**Not applied (needs your decision, see section 6):**
- *Rule 3 vs rule 7 conflict:* a zh term inside an inline code span (`一致性` in distributed-system-cap) must stay byte-identical (gate), but "no Han in prose" asks for translation. Translators kept the span and added a gloss outside it ("(consistency)" / "(tính nhất quán)"). One Han span therefore remains in each locale.
- *en `microservices-introduction` reads near-verbatim like Martin Fowler's original article* (the zh source is itself a translation of it). Content and licensing question for the owner; the vi version follows zh's own mistranslations ("không phải vấn đề nào cũng là cái búa", "module hóa dây chuyền sản xuất", "phấn khích đến run người" where the original means dread).
- vi terminology: "temporal coupling" → "ràng buộc tạm thời" (wrong, means temporary); 接口 → "giao diện" (reads as UI; should be "API"); zh number units kept ("1w", "vạn"); "hang" vs "crash" merged in hystrix; two words for availability ("tính khả dụng" vs "tính sẵn sàng cao"); 降级 → "hạ cấp" (the meta title "Bộ nhớ đệm hạ cấp cục bộ" makes no sense).
- en meta title ≠ H1 for microservices-introduction ("Describing…" vs "A Description of…"); a few awkward en meta titles; vi navTitle policy inconsistent.

## 3. Glossary as it stands

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

Terms the translators improvised (not in the glossary): 解耦 decoupling / tách rời; 削峰 peak shaving / san phẳng đỉnh tải; 最终一致性 eventual consistency / nhất quán cuối cùng; 有界上下文 Bounded Context / ngữ cảnh có biên; 混合持久化 Polyglot Persistence; 小顶堆/大顶堆 min-heap/max-heap; 哑管 dumb pipes / đường ống ngốc; 康威定律 định luật Conway; 舱壁隔离 bulkhead; 编排 orchestration/choreography; 持续交付 phân phối liên tục.

**Proposed glossary changes (NOT applied; yours to approve):**

| zh | current | proposed |
|---|---|---|
| 主从 | en/vi primary/replica | en "master-replica"; vi "master-slave (master-replica)" |
| 消息队列 | vi hàng đợi tin nhắn | vi "message queue (MQ)" or "hàng đợi thông điệp" ("tin nhắn" reads as SMS/chat) |
| 可用性 / 高可用 | vi tính khả dụng / tính sẵn sàng cao | "tính sẵn sàng" / "tính sẵn sàng cao" everywhere |
| 降级 | vi hạ cấp dịch vụ | "fallback / suy giảm dịch vụ (degradation)" |
| 海量数据 | en massive data; vi dữ liệu khối lượng lớn | en "large-scale data"; vi "dữ liệu quy mô lớn" |
| 高并发 | vi đồng thời cao | "tải đồng thời cao (high concurrency)" |
| 分库分表 | vi chia nhỏ cơ sở dữ liệu và bảng | "sharding (phân mảnh CSDL và bảng)" |
| 接口 (new) | none | en "API/interface"; vi "API" |
| 临时耦合 (new) | none | en "temporal coupling"; vi "ràng buộc về thời gian (temporal coupling)" |
| 万 / 十万 (new) | none | vi "chục nghìn" / "trăm nghìn"; never "vạn" or "w" |

## 4. Measured token usage

Only whole-subagent totals are measured (they include reading the prompt, the source, tool calls and retries). Per-document output tokens are the translators' character-based estimates.

| Run | Measured subagent tokens | Estimated output tokens (docs + meta) |
|---|---|---|
| en translator (meta + 5 docs) | 91,733 | ~24,000 (meta ~5k; docs 4.5k, 2.5k+retry, 2k, 9k, 0.5k) |
| vi translator (meta + 5 docs) | 112,078 | ~39,000 (meta ~6.5k; docs 7k, 5k incl. retry, 2.2k, 18k, 0.5k) |
| critical vi fix | 29,654 | negligible |
| Opus quality review of the 10 files + meta | 131,759 | n/a |

Corpus sizes: zh pilot docs 27,080 chars (of 281,490 total, 9.4% of the corpus, but `microservices-introduction` alone is 58% of the pilot). Output size: en 65,481 chars (2.42× zh), vi 66,537 chars (2.46× zh).

## 5. Projected cost for the remaining 76 docs × 2 locales

Method: scale the pilot by zh characters (254,410 remaining ÷ 27,080 = 9.4×). Titles tier is already done.

| | en | vi | total |
|---|---|---|---|
| Estimated output tokens (docs only) | ~170K | ~300K | ~470K |
| Whole-subagent tokens (scaled from measured) | ~0.8M | ~1.0M | **~1.8M** |
| + retries (pilot rate: 1 of 5 docs retried once, ~+15%) | | | ~2.1M |
| + review pass (reviewer on gate-flagged docs and a 10% sample) | | | ~+0.3–0.5M |

Assumptions: the glossary changes above are applied first (so the 10 pilot docs + titles tier should be re-run for consistency: ~0.25M); the retry rate stays near the pilot's; batches of ≤10 docs per translator. These are estimates; the pilot is dominated by one long document, so real per-char cost for typical short docs may be lower.

## 6. Decisions I need from you

1. **Glossary:** approve, edit or reject the proposed changes in section 3. I recommend applying them, then re-running the titles tier and the 5 pilot docs (≈0.25M tokens) before the full run, so the corpus is consistent.
2. **Rule 3 vs 7 (Han inside inline code):** accept the current behaviour (gloss outside the span, one Han span left), or add a reviewed exception, or change the prompt rule to allow replacing the span. Recommendation: accept; it affects very few docs.
3. **`microservices-introduction`:** the zh source is a translation of Martin Fowler's article and the en output tracks the original closely. Options: keep (attribution to upstream is already on every page), exclude this doc from translation, or regenerate. Your call.
4. **Approve the full run (Task 26)?** Not started. It does not start without your explicit approval.
