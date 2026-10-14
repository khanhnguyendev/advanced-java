---
source:
  locale: zh
  slug: zookeeper-application-scenarios
  hash: 'sha256:v1:71f50a18244c14678ddeed4c7b4a6d13e8492768db4dd7b0b087dc24165c57d1'
status: machine
translatedAt: '2026-10-14'
---
# Zookeeper Use Cases

## Interview question

What are the use cases of ZooKeeper?

## Interviewer Psychology

The current topic is distributed systems. After talking through some Dubbo questions, the interviewer has confirmed that you have a basic understanding of distributed service frameworks and RPC frameworks. Now they may start asking about other distributed-related questions.

Distributed locks are very commonly used. When you develop Java systems, especially distributed systems, some scenarios will call for them. The most commonly used distributed lock is implemented on top of ZooKeeper.

Honestly, this question is usually just a check on whether you know ZooKeeper, because ZooKeeper is a very common foundation system in distributed systems. The usual question is simply what its use cases are, to see whether you know some basic ones. Of course, if the interviewer digs into ZooKeeper, they can go very, very deep.

## Answer analysis

Roughly speaking, the use cases of ZooKeeper are as follows. I will give a few simple ones; being able to name a few is enough:

-   Distributed coordination
-   Distributed lock
-   Metadata and configuration management
-   High availability (HA)

### Distributed Coordination

This is a classic use of ZooKeeper. Put simply, suppose system A sends a request to a message queue (MQ), and system B consumes the message and processes it. How does system A know the result of system B's processing? ZooKeeper can coordinate work between distributed systems. After sending the request, system A can **register a listener on the value of a node** in ZooKeeper. As soon as system B finishes processing, it modifies the value of that node in ZooKeeper, and system A is notified immediately. Problem solved neatly.

![zookeeper-distributed-coordination](asset:distributed-system/zookeeper-application-scenarios/zookeeper-distributed-coordination.png)

### Distributed lock

Here is an example. Two modification operations are issued in a row against the same piece of data, and two machines receive the requests at the same time, but only one machine may finish first before the other runs. A ZooKeeper distributed lock fits this case. After a machine receives a request, it first acquires a distributed lock on ZooKeeper, which means creating a znode, and then performs the operation. The other machine then **tries to create** the same znode, finds that it cannot because someone else has already created it, and has to wait until the first machine is done before running its own operation.

![zookeeper-distributed-lock-demo](asset:distributed-system/zookeeper-application-scenarios/zookeeper-distributed-lock-demo.png)

### Metadata and configuration management

ZooKeeper can be used to manage configuration for many systems. For example, Kafka, Storm and many other distributed systems use ZooKeeper to manage metadata and configuration. Doesn't the Dubbo service registry support ZooKeeper too?

![zookeeper-meta-data-manage](asset:distributed-system/zookeeper-application-scenarios/zookeeper-meta-data-manage.png)

### High availability

This is very common. Many big data systems such as Hadoop, HDFS and YARN build their HA mechanism on ZooKeeper. An **important process usually runs as an active/standby pair**: when the active process goes down, ZooKeeper detects it immediately and switches over to the standby process.

![zookeeper-active-standby](asset:distributed-system/zookeeper-application-scenarios/zookeeper-active-standby.png)
