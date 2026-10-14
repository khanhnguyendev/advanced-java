---
source:
  locale: zh
  slug: es-architecture
  hash: 'sha256:v1:787677daa237401687df251e2bd33d753566deb2854438ad782a3ca73a03f9a5'
status: machine
translatedAt: '2026-10-14'
---
# Principles of ES Distributed Architecture

## Interview question

Can you explain the principles of ES's distributed architecture (how does ES achieve being distributed)?

## Interviewer Psychology

In the search field, lucene is the most popular search library. A few years ago the industry generally asked: do you know lucene? Do you know the principle of the inverted index? That is long out of date, because many projects now directly use a distributed search engine based on lucene, ElasticSearch, ES for short.

Distributed search has now basically become standard for Java systems in most of the internet industry, and ES is especially popular. In the years before ES took off, people generally used solr. But in the past two years most companies and projects have begun switching to ES.

So an internet interview will surely chat with you about distributed search engines, and therefore about ES. If you really do not know it, you are truly out of date.

If the interviewer asks you a first question, it will indeed generally be whether you can introduce the distributed architecture design of ES, to see your basic understanding of the architecture of a distributed search engine.

## Answer analysis

The design philosophy of ElasticSearch is a distributed search engine, built on lucene underneath. The core idea is to start multiple ES process instances on multiple machines, forming an ES cluster.

The **basic unit of data storage** in ES is the index. For example, if you now want to store some order data in ES, you should create an index `order_idx` in ES, and all the order data is written into this index. An index is roughly equivalent to a database in mysql.

```
index -> type -> mapping -> document -> field
```

To make the introduction more straightforward, I will draw an analogy here. But remember, do not equate them; the analogy is only for ease of understanding.

An index is like a mysql database. A type cannot be compared with anything in mysql: one index can have multiple types, and the fields of each type are mostly similar but with some slight differences. Suppose there is an index, an order index, dedicated to storing order data. It is like creating tables in mysql: some orders are orders for physical goods, such as a piece of clothing or a pair of shoes, and some are orders for virtual goods, such as game cards and phone top-ups. Most fields of the two kinds of orders are the same, but a small number of fields may differ slightly.

So in the order index you create two types, one for physical goods orders and one for virtual goods orders. Most fields of these two types are the same, and a few are different.

In many cases an index may have only one type, but if an index does have multiple types (**note**: the concept of `mapping types` has been completely removed in ElasticSearch 7.x; for details see the [official documentation](https://github.com/elastic/elasticsearch/blob/6.5/docs/reference/mapping/removal_of_types.asciidoc)), you can regard an index as a table of one category, and each type represents one concrete table in mysql. Each type has a mapping. If you regard a type as a concrete table, then the index represents the category that multiple types belong to together, and the mapping is the **table schema definition** of this type. When you create a table in mysql you certainly have to define the table schema: which fields it has and what type each field is. A record you actually write into a type of an index is called a document. A document represents one row in some table in mysql. Each document has multiple fields, and each field represents the value of one field in this document.

![es-index-type-mapping-document-field](diagram:high-concurrency/es-architecture/es-index-type-mapping-document-field)

When you create an index, it can be split into multiple `shard`s, with each shard storing part of the data. Splitting into multiple shards has benefits. First, it **supports horizontal scaling**. For example, if you have 3T of data and 3 shards, each shard holds 1T of data; if the data grows to 4T, how do you scale? Simple: create a new index with 4 shards and import the data. Second, it **improves performance**: the data is distributed across multiple shards, that is, multiple servers, and all operations are executed in parallel and distributed across multiple machines, which improves throughput and performance.

Next, the data of a shard actually has multiple copies. Each shard has one `primary shard`, responsible for writing data, and also several `replica shard`s. After the `primary shard` writes data, it synchronizes the data to the other `replica shard`s.

![es-cluster](diagram:high-concurrency/es-architecture/es-cluster)

With this replica scheme, the data of every shard has multiple copies. If some machine crashes, no problem, because other copies of the data are on other machines. That is high availability.

Among the multiple nodes of an ES cluster, one node is automatically elected as the master node. This master node basically does management work, such as maintaining index metadata and switching the roles of primary shards and replica shards. If the master node crashes, another node is elected as the new master node.

If a non-master node crashes, the master node transfers the role of the primary shards on that crashed node to replica shards on other machines. Then, once you repair the crashed machine and restart it, the master node controls the allocation of the missing replica shards to it and the synchronization of subsequently modified data, and so on, so that the cluster returns to normal.

To put it more simply, suppose a non-master node crashes. Then the primary shards on this node are gone. Fine, the master switches the replica shards (on other machines) corresponding to those primary shards to primary shards. If the crashed machine is repaired, the repaired node is no longer a primary shard but a replica shard.

In fact, the above is the most basic architecture design of ElasticSearch as a distributed search engine.
