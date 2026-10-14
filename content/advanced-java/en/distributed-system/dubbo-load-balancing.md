---
source:
  locale: zh
  slug: dubbo-load-balancing
  hash: 'sha256:v1:955dd7ed7a8cd22cf2d8674d37471ff8cbe23d4c1720c113a2142c06e99a20ab'
status: machine
translatedAt: '2026-10-14'
---
# Dubbo Load Balancing and Cluster Fault Tolerance Strategies

## Interview question

What are Dubbo's load balancing strategies and cluster fault tolerance strategies? What about the dynamic proxy strategy?

## Interviewer psychology

The interviewer keeps digging. These are all things you must know to use Dubbo: you need to know the basic principle and which protocol serialization uses, and also how load balancing, high availability, and dynamic proxying work when you actually use Dubbo.

Put plainly, the interviewer is checking how familiar you are with Dubbo:

-   How Dubbo works: service registration, the service registry, consumers, proxy communication, load balancing;
-   Network communication and serialization: the dubbo protocol, long connections, NIO, the hessian serialization protocol;
-   Load balancing strategies, cluster fault tolerance strategies, dynamic proxy strategies: how do these functions operate when Dubbo runs? How is load balancing done? How is cluster fault tolerance done? How is a dynamic proxy generated?
-   The Dubbo SPI mechanism: do you understand Dubbo's SPI mechanism? How do you extend Dubbo based on the SPI mechanism?

## Answer analysis

### Dubbo load balancing strategies

#### RandomLoadBalance

By default, Dubbo uses RandomLoadBalance, which implements load balancing through **random** calls. You can **set different weights** on different provider instances, and load balancing then follows the weights: the larger the weight, the more traffic is assigned. Usually this default is enough.

The idea of the algorithm is very simple. Suppose there is a group of servers servers = `[A, B, C]` with corresponding weights weights = `[5, 3, 2]`, and the weights sum to 10. Now lay these weight values out on a one-dimensional axis: the interval `[0, 5)` belongs to server A, `[5, 8)` belongs to server B, and `[8, 10)` belongs to server C. Next, a random number generator produces a random number in the range `[0, 10)`, and we compute which interval the number falls into. For example, the number 3 falls into the interval of server A, so server A is returned. A machine with a larger weight has a larger interval on the axis, so the number produced by the random number generator has a higher probability of falling into that interval. As long as the random numbers produced by the generator are well distributed, after many selections the ratio of the number of times each server is chosen approaches its weight ratio. For example, after ten thousand selections, server A is chosen about 5,000 times, server B about 3,000 times, and server C about 2,000 times.

#### RoundRobinLoadBalance

By default this spreads traffic evenly across the machines, but if the machines differ in performance, the weaker machines easily end up overloaded. In that case you need to adjust the weights so that weaker machines carry a smaller weight and less traffic.

Here is an example.

Suppose we request machines from the operations team. Sometimes we are lucky: the company happens to have plenty of resources, and a batch of piping-hot, freshly made virtual machines has just come out with fairly high specs, 8 cores + 16G, and we get 2 of them. After a while we feel 2 machines are not quite enough, so I go to the operations colleague and say, "Buddy, could you give me one more machine?" But now only one 4 cores + 8G machine is left. I still have to take it.

In this case you can set weight 4 on the two 8-core 16G machines and weight 2 on the remaining 4-core 8G machine.

#### LeastActiveLoadBalance

The official documentation explains `LeastActiveLoadBalance` as "**least active count load balancing**". The smaller the number of active calls, the more efficient the service provider is and the more requests it can process per unit of time, so requests are assigned to that service provider first.

The basic idea of the least-active-count load balancing algorithm is as follows:

Each service provider corresponds to an active count `active`. Initially, `active` is 0 for all service providers. Whenever a request is received, the corresponding provider's `active` increases by 1, and after the request is processed, `active` decreases by 1. So if a service provider performs well and handles requests more efficiently, its `active` drops faster. Such a service provider can therefore be assigned requests first.

Of course, besides the least active count, `LeastActiveLoadBalance` also introduces a weight value in its implementation. So to be precise, `LeastActiveLoadBalance` is implemented on a weighted least-active-count algorithm.

#### ConsistentHashLoadBalance

With the consistent hash algorithm, requests with the same parameters are always dispatched to the same provider. When a provider goes down, the remaining traffic is distributed evenly based on virtual nodes, so the jitter is not large. **If what you need is not random load balancing** but for one class of requests to all go to one node, use this consistent hash strategy.

> For a more detailed description of Dubbo's load balancing strategies, see the official site https://dubbo.apache.org/zh/docs/advanced/loadbalance .

### Dubbo cluster fault tolerance strategies

#### Failover Cluster mode

Automatic switchover on failure, automatically retrying other machines. This is the **default** and is common for read operations. (On failure, retry other machines.)

The number of retries can be configured in the following ways:

```xml
<dubbo:service retries="2" />
```

or

```xml
<dubbo:reference retries="2" />
```

or

```xml
<dubbo:reference>
    <dubbo:method name="findFoo" retries="2" />
</dubbo:reference>
```

#### Failfast Cluster mode

Fail immediately after one failed call. This is common for non-idempotent write operations, such as adding a record. (Fail immediately when the call fails.)

#### Failsafe Cluster mode

Ignore exceptions when they occur. It is often used for unimportant API calls, such as writing logs.

A configuration example follows:

```xml
<dubbo:service cluster="failsafe" />
```

or

```xml
<dubbo:reference cluster="failsafe" />
```

#### Failback Cluster mode

On failure, the request is automatically recorded in the background and then resent on a schedule. It is well suited to things like writing to a message queue.

#### Forking Cluster mode

**Call multiple providers in parallel**, and return immediately once one succeeds. It is often used for read operations with high real-time requirements, but it wastes more service resources. The maximum parallelism can be set with `forks="2"`.

#### Broadcast Cluster mode

Call all providers one by one. If any provider errors, an error is reported (supported since version `2.1.0`). It is usually used to notify all providers to update local resource information such as caches or logs.

> For a more detailed description of Dubbo's cluster fault tolerance strategies, see the official site https://dubbo.apache.org/zh/docs/advanced/fault-tolerent-strategy .

### Dubbo dynamic proxy strategy

By default, javassist dynamic bytecode generation is used to create the proxy class. But you can configure your own dynamic proxy strategy through the SPI extension mechanism.
