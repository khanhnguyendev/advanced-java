---
source:
  locale: zh
  slug: redis-expiration-policies-and-lru
  hash: 'sha256:v1:f9d62a2aa5f83c7a0b903cc7d5aff696f7969e118e6e1e689f267cab0d9c49ba'
status: machine
translatedAt: '2026-10-14'
---
# Redis Expiration Policies and the LRU Algorithm

## Interview question

What are the expiration policies of Redis? What are the memory eviction mechanisms? Write an LRU implementation by hand.

## Interviewer Psychology

If you do not even know this question, you are stumped from the start and cannot answer it. Then when you write code online, you take it for granted that data written into Redis will definitely exist, which leads to all kinds of bugs in the system. Who is responsible?

There are two common problems:

-   Why is the data I wrote into Redis gone?

Some candidates may run into this: in a production environment, Redis often loses some data. It was written in, but after a while it may be gone. My goodness, asking this question shows that you have not used Redis correctly. Redis is a cache, and you treated it as storage, right?

What is a cache? It uses memory as the cache. Is memory unlimited? Memory is precious and limited, while disk is cheap and plentiful. A machine may have only a few dozen GB of memory but several TB of disk space. Redis mainly relies on memory for high-performance, high-concurrency reads and writes.

Since memory is limited, say Redis can use only 10G, what happens if you write 20G of data into it? Naturally it will remove 10G of data and keep only 10G. Which data is removed and which is kept? Of course the rarely used data is removed and the frequently used data is kept.

-   The data has clearly expired, so why does it still occupy memory?

This is determined by the expiration policy of Redis.

## Answer analysis

### Redis expiration policy

The Redis expiration policy is **periodic deletion + lazy deletion**.

**Periodic deletion** means that, by default, every 100ms Redis randomly samples some keys that have an expiration time set, checks whether they have expired, and deletes them if so.

Suppose Redis holds 100,000 keys, all with an expiration time set. If you checked all 100,000 keys every few hundred milliseconds, Redis would basically die: CPU load would be very high, consumed by checking expired keys. Note that it does not traverse all keys with an expiration time every 100ms, which would be a **disaster** for performance. In fact, Redis **randomly samples** some keys every 100ms to check and delete.

But the problem is that periodic deletion may leave many expired keys undeleted when their time comes. What to do then? That is where lazy deletion comes in. That is, when you fetch a key, Redis checks whether the key, if it has an expiration time set, has expired. If it has expired, the key is deleted at that point and nothing is returned to you.

> When fetching a key, if the key has already expired, it is deleted and nothing is returned.

But there is still a problem in practice. If periodic deletion misses many expired keys and you do not query them in time, so lazy deletion never runs, what happens? If a large number of expired keys pile up in memory and exhaust Redis memory, what then?

The answer is: **the memory eviction mechanism kicks in**.

### Memory eviction mechanisms

Redis has the following memory eviction mechanisms:

-   noeviction: when memory is insufficient to hold newly written data, new write operations return an error. Hardly anyone uses this; it is really nasty.
-   **allkeys-lru**: when memory is insufficient to hold newly written data, remove the least recently used key from the **keyspace** (this is the **most commonly used**).
-   allkeys-random: when memory is insufficient to hold newly written data, remove a random key from the **keyspace**. Hardly anyone uses this either; why would you pick randomly, when you should certainly remove the least recently used key.
-   volatile-lru: when memory is insufficient to hold newly written data, remove the least recently used key from the **keyspace of keys with an expiration time set** (this is generally not very suitable).
-   volatile-random: when memory is insufficient to hold newly written data, **randomly remove** a key from the **keyspace of keys with an expiration time set**.
-   volatile-ttl: when memory is insufficient to hold newly written data, in the **keyspace of keys with an expiration time set**, keys with an **earlier expiration time** are removed first.

### Writing an LRU algorithm by hand

LRU is short for Least Recently Used. That is, the LRU algorithm removes the least recently used cache entries to make room for the most recently used ones. The most frequently read data is often the data read the most times, so by using the LRU algorithm well we can improve the cache efficiency for hot data and the memory utilization of the cache service.

So how is it implemented?

In fact, the idea is very simple, as described in the figure below.

![](asset:high-concurrency/redis-expiration-policies-and-lru/lru.png)

You could write the most primitive LRU algorithm by hand on the spot, but the amount of code is too large, which seems unrealistic.

You are not required to build your own LRU from scratch, but at the very least you should know how to implement a Java LRU using the existing JDK data structures.

![](asset:high-concurrency/redis-expiration-policies-and-lru/lru-cache.png)

```java
public class LRUCache<K, V> extends LinkedHashMap<K, V> {
    private int capacity;

    /**
     * Pass in the maximum amount of data that can be cached
     *
     * @param capacity cache size
     */
    public LRUCache(int capacity) {
        super(capacity, 0.75f, true);
        this.capacity = capacity;
    }

    /**
     * If the amount of data in the map exceeds the configured maximum capacity, return true, and the oldest data is removed when a new object is added
     *
     * @param eldest the oldest data entry
     * @return true means the oldest data is removed
     */
    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        // When the amount of data in the map exceeds the specified cache size, automatically remove the oldest data
        return size() > capacity;
    }
}
```
