---
source:
  locale: zh
  slug: why-cache
  hash: 'sha256:v1:7750a3354c6b7cf4607c720e77fa536de876140e4a870b55230677da2975dcd2'
status: machine
translatedAt: '2026-10-14'
---
# How to Use a Cache

## Interview question

How is the cache used in your project? Why use a cache? What consequences can improper cache use cause?

## Interviewer Psychology

Internet companies always ask this question. If someone does not even understand caches, that is truly awkward.

Whenever caches come up, the first question is always where your project uses a cache, why it is used, whether it could work without one, and what bad consequences might follow once it is in place.

This tests whether you have thought about what lies behind the cache. If you simply use it blindly and cannot give the interviewer a reasonable explanation, the interviewer will certainly form a poor impression and conclude that you think too little and just do the work.

## Answer analysis

### How is the cache used in your project?

For this, you need to tie it to the business of your own project.

### Why use a cache?

A cache has two main purposes: **high performance** and **high concurrency**.

#### High performance

Suppose a request comes in and you laboriously run all sorts of messy operations against MySQL, and after a long time you get a result that takes 600ms. But that result may not change for the next few hours, or if it changes, it does not need to be reflected to users immediately. What do you do?

Use a cache. Throw the result that cost you 600ms into the cache, with one key corresponding to one value. The next time someone queries it, skip the 600ms of MySQL work and fetch the value by key directly from the cache, done in 2ms. That is a 300x performance improvement.

In other words, for results that need complex, time-consuming operations to produce, are sure not to change much later, and receive many read requests, put the query result directly into the cache and read from the cache afterwards.

#### High concurrency

MySQL is a heavy database that was never designed for high concurrency. You can make it work, but it naturally does not support it well. A single MySQL node starts to trigger alerts at around `2000QPS`.

So if you have a system that receives 10,000 requests per second at peak, a single MySQL node will definitely go down. At that point you have to use a cache and put a lot of data in it rather than in MySQL. A cache has simple functionality, essentially `key-value` operations, and a single node easily supports tens of thousands to over a hundred thousand concurrent requests per second, so supporting high concurrency is easy. A single cache node carries dozens of times the concurrency of a single MySQL node.

> A cache runs in memory, and memory naturally supports high concurrency.

### What bad consequences can using a cache cause?

The common cache problems are the following:

-   [Cache and database dual-write inconsistency](doc:advanced-java/high-concurrency/redis-consistence)
-   [Cache avalanche, cache penetration, and cache breakdown](doc:advanced-java/high-concurrency/redis-caching-avalanche-and-caching-penetration)
-   [Cache concurrency contention](doc:advanced-java/high-concurrency/redis-cas)

Click the links to view the cache-related problems and their solutions directly.
