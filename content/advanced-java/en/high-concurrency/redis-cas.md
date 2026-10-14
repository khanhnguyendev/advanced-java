---
source:
  locale: zh
  slug: redis-cas
  hash: 'sha256:v1:f151e12c6e418af7335242ddf322eb97454e622721418c8e18f5854c72320465'
status: machine
translatedAt: '2026-10-14'
---
# Concurrent Contention in Redis

## Interview question

What is the concurrent contention problem in Redis? How do you solve it? Do you know the CAS approach of Redis transactions?

## Interviewer psychology

This is also a very common problem online: **multiple clients write concurrently** to the same key at the same time, and data that should have arrived first may arrive later, leaving the data with the wrong version. Or multiple clients read a key at the same time, modify the value and write it back; as soon as the order is wrong, the data is wrong.

Moreover, Redis itself has a natural CAS-style optimistic locking approach that solves this problem.

## Answer analysis

At some moment, multiple system instances all update a certain key. You can implement a distributed lock based on zookeeper. Each system obtains the distributed lock through zookeeper, which ensures that at any given time only one system instance can operate on the key, and no one else is allowed to read or write it.

![zookeeper-distributed-lock](diagram:high-concurrency/redis-cas/zookeeper-distributed-lock)

The data you want to write into the cache is all queried from mysql and must be written into mysql. When writing into mysql you must save a timestamp, and when you query from mysql, the timestamp is queried too.

Every time, **before writing, check** whether the timestamp of the current value is newer than the timestamp of the value in the cache. If so, you may write; otherwise, you must not overwrite newer data with old data.
