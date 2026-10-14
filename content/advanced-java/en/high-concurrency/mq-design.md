---
source:
  locale: zh
  slug: mq-design
  hash: 'sha256:v1:b6add2571423072cb289c986ea4c6900c62c3be6578f990769035c6804297011'
status: machine
translatedAt: '2026-10-14'
---
# How to Design a Message Queue?

## Interview Question

If you were asked to write a message queue, how would you design its architecture? Tell me your thinking.

## Interviewer Psychology

When this question comes up, the interviewer generally wants to examine two things:

-   Whether you have studied the principles of some message queue in reasonable depth, or have at least grasped the architectural principles of a message queue as a whole.
-   Your design ability: given a common system, namely a message queue system, can you grasp the overall architecture from a global view and point out some key points?

Honestly, when asked a question like this, most people basically draw a blank, because they have never thought about such questions before. **Most people just bury themselves in using things day to day and never think about what is behind them.** Similar questions include: how would you design a Spring framework? How would you design a Dubbo framework? How would you design a MyBatis framework?

## Answer Analysis

In fact, to answer questions like this, frankly, you are not expected to have read the source code of that technology. At the very least you should roughly know its basic principles, core components and basic architecture, and then, referring to some open-source technologies, describe your thinking on how to design such a system.

Take this message queue system as an example. Let us consider it from the following angles:

-   First, this mq has to support scalability: when needed, it can be scaled out quickly to increase throughput and capacity. How do you do that? Design a distributed system. Refer to the design philosophy of kafka: broker -> topic -> partition, with each partition placed on one machine and storing a part of the data. If resources are insufficient now, it is simple: add partitions to the topic, migrate the data, and add machines, and then more data can be stored and higher throughput provided.

-   Second, consider whether this mq's data should be persisted to disk. Of course it should; only by writing to disk can you ensure the data is not lost when a process goes down. And how do you write to disk? Write sequentially, so that there is no addressing overhead of random disk reads and writes. The performance of sequential disk reads and writes is very high, and this is kafka's approach.

-   Third, consider the availability of your mq. For this, refer to the high availability guarantee mechanism of kafka explained earlier in the availability section: multiple replicas -> leader & follower -> when a broker goes down, re-elect a leader and it can serve requests again.

-   Can it support zero data loss? Yes, refer to the kafka zero-data-loss scheme we described earlier.

An mq is certainly very complex. When the interviewer asks you this question, it is really an open question: they are looking at whether you have the thinking and ability to conceive and design as a whole from an architectural perspective. This question can indeed weed out a large number of people, because most people do not think about these things in daily work.
