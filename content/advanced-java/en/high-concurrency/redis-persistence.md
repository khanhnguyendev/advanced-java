---
source:
  locale: zh
  slug: redis-persistence
  hash: 'sha256:v1:431506fd7df137a1df008912e6fa3ea8bf00d08bccb430c5d5e2a5179d16798f'
status: machine
translatedAt: '2026-10-14'
---
# Redis Persistence Mechanisms

## Interview Question

What persistence methods does Redis have? What are the advantages and disadvantages of the different persistence mechanisms? How are the persistence mechanisms implemented underneath?

## Interviewer Psychology

If Redis only caches data in memory, then when Redis crashes and restarts, all the data in memory is lost. You must use the Redis persistence mechanism: while writing data to memory, slowly and asynchronously write the data to disk files for persistence.

If Redis crashes and restarts, it can simply load the previously persisted data from disk automatically. Perhaps a little data is lost, but at least not all of it.

This is really the same kind of question, aimed at problems you may encounter in a Redis production environment: if Redis goes down and restarts, isn't all the data in memory lost? Can the data be recovered on restart?

## Answer Analysis

Persistence is mainly for disaster recovery and data recovery, and can also be classified as one part of high availability. For example, if your whole Redis goes down, Redis becomes unavailable, and what you need to do is make Redis available again, as soon as possible.

Restart Redis and get it serving requests as soon as possible. If no data backup was made, then even when Redis starts it is still unusable, because the data is gone.

Quite possibly, a large number of requests come in, all of them miss the cache, and the data cannot be found in Redis at all. At that point you are doomed, and a **cache avalanche** occurs. All the requests that miss in Redis go to the data source such as the MySQL database, MySQL suddenly has to take on high concurrency, and then it goes down...

If you do Redis persistence well and bring the backup and recovery scheme up to enterprise level, then even if your Redis fails, you can restore quickly from backup data and serve requests again as soon as it is restored.

### Two persistence methods of Redis

-   RDB: the RDB persistence mechanism performs **periodic** persistence of the data in Redis.
-   AOF: the AOF mechanism records each write command as a log and writes it to a log file in `append-only` mode. When Redis restarts, the whole data set can be rebuilt by **replaying** the write commands in the AOF log.

With either RDB or AOF, the data in Redis memory can be persisted to disk, and the data can then be backed up elsewhere, for example to a cloud service such as Alibaba Cloud.

If Redis goes down and the data in memory and on disk on the server is lost, you can copy the earlier data back from the cloud service, put it into the specified directory, and restart Redis. Redis will automatically restore the data in memory from the data in the persistence files and continue serving requests.

If both RDB and AOF persistence mechanisms are used, then when Redis restarts, **AOF** is used to rebuild the data, because the **data in AOF is more complete**.

#### Advantages and disadvantages of RDB

-   RDB generates multiple data files, each representing the data of Redis at a certain moment. Having multiple data files like this is **very well suited to cold backup**: you can send the complete data files to remote secure storage, such as Amazon's S3 cloud service or, in China, Alibaba Cloud's ODPS distributed storage, and back up the data in Redis periodically according to a predefined backup policy.
-   RDB has very little impact on the read and write service that Redis provides, allowing Redis to **keep high performance**, because the Redis main process only needs to fork a child process and let the child process perform the disk IO for RDB persistence.
-   Compared with the AOF persistence mechanism, restarting and recovering a Redis process directly from an RDB data file is faster.
-   If you want to lose as little data as possible when Redis fails, RDB is not as good as AOF. Generally an RDB data snapshot file is generated every 5 minutes or longer, so you must accept that once the Redis process crashes, the most recent 5 minutes (or even more) of data will be lost.
-   Each time RDB forks a child process to generate the RDB snapshot data file, if the data file is particularly large, the service provided to clients may pause for a few milliseconds or even several seconds.

#### Advantages and disadvantages of AOF

-   AOF protects data from loss better. Generally AOF runs an `fsync` operation through a background thread every 1 second, so at most 1 second of data is lost.
-   The AOF log file is written in `append-only` mode, so there is no disk seek overhead and write performance is very high. The file is also not easily corrupted, and even if the tail of the file is corrupted, it is easy to repair.
-   Even when the AOF log file becomes too large and a background rewrite occurs, client reads and writes are not affected. This is because when the log is rewritten (`rewrite`), the commands in it are compacted to create a minimal log needed to restore the data. While the new log file is being created, the old log file is still written to as usual. When the new merged log file is ready, the new and old log files are simply swapped.
-   The commands in the AOF log file are recorded in a fairly readable way, which makes it **well suited to emergency recovery from a catastrophic accidental deletion**. For example, if someone accidentally clears all the data with the `flushall` command, as long as the background `rewrite` has not yet happened, you can immediately copy the AOF file, delete the last `flushall` command, and then put the `AOF` file back, and all the data is recovered automatically through the recovery mechanism.
-   For the same data, an AOF log file is usually larger than an RDB data snapshot file.
-   With AOF enabled, the write QPS supported is lower than with RDB, because AOF is generally configured to `fsync` the log file once per second. Of course, even with one `fsync` per second, performance is still very high. (If writes are done in real time, QPS drops sharply and Redis performance is greatly reduced.)
-   AOF has had bugs in the past: when recovering data from the logs recorded by AOF, the data restored was not exactly identical. So an approach like AOF, which is more complex and based on `merge` and replay of a command log, is more fragile and more bug-prone than RDB, which persists a complete data snapshot file each time. However, AOF is designed to avoid bugs in the rewrite process, so each rewrite is not a merge based on the old command log but **rebuilds the commands based on the data in memory at that moment**, which makes it much more robust.

### How to choose between RDB and AOF

-   Do not use RDB alone, because that would make you lose a lot of data;
-   Do not use AOF alone either, because that has two problems: first, using AOF for cold backup recovers more slowly than using RDB for cold backup; second, RDB generates a data snapshot in a simple and brutal way each time, which is more robust and avoids the bugs of a complex backup and recovery mechanism like AOF;
-   Redis supports enabling both persistence methods at the same time, so we can use AOF and RDB together: use AOF to ensure no data loss as the first choice for data recovery, and use RDB for cold backups at different granularities, so that when the AOF files are all lost or corrupted and unusable, RDB can still be used for fast data recovery.
