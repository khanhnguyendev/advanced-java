---
source:
  locale: zh
  slug: redis-rehash
  hash: 'sha256:v1:c562d354b5f2583dfd636785e4de4bbee0a12abf2ba29396ee232d17be3102f3'
status: machine
translatedAt: '2026-10-14'
---
# The Redis Rehash Process

## Interview question

Do you know the Redis rehash process?

## Interviewer psychology

This is a relatively low-frequency interview topic in Redis, but when you are explaining the rehash process of HashMap or ConcurrentHashMap, you can proactively mention to the interviewer that you not only know these, but also understand the rehash process in Redis.

Redis is known for its speed and good performance. We know that Redis has limited capacity at the start, and when the capacity is insufficient it needs to be expanded. How is the expansion done? Is all the data moved at once? When the data volume reaches tens of millions or even more than 100 million, that would certainly block Redis from executing commands. So it is well worth understanding the rehash process in Redis.

## Answer analysis

As is well known, Redis is mainly used to store key-value pairs (`Key-Value Pair`), key-value pairs are stored using a dictionary, and the dictionary in Redis is in turn implemented on top of a hash table. The nodes in the hash table hold the key-value pairs of the dictionary. Similar to HashMap in Java, a key is mapped by a hash function to a node position in the hash table.

The data structure of a dictionary in Redis is as follows:

```c
// The data structure corresponding to a dictionary. For the structure of the hash table, refer to the redis source code; it is not described again here
typedef struct dict {
    dictType *type;  // dictionary type
    void *privdata;  // private data
    dictht ht[2];    // 2 hash tables; this is also the key data structure for rehash, and it shows that the dictionary is implemented on top of hash tables.
    long rehashidx;   // an important flag of the rehash process; a value of -1 means rehash is not in progress
    int iterators;   //  number of iterators currently iterating
} dict;
```

When the hash table is expanded or shrunk, the program needs to rehash all the key-value pairs in the existing hash table into a new hash table. The specific process is as follows:

### 1. Allocate space for the dictionary's spare hash table.

If an expansion is being performed, the size of the spare hash table is the first power of 2 (2^n) that is greater than or equal to the number of key-value pairs of the hash table to be expanded times 2. [`5*2=10,` so the capacity of the spare hash table is the first power of 2 greater than 10, which is 16]

If a shrink is being performed, the size of the spare hash table is the first power of 2 that is greater than or equal to the number of key-value pairs of the hash table (`ht[0] .used`).

### 2. Progressive rehash

When the data volume is very large (tens of millions, or 100 million and beyond), the rehash process is not completed all at once but **progressively**. The benefit of **progressive rehash** is that it avoids affecting the server.

The essence of progressive rehash:

1. With the help of rehashidx, the computation required to rehash the key-value pairs is spread across every add, delete, find and update operation on the dictionary, which avoids the huge computation caused by a centralized rehash.
2. While the rehash is in progress, each time an add, delete, find or update operation is performed on the dictionary, besides executing the specified operation, the program also rehashes all the key-value pairs at the rehashidx index of the original hash table into the spare hash table. When the rehash work is complete, the program increments the value of the rehashidx attribute by 1.
