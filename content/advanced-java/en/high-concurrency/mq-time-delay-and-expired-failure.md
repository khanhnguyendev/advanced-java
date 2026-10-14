---
source:
  locale: zh
  slug: mq-time-delay-and-expired-failure
  hash: 'sha256:v1:2285da021756ab987c9697bc57c803b6413f37d011dfe0c0e40563579cece906'
status: machine
translatedAt: '2026-10-14'
---
# How to Handle Message Queue Delay and Expiration Failures?

## Interview question

How do you handle message queue delay and expiration failures? What do you do after the message queue is full? Millions of messages have been backlogged for several hours; tell me how you would solve that.

## Interviewer Psychology

Look at how this is asked. The scenarios it essentially targets are all the same: perhaps your consumer side has a problem and is not consuming, or the consumption speed is extremely slow. Then it gets nasty: the disks of your message queue cluster may be nearly full and still nobody is consuming, so what do you do? Or the whole thing has been backlogged for several hours, so what do you do? Or the backlog has lasted so long that, for example, RabbitMQ has set a message expiration time and the messages are gone, so what do you do?

This is actually quite common online. It usually does not happen, but once it happens it is a big case. A common example: after each consumption the consumer side has to write to MySQL, but MySQL goes down, and the consumer side hangs there and does not move; or something goes wrong on the consumer side and the consumption speed becomes extremely slow.

## Answer analysis

Let us sort this out one point at a time. First assume a scenario: our consumer side has failed, and a large number of messages are backlogged in the MQ. Now there is an incident, and everyone panics.

### A large number of messages have been backlogged in the MQ for several hours without being Resolved

Tens of millions of records were backlogged in the MQ for seven or eight hours, from a bit after 4 p.m. to a bit after 11 p.m. This is a scenario we really encountered, a real online failure. At this point, one option is to fix the consumer problem, restore its consumption speed, and then foolishly wait several hours for consumption to finish. You certainly cannot say that in an interview.

One consumer handles 1000 messages per second, 3 consumers handle 3000 per second, and that is 180,000 per minute. So if you have a backlog of millions to tens of millions of records, even after the consumers recover it takes roughly 1 hour to catch up.

Generally, at this point the only option is a temporary emergency scale-out. The concrete steps and ideas are as follows:

-   First fix the consumer problem, make sure its consumption speed is restored, and then stop all the existing consumers.
-   Create a new topic with 10 times the original number of partitions, and temporarily create 10 times the original number of queues.
-   Then write a temporary data-dispatching consumer program, and deploy it to consume the backlogged data. **After consuming, it does no time-consuming processing** and directly writes the messages evenly, round-robin, into the temporarily created queues, 10 times as many as before.
-   Next, temporarily requisition 10 times the machines to deploy consumers, with each batch of consumers consuming the data of one temporary queue. This approach is equivalent to temporarily scaling the queue resources and the consumer resources up by 10 times, consuming data at 10 times the normal speed.
-   After the backlogged data has been consumed quickly, **you have to restore the originally deployed architecture** and **go back to** consuming messages with the original consumer machines.

### Messages in the MQ have expired

Suppose you use RabbitMQ. RabbitMQ lets you set an expiration time, that is, TTL. If a message stays in the queue for longer than a certain time, it is cleaned up by RabbitMQ, and that data is gone. That is the second pitfall. Here the problem is not that a large amount of data is backlogged in the MQ, but that **a large amount of data is simply lost**.

In this case, the fix is not to add consumers to consume the backlogged messages, because in fact there is no backlog; a large number of messages have been lost. We can adopt a solution called **batch re-import**, which we have done in a similar online scenario before. When there was a large backlog, we simply discarded the data at that time, and then after the peak period had passed, say after midnight when everyone had been drinking coffee and staying up late and the users were asleep, we started writing a program: a temporary program that queried out the lost batch of data bit by bit and refilled it into the MQ, making up for the data lost during the day. That is all you can do.

Suppose 10,000 orders are backlogged in the MQ without being processed, and 1000 of them are lost. You can only write a program by hand to query out those 1000 orders, and manually send them into the MQ to make them up again.

### The MQ is nearly full

If messages are backlogged in the MQ and you have not been able to process them for a long time, so that the MQ is nearly full, what do you do? Is there another way? No. Your first solution was executed too slowly. You write a temporary program that connects to consume the data, **discarding each message as it is consumed, not keeping any of it**, and consume all the messages quickly. Then go with the second solution and make up the data at night.

---

For RocketMQ, the official documentation provides solutions to the message backlog problem.

### 1. Increase the consumption parallelism

The vast majority of message consumption is IO-bound, that is, it may operate a database or call an RPC. The consumption speed of this kind of consumption depends on the throughput of the backend database or external system. Increasing the consumption parallelism can raise the total consumption throughput, but once the parallelism is increased beyond a certain point it goes down instead. So the application must set a reasonable parallelism. There are several ways to change the consumption parallelism:

Within the same ConsumerGroup, increase parallelism by increasing the number of Consumer instances (note that Consumer instances beyond the number of subscribed queues are useless). You can add machines, or start multiple processes on existing machines.
Increase the parallel consumption threads of a single Consumer by modifying the parameters consumeThreadMin and consumeThreadMax.

### 2. Consume in Batches

If some business processes support batch consumption, consumption throughput can be improved greatly. For example, in an order-deduction application, processing one order at a time takes 1 s, while processing 10 orders at a time may take only 2 s, which greatly improves consumption throughput. This is done by setting the consumer's consumeMessageBatchMaxSize parameter. The default is 1, meaning only one message is consumed at a time; if it is set to N, the number of messages consumed each time is less than or equal to N.

### 3. Skip Unimportant messages

When messages pile up, if the consumption speed can never catch up with the sending speed and the business has low requirements for the data, you can choose to discard unimportant messages. For example, when the number of messages piled up in a queue exceeds 100000, try discarding some or all of the messages, so that you can quickly catch up with the speed at which messages are sent. Sample code is as follows:

```java
public ConsumeConcurrentlyStatus consumeMessage(
            List<MessageExt> msgs,
            ConsumeConcurrentlyContext context) {
    long offset = msgs.get(0).getQueueOffset();
    String maxOffset =
            msgs.get(0).getProperty(Message.PROPERTY_MAX_OFFSET);
    long diff = Long.parseLong(maxOffset) - offset;
    if (diff > 100000) {
        // TODO Special handling when messages pile up
        return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
    }
    // TODO Normal consumption process
    return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
}
```

### 4. Optimize the consumption process of each message

For example, the consumption process of a certain message is as follows:

-   Query [data 1] from the DB based on the message
-   Query [data 2] from the DB based on the message
-   Complex business calculation
-   Insert [data 3] into the DB
-   Insert [data 4] into the DB

The consumption of this message involves 4 interactions with the DB. At 5 ms each, that is 20 ms in total, and if the business calculation takes 5 ms, the total is 25 ms. So if the 4 DB interactions can be optimized to 2, the total time can be optimized to 15 ms, an overall performance improvement of 40%. So if the application is latency-sensitive, you can deploy the DB on SSD disks, whose RT is much smaller than that of SCSI disks.
