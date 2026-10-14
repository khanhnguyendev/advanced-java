---
source:
  locale: zh
  slug: es-introduction
  hash: 'sha256:v1:62194d793abe900885c01cd6364a0f91b335a65dfa07764307531a49ada9e6d2'
status: machine
translatedAt: '2026-10-14'
---
# Introduction to Search Engines

## The History of Lucene and ES

Lucene is the most advanced and most powerful search library. Developing directly on Lucene is very complex: even to write some simple features you have to write a large amount of Java code, and you need a deep understanding of the principles.

ElasticSearch is built on Lucene. It hides the complexity of lucene and provides a simple and easy-to-use RESTful api / Java api interface (there are also api interfaces for other languages).

-   A distributed document storage engine
-   A distributed search engine and analytics engine
-   Distributed, supporting PB-scale data

## Core Concepts of ES

### Near Realtime

Near real-time has two meanings:

-   There is a small delay (about 1s) from writing data to the data being searchable
-   Search and analytics based on ES can reach second-level latency

### Cluster

A cluster contains multiple nodes. Which cluster each node belongs to is determined by a configuration. For small and medium-sized applications, it is perfectly normal for a cluster to have just one node at the beginning.

### Node

A node is one node in the cluster. A node also has a name, which is randomly assigned by default. By default a node joins a cluster named `elasticsearch`. If you simply start a bunch of nodes, they automatically form an elasticsearch cluster; of course, a single node can also form an elasticsearch cluster.

### Document & field

A document is the smallest unit of data in ES. A document can be one piece of customer data, one piece of product category data, or one piece of order data, and is usually represented with a json data structure. Each type under each index can store multiple documents. A document contains multiple fields, and each field is a data field.

```json
{
    "product_id": "1",
    "product_name": "iPhone X",
    "product_desc": "苹果手机",
    "category_id": "2",
    "category_name": "电子产品"
}
```

### Index

An index contains a pile of document data with a similar structure, such as a product index. An index contains many documents, and an index represents a class of similar or identical documents.

### Type

Each index can have one or more types. A type is a logical category of an index. For example, a product index has multiple types: a daily chemical goods type, an electrical appliance type, and a fresh food type. The fields of the documents under each type may differ somewhat.

### shard

A single machine cannot store a large amount of data. ES can split the data in an index into multiple shards, stored across multiple servers. With shards you can scale horizontally and store more data, and let operations such as search and analytics execute distributed across multiple servers, improving throughput and performance. Each shard is a lucene index.

### replica

Any server may fail or crash at any time, and the shards on it may then be lost, so you can create multiple replicas for each shard. A replica can provide backup service when a shard fails, ensuring data is not lost, and multiple replicas can also improve the throughput and performance of search operations. The primary shard count is set once when the index is created and cannot be modified (5 by default), while the replica shard count can be modified at any time (1 per primary by default). By default each index has 10 shards, 5 primary shards and 5 replica shards, and the minimum high availability configuration is 2 servers.

Put another way, shards are divided into primary shards and replica shards. A primary shard is generally just called a shard, and a replica shard is generally just called a replica.

![es-cluster-0](asset:high-concurrency/es-introduction/es-cluster-0.png)

## ES core Concepts vs. DB core Concepts

| ES       | DB       |
| -------- | -------- |
| index    | database |
| type     | table    |
| document | a row    |

The above is a simple analogy.
