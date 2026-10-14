---
source:
  locale: zh
  slug: distributed-transaction
  hash: 'sha256:v1:0f0b028fcea1a077bfcf9a5bcf25f80223cf029041d8a512cccbfd7cb048c891'
status: machine
translatedAt: '2026-10-14'
---
# Principles of Distributed Transactions

## Interview question

Do you know distributed transactions? How do you solve the distributed transaction problem?

## Interviewer Psychology

Once you say you have built a distributed system, distributed transactions are a must-ask. If you know nothing about them, that is a real problem. You should at least know which solutions exist, how they are generally done, and the pros and cons of each.

In interviews today, distributed systems have become standard, and so have the **distributed transactions** they bring. You will certainly use transactions when building a system, and in a distributed system you will certainly need distributed transactions. Leaving aside whether you have actually done it, you should at least understand which solutions exist and what pitfalls each may have, for example the network problem of TCC and the consistency problem of XA.

## Answer analysis

There are mainly 6 solutions for implementing distributed transactions:

-   XA
-   TCC
-   SAGA
-   Local message table
-   Reliable message eventual consistency
-   Best-effort notification

### Two-phase commit / XA

The so-called XA solution is two-phase commit. It has the concept of a **transaction manager**, which coordinates the transactions of multiple databases (resource managers). The transaction manager first asks each database whether it is ready. If every database replies ok, the transaction is formally committed and the operations are executed on each database; if any one database answers not ok, the transaction is rolled back.

This distributed transaction solution suits distributed transactions that span multiple databases inside a single monolithic application. Because it relies heavily on the database layer to handle complex transactions, it is very inefficient and definitely not suitable for high concurrency scenarios. If you want to try it, `Spring + JTA` can handle it; search for any demo and you will see.

We rarely use this solution. Generally speaking, **an operation across multiple databases inside one system** is **not compliant** with our rules. Let me explain: in microservices today, a large system is split into dozens or even hundreds of services. Our rules and conventions require that **each service may only operate on its own database**.

If you need to operate on the database of another service, you must not connect directly to it, because that violates the microservices architecture conventions. If hundreds of services access each other's databases at random, everything becomes chaotic. Such a set of services cannot be managed or governed, and data may be modified wrongly by others, or your own database may be brought down by others' writes.

If you need to operate on another service's database, you must do it by **calling the other service's API**. Cross-accessing someone else's database is absolutely not allowed.

![distributed-transacion-XA](asset:distributed-system/distributed-transaction/distributed-transaction-XA.png)

### TCC

TCC stands for `Try`, `Confirm` and `Cancel`.

-   Try phase: check the resources of each service and **lock or reserve** them.
-   Confirm phase: **execute the actual operation** in each service.
-   Cancel phase: if the business method of any service fails, **compensation** is needed here, that is, run the rollback of the business logic that already succeeded (roll back those that executed successfully).

Honestly, almost nobody uses this solution, and we use it rarely, but there are scenarios for it. The **transaction rollback** here **depends heavily on code you write yourself to roll back and compensate**, which leads to a huge amount of compensation code, and that is really unpleasant.

For example, in our case, for scenarios involving **money**, such as **payment** and **trading**, we use TCC to strictly guarantee that a distributed transaction either succeeds entirely or rolls back entirely and automatically, which strictly ensures the correctness of funds and that no problem arises with money.

It is also best if the execution time of each business step is short.

But honestly, try to avoid it. Writing rollback or compensation logic by hand is really unpleasant, and that business code is very hard to maintain.

![distributed-transacion-TCC](asset:distributed-system/distributed-transaction/distributed-transaction-TCC.png)

### Saga

Core financial businesses may choose TCC in pursuit of strong consistency and higher concurrency, while the many business systems above the core financial level often choose compensating transactions. The Saga theory of compensating transactions was proposed more than 30 years ago, and has gradually drawn attention in recent years with the development of microservices. Saga is currently the generally accepted solution for long transactions in the industry.

#### Basic principle

Every participant in the business flow commits a local transaction. If one participant fails, the participants that already succeeded are compensated. In the figure below, the left side is the normal transaction flow. When an error occurs at T3, the compensation flow on the right begins, executing the compensation services C3, C2 and C1 in reverse order, to compensate the data already modified by T3, T2 and T1.

![distributed-transacion-TCC](asset:distributed-system/distributed-transaction/distributed-transaction-saga.png)

#### Use cases

For scenarios that demand high consistency, short flows and high concurrency, such as core financial systems, TCC is the first choice. In other scenarios we do not need such strong consistency and only need to guarantee eventual consistency.

For example, many business systems above the core financial level (channel layer, product layer, system integration layer) have these characteristics: eventual consistency is enough, there are many flows, the flows are long, and they may even call services of other companies. Developing such systems with TCC is, first, costly, and second, there is no way to require other companies' services to follow the TCC pattern. Also, with long flows, the transaction boundary is too long and locks are held for a long time, which hurts concurrency performance.

So the use cases for the Saga pattern are:

-   Long business flows and many business flows;
-   Participants include services of other companies or legacy systems, which cannot provide the three APIs the TCC pattern requires.

#### Advantages

-   The first phase commits the local transaction, with no locks and high performance;
-   Participants can execute asynchronously, giving high throughput;
-   Compensation services are easy to implement, because the reverse of an update operation is easy to understand.

#### Disadvantages

-   Transaction isolation is not guaranteed.

### Local message table

The local message table is an idea that came from eBay abroad.

Roughly, it works like this:

1. System A, in one of its own local transactions, performs its operation and also inserts a row into the message table;
2. System A then sends this message to the MQ;
3. After system B receives the message, in one transaction it inserts a row into its own local message table and executes the other business operations. If the message has already been processed, the transaction rolls back, which **guarantees that a message is not processed twice**;
4. After system B succeeds, it updates the status in its own local message table and in system A's message table;
5. If system B fails, the message table status is not updated, so system A periodically scans its own message table, and any unprocessed message is sent to the MQ again so that B can process it again;
6. This solution guarantees eventual consistency: even if B's transaction fails, A keeps resending the message until B succeeds.

Honestly, the biggest problem of this solution is that it **relies heavily on the message table in the database to manage transactions**. What about high concurrency scenarios? How do you scale it? So it is indeed rarely used.

![distributed-transaction-local-message-table](asset:distributed-system/distributed-transaction/distributed-transaction-local-message-table.png)

### Reliable message eventual consistency

The idea here is to drop the local message table altogether and implement the transaction directly on top of an MQ. For example, Alibaba's RocketMQ supports message transactions.

Roughly:

1. System A first sends a prepared message to the MQ. If sending the prepared message fails, the operation is cancelled and not executed;
2. If the message was sent successfully, system A then executes its local transaction. If that succeeds, it tells the MQ to send a confirm message; if it fails, it tells the MQ to roll back the message;
3. If the confirm message was sent, system B receives it and executes its local transaction;
4. The MQ automatically **polls periodically** all prepared messages and calls back your API to ask: was the local transaction for this message a failure? For all messages that never got a confirmation, should it retry or roll back? Usually here you can check the database to see whether the earlier local transaction was executed, and if it was rolled back, roll back here too. This avoids the case where the local transaction succeeded but the confirm message failed to send;
5. In this solution, what if system B's transaction fails? Retry, of course: keep retrying automatically until it succeeds. If it really does not work, then for important funds-related business you roll back, for example after rolling back locally, system B finds a way to notify system A to roll back too; or it sends an alert and a human rolls back and compensates manually;
6. This is quite suitable, and most Internet companies in China do it this way today. Either use what RocketMQ supports, or build a similar piece of logic yourself on something like ActiveMQ or RabbitMQ. In any case, the idea is the same.

![distributed-transaction-reliable-message](asset:distributed-system/distributed-transaction/distributed-transaction-reliable-message.png)

### Best-effort notification

Roughly, this solution works as follows:

1. After system A finishes its local transaction, it sends a message to the MQ;
2. A dedicated **best-effort notification service** consumes the MQ, records the message in a database (or puts it in an in-memory queue), and then calls system B's API;
3. If system B succeeds, fine. If system B fails, the best-effort notification service periodically retries calling system B, repeating N times, and finally gives up if it still does not work.

### How does your company handle distributed transactions?

If you are really asked, you can say something like this: in our particularly strict scenarios we use TCC to guarantee strong consistency, and in some other scenarios we implement distributed transactions based on Alibaba's RocketMQ.

Pick a scenario with strict funds requirements where nothing may go wrong, and you can say you used TCC. For an ordinary distributed transaction scenario, such as calling the inventory service to update stock after an order is inserted, where inventory data is not as sensitive as funds, you can use the reliable message eventual consistency solution.

A friendly reminder: for RocketMQ versions before 3.2.6, you can follow the approach above, but the APIs changed afterwards, and I will not go into that here.

Of course, if you like, you can refer to the reliable message eventual consistency solution to implement a distributed transaction yourself, for example based on RocketMQ.
