---
source:
  locale: zh
  slug: database-shard-method
  hash: 'sha256:v1:27eafefb7e592f0e06afb623564b3bdffc96a0446eb4a84c4bb85c564eb1c796'
status: machine
translatedAt: '2026-10-14'
---
# How to Transition Smoothly to Database and Table Sharding?

## Interview question

There is a system that does not yet use database and table sharding, and it will need it in the future. How should it be designed so that the system can **dynamically switch** from no database and table sharding to database and table sharding?

## Interviewer psychology

You see, you now understand why to use database and table sharding, you know the commonly used middleware, and you have designed how your team will shard (horizontal splitting, vertical splitting, table sharding). So the question comes: next, how do you migrate that single-database, single-table system onto database and table sharding?

So everything is linked step by step, and this tests whether you have been through the whole process.

## Answer analysis

There are in fact several solutions, from low-end to high-end. We have played with all of them, and I will go through them for you.

### Downtime migration plan

Let me first tell you the lowest-end plan, which is very simple. Everyone starts maintenance at 12 midnight, and the website or app posts an announcement saying maintenance runs from 0:00 to 6:00 in the morning and it cannot be accessed.

Then at 0:00 you shut down. The system is stopped and no traffic is written, so the old single-database, single-table database is static. You must have written a **one-off tool for exporting and importing data** beforehand, and you run it directly now, reading the data of the single-database, single-table out in a flood and writing it into the sharded databases and tables.

After the data is transferred, it is ok. You modify the system's database connection configuration and so on (the code and SQL may have changed too), use the latest code, and start it directly connected to the new sharded databases and tables.

Verify, ok, perfect. Everyone stretches, looks at the Beijing night view at 4 in the morning, and takes a taxi home.

But this plan is quite low-end, and anyone can do it. Let us look at a more high-end plan.

![database-shard-method-1](diagram:high-concurrency/database-shard-method/database-shard-method-1)

### Dual-write migration plan

This is a migration plan we commonly use. It is more reliable, needs no downtime, and you do not have to watch the Beijing scenery at 4 in the morning.

Simply put, in the online system, everywhere that previously wrote to the database, for insert, delete and update operations, **besides inserting, deleting and updating the old database, you also add inserts, deletes and updates to the new database**. This is what is called **dual write**: writing to two databases at the same time, the old database and the new database.

Then, after the **system is deployed**, the new database is still far behind in data, so you run the data transfer tool mentioned earlier, which reads data from the old database and writes it to the new database. When writing, use a field such as gmt_modified to determine when the record was last modified, and only write if the data that was read does not exist in the new database, or is newer than the data in the new database. Put simply, old data is not allowed to overwrite new data.

After one pass of the transfer, the data may still be inconsistent, so the program automatically runs a round of verification, comparing every record of every table in the old and new databases. If there are differences, it reads the data from the old database again and writes it for those differing records. This loops repeatedly until the data of every table in the two databases is fully consistent.

Then, once the data is fully consistent, it is ok. Redeploy using the latest code that uses only the sharded databases and tables, and then you operate on the sharded databases and tables only, without hours of downtime, which is very stable. So basically this is how people do data migration now.

![database-shard-method-2](diagram:high-concurrency/database-shard-method/database-shard-method-2)
