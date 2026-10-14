---
source:
  locale: zh
  slug: how-to-ensure-that-messages-are-not-repeatedly-consumed
  hash: 'sha256:v1:c8f0c7b5c48d8bfc391a63549429a74d07bfbe46b0c8f410f4bc07d416a4ace2'
status: machine
translatedAt: '2026-10-14'
---
# How to Ensure Messages Are Not Consumed Repeatedly?

## Interview Question

How do you ensure messages are not consumed repeatedly? Or, put differently, how do you ensure the idempotency of message consumption?

## Interviewer Psychology

This is actually a very common question, and the two questions can basically be asked together. Since you consume messages, you surely have to consider whether duplicate consumption can happen, whether it can be avoided, and whether it is acceptable that duplicate consumption causes no system anomaly. This is a basic problem in the MQ field. In essence it is asking **how you ensure idempotency when using a message queue**, which is a problem you have to consider in your architecture.

## Answer Analysis

To answer this question, first do not hear about duplicate messages and go completely blank. **First, say roughly what duplicate consumption problems there may be.**

First, RabbitMQ, RocketMQ and Kafka can all have duplicate message consumption, which is normal. The problem is usually not guaranteed by the MQ itself but by us developers. Let us take Kafka as an example to explain how duplicate consumption happens.

Kafka actually has the concept of an offset: every message written in gets an offset, which represents the sequence number of the message. After a consumer consumes data, **every so often** (periodically), it commits the offsets of the messages it has consumed, meaning "I have already consumed these; if I restart or something next time, let me continue consuming from the offset I last reached."

But there are always accidents. A common one we used to hit in production is that you sometimes restart the system, and it depends on how you restart: if someone is in a hurry and directly kills the process and then restarts, this causes some messages to have been processed by the consumer without the offset having been committed in time. Awkward. After the restart, a small number of messages are consumed once more.

Let us give an example.

Consider this scenario. Data 1/2/3 enters Kafka in order, and Kafka assigns each of these three records an offset, representing its sequence number. Suppose the assigned offsets are 152/153/154 respectively. When the consumer consumes from Kafka, it also consumes in this order. Suppose the consumer has consumed the record with `offset=153` and is just about to commit the offset to ZooKeeper, when the consumer process is restarted. Then the offsets of the already-consumed data 1/2 were not committed, and Kafka does not know that you have already consumed the record with `offset=153`. After the restart, the consumer tells Kafka, hey buddy, please continue passing me the data after the place I last consumed up to. Since the earlier offsets were not committed successfully, data 1/2 is passed over again, and if the consumer does not deduplicate at this point, duplicate consumption results.

Note: newer versions of Kafka have moved offset storage from ZooKeeper to the Kafka brokers, and store it in the internal offsets topic `__consumer_offsets`.

![mq-10](asset:high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed/mq-10.png)

If what the consumer does is write one row to the database for each record it takes, you may well insert data 1/2 into the database twice, and then the data is wrong.

Duplicate consumption itself is not scary. What is scary is that you did not consider **how to ensure idempotency** after duplicate consumption.

Let us give an example. Suppose you have a system that inserts one row into the database for each message it consumes. If one message is repeated twice, would you not insert two rows, and would the data not be wrong? But if, when consuming for the second time, you check on your own whether it has already been consumed and, if so, simply discard it, then one row is kept and the correctness of the data is ensured.

A record appearing twice while the database holds only one row ensures the idempotency of the system.

Put simply, idempotency means that if a piece of data or a request arrives repeatedly many times, you must ensure the corresponding data does not change and **nothing goes wrong**.

So the second question comes: how do you ensure the idempotency of message queue consumption?

You still have to think in combination with the business. Here are a few ideas:

-   For example, if you want to write a record to the database, first query by primary key. If the record already exists, do not insert it; do an update instead.
-   For example, if you are writing to Redis, there is no problem, since every operation is a set anyway, which is naturally idempotent.
-   For example, if you are not in either of the two scenarios above, do something slightly more complex. You need the producer to add a globally unique id to each record it sends, something like an order id. When you consume it, first check, for example in Redis by this id, whether it has been consumed before. If not, process it and write this id to Redis. If it has been consumed, do not process it, so that the same message is not processed repeatedly.
-   For example, rely on the unique key of the database to ensure that duplicate data is not inserted as multiple rows. Because of the unique key constraint, inserting duplicate data only raises an error and does not cause dirty data in the database.

![mq-11](asset:high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed/mq-11.png)

Of course, how to ensure that MQ consumption is idempotent has to be considered together with the specific business in actual applications.
