---
source:
  locale: zh
  slug: hystrix-circuit-breaker
  hash: 'sha256:v1:c51c29661f9b7fc6fc9f95724918c2a018ffde574aa25a973a703814bc8ab71f'
status: machine
translatedAt: '2026-10-14'
---
# Inside the Hystrix Circuit Breaker Execution Principles

### State machine

A Hystrix circuit breaker has three states: Closed, Open and Half-Open. The transitions between the three states are as follows:

![image-20191104211642271](asset:high-availability/hystrix-circuit-breaker/hystrix-circuit-breaker-state-machine.png)

1. `Closed` the circuit breaker is closed: calls to the downstream pass through normally
1. `Open` the circuit breaker is open: calls to the downstream service are blocked and go straight to the Fallback logic
1. `Half-Open` the circuit breaker is half-open: [SleepWindowInMilliseconds](#h5)

### [Enabled](https://github.com/Netflix/Hystrix/wiki/Configuration#circuitbreakerenabled)

```java
HystrixCommandProperties.Setter()
    .withCircuitBreakerEnabled(boolean)
```

This controls whether the circuit breaker works at all, including tracking the health of dependency service calls and whether it is allowed to trip when there are too many failures. The default is `true`.

### [circuitBreaker.requestVolumeThreshold](https://github.com/Netflix/Hystrix/wiki/Configuration#circuitbreakerrequestvolumethreshold)

```java
HystrixCommandProperties.Setter()
    .withCircuitBreakerRequestVolumeThreshold(int)
```

This is the minimum number of requests that must pass within one statistical **sliding time window (this parameter is also important and is discussed below)** before the circuit may trip; the default is 20. **Only when the traffic passing through the Hystrix circuit breaker exceeds a certain threshold can it possibly trip.** For example, if the traffic through the circuit breaker must reach 20 within 10s but only 19 requests actually pass through, then even if all 19 fail, no decision on whether to break the circuit is made.

### [circuitBreaker.errorThresholdPercentage](https://github.com/Netflix/Hystrix/wiki/Configuration#circuitBreaker.errorThresholdPercentage)

```java
HystrixCommandProperties.Setter()
    .withCircuitBreakerErrorThresholdPercentage(int)
```

This is the failure ratio that triggers circuit breaking; the default is 50(%).

#### [circuitBreaker.sleepWindowInMilliseconds](https://github.com/Netflix/Hystrix/wiki/Configuration#circuitbreakersleepwindowinmilliseconds)

```java
HystrixCommandProperties.Setter()
    .withCircuitBreakerSleepWindowInMilliseconds(int)
```

After the circuit breaker switches from Close to Open, all requests passing through it during the following `SleepWindowInMilliseconds` are cut off: the backend service is not called, and they go straight to the degradation (fallback) mechanism. The default is 5000(ms).

After this period, the circuit breaker becomes `Half-Open`, and lets one request through to see whether the call works. If the call succeeds, it recovers automatically and the circuit breaker switches to the Close state.

### [ForceOpen](https://github.com/Netflix/Hystrix/wiki/Configuration#circuitbreakerforceopen)

```java
HystrixCommandProperties.Setter()
    .withCircuitBreakerForceOpen(boolean)
```

If set to true, the circuit breaker is forced open, which amounts to manual circuit breaking and manual degradation. The default is `false`.

### [ForceClosed](https://github.com/Netflix/Hystrix/wiki/Configuration#circuitbreakerforceclosed)

```java
HystrixCommandProperties.Setter()
    .withCircuitBreakerForceClosed(boolean)
```

If set to true, the circuit breaker is forced closed, which amounts to manually stopping circuit breaking, a manual upgrade. The default is `false`.

### Metrics

Another important component works closely with the Hystrix circuit breaker: the **metrics collector (Metrics)**. The most important parameters of the collector are the sliding window ([metrics.rollingStats.timeInMilliseconds](https://github.com/Netflix/Hystrix/wiki/Configuration#metricsrollingstatstimeinmilliseconds)) and the buckets ([metrics.rollingStats.numBuckets](https://github.com/Netflix/Hystrix/wiki/Configuration#metricsrollingstatsnumbuckets)). Here we quote [a passage from a blog post](https://zhenbianshu.github.io/2018/09/hystrix_configuration_analysis.html) to explain the sliding window (the default is 10000 ms):

> A passenger sits in a window seat of a moving train. Along both sides of the road the train runs on is a row of tall poplar trees, and as the train moves forward, the roadside poplars slide quickly past the window. Let each tree represent a request and the movement of the train represent the passage of time; then the window of the train is a typical sliding window, and the poplars the passenger can see through it are the data Hystrix needs to count.

Hystrix does not collect statistics every time a request passes through; instead it divides the whole sliding window evenly into numBuckets parts and collects statistics once each time a part of time elapses. **Only after a full time window has passed does it decide whether the circuit breaker should open; see the example below.**

## Demo

### HystrixCommand configuration parameters

Configure the circuit-breaker-related parameters of the Setter in GetProductInfoCommand.

-   Within the sliding window, at least 20 requests are needed before the circuit may trip.
-   The circuit trips only when the failure ratio reaches 40%.
-   After tripping, all requests within 3000ms are rejected and go straight to the fallback degradation without calling run(). After 3000ms, the state becomes half-open.

In the run() method, we check whether productId is -1, and if so throw an exception directly. Written this way, we can later pass productId=-1 in tests to **simulate a service execution failure**.

In the degradation logic we simply return a degraded product.

```java
public class GetProductInfoCommand extends HystrixCommand<ProductInfo> {

    private Long productId;

    private static final HystrixCommandKey KEY = HystrixCommandKey.Factory.asKey("GetProductInfoCommand");

    public GetProductInfoCommand(Long productId) {
        super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ProductInfoService"))
                .andCommandKey(KEY)
                .andCommandPropertiesDefaults(HystrixCommandProperties.Setter()
                        // Whether the circuit breaker is allowed to work
                        .withCircuitBreakerEnabled(true)
                        // Minimum number of requests in the sliding window before the circuit may trip
                        .withCircuitBreakerRequestVolumeThreshold(20)
                        // Failure ratio that triggers circuit breaking, default 50%
                        .withCircuitBreakerErrorThresholdPercentage(40)
                        // For how long requests are rejected directly after tripping, after which it enters half-open; default 5000ms
                        .withCircuitBreakerSleepWindowInMilliseconds(3000)));
        this.productId = productId;
    }

    @Override
    protected ProductInfo run() throws Exception {
        System.out.println("调用接口查询商品数据，productId=" + productId);

        if (productId == -1L) {
            throw new Exception();
        }

        String url = "http://localhost:8081/getProductInfo?productId=" + productId;
        String response = HttpClientUtils.sendGetRequest(url);
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

### Circuit breaking test class

In the test class, the first 30 requests pass productId=-1, then it sleeps for 3s, and the following 70 requests pass productId=1.

```java
@SpringBootTest
@RunWith(SpringRunner.class)
public class CircuitBreakerTest {

    @Test
    public void testCircuitBreaker() {
        String baseURL = "http://localhost:8080/getProductInfo?productId=";

        for (int i = 0; i < 30; ++i) {
            // Passing -1 throws an exception, then goes to the degradation logic
            HttpClientUtils.sendGetRequest(baseURL + "-1");
        }

        TimeUtils.sleep(3);
        System.out.println("After sleeping...");

        for (int i = 31; i < 100; ++i) {
            // Passing 1 goes through a normal service call
            HttpClientUtils.sendGetRequest(baseURL + "1");
        }
    }
}
```

### Test results

From the test results we can clearly see the whole process of the system tripping and recovering.

```java
调用接口查询商品数据，productId=-1
ProductInfo(id=null, name=降级商品, price=null, pictureList=null, specification=null, service=null, color=null, size=null, shopId=null, modifiedTime=null, cityId=null, cityName=null, brandId=null, brandName=null)
// ...
// The result above is printed 20 times here


ProductInfo(id=null, name=降级商品, price=null, pictureList=null, specification=null, service=null, color=null, size=null, shopId=null, modifiedTime=null, cityId=null, cityName=null, brandId=null, brandName=null)
// ...
// The result above is printed 8 times here


// After sleeping for 3s
调用接口查询商品数据，productId=1
ProductInfo(id=1, name=iphone7手机, price=5599.0, pictureList=a.jpg,b.jpg, specification=iphone7的规格, service=iphone7的售后服务, color=红色,白色,黑色, size=5.5, shopId=1, modifiedTime=2017-01-01 12:00:00, cityId=1, cityName=null, brandId=1, brandName=null)
// ...
// The result above is printed 69 times here
```

For the first 30 requests we pass productId -1, so an exception is thrown during service execution. We configured that at least 20 requests must pass through the circuit breaker and the failure ratio must exceed 40% to trip it. So 21 API calls were executed, each throwing an exception and going to degradation; after those 21, the circuit breaker opened.

The following 9 requests do not execute the `run()` method, so the following message is not printed.

```c
调用接口查询商品数据，productId=-1
```

Instead they go straight to the degradation logic and execute getFallback().

After sleeping for 3s, all of the following 70 requests pass productId 1. Because we configured the circuit breaker to become `half-open` after 3000ms, Hystrix tries to execute a request, finds that it succeeds, and closes the circuit breaker; all later requests can then be called normally.

### References

1. [Hystrix issue 1459](https://github.com/Netflix/Hystrix/issues/1459)
1. [Hystrix Metrics](https://github.com/Netflix/Hystrix/wiki/Configuration#metrics)
