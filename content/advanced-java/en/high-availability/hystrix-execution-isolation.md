---
source:
  locale: zh
  slug: hystrix-execution-isolation
  hash: 'sha256:v1:528a5a92d133cac06cff126ca252f86aca4c21e8249efbd3cec86fa7e778b6a1'
status: machine
translatedAt: '2026-10-14'
---
# Fine-Grained Control of Hystrix Isolation Strategies

Hystrix implements resource isolation with two strategies:

-   Thread pool isolation
-   Semaphore isolation

Resource isolation can be controlled at a fairly fine granularity.

## execution.isolation.strategy

This specifies the resource isolation strategy of HystrixCommand.run(): `THREAD` or `SEMAPHORE`, one based on a thread pool and the other on a semaphore.

```java
// to use thread isolation
HystrixCommandProperties.Setter().withExecutionIsolationStrategy(ExecutionIsolationStrategy.THREAD)

// to use semaphore isolation
HystrixCommandProperties.Setter().withExecutionIsolationStrategy(ExecutionIsolationStrategy.SEMAPHORE)
```

With the thread pool mechanism, each command runs in its own thread, and rate limiting is controlled by the size of the thread pool. With the semaphore mechanism, the command runs in the calling thread (that is, a thread of Tomcat's thread pool), and rate limiting is controlled by the capacity of the semaphore.

How do you choose between the thread pool and the semaphore?

The **default strategy** is the thread pool.

The biggest benefit of the **thread pool** is that for network requests, if there is a timeout, the calling thread can avoid being blocked.

The semaphore is typically used in extremely high-concurrency scenarios where each service instance handles several hundred `QPS` per second. A thread pool normally does not have that many threads and may not withstand such concurrency; to withstand it, you might need a large amount of thread resources. So you use a semaphore for rate limiting protection instead. Semaphores are commonly used for services with purely in-memory business logic that involve no network requests at all.

## command key & command group

When using thread pool isolation, how do we partition the **dependency service**, the **dependency service API** and the **thread pool**?

Each command can be given its own name, the command key, and can also be given its own group, the command group.

```java
private static final Setter cachedSetter = Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ExampleGroup"))
                                                 .andCommandKey(HystrixCommandKey.Factory.asKey("HelloWorld"));

public CommandHelloWorld(String name) {
    super(cachedSetter);
    this.name = name;
}
```

The command group is a very important concept. By default, a thread pool is defined by the command group, and the command group is also used to aggregate monitoring and alerting information. Requests in the same command group go into the same thread pool.

## command thread pool

ThreadPoolKey represents a HystrixThreadPool, used for unified monitoring, statistics and caching. The default ThreadPoolKey is the name of the command group. Each command is bound to the ThreadPool corresponding to its ThreadPoolKey.

If you do not want to use the command group directly, you can also set the name of the ThreadPool manually.

```java
private static final Setter cachedSetter = Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ExampleGroup"))
                                                 .andCommandKey(HystrixCommandKey.Factory.asKey("HelloWorld"))
                                                 .andThreadPoolKey(HystrixThreadPoolKey.Factory.asKey("HelloWorldPool"));

public CommandHelloWorld(String name) {
    super(cachedSetter);
    this.name = name;
}
```

## command key & command group & command thread pool

The **command key** represents a class of command and, generally, a particular API of a downstream dependency service.

The **command group** represents a particular downstream dependency service. This is reasonable: a dependency service may expose several APIs, and each API is a command key. Logically, the command group aggregates statistics such as call counts, success counts, timeout counts and failure counts over a set of command keys, so you can see the overall access situation of a service. **Generally, it is recommended to allocate one thread pool per service; command keys belong to the same thread pool by default.**

For example, suppose there is a service A whose combined `QPS` across all APIs you estimate at around 100, and a service B calls service A. Service B is deployed with 10 instances, and on each instance a command group corresponds to downstream service A. Giving it a thread pool of about 10 is enough, so that service B's overall QPS to service A is about 100 per second.

However, if a command group corresponds to a service whose exposed APIs have very different traffic levels, with huge differences between them, you may want to include, inside the command group for that service, the command keys of several APIs and apply finer-grained resource isolation. **That is, you want different APIs of the same service to use different thread pools.**

```
command key -> command group

command key -> its own thread pool key
```

Logically, multiple command keys belong to one command group and are counted together in statistics. Each command key has its own thread pool, and each API has its own thread pool, for resource isolation and rate limiting.

Put plainly, if your command key should use its own thread pool, you can define its own thread pool key, and that is all.

## coreSize

This sets the size of the thread pool; the default is 10. In general, the default of 10 threads is enough.

```java
HystrixThreadPoolProperties.Setter().withCoreSize(int value);
```

## queueSizeRejectionThreshold

If all 10 threads in the thread pool are busy and no thread is free for other work, new requests first queue up in the backlog. If the queue is full, any further request is rejected directly, the degradation (fallback) logic is executed, and the call returns quickly.

![hystrix-thread-pool-queue](diagram:high-availability/hystrix-execution-isolation/hystrix-thread-pool-queue)

This controls the threshold at which requests are rejected once the queue is full. Because maxQueueSize does not allow hot modification, this parameter is provided so that the maximum queue size can be modified hot.

```java
HystrixThreadPoolProperties.Setter().withQueueSizeRejectionThreshold(int value);
```

## execution.isolation.semaphore.maxConcurrentRequests

This sets the maximum concurrency allowed when the SEMAPHORE isolation strategy is used; requests beyond this maximum are rejected directly.

Setting this concurrency is similar to setting the thread pool size, but with a semaphore the performance is much better, and the overhead of the Hystrix framework itself is much smaller.

The default is 10. Set it as small as possible, because if it is set too large and delays occur, the thread resources of tomcat itself may be filled up instantly.

```java
HystrixCommandProperties.Setter().withExecutionIsolationSemaphoreMaxConcurrentRequests(int value);
```
