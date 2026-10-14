---
source:
  locale: zh
  slug: hystrix-thread-pool-current-limiting
  hash: 'sha256:v1:5e79e0eef0346dc9ab2c8c1c90cee06d733c0e90e6795f6af4db4c562ce0ce64'
status: machine
translatedAt: '2026-10-14'
---
# Hystrix Thread Pool Isolation and API Rate Limiting in Depth

We have covered Hystrix's request cache, fallback graceful degradation and fast circuit breaking with the circuit breaker. In this lesson we look in detail at Hystrix thread pool isolation and API rate limiting.

![hystrix-process](diagram:high-availability/hystrix-thread-pool-current-limiting/hystrix-process)

Hystrix checks whether the thread pool or semaphore is full; requests beyond the capacity are rejected (Reject) directly and go to degradation, which achieves rate limiting.

Rate limiting restricts the volume of access to backend services. Limiting access to the resources of MySQL, Redis, Zookeeper and other backend middleware is really about preventing excessive traffic from killing the backend services outright.

## Design of the thread pool isolation technique

Hystrix uses the bulkhead isolation technique (Bulkhead Partition) to isolate the resources of external dependencies, so that a failure of any external dependency cannot make this service collapse.

**Bulkhead isolation** means dividing the interior of a ship's hull into several compartments. If some compartments are damaged and take on water, the water does not flow between them, so a damaged ship still retains enough buoyancy and stability, reducing the danger of sinking immediately.

![bulkhead-partition](asset:high-availability/hystrix-thread-pool-current-limiting/bulkhead-partition.jpg)

Hystrix uses a separate thread pool for each external dependency. That way, if calls to an external dependency are severely delayed, the worst that happens is that the dependency's own thread pool is exhausted; calls to other dependencies are not affected.

## Scenarios where Hystrix applies the thread pool mechanism

-   Each service calls dozens of backend dependency services, which are usually developed by many different teams.
-   Each backend dependency service provides its own client call library; for example, with thrift it provides the corresponding thrift dependency.
-   The client call library can change at any time.
-   The client call library may add new network request logic at any time.
-   The client call library may contain logic such as automatic retries, data parsing and in-memory caching.
-   The client call library is generally a black box to the caller, including implementation details, network access and default configuration.
-   In a real production environment, callers often suddenly and surprisingly discover that the client call library has changed in some way.
-   Even if the client call library has not changed, the logic of the dependency service itself may change.
-   Some client call libraries may pull in other dependency libraries, which may be misconfigured.
-   Most network requests are synchronous calls.
-   Call failures and delays may also occur in the code of the client call library itself, not necessarily in the network request.

Put simply, you must assume by default that the client call library is unreliable and may change in all sorts of ways at any time, so you use forced isolation to make sure that the failure of any service does not affect the current service.

## Advantages of the thread pool mechanism

-   Any dependency service can be isolated in its own thread pool; even if its thread pool resources fill up, no other service call is affected.
-   A new dependency service can be introduced at any time, because even if the new dependency service has problems, no other service call is affected.
-   When a failed dependency service becomes healthy again, calls to it can be restored instantly by cleaning up the thread pool, whereas recovering when the tomcat thread pool has been filled up is much more troublesome.
-   If a client call library is misconfigured, the health of the thread pool is reported at all times, such as the counts of successes, failures, rejections and timeouts, and the call configuration of the dependency service can then be hot modified in near real-time without a shutdown.
-   Because thread pools are asynchronous in nature, a layer of asynchronous calls can be built on top of synchronous calls.

Put simply, the biggest benefit is resource isolation, ensuring that the failure of any dependency service does not drag down the current service.

## Disadvantages of the thread pool mechanism

-   The biggest disadvantage of the thread pool mechanism is the added CPU overhead.<br>
    Besides tomcat's own calling threads, there are the thread pools managed by Hystrix itself.

-   The execution of every command relies on a separate thread, with queuing, scheduling and context switching.
-   The Hystrix team measured the extra overhead of multi-threaded asynchrony by comparing multi-threaded asynchronous calls plus synchronous calls: the Netflix API executes 1 billion calls through Hystrix every day, with more than 40 thread pools per service instance and about 10 threads per thread pool. They found that the extra overhead of using Hystrix adds about 3ms of delay to a request, at most within 10ms, which is acceptable compared with the improvement in availability and stability.

We can use the Hystrix semaphore technique to limit the concurrent access volume to a dependency service, rather than limiting traffic by the size of the thread pool/queue.

The semaphore technique can be used for rate limiting and peak shaving, but it cannot be used to apply timeouts and isolation to services with call delays.

When `execution.isolation.strategy` is set to `SEMAPHORE`, Hystrix uses the semaphore mechanism instead of the thread pool mechanism to rate limit access to the dependency service. If the underlying network call is severely delayed while calling through the semaphore, it cannot time out and can only block indefinitely. Once the number of requests exceeds the number the semaphore allows, rate limiting kicks in immediately.

## API rate limiting demo

Suppose the thread pool size is 8 and the waiting queue size is 10. We set a longer timeout, 20s.

Inside the command, we hard-code a sleep, say 3s.

-   withCoreSize: sets the thread pool size.
-   withMaxQueueSize: sets the waiting queue size.
-   withQueueSizeRejectionThreshold: used together with withMaxQueueSize; the effective size of the waiting queue is the smaller of the two parameters.

If only the thread pool size is set and the other two queue-related parameters are not, the waiting queue is disabled.

```java
public class GetProductInfoCommand extends HystrixCommand<ProductInfo> {

    private Long productId;

    private static final HystrixCommandKey KEY = HystrixCommandKey.Factory.asKey("GetProductInfoCommand");

    public GetProductInfoCommand(Long productId) {
        super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ProductInfoService"))
                .andCommandKey(KEY)
                // Thread pool related configuration
                .andThreadPoolPropertiesDefaults(HystrixThreadPoolProperties.Setter()
                        // Set the thread pool size to 8
                        .withCoreSize(8)
                        // Set the waiting queue size to 10
                        .withMaxQueueSize(10)
                        .withQueueSizeRejectionThreshold(12))
                .andCommandPropertiesDefaults(HystrixCommandProperties.Setter()
                        .withCircuitBreakerEnabled(true)
                        .withCircuitBreakerRequestVolumeThreshold(20)
                        .withCircuitBreakerErrorThresholdPercentage(40)
                        .withCircuitBreakerSleepWindowInMilliseconds(3000)
                        // Set the timeout
                        .withExecutionTimeoutInMilliseconds(20000)
                        // Set the maximum concurrent requests of fallback
                        .withFallbackIsolationSemaphoreMaxConcurrentRequests(30)));
        this.productId = productId;
    }

    @Override
    protected ProductInfo run() throws Exception {
        System.out.println("调用接口查询商品数据，productId=" + productId);

        if (productId == -1L) {
            throw new Exception();
        }

        // A request that arrives will hang here for 3 seconds
        if (productId == -2L) {
            TimeUtils.sleep(3);
        }

        String url = "http://localhost:8081/getProductInfo?productId=" + productId;
        String response = HttpClientUtils.sendGetRequest(url);
        System.out.println(response);
        return JSONObject.parseObject(response, ProductInfo.class);
    }

    @Override
    protected ProductInfo getFallback() {
        ProductInfo productInfo = new ProductInfo();
        productInfo.setName("降级商品");
        return productInfo;
    }
}
```

We simulate 25 requests. The first 8 requests hang for 3s when calling the API, so the following 10 requests first enter the waiting queue to wait for the earlier requests to finish. The last 7 requests that arrive are rejected directly and invoke the fallback degradation logic.

```java
@SpringBootTest
@RunWith(SpringRunner.class)
public class RejectTest {

    @Test
    public void testReject() {
        for (int i = 0; i < 25; ++i) {
            new Thread(() -> HttpClientUtils.sendGetRequest("http://localhost:8080/getProductInfo?productId=-2")).start();
        }
        // Prevent the main thread from finishing execution early
        TimeUtils.sleep(50);
    }
}
```

From the execution result we can clearly see that 7 degraded products were printed in total. This is the result of the number of requests exceeding the thread pool plus queue capacity and being rejected directly.

```c
ProductInfo(id=null, name=降级商品, price=null, pictureList=null, specification=null, service=null, color=null, size=null, shopId=null, modifiedTime=null, cityId=null, cityName=null, brandId=null, brandName=null)
ProductInfo(id=null, name=降级商品, price=null, pictureList=null, specification=null, service=null, color=null, size=null, shopId=null, modifiedTime=null, cityId=null, cityName=null, brandId=null, brandName=null)
ProductInfo(id=null, name=降级商品, price=null, pictureList=null, specification=null, service=null, color=null, size=null, shopId=null, modifiedTime=null, cityId=null, cityName=null, brandId=null, brandName=null)
ProductInfo(id=null, name=降级商品, price=null, pictureList=null, specification=null, service=null, color=null, size=null, shopId=null, modifiedTime=null, cityId=null, cityName=null, brandId=null, brandName=null)
ProductInfo(id=null, name=降级商品, price=null, pictureList=null, specification=null, service=null, color=null, size=null, shopId=null, modifiedTime=null, cityId=null, cityName=null, brandId=null, brandName=null)
ProductInfo(id=null, name=降级商品, price=null, pictureList=null, specification=null, service=null, color=null, size=null, shopId=null, modifiedTime=null, cityId=null, cityName=null, brandId=null, brandName=null)
调用接口查询商品数据，productId=-2
调用接口查询商品数据，productId=-2
调用接口查询商品数据，productId=-2
调用接口查询商品数据，productId=-2
调用接口查询商品数据，productId=-2
调用接口查询商品数据，productId=-2
调用接口查询商品数据，productId=-2
调用接口查询商品数据，productId=-2
ProductInfo(id=null, name=降级商品, price=null, pictureList=null, specification=null, service=null, color=null, size=null, shopId=null, modifiedTime=null, cityId=null, cityName=null, brandId=null, brandName=null)
{"id": -2, "name": "iphone7手机", "price": 5599, "pictureList":"a.jpg,b.jpg", "specification": "iphone7的规格", "service": "iphone7的售后服务", "color": "红色,白色,黑色", "size": "5.5", "shopId": 1, "modifiedTime": "2017-01-01 12:00:00", "cityId": 1, "brandId": 1}
// The rest are normal product information, not shown here
// ...
```
