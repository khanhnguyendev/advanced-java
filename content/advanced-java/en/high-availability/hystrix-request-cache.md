---
source:
  locale: zh
  slug: hystrix-request-cache
  hash: 'sha256:v1:dfa7a26e5b58510b167ce217cb188151aacc4bc9277c8c19d1b7a618c7d2c34b'
status: machine
translatedAt: '2026-10-14'
---
# Optimizing Batch Product Data Query APIs with Request Cache

The third of the 8 steps of Hystrix command execution is checking whether the Request cache holds a cached result.

First, there is a concept called the Request Context. Generally, in a web application that uses Hystrix, we apply a request context to every request in a filter. That is, each request is one request context. Within this request context we execute a lot of code and call many dependency services, some of which may be called several times.

Within one request context, if multiple commands have identical parameters and call the same API, their results can be considered identical. In that case, we can cache the result returned by the first command execution in memory, and all subsequent calls to this dependency within the request context can simply take the cached result from memory.

The benefit is that the same command is not executed repeatedly within one request context, which **avoids repeated network requests and improves the performance of the whole request**.

For example, within one request context we request the data for productId 1. The first time it is not in the cache, so the data is fetched from the product service, the latest result is returned, and the data is cached in memory. If the same request context later asks for the data of productId 1 again, it is simply taken from the cache.

![hystrix-request-cache](asset:high-availability/hystrix-request-cache/hystrix-request-cache.png)

Both HystrixCommand and HystrixObservableCommand can specify a cache key; Hystrix then caches automatically, and on a later access within the same request context it uses the cached result directly.

Next, let us look at how to use the request cache technique in a concrete **business scenario**. Of course, the code below is only a basic demo.

Suppose we are building an API for **batch querying product data**, in which we use a HystrixCommand to query the data of multiple product ids at once. There is a problem, though: if the local Nginx cache expires and a new batch of cache entries is fetched, and the productIds passed in are not deduplicated, for example `productIds=1,1,1,2,2`, then product ids may be duplicated. With our earlier business logic, the product with productId=1 would be queried three times and the product with productId=2 twice.

We can optimize this batch product query API with the request cache: one request is one request context, identical product queries are executed only once, and the remaining duplicates go through the request cache.

## Implement and register a Hystrix request context filter

Define the HystrixRequestContextFilter class, implementing the Filter interface.

```java
/**
 * Hystrix request context filter
 */
public class HystrixRequestContextFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {

    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) {
        HystrixRequestContext context = HystrixRequestContext.initializeContext();
        try {
            filterChain.doFilter(servletRequest, servletResponse);
        } catch (IOException | ServletException e) {
            e.printStackTrace();
        } finally {
            context.shutdown();
        }
    }

    @Override
    public void destroy() {

    }
}
```

Then register this filter object in the SpringBoot Application.

```java
@SpringBootApplication
public class EshopApplication {

    public static void main(String[] args) {
        SpringApplication.run(EshopApplication.class, args);
    }

    @Bean
    public FilterRegistrationBean filterRegistrationBean() {
        FilterRegistrationBean filterRegistrationBean = new FilterRegistrationBean(new HystrixRequestContextFilter());
        filterRegistrationBean.addUrlPatterns("/*");
        return filterRegistrationBean;
    }
}
```

## Override getCacheKey() in the command

In GetProductInfoCommand, override the getCacheKey() method, so that the result of every request is placed in the Hystrix request context. The next request for the same productId takes the cached value directly, with no need to call run() again.

```java
public class GetProductInfoCommand extends HystrixCommand<ProductInfo> {

    private Long productId;

    private static final HystrixCommandKey KEY = HystrixCommandKey.Factory.asKey("GetProductInfoCommand");

    public GetProductInfoCommand(Long productId) {
        super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ProductInfoService"))
                .andCommandKey(KEY));
        this.productId = productId;
    }

    @Override
    protected ProductInfo run() {
        String url = "http://localhost:8081/getProductInfo?productId=" + productId;
        String response = HttpClientUtils.sendGetRequest(url);
        System.out.println("调用接口查询商品数据，productId=" + productId);
        return JSONObject.parseObject(response, ProductInfo.class);
    }

    /**
     * The result of each request is placed in the request context bound to Hystrix
     *
     * @return cacheKey the cache key
     */
    @Override
    public String getCacheKey() {
        return "product_info_" + productId;
    }

    /**
     * Clear the cache of a given product id
     *
     * @param productId product id
     */
    public static void flushCache(Long productId) {
        HystrixRequestCache.getInstance(KEY,
                HystrixConcurrencyStrategyDefault.getInstance()).clear("product_info_" + productId);
    }
}
```

A flushCache() method is written here so that we can delete the cache manually during development.

## The controller calls the command to query product information

Within one web request context, a list of product ids is passed in to query the information of multiple products. A command is created for each productId.

If the id list has not been deduplicated, then for a repeated id the second query goes straight to the cache.

```java
@Controller
public class CacheController {

    /**
     * A request that queries the data of multiple products in one batch
     *
     * @param productIds product id list separated by ","
     * @return response status
     */
    @RequestMapping("/getProductInfos")
    @ResponseBody
    public String getProductInfos(String productIds) {
        for (String productId : productIds.split(",")) {
            // Create a command for each productId
            GetProductInfoCommand getProductInfoCommand = new GetProductInfoCommand(Long.valueOf(productId));
            ProductInfo productInfo = getProductInfoCommand.execute();
            System.out.println("是否是从缓存中取的结果：" + getProductInfoCommand.isResponseFromCache());
        }

        return "success";
    }
}
```

## Issue the request

Call the API to query the information of multiple products.

```
http://localhost:8080/getProductInfos?productIds=1,1,1,2,2,5
```

In the console we can see the following result.

```
调用接口查询商品数据，productId=1
是否是从缓存中取的结果：false
是否是从缓存中取的结果：true
是否是从缓存中取的结果：true
调用接口查询商品数据，productId=2
是否是从缓存中取的结果：false
是否是从缓存中取的结果：true
调用接口查询商品数据，productId=5
是否是从缓存中取的结果：false
```

The first query for productId=1 calls the API and does not take its result from the cache. Later queries for productId=1 then take the cache directly, which is clearly much more efficient.

## Delete the cache

We write an UpdateProductInfoCommand which, after updating the product information, manually calls the flushCache() written earlier to delete the cache manually.

```java
public class UpdateProductInfoCommand extends HystrixCommand<Boolean> {

    private Long productId;

    public UpdateProductInfoCommand(Long productId) {
        super(HystrixCommandGroupKey.Factory.asKey("UpdateProductInfoGroup"));
        this.productId = productId;
    }

    @Override
    protected Boolean run() throws Exception {
        // Perform an update of the product information here
        // ...

        // Then clear the cache
        GetProductInfoCommand.flushCache(productId);
        return true;
    }
}
```

This way, the next request to query this product goes through the API call for the first time and fetches the latest product information.
