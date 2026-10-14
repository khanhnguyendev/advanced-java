---
source:
  locale: zh
  slug: high-concurrency-design
  hash: 'sha256:v1:edbc10e50587830b6242e3ee6baf1d6905008b4928c7aed01d7a2f5692240f14'
status: machine
translatedAt: '2026-10-14'
---
# How to Design a High Concurrency System

## Interview Question

How do you design a high concurrency system?

## Interviewer Psychology

Honestly, if an interviewer asks you this question, you have to pull out all the stops. Why? Because look at the JDs in many companies' job postings: they all say that experience with high concurrency is preferred.

If you really have the skills and have worked on a high concurrency system at an internet company, then getting an offer is basically like taking something out of a pocket, no problem. And the interviewer would never ask you like this, otherwise he would be foolish.

Suppose you worked on a high concurrency system at a well-known e-commerce company: hundreds of millions of users, billions of requests a day, peak concurrency of tens of thousands or even a hundred thousand. Then they will surely question you closely about your system architecture. What does your architecture look like? How is it deployed? How many machines? How do you use the cache? How do you use the MQ? How do you use the database? They want to dig into exactly how you withstood high concurrency.

Anyone who has really worked on high concurrency knows that a system architecture detached from the business is just armchair strategy. In a complex business scenario that is also high concurrency, the architecture is certainly not that simple. Is using redis and an MQ enough? Of course not. Once a real system architecture is combined with the business, it is many times more complex than this simple so-called "high concurrency architecture".

If an interviewer asks you "how do you design a high concurrency system?", then sorry to say, **it must be because you have not actually worked on a high concurrency system**. The interviewer looked at your resume, found nothing outstanding, and felt you were not that good, so he asks how to design a high concurrency system. Put plainly, the point is to see whether you have researched it yourself and built up some knowledge.

The best option is of course to hire a guy who has really worked on high concurrency, but such people are scarce and hard to hire. So the next best thing is to hire a guy who has researched it himself, which is better than hiring a guy who knows nothing, right?

So at this point you have to put on a personal show and show off everything you know about high concurrency!

## Answer Analysis

To really understand the problem of high concurrency, you have to start from its root. Why does high concurrency exist? Why is high concurrency such a big deal?

Put simply, systems at the beginning all connect to a database, and once a database is supporting two or three thousand concurrent requests per second, it is basically near its end. That is why many companies start with fairly low-grade technology, the business grows too fast, and at some point the system cannot take the pressure and goes down.

Of course it goes down; why wouldn't it? If your database suddenly has to carry 5,000 or 8,000, or even more than 10,000 concurrent requests per second, it will certainly crash, because MySQL, for example, simply cannot withstand that much concurrency.

So why is high concurrency a big deal? Because more and more people use the internet now, and many apps, websites and systems carry high concurrency requests; a few thousand concurrent requests per second at peak is quite normal. For something like Singles' Day, tens of thousands or even hundreds of thousands per second are possible.

With such high concurrency on top of business that is already so complex, how do you play it? The truly capable people are surely those who have worked with high concurrency architecture in complex business systems. You have not, so let me tell you how to answer this question:

It can be divided into the following 6 points:

-   System splitting
-   Cache
-   MQ
-   Database and table sharding
-   Read/write splitting
-   Elasticsearch

![high-concurrency-system-design](asset:high-concurrency/high-concurrency-design/high-concurrency-system-design.png)

### System Splitting

Split one system into multiple subsystems, using dubbo. Then connect each system to its own database. Originally there was one database, now there are several, so can't that carry high concurrency too?

### Cache

Cache: you must use a cache. Most high concurrency scenarios are **read-heavy and write-light**, so you can simply write the data to both the database and the cache, and then send most reads to the cache. After all, redis easily handles tens of thousands of concurrent requests on a single node. So think about the **read scenarios that carry the main requests in your project, and how to use a cache to withstand high concurrency**.

### MQ

MQ: you must use an MQ. You may still face high concurrency write scenarios, for example one business operation that has to hit the database dozens of times with inserts, deletes and updates; that is crazy. High concurrency will certainly make your system go down. Using redis to carry the writes is definitely not feasible: it is a cache, data can be evicted by LRU at any time, its data format is extremely simple, and it has no transaction support. So you still have to use MySQL where MySQL is needed. What do you do then? Use an MQ: pour the large volume of write requests into the MQ, let them queue up and play out slowly, and **have the downstream systems consume and write slowly**, keeping the load within what MySQL can carry. So consider the scenarios in your project that carry complex write business logic, and how to use an MQ to write asynchronously and raise concurrency. A single-node MQ can also carry tens of thousands of concurrent requests; this was covered specifically before.

### Database and Table Sharding

Database and table sharding: in the end the database layer may still be unable to avoid the requirement of withstanding high concurrency. Fine, then split one database into multiple databases, so that multiple databases carry higher concurrency; then **split one table into multiple tables**, keeping each table's data volume smaller to improve SQL performance.

### Read/Write Splitting

Read/write splitting: most of the time the database is also read-heavy and write-light, so there is no need to concentrate all requests on one database. You can set up a master/replica architecture, with **writes to the master** and **reads from the replicas**, which is read/write splitting. When **read traffic is too high**, you can also **add more replicas**.

### Elasticsearch

Elasticsearch, ES for short. ES is distributed and can be scaled out freely. Being distributed naturally supports high concurrency, because you can scale out and add machines at any time to carry higher concurrency. So some fairly simple queries and statistical operations can be handled by ES, and so can some full-text search operations.

The 6 points above are basically things a high concurrency system must do. You can think them over carefully against the knowledge covered earlier, and when the time comes you can lay this out systematically, then describe what to watch out for in each part, which was all covered before, to show that you have built up some knowledge here.

To be honest, what makes you truly capable is not understanding some technologies, or roughly knowing what a high concurrency system should look like. In a real, complex business system, doing high concurrency is dozens to hundreds of times more complex than the points above. You need to consider which data needs database and table sharding and which does not, how to join between a single database and table and sharded ones, which data goes into the cache, and which data you put there so that it can withstand high concurrency requests. After analyzing a complex business system, you then gradually introduce the high concurrency architecture transformation. This process is extremely complex; once you have done it and done it well, you will be very much in demand in this market.

What most companies actually value is not that you master the basic architecture knowledge and technologies related to high concurrency, such as RocketMQ, Kafka, Redis and Elasticsearch. Even if you understand high concurrency, you are only a second-tier candidate. For a complex distributed system with hundreds of thousands of lines of code, someone who has architected, designed and practiced a high concurrency architecture step by step has an experience that is rare and valuable.
