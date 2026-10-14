# Import report

- upstream: https://github.com/doocs/advanced-java @ 1a35221e471fa3adf8997895268fd18b36f27c01
- docs imported: 81
- sections: high-concurrency, distributed-system, high-availability, micro-services, big-data
- images copied: 125 (126 image references)
- note: one image removed on 2026-10-14: 220px-Internet_dog.jpg, third-party cartoon, low resolution

## Skipped files
- docs/big-data/README.md: section index, generated from collection.json
- docs/distributed-system/README.md: section index, generated from collection.json
- docs/extra-page/README.md: promo section index, not imported
- docs/extra-page/advanced.md: promo page, not imported
- docs/extra-page/offer.md: promo page, not imported
- docs/extra-page/rights-defending-action.md: promo page, not imported
- docs/extra-page/subscriptions-for-doocs.md: promo page, not imported
- docs/high-availability/README.md: section index, generated from collection.json
- docs/high-concurrency/README.md: section index, generated from collection.json
- docs/index.md: home page replaced by our own
- docs/micro-services/README.md: section index, generated from collection.json

## Unlisted docs placed via root README (3)
- docs/big-data/topk-problems-and-solutions.md (placed after docs/big-data/find-rank-top-500-numbers.md)
- docs/high-concurrency/redis-rehash.md (placed after docs/high-concurrency/redis-production-environment.md)
- docs/micro-services/advantages-and-disadvantages-of-microservice.md (placed after docs/micro-services/choose-microservice-deployment-strategy.md)

## External sidebar entries skipped
- none

## Renamed slugs
- docs/micro-services/what's-microservice-how-to-communicate.md -> whats-microservice-how-to-communicate

## H1 differs from sidebar title (54); both kept (docTitle / navTitle)
- mq-interview: "消息队列面试场景" vs "消息队列"
- mq-time-delay-and-expired-failure: "如何解决消息队列的延时以及过期失效问题？" vs "如何解决消息队列的延时及过期问题？"
- es-introduction: "搜索引擎介绍" vs "搜索引擎"
- redis-single-thread-model: "Redis 和 Memcached 的区别" vs "Redis 和 Memcached 区别"
- redis-data-types: "Redis 数据类型和使用场景" vs "Redis 数据类型和场景"
- redis-expiration-policies-and-lru: "Redis 的过期策略和 LRU 算法" vs "Redis 过期策略"
- how-to-ensure-high-concurrency-and-high-availability-of-redis: "如何保证 redis 的高并发和高可用？" vs "Redis 高并发与高可用"
- redis-sentinel: "Redis 哨兵集群实现高可用" vs "哨兵集群实现高可用"
- redis-caching-avalanche-and-caching-penetration: "缓存雪崩、穿透和击穿" vs "缓存雪崩穿透击穿"
- redis-consistence: "缓存与数据库一致性问题" vs "缓存与数据库一致性"
- redis-cas: "Redis 的并发竞争问题" vs "Redis 并发竞争问题"
- high-concurrency-design: "如何设计一个高并发系统" vs "如何设计一个高并发系统？"
- how-to-limit-current: "如何限流？在工作中是怎么做的？说一下具体的实现？" vs "限流实现方式"
- distributed-system-interview: "分布式系统面试连环炮" vs "面试连环炮"
- dubbo-operating-principle: "Dubbo 的工作原理" vs "Dubbo 工作原理"
- dubbo-serialization-protocol: "Dubbo 的序列化协议" vs "Dubbo 序列化协议"
- dubbo-load-balancing: "Dubbo 负载均衡策略和集群容错策略" vs "Dubbo 负载与容错策略"
- dubbo-spi: "Dubbo 的 SPI 机制" vs "Dubbo 的 SPI 思想"
- dubbo-service-management: "如何基于 Dubbo 进行服务治理" vs "服务治理方案"
- distributed-system-idempotency: "分布式服务接口的幂等性如何设计？" vs "接口幂等性设计"
- distributed-system-request-sequence: "分布式服务接口请求的顺序性如何保证？" vs "接口顺序性设计"
- dubbo-rpc-design: "设计一个类似 Dubbo 的 RPC 框架" vs "设计 Dubbo 类似的 RPC 框架"
- distributed-system-cap: "分布式系统中的 CAP 定理" vs "CAP 定理中的 P 是什么？"
- zookeeper-application-scenarios: "Zookeeper 的使用场景" vs "Zookeeper 应用场景"
- hystrix-introduction: "用 Hystrix 构建高可用服务架构" vs "Hystrix 介绍"
- e-commerce-website-detail-page-architecture: "电商网站的商品详情页系统架构" vs "详情页架构设计"
- hystrix-thread-pool-isolation: "基于 Hystrix 线程池技术实现资源隔离" vs "线程池隔离"
- hystrix-semphore-isolation: "基于 Hystrix 信号量机制实现资源隔离" vs "信号量隔离"
- hystrix-execution-isolation: "Hystrix 隔离策略细粒度控制" vs "细粒度隔离策略"
- hystrix-process: "深入 Hystrix 执行时内部原理" vs "执行原理"
- hystrix-request-cache: "基于 request cache 请求缓存技术优化批量商品数据查询接口" vs "Request Cache 缓存"
- hystrix-fallback: "基于本地缓存的 fallback 降级机制" vs "本地降级缓存"
- hystrix-circuit-breaker: "深入 Hystrix 断路器执行原理" vs "断路器原理"
- hystrix-thread-pool-current-limiting: "深入 Hystrix 线程池隔离与接口限流" vs "限流与线程池隔离"
- hystrix-timeout: "基于 timeout 机制为服务接口调用超时提供安全保护" vs "Timeout 保护机制"
- sentinel-vs-hystrix: "如何做技术选型？Sentinel 还是 Hystrix？" vs "Sentinel vs Hystrix"
- microservices-introduction: "关于微服务架构的描述" vs "微服务架构描述"
- migrating-from-a-monolithic-architecture-to-a-microservices-architecture: "迁移到微服务综述" vs "从单体到微服务"
- event-driven-data-management-for-microservices: "微服务的事件驱动数据管理" vs "事件驱动数据管理"
- choose-microservice-deployment-strategy: "选择微服务部署策略" vs "选择部署策略"
- whats-microservice-how-to-communicate: "什么是微服务？微服务之间是如何独立通讯的？" vs "微服务间通信机制"
- how-eureka-enable-service-discovery-and-service-registration: "服务发现组件 Eureka 的几个主要调用过程" vs "Eureka 服务注册发现"
- find-common-urls: "如何从大量的 URL 中找出相同的 URL？" vs "查找相同 URL"
- find-top-100-words: "如何从大量数据中找出高频词？" vs "查找高频词"
- find-top-1-ip: "如何找出某一天访问百度网站最多的 IP？" vs "找出最多访问 IP"
- find-no-repeat-number: "如何在大量的数据中找出不重复的整数？" vs "找出不重复整数"
- find-a-number-if-exists: "如何在大量的数据中判断一个数是否存在？" vs "判断数是否存在"
- find-hotest-query-string: "如何查询最热门的查询串？" vs "查询最热门查询串"
- count-different-phone-numbers: "如何统计不同电话号码的个数？" vs "统计不同手机号"
- find-mid-value-in-500-millions: "如何从 5 亿个数中找出中位数？" vs "找出中位数"
- sort-the-query-strings-by-counts: "如何按照 query 的频度排序？" vs "根据频率排序查询串"
- find-rank-top-500-numbers: "如何找出排名前 500 的数？" vs "找出前 500 个数"
- topk-problems-and-solutions: "大数据中 TopK 问题的常用套路" vs "讲讲大数据中 TopK 问题的常用套路？"
- redis-rehash: "Redis rehash 过程" vs "有了解过 Redis rehash 的过程吗？"

## Images (provenance unknown; see content/ASSETS.md)
- high-concurrency/why-mq/mq-1.png (10668 bytes)
- high-concurrency/why-mq/mq-2.png (14880 bytes)
- high-concurrency/why-mq/mq-3.png (8189 bytes)
- high-concurrency/why-mq/mq-4.png (13826 bytes)
- high-concurrency/why-mq/mq-5.png (3762 bytes)
- high-concurrency/why-mq/mq-6.png (8419 bytes)
- high-concurrency/how-to-ensure-high-availability-of-message-queues/mq-7.png (22003 bytes)
- high-concurrency/how-to-ensure-high-availability-of-message-queues/mq-8.png (10275 bytes)
- high-concurrency/how-to-ensure-high-availability-of-message-queues/kafka-before.png (6278 bytes)
- high-concurrency/how-to-ensure-high-availability-of-message-queues/kafka-after.png (18796 bytes)
- high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed/mq-10.png (10436 bytes)
- high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed/mq-11.png (6617 bytes)
- high-concurrency/how-to-ensure-the-reliable-transmission-of-messages/rabbitmq-message-lose.png (16808 bytes)
- high-concurrency/how-to-ensure-the-reliable-transmission-of-messages/rabbitmq-message-lose-solution.png (14139 bytes)
- high-concurrency/how-to-ensure-the-order-of-messages/rabbitmq-order-01.png (7715 bytes)
- high-concurrency/how-to-ensure-the-order-of-messages/kafka-order-01.png (12016 bytes)
- high-concurrency/how-to-ensure-the-order-of-messages/rabbitmq-order-02.png (8709 bytes)
- high-concurrency/how-to-ensure-the-order-of-messages/kafka-order-02.png (17119 bytes)
- high-concurrency/es-introduction/es-cluster-0.png (4543 bytes)
- high-concurrency/es-architecture/es-index-type-mapping-document-field.png (4800 bytes)
- high-concurrency/es-architecture/es-cluster.png (21201 bytes)
- high-concurrency/es-write-query-search/es-write.png (20409 bytes)
- high-concurrency/es-write-query-search/es-write-detail.png (28080 bytes)
- high-concurrency/es-optimizing-query-performance/es-search-process.png (11336 bytes)
- high-concurrency/redis-single-thread-model/redis-single-thread-model.png (35122 bytes)
- high-concurrency/redis-expiration-policies-and-lru/lru.png (26222 bytes)
- high-concurrency/redis-expiration-policies-and-lru/lru-cache.png (29585 bytes)
- high-concurrency/redis-master-slave/redis-master-slave.png (6467 bytes)
- high-concurrency/redis-master-slave/redis-master-slave-replication.png (7984 bytes)
- high-concurrency/redis-master-slave/redis-master-slave-replication-detail.png (21852 bytes)
- high-concurrency/redis-sentinel/async-replication-data-lose-case.png (7441 bytes)
- high-concurrency/redis-sentinel/redis-cluster-split-brain.png (8918 bytes)
- high-concurrency/redis-cluster/zookeeper-centralized-storage.png (3923 bytes)
- high-concurrency/redis-cluster/redis-gossip.png (3154 bytes)
- high-concurrency/redis-cluster/hash.png (3772 bytes)
- high-concurrency/redis-cluster/consistent-hashing-algorithm.png (111128 bytes)
- high-concurrency/redis-cluster/hash-slot.png (3944 bytes)
- high-concurrency/redis-caching-avalanche-and-caching-penetration/redis-caching-avalanche.png (11258 bytes)
- high-concurrency/redis-caching-avalanche-and-caching-penetration/redis-caching-avalanche-solution.png (19192 bytes)
- high-concurrency/redis-caching-avalanche-and-caching-penetration/redis-caching-penetration.png (11976 bytes)
- high-concurrency/redis-caching-avalanche-and-caching-penetration/redis-caching-avoid-penetration.png (7119 bytes)
- high-concurrency/redis-consistence/redis-junior-inconsistent.png (5064 bytes)
- high-concurrency/redis-cas/zookeeper-distributed-lock.png (8658 bytes)
- high-concurrency/database-shard/database-split-horizon.png (5349 bytes)
- high-concurrency/database-shard/database-split-vertically.png (3761 bytes)
- high-concurrency/database-shard-method/database-shard-method-1.png (17364 bytes)
- high-concurrency/database-shard-method/database-shard-method-2.png (22256 bytes)
- high-concurrency/database-shard-global-id-generate/database-id-sequence-step.png (12463 bytes)
- high-concurrency/mysql-read-write-separation/mysql-master-slave.png (9442 bytes)
- high-concurrency/high-concurrency-design/high-concurrency-system-design.png (25442 bytes)
- distributed-system/distributed-system-interview/simple-distributed-system-oa.png (16457 bytes)
- distributed-system/dubbo-operating-principle/dubbo-operating-principle.png (59665 bytes)
- distributed-system/dubbo-serialization-protocol/serialize-deserialize.png (5019 bytes)
- distributed-system/dubbo-serialization-protocol/dubbo-keep-connection.png (8697 bytes)
- distributed-system/dubbo-serialization-protocol/dubbo-not-keep-connection.png (4884 bytes)
- distributed-system/dubbo-spi/dubbo-spi.png (11090 bytes)
- distributed-system/dubbo-service-management/dubbo-service-invoke-road.png (6972 bytes)
- distributed-system/distributed-system-request-sequence/distributed-system-request-sequence.png (15281 bytes)
- distributed-system/zookeeper-application-scenarios/zookeeper-distributed-coordination.png (15183 bytes)
- distributed-system/zookeeper-application-scenarios/zookeeper-distributed-lock-demo.png (14757 bytes)
- distributed-system/zookeeper-application-scenarios/zookeeper-meta-data-manage.png (14700 bytes)
- distributed-system/zookeeper-application-scenarios/zookeeper-active-standby.png (12534 bytes)
- distributed-system/distributed-lock-redis-vs-zookeeper/redis-redlock.png (4548 bytes)
- distributed-system/distributed-transaction/distributed-transaction-XA.png (6333 bytes)
- distributed-system/distributed-transaction/distributed-transaction-TCC.png (15888 bytes)
- distributed-system/distributed-transaction/distributed-transaction-saga.png (81788 bytes)
- distributed-system/distributed-transaction/distributed-transaction-local-message-table.png (32554 bytes)
- distributed-system/distributed-transaction/distributed-transaction-reliable-message.png (40896 bytes)
- high-availability/hystrix-introduction/service-invoke-road.png (3765 bytes)
- high-availability/e-commerce-website-detail-page-architecture/e-commerce-website-detail-page-architecture-1.png (8356 bytes)
- high-availability/e-commerce-website-detail-page-architecture/e-commerce-website-detail-page-architecture-2.png (17225 bytes)
- high-availability/hystrix-thread-pool-isolation/hystrix-thread-pool-isolation.png (5914 bytes)
- high-availability/hystrix-semphore-isolation/hystrix-semphore.png (6385 bytes)
- high-availability/hystrix-semphore-isolation/hystrix-semphore-thread-pool.png (5230 bytes)
- high-availability/hystrix-execution-isolation/hystrix-thread-pool-queue.png (2399 bytes)
- high-availability/hystrix-process/new-hystrix-process.jpg (44600 bytes)
- high-availability/hystrix-request-cache/hystrix-request-cache.png (13181 bytes)
- high-availability/hystrix-circuit-breaker/hystrix-circuit-breaker-state-machine.png (84886 bytes)
- high-availability/hystrix-thread-pool-current-limiting/hystrix-process.png (31384 bytes)
- high-availability/hystrix-thread-pool-current-limiting/bulkhead-partition.jpg (6799 bytes)
- high-availability/sentinel-vs-hystrix/Slow-Start-Preheating-Mode.jpg (22250 bytes)
- high-availability/sentinel-vs-hystrix/Homogenizer-mode.jpg (25225 bytes)
- high-availability/sentinel-vs-hystrix/BRP.jpg (7073 bytes)
- high-availability/sentinel-vs-hystrix/Sentinel-Dashboard.jpg (60092 bytes)
- micro-services/microservices-introduction/sketch.png (45683 bytes)
- micro-services/microservices-introduction/conways-law.png (39190 bytes)
- micro-services/microservices-introduction/PreferFunctionalStaffOrganization.png (57277 bytes)
- micro-services/microservices-introduction/decentralised-data.png (51380 bytes)
- micro-services/microservices-introduction/basic-pipeline.png (31579 bytes)
- micro-services/microservices-introduction/micro-deployment.png (34142 bytes)
- micro-services/migrating-from-a-monolithic-architecture-to-a-microservices-architecture/Law-of-Holes.png (95707 bytes)
- micro-services/migrating-from-a-monolithic-architecture-to-a-microservices-architecture/Before-and-after-migration.png (93736 bytes)
- micro-services/migrating-from-a-monolithic-architecture-to-a-microservices-architecture/30103116_ZCcM.png (244155 bytes)
- micro-services/event-driven-data-management-for-microservices/Private-table-of-the-corresponding-service.png (70180 bytes)
- micro-services/event-driven-data-management-for-microservices/Order-Created-Event.png (86735 bytes)
- micro-services/event-driven-data-management-for-microservices/Credit-Reserved-Event.png (90134 bytes)
- micro-services/event-driven-data-management-for-microservices/Status-is-OPEN.png (86118 bytes)
- micro-services/event-driven-data-management-for-microservices/pre-join.png (80855 bytes)
- micro-services/event-driven-data-management-for-microservices/multi-step-process.png (74857 bytes)
- micro-services/event-driven-data-management-for-microservices/No-2PC-required.png (66744 bytes)
- micro-services/event-driven-data-management-for-microservices/Event-sourcing.png (49478 bytes)
- micro-services/choose-microservice-deployment-strategy/deployment-strategy-1.png (139032 bytes)
- micro-services/choose-microservice-deployment-strategy/deployment-strategy-2.png (79205 bytes)
- micro-services/choose-microservice-deployment-strategy/deployment-strategy-3.png (84047 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-homepage.png (134029 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-instance-registered-currently.png (45581 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-applicationresource-addinstance.png (336426 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-registry-structure.png (85457 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-register-sequence-chart.png (147840 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-instanceresource-renew.png (397873 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-renew-sequence-chart.png (143731 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-instanceresource-cancellease.png (245561 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-cancellease-sequence-chart.png (141416 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-evict-sequence-chart.png (126165 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-provider-renew-sequence-chart.png (89531 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-provider-cancel-sequence-chart.png (107406 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-consumer-fetchregistry.png (277725 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-consumer-fetch-sequence-chart.png (112627 bytes)
- micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-consumer-update-sequence-chart.png (142673 bytes)
- big-data/topk-problems-and-solutions/topk-trie.png (149623 bytes)
- micro-services/advantages-and-disadvantages-of-microservice/monolithic-application-architecture-diagram.png (111515 bytes)
- micro-services/advantages-and-disadvantages-of-microservice/deal-with-complex-things-1.png (157409 bytes)
- micro-services/advantages-and-disadvantages-of-microservice/deal-with-complex-things-2.png (46746 bytes)
- micro-services/advantages-and-disadvantages-of-microservice/deal-with-complex-things-3.png (142556 bytes)
- micro-services/advantages-and-disadvantages-of-microservice/deal-with-complex-things-4.png (102776 bytes)


## Redrawn diagrams

81 of the 125 upstream images are replaced in the documents by diagrams redrawn
for this site (`content/advanced-java/_diagrams/`). Each was redrawn from the
upstream image at commit 1a35221 (doocs/advanced-java), CC-BY-SA-4.0; original
authorship is not documented upstream. All 81 diagram files carry
`license: derived`. They are credited individually on `/about`.

The replaced upstream rasters remain in `_assets` for the diagram review route
only; they are not copied to the public build (`DIAGRAM_REVIEW=1` copies them).
The remaining 44 rasters are served as before.
