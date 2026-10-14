---
source:
  locale: zh
  slug: redis-caching-avalanche-and-caching-penetration
  hash: 'sha256:v1:939e5a97f7c255268f474035e9f75f0107688d1b2f5f0829f89d2918bad396b8'
status: machine
translatedAt: '2026-10-14'
---
# Cache Avalanche, Penetration, and Breakdown

## Interview question

Do you know what Redis avalanche, penetration and breakdown are? What happens after Redis collapses? How should the system deal with this situation? How do you handle Redis penetration?

## Interviewer psychology

This is in fact a question that always comes up whenever caching is discussed, because cache avalanche and cache penetration are the two biggest problems of a cache: either they never occur, or once they do they are fatal problems. So the interviewer is bound to ask you about them.

## Answer analysis

### Cache avalanche

Take system A. Suppose it receives 5,000 requests per second at the daily peak, and the cache could originally withstand 4,000 requests per second at peak, but the cache machines unexpectedly suffer a complete outage. The cache goes down, and now all 5,000 requests per second fall on the database. The database certainly cannot hold; it raises an alert and then goes down. At this point, if no special scheme is in place to handle the failure, the DBA is anxious and restarts the database, but the database is immediately killed again by the new traffic.

This is a cache avalanche.

![redis-caching-avalanche](asset:high-concurrency/redis-caching-avalanche-and-caching-penetration/redis-caching-avalanche.png)

About 3 years ago, a fairly well-known internet company in China suffered a cache incident that caused an avalanche. The back-end systems all collapsed, the incident lasted from the afternoon until 3 to 4 a.m., and the company lost tens of millions.

The solutions for a cache avalanche before, during and after the event are as follows:

-   Before: Redis high availability, master/replica + Sentinel, Redis cluster, to avoid a complete collapse.
-   During: local ehcache cache + hystrix rate limiting and degradation (fallback), to avoid MySQL being killed.
-   After: Redis persistence. Once restarted, data is loaded automatically from disk, so the cache data recovers quickly.

![redis-caching-avalanche-solution](asset:high-concurrency/redis-caching-avalanche-and-caching-penetration/redis-caching-avalanche-solution.png)

A user sends a request. After system A receives it, it first checks the local ehcache cache, and if nothing is found it checks Redis. If neither ehcache nor Redis has it, it queries the database and writes the result from the database into both ehcache and Redis.

The rate limiting component can be configured with how many requests per second may pass through it. What happens to the remaining requests that do not pass? **They take the degradation path!** They can return some default values, or a friendly hint, or an empty value.

Benefits:

-   The database will never die, since the rate limiting component ensures that only a set number of requests per second get through.
-   As long as the database does not die, then for users 2/5 of the requests can be handled.
-   As long as 2/5 of the requests can be handled, your system is not dead. For users it may just mean that after a few clicks the page does not show up, but after a few more clicks it does.

### Cache penetration

Take system A again, with 5,000 requests per second, of which 4,000 are malicious attacks sent by hackers.

Those 4,000 attack requests cannot be found in the cache, and every time you query the database you cannot find them there either.

Take an example. Database ids start from 1, but all the ids in the requests sent by the hacker are negative. The cache will not contain them, so each request "**treats the cache as if it did not exist**" and queries the database directly. In this kind of malicious attack, cache penetration will directly kill the database.

![redis-caching-penetration](asset:high-concurrency/redis-caching-avalanche-and-caching-penetration/redis-caching-penetration.png)

The solution is simple. Whenever system A fails to find something in the database, it writes an empty value into the cache, for example `set -999 UNKNOWN`. Then it sets an expiration time, so that the next time the same key comes in, the data can be fetched directly from the cache until the entry expires.

Of course, if the hacker uses a different negative id each time, writing empty values may not work. A more common approach is to add a Bloom filter in front of the cache, hash-mapping all possible data in the database into the Bloom filter. Then each request is checked as follows:

-   If the requested key does not exist in the Bloom filter, it can be determined that the data certainly does not exist in the database, and the system can immediately return that it does not exist.
-   If the requested key exists in the Bloom filter, the query continues to the cache.

Using a Bloom filter provides a degree of initial screening of incoming requests, avoiding the query pressure caused by non-existent data.

![redis-caching-avoid-penetration](asset:high-concurrency/redis-caching-avalanche-and-caching-penetration/redis-caching-avoid-penetration.png)

### Cache breakdown

Cache breakdown means that a certain key is very hot and is accessed very frequently, under centralized high concurrency. At the instant this key expires, a large number of requests break through the cache and go directly to the database, like punching a hole through a barrier.

The solutions in different scenarios are as follows:

-   If the cached data basically never gets updated, you can try setting this hot data to never expire.
-   If the cached data is updated infrequently and the whole cache refresh process takes little time, you can use a distributed mutex based on distributed middleware such as Redis or zookeeper, or a local mutex, so that only a small number of requests reach the database and rebuild the cache, while the other threads can access the new cache after the lock is released.
-   If the cached data is updated frequently or the cache refresh process takes a long time, you can use a scheduled thread to proactively rebuild the cache before it expires, or to extend its expiration time, so that all requests can keep accessing the corresponding cache.
