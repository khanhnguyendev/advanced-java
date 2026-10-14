---
source:
  locale: zh
  slug: database-shard
  hash: 'sha256:v1:9c5c1de30ff89363123ec42f8049214c79979b372bf53dbe6fb0204ce8add38f'
status: machine
translatedAt: '2026-10-14'
---
# Why Use Database and Table Sharding?

## Interview question

Why use database and table sharding (when designing a high concurrency system, how should the database layer be designed)? Which database and table sharding middleware have you used? What are the advantages and disadvantages of the different middleware? How exactly did you split your databases vertically or horizontally?

## Interviewer psychology

This area is certain to touch on **high concurrency**, because database and table sharding exists to solve two problems: **supporting high concurrency and handling large data volumes**. Frankly, especially in interviews at internet companies, you will basically get this question. Database and table sharding is such a common technical topic that not asking about it would be odd, and not knowing it would be hard to excuse!

## Answer analysis

### Why use database and table sharding? (When designing a high concurrency system, how should the database layer be designed?)

Put plainly, database sharding and table sharding are two different things, so do not mix them up. You may shard only the database without sharding tables, or only shard tables without sharding the database; both are possible.

Let me first throw a scenario at you.

Suppose we are a small startup (or a new department that has just started up inside a BAT company). We now have only 200,000 registered users, 10,000 daily active users, 1,000 new rows per day in a single table, and at the peak at most 10 concurrent requests per second. Goodness, for a system like this, you can just find someone with a few years of experience, add a few fresh trainees, and they can handle it casually.

Unexpectedly we are so lucky that we meet a CEO who leads us onto the highway to success, and the business grows explosively. A few months later, registered users reach 20 million! Daily active users reach 1 million! Single-table data volume per day reaches 100,000 rows! The peak reaches 1,000 requests per second at most! At the same time, the company has also raised two rounds of funding, bringing in several hundred million RMB! The company's valuation reaches an astonishing several hundred million US dollars! This is the pace of a small unicorn!

All right, no problem. Now everyone feels the pressure is a bit heavy. Why? Because 100,000 more rows per day means 3 million more rows per month, and our single table already has several million rows and will soon break through 10 million. But we can barely hold on. The peak is now 1,000 requests, and we have deployed several machines online with load balancing, so the database holding 1,000 QPS is still passable. But now everyone starts to feel a bit worried, and what do we do next...

In the next few months, my goodness, the CEO is amazing: the company's user count reaches 100 million, and the company keeps raising billions of RMB! The company's valuation reaches an astonishing several billion US dollars, and it becomes this year's hottest star startup in the country! Heavens, we are so lucky.

But we are also unlucky, because at this point daily active users are in the tens of millions, the single table gains as many as 500,000 rows per day, and the total data volume of one table has already reached 20 to 30 million rows! We cannot hold on! The database disk capacity keeps being consumed! The peak concurrency reaches an astonishing `5000~8000`! Stop joking, buddy. I guarantee your system would not have lasted until now; it would have gone down already!

All right, by now you should roughly understand what database and table sharding is about. In fact it follows your company's business development: the better the business does, the more users, the more data and the more requests you have, and a single database certainly will not be able to hold.

#### Table sharding

For example, your single table has tens of millions of rows. Are you sure you can hold on? Absolutely not. **A single table with too much data** will greatly affect the **execution performance** of your SQL, and later on your SQL may run very slowly. Generally speaking, in my experience, once a single table reaches a few million rows, performance becomes relatively poor, and you have to shard the table.

What does table sharding mean? It means putting the data of one table into multiple tables, and then querying just one table when you query. For example, shard tables by user id, so that all the data of one user is placed in one table. Then, when operating on a user, you only operate on that table. This keeps the data volume of each table within a controllable range, for example fixing each table at under 2 million rows.

#### Database sharding

What does database sharding mean? In our experience, one database can support at most about 2,000 concurrent requests, at which point you must scale out, and the concurrency of a healthy single database is best kept at around 1,000 per second, not too large. So you can split the data of one database into multiple databases, and when accessing, you just access one database.

This is what is called **database and table sharding**. Why use database and table sharding? You understand now.

| #                 | Before database and table sharding                                 | After database and table sharding                                                      |
| ----------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Concurrency       | MySQL deployed on a single node cannot hold high concurrency       | MySQL goes from a single node to multiple nodes, and the supported concurrency increases many times |
| Disk usage        | The disk capacity of the single-node MySQL is almost full          | Split into multiple databases, so the disk usage of the database servers drops greatly |
| SQL performance   | The single table has too much data, and SQL runs slower and slower | The single-table data volume shrinks, and SQL execution efficiency improves noticeably |

### Which database and table sharding middleware have you used? what are the advantages and disadvantages of the different middleware?

This is really about seeing which database and table sharding middleware you know, what the advantages and disadvantages of each are, and which you have used.

The common ones include:

-   Cobar
-   TDDL
-   Atlas
-   Sharding-jdbc
-   Mycat

#### Cobar

Developed and open-sourced by the Alibaba b2b team, it is a proxy-layer solution, sitting between the application servers and the database servers. The application accesses the Cobar cluster through the JDBC driver, Cobar decomposes SQL according to the SQL and the sharding rules, and then dispatches it to different database instances of the MySQL cluster for execution. It was usable in earlier years, but it has not been updated for the last few years and basically nobody uses it; it is more or less abandoned. It also does not support read/write splitting, stored procedures, cross-database joins, pagination and other operations.

#### TDDL

Developed by the Taobao team, it is a client-layer solution. It supports basic CRUD syntax and read/write splitting, but does not support join, multi-table queries and similar syntax. It is not used much at present, because it also depends on Taobao's diamond configuration management system.

#### Atlas

Open-sourced by 360, it is a proxy-layer solution. Some companies used it before, but a big problem is indeed that the community's latest maintenance was 5 years ago. So very few companies use it now.

#### Sharding-jdbc

Open-sourced by Dangdang, it is a client-layer solution, the client-layer solution of [ `ShardingSphere` ](https://shardingsphere.apache.org), and [ `ShardingSphere` ](https://shardingsphere.apache.org) also provides a proxy-layer solution, Sharding-Proxy. It was indeed used quite a lot before, because its SQL syntax support is fairly broad without too many restrictions, and as of 2019.4 it has reached version `4.0.0-RC1`, supporting database and table sharding, read/write splitting, distributed ID generation, and flexible transactions (best-effort delivery transactions, TCC transactions). Quite a few companies used it before (the official site registers the companies using it, and you can see that many companies have been using it from 2017 until now). The community is still developing and maintaining it and is fairly active. Personally I think it is still a **viable option** today.

#### Mycat

Adapted from Cobar, it is a proxy-layer solution with very complete functionality. It should currently be a very hot and increasingly popular database middleware, with an active community, and some companies have started using it. But compared with Sharding-jdbc it is indeed younger and has been through less battle testing.

#### Summary

In sum, what is recommended for consideration now is Sharding-jdbc and Mycat; both are worth considering.

The **advantages of a client-layer solution like Sharding-jdbc are that it needs no deployment, has low operations cost, needs no extra forwarding hop through a proxy layer, and has very high performance**. But when it is upgraded, every system needs to upgrade its version and be released again, and every system must be **coupled** to the Sharding-jdbc dependency.

The **disadvantage of a proxy-layer solution like Mycat is that it needs to be deployed**: you run a set of middleware yourself, so the operations cost is high. But the **benefit is that it is transparent to each project**, and when an upgrade comes you just do it in your own middleware.

Generally speaking, both solutions can be chosen, but my personal recommendation is that small and medium-sized companies choose Sharding-jdbc: the client-layer solution is lightweight and has low maintenance cost, needs no extra staff, and systems at small and medium-sized companies are less complex and fewer in number. Medium and large companies had better choose a proxy-layer solution like Mycat, because a large company may have very many systems and projects, a large team and enough people, so it is best to assign someone specifically to study and maintain Mycat, and then let a large number of projects use it transparently.

### How exactly did you split your databases vertically or horizontally?

**Horizontal splitting** means putting the data of one table into multiple tables in multiple databases, where every database has the same table structure but each database table holds different data, and the data of all the database tables together is the full data. The point of horizontal splitting is to spread the data evenly over more databases, so that multiple databases carry higher concurrency, and also to scale capacity using the storage capacity of multiple databases.

![database-split-horizon](asset:high-concurrency/database-shard/database-split-horizon.png)

**Vertical splitting** means **splitting a table with many fields into multiple tables**, **or onto multiple databases**. Each database table has a different structure, and each contains some of the fields. Generally, you **put the few fields that are accessed very frequently into one table**, and **put the many fields that are accessed rarely into another table**. Because databases have a cache, the fewer fields per row that are accessed frequently, the more rows can be cached, and the better the performance. This is generally done more at the table level.

![database-split-vertically](asset:high-concurrency/database-shard/database-split-vertically.png)

This is actually quite common, and many of you may have done it yourselves: splitting a big table into an order table, an order payment table and an order product table.

There is also **splitting at the table level**, which is table sharding: turning one table into N tables, that is, **keeping the data volume of each table within a certain range** to guarantee SQL performance. Otherwise, the more data a single table has, the worse the SQL performance. Generally it is around 2 million rows, not too many, but it also depends on how you operate; it could be 5 million, or 1 million. The more complex your SQL, the fewer rows per table there should be.

All right, whether sharding databases or tables, the database middleware mentioned above all support it. Basically, once you have sharded the databases and tables, the middleware can **automatically route to the corresponding database according to a field value you specify**, such as userid, **and then automatically route to the corresponding table**.

You have to think about how to shard databases and tables in your project. Generally, for vertical splitting, you can do it at the table level, splitting some tables with particularly many fields. For horizontal splitting, you can say that concurrency could not be carried, or the data volume was too large and capacity could not be carried, so you split it, and you decide which field to split by. For table sharding, consider this: even if you split into each database and concurrency and capacity are fine, but the tables in each database are still too large, then you shard the table, splitting it up so that the data volume of each table is not very large.

There are also two **ways of sharding databases and tables** here:

-   One is to split by range, that is, each database holds a continuous segment of data. This is generally done by, say, **time range**, but it is rarely used because it easily causes hotspot problems, with a large amount of traffic hitting the latest data.
-   The other is to hash a field to spread the data evenly, which is more commonly used.

The benefit of range splitting is that scaling out is very simple, because you only need to prepare a database for each month in advance, and when a new month arrives, naturally the new database is written to. The drawback is that most requests access the latest data. Whether to use range in actual production depends on the scenario.

The benefit of hash distribution is that the data volume and request pressure of each database can be spread evenly. The drawback is that scaling out is troublesome and involves a data migration process: the previous data needs to have its hash values recomputed and be redistributed to different databases or tables.
