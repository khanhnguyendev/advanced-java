---
source:
  locale: zh
  slug: redis-sentinel
  hash: 'sha256:v1:c9a7e6e2f653765f345b4f6fcdbbc76277a7fea000331c8202a7064eb29f6085'
status: machine
translatedAt: '2026-10-14'
---
# Achieving High Availability with a Redis Sentinel Cluster

## Introduction to Sentinel

Sentinel is a very important component in the Redis cluster architecture, and it has the following main functions:

-   Cluster monitoring: monitors whether the Redis master and slave processes are working normally.
-   Message notification: if a Redis instance fails, Sentinel sends a message to the administrator as an alert.
-   Failover: if the master node goes down, it automatically fails over to a replica node.
-   Configuration center: if a failover occurs, it notifies clients of the address of the new master.

Sentinel is used to achieve high availability of a Redis cluster. It is itself distributed, running as a Sentinel cluster whose members work together.

-   During failover, determining whether a master node has crashed requires agreement from most of the Sentinels, which involves the problem of distributed election.
-   Even if some Sentinel nodes go down, the Sentinel cluster can still work normally, because it would be a disaster if the failover system, an important part of the high availability mechanism, were itself a single point.

## Core knowledge of Sentinel

-   Sentinel needs at least 3 instances to ensure its own robustness.
-   A deployment architecture of Sentinel + Redis master/replica **does not guarantee zero data loss**; it can only guarantee high availability of the Redis cluster.
-   For a complex deployment architecture like Sentinel + Redis master/replica, test and rehearse thoroughly in both the test environment and the production environment as far as possible.

A Sentinel cluster must be deployed with more than 2 nodes. If the Sentinel cluster is deployed with only 2 Sentinel instances, quorum = 1.

```
+----+         +----+
| M1 |---------| R1 |
| S1 |         | S2 |
+----+         +----+
```

With `quorum=1` configured, if the master crashes, as long as 1 of s1 and s2 considers the master crashed, a switchover can proceed, and s1 and s2 elect one Sentinel to perform the failover. But at the same time, this requires a majority, that is, most of the Sentinels must be running.

```
2 Sentinels, majority=2
3 Sentinels, majority=2
4 Sentinels, majority=2
5 Sentinels, majority=3
...
```

If only the M1 process crashes and Sentinel s1 runs normally, the failover is fine. But if the whole machine running M1 and S1 crashes, then only 1 Sentinel is left, so there is no majority to allow the failover to be performed. Although there is still an R1 on the other machine, the failover will not be performed.

The classic 3-node Sentinel cluster looks like this:

```
       +----+
       | M1 |
       | S1 |
       +----+
          |
+----+    |    +----+
| R2 |----+----| R3 |
| S2 |         | S3 |
+----+         +----+
```

With `quorum=2` configured, if the machine hosting M1 crashes, 2 of the three Sentinels remain, and S2 and S3 can agree that the master has crashed and then elect one of them to perform the failover. Meanwhile, the majority of 3 Sentinels is 2, so the 2 remaining running Sentinels are enough to allow the failover to be performed.

## The data loss problem of Redis Sentinel failover

### Two cases that cause data loss

The failover process may cause data loss:

-   Data loss caused by asynchronous replication

Because master->slave replication is asynchronous, the master may crash before some data has been replicated to the slave, and that data is then lost.

![async-replication-data-lose-case](asset:high-concurrency/redis-sentinel/async-replication-data-lose-case.png)

-   Data loss caused by split brain

Split brain means that the machine hosting a master suddenly **drops off the normal network** and cannot connect to the other slave machines, although the master is actually still running. Sentinel may then **conclude** that the master has crashed, start an election, and switch another slave to master. At this point there are two masters in the cluster, which is the so-called **split brain**.

Although a slave has been switched to master, clients may not have had time to switch to the new master and keep writing data to the old master. So when the old master recovers, it is attached to the new master as a slave, its own data is cleared, and it replicates data from the new master again. The new master does not have the data that clients wrote afterwards, so that data is lost.

![Redis-cluster-split-brain](asset:high-concurrency/redis-sentinel/redis-cluster-split-brain.png)

### Solution to the data loss problem

Configure the following:

```bash
min-slaves-to-write 1
min-slaves-max-lag 10
```

This means that at least 1 slave is required, and its data replication and synchronization lag cannot exceed 10 seconds.

If the data replication and synchronization lag of all slaves exceeds 10 seconds, then the master will stop accepting any requests.

-   Reducing data loss from asynchronous replication

With the `min-slaves-max-lag` configuration, you can ensure that once a slave's data replication and ack delay is too long, too much data may be lost if the master crashes, so write requests are rejected. This keeps the data loss caused by data not yet synchronized to the slaves when the master crashes within a controllable range.

-   Reducing data loss from split brain

If a master suffers split brain and loses its connection to the other slaves, the two configurations above ensure that if it cannot keep sending data to the specified number of slaves, and no slave has sent it an ack message for more than 10 seconds, it directly rejects client write requests. So in a split brain scenario, at most 10 seconds of data is lost.

## The sdown and odown transition mechanism

-   sdown is subjectively down: if a single Sentinel itself thinks a master has crashed, that is subjectively down
-   odown is objectively down: if a quorum number of Sentinels all think a master has crashed, that is objectively down

The condition for sdown is simple: if a Sentinel pings a master and gets no reply for more than the number of milliseconds specified by `is-master-down-after-milliseconds`, it subjectively considers the master crashed. If a Sentinel receives, within the specified time, notices from a quorum number of other Sentinels that they also consider that master sdown, it considers it odown.

## Automatic discovery mechanism of the Sentinel cluster

Sentinels discover each other through the Redis `pub/sub` system. Each Sentinel sends a message to the `__sentinel__:hello` channel, and all the other Sentinels can consume this message and become aware of the existence of the other Sentinels.

Every two seconds, each Sentinel **sends a message** to the `__sentinel__:hello` channel corresponding to a master+slaves it monitors, containing its own host, ip and runid and its monitoring configuration for that master.

Each Sentinel also **listens** on the `__sentinel__:hello` channel of each master+slaves it monitors, and thereby becomes aware of the other Sentinels that are also listening to that master+slaves.

Each Sentinel also exchanges its monitoring configuration for the `master` with the other Sentinels, synchronizing monitoring configuration with each other.

## Automatic correction of slave configuration

Sentinel is responsible for automatically correcting some slave configuration. For example, if a slave is to become a potential master candidate, Sentinel ensures the slave replicates the data of the current master; if a slave is connected to the wrong master, for example after a failover, Sentinel ensures they connect to the correct master.

## The slave->master election algorithm

If a master is considered odown and a majority number of Sentinels allow a failover, one Sentinel performs the switchover. It first has to elect a slave, and it considers some information about the slaves:

-   how long the slave has been disconnected from the master
-   slave priority
-   replication offset
-   run id

If a slave has been disconnected from the master for more than 10 times `down-after-milliseconds`, plus the duration of the master's outage, the slave is considered unsuitable to be elected master.

```
(down-after-milliseconds * 10) + milliseconds_since_master_is_in_SDOWN_state
```

Next, the slaves are sorted:

-   Sort by slave priority: the lower the slave priority value, the higher the priority.
-   If the slave priority is the same, look at the replica offset: the more data a slave has replicated, the further back its offset and the higher its priority.
-   If both conditions above are the same, choose the slave with the smaller run id.

## quorum and majority

Each time a Sentinel wants to perform a failover, a quorum number of Sentinels must first consider the master odown, then one Sentinel is elected to perform the switchover, and this Sentinel must also obtain authorization from a majority of Sentinels before it can formally perform the switchover.

If quorum < majority, for example with 5 Sentinels the majority is 3 and the quorum is set to 2, then authorization from 3 Sentinels allows the switchover to be performed.

But if quorum >= majority, then a quorum number of Sentinels must all authorize it. For example, with 5 Sentinels and a quorum of 5, all 5 Sentinels must agree to authorize before the switchover can be performed.

## configuration epoch

Sentinel monitors a set of Redis master+slaves and holds the corresponding monitoring configuration.

The Sentinel that performs the switchover obtains a configuration epoch from the new master (slave->master) being switched to. This is a version number, and the version number of each switchover must be unique.

If the first elected Sentinel fails to switch, the other Sentinels wait for the failover-timeout period and then take over to continue the switchover. At this point, they obtain a new configuration epoch again to serve as the new version number.

## Configuration propagation

After a Sentinel completes a switchover, it updates and generates the latest master configuration locally, and then synchronizes it to the other Sentinels, through the `pub/sub` message mechanism described earlier.

The version number mentioned earlier is important here, because all kinds of messages are published and listened to through one channel, so after a Sentinel completes a new switchover, the new master configuration carries the new version number. The other Sentinels update their own master configuration according to the size of the version number.
