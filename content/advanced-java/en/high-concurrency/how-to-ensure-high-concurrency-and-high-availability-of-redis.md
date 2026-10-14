---
source:
  locale: zh
  slug: how-to-ensure-high-concurrency-and-high-availability-of-redis
  hash: 'sha256:v1:dcbb285b6ccf23c14105f07f3cefc33bba99002a312b70990cbd5d2953e6d615'
status: machine
translatedAt: '2026-10-14'
---
# How to Ensure High Concurrency and High Availability of Redis?

## Interview question

How do you ensure high concurrency and high availability of Redis? Can you describe the principle of Redis master/replica replication? Can you describe the principle of Redis Sentinel?

## Interviewer Psychology

This question mainly tests how much high concurrency a single Redis node can carry. If a single node cannot cope, how do you scale out to handle more concurrency? Can Redis go down? And since it can, how do you ensure that Redis is highly available?

These are all problems you must consider in a project. If you have never considered them, you clearly think too little about problems in production systems.

## Answer analysis

If you use Redis as a cache, you must consider how to add more machines to Redis to ensure high concurrency, and how to ensure that Redis does not simply die once it goes down, that is, Redis high availability.

Because this topic has a lot of content, it is split into two sections.

-   [Redis master/replica architecture](doc:advanced-java/high-concurrency/redis-master-slave)
-   [Redis high availability based on Sentinel](doc:advanced-java/high-concurrency/redis-sentinel)

Redis achieves **high concurrency** mainly through a **master/replica architecture**, with one master and multiple replicas. Generally this is enough for many projects: the single master handles writes, at tens of thousands of QPS per node, and multiple replicas handle queries, where multiple replica instances can provide 100,000 QPS per second.

If you want to hold a large amount of data while also achieving high concurrency, you need a Redis cluster. With a Redis cluster, you can provide hundreds of thousands of concurrent reads and writes per second.

For Redis high availability, if you deploy a master/replica architecture, adding Sentinel is enough: if any instance crashes, a failover can take place.
