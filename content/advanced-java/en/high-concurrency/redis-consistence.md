---
source:
  locale: zh
  slug: redis-consistence
  hash: 'sha256:v1:c99efab2c8c76e1105241de77a247d69443537b5cd676f2f5ce159ea162d6f66'
status: machine
translatedAt: '2026-10-14'
---
# Consistency Between Cache and Database

## Interview question

How do you guarantee double-write consistency between the cache and the database?

## Interviewer psychology

As soon as you use a cache, you may be dealing with double storage and double writes to the cache and the database. As soon as there are double writes, there will certainly be data consistency problems. So how do you solve the consistency problem?

## Answer analysis

Generally speaking, if the cache is allowed to be occasionally slightly inconsistent with the database, that is, if your system **does not strictly require** "cache + database" to stay consistent, you had better not adopt this approach: **serializing read requests and write requests** by putting them into one **in-memory queue**.

Serialization guarantees that no inconsistency will occur, but it also greatly reduces the throughput of the system, and you would need several times more machines than normal to support the online requests.

### Cache Aside pattern

The most classic pattern for reading and writing cache + database is the Cache Aside Pattern.

-   On read, read the cache first. If it is not there, read the database, put the fetched data into the cache, and return the response.
-   On update, **update the database first, then delete the cache**.

**Why delete the cache instead of updating it?**

The reason is simple: in many cases, in more complex cache scenarios, the cache is not just a value taken directly from the database.

For example, a field of some table may be updated, and the corresponding cache value has to be computed by querying data from two other tables and doing some calculation to get the latest value.

In addition, updating the cache is sometimes very expensive. Does it mean that every time the database is modified, the corresponding cache must be updated too? Perhaps in some scenarios it does, but for **scenarios where the cached data is complex to compute**, it does not. If you modify the multiple tables involved in a cache frequently, the cache gets updated frequently too. But the question is, **will this cache actually be accessed frequently?**

For example, a field in a table involved in a cache is modified 20 times, or 100 times, within 1 minute, so the cache is updated 20 times, or 100 times; but the cache is read only once within that minute, so there is **a large amount of cold data**. In fact, if you just delete the cache, then within that minute the cache is recomputed only once, and the cost drops dramatically. **Compute the cache only when it is used.**

Deleting the cache instead of updating it is really a lazy computation idea: do not redo a complex computation every time whether or not it will be used, but let it be recomputed when it is actually needed. Mybatis and hibernate both have the idea of lazy loading. Suppose you query a department, and the department carries a list of employees. There is no need to also fetch the data of the 1,000 employees every time you query the department. In 80% of cases, querying the department only requires access to the department's own information. You query the department first, and only when you need to access the employees inside it do you go to the database and query the 1,000 employees.

### The most basic cache inconsistency problem and its solution

Problem: update the database first, then delete the cache. If deleting the cache fails, the database holds the new data while the cache holds the old data, so the data is inconsistent.

![redis-junior-inconsistent](asset:high-concurrency/redis-consistence/redis-junior-inconsistent.png)

Solution 1: delete the cache first, then update the database. If the database update fails, the database holds the old data and the cache is empty, so the data is not inconsistent. When it is read, the cache has nothing, so the old data in the database is read and then written into the cache.

Solution 2: delayed double delete. It is still update the database first, then delete the cache, with the only difference being that we perform the delete once more a short time later, for example 5s later.

```java
public void set(key, value) {
    putToDb(key, value);
    deleteFromRedis(key);

    // ... a few seconds later
    deleteFromRedis(key);
}
```

The delete action can be implemented in several ways, for example: 1. use `DelayQueue`, which risks losing the update when the JVM process dies; 2. put it in `MQ`, but this increases coding complexity. In short, we need to weigh various factors in the design and choose the most reasonable solution.

### Analysis of a more complex data inconsistency problem

The data changes. The cache is deleted first, and then the database is about to be modified, but has not been modified yet. A request comes in, reads the cache and finds it empty, queries the database, **gets the old data from before the modification**, and puts it into the cache. Then the data-changing program completes the database modification. Now the data in the database and in the cache differ...

**Why does this problem occur in the cache under high-concurrency scenarios with more than 100 million requests?**

This problem can occur only when one piece of data is being read and written concurrently. If your concurrency is very low, especially read concurrency, say only 10,000 visits a day, then the inconsistency scenario just described will occur in very few cases. But the issue is that if you have more than 100 million requests per day and tens of thousands of concurrent reads per second, then as long as there are data update requests every second, **the database + cache inconsistency described above may occur**.

**The solution is as follows:**

When data is updated, route the operation by the **unique identifier of the data** and send it to a queue inside the JVM. When data is read and found not to be in the cache, the "read data + update cache" operation is re-executed, and after routing by the unique identifier it is also sent to the same JVM-internal queue.

One queue corresponds to one worker thread, and each worker thread takes the corresponding operations **serially** and executes them one by one. So for a data change operation, the cache is deleted first and then the database is updated, but the update has not completed yet. If a read request arrives at this moment and does not find the cache, it can first send a cache update request to the queue, where it will back up in the queue, and then wait synchronously for the cache update to complete.

There is an **optimization point** here: in one queue, **chaining multiple cache update requests together is meaningless**, so you can filter them. If there is already a cache update request in the queue, there is no need to put another update request in; just wait for the earlier update request to complete.

Only after the worker thread for that queue has finished the database modification of the previous operation will it execute the next operation, which is the cache update. At this point it reads the latest value from the database and writes it into the cache.

If the request is still within its waiting time, it keeps polling, and once it finds that the value can be fetched, it returns directly. If the request waits longer than a certain period, this time it reads the current old value directly from the database.

Issues to pay attention to for this solution under high-concurrency scenarios:

-   Read requests blocked for a long time

Because read requests are made asynchronous only very lightly, you must watch out for read timeouts. Every read request must return within the timeout.

The biggest risk of this solution is that **data may be updated very frequently**, so that a large number of update operations back up in the queue, **many read requests then time out**, and finally a large number of requests go straight to the database. Be sure to run some tests that simulate reality to see how frequent the data updates are.

Another point: because one queue may back up update operations for multiple data items, you need to test according to your own business situation. You may need to **deploy multiple services**, with each service sharing some of the data update operations. If a single in-memory queue has 100 inventory modification operations for products piled up, and each inventory modification takes 10ms to complete, then the read request for the last product may wait 10 \* 100 = 1000ms = 1s before getting its data, which results in **read requests being blocked for a long time**.

You must run some stress tests based on how the actual business system runs, and simulate the online environment, to see how many update operations the in-memory queue may back up at the busiest time, and how long the read request for the last update operation may hang. If read requests must return within 200ms, and after your calculation even at the busiest time 10 update operations pile up and the maximum wait is 200ms, then that is acceptable.

**If a particularly large number of update operations may pile up in one in-memory queue**, then you need to **add machines**, so that the service instance on each machine handles less data, and then fewer update operations pile up in each in-memory queue.

In fact, based on past project experience, generally the write frequency of data is very low, so normally very few update operations should pile up in the queue. For projects like this, with high read concurrency and a read-cache architecture, write requests are generally very few, and a few hundred QPS per second is already good.

Let us **make a rough calculation**.

Suppose there are 500 write operations per second. Divide the second into 5 time slices, so each 200ms has 100 write operations. Spread over 20 in-memory queues, each in-memory queue may have 5 write operations piled up. After performance testing, each write operation generally completes in about 20ms, so the read requests for the data in each in-memory queue will hang at most for a short while and will certainly return within 200ms.

From this simple calculation, we know that a single node supporting a write QPS of a few hundred is no problem. If the write QPS grows 10 times, then scale out the machines by 10 times, with 20 queues on each machine.

-   Read request concurrency too high

Stress tests are also necessary here, to make sure that when the above situation happens to occur, there is another risk: a large number of read requests suddenly hang on the service with a latency of tens of milliseconds. You need to see whether the service can withstand it, and how many machines are needed to withstand the peak of the most extreme case.

But since not all data is updated at the same time, and the cache does not expire at the same time, each time probably only the caches of a small amount of data expire, and the concurrency of the read requests corresponding to that data should not be particularly large.

-   Request routing for deployments with multiple service instances

This service may be deployed with multiple instances, so you must **ensure** that the requests that perform data update operations and the requests that perform cache update operations are all **routed to the same service instance** through the Nginx server.

For example, route all read and write requests for the same product to the same machine. You can implement hash routing between services by some request parameter yourself, or use the hash routing feature of Nginx, and so on.

-   Routing problems with hot products causing request skew

If the read and write requests for one product are particularly heavy and all hit the same queue on the same machine, the pressure on that machine may become too high. That is, since the cache is cleared only when product data is updated, which then causes read/write concurrency, you really have to look at the business system. If the update frequency is not too high, the impact of this problem is not particularly large, but it is true that the load on some machines may be higher.

---

For a detailed discussion of this interview question, see [#54](https://github.com/doocs/advanced-java/issues/54).
