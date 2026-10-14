---
source:
  locale: zh
  slug: redis-cluster
  hash: 'sha256:v1:5c1c2664ac4fff708a471d907a0ca2b6e6c1f2d98043dcb43bcc11dd7bdb7cdf'
status: machine
translatedAt: '2026-10-14'
---
# Principles of Redis Cluster Mode

## Interview question

How does Redis cluster mode work? In cluster mode, how are Redis keys addressed? What distributed addressing algorithms are there? Do you know the consistent hashing algorithm?

## Interviewer psychology

A few years ago, if you wanted several Redis nodes, each storing part of the data, you had to **rely on some middleware** to do it, such as `codis` or `twemproxy`. With such Redis middleware, you read and write through the middleware, and the middleware is responsible for distributing your data across Redis instances on multiple machines.

In the last couple of years Redis has kept evolving and new versions keep appearing. Today's Redis cluster mode can deploy multiple Redis instances across multiple machines, each instance storing part of the data, and each Redis master instance can have Redis replica instances attached. It automatically guarantees that if a Redis master instance goes down, traffic switches over to a Redis replica instance.

With the newer Redis versions, everyone uses Redis cluster, the cluster mode that Redis supports natively, so the interviewer will certainly fire a few rounds of follow-up questions about Redis cluster at you. If you have never used Redis cluster, that is normal: in the past many people used client-side solutions such as codis to support clustering. But you should at least study Redis cluster.

If your data volume is small and the main goal is to serve high concurrency and high performance, for example your cache is only a few GB, a single node is enough. You can use replication with one master and multiple slaves (the number of slaves depends on the read throughput you need), and then build a sentinel cluster yourself to guarantee the high availability of the Redis master/replica architecture.

Redis cluster is mainly aimed at scenarios with **large-scale data + high concurrency + high availability**. Redis cluster supports N Redis master nodes, and each master node can have multiple replica nodes attached. In this way the whole Redis deployment can scale horizontally. If you need to cache an even larger amount of data, scale out horizontally with more master nodes, and each master node can then hold more data.

## Answer analysis

### Introduction to Redis cluster

-   Automatically shards the data, with each master holding a portion of it
-   Provides built-in high availability support: it keeps working when some masters are unavailable

In a Redis cluster architecture, each Redis node opens two ports. One is the normal port, for example 6379, and the other is that port plus 10,000, for example 16379.

Port 16379 is used for communication between nodes, which is the so-called cluster bus. Cluster bus communication is used for failure detection, configuration updates and failover authorization. The cluster bus uses another binary protocol, the `gossip` protocol, for efficient data exchange between nodes, which takes less network bandwidth and processing time.

### Internal communication mechanism between nodes

#### Basic communication principles

There are two ways to maintain cluster metadata: centralized, and the gossip protocol. Redis cluster nodes communicate with each other using the gossip protocol.

**Centralized** storage keeps the cluster metadata (node information, failures and so on) on a single node. A typical example of centralized metadata storage is `storm` in the big data field. It is a distributed real-time big data computing engine with a centralized metadata structure, and underneath it relies on zookeeper (distributed coordination middleware) to store and maintain all the metadata.

![zookeeper-centralized-storage](diagram:high-concurrency/redis-cluster/zookeeper-centralized-storage)

Redis maintains cluster metadata in another way, the `gossip` protocol. Every node holds a copy of the metadata, and when the metadata changes on one node, it keeps sending the metadata to other nodes so that they update their metadata as well.

![Redis-gossip](diagram:high-concurrency/redis-cluster/redis-gossip)

The **advantage** of **centralized** storage is that metadata reads and updates have very good latency: as soon as the metadata changes it is updated in the central store, and other nodes notice it when they read. The **disadvantage** is that all metadata update pressure is concentrated in one place, which may put the metadata store under strain.

The advantage of gossip is that metadata updates are spread out rather than concentrated in one place: update requests arrive at all the nodes one after another, which lowers the pressure. The disadvantage is that metadata updates are delayed, so some cluster operations may lag behind.

-   Port 10000: every node has a dedicated port for communication between nodes, namely the port it serves clients on plus 10000. For example, for 7001 the inter-node communication port is 17001. Every so often, each node sends `ping` messages to several other nodes, and those nodes return `pong` after receiving the `ping`.

-   Information exchanged: failure information, node additions and removals, hash slot information and so on.

#### The gossip protocol

The gossip protocol includes many kinds of messages, including `ping`, `pong`, `meet`, `fail` and so on.

-   meet: a node sends meet to a newly joined node so that the new node joins the cluster, and then the new node starts communicating with the other nodes.

```bash
Redis-trib.rb add-node
```

Internally this actually sends a gossip meet message to the newly joined node, notifying it to join our cluster.

-   ping: every node frequently sends ping to other nodes, carrying its own state and the cluster metadata it maintains; nodes exchange metadata with each other through ping.
-   pong: the reply to ping and meet, containing its own state and other information; it is also used for information broadcast and updates.
-   fail: after a node decides that another node has failed, it sends fail to the other nodes to tell them that a certain node has crashed.

#### A closer look at ping messages

A ping has to carry some metadata, so if pings are too frequent they may add to the network load.

Each node runs 10 pings per second, and each time it picks the 5 other nodes it has not communicated with for the longest time. Of course, if a node's communication latency reaches `cluster_node_timeout / 2`, a ping is sent to it immediately, to avoid data exchange being delayed for too long and falling too far behind. For example, if two nodes have not exchanged data for 10 minutes, the whole cluster is in a state of serious metadata inconsistency, which causes problems. So `cluster_node_timeout` is tunable: if it is set larger, the ping frequency goes down.

Each ping carries the node's own information plus the information of 1/10 of the other nodes, and is sent out for exchange. It contains the information of at least `3` other nodes and at most `总节点数减 2` (total number of nodes minus 2) other nodes.

### Distributed addressing algorithms

-   Hash algorithm (a large amount of cache has to be rebuilt)
-   Consistent hashing algorithm (automatic cache migration) + virtual nodes (automatic load balancing)
-   The hash slot algorithm of Redis cluster

#### Hash algorithm

When a key arrives, compute its hash value first, then take the modulo by the number of nodes (hash modulo), and the key lands on one of the master nodes. Once one master node crashes, all requests take the modulo by the new, reduced number of remaining master nodes and try to fetch data. This causes **most requests to be unable to obtain a valid cache entry**, so a large amount of traffic floods into the database.

![hash](diagram:high-concurrency/redis-cluster/hash)

#### Consistent hashing algorithm

The consistent hashing algorithm organizes the whole hash value space into a virtual ring, laid out in the clockwise direction. Next, each master node is hashed (using the server's IP or host name), which determines the position of each node on the hash ring.

When a key arrives, compute its hash value and determine its position on the ring, then **walk clockwise** along the ring from that position; the first master node encountered is where the key lives.

In consistent hashing, if a node goes down, the only data affected is the data between this node and the previous node on the ring (the first node met when walking counterclockwise); everything else is unaffected. Adding a node works the same way.

However, when there are too few nodes, consistent hashing easily suffers from **cache hotspots** because the nodes are distributed unevenly. To solve this hotspot problem, consistent hashing introduces a virtual node mechanism: several hashes are computed for each node, and a virtual node is placed at the position of each result. This achieves even data distribution and load balancing.

![consistent-hashing-algorithm](diagram:high-concurrency/redis-cluster/consistent-hashing-algorithm)

#### The hash slot algorithm of Redis cluster

Redis cluster has a fixed `16384` hash slots. Compute the `CRC16` value of each `key` and take it modulo `16384` to get the hash slot of the key.

Every master in a Redis cluster holds some of the slots. For example, with 3 masters, each master may hold a little over 5,000 hash slots. Hash slots make adding and removing nodes simple: when a master is added, some hash slots are moved over from the other masters, and when a master is removed, its hash slots are moved to the other masters. The cost of moving hash slots is very low. Through the client API, you can make specified data go to the same hash slot, which is done with a `hash tag`.

If any one machine crashes, the other two nodes are not affected, because a key maps to a hash slot, not to a machine.

![hash-slot](diagram:high-concurrency/redis-cluster/hash-slot)

### High availability and master/replica failover in Redis cluster

The high availability principle of Redis cluster is almost the same as that of Sentinel.

#### Detecting a node crash

If one node considers another node crashed, that is `pfail`, **subjectively down (sdown)**. If multiple nodes all consider that node crashed, that is `fail`, **objectively down (odown)**. This is almost the same as the Sentinel principle: sdown and odown.

If a node returns no `pong` within `cluster-node-timeout`, it is considered `pfail`.

If a node considers some node `pfail`, it passes this on to other nodes through `ping` in `gossip ping` messages. If **more than half** of the nodes consider it `pfail`, it becomes `fail`.

#### Replica filtering

For a crashed master node, one of its replica nodes is chosen to be switched to master.

Check how long each replica node has been disconnected from the master node. If it exceeds `cluster-node-timeout * cluster-slave-validity-factor`, it is **not eligible** to be switched to `master`.

#### Replica election

Each replica sets an election time based on the offset of the data it has replicated from the master. The larger the offset (the more data replicated), the earlier the replica's election time, and the earlier it takes part in the election.

All master nodes start the slave election vote and vote for the slave that is running for election. If most of the master nodes `（N/2 + 1）` vote for a replica, the election passes and that replica can be switched to master.

The replica then performs the failover, switching from replica to master.

#### Comparison with Sentinel

The whole process is very similar to Sentinel, so Redis cluster is powerful: it directly integrates the functions of replication and sentinel.
