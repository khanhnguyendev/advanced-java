---
source:
  locale: zh
  slug: hystrix-semphore-isolation
  hash: 'sha256:v1:97c7d7ffc9706a518ad43c5009eb6d3994a9edf1c3868a4a471ad6bc8ccf4199'
status: machine
translatedAt: '2026-10-14'
---
# Resource Isolation with the Hystrix Semaphore Mechanism

A core feature of Hystrix is so-called **resource isolation**. The most fundamental problem it solves is isolating calls to multiple dependency services into their own separate resource pools. This prevents a situation where, because calls to one dependency service are slow or failing, all the thread resources of the service are consumed by calls to that one service's API. Once all of a service's thread resources are exhausted, the service may collapse, and the failure may even keep spreading.

Hystrix implements resource isolation mainly with two techniques:

-   Thread pool
-   Semaphore

By default, Hystrix uses the thread pool mode.

The thread pool technique has been covered earlier. This section covers resource isolation with the semaphore mechanism, along with the differences between the two techniques and their concrete use cases.

## The semaphore mechanism

Semaphore-based resource isolation merely acts as a switch. For example, if the semaphore size of service A is 10, it allows only 10 tomcat threads to access service A at the same time, and all other requests are rejected, which achieves resource isolation and rate limiting protection.

![hystrix-semphore](diagram:high-availability/hystrix-semphore-isolation/hystrix-semphore)

## Differences between thread pool and semaphore

Thread pool isolation does not control the threads of a web container such as tomcat. In a stricter sense, Hystrix thread pool isolation controls the execution of tomcat threads. Once the Hystrix thread pool is full, it ensures that tomcat threads will not hang because of slow or failing dependency service API calls; the other tomcat threads will not get stuck and can return quickly to support other work.

With thread pool isolation, Hystrix's own threads execute the call; with semaphore isolation, the tomcat thread calls the dependency service directly. Semaphore isolation is just a checkpoint: as many tomcat threads as there are semaphore permits are allowed through it to execute.

![hystrix-semphore-thread-pool](diagram:high-availability/hystrix-semphore-isolation/hystrix-semphore-thread-pool)

**Use cases**:

-   **Thread pool technique** suits the vast majority of scenarios, for example when we make network requests to a dependency service and need to control the call timeout (catching timeout exceptions).
-   **Semaphore technique** suits the case where your access is not to an external dependency but to some fairly complex internal business logic, and the code inside the system involves no network requests at all. In that case plain semaphore rate limiting is enough, because there is no need to catch timeout-like problems.

## A simple semaphore demo

In a business setting, which scenario is a good fit for semaphores?

For example, a cache service may keep some data that is very small in volume but accessed very frequently in its own pure memory.

Take an example. Once we have fetched product data, we usually also need to fetch the product's geographic location, province, city, seller and so on, which may live in the service's own pure memory, for instance in a single Map. For logic that accesses local memory directly like this, a semaphore is a good fit for simple isolation.

The advantage is that you do not manage a thread pool, you do not care about timeouts, and there is no thread context switching. With semaphore isolation, performance is relatively higher.

Suppose this is a local cache from which we can get cityName by cityId.

```java
public class LocationCache {
    private static Map<Long, String> cityMap = new HashMap<>();

    static {
        cityMap.put(1L, "北京");
    }

    /**
     * Get cityName by cityId
     *
     * @param cityId city id
     * @return city name
     */
    public static String getCityName(Long cityId) {
        return cityMap.get(cityId);
    }
}
```

Write a GetCityNameCommand with the strategy set to **semaphore**. The run() method reads the local cache. Our goal is to apply resource isolation to the code that reads the local cache.

```java
public class GetCityNameCommand extends HystrixCommand<String> {

    private Long cityId;

    public GetCityNameCommand(Long cityId) {
        // Set the semaphore isolation strategy
        super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("GetCityNameGroup"))
                .andCommandPropertiesDefaults(HystrixCommandProperties.Setter()
                        .withExecutionIsolationStrategy(HystrixCommandProperties.ExecutionIsolationStrategy.SEMAPHORE)));

        this.cityId = cityId;
    }

    @Override
    protected String run() {
        // The code that needs semaphore isolation
        return LocationCache.getCityName(cityId);
    }
}
```

At the API layer, create a GetCityNameCommand, pass in the cityId and call execute(); the code that reads the local cityName cache is then resource-isolated by the semaphore.

```java
@RequestMapping("/getProductInfo")
@ResponseBody
public String getProductInfo(Long productId) {
    HystrixCommand<ProductInfo> getProductInfoCommand = new GetProductInfoCommand(productId);

    // Execute through the command to get the latest product data
    ProductInfo productInfo = getProductInfoCommand.execute();

    Long cityId = productInfo.getCityId();

    GetCityNameCommand getCityNameCommand = new GetCityNameCommand(cityId);
    // The code that reads local memory (cityName) is resource-isolated by the semaphore
    String cityName = getCityNameCommand.execute();

    productInfo.setCityName(cityName);

    System.out.println(productInfo);
    return "success";
}
```
