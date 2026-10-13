---
source:
  locale: zh
  slug: why-mq
  hash: 'sha256:v1:d85800610bd5ac920111f2abc85b5b837999503953882cadb78dd816c7b9e240'
status: machine
translatedAt: '2026-10-14'
---
# Why Use a Message Queue?

## Interview Question

-   Why use a message queue?
-   What are the advantages and disadvantages of a message queue?
-   What are the differences between Kafka, ActiveMQ, RabbitMQ, and RocketMQ, and which scenarios suit each?

## Interviewer Psychology

What the interviewer mainly wants to find out is:

-   **First**, do you know why your system needs a message queue at all?

    Many candidates say they used Redis or MQ in their projects, but they don't actually know why they needed it. Frankly, they used it for the sake of using it, or the architecture was designed by someone else and they never thought about it from start to finish.

    Someone who never asks "why" about their own architecture is someone who doesn't think in daily work, and interviewers usually have a poor impression of such candidates. The interviewer worries that once you join the team you will only do dull, mechanical work and never think for yourself.

-   **Second**, since you used a message queue, do you know what benefits and drawbacks come with it?

    If you never considered this, then you blindly brought an MQ into the system, and when problems appear later, won't you just slip away and leave the company holding the mess? If you never considered the possible downsides and risks of introducing a technology, an interviewer who hires you is basically hiring a pit-digger. The fear is that you dig a pile of pits in one year, then change jobs and leave the company with endless trouble.

-   **Third**, since you used MQ, probably one specific MQ, did you do any research at the time?

    Don't foolishly pick an MQ on a whim based on personal preference, such as Kafka, without ever having researched which MQs are popular in the industry, or what the advantages and disadvantages of each are. **No MQ is absolutely good or bad**; it depends on which scenario lets you **play to its strengths and avoid its weaknesses**.

    If a candidate who doesn't consider technology selection joins the team, and the leader hands them a task to design some system, they may use some technologies without ever weighing the options, and the final choice may not be suitable. That likewise leaves pits behind.

## Answer Analysis

### Why Use a Message Queue

This is really asking what use cases message queues have, what the specific scenario in your project is, and what you used the message queue for in that scenario.

When the interviewer asks this question, the **expected answer** is that your company has a certain **business scenario** with a certain technical challenge, that it would be quite troublesome without MQ, and that using MQ now brings you many benefits.

First, let's go over the common use cases of message queues. There are many, but three are the core ones: **decoupling**, **asynchrony**, and **peak shaving**.

#### Decoupling

Consider this scenario. System A sends data to systems B, C, and D through interface calls. What if system E also wants this data? And what if system D no longer needs it? The owner of system A is nearly driven mad......

![mq-1](asset:high-concurrency/why-mq/mq-1.png)

In this scenario, system A is heavily coupled with all kinds of other systems. System A produces a piece of important data, and many systems need system A to send it to them. System A must constantly worry about what to do if any of the systems B, C, D, and E go down. Should it resend? Should it store the messages? It will turn your hair white!

With MQ, system A produces a piece of data and sends it to MQ, and any system that needs the data consumes it from MQ by itself. If a new system needs the data, it simply consumes from MQ; if a system no longer needs the data, it just stops consuming those MQ messages. This way, system A doesn't need to think about whom to send data to, doesn't need to maintain that code, and doesn't need to worry about whether the other side's call succeeded, failed, or timed out.

![mq-2](asset:high-concurrency/why-mq/mq-2.png)

**Summary**: Through an MQ and the Pub/Sub publish-subscribe model, system A is completely decoupled from the other systems.

**Interview tip**: Think about whether your own system has a similar scenario, that is, a system or module calls several other systems or modules, the calls among them are very complicated, and maintenance is troublesome. Yet those calls don't actually need to be direct synchronous interface calls, and using MQ to make them asynchronous and decoupled would work too. You need to consider whether you can use MQ in your project to decouple systems, and reflect this in your resume: used MQ for decoupling.

#### Asynchrony

Now consider another scenario. System A receives a request and needs to write to its own local database, and also to the databases of systems B, C, and D. The local write takes 3ms, and the writes to B, C, and D take 300ms, 450ms, and 200ms respectively. The total request latency is 3 + 300 + 450 + 200 = 953ms, close to 1s, and the user feels the thing is terribly slow. The user sends a request from the browser and waits about 1s, which is almost unacceptable.

![mq-3](asset:high-concurrency/why-mq/mq-3.png)

For direct user operations, internet companies generally require every request to finish within 200 ms, so that the user barely perceives any delay.

If you **use MQ**, system A sends 3 messages to the MQ queue in a row, say taking 5ms, and the total time from system A receiving a request to returning a response to the user is 3 + 5 = 8ms. From the user's perspective, they click a button and get a response after 8ms. Great! What a well-built, fast website!

![mq-4](asset:high-concurrency/why-mq/mq-4.png)

#### Peak Shaving

From 0:00 to 12:00 every day, system A is calm, with only 50 concurrent requests per second. But every day from 12:00 to 13:00, the number of concurrent requests per second suddenly surges to 5k+. The system is built directly on MySQL, so a flood of requests pours into MySQL, which executes about 5k SQL statements per second.

An ordinary MySQL can handle about 2k requests per second at most. At 5k requests per second, MySQL may be knocked over outright, crashing the system and leaving users unable to use it.

But once the peak is over, in the afternoon it becomes an off-peak period, and perhaps only 10,000 users are on the site at the same time, with maybe around 50 requests per second, putting almost no pressure on the system.

![mq-5](asset:high-concurrency/why-mq/mq-5.png)

With MQ, 5k requests per second are written into MQ, and system A processes at most 2k requests per second, because MySQL can handle at most 2k per second. System A slowly pulls requests from MQ, 2k per second, as long as it doesn't exceed the maximum number of requests it can handle per second. This way, even during the peak, system A will never go down. And since 5k requests per second go into MQ while only 2k go out, during the midday peak (1 hour) there may be hundreds of thousands or even millions of requests backlogged in MQ.

![mq-6](asset:high-concurrency/why-mq/mq-6.png)

This short-lived peak backlog is fine, because after the peak passes, only 50 requests per second enter MQ, while system A still keeps processing at 2k requests per second. So as soon as the peak is over, system A will quickly clear the backlogged messages.

### Advantages and Disadvantages of Message Queues

The advantages were covered above: **in particular scenarios they bring corresponding benefits**, namely **decoupling**, **asynchrony**, and **peak shaving**.

The disadvantages are as follows:

-   Reduced system availability

    The more external dependencies a system introduces, the easier it is to go down. You used to have system A simply call the interfaces of systems B, C, and D, and the four systems A, B, C, and D were all fine with no problems. Then you insisted on adding an MQ, and what if the MQ goes down? Once MQ is down, the whole system collapses, and aren't you finished? For how to ensure the high availability of a message queue, you can [click here](doc:advanced-java/high-concurrency/how-to-ensure-high-availability-of-message-queues).

-   Increased system complexity

    Having forced an MQ in, how do you [ensure messages are not consumed repeatedly](doc:advanced-java/high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed)? How do you [handle message loss](doc:advanced-java/high-concurrency/how-to-ensure-the-reliable-transmission-of-messages)? How do you guarantee the ordering of message delivery? What a headache: a pile of problems, and painful ones.

-   Consistency problems

    System A finishes processing and returns success right away, and everyone assumes your request succeeded. But the problem is, among systems B, C, and D, what if systems B and D wrote to their databases successfully but system C failed? Your data is now inconsistent.

    So a message queue is actually a very complex architecture. Introducing it brings many benefits, but you must also apply all sorts of extra technical solutions and architecture to counter the problems it brings. After that, you will find that, my goodness, the system complexity has gone up by an order of magnitude, perhaps 10 times more complex. But at critical moments, you still have to use it.

### What Are the Advantages and Disadvantages of Kafka, ActiveMQ, RabbitMQ, and RocketMQ?

| Feature                              | ActiveMQ                                                                    | RabbitMQ                                                                                                    | RocketMQ                                                                                                                                                                               | Kafka                                                                                                                                                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single-node throughput               | Tens of thousands, an order of magnitude lower than RocketMQ and Kafka      | Same as ActiveMQ                                                                                            | Hundreds of thousands, supports high throughput                                                                                                                                        | Hundreds of thousands, high throughput, generally used with big data systems for scenarios such as real-time computation and log collection                                                                                                         |
| Impact of topic count on throughput  |                                                                             |                                                                                                             | Topics can reach hundreds or thousands with only a small drop in throughput, which is a major advantage of RocketMQ; on the same machines it can support a large number of topics      | Throughput drops sharply when topics grow from dozens to hundreds; on the same machines, Kafka tries to keep the number of topics from being too large, and supporting a large number of topics requires more machine resources                    |
| Timeliness                           | ms level                                                                    | Microsecond level, a major feature of RabbitMQ with the lowest latency                                      | ms level                                                                                                                                                                               | Latency within the ms level                                                                                                                                                                                                                        |
| Availability                         | High, high availability based on a primary/replica architecture             | Same as ActiveMQ                                                                                            | Very high, distributed architecture                                                                                                                                                    | Very high, distributed, with multiple replicas of the data; if a few machines go down, no data is lost and the service stays available                                                                                                             |
| Message reliability                  | A low probability of data loss                                              | Basically no loss                                                                                           | With tuned parameter configuration, zero loss can be achieved                                                                                                                          | Same as RocketMQ                                                                                                                                                                                                                                   |
| Feature support                      | Extremely complete features in the MQ field                                 | Developed in erlang, with strong concurrency, excellent performance, and very low latency                   | Fairly complete MQ features, also distributed, with good scalability                                                                                                                   | Fairly simple features, mainly supporting simple MQ functions; widely used in big data for real-time computation and log collection                                                                                                                |

In summary, after comparing them, here are the recommendations:

When a typical business system introduces MQ, everyone used ActiveMQ at the earliest, but now not many people use it. It hasn't been proven in large-scale throughput scenarios and the community isn't very active, so let's skip it; personally I don't recommend using it anymore.

Later everyone started using RabbitMQ, but the erlang language did stop many Java engineers from studying and mastering it in depth, which leaves it almost out of the company's control. Still, it is open source, it has relatively stable support, and its community is active.

But now more and more companies use RocketMQ, and it is indeed quite good, since it is produced by Alibaba. However, the community may suddenly die off (RocketMQ has now been donated to [Apache](https://github.com/apache/rocketmq), but its activity on GitHub is actually not that high). If you have absolute confidence in your company's technical strength, RocketMQ is recommended; otherwise go back and use RabbitMQ obediently, since it has an active open-source community and will definitely not die off.

So for **small and medium-sized companies** with average technical strength and no particularly high technical challenges, RabbitMQ is a good choice; for **large companies** with strong infrastructure R&D capability, RocketMQ is a good choice.

For scenarios such as real-time computation and log collection in the **big data field**, Kafka is the industry standard and absolutely fine; the community is very active and will not die off, and it is practically the de facto standard in this field worldwide.
