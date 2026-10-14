---
source:
  locale: zh
  slug: hystrix-introduction
  hash: 'sha256:v1:8265377e5efd6294d8f8f0b69af53d3e0b2e330ab324d056f91782b3833bb685'
status: machine
translatedAt: '2026-10-14'
---
# Building a High Availability Service Architecture with Hystrix

Reference: [Hystrix Home](https://github.com/Netflix/Hystrix/wiki#what).

## What Is Hystrix?

In a distributed system, each service may call many other services. The services being called are **dependency services**, and it is quite normal for some dependency services to fail from time to time.

Hystrix lets us control calls between services in a distributed system, adding **fault tolerance mechanisms** for **call latency** and **dependency failures**.

By applying **resource isolation** to dependency services, Hystrix prevents the failure of one dependency service from spreading across all dependency service calls in the entire system. Hystrix also provides a degradation (fallback) mechanism for when failures occur.

**In short, Hystrix helps us improve the availability and stability of distributed systems through these methods.**

## The History of Hystrix

Hystrix is a framework for guaranteeing high availability. Netflix (which you can think of as an overseas equivalent of a video site such as Youku or iQIYI)'s API team began work on improving system availability and stability in 2011, and Hystrix grew out of that effort.

By 2012, Hystrix had become fairly mature and stable. At Netflix, many teams beyond the API team started using Hystrix.

To this day, billions of calls between services at Netflix are made through the Hystrix framework every day, and Hystrix has helped the Netflix site improve its overall availability and stability.

[In November 2018, Hystrix announced on its GitHub home page that it would no longer accept new features and recommended that developers use other open-source projects that are still active](https://github.com/Netflix/Hystrix/blob/master/README.md#hystrix-status). The shift to maintenance mode by no means implies that Hystrix is no longer valuable. On the contrary, Hystrix inspired many great ideas and projects, and our high availability material will still be explained around Hystrix.

## Hystrix Design Principles

-   Provide **control and fault tolerance protection** for call latency and call failures that occur when calling dependency services.
-   In a complex distributed system, prevent the failure of one dependency service from spreading through the entire system. For example, one service fails and causes other services to fail along with it.
-   Support `fail-fast` (fail quickly) and fast recovery.
-   Support graceful degradation.
-   Support near real-time monitoring, alerting, and operational actions.

Let's look at an example.

Suppose there is a distributed system in which service A depends on service B, and service B depends on services C/D/E. In such a mature system, say there are at most 100 thread resources. Under normal conditions, 40 threads call service C concurrently, and 30 threads each call D and E concurrently.

A call to service C takes only 20ms. Now service C fails, for example with latency or by going down, and threads hang for about 2s. All 40 threads get stuck, and as requests keep arriving, other threads are also used to call service C and get stuck as well. As a result, service B's thread resources are exhausted, it cannot accept new requests, and it may even crash because of a large number of threads constantly running. This impact inevitably spreads to service A, causing service A to go down too.

![service-invoke-road](asset:high-availability/hystrix-introduction/service-invoke-road.png)

Hystrix can apply resource isolation here, for example by limiting service B to only 40 threads calling service C. When those 40 threads hang, the other 60 threads can still call and work normally. This ensures that the whole system will not be dragged down.

## More Detailed Hystrix Design Principles

-   Prevent any single dependency service from exhausting all resources, such as all the thread resources in Tomcat.
-   Avoid request queuing and backlog, and use rate limiting and `fail fast` to contain failures.
-   Provide a degradation mechanism to cope with failures.
-   Use resource isolation techniques such as `bulkhead` (bulkhead isolation), `swimlane` (swimlane technique), and `circuit breaker` (circuit breaking) to limit the impact of any dependency service failure.
-   Improve the speed of failure detection through near real-time statistics, monitoring, and alerting.
-   Improve the speed of failure handling and recovery through near real-time **hot modification** of properties and configuration.
-   Protect against all failure cases of dependency service calls, not just network failures.
