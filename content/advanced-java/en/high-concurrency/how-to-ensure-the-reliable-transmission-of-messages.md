---
source:
  locale: zh
  slug: how-to-ensure-the-reliable-transmission-of-messages
  hash: 'sha256:v1:5e2b989adad2c98bc3867b227834ac0baf518cb82e299bfae083cbb87a858767'
status: machine
translatedAt: '2026-10-14'
---
# How to Ensure Reliable Message Transmission?

## Interview question

How do you ensure the reliable transmission of messages? Or, put differently, how do you deal with message loss?

## Interviewer Psychology

This one is certain to come up. A basic principle of using MQ is that **there must be neither one record more nor one record fewer**. Not one more is the [duplicate consumption and idempotency problem](doc:advanced-java/high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed) discussed earlier. Not one fewer means the data must not get lost. You have to think about this problem.

If you use MQ to deliver very core messages, such as some billing and charging messages, you must ensure that **the billing message is absolutely never lost** during MQ delivery.

## Answer analysis

Data loss may occur in the producer, in the MQ, or in the consumer. Let us analyze RabbitMQ and Kafka separately.

### RabbitMQ

![rabbitmq-message-lose](asset:high-concurrency/how-to-ensure-the-reliable-transmission-of-messages/rabbitmq-message-lose.png)

#### The producer loses data

When the producer sends data to RabbitMQ, the data may get lost halfway, because of network problems or anything else.

You can choose to use the transaction feature provided by RabbitMQ: the producer opens a RabbitMQ transaction with `channel.txSelect()` **before sending data**, and then sends the message. If the message is not successfully received by RabbitMQ, the producer receives an exception, and then you can roll back the transaction with `channel.txRollback()` and retry sending the message. If the message was received, you can commit the transaction with `channel.txCommit()`.

```java
try {
    // Create a connection through the factory
    connection = factory.newConnection();
    // Get a channel
    channel = connection.createChannel();
    // Open the transaction
    channel.txSelect();

    // Send the message here
    channel.basicPublish(exchange, routingKey, MessageProperties.PERSISTENT_TEXT_PLAIN, msg.getBytes());

    // Simulate an exception
    int result = 1 / 0;

    // Commit the transaction
    channel.txCommit();
} catch (IOException | TimeoutException e) {
    // Catch the exception and roll back the transaction
    channel.txRollback();
}
```

But the problem is that once the RabbitMQ transaction mechanism (synchronous) is used, **throughput basically drops, because it is far too expensive in performance**.

So in general, if you want to make sure that messages written to RabbitMQ are not lost, you can enable `confirm` mode. After you enable `confirm` mode on the producer, every message you write is assigned a unique id. If it is written into RabbitMQ, RabbitMQ sends you back an `ack` message telling you the message is ok. If RabbitMQ fails to handle the message, it calls back one of your `nack` interfaces to tell you the message was not received, and you can retry. You can also combine this mechanism with maintaining the status of each message id in memory yourself: if the callback for a message is not received within a certain time, you can resend it.

The biggest difference between the transaction mechanism and the `confirm` mechanism is that **the transaction mechanism is synchronous**: after you commit a transaction you are **blocked** there. The `confirm` mechanism is **asynchronous**: after sending one message you can send the next one, and once RabbitMQ has received that message, it asynchronously calls back one of your interfaces to tell you the message was received.

So in general, the `confirm` mechanism is used on the producer side to **avoid data loss**.

> A channel that is already in transaction mode cannot be set to confirm mode; that is, the two modes cannot coexist.

There are 3 ways for the client to implement producer `confirm`:

1.**Normal confirm mode**: after each message is sent, call the `waitForConfirms()` method and wait for the server to confirm. If the server returns false or returns nothing within a period of time, the client can resend the message.

```java
channel.basicPublish(ConfirmConfig.exchangeName, ConfirmConfig.routingKey, MessageProperties.PERSISTENT_TEXT_PLAIN, ConfirmConfig.msg_10B.getBytes());
if (!channel.waitForConfirms()) {
    // Message sending failed
    // ...
}
```

2.**Batch confirm mode**: after each batch of messages is sent, call the `waitForConfirms()` method and wait for the server to confirm.

```java
channel.confirmSelect();
for (int i = 0; i < batchCount; ++i) {
    channel.basicPublish(ConfirmConfig.exchangeName, ConfirmConfig.routingKey, MessageProperties.PERSISTENT_TEXT_PLAIN, ConfirmConfig.msg_10B.getBytes());
}
if (!channel.waitForConfirms()) {
    // Message sending failed
    // ...
}
```

3.**Asynchronous confirm mode**: provide a callback method, and after the server confirms one or more messages, the client calls back this method.

```java
SortedSet<Long> confirmSet = Collections.synchronizedSortedSet(new TreeSet<Long>());
channel.confirmSelect();
channel.addConfirmListener(new ConfirmListener() {
    public void handleAck(long deliveryTag, boolean multiple) throws IOException {
        if (multiple) {
            confirmSet.headSet(deliveryTag + 1).clear();
        } else {
            confirmSet.remove(deliveryTag);
        }
    }

    public void handleNack(long deliveryTag, boolean multiple) throws IOException {
        System.out.println("Nack, SeqNo: " + deliveryTag + ", multiple: " + multiple);
        if (multiple) {
            confirmSet.headSet(deliveryTag + 1).clear();
        } else {
            confirmSet.remove(deliveryTag);
        }
    }
});

while (true) {
    long nextSeqNo = channel.getNextPublishSeqNo();
    channel.basicPublish(ConfirmConfig.exchangeName, ConfirmConfig.routingKey, MessageProperties.PERSISTENT_TEXT_PLAIN, ConfirmConfig.msg_10B.getBytes());
    confirmSet.add(nextSeqNo);
}
```

#### RabbitMQ loses data

If RabbitMQ itself loses data, you must **enable RabbitMQ persistence**: after a message is written, it is persisted to disk, so even if RabbitMQ itself goes down, **it automatically reads the previously stored data after recovery**, and generally no data is lost. The one extremely rare exception is that RabbitMQ goes down before it has persisted the message, which **may cause a small amount of data loss**, but this probability is low.

Setting up persistence takes **two steps**:

-   When creating the queue, set it to be persistent. This ensures that RabbitMQ persists the queue's metadata, but it does not persist the data inside the queue.

-   The second is to set the message's `deliveryMode` to 2 when sending it. This marks the message as persistent, and RabbitMQ then persists the message to disk.

Both persistence settings must be applied together. Even if RabbitMQ goes down and restarts, it will recover the queue from disk, and recover the data in that queue.

Note that even if you enable the persistence mechanism for RabbitMQ, there is still a possibility: the message has been written into RabbitMQ but has not yet been persisted to disk when, unluckily, RabbitMQ goes down, and the little data in memory is lost.

So persistence can be combined with the `confirm` mechanism on the producer side: the producer is notified with an `ack` only after the message has been persisted to disk. Therefore, even if RabbitMQ goes down before persisting to disk and the data is lost, the producer will not receive an `ack`, and you can resend by yourself.

#### The Consumer loses data

RabbitMQ loses data mainly because, when you consume, **the message has just been received but not yet processed, and the process goes down**, for example by being restarted. That is awkward: RabbitMQ thinks you have consumed it, and the data is lost.

This is where you need the `ack` mechanism provided by RabbitMQ. Simply put, you must turn off RabbitMQ's automatic `ack`, which can be done by calling an API, and then `ack` in your own code only once you have made sure processing is complete. That way, if processing is not finished, there is no `ack`, and RabbitMQ considers that you have not finished. RabbitMQ then assigns this message to another consumer to process, and the message is not lost.

> To ensure that messages reach consumers reliably from the queue, RabbitMQ provides a message acknowledgment mechanism. When declaring a queue, a consumer can specify the noAck parameter. When noAck=false, RabbitMQ waits for the consumer to explicitly send back an ack signal before removing the message from memory (and from disk, if it is a persistent message). Otherwise, once a message is consumed by the consumer, RabbitMQ deletes it from the queue immediately.

![rabbitmq-message-lose-solution](asset:high-concurrency/how-to-ensure-the-reliable-transmission-of-messages/rabbitmq-message-lose-solution.png)

### Kafka

#### The Consumer loses data

The only way a consumer can lose data is this: you consume the message, and the consumer **automatically commits the offset**, making Kafka think you have finished consuming the message, but you had only just been about to process it, and before you processed it you went down yourself. Then this message is lost.

Isn't this much the same as RabbitMQ? As everyone knows, Kafka commits offsets automatically, so as long as you **turn off automatic commit** of the offset and commit the offset manually after processing, you can ensure data is not lost. But **duplicate consumption may still happen**: for example, you have just finished processing but have not committed the offset, and you go down; the message is then certain to be consumed once more, and you just need to ensure idempotency yourself.

One problem we hit in production: after our Kafka consumer consumed data, it first wrote it into an in-memory queue as a buffer. Sometimes, right after you wrote the message into the in-memory queue, the consumer automatically committed the offset. Then we restarted the system, and the data in the in-memory queue that had not yet been processed was lost.

#### Kafka loses data

A fairly common scenario here is that some Kafka broker crashes and the partition leader is re-elected. Think about it: if some followers happen not to have synchronized some data yet, and the leader goes down at this moment, then after a follower is elected as the new leader, wouldn't some data be missing? That is how some data gets lost.

We hit this in production too: the machine of a Kafka leader crashed, and after a follower was switched to leader, we found that this data was lost.

So generally you are required to set at least the following 4 parameters:

-   Set the `replication.factor` parameter on the topic: this value must be greater than 1, requiring every partition to have at least 2 replicas.
-   Set the `min.insync.replicas` parameter on the Kafka server: this value must be greater than 1. It requires a leader to be aware of at least one follower that is still in contact with it and has not fallen behind, so that there is still a follower when the leader goes down.
-   Set `acks=all` on the producer side: this requires that each record **be considered successfully written only after it has been written to all replicas**.
-   Set `retries=MAX` on the producer side (a very, very, very large value, meaning retry without limit): this **requires unlimited retries once a write fails**, getting stuck right there.

Our production environment is configured exactly according to the requirements above. With this configuration, at least on the Kafka broker side, data is not lost when the broker holding the leader fails and a leader switch happens.

#### Can the producer lose Data?

If you set `acks=all` following the thinking above, it definitely will not be lost. The requirement is that a write is considered successful only after your leader has received the message and all followers have synchronized it. If this condition is not met, the producer automatically retries over and over, without limit.

### RocketMQ

#### Scenarios of message loss

1. The producer may lose the message when sending it to MQ
2. The MQ may lose the message when writing it to disk after receiving it
3. After the message is written to disk, the disk breaks and the message is lost
4. The consumer may also lose the message when consuming from MQ
5. The whole MQ node goes down and messages are lost

#### How to ensure messages are not lost when the producer sends them

The problem of message loss during sending can be solved with RocketMQ's built-in **transactional message** mechanism.

How transactional messages work: first, the producer sends a **half message** (a wrapper around the original message), which is invisible to consumers, and MQ returns the message receipt status through the ACK mechanism. The producer executes the local transaction and returns a status to MQ (Commit, RollBack and so on). If it is Commit, MQ delivers the message downstream; if it is RollBack, the message is discarded. If the status is UnKnow, after some time MQ checks back the local transaction status, 15 times by default, and if the status stays UnKnow, the message is discarded.

Why send a half message first? Its purpose is to first determine whether the MQ has problems and whether the service is normal.

#### How to ensure messages are not lost when the MQ writes them to disk after receiving them

Bypass the cache when storing data and switch to synchronous disk flushing. This step requires modifying the Broker's configuration file and changing flushDiskType to the SYNC_FLUSH synchronous flush policy. The default is ASYNC_FLUSH, asynchronous flushing. Once a synchronous flush returns success, the message is guaranteed to have been persisted to disk.

#### How to ensure messages are not lost when the disk breaks after they are written

To guard against data loss from disk damage, RocketMQ uses a master/replica architecture with cluster deployment: the data in the Leader is backed up on multiple Followers, preventing data loss caused by a single point of failure.

What if the Master node goes down? Once the Master node goes down, DLedger steps in:

-   Take over MQ's commitLog
-   Elect a replica node
-   Replicate files in uncommited state, which are changed to commited once most replica nodes have received them

#### How to ensure messages are not lost when the Consumer consumes from MQ

1. If consumption fails because of network problems, a retry mechanism can be applied, with each message retried 16 times by default
2. When multi-threaded asynchronous consumption fails, MQ considers the consumption successful, but for the business logic the message was actually not persisted. The solution is to follow the official MQ recommendation: execute the local transaction first and then return the success status.

#### How to ensure messages are not lost when the whole MQ node goes down

For this extreme case, after message sending fails, first store the message locally, for example in a cache, and start another thread that scans the cached messages and retries sending them.
