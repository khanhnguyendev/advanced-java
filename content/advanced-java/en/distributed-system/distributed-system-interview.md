---
source:
  locale: zh
  slug: distributed-system-interview
  hash: 'sha256:v1:d110025897cb5d231e4695514fd603a7ede09035bfed2f964eb962215e8e6e17'
status: machine
translatedAt: '2026-10-14'
---
# Distributed System Interview Chain Questions

Some of you have worked mainly in traditional industries or on outsourced projects, always at small companies where the technology stayed fairly simple. You share one problem: you have hardly ever built a distributed system. Internet companies today generally build distributed systems, though most people are not building low-level distributed systems such as distributed storage (Hadoop HDFS), distributed computing (Hadoop MapReduce / Spark), or distributed stream computing (Storm).

A distributed business system takes a large system originally developed in Java and splits it into **multiple subsystems** that call each other and together form one large system. Suppose you originally built an OA system containing a permission module, an employee module, a leave module, and a finance module: one project holding a pile of modules that call each other, deployed on 1 machine. Now split that system into 4 systems (permission, employee, leave, and finance), as 4 projects deployed on 4 machines. When a request comes in, the employee system calls the permission system, the leave system, and the finance system; each of the 4 systems does part of the work, and only when all 4 have finished is the request considered complete.

![simple-distributed-system-oa](diagram:distributed-system/distributed-system-interview/simple-distributed-system-oa)

> Spring Cloud has begun to rise and gain popularity in recent years, but it was only just becoming popular and had not yet been widely adopted. Dubbo is what is widely used today, so this section focuses on Dubbo.

The interviewer may ask you the following questions.

## Why split a system?

-   Why split a system? How do you split it? Can you do without Dubbo after the split? What is the difference between Dubbo and thrift?

## Distributed service framework

-   Explain how Dubbo works. Can communication continue if the service registry goes down?
-   Which serialization protocols does Dubbo support? Explain the data structure of Hessian. Do you know PB? Why is PB the most efficient?
-   What are Dubbo's load balancing strategies and high availability strategies? What about the dynamic proxy strategy?
-   What is the idea behind Dubbo's SPI?
-   How do you do service governance, degradation (fallback), failure retry, and timeout retry based on Dubbo?
-   How do you design idempotency for a distributed service API (for example, so that a payment is never deducted twice)?
-   How do you guarantee the ordering of requests to a distributed service API?
-   How would you design an RPC framework similar to Dubbo yourself?

## Distributed lock

-   How do you design a distributed lock with Redis? Can you design one with zk? Which of the two implementations is more efficient?

## Distributed transaction

-   Do you know distributed transactions? How did you solve distributed transaction problems? What if the network is unreachable in TCC? How is XA's consistency guaranteed?

## Distributed session

-   How is distributed Session implemented in a cluster deployment?
