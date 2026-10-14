---
source:
  locale: zh
  slug: hystrix-introduction
  hash: 'sha256:v1:8265377e5efd6294d8f8f0b69af53d3e0b2e330ab324d056f91782b3833bb685'
status: machine
translatedAt: '2026-10-14'
---
# Building a Highly Available Service Architecture with Hystrix

See [Hystrix Home](https://github.com/Netflix/Hystrix/wiki#what).

## What Is Hystrix?

In a distributed system, each service may call many other services. The services being called are its **dependency services**, and it is quite normal for some dependency services to fail from time to time.

Hystrix lets us control calls between services in a distributed system by adding **fault tolerance mechanisms** for **call latency** and **dependency failures**.

Hystrix applies **resource isolation** to dependency services, which prevents the failure of one dependency service from spreading across all dependency service calls in the whole system. Hystrix also provides a fallback degradation mechanism for failures.

**In short, Hystrix uses these methods to help us improve the availability and stability of a distributed system.**

## History of Hystrix

Hystrix is a framework for guaranteeing high availability. Starting in 2011, the API team at Netflix (think of it as the overseas counterpart of a video site like Youku or iQiyi) did work to improve system availability and stability, and Hystrix grew out of that effort.

By 2012, Hystrix had become fairly mature and stable, and at Netflix, many teams other than the API team began using Hystrix.

Today, billions of calls between services at Netflix every day are made through the Hystrix framework, and Hystrix has helped the Netflix site improve its overall availability and stability.

[In November 2018, Hystrix announced on its GitHub homepage that it would no longer add new features and recommended that developers use other open-source projects that are still active](https://github.com/Netflix/Hystrix/blob/master/README.md#hystrix-status). The shift to maintenance mode by no means implies that Hystrix is no longer valuable. On the contrary, Hystrix inspired many great ideas and projects, and our coverage of high availability will still explain Hystrix.

## Design Principles of Hystrix

-   **Control and provide fault tolerance protection** for call latency and call failures that occur when calling dependency services.
-   In a complex distributed system, prevent the failure of one dependency service from spreading across the whole system, for example one service failing and causing other services to fail along with it.
-   Support `fail-fast` (fail fast) and fast recovery.
-   Support fallback graceful degradation.
-   Support near real-time monitoring, alerting, and operational actions.

Here is an example.

Suppose there is a distributed system in which service A depends on service B, and service B depends on services C/D/E. In such a mature system, say there may be at most 100 threads of resources. Under normal conditions, 40 threads call service C concurrently, and 30 threads each call D and E concurrently.

A call to service C takes only 20ms. Now service C fails, for example through latency or by going down, and the threads hang for about 2s. All 40 threads get stuck, and since requests keep pouring in, other threads are also used to call service C and likewise get stuck. As a result, service B's thread resources are exhausted and it cannot accept new requests, and it may even crash from a large number of threads running constantly. This impact is bound to spread to service A, causing service A to go down as well.

![service-invoke-road](asset:high-availability/hystrix-introduction/service-invoke-road.png)

Hystrix can apply resource isolation here, for example by limiting service B to 40 threads for calling service C. When those 40 threads hang, the other 60 threads can still call and work normally, which ensures the whole system is not dragged down.

## More Detailed Design Principles of Hystrix

-   Prevent any single dependency service from exhausting all resources, such as all the thread resources in Tomcat.
-   Avoid request queuing and backlog, and use rate limiting and `fail fast` to contain failures.
-   Provide a fallback degradation mechanism to handle failures.
-   Use resource isolation techniques, such as `bulkhead` (bulkhead isolation), `swimlane` (swimlane), and `circuit breaker` (circuit breaker), to limit the impact of any single dependency service failure.
-   Improve the speed of failure detection through near real-time statistics, monitoring, and alerting.
-   Improve the speed of failure handling and recovery through near real-time **hot modification** of properties and configuration.
-   Protect against all failure cases of dependency service calls, not just network failures.
