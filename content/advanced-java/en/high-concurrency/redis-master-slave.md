---
source:
  locale: zh
  slug: redis-master-slave
  hash: 'sha256:v1:6f8efdf3fcb4f9e94b9e14246a636789e8b62e089d8c1473ba37b1adfd80c0bc'
status: machine
translatedAt: '2026-10-14'
---
# Redis Master/Replica Architecture

A single Redis node can carry roughly from over ten thousand to tens of thousands of QPS. A cache is generally used to support **high-concurrency reads**. So the architecture is built as a master/replica (master-slave) architecture with one master and multiple slaves: the master handles writes and replicates data to the other replica nodes, and the replica nodes handle reads. **All read requests go to the replica nodes.** This also makes horizontal scaling easy and **supports high-concurrency reads**.

![Redis-master-slave](asset:high-concurrency/redis-master-slave/redis-master-slave.png)

Redis replication -> master/replica architecture -> read/write splitting -> horizontal scaling to support high-concurrency reads

## Core mechanisms of Redis replication

-   Redis replicates data to replica nodes **asynchronously**, but starting with Redis 2.8, a replica node periodically acknowledges the amount of data it has replicated each time;
-   One master node can be configured with multiple replica nodes;
-   A replica node can also connect to other replica nodes;
-   When a replica node replicates, it does not block the normal work of the master node;
-   When a replica node replicates, it also does not block queries against itself and serves them with the old data set; but when replication completes, it has to delete the old data set and load the new one, and during that time it pauses serving external requests;
-   Replica nodes are mainly used for horizontal scaling and read/write splitting, and the added replica nodes can increase read throughput.

Note that if you use a master/replica architecture, you are advised to **enable** [persistence](doc:advanced-java/high-concurrency/redis-persistence) on the master node. Using a replica node as a hot backup of the master node's data is not recommended, because if you turn off persistence on the master, then when the master crashes and restarts its data may be empty, and after one round of replication the data on the replica nodes may be lost too.

In addition, you also need various backup schemes for the master. In case all local files are lost, pick an rdb from the backups to restore the master, which **ensures there is data at startup**. Even with the [high availability mechanism](doc:advanced-java/high-concurrency/redis-sentinel) described later, where a replica node can automatically take over from the master node, the master node may restart automatically before Sentinel detects the master failure, which can still cause the data of all the replica nodes above to be wiped.

## Core principle of Redis master/replica replication

When a replica node starts, it sends a `PSYNC` command to the master node.

If this is the first time the replica node connects to the master node, it triggers a `full resynchronization`, a full replication. The master then starts a background thread to generate an `RDB` snapshot file, and meanwhile caches in memory all new write commands received from clients. After the `RDB` file is generated, the master sends this `RDB` to the slave. The slave first **writes it to local disk and then loads it from local disk into memory**, after which the master sends the write commands cached in memory to the slave, and the slave synchronizes that data as well. If a replica node loses its connection to the master node because of a network failure, it reconnects automatically, and after reconnecting the master node copies only the missing part of the data to the slave.

![Redis-master-slave-replication](asset:high-concurrency/redis-master-slave/redis-master-slave-replication.png)

### Resumable master/replica replication

Starting with Redis 2.8, master/replica replication supports resuming from a breakpoint. If the network connection drops during replication, replication can continue from where it left off last time instead of starting over from the beginning.

The master node maintains a backlog in memory, and both master and slave keep a replica offset and a master run id; the offset is stored in the backlog. If the network connection between master and slave drops, the slave asks the master to continue replicating from the last replica offset. If the corresponding offset cannot be found, a `resynchronization` is performed.

> Locating the master node by host+ip is unreliable. If the master node restarts or its data changes, the replica node should distinguish them by their different run ids.

### Diskless replication

The master creates the `RDB` directly in memory and sends it to the slave, without writing it to its local disk. You only need to enable `repl-diskless-sync yes` in the configuration file.

```bash
repl-diskless-sync yes

# Wait 5s before starting replication, because more slaves need to reconnect
repl-diskless-sync-delay 5
```

### Handling expired keys

A slave does not expire keys; it only waits for the master to expire them. If the master expires a key, or evicts a key via LRU, it simulates a del command and sends it to the slave.

## The complete replication flow

When a replica node starts, it saves the master node's information locally, including the master node's `host` and `ip`, but the replication flow has not started.

A replica node has an internal scheduled task that checks every second whether there is a new master node to connect to and replicate from. If it finds one, it establishes a socket network connection with the master node. Then the replica node sends a `ping` command to the master node. If the master has requirepass set, the replica node must send the masterauth password to authenticate. The master node **performs a full replication for the first time**, sending all data to the replica node. Afterwards, the master node continuously replicates write commands to the replica node asynchronously.

![Redis-master-slave-replication-detail](asset:high-concurrency/redis-master-slave/redis-master-slave-replication-detail.png)

### Full replication

-   The master runs bgsave and generates an rdb snapshot file locally.
-   The master node sends the rdb snapshot file to the replica node. If copying the rdb takes more than 60 seconds (repl-timeout), the replica node considers the replication failed. You can raise this parameter appropriately (for a machine with a gigabit network card, about 100MB is generally transferred per second, so a 6G file may well exceed 60s).
-   While generating the rdb, the master node caches all new write commands in memory, and after the replica node has saved the rdb, it replicates the new write commands to the replica node.
-   If during replication the memory buffer keeps consuming more than 64MB, or exceeds 256MB at once, replication stops and fails.

```bash
client-output-buffer-limit slave 256MB 64MB 60
```

-   After receiving the rdb, the replica node clears its old data and then reloads the rdb into its own memory. Note that before clearing the old data, the replica node still serves external requests **based on the old data version**.
-   If AOF is enabled on the replica node, it immediately runs BGREWRITEAOF to rewrite the AOF.

### Incremental replication

-   If the master-slave network connection drops during full replication, incremental replication is triggered when the slave reconnects to the master.
-   The master fetches the partially lost data directly from its own backlog and sends it to the replica node. The default backlog is 1MB.
-   The master fetches data from the backlog according to the offset in the psync sent by the slave.

### heartbeat

The master and replica nodes send heartbeat messages to each other.

By default the master sends a heartbeat every 10 seconds, and a replica node sends one every 1 second.

### Asynchronous replication

Each time the master receives a write command, it first writes the data internally and then sends it to the replica node asynchronously.

## How Redis achieves high availability

If a system can serve requests smoothly 99.99% of the time over 365 days, the system is said to be highly available.

When one slave goes down, availability is not affected, because other slaves still provide the same query service over the same data.

But what happens if the master node goes down? No data can be written, and all cache writes fail. What use are the replica nodes then? There is no master replicating data to them, and the system is effectively unavailable.

The high availability architecture of Redis is called `failover`, **failover** (also known as master/standby switchover).

The process in which a master node is automatically detected as failed and one of its replica nodes is automatically switched to be the master node is called failover. This process achieves high availability under the Redis master/replica architecture.

Redis [high availability based on Sentinel](doc:advanced-java/high-concurrency/redis-sentinel) is described in detail later.
