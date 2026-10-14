---
source:
  locale: zh
  slug: hystrix-thread-pool-isolation
  hash: 'sha256:v1:2af51689979c0c9d225595673a0152d3bea4b15a048bb88bf37b3f65e669c0fc'
status: machine
translatedAt: '2026-10-14'
---
# Resource Isolation with Hystrix Thread Pools

The [previous lesson](doc:advanced-java/high-availability/e-commerce-website-detail-page-architecture) mentioned that if all caches fail starting from Nginx, Nginx will call the product service directly through the cache service to fetch the latest product data (we discuss this based on an e-commerce project), and call delays may exhaust the resources of the cache service. Here we look at how to implement resource isolation with Hystrix thread pools.

Resource isolation means that all calls to a given dependency service are confined to a single resource pool and never use other resources. Even if the number of concurrent calls to this dependency service, say the product service, has reached 1000, if its thread pool is allocated only 10 threads, at most those 10 threads will be used to execute them. The latency of calls to the product service will not exhaust all thread resources inside Tomcat.

Hystrix implements resource isolation by providing an abstraction called Command. This is the most basic resource isolation technique in Hystrix.

## Fetching a single item with HystrixCommand

We wrap the call to the product service in a HystrixCommand and specify a key, such as `GetProductInfoCommandGroup` below. Here we can simply regard it as a thread pool: every call to the product service uses only the resources in that thread pool and no other threads.

```java
public class GetProductInfoCommand extends HystrixCommand<ProductInfo> {

    private Long productId;

    public GetProductInfoCommand(Long productId) {
        super(HystrixCommandGroupKey.Factory.asKey("GetProductInfoCommandGroup"));
        this.productId = productId;
    }

    @Override
    protected ProductInfo run() {
        String url = "http://localhost:8081/getProductInfo?productId=" + productId;
        // Call the product service API
        String response = HttpClientUtils.sendGetRequest(url);
        return JSONObject.parseObject(response, ProductInfo.class);
    }
}
```

In the cache service API, we create a Command from the productId and execute it to get the product data.

```java
@RequestMapping("/getProductInfo")
@ResponseBody
public String getProductInfo(Long productId) {
    HystrixCommand<ProductInfo> getProductInfoCommand = new GetProductInfoCommand(productId);

    // Execute through the command to get the latest product data
    ProductInfo productInfo = getProductInfoCommand.execute();
    System.out.println(productInfo);
    return "success";
}
```

The execute() method above is in fact synchronous. You can also call queue() on the command, which merely puts the command into a waiting queue of the thread pool and returns immediately with a Future object. You can then go on with other work and, after a while, call get() on the Future to obtain the data. This is asynchronous.

## Fetching data in batches with HystrixObservableCommand

All product data fetches are bound to the same thread pool. We execute through one thread of a HystrixObservableCommand, and within that thread we pull back the productInfo of multiple productIds in a batch.

```java
public class GetProductInfosCommand extends HystrixObservableCommand<ProductInfo> {

    private String[] productIds;

    public GetProductInfosCommand(String[] productIds) {
        // Still bound to the same thread pool
        super(HystrixCommandGroupKey.Factory.asKey("GetProductInfoGroup"));
        this.productIds = productIds;
    }

    @Override
    protected Observable<ProductInfo> construct() {
        return Observable.unsafeCreate((Observable.OnSubscribe<ProductInfo>) subscriber -> {

            for (String productId : productIds) {
                // Fetch product data in a batch
                String url = "http://localhost:8081/getProductInfo?productId=" + productId;
                String response = HttpClientUtils.sendGetRequest(url);
                ProductInfo productInfo = JSONObject.parseObject(response, ProductInfo.class);
                subscriber.onNext(productInfo);
            }
            subscriber.onCompleted();

        }).subscribeOn(Schedulers.io());
    }
}
```

In the cache service API, given the incoming id list, for example a string of ids separated by `,`, we use the HystrixObservableCommand above and call some Hystrix API methods to obtain all the product data.

```java
public String getProductInfos(String productIds) {
    String[] productIdArray = productIds.split(",");
    HystrixObservableCommand<ProductInfo> getProductInfosCommand = new GetProductInfosCommand(productIdArray);
    Observable<ProductInfo> observable = getProductInfosCommand.observe();

    observable.subscribe(new Observer<ProductInfo>() {
        @Override
        public void onCompleted() {
            System.out.println("获取完了所有的商品数据");
        }

        @Override
        public void onError(Throwable e) {
            e.printStackTrace();
        }

        /**
         * This method is called back once for each item fetched
         * @param productInfo
         */
        @Override
        public void onNext(ProductInfo productInfo) {
            System.out.println(productInfo);
        }
    });
    return "success";
}
```

Let us step back and look at how the Hystrix thread pool technique achieves resource isolation.

![hystrix-thread-pool-isolation](diagram:high-availability/hystrix-thread-pool-isolation/hystrix-thread-pool-isolation)

Starting from Nginx, the caches have all failed, so Nginx calls the product service through the cache service. The default thread pool size of the cache service is 10, so at most 10 threads call the product service API. Even if the product service API fails, at most 10 threads will hang on the way to calling it, and the other threads inside the cache service's Tomcat can still be used to call other services and do other work.
