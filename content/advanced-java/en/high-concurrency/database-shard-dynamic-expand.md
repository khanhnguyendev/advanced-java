---
source:
  locale: zh
  slug: database-shard-dynamic-expand
  hash: 'sha256:v1:32fceb0cc07f4331bfbc09992612040125dd8097084537a72c6715eb3ba40852'
status: machine
translatedAt: '2026-10-14'
---
# Dynamic Scale-Out and Scale-In Plan

## Interview question

How do you design a database and table sharding plan that can scale out and scale in dynamically?

## Interviewer psychology

For database and table sharding, the main problems to face are the following:

-   Choose a database middleware: research it, learn it, test it;
-   Design your sharding plan: how many databases to split into, and how many tables each database is split into, for example 3 databases with 4 tables each;
-   Based on the chosen database middleware and the sharding environment set up in the test environment, test whether reads and writes against the sharded databases and tables work normally;
-   Complete the **migration** from a single database and single table to the sharded databases and tables, using the dual-write plan;
-   The online system starts serving externally on top of the sharded databases and tables;
-   Scale-out: scale out to 6 databases with 12 tables each. How do you add more databases and tables?

This is something you must face. You have already worked out the sharding plan, and a pile of databases and tables are built. The code development based on the sharding middleware is done, the tests are ok, and the data can be spread evenly across the databases and tables. Moreover, you then went live through the dual-write plan in one go, and are already running directly on the sharding plan.

So now the question: these databases and tables can no longer hold up, and you need to keep scaling out. What do you do? Perhaps the capacity of each database is nearly full again, or the data volume of your tables is too large again, or the write concurrency of each database is too high, so you must keep scaling out.

All of this is something you must go through when running database and table sharding online.

## Answer analysis

### Downtime scale-out (not recommended)

This plan is the same as downtime migration, with almost identical steps. The only point is that the data transfer tool extracts the data of the existing databases and tables and slowly imports it into the new databases and tables. But you had better not play it this way, as it is not very reliable: since you **sharded databases and tables**, the data volume must be really large, possibly as many as hundreds of millions of rows, or even billions, and doing it this way may cause problems.

When migrating from a single database and single table to sharded databases and tables, the data volume is not very large, with a single table at most 20 to 30 million rows. Then you write a tool and run it in parallel on several machines, and the data is transferred in 1 hour. That is no problem.

If you have 3 databases + 12 tables and have been running for a while, the data volume reaches 100 to 200 million. Just transferring 200 million rows takes several hours. By 6 o'clock the data transfer has only just finished, and there is still the follow-up of modifying configuration, restarting the system, and testing and verification, which are not done until 10 o'clock. So you cannot do it this way.

### The optimized plan

From the very beginning, use 32 databases with 32 tables each, so there are 1024 tables in total.

I can tell you that, first, this split is basically enough for internet companies in China, and second, it has no problem in terms of either concurrency or data volume.

If the normal write concurrency each database carries is 1000, then 32 databases can carry $32 \times 1000 = 32000$ concurrent writes. If each database carries 1500 concurrent writes, the total is $32 \times 1500 = 48000$ concurrent writes, close to 50,000 concurrent writes per second. Put an MQ in front for peak shaving, with 80,000 rows written into the MQ per second and 50,000 rows consumed per second.

Only some of the companies at the very top in China may have a scale of several hundred database machines for their most core systems, with 128 databases, 256 databases or 512 databases.

With 1024 tables, assuming each table holds 5 million rows, MySQL can hold 5 billion rows.

With 50,000 concurrent writes per second and 5 billion rows in total, this is in fact enough for most internet companies in China.

When talking about scale-out for database and table sharding, **split enough in one go the first time**. 32 databases and 1024 tables may already support most small and medium-sized internet companies for several years.

One practice is to shard using $32 \times 32$, that is, split into 32 databases, with one table in each database split into 32 tables, for a total of 1024 tables. For an id, first take the modulo by 32 to route to a database, then take the modulo by 32 again to route to a table within the database.

| orderId | id % 32 (database) | id / 32 % 32 (table) |
| ------- | ------------------ | -------------------- |
| 259     | 3                  | 8                    |
| 1189    | 5                  | 5                    |
| 352     | 0                  | 11                   |
| 4593    | 17                 | 15                   |

At the beginning, these databases may be logical databases built on one database server, that is, one MySQL server may host n databases, for example 32 databases. Later, if you need to split, you just keep migrating databases between MySQL servers, and the system only needs a configuration change.

For example, you can scale out to at most 32 database servers, with each database server hosting one database. If that is still not enough, you can scale out to at most 1024 database servers, each hosting one database with one table, giving at most 1024 tables.

Doing it this way, you do not have to write your own code to migrate data, and can leave it all to the DBA. The DBA does need to do some database and table migration work, but that is surely far more efficient than writing code yourself and extracting and importing data.

Even if you want to reduce the number of databases, it is simple: put plainly, you just scale in by a multiple and then modify the routing rule.

Here is a summary of the steps:

1. Decide on the number of database servers, how many databases per server and how many tables per database. The recommendation is $32 \text{ databases} \times 32 \text{ tables}$, which may be enough for several years for most companies.
2. Routing rule: orderId modulo 32 = database, orderId / 32 modulo 32 = table.
3. When scaling out, apply for more database servers and install MySQL, scaling out by multiples: from 4 servers to 8 servers, then to 16 servers.
4. The DBA migrates the databases of the original database servers onto the new database servers. There are convenient tools for database migration.
5. On our side we just modify the configuration, adjusting the address of the database server where each migrated database lives.
6. Redeploy the system and go live. The original routing rule does not need to change at all, and the online system can keep serving directly on n times the database server resources.
