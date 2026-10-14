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

What the interviewer mainly wants to see is:

-   **First**, do you know why your system uses a message queue at all?

    Plenty of candidates say they used Redis or an MQ in their project, but they don't actually know why they used it. Frankly, they used it for the sake of using it, or it was an architecture someone else designed and they never thought about it from start to finish.

    Someone who never asks "why" about their own architecture is surely someone who doesn't think in daily work, and interviewers usually have a poor impression of such candidates. The interviewer worries that after you join the team you will just plod through the work mindlessly and never think for yourself.

-   **Second**, since you used a message queue, do you know what benefits and drawbacks come with it?

    If you never considered this, then you blindly dropped an MQ into the system, and when problems appear later, would you just slip away and leave the company a mess? If you never considered the possible drawbacks and risks of introducing a technology, an interviewer who hires you is basically hiring someone who digs holes. The fear is that you dig a pile of holes in a year, then job-hop and leave endless trouble for the company.

-   **Third**, since you used an MQ, probably one specific MQ, did you do any research at the time?

    Don't foolishly pick an MQ, say Kafka, on a whim based on personal preference, without ever investigating which MQs are popular in the industry and what the advantages and disadvantages of each are. No MQ is **absolutely good or bad**; what matters is which scenario lets you **play to its strengths and avoid its weaknesses**.

    If a candidate who ignores technology selection joins the team, and the leader gives them a task to design some system, they will use some technologies in it without ever thinking about selection, and the technologies finally chosen may not be suitable, which again leaves a hole behind.

## Answer Analysis

### Why Use a Message Queue

This is really asking what use cases a message queue has, what the specific scenario is in your project, and what role the message queue plays in that scenario.

The **expected answer** when an interviewer asks this is: your company has a certain **business scenario**, this scenario has a certain technical challenge, it would be quite troublesome without an MQ, but after you introduced an MQ it brought you many benefits.

Let's first go over the common use cases of a message queue. There are actually many, but three are the most essential: **decoupling**, **asynchronous** processing, and **peak shaving**.

#### Decoupling

Consider this scenario. System A sends data to systems B, C, and D through API calls. What if system E also needs this data? What if system D no longer needs it? The owner of system A is nearly driven mad......

![mq-1](asset:high-concurrency/why-mq/mq-1.png)

In this scenario, system A is heavily coupled with all kinds of other systems. System A produces a piece of critical data, and many systems need system A to send it over. System A has to keep worrying about what to do if systems B, C, D, and E go down. Should it resend? Should it store the message? Its hair has turned white from worry!

With an MQ, system A produces a piece of data and sends it to the MQ, and whichever system needs the data consumes it from the MQ itself. If a new system needs the data, it simply consumes from the MQ; if a system no longer needs the data, it just stops consuming the MQ messages. This way, system A does not need to think about who to send data to, does not need to maintain that code, and does not need to think about whether the other side's call succeeded, failed, or timed out.

![mq-2](asset:high-concurrency/why-mq/mq-2.png)

**Summary**: With an MQ and the publish/subscribe (pub/sub) message model, system A is completely decoupled from the other systems.

**Interview tip**: Think about whether your own system has a similar scenario: a system or module calls several other systems or modules, the calls between them are complicated, and maintenance is troublesome. But those calls do not actually need to be direct synchronous API calls, and using an MQ to decouple them asynchronously would work. You need to consider whether you can use an MQ in your project to decouple systems. Show this on your resume: using an MQ for decoupling.

#### Asynchronous Processing

Now consider another scenario. System A receives a request, and needs to write to its own local database and also to the databases of systems B, C, and D. Writing locally takes 3ms, and writing to B, C, and D takes 300ms, 450ms, and 200ms respectively. The total request latency is 3 + 300 + 450 + 200 = 953ms, close to 1s, and the user feels it is painfully slow. The user sends a request from the browser and waits about 1s, which is nearly unacceptable.

![mq-3](asset:high-concurrency/why-mq/mq-3.png)

For direct user operations, internet companies generally require every request to complete within 200 ms, so that the user barely perceives it.

If you **use an MQ**, system A sends 3 messages to the MQ queue in succession, say taking 5ms. From receiving a request to returning the response to the user, system A takes 3 + 5 = 8ms in total. For the user, it feels like clicking a button and getting a response after 8ms. Great! The website is well built, and fast!

![mq-4](asset:high-concurrency/why-mq/mq-4.png)

#### Peak Shaving

From 0:00 to 12:00 every day, system A is calm, with only 50 concurrent requests per second. But every day from 12:00 to 13:00, the concurrent requests per second suddenly surge to 5k+. The system is built directly on MySQL, so a large number of requests pour into MySQL, executing about 5k SQL statements per second.

An ordinary MySQL can handle roughly 2k requests per second. At 5k requests per second it may well be knocked out, causing the system to collapse and leaving users unable to use it.

But once the peak is over, in the afternoon it becomes an off-peak period. Perhaps only 10k users are operating on the site at the same time, the request volume may be only 50 requests per second, and the whole system is under almost no pressure.

![mq-5](asset:high-concurrency/why-mq/mq-5.png)

With an MQ, 5k requests per second are written into the MQ, while system A handles at most 2k requests per second, because MySQL handles at most 2k per second. System A slowly pulls requests from the MQ, 2k per second, never exceeding the maximum it can process per second. This way, even at peak time, system A will absolutely not go down. Meanwhile 5k requests per second enter the MQ and only 2k leave, so during the midday peak (1 hour), hundreds of thousands or even millions of requests may pile up in the MQ.

![mq-6](asset:high-concurrency/why-mq/mq-6.png)

This brief peak backlog is fine, because after the peak only 50 requests per second enter the MQ, while system A continues to process at 2k requests per second. So once the peak passes, system A quickly clears the backlogged messages.

### Advantages and Disadvantages of a Message Queue

The advantages were covered above: **specific benefits in special scenarios**, namely **decoupling**, **asynchronous** processing, and **peak shaving**.

The disadvantages are as follows:

-   Reduced system availability

    The more external dependencies a system introduces, the more easily it goes down. Originally system A just called the APIs of systems B, C, and D, and all four systems were fine with no problems. But you insisted on adding an MQ, and what if the MQ goes down? Once the MQ goes down, the whole system collapses, and you are finished. For how to ensure high availability of a message queue, [click here](doc:advanced-java/high-concurrency/how-to-ensure-high-availability-of-message-queues).

-   Increased system complexity

    Having forcibly added an MQ, how do you [ensure messages are not consumed repeatedly](doc:advanced-java/high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed)? How do you [handle message loss](doc:advanced-java/high-concurrency/how-to-ensure-the-reliable-transmission-of-messages)? How do you guarantee the ordering of message delivery? What a headache: a pile of problems and endless pain.

-   Consistency problems

    System A finishes processing and returns success directly, and everyone assumes your request succeeded. But what if, among systems B, C, and D, systems B and D wrote to the database successfully while system C failed? Then your data is inconsistent.

    So a message queue is in fact a very complex architecture. Introducing it brings many benefits, but you also have to build various additional technical solutions and architecture to avoid the problems it brings. After you do that, you will find, goodness, the system complexity has gone up by an order of magnitude, perhaps 10 times. But at critical moments, you still have to use it.

### What Are the Advantages and Disadvantages of Kafka, ActiveMQ, RabbitMQ, and RocketMQ?

| Feature                                | ActiveMQ                                                          | RabbitMQ                                                                              | RocketMQ                                                                                                                                                                                                         | Kafka                                                                                                                                                                                                                                                             |
| -------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single-node throughput                 | On the order of 10k, an order of magnitude lower than RocketMQ and Kafka | Same as ActiveMQ                                                                      | On the order of 100k, supports high throughput                                                                                                                                                                   | On the order of 100k, high throughput, generally used together with big data systems for scenarios such as real-time data computation and log collection                                                                                                          |
| Effect of topic count on throughput    |                                                                   |                                                                                       | Topics can reach the hundreds or thousands with only a small drop in throughput, which is a major advantage of RocketMQ; on the same machines it can support a large number of topics                            | When topics grow from dozens to hundreds, throughput drops sharply; on the same machines Kafka tries to keep the topic count from getting too large, and supporting a large number of topics requires more machine resources                                      |
| Latency                                | ms level                                                          | Microsecond level, a major feature of RabbitMQ, with the lowest latency               | ms level                                                                                                                                                                                                         | Latency within the ms level                                                                                                                                                                                                                                       |
| Availability                           | High, high availability based on a master/replica architecture    | Same as ActiveMQ                                                                      | Very high, distributed architecture                                                                                                                                                                              | Very high, distributed, with multiple replicas of each piece of data; if a few machines crash, no data is lost and no unavailability results                                                                                                                      |
| Message reliability                    | A small probability of losing data                                | Basically no loss                                                                     | With tuned parameter configuration, zero loss can be achieved                                                                                                                                                    | Same as RocketMQ                                                                                                                                                                                                                                                  |
| Feature support                        | Extremely complete features in the MQ field                       | Developed in erlang, strong concurrency, excellent performance, very low latency      | Fairly complete MQ features, also distributed, with good scalability                                                                                                                                             | Fairly simple features, mainly supporting basic MQ functions, widely used in real-time computation and log collection in the big data field                                                                                                                       |

In summary, after comparing all of these, the recommendations are as follows:

For an ordinary business system that needs an MQ, everyone used ActiveMQ at first, but not many people use it now. It has not been validated in large-scale throughput scenarios and its community is not very active, so let's skip it; I personally do not recommend using it.

Later everyone started using RabbitMQ, but the erlang language has indeed kept many Java engineers from studying and mastering it in depth, which leaves it almost out of the company's control. Still, it is open source, has relatively stable support, and has high activity.

These days, more and more companies are adopting RocketMQ, and it is indeed very good, since it comes from Alibaba, but the community may suddenly go quiet (RocketMQ has now been donated to [Apache](https://github.com/apache/rocketmq), though its activity on GitHub is not actually high). If you are absolutely confident in your company's technical strength, RocketMQ is recommended; otherwise go back and use RabbitMQ honestly, which has an active open-source community and will absolutely not fade away.

So for **small and medium-sized companies** with average technical strength and no particularly high technical challenges, RabbitMQ is a good choice; for **large companies** with strong infrastructure R&D capability, RocketMQ is a very good choice.

For scenarios such as real-time computation and log collection in the **big data field**, using Kafka is the industry standard and definitely no problem. Its community is very active and will absolutely not fade away, and it is nearly the de facto standard in this field worldwide.
