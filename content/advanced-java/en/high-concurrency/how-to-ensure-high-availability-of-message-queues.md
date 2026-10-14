---
source:
  locale: zh
  slug: how-to-ensure-high-availability-of-message-queues
  hash: 'sha256:v1:a4a5aad82e18cc743dd6510d7fcf7a04b735afe44ea552907ca5bbb46541b231'
status: machine
translatedAt: '2026-10-14'
---
# How to Ensure High Availability of a Message Queue?

## Interview question

How do you ensure the high availability of a message queue?

## Interviewer Psychology

If someone asks you about MQ, **high availability is a must-ask**. The [previous lecture](doc:advanced-java/high-concurrency/why-mq) mentioned that MQ **reduces system availability**. So once you use MQ, the points asked next will certainly revolve around how to solve those drawbacks of MQ.

If you blindly use an MQ and never consider the various problems, you are in trouble. The interviewer will feel that you only know how to use some technology in a simple way and do no thinking, and their impression of you immediately turns bad. Hiring such a person as an ordinary junior developer earning under 20k is tolerable, but as a senior engineer earning 20k+ it would be a disaster: asked to design a system, you would surely leave a pile of pitfalls in it, and when an incident happens the company suffers losses and the whole team takes the blame.

## Answer analysis

This is a good way to ask the question, because the interviewer cannot ask you how to ensure the high availability of Kafka, or how to ensure the high availability of ActiveMQ. An interviewer who asks that way looks unskilled: the candidate may use RabbitMQ and never have used Kafka, so why ask about Kafka right away? That is plainly making things difficult for people.

So a skilled interviewer asks how to ensure the high availability of MQ. Then whichever MQ you have used, you describe your understanding of that MQ's high availability.

### High availability of RabbitMQ

RabbitMQ is fairly representative, because it achieves high availability **based on master/replica** (not distributed). We use RabbitMQ as the example to explain the first way an MQ can implement high availability.

RabbitMQ has three modes: single-node mode, normal cluster mode, and mirrored cluster mode.

#### Single-Node mode

Single-node mode is demo-grade. It is generally something you start locally to play around with, and nobody uses single-node mode in production.

#### Normal Cluster mode (No high Availability)

Normal cluster mode means starting multiple RabbitMQ instances on multiple machines, one per machine. The **queue you create is placed on only one RabbitMQ instance**, but every instance synchronizes the queue's metadata (metadata can be seen as some configuration information of the queue, through which the instance holding the queue can be found). When you consume, if you actually connect to another instance, that instance pulls the data over from the instance where the queue lives.

![mq-7](asset:high-concurrency/how-to-ensure-high-availability-of-message-queues/mq-7.png)

This approach is indeed troublesome and not very good: it **does not achieve what is called distributed**, it is just an ordinary cluster. As a result, either consumers connect to a random instance each time and pull data, or they always connect to the instance where the queue lives to consume data. The former has the **overhead of pulling data**, and the latter causes a **performance bottleneck on a single instance**.

Moreover, if the instance holding the queue crashes, the other instances can no longer pull from it. If you **enabled message persistence**, so that RabbitMQ stores messages on disk, **messages are not necessarily lost**, but you have to wait for this instance to recover before you can continue pulling data from this queue.

So this is rather awkward: there is **no so-called high availability**, and **this scheme mainly improves throughput**, that is, it lets multiple nodes in the cluster serve the read and write operations of a queue.

#### Mirrored Cluster mode (⚠️ Deprecated, not Recommended)

> **⚠️ Important update**: Since RabbitMQ 4.0, mirrored cluster mode has been officially deprecated, and adding new mirroring policies is no longer supported. Existing users are advised to migrate to Quorum Queues as soon as possible.

This mode used to be the so-called high availability mode of RabbitMQ. Unlike normal cluster mode, in mirrored cluster mode, both the metadata and the messages of the queue you create **exist on multiple instances**. That is, every RabbitMQ node has a **complete mirror** of this queue, meaning all of the queue's data. Then every time you write a message to the queue, the **message is automatically synchronized** to the queue on multiple instances.

![mq-8](asset:high-concurrency/how-to-ensure-high-availability-of-message-queues/mq-8.png)

So **how do you enable this mirrored cluster mode**? It is actually very simple. RabbitMQ has a good management console: you add a policy in the console, and this policy is the **mirrored cluster mode policy**. When specifying it, you can require data to be synchronized to all nodes, or to a specified number of nodes. When you create a queue again and apply this policy, the data is automatically synchronized to the other nodes.

The advantage is that if any one machine crashes, no problem: other machines (nodes) still contain the complete data of this queue, and other consumers can go to other nodes to consume data. The disadvantages are, first, that the performance overhead is far too large: messages must be synchronized to all machines, which puts heavy pressure on network bandwidth and consumes a lot of it! Second, playing it this way is not distributed, so there is **no scalability to speak of**. If a queue has a heavy load and you add machines, the new machines also contain all the data of this queue, and there is **no way to scale** your queue **linearly**. Think about it: if this queue holds so much data that a single machine's capacity cannot hold it, what do you do then?


#### Quorum Queues (Recommended)

Starting with RabbitMQ 3.8, Quorum Queues were introduced as the new high availability solution, intended to replace the traditional mirrored cluster mode.

**Core principle**: Based on the Raft consensus algorithm, Quorum Queues achieve data consistency across multiple nodes through quorum replication.

**Main advantages**:
- **Data consistency**: Based on the Raft algorithm, a message counts as written only after a majority of quorum nodes confirm it
- **Automatic failover**: After the leader node crashes, a new leader is elected automatically, with no manual intervention
- **Linear scaling**: The number of replicas can be scaled independently, without being limited by single-node capacity
- **Persistence optimization**: Supports segmented storage, with better performance during rolling flushes

**Configuration example**:
```bash
rabbitmqctl set_policy ha-quorum "^quorum\." '{"ha-mode":" quorum"}'
```

**Applicable scenarios**:
- Production environments with high requirements for data reliability
- Distributed deployments that need better scalability
- An upgrade path to replace the traditional mirrored cluster mode

**Notes**:
- Quorum Queues only support persistent messages and are not suitable for temporary queues
- Resource consumption is higher than for normal queues, so the number of nodes must be planned reasonably
- At least 3 nodes are required to form an effective quorum

**Migration advice**: For queues that currently use mirrored clusters, it is recommended to migrate to Quorum Queues gradually. During migration, pay attention to the message persistence configuration and consumer compatibility.

### High availability of Kafka

The most basic architectural picture of Kafka: it consists of multiple brokers, and each broker is a node. When you create a topic, this topic can be divided into multiple partitions, each partition can live on a different broker, and each partition holds a part of the data.

This is a **naturally distributed message queue**, meaning the data of one topic is **spread across multiple machines, with each machine holding a part of the data**.

In fact, RabbitMQ and the like are not distributed message queues. They are traditional message queues that merely provide some cluster and HA (High Availability) mechanisms, because no matter how you play it, the data of one RabbitMQ queue is placed on one node, and even in mirrored cluster mode every node holds the complete data of that queue.

Before Kafka 0.8 there was no HA mechanism: if any broker crashed, the partitions on that broker were useless, could be neither written nor read, and there was no high availability to speak of.

For example, suppose we create a topic with 3 partitions, on three machines respectively. But if the second machine crashes, 1/3 of this topic's data is lost, so high availability cannot be achieved.

![kafka-before](asset:high-concurrency/how-to-ensure-high-availability-of-message-queues/kafka-before.png)

After Kafka 0.8, an HA mechanism was provided, which is the replica mechanism. The data of every partition is synchronized to other machines, forming its own multiple replicas. All replicas elect a leader, so producing and consuming both deal with this leader, and the other replicas are followers. When writing, the leader is responsible for synchronizing the data to all followers; when reading, you simply read the data on the leader. Only the leader can be read and written? It is simple: **if you could read and write every follower freely, you would have to care about data consistency**, which makes the system far too complex and prone to problems. Kafka distributes all replicas of a partition evenly across different machines, which is what improves fault tolerance.

![kafka-after](asset:high-concurrency/how-to-ensure-high-availability-of-message-queues/kafka-after.png)

Doing it this way gives the so-called **high availability**: if some broker crashes, no problem, because the partitions on that broker have replicas on other machines. If the crashed broker holds the leader of some partition, a new leader is **re-elected** from the followers, and everyone keeps reading and writing the new leader. That is the so-called high availability.

When **writing data**, the producer writes to the leader, the leader writes the data to its local disk, and then the other followers actively pull the data from the leader. Once all followers have synchronized the data, they send an ack to the leader, and after the leader receives the acks from all followers, it returns a write-success message to the producer. (Of course, this is only one of the modes, and the behavior can be adjusted as appropriate.)

When **consuming**, data is read only from the leader, but a message can be read by consumers only after it has been successfully synchronized by all followers, which have returned an ack.

Having read this far, I believe you roughly understand how Kafka ensures high availability, right? You will not be completely in the dark, and you can even draw a diagram for the interviewer on the spot. If you meet an interviewer who is truly a Kafka expert and digs deep, you can only say sorry, you have not studied anything that deep.
