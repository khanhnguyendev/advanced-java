---
source:
  locale: zh
  slug: how-to-limit-current
  hash: 'sha256:v1:248cfa55693a1cda4dbbd5c7bf7fdd94b86a92e32e7147a92b47ad7fc78805ad'
status: machine
translatedAt: '2026-10-14'
---
# How to Implement Rate Limiting? How Did You Do It at Work? Describe the Implementation

## What is rate limiting

> Rate limiting can be seen as a kind of service degradation (fallback). Rate limiting restricts the input and output traffic of a system in order to protect it. In general, the throughput of a system can be measured. To keep the system running stably, once a threshold that needs to be limited is reached, traffic must be restricted and some measures taken to achieve that purpose, for example delayed processing, rejected processing, or partially rejected processing.

## Rate limiting methods

### Counter

#### Implementation

Control the number of requests per unit of time.

```java

import java.util.concurrent.atomic.AtomicInteger;

public class Counter {
    /**
     * Maximum number of accesses
     */
    private final int limit = 10;
    /**
     * Access time difference
     */
    private final long timeout = 1000;
    /**
     * Request time
     */
    private long time;
    /**
     * Current counter
     */
    private AtomicInteger reqCount = new AtomicInteger(0);

    public boolean limit() {
        long now = System.currentTimeMillis();
        if (now < time + timeout) {
            // Within the unit of time
            reqCount.addAndGet(1);
            return reqCount.get() <= limit;
        } else {
            // Beyond the unit of time
            time = now;
            reqCount = new AtomicInteger(0);
            return true;
        }
    }
}

```

Drawback:

Suppose one request is made at 00:01, no requests are sent between 00:01 and 00:58, all the remaining requests `n-1` (n is the rate limit) are sent at 00:59, and n requests are sent at 00:01 of the next minute. Then `2n - 1` requests arrive within 2 seconds.

Suppose the limit is 60 requests per minute, so 1 request can be handled per second. A user sends 60 requests at 00:59 and 60 requests at 01:00. Now there are 120 requests in 2 seconds (60 requests per second), far above the per-second processing threshold.

### Sliding window

#### Implementation

The sliding window is an improvement on the counter. It adds a finer time granularity: one minute is divided into several equal parts (6 parts of 10 seconds each), and each part has its own counter. A request between 00:00 and 00:09 increments that counter by 1. The more parts there are, the more detailed the rate limiting statistics.

```java
package com.example.demo1.service;

import java.util.Iterator;
import java.util.Random;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.stream.IntStream;

public class TimeWindow {
    private ConcurrentLinkedQueue<Long> queue = new ConcurrentLinkedQueue<Long>();

    /**
     * Interval in seconds
     */
    private int seconds;

    /**
     * Maximum rate limit
     */
    private int max;

    public TimeWindow(int max， int seconds) {
        this.seconds = seconds;
        this.max = max;

        /**
         * A perpetual thread that runs the task cleaning the queue
         */
        new Thread(() -> {
            while (true) {
                try {
                    // Wait (interval seconds - 1) before running the cleanup
                    Thread.sleep((seconds - 1) * 1000L);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
                clean();
            }
        }).start();

    }

    public static void main(String[] args) throws Exception {

        final TimeWindow timeWindow = new TimeWindow(10， 1);

        // Test with 3 threads
        IntStream.range(0， 3).forEach((i) -> {
            new Thread(() -> {

                while (true) {

                    try {
                        Thread.sleep(new Random().nextInt(20) * 100);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                    timeWindow.take();
                }

            }).start();

        });

    }

    /**
     * Take a token and record the time
     */
    public void take() {

        long start = System.currentTimeMillis();
        try {

            int size = sizeOfValid();
            if (size > max) {
                System.err.println("超限");

            }
            synchronized (queue) {
                if (sizeOfValid() > max) {
                    System.err.println("超限");
                    System.err.println("queue中有 " + queue.size() + " 最大数量 " + max);
                }
                this.queue.offer(System.currentTimeMillis());
            }
            System.out.println("queue中有 " + queue.size() + " 最大数量 " + max);

        }

    }

    public int sizeOfValid() {
        Iterator<Long> it = queue.iterator();
        Long ms = System.currentTimeMillis() - seconds * 1000;
        int count = 0;
        while (it.hasNext()) {
            long t = it.next();
            if (t > ms) {
                // Within the current statistics window
                count++;
            }
        }

        return count;
    }

    /**
     * Clean up expired timestamps
     */
    public void clean() {
        Long c = System.currentTimeMillis() - seconds * 1000;

        Long tl = null;
        while ((tl = queue.peek()) != null && tl < c) {
            System.out.println("清理数据");
            queue.poll();
        }
    }

}

```

### Leaky bucket

#### Implementation

Define a bucket of fixed capacity, with water flowing in and water flowing out. We cannot estimate the amount or speed of the water flowing in, but we can control the speed of the water flowing out.

```java
public class LeakBucket {
    /**
     * Time
     */
    private long time;
    /**
     * Total capacity
     */
    private Double total;
    /**
     * Rate at which water flows out
     */
    private Double rate;
    /**
     * Current amount
     */
    private Double nowSize;

    public boolean limit() {
        long now = System.currentTimeMillis();
        nowSize = Math.max(0， (nowSize - (now - time) * rate));
        time = now;
        if ((nowSize + 1) < total) {
            nowSize++;
            return true;
        } else {
            return false;
        }

    }
}
```

### Token bucket

#### Implementation

Define a bucket of fixed capacity. Tokens are added to the bucket at a fixed rate, and once the bucket is full no more tokens are put in. Each incoming request removes a token from the bucket; if there is no token in the bucket, the request cannot proceed.

```java
public class TokenBucket {
    /**
     * Time
     */
    private long time;
    /**
     * Total capacity
     */
    private Double total;
    /**
     * Rate at which tokens are put in
     */
    private Double rate;
    /**
     * Current amount
     */
    private Double nowSize;

    public boolean limit() {
        long now = System.currentTimeMillis();
        nowSize = Math.min(total， nowSize + (now - time) * rate);
        time = now;
        if (nowSize < 1) {
            // No token in the bucket
            return false;
        } else {
            // A token exists
            nowSize -= 1;
            return true;
        }
    }

}
```

## Usage at work

### spring cloud gateway

-   spring cloud gateway uses redis for rate limiting by default. I generally just tweak the parameters and use it out of the box, without implementing the algorithms above from scratch.

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis-reactive</artifactId>
</dependency>
```

```yaml
spring:
    cloud:
        gateway:
            routes:
                - id: requestratelimiter_route

                  uri: lb://pigx-upms
                  order: 10000
                  predicates:
                      - Path=/admin/**

                  filters:
                      - name: RequestRateLimiter

                        args:
                            redis-rate-limiter.replenishRate: 1 # Capacity of the token bucket
                            redis-rate-limiter.burstCapacity: 3 # Flow rate per second
                            key-resolver: '#{@remoteAddrKeyResolver}' #SpEL expression that resolves the corresponding bean

                      - StripPrefix=1
```

```java
@Bean
KeyResolver remoteAddrKeyResolver() {
    return exchange -> Mono.just(exchange.getRequest().getRemoteAddress().getHostName());
}
```

### sentinel

-   Control the traffic of each url through configuration

```xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
</dependency>
```

```yaml
spring:
    cloud:
        nacos:
            discovery:
                server-addr: localhost:8848
        sentinel:
            transport:
                dashboard: localhost:8080
                port: 8720
            datasource:
                ds:
                    nacos:
                        server-addr: localhost:8848
                        dataId: spring-cloud-sentinel-nacos
                        groupId: DEFAULT_GROUP
                        rule-type: flow
                        namespace: xxxxxxxx
```

-   The configuration content is edited on nacos

```json
[
    {
        "resource": "/hello",
        "limitApp": "default",
        "grade": 1,
        "count": 1,
        "strategy": 0,
        "controlBehavior": 0,
        "clusterMode": false
    }
]
```

-   resource: the resource name, that is, the target the rate limiting rule applies to.
-   limitApp: the call source the flow control applies to; if it is default, call sources are not distinguished.
-   grade: the rate limiting threshold type, QPS or thread count mode; 0 limits by concurrency count and 1 controls traffic by QPS.
-   count: the rate limiting threshold
-   strategy: whether the decision is based on the resource itself, on other related resources (refResource), or on the call chain entry
-   controlBehavior: the flow control effect (reject directly / queue and wait / slow start mode)
-   clusterMode: whether it is cluster mode

### Summary

> sentinel and spring cloud gateway are both good rate limiting frameworks. However, in my own usage I have not yet integrated [spring-cloud-alibaba](https://github.com/alibaba/spring-cloud-alibaba) into the project, so I would choose **spring cloud gateway**. When you have fully integrated it, or when a project already uses Nacos, using setinel gives a better experience.
