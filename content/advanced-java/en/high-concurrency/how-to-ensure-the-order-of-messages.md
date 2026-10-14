---
source:
  locale: zh
  slug: how-to-ensure-the-order-of-messages
  hash: 'sha256:v1:80e6b3081b7319a5aec6126ded2195ebf05ae5e00764d2035d2dcf2de3f442f7'
status: machine
translatedAt: '2026-10-14'
---
# How to Ensure Message Ordering?

## Interview question

How do you ensure the ordering of messages?

## Interviewer Psychology

This is also a topic that is certain to come up when MQ is used. First, they want to see whether you understand the issue of ordering. Second, they want to see whether you have a way to ensure messages are in order. This is a common problem in production systems.

## Answer analysis

Let me give an example. We once built a system that synchronized MySQL `binlog`, and the pressure was very high: the daily synchronized data had to reach over 100 million records, meaning data was synchronized unchanged from one MySQL database into another (mysql -> mysql). A common case is, for example, a big data team that needs a MySQL database synchronized over so that it can perform all kinds of complex operations on the data of the company's business systems.

When you insert, update and delete one record in MySQL, 3 corresponding `binlog` entries are produced. These three `binlog` entries are then sent into MQ, consumed, and executed one by one, and at the very least they must be executed in order, right? Otherwise, what should have been insert, update, delete would be executed as delete, update, insert, and wouldn't everything be wrong?

Originally, after this data was synchronized over, the record should end up deleted. But you got the order wrong, and the record ends up retained, so the data synchronization is wrong.

First, look at two scenarios where the order gets scrambled:

-   **RabbitMQ**: one queue, multiple consumers. For example, the producer sends three records into RabbitMQ in the order data1/data2/data3, pushed into an in-memory queue of RabbitMQ. Three consumers each consume one of these three records from MQ, and consumer 2 finishes its operation first and stores data2 into the database, then data1/data3. Isn't that clearly out of order?

![rabbitmq-order-01](diagram:high-concurrency/how-to-ensure-the-order-of-messages/rabbitmq-order-01)

-   **Kafka**: for example, we create a topic with three partitions. When writing, the producer can actually specify a key, for example we specify an order id as the key. Then the data related to this order is certain to be dispatched to the same partition, and the data in this partition is certain to be in order.<br>When a consumer takes data out of the partition, it is also certain to be in order. So far, the order is fine and not scrambled. Next, in the consumer we may use **multiple threads to process messages concurrently**. If the consumer consumes and processes in a single thread and the processing is time-consuming, for example tens of ms per message, then only a few dozen messages can be processed per second, which is far too low a throughput. But if multiple threads run concurrently, the order may get scrambled.

![kafka-order-01](diagram:high-concurrency/how-to-ensure-the-order-of-messages/kafka-order-01)

### Solutions

#### RabbitMQ

Split into multiple queues with one consumer per queue, which simply means more queues. It is indeed a bit troublesome, and it also lowers throughput; you can use multiple threads inside the consumer to consume.

![rabbitmq-order-02](diagram:high-concurrency/how-to-ensure-the-order-of-messages/rabbitmq-order-02)

Or use just one queue with one corresponding consumer, and have this consumer queue messages in in-memory queues internally and then dispatch them to different underlying workers for processing.

Note that here the consumer does not consume messages directly. Instead, it hashes each message by a key value (for example, the order id), and messages with the same hash value are saved into the same in-memory queue. In other words, messages that need to keep their order are stored into the same in-memory queue, and then a single worker processes them.

#### Kafka

-   One topic, one partition, one consumer, consuming in a single thread internally. The throughput of a single thread is too low, so this is generally not used.
-   Write N in-memory queues, and data with the same key goes to the same in-memory queue; then, with N threads, each thread consumes one in-memory queue. This ensures ordering.

![kafka-order-02](diagram:high-concurrency/how-to-ensure-the-order-of-messages/kafka-order-02)
