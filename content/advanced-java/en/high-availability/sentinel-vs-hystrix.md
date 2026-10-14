---
source:
  locale: zh
  slug: sentinel-vs-hystrix
  hash: 'sha256:v1:9843111b7307a38009737c0290d5d43f68730bc350c8940e509119a5045f4ff1'
status: machine
translatedAt: '2026-10-14'
---
# How to Make a Technology Selection? Sentinel or Hystrix?

Sentinel is a lightweight high availability traffic control component for distributed service architectures, developed by Alibaba's middleware team and officially open-sourced in July 2018. Sentinel takes traffic as its entry point and helps users improve service stability across several dimensions, including traffic control, circuit breaking and degradation (fallback), and system load protection. You may ask: how does Sentinel compare with Netflix Hystrix, the circuit breaking and degradation library we have long relied on? This article compares Sentinel and Hystrix in terms of resource model and execution model, isolation design, circuit breaking and degradation, and real-time metrics design, in the hope of helping developers who face a technology selection.

Sentinel project address: https://github.com/alibaba/Sentinel

## Overview

Let's start with the official introduction of Hystrix:

> Hystrix is a library that helps you control the interactions between these distributed services by adding latency tolerance and fault tolerance logic. Hystrix does this by isolating points of access between the services, stopping cascading failures across them, and providing fallback options, all of which improve your system’s overall resiliency.

As you can see, Hystrix focuses on a fault tolerance mechanism built mainly on isolation and circuit breaking: calls that time out or are circuit-broken fail fast, and a fallback mechanism can be provided.

Sentinel, in contrast, emphasizes:

-   Diversified traffic control
-   Circuit breaking and degradation
-   System load protection
-   Real-time monitoring and a console

The problems the two solve are quite different, so let's compare them in detail.

## Common features

### 1. Comparison of the resource model and execution model

Hystrix's resource model uses the command pattern: calls to external resources and the fallback logic are encapsulated in a command object, `HystrixCommand` or `HystrixObservableCommand`, and the underlying execution is built on RxJava. Each Command must specify a `commandKey` and a `groupKey` (to distinguish resources) as well as the corresponding isolation strategy (thread pool isolation or semaphore isolation) when it is created. In thread pool isolation mode you configure the thread pool parameters (pool name, capacity, queue timeout and so on), and the Command then runs in the specified thread pool under the specified fault tolerance strategy; in semaphore isolation mode you configure the maximum concurrency, and Hystrix limits concurrent calls when it executes the Command.

**Note**: for a detailed introduction to Hystrix with code demonstrations, see the Hystrix part of [High Availability Architecture](section:advanced-java/high-availability) in this project.

Sentinel's design is simpler. Compared with Hystrix Command, which depends heavily on isolation rules, Sentinel couples resource definition and rule configuration much more loosely. A Hystrix Command depends heavily on the isolation rule configuration because the isolation rule directly affects how the Command executes. At execution time Hystrix parses the Command's isolation rule to create an RxJava Scheduler and schedules the execution on it: in thread pool mode the Scheduler's underlying thread pool is the configured one, and in semaphore mode it is simply wrapped as a Scheduler that executes on the current thread.

Sentinel is different. During development you only need to consider whether a method or piece of code needs protection; what protects it can be modified dynamically in real time at any moment.

Starting from version `0.1.1`, Sentinel also supports annotation-based resource definition, where annotation parameters can specify an exception handler and a fallback function. Sentinel offers diversified ways to configure rules. Besides registering rules into memory directly through the `loadRules` API, users can also register various external data sources to provide dynamic rules. Users can change the rule configuration dynamically according to the current state of the system, and the data source pushes the changes to Sentinel, where they take effect immediately.

### 2. Comparison of the isolation design

Isolation is one of Hystrix's core features. Hystrix provides two isolation strategies: thread pool isolation, the `Bulkhead Pattern`, and semaphore isolation, of which the most recommended and most commonly used is **thread pool isolation**. Hystrix's thread pool isolation creates a separate thread pool for each resource, so calls to different services happen in different thread pools, and when queuing, timeouts or other blocking occurs it can fail fast and provide a fallback mechanism. The advantage of thread pool isolation is a high degree of isolation: the thread pool of one resource can be handled without affecting other resources. The cost is a large overhead from thread context switching, which hurts low-latency calls in particular.

In practice, however, thread pool isolation does not bring many benefits. The most direct effect is that it fragments machine resources. Consider a common scenario: Hystrix used in a Servlet container such as Tomcat. Tomcat itself already has a large number of threads (perhaps dozens to over a hundred); add the thread pools Hystrix creates for each resource and the total grows very large (several hundred threads), so context switching causes a significant loss. In addition, the thorough isolation of the thread pool mode lets Hystrix handle queuing and timeouts separately for each resource's thread pool, but that is really the problem that timeout-based circuit breaking and traffic control are meant to solve. If a component already has timeout-based circuit breaking and traffic control, thread pool isolation becomes much less necessary.

Hystrix's semaphore isolation limits the number of concurrent calls to a resource. This kind of isolation is very lightweight: it only limits concurrent calls to a resource instead of explicitly creating a thread pool, so the overhead is small, yet the effect is good. Its drawback is that it cannot automatically degrade slow calls; it can only wait for the client to time out, so cascading blocking can still occur.

Sentinel can provide semaphore isolation through traffic control in concurrent-thread-count mode. Combined with response-time-based circuit breaking and degradation, it can degrade automatically when the average response time of an unstable resource is high, preventing too many slow calls from filling up the concurrency limit and affecting the whole system.

### 3. Comparison of circuit breaking and degradation

At their core, the circuit breaking and degradation features of both Sentinel and Hystrix are based on the circuit breaker pattern, `Circuit Breaker Pattern`. Both support circuit breaking and degradation based on the failure ratio (exception ratio): when calls reach a certain volume and the failure ratio reaches the configured threshold, the circuit breaks automatically, and all calls to that resource are blocked until the specified time window has passed, after which recovery is attempted heuristically. As mentioned above, Sentinel also supports circuit breaking and degradation based on the average response time: when service response time stays high, it breaks automatically and rejects more requests until it recovers after a period of time. This prevents the cascading blocking caused by very slow calls.

### 4. Comparison of the real-time metrics implementation

Both Hystrix and Sentinel implement real-time metrics statistics on sliding windows. Before version 1.5, Hystrix implemented the sliding window with a ring array and updated the statistics of each bucket with locks combined with CAS operations. Starting with version 1.5, Hystrix refactored its real-time metrics implementation, abstracting the metrics data structure into a reactive stream so that consumers can use the metrics conveniently. The underlying layer was also rebuilt on an RxJava-based event-driven model: events are published when a service call succeeds, fails or times out, and after a series of transformations and aggregations a real-time metrics stream is obtained, which the circuit breaker or the Dashboard can consume.

Sentinel currently abstracts a Metric statistics interface, which can have different implementations underneath. The default implementation is a sliding window based on LeapArray, and implementations such as reactive streams may be introduced later as needed.

## Sentinel features

In addition to the features the two have in common, Sentinel provides the following distinctive features:

### 1. Lightweight and high-performance

As a full-featured high availability traffic control component, Sentinel's core, sentinel-core, has no unnecessary dependencies and is under 200KB once packaged, which is very lightweight. Developers can adopt sentinel-core without worrying about dependency problems. Sentinel also provides many extension points, so users can easily extend it as needed and plug the extensions into Sentinel seamlessly.

The performance cost of introducing Sentinel is very small. A noticeable impact (roughly 5% - 10%) appears only when a business exceeds 250,000 QPS on a single node; when single-node QPS is not that high, the cost is almost negligible.

### 2. Traffic control

Sentinel can control resource calls based on different call relationships and different runtime metrics (such as QPS, number of concurrent calls, and system load), shaping random requests into a suitable form.

Sentinel supports diversified traffic shaping strategies and can automatically shape traffic into a suitable form when QPS is too high. The common ones are:

-   **Direct rejection mode**: requests beyond the limit are rejected immediately.
-   **Slow-start warm-up mode**: when traffic surges, the rate at which traffic passes is controlled so that it increases slowly and gradually reaches the threshold upper limit within a certain time. This gives a cold system time to warm up and keeps it from being overwhelmed.
    ![Slow-Start-Preheating-Mode](asset:high-availability/sentinel-vs-hystrix/Slow-Start-Preheating-Mode.jpg)

-   **Homogenizer mode**: a constant-rate mode implemented with the Leaky Bucket algorithm, which strictly controls the interval at which requests pass; queued requests wait in line, and requests that exceed the timeout are rejected directly. Sentinel also supports rate limiting based on call relationships, including rate limiting by caller, by call chain entry, and by associated traffic. Relying on Sentinel's powerful call chain statistics, it can provide precise rate limiting along different dimensions.
    ![Homogenizer-mode](diagram:high-availability/sentinel-vs-hystrix/homogenizer-mode)

Sentinel's support for asynchronous call chains is currently not very good; later versions will focus on improving support for asynchronous calls.

### 3. System load protection

Sentinel provides protection at the level of the whole system, and its load protection algorithm draws on the ideas of TCP BBR. When system load is high, continuing to let requests in may cause the system to collapse and stop responding. In a cluster environment, load balancing at the network level forwards the traffic that this machine should have carried to other machines. If those machines are also near the edge, the added traffic will make this machine collapse too, and eventually the entire cluster becomes unavailable. To address this, Sentinel provides a corresponding protection mechanism that balances the system's inbound traffic against its load, ensuring the system handles as many requests as it can within its capacity.

![BRP](asset:high-availability/sentinel-vs-hystrix/BRP.jpg)

### 4. Real-time monitoring and console

Sentinel provides an HTTP API for obtaining real-time monitoring information, such as call chain statistics, cluster point information, and rule information. If users are using Spring Boot/Spring Cloud with Sentinel Spring Cloud Starter, they can also conveniently obtain some runtime information, such as dynamic rules, through the Actuator Endpoint it exposes. In the future Sentinel will also support a standardized metrics monitoring API, making it easy to integrate with various monitoring and visualization systems such as Prometheus and Grafana.

The Sentinel console (Dashboard) provides machine discovery, rule configuration, real-time monitoring, call chain viewing and other features, so users can conveniently view monitoring data and configure rules.

![Sentinel-Dashboard](asset:high-availability/sentinel-vs-hystrix/Sentinel-Dashboard.jpg)

### 5. Ecosystem

Sentinel has already been adapted to Servlet, Dubbo, Spring Boot/Spring Cloud, gRPC and more; users only need to add the relevant dependency and a little configuration to enjoy Sentinel's high availability traffic protection with ease. In the future Sentinel will be adapted to more common frameworks, and will provide cluster traffic protection for Service Mesh.

## Summary

| #                           | Sentinel                                                                      | Hystrix                                        |
| --------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| Isolation strategy          | Semaphore isolation                                                           | Thread pool isolation/semaphore isolation      |
| Circuit breaking and degradation strategy | Based on response time or failure ratio                         | Based on failure ratio                         |
| Real-time metrics implementation | Sliding window                                                           | Sliding window (based on RxJava)               |
| Rule configuration          | Supports multiple data sources                                                | Supports multiple data sources                 |
| Extensibility               | Multiple extension points                                                     | Plugin style                                   |
| Annotation-based support    | Supported                                                                     | Supported                                      |
| Rate limiting               | Based on QPS, supports rate limiting based on call relationships              | Not supported                                  |
| Traffic shaping             | Supports slow-start and homogenizer modes                                     | Not supported                                  |
| System load protection      | Supported                                                                     | Not supported                                  |
| Console                     | Works out of the box; configures rules, shows per-second monitoring, discovers machines, etc. | Incomplete                     |
| Adaptation to common frameworks | Servlet, Spring Cloud, Dubbo, gRPC                                        | Servlet, Spring Cloud Netflix                  |
