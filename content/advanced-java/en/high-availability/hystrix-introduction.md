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

In a distributed system, every service may call many other services, and the services being called are its **dependent services**. It is quite normal for some dependent services to fail from time to time.

Hystrix lets us control calls between services in a distributed system by adding **fault-tolerance mechanisms** for **call latency** and **dependency failures**.

Hystrix applies **resource isolation** to dependent services, which prevents a failure in one dependent service from spreading across all dependent-service calls in the whole system. Hystrix also provides a fallback degradation mechanism for when failures occur.

**In short, Hystrix helps us improve the availability and stability of distributed systems through these methods.**

## The History of Hystrix

Hystrix is a framework for guaranteeing high availability. Starting in 2011, the API team at Netflix (which you can think of as an overseas counterpart of video sites such as Youku or iQiyi) began work on improving system availability and stability, and Hystrix grew out of that effort.

By 2012, Hystrix had become fairly mature and stable, and at Netflix, many teams besides the API team began to use it.

To this day, billions of calls between services happen at Netflix every day through the Hystrix framework, and Hystrix has helped Netflix improve the overall availability and stability of its site.

[In November 2018, Hystrix announced on its GitHub home page that it would no longer accept new features and recommended that developers use other open-source projects that are still active](https://github.com/Netflix/Hystrix/blob/master/README.md#hystrix-status). The shift to maintenance mode by no means implies that Hystrix is no longer valuable. On the contrary, Hystrix inspired many great ideas and projects, and our coverage of high availability will still be explained around Hystrix.

## Hystrix Design Principles

-   **Control and provide fault-tolerance protection** for call latency and call failures that occur when calling dependent services.
-   In a complex distributed system, prevent the failure of one dependent service from spreading through the whole system, for example when one service fails and causes other services to fail along with it.
-   Support `fail-fast` (quick failure) and quick recovery.
-   Support fallback graceful degradation.
-   Support near-real-time monitoring, alerting, and operational control.

Here is an example.

Suppose there is a distributed system in which service A depends on service B, and service B depends on services C/D/E. In such a mature system, say there are at most 100 thread resources. Under normal conditions, 40 threads concurrently call service C, and 30 threads each concurrently call D and E.

A call to service C takes only 20ms. Now suppose service C fails, for example it becomes slow or goes down, and threads hang for about 2s. All 40 threads get stuck, and as requests keep pouring in, other threads are also used to call service C and are stuck in the same way. This exhausts the thread resources of service B, so it cannot accept new requests, and it may even crash itself because so many threads keep running. This impact will inevitably spread to service A, causing service A to go down too.

![service-invoke-road](asset:high-availability/hystrix-introduction/service-invoke-road.png)

Hystrix can apply resource isolation here, for example by limiting service B to 40 threads for calling service C. When those 40 threads are hung, the other 60 threads can still call and work normally, which ensures the whole system is not dragged down.

## More Detailed Hystrix Design Principles

-   Prevent any single dependent service from exhausting all resources, such as all the thread resources in Tomcat.
-   Avoid request queuing and backlog, and use rate limiting and `fail fast` to contain failures.
-   Provide a fallback degradation mechanism to cope with failures.
-   Use resource isolation techniques such as `bulkhead` (bulkhead isolation), `swimlane` (swimlane technique), and `circuit breaker` (circuit-breaking technique) to limit the impact of any dependent service's failure.
-   Improve the speed of fault detection through near-real-time statistics, monitoring, and alerting.
-   Improve the speed of fault handling and recovery through near-real-time **hot modification** of properties and configuration.
-   Protect against all failure cases of dependent service calls, not just network failures.
