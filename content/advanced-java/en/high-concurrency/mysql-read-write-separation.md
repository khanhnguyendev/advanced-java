---
source:
  locale: zh
  slug: mysql-read-write-separation
  hash: 'sha256:v1:63b2314ff19dd9180d7c7f03ee54c7eb5ca7f9a0cbd5ee9bccdcd2d8a07c8000'
status: machine
translatedAt: '2026-10-14'
---
# How to Implement Read/Write Splitting?

## Interview question

Have you done MySQL read/write splitting? How do you implement it? How does MySQL master/replica replication work? How do you deal with the replication delay between master and replica?

## Interviewer Psychology

At the high concurrency stage you will certainly need read/write splitting. What does that mean? Most internet companies, websites and apps are read-heavy and write-light. So you write to one master and attach multiple replicas to it, then serve reads from those replicas. Doesn't that let you support a higher read concurrency load?

## Answer analysis

### How do you implement MySQL read/write splitting?

It is actually very simple. It is built on a master/replica replication architecture: set up one master and attach multiple replicas to it. We only ever write to the master, and the master automatically synchronizes the data to the replicas.

### How does MySQL master/replica replication work?

The master writes changes to its binlog. After a replica connects to the master, an IO thread on the replica copies the master's binlog to the local machine and writes it into a relay log. Then an SQL thread on the replica reads the binlog from the relay log and executes its contents, that is, it re-runs the SQL locally, which keeps the replica's data identical to the master's.

![mysql-master-slave](diagram:high-concurrency/mysql-read-write-separation/mysql-master-slave)

One very important point here: the process by which a replica synchronizes the master's data is serial. Operations that ran in parallel on the master are executed serially on the replica. Because the replica copies logs from the master and then executes SQL serially, under high concurrency the replica's data will always lag behind the master's; there is **delay**. This is why data you have just written to the master often cannot be read right away, and only becomes readable after tens or even hundreds of milliseconds.

There is another problem as well. If the master suddenly crashes just when some data has not yet been synchronized to the replica, that data will be missing on the replica, and some of it may be lost.

So MySQL actually has two mechanisms here: **semi-synchronous replication**, which addresses data loss on the master, and **parallel replication**, which addresses master/replica replication delay.

So-called **semi-synchronous replication**, also called `semi-sync` replication, means that after the master writes the binlog, it **forces** the data to be synchronized to a replica immediately. After the replica writes the log to its own local relay log, it returns an ack to the master, and the master treats the write as complete only after receiving an ack from **at least one replica**.

So-called **parallel replication** means the replica starts multiple threads that read the logs of different databases from the relay log in parallel and then **replay the logs of different databases in parallel**. This is parallelism at the database level.

### The MySQL master/replica replication delay problem (key topic)

We really did hit a production bug caused by master/replica replication delay, a minor production incident.

The scenario was this. A colleague wrote code that first inserted a row, then queried it back, and then updated that row. In production at peak time, write concurrency reached 2000/s, and the replication delay was a few tens of milliseconds. We found that every day some data, important status values we expected to be updated, was not updated at peak time. Users reported it to customer service, and customer service reported it to us.

Using the MySQL command:

```sql
show slave status
```

and checking `Seconds_Behind_Master`, we could see the replica was a few ms behind the master.

Generally, if the master/replica delay is serious, there are the following solutions:

-   Split the database: split one master into multiple masters, so the write concurrency of each master drops severalfold and the delay becomes negligible.
-   Turn on MySQL's parallel replication so that multiple databases replicate in parallel. If one database has especially high write concurrency, say 2000/s on a single database, parallel replication is still meaningless.
-   Rewrite the code. Whoever writes the code should be careful: a query issued immediately after an insert may not find the row.
-   If you really must insert first, query immediately, and then immediately perform some follow-up operation on the result, **force this query to go directly to the master**. This approach is **not recommended**: if you do this, the point of read/write splitting is lost.
