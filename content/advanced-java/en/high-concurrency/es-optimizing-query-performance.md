---
source:
  locale: zh
  slug: es-optimizing-query-performance
  hash: 'sha256:v1:0644c179492493c544baf422fedb47846270bf2c94160fdf36501819b42559fd'
status: machine
translatedAt: '2026-10-14'
---
# ES Query Performance Optimization

## Interview Question

How do you improve query efficiency in ES when the data volume is very large (billions of documents)?

## Interviewer Psychology

This question is guaranteed to come up. Put bluntly, the interviewer wants to know whether you have actually worked with ES, because ES performance is not as good as you might imagine. Often, once the data volume gets large, especially at several hundred million documents, you may be baffled to find that a single search takes `5~10s`. The first search takes `5~10s`, but later searches are suddenly much faster, perhaps only a few hundred milliseconds.

You are confused: is every user's first visit slow and sluggish? So if you have never really used ES, or have only played with a demo, this question easily leaves you stumped and shows that your ES experience is thin.

## Answer Analysis

Honestly, there is no silver bullet for ES performance optimization. What does that mean? **Do not expect that tweaking one parameter will handle every slow-performance scenario.** In some scenarios, changing a parameter or adjusting the query syntax is enough, but that is definitely not true for all scenarios.

### The Killer Technique for Performance Optimization: filesystem cache

The data you write into ES is actually written to disk files. **At query time**, the operating system automatically caches the data in those disk files into the `filesystem cache`.

![es-search-process](asset:high-concurrency/es-optimizing-query-performance/es-search-process.png)

The ES search engine relies heavily on the underlying `filesystem cache`. If you give the `filesystem cache` more memory, and let that memory hold all of the `idx segment file ` index data files if possible, then searches will basically be served from memory and performance will be very high.

How big can the performance gap be? In many of our earlier tests and stress tests, serving from disk always takes more than a second: search performance is definitely at the level of seconds, 1 second, 5 seconds, 10 seconds. But serving from the `filesystem cache`, which is pure memory, is generally an order of magnitude faster than disk, basically at the millisecond level, ranging from a few milliseconds to a few hundred milliseconds.

Here is a real case. A company had 3 ES nodes, and each machine looked like it had plenty of memory, 64G, so total memory was `64 * 3 = 192G`. Each machine gave `32G` to the ES JVM heap, which left only `32G` per machine for the `filesystem cache`, so the whole cluster had `32 * 3 = 96G` of memory for the `filesystem cache`. Meanwhile, the index data files on disk took up a total of `1T` of disk space across the 3 machines, so the ES data volume was `1T`, and each machine held `300G` of data. Is that good for performance? The `filesystem cache` had only about 100G of memory, so one tenth of the data fit in memory and the rest was on disk. When you run a search, most operations go to disk, so performance is certainly poor.

In the end, for good ES performance, the best case is that your machines' memory can hold at least half of your total data volume.

Based on our own production experience, the best case is to store only a small amount of data in ES, namely **the indexes you use for searching**. If 100G of memory is left for the `filesystem cache`, keep the index data within `100G`. Then nearly all of your data is searched from memory, performance is very high, and queries generally finish within 1 second.

For example, suppose you have a row with 30 fields: `id,name,age ....`. But when searching you only need to search by the three fields `id,name,age`. If you foolishly write every field of the row into ES, then `90%` of the data is never used for searching, yet it takes up space in the `filesystem cache` on the ES machines. The larger each record is, the less data the `filesystem cahce` can hold. In fact, you only need to write the **few fields** used for retrieval into ES, for example just `id,name,age`, and you can store the other fields in MySQL/HBase. We generally recommend an `es + hbase` architecture.

HBase is characterized by being **suited to online storage of large-scale data**: you can write huge amounts of data into HBase, but you should not run complex searches on it, only very simple operations such as queries by id or by range. You search ES by name and age and get back perhaps 20 `doc id` values, then use the `doc id` to query HBase for the **complete data** corresponding to each `doc id`, and return it to the front end.

The data you write into ES should preferably be less than or equal to, or only slightly larger than, the memory capacity of the ES filesystem cache. Then retrieval from ES might take 20ms, and querying HBase with the ids returned by ES for 20 records might take about 30ms. In the old setup, with all 1T of data in ES, every query might take 5~10s; now performance can be very high, with each query taking around 50ms.

### Data Warm-Up

Suppose that even after you follow the approach above, the amount of data written to each machine in the ES cluster is still twice the `filesystem cache`. For example, you write 60G of data to one machine but the `filesystem cache` is only 30G, so 30G of data remains on disk.

In that case you can do **data warm-up**.

Take Weibo as an example. For the data of big-name accounts that many people view, you can build a background system in advance that searches the hot data every so often and loads it into the `filesystem cache`. Later, when users actually view this hot data, they search directly from memory, which is fast.

Or take e-commerce: for the products that are viewed most often, such as the iPhone 8, you can build a background program in advance that actively accesses the hot data once every minute and loads it into the `filesystem cache`.

For data you consider hot and frequently accessed, it is best to **build a dedicated cache warm-up subsystem**, which accesses the hot data in advance at regular intervals so that it enters the `filesystem cache`. The next time someone accesses it, performance will be much better.

### Hot/Cold Separation

ES can do something similar to horizontal splitting in MySQL: write the large amount of rarely and infrequently accessed data into one index, and write the frequently accessed hot data into a separate index. It is best to **write cold data into one index and hot data into another**, so that after the hot data has been warmed up, it stays in the `filesystem os cache` as much as possible and **is not flushed out by cold data**.

For example, suppose you have 6 machines and 2 indexes, one for cold data and one for hot data, each with 3 shards. 3 machines hold the hot data index and the other 3 hold the cold data index. Most of the time you are accessing the hot data index, and the hot data may be only 10% of the total, so it is small and almost entirely stays in the `filesystem cache`, which ensures high access performance for hot data. The cold data lives in a different index, on different machines from the hot data index, so the two have nothing to do with each other. If someone accesses cold data, much of it may be on disk and performance is a bit worse, but only 10% of people access cold data while 90% access hot data, so it does not matter.

### Document Model Design

With MySQL, we often have complex join queries. What about in ES? Avoid complex join queries in ES as much as possible; once you use them, performance is generally poor.

It is best to complete the joins in the Java system first and write the already-joined data directly into ES. Then at search time you do not need ES search syntax to perform join-style searches.

Document model design is very important. For many operations, do not wait until search time to run all kinds of complicated, messy operations. ES supports only so many operations, so do not try to use ES for things it is not good at. If there really is such an operation, do it as far as possible during document model design, at write time. In addition, avoid overly complex operations such as join/nested/parent-child searches, whose performance is poor.

### Pagination Performance Optimization

ES pagination is rather nasty. Why? Take an example: suppose each page has 10 records and you want to query page 100. ES actually fetches the first 1000 records stored on each shard to a coordinating node. If you have 5 shards, that is 5000 records, and the coordinating node then merges and processes those 5000 records to obtain the final 10 records of page 100.

In a distributed system, to get the 10 records of page 100 you cannot just fetch 2 records from each of 5 shards and merge them into 10 at the coordinating node. You **must** fetch 1000 records from every shard, then sort, filter and so on according to your requirements, and finally paginate again to get page 100. The deeper you page, the more data each shard returns and the longer the coordinating node takes to process it, which is terrible. So when using ES for pagination, you will find that the further back you go, the slower it gets.

We ran into this problem before. With ES pagination, the first few pages took tens of milliseconds, but by page 10 or several dozen, it basically took 5~10 seconds to fetch a single page.

Is there a solution?

#### Disallow deep pagination (deep pagination performs poorly by default)

Tell the product manager that your system does not allow paging that deep, because by default the deeper you page, the worse performance gets.

#### Scrolling like the recommended items in an app, loading page after page

Like pulling down to refresh Weibo, where pages appear one after another, you can use the `scroll api`; search online for how to use it.

Scroll generates a **snapshot of all the data** at once, and each scroll to the next page moves a **cursor** `scroll_id` to fetch the next page, and so on. Its performance is much, much higher than the pagination described above, basically at the millisecond level.

The one caveat is that this suits pull-down paging like Weibo, and **does not suit scenarios where you can jump to any page**. That is, you cannot enter page 10, then go to page 120, then go back to page 58; you cannot jump around freely. This is why many products today do not allow you to jump between pages: apps, and some websites, let you only pull down and turn pages one at a time.

At initialization you must specify the `scroll` parameter, which tells ES how long to keep the context of this search. You need to make sure users do not keep paging for hours on end, otherwise the request may fail due to timeout.

Besides the `scroll api`, you can also use `search_after`. The idea of `search_after` is to use the results of the previous page to help retrieve the next page. Obviously this approach also does not let you jump to arbitrary pages; you can only go page by page. At initialization, you need to use a field with unique values as the sort field.
