---
source:
  locale: zh
  slug: es-write-query-search
  hash: 'sha256:v1:8308a0c5553e88aca4e9b5b46d3d45063894cf517da63effb75e6e6b46da3fe2'
status: machine
translatedAt: '2026-10-14'
---
# Principles of ES Data Writing

## Interview Question

What is the working principle of ES writing data? What is the working principle of ES querying data? Can you introduce the underlying Lucene? Do you know the inverted index?

## Interviewer Psychology

By asking this, the interviewer wants to see whether you understand some basic principles of es. Using es is nothing more than writing data and searching data. If you do not understand what es is doing when you issue a write or search request, then you really are......

If es is basically a black box to you, what can you do? The only thing you can do is read and write data with the es api. If something goes wrong and you know nothing, what can be expected of you?

## Answer Analysis

### The Process of Writing Data in es

-   The client picks a node and sends the request to it; this node is the `coordinating node`.
-   The `coordinating node` **routes** the document and forwards the request to the corresponding node (the one holding the primary shard).
-   The `primary shard` on the actual node processes the request, and then synchronizes the data to the `replica node`.
-   If the `coordinating node` finds that the `primary node` and all `replica node`s are done, it returns the response to the client.

![es-write](asset:high-concurrency/es-write-query-search/es-write.png)

### The Process of Reading Data in es

You can query by `doc id`. A hash is computed on the `doc id` to determine which shard the `doc id` was assigned to at the time, and the query goes to that shard.

-   The client sends the request to **any** node, which becomes the `coordinate node`.
-   The `coordinate node` performs hash routing on the `doc id` and forwards the request to the corresponding node. At this point it uses the `round-robin` **random polling algorithm** to randomly pick one among the `primary shard` and all its replicas, so that read requests are load balanced.
-   The node that receives the request returns the document to the `coordinate node`.
-   The `coordinate node` returns the document to the client.

### The Process of Searching Data in es

The most powerful thing es does is full-text search. For example, suppose you have three records:

```
java is so much fun
java is so hard to learn
j2ee is really awesome
```

You search with the keyword `java`, and the `document`s containing `java` are found. es returns to you: java is so much fun, java is so hard to learn.

-   The client sends the request to a `coordinate node`.
-   The coordinating node forwards the search request to the `primary shard` or `replica shard` corresponding to **all** shards; either is fine.
-   query phase: each shard returns its own search results (in fact just some `doc id`s) to the coordinating node, which merges, sorts and paginates the data to produce the final result.
-   fetch phase: then the coordinating node **pulls the actual** `document` data from the various nodes according to the `doc id`s, and finally returns it to the client.

> A write request writes to the primary shard and then synchronizes to all replica shards; a read request can read from the primary shard or a replica shard, using the random polling algorithm.

### The Underlying Principle of Writing Data

![es-write-detail](asset:high-concurrency/es-write-query-search/es-write-detail.png)

Data is first written into the in-memory buffer, where it cannot be searched; at the same time the data is written into the translog log file.

When the buffer is nearly full, or after a certain time, the in-memory buffer data is `refresh`ed into a new `segment file`. But at this point the data does not go directly into the `segment file` disk file; it first goes into the `os cache`. This process is `refresh`.

Every 1 second, es writes the data in the buffer into a **new** `segment file`. A **new disk file** `segment file` is produced every second, and this `segment file` stores the data written into the buffer in the last 1 second.

But if there is no data in the buffer at that moment, of course no refresh is performed. If there is data in the buffer, a refresh is performed once every 1 second by default, flushing into a new segment file.

In an operating system, every disk file actually has something called the `os cache`, the operating system cache. That is, before data is written to a disk file, it first enters the `os cache`, a memory cache at the operating system level. As soon as the data in the `buffer` is flushed into the `os cache` by a refresh operation, the data can be searched.

Why is es called **near real-time**? `NRT`, short for `near real-time`. By default a refresh happens every 1 second, so es is near real-time, because written data becomes visible only after 1 second. You can **manually** perform a refresh through the es `restful api` or `java api`, that is, manually flush the data in the buffer into the `os cache`, so that the data can be searched immediately. Once the data enters the `os cache`, the buffer is cleared, because there is no need to keep the buffer: a copy of the data has already been persisted to disk in the translog.

Repeating the steps above, new data keeps entering the buffer and the translog, and the `buffer` data is written into one new `segment file` after another. After each `refresh` the buffer is cleared and the translog is kept. As this process goes on, the translog grows larger and larger. When the translog reaches a certain length, a `commit` operation is triggered.

The first step of a commit operation is to `refresh` the existing data in the buffer into the `os cache` and clear the buffer. Then a `commit point` is written to a disk file, identifying all the `segment file`s corresponding to this `commit point`, and at the same time all the data currently in the `os cache` is forcibly `fsync`ed to the disk files. Finally, the existing translog log file is **cleared** and a new translog is started, at which point the commit operation is complete.

This commit operation is called `flush`. A `flush` is performed automatically every 30 minutes by default, and a `flush` is also triggered if the translog becomes too large. The flush operation corresponds to the whole process of a commit. We can perform a flush manually through the es api, manually forcing the data in the os cache to be fsynced to disk.

What is the translog log file for? Before you perform a commit, data stays either in the buffer or in the os cache. Both the buffer and the os cache are memory, and once this machine dies, the data in memory is entirely lost. So the operations corresponding to the data need to be written into a dedicated log file, the `translog`. If the machine crashes at that point, when it restarts, es automatically reads the data in the translog log file and restores it into the in-memory buffer and os cache.

The translog is also actually written to the os cache first, and by default is flushed to disk every 5 seconds. So by default, 5 seconds of data may stay only in the buffer or in the os cache of the translog file, and if the machine goes down at this point, 5 seconds of data are **lost**. But this gives better performance, with at most 5 seconds of data lost. You can also set the translog so that every write operation must be directly `fsync`ed to disk, but performance will be much worse.

-   `index.translog.sync_interval` controls how often the translog is fsynced to disk, with a minimum of 100ms;
-   `index.translog.durability` controls whether the translog is flushed every 5 seconds or fsynced on every request. This parameter has 2 values: request (fsync on every request; es returns success only after the translog has been fsynced to disk) and async (the default; the translog is fsynced every 5 seconds).

In fact, here, if the interviewer has not asked you about es losing data, you can show off a little: you say that actually es, first, is near real-time, with data searchable 1 second after it is written; and second, it may lose data. 5 seconds of data stay in the buffer, the translog os cache and the segment file os cache rather than on disk, and if a crash happens at this point, 5 seconds of **data are lost**.

**To summarize**: data is first written into the in-memory buffer, then every 1s the data is refreshed into the os cache, and once in the os cache the data can be searched (which is why we say es has a 1s delay from writing to being searchable). Every 5s, the data is written into the translog file (so if the machine crashes and the in-memory data is all gone, at most 5s of data is lost). When the translog grows to a certain size, or every 30mins by default, a commit operation is triggered, flushing all the data in the buffer into the segment file disk files.

> After data is written into a segment file, the inverted index is built at the same time.

### The Underlying Principle of Deleting/Updating Data

For a delete operation, a `.del` file is generated at commit time, in which a doc is marked as `deleted`, so at search time the `.del` file tells you whether the doc has been deleted.

For an update operation, the original doc is marked as `deleted`, and then a new record is written.

Every refresh of the buffer produces a `segment file`, so by default there is one `segment file` per second, and over time the `segment file`s become more and more numerous, so a merge is performed periodically. At each merge, multiple `segment file`s are merged into one, and the docs marked as `deleted` are **physically deleted**. Then the new `segment file` is written to disk, a `commit point` is written identifying all the new `segment file`s, the `segment file` is opened for searching, and the old `segment file`s are deleted.

### The Underlying lucene

Simply put, lucene is a jar package containing the packaged code of various algorithms for building inverted indexes. When developing in Java, we include the lucene jar and develop on top of the lucene api.

Through lucene we can build an index over existing data, and lucene organizes the index data structures for us on local disk.

### Inverted Index

In a search engine, every document has a corresponding document ID, and the document content is represented as a set of keywords. For example, after word segmentation, document 1 yields 20 keywords, and each keyword records the number of times it occurs in the document and the positions where it occurs.

An inverted index, then, is a mapping from **keywords to document** IDs: each keyword corresponds to a series of documents in which the keyword appears.

Let us give an example.

Take the following documents:

| DocId | Doc                                                                        |
| ----- | -------------------------------------------------------------------------- |
| 1     | The father of Google Maps jumps ship to Facebook                           |
| 2     | The father of Google Maps joins Facebook                                   |
| 3     | Google Maps founder Lars leaves Google to join Facebook                    |
| 4     | The father of Google Maps jumps ship to Facebook, related to the cancellation of the Wave project |
| 5     | The father of Google Maps, Lars, joins the social network Facebook         |

After word segmentation of the documents, the following **inverted index** is obtained.

| WordId | Word     | DocIds        |
| ------ | -------- | ------------- |
| 1      | Google   | 1, 2, 3, 4, 5 |
| 2      | Maps     | 1, 2, 3, 4, 5 |
| 3      | father   | 1, 2, 4, 5    |
| 4      | jumps ship | 1, 4        |
| 5      | Facebook | 1, 2, 3, 4, 5 |
| 6      | joins    | 2, 3, 5       |
| 7      | founder  | 3             |
| 8      | Lars     | 3, 5          |
| 9      | leaves   | 3             |
| 10     | with     | 4             |
| ..     | ..       | ..            |

In addition, a practical inverted index can record more information, such as document frequency information, indicating how many documents in the collection contain a given word.

With the inverted index, the search engine can respond to user queries very conveniently. For example, when the user enters the query `Facebook`, the search system looks up the inverted index and reads out the documents containing this word, and these documents are the search results provided to the user.

Note two important details of the inverted index:

-   Every term in the inverted index corresponds to one or more documents;
-   The terms in the inverted index are **sorted in ascending dictionary order**

> The above is only a simple example, and it is not strictly sorted in ascending dictionary order.
