---
source:
  locale: zh
  slug: hystrix-fallback
  hash: 'sha256:v1:e96a2e731f3ab40405ccb10507abbee0255e6e1df342cde21e7d05cae220ae3d'
status: machine
translatedAt: '2026-10-14'
---
# Fallback Degradation Mechanism Based on Local Cache

Hystrix invokes the degradation (fallback) mechanism in the following four situations:

-   The circuit breaker is open.
-   The resource pool is full (thread pool + queue / semaphore).
-   Hystrix calls various APIs or accesses external dependencies such as MySQL, Redis, Zookeeper and Kafka, and any exception occurs.
-   Access to an external dependency takes too long and a TimeoutException is raised.

## The two classic degradation mechanisms

-   Pure in-memory data<br>
    In the degradation logic you can maintain an ehcache in memory as a pure in-memory cache that is cleaned up automatically by LRU, and keep the data in it. If the external dependency fails, the degradation logic simply tries to get the data from the ehcache.

-   Default value<br>
    The degradation logic can also simply return a default value.

In `HystrixCommand`, the degradation logic is written by implementing the getFallback() method; in `HystrixObservableCommand`, you implement the resumeWithFallback() method instead.

Now let us use a simple example to demonstrate how degradation is done.

Take this **scenario**. We have product data that includes a brandId. Suppose the normal logic is: take a product record and, according to its brandId, call the brand service API to get the latest brand name, brandName.

If the brand service API goes down, we can try to get a slightly stale copy of the data from local memory and make do with it for now.

## Step 1: Get the data from the local cache

The code for getting a brand name locally looks roughly like this.

```java
/**
 * Local cache of brand names
 *
 */
public class BrandCache {

    private static Map<Long, String> brandMap = new HashMap<>();

    static {
        brandMap.put(1L, "Nike");
    }

    /**
     * Get brandName by brandId
     *
     * @param brandId brand id
     * @return brand name
     */
    public static String getBrandName(Long brandId) {
        return brandMap.get(brandId);
    }
```

## Step 2: Implement GetBrandNameCommand

In GetBrandNameCommand, the normal logic of the run() method is to call the brand service API to get the brand name. If the call fails with an error, the degradation mechanism is invoked.

Here we directly **simulate an API call error** by throwing an exception.

The getFallback() method holds our **degradation logic**: we simply **get the brand name** data from the local cache.

```java
/**
 * Command for getting a brand name
 *
 */
public class GetBrandNameCommand extends HystrixCommand<String> {

    private Long brandId;

    public GetBrandNameCommand(Long brandId) {
        super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("BrandService"))
                .andCommandKey(HystrixCommandKey.Factory.asKey("GetBrandNameCommand"))
                .andCommandPropertiesDefaults(HystrixCommandProperties.Setter()
                        // Set the maximum number of concurrent requests of the degradation mechanism
                        .withFallbackIsolationSemaphoreMaxConcurrentRequests(15)));
        this.brandId = brandId;
    }

    @Override
    protected String run() throws Exception {
        // The normal logic here should call a brand service API to get the name
        // If the call fails with an error, the fallback degradation mechanism is invoked

        // Here we simulate a call error and throw an exception directly
        throw new Exception();
    }

    @Override
    protected String getFallback() {
        return BrandCache.getBrandName(brandId);
    }
}
```

`FallbackIsolationSemaphoreMaxConcurrentRequests` sets the maximum number of concurrent requests the degradation logic allows. The default is 10, and rate limiting is done through the semaphore mechanism. Requests beyond this maximum are rejected directly.

## Step 3: CacheController calls the API

In CacheController, we get the brandId from productInfo, then create and execute a GetBrandNameCommand to try to get the brandName. The execution fails here because we throw an exception directly in run(), so Hystrix calls getFallback() and follows the degradation logic.

```java
@Controller
public class CacheController {

    @RequestMapping("/getProductInfo")
    @ResponseBody
    public String getProductInfo(Long productId) {
        HystrixCommand<ProductInfo> getProductInfoCommand = new GetProductInfoCommand(productId);

        ProductInfo productInfo = getProductInfoCommand.execute();
        Long brandId = productInfo.getBrandId();

        HystrixCommand<String> getBrandNameCommand = new GetBrandNameCommand(brandId);

        // Execution throws an exception and then goes to degradation
        String brandName = getBrandNameCommand.execute();
        productInfo.setBrandName(brandName);

        System.out.println(productInfo);
        return "success";
    }
}
```

That essentially concludes the demonstration of degradation logic.
