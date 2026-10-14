---
source:
  locale: zh
  slug: why-mq
  hash: 'sha256:v1:d85800610bd5ac920111f2abc85b5b837999503953882cadb78dd816c7b9e240'
status: machine
translatedAt: '2026-10-14'
---
# Why Use a Message Queue?

## Interview Questions

-   Why use a message queue?
-   What are the advantages and disadvantages of a message queue?
-   What are the differences between Kafka, ActiveMQ, RabbitMQ, and RocketMQ, and which scenarios suit each?

## Interviewer Psychology

What the interviewer mainly wants to see is:

-   **First**, do you know why your system uses a message queue at all?

    Many candidates say their project uses Redis or MQ, but they don't actually know why. Frankly, they are using it for the sake of using it, or they inherited an architecture someone else designed and never thought about it from start to finish.

    Someone who has never asked "why" about their own architecture is someone who doesn't think in daily work, and interviewers usually have a poor impression of such candidates. They worry that once you join the team you will simply do mindless grunt work and never think for yourself.

-   **Second**, since you used a message queue, do you know what benefits and drawbacks come with it?

    If you never considered this, then you blindly dropped an MQ into the system, and when problems appear later, you just walk away and leave the company holding the mess? If you never considered the possible drawbacks and risks of introducing a technology, an interviewer who hires you is basically hiring someone who digs pits for others to fall into. The fear is that you dig a pile of pits in one year, then jump to another job, leaving endless trouble for the company.

-   **Third**, since you used an MQ, probably a specific one, did you do any research at the time?

    Don't foolishly pick an MQ on a whim based on personal preference, say Kafka, without ever having looked into which MQs are popular in the industry, or what the strengths and weaknesses of each one are. No MQ is **absolutely good or bad**; what matters is which scenario you use it in, so that you can **play to its strengths and avoid its weaknesses**.

    If a candidate who doesn't consider technology selection joins the team, and the leader hands them a task to design some system, they will use some technologies without thinking about selection, and the final choice may well be unsuitable, which again leaves a pit behind.

## Answer Analysis

### Why Use a Message Queue

This is really asking what use cases a message queue has, what the specific scenario is in your project, and what you use the message queue for in that scenario.

The **expected answer** is this: your company has a certain **business scenario** with a certain technical challenge, which would be troublesome without an MQ, but using an MQ brings you many benefits.

Let's first go over the common use cases of a message queue. There are many, but three are central: **decoupling**, **asynchrony**, and **peak shaving**.

#### Decoupling

Consider this scenario. System A sends data to systems B, C, and D through API calls. What if system E also needs this data? What if system D no longer needs it? The owner of system A is nearly driven mad......

![mq-1](asset:high-concurrency/why-mq/mq-1.png)

In this scenario, system A is tightly coupled to all sorts of other systems. System A produces a piece of critical data, and many systems need system A to send it to them. System A must constantly worry about what to do if B, C, D, or E goes down. Should it resend? Should it store the message? It's enough to turn your hair gray!

With an MQ, system A produces a piece of data and sends it to the MQ, and any system that needs the data consumes it from the MQ itself. If a new system needs the data, it simply consumes from the MQ; if a system no longer needs the data, it just stops consuming the MQ messages. This way, system A doesn't need to think about whom to send data to, doesn't need to maintain that code, and doesn't need to consider whether the other side's call succeeded, failed, or timed out.

![mq-2](asset:high-concurrency/why-mq/mq-2.png)

**Summary**: Through an MQ and the Pub/Sub publish-subscribe model, system A is completely decoupled from the other systems.

**Interview tip**: Think about whether the system you are responsible for has a similar scenario, that is, a system or module that calls many other systems or modules, with very complicated calls between them that are painful to maintain. If those calls don't actually need to be direct synchronous API calls, they can be made asynchronous and decoupled with an MQ, so consider whether your project can use an MQ to decouple systems. Make this visible on your resume: using MQ for decoupling.

#### Asynchrony

Now consider another scenario. System A receives a request, needs to write to its own local database, and also needs to write to databases in systems B, C, and D. The local write takes 3ms, and the writes in B, C, and D take 300ms, 450ms, and 200ms respectively. The total request latency is 3 + 300 + 450 + 200 = 953ms, close to 1s, and the user feels it is painfully slow. A user who sends a request from a browser and waits about 1s is almost unacceptable.

![mq-3](asset:high-concurrency/why-mq/mq-3.png)

For internet companies, direct user operations generally require each request to complete within 200 ms, so the user barely perceives any delay.

If you **use an MQ**, system A sends 3 messages to the MQ queue in a row, say taking 5ms. From receiving a request to returning the response to the user, system A takes 3 + 5 = 8ms in total. From the user's point of view, they click a button and get a response within 8ms. Great! The website is really well built and fast!

![mq-4](asset:high-concurrency/why-mq/mq-4.png)

#### Peak Shaving

From 0:00 to 12:00 each day, system A is calm, with only 50 concurrent requests per second. But every day between 12:00 and 13:00, the number of concurrent requests per second suddenly surges to 5k+. The system is built directly on MySQL, so a flood of requests pours into MySQL, which executes roughly 5k SQL statements per second.

An ordinary MySQL can handle about 2k requests per second. At 5k requests per second, it may be knocked over outright, the system crashes, and users can no longer use it.

But once the peak is over, in the afternoon it becomes an off-peak period, perhaps with only 10,000 users operating on the site at the same time, and perhaps only 50 requests per second, which puts almost no pressure on the system.

![mq-5](asset:high-concurrency/why-mq/mq-5.png)

With an MQ, 5k requests per second are written into the MQ, and system A processes at most 2k requests per second, because MySQL can handle at most 2k per second. System A pulls requests slowly from the MQ, 2k per second, never exceeding the maximum it can process per second, and that is fine. This way, even during the peak, system A will not go down. Meanwhile, the MQ receives 5k requests per second but only 2k go out, so during the midday peak (1 hour), hundreds of thousands or even millions of requests may pile up in the MQ.

![mq-6](asset:high-concurrency/why-mq/mq-6.png)

This short-lived backlog during the peak is fine, because once the peak passes, only 50 requests per second enter the MQ, while system A still processes at 2k requests per second. So as soon as the peak is over, system A quickly clears the accumulated messages.

### Advantages and Disadvantages of a Message Queue

The advantages were covered above: **benefits in specific scenarios**, namely **decoupling**, **asynchrony**, and **peak shaving**.

The disadvantages are as follows:

-   Reduced system availability

    The more external dependencies a system introduces, the more easily it goes down. Originally, system A just called the APIs of systems B, C, and D, and all four systems were running fine with no problems. Then you insisted on adding an MQ. What if the MQ goes down? Once the MQ is down, the whole system collapses, and you are finished, aren't you? For how to ensure the high availability of a message queue, [click here](doc:advanced-java/high-concurrency/how-to-ensure-high-availability-of-message-queues).

-   Increased system complexity

    You forced an MQ in, so how do you [ensure messages are not consumed more than once](doc:advanced-java/high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed)? How do you [handle message loss](doc:advanced-java/high-concurrency/how-to-ensure-the-reliable-transmission-of-messages)? How do you ensure message ordering? What a headache, a pile of problems, and an agonizing mess.

-   Consistency issues

    System A finishes processing and returns success right away, and everyone assumes your request succeeded. But what if, among systems B, C, and D, the writes in B and D succeed while the write in C fails? Your data is now inconsistent.

    So a message queue is in fact a very complex architecture. Introducing it brings many benefits, but you also have to add all sorts of extra technical solutions and architecture to avoid the problems it brings. Once that is done, you will find, wow, the system's complexity has gone up by an order of magnitude, perhaps 10 times more complex. But at the critical moment, you still have to use one.

### What Are the Advantages and Disadvantages of Kafka, ActiveMQ, RabbitMQ, and RocketMQ?

| Feature                              | ActiveMQ                                                                  | RabbitMQ                                                                                       | RocketMQ                                                                                                                                                                                  | Kafka                                                                                                                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single-node throughput               | Tens of thousands per second, an order of magnitude lower than RocketMQ and Kafka | Same as ActiveMQ                                                                       | Hundreds of thousands per second, supports high throughput                                                                                                                                | Hundreds of thousands per second, high throughput, generally used with big data systems for scenarios such as real-time data computation and log collection                                                                                         |
| Effect of topic count on throughput  |                                                                           |                                                                                                | Topics can reach hundreds or thousands, with only a small drop in throughput. This is a major advantage of RocketMQ: on the same machines it can support a large number of topics         | When topics grow from dozens to hundreds, throughput drops sharply. On the same machines, Kafka should keep the topic count from growing too large; supporting a large number of topics requires more machine resources                            |
| Timeliness                           | ms level                                                                  | Microsecond level, a major feature of RabbitMQ and the lowest latency                          | ms level                                                                                                                                                                                  | Latency within the ms range                                                                                                                                                                                                                        |
| Availability                         | High, high availability based on a master/replica architecture            | Same as ActiveMQ                                                                               | Very high, distributed architecture                                                                                                                                                       | Very high, distributed, multiple replicas of each piece of data; if a few machines crash, no data is lost and availability is not affected                                                                                                         |
| Message reliability                  | Small probability of losing data                                          | Basically no loss                                                                              | With parameter tuning, zero loss can be achieved                                                                                                                                          | Same as RocketMQ                                                                                                                                                                                                                                   |
| Feature support                     | Extremely complete features in the MQ domain                              | Developed in Erlang, with strong concurrency, excellent performance, and very low latency      | Fairly complete MQ features, and distributed with good extensibility                                                                                                                      | Fairly simple features, mainly supporting basic MQ functions; widely used at scale for real-time computation and log collection in the big data domain                                                                                              |

In summary, after comparing them, here are some recommendations:

For ordinary business systems introducing an MQ, everyone used ActiveMQ at first, but not many people use it now. It has not been proven in large-scale high-throughput scenarios and its community is not very active, so let's skip it; I personally do not recommend it any more.

Later, people started using RabbitMQ, but the Erlang language has truly kept many Java engineers from studying and mastering it in depth, leaving it almost uncontrollable for a company. Still, it is open source, reasonably stable, and has an active community.

Now more and more companies are using RocketMQ, and it is indeed very good, since it comes from Alibaba, but the community may suddenly fade away (RocketMQ has now been donated to [Apache](https://github.com/apache/rocketmq), but its activity on GitHub is actually not high). If you have absolute confidence in your company's technical strength, RocketMQ is recommended; otherwise, go back and use RabbitMQ, which has an active open-source community and will definitely not fade away.

So for **small and medium-sized companies** with average technical strength and not especially high technical challenges, RabbitMQ is a good choice; for **large companies** with strong infrastructure R&D capability, RocketMQ is a great choice.

For scenarios such as real-time computation and log collection in the **big data domain**, Kafka is the industry standard and is absolutely fine. Its community is very active and will definitely not fade away, and it is practically the de facto standard in this field worldwide.
