---
source:
  locale: zh
  slug: hystrix-timeout
  hash: 'sha256:v1:ae5a073ced6a1a3ca15d7b6d7b2e6c38eb1852e7a7ac8624df31e22d81f7456d'
status: machine
translatedAt: '2026-10-14'
---
# Protecting Service API Calls from Timeouts with the Timeout Mechanism

In general, a very common problem when calling the API of a dependency service is the **timeout**. In a complex distributed system, timeouts make the system unstable or cause it to jitter. When large numbers of timeouts occur, thread resources hang, throughput drops sharply, and the service may even collapse.

You call all kinds of dependency services, especially in a large company, where you may not even know the people who developed a service, have no idea how skilled they are, and know nothing about them at all.

Peter Steiner said, "[On the Internet, nobody knows you're a dog](https://en.wikipedia.org/wiki/On_the_Internet,_nobody_knows_you%27re_a_dog)", which means that on the other end of the Internet you do not even know whether a dog is sitting there.

![220px-Internet_dog.jpg](asset:high-availability/hystrix-timeout/220px-Internet_dog.jpg)

In a very complex distributed system, especially in a large company with many teams and large-scale collaboration, you may not even know whose service it is, and it is quite possible that the guy who developed the service is an intern. The performance of a dependency service's API may be very unstable: sometimes 2ms, sometimes 200ms, even 2s.

If you do not apply timeout control to calls to the various dependency service APIs to give your service a safety protection, your service may well be dragged down by the poor performance of all kinds of junk dependency services. Many API calls become very slow and many threads get stuck. If you have done resource isolation, then only the threads of the thread pool get stuck, but in fact we can apply timeout control, so there is no need to let them all get stuck.

## TimeoutMilliseconds

In Hystrix we can set the timeout manually. If a command runs longer than the configured duration, it is considered timed out, the Hystrix command is marked as timed out, and the fallback degradation logic is executed at the same time.

The default value of `TimeoutMilliseconds` is 1000, that is, 1000ms.

```java
HystrixCommandProperties.Setter()
    ..withExecutionTimeoutInMilliseconds(int)
```

## TimeoutEnabled

This parameter controls whether the timeout mechanism is enabled; the default is true.

```java
HystrixCommandProperties.Setter()
    .withExecutionTimeoutEnabled(boolean)
```

## Demo

In the command we set the timeout to 500ms, and in the run() method we set a sleep of 1s. When a request arrives it sleeps for 1s directly, so the degradation logic is executed because of the timeout.

```java
public class GetProductInfoCommand extends HystrixCommand<ProductInfo> {

    private Long productId;

    private static final HystrixCommandKey KEY = HystrixCommandKey.Factory.asKey("GetProductInfoCommand");

    public GetProductInfoCommand(Long productId) {
        super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ProductInfoService"))
                .andCommandKey(KEY)
                .andThreadPoolPropertiesDefaults(HystrixThreadPoolProperties.Setter()
                        .withCoreSize(8)
                        .withMaxQueueSize(10)
                        .withQueueSizeRejectionThreshold(8))
                .andCommandPropertiesDefaults(HystrixCommandProperties.Setter()
                        .withCircuitBreakerEnabled(true)
                        .withCircuitBreakerRequestVolumeThreshold(20)
                        .withCircuitBreakerErrorThresholdPercentage(40)
                        .withCircuitBreakerSleepWindowInMilliseconds(3000)
                        // Set whether the timeout is enabled, default is true
                        .withExecutionTimeoutEnabled(true)
                        // Set the timeout, default 1000(ms)
                        .withExecutionTimeoutInMilliseconds(500)
                        .withFallbackIsolationSemaphoreMaxConcurrentRequests(30)));
        this.productId = productId;
    }

    @Override
    protected ProductInfo run() throws Exception {
        System.out.println("调用接口查询商品数据，productId=" + productId);

        // Sleep for 1s
        TimeUtils.sleep(1);

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

In the test class, we issue the request directly.

```java
@SpringBootTest
@RunWith(SpringRunner.class)
public class TimeoutTest {

    @Test
    public void testTimeout() {
        HttpClientUtils.sendGetRequest("http://localhost:8080/getProductInfo?productId=1");
    }
}
```

In the result we can see that the information of the degraded product is printed.

```c
ProductInfo(id=null, name=降级商品, price=null, pictureList=null, specification=null, service=null, color=null, size=null, shopId=null, modifiedTime=null, cityId=null, cityName=null, brandId=null, brandName=null)
{"id": 1, "name": "iphone7手机", "price": 5599, "pictureList":"a.jpg,b.jpg", "specification": "iphone7的规格", "service": "iphone7的售后服务", "color": "红色,白色,黑色", "size": "5.5", "shopId": 1, "modifiedTime": "2017-01-01 12:00:00", "cityId": 1, "brandId": 1}
```
