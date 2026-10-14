---
source:
  locale: zh
  slug: redis-data-types
  hash: 'sha256:v1:f49becd73105f36799846d540b7f98a2ae9270343546d805a2852ef6ba87b492'
status: machine
translatedAt: '2026-10-14'
---
# Redis Data Types and Use Cases

## Interview question

What data types does Redis have? In which scenarios is each one suitable?

## Interviewer Psychology

Unless the interviewer sees from your resume that you are a fairly junior candidate with less than 3 years of experience who may not have studied the technology in depth, they will not ask this kind of question. Otherwise, in the precious interview time, the interviewer really does not want to ask more about it.

There are two main reasons for asking this question:

-   To see whether you have a comprehensive understanding of what features Redis has, how they are generally used, and what to use in which scenario, since the worry is that you only know the simplest KV operations;
-   To see how you have actually used Redis in real projects.

If you answer poorly, naming only a few data types and no scenarios, you are done: the interviewer will have a bad impression and think you only do simple set and get.

## Answer analysis

Redis mainly has the following data types:

-   Strings
-   Hashes
-   Lists
-   Sets
-   Sorted Sets

> Besides these 5 data types, Redis also has Bitmaps, HyperLogLogs, Streams and so on.

### Strings

This is the simplest type, just plain set and get, used for simple KV caching.

```bash
set college szu
```

### Hashes

This is a map-like structure. It is generally used to cache structured data in Redis, such as an object (provided that **the object does not nest other objects**), and then each time you read or write the cache you can operate on **a single field** in the hash.

```bash
hset person name bingo
hset person age 20
hset person id 1
hget person name
```

```json
(person = {
  "name": "bingo",
  "age": 20,
  "id": 1
})
```

### Lists

Lists are ordered lists, and you can do many things with them.

For example, you can use a list to store list-type data structures, such as a follower list or the comment list of an article.

For example, you can use the lrange command to read the elements within a closed interval, which lets you implement paginated queries on top of a list. This is a great feature: implementing simple high-performance pagination on Redis, you can build something like the pull-down continuous paging of Weibo, with high performance, just going page by page.

```bash
# 0 is the start position and -1 is the end position. An end position of -1 means the last position of the list, i.e. view everything.
lrange mylist 0 -1
```

For example, you can build a simple message queue, pushing in from the head of the list and taking out from the tail.

```bash
lpush mylist 1
lpush mylist 2
lpush mylist 3 4 5

# 1
rpop mylist
```

### Sets

Sets are unordered collections that deduplicate automatically.

Based on a set, you can throw in the data in your system that needs deduplication, and it is deduplicated automatically. If you need fast global deduplication of some data, you could of course use a HashSet in JVM memory, but what if your system is deployed on multiple machines? You need Redis-based global set deduplication.

You can also do intersection, union and difference operations on sets. For example, with an intersection you can take the intersection of two people's follower lists to see who their mutual friends are, right?

Put the followers of two big-name accounts in two sets and take the intersection of the two sets.

```bash
#-------Operating on one set-------
# Add an element
sadd mySet 1

# View all elements
smembers mySet

# Check whether a value is contained
sismember mySet 3

# Delete one or more elements
srem mySet 1
srem mySet 2 4

# View the number of elements
scard mySet

# Randomly delete an element
spop mySet

#-------Operating on multiple sets-------
# Move an element of one set to another set
smove yourSet mySet 2

# Intersection of two sets
sinter yourSet mySet

# Union of two sets
sunion yourSet mySet

# Elements that are in yourSet but not in mySet
sdiff yourSet mySet
```

### Sorted sets

Sorted Sets are sorted sets: they deduplicate but can be ordered. When writing in, you give a score, and the set sorts automatically by score.

```bash
zadd board 85 zhangsan
zadd board 72 lisi
zadd board 96 wangwu
zadd board 63 zhaoliu

# Get the top three users (the default is ascending, so rev is needed to make it descending)
zrevrange board 0 3

# Get the rank of a user
zrank board zhaoliu
```
