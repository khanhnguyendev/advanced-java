---
source:
  locale: zh
  slug: hystrix-request-cache
  hash: 'sha256:v1:89742b42de1712c7b19858b418912aef459b7cfc272fa9fce8dbf88104153ab9'
status: machine
translatedAt: '2026-10-14'
---
# Tối ưu API truy vấn dữ liệu sản phẩm hàng loạt bằng kỹ thuật request cache

Bước thứ ba trong 8 bước lớn khi Hystrix command thực thi là kiểm tra Request cache có bộ nhớ đệm (cache) hay không.

Trước hết có một khái niệm gọi là Request Context (ngữ cảnh yêu cầu). Nói chung, trong một ứng dụng web, nếu chúng ta dùng Hystrix, thì trong một filter, chúng ta sẽ áp một ngữ cảnh yêu cầu cho mỗi yêu cầu. Nghĩa là mỗi yêu cầu là một ngữ cảnh yêu cầu. Sau đó trong ngữ cảnh yêu cầu này, chúng ta sẽ thực thi rất nhiều đoạn code, gọi rất nhiều dịch vụ phụ thuộc, có dịch vụ phụ thuộc thậm chí còn bị gọi nhiều lần.

Trong một ngữ cảnh yêu cầu, nếu có nhiều command có tham số giống nhau, API được gọi cũng giống nhau, thì có thể coi kết quả cũng giống nhau. Khi đó, chúng ta có thể để kết quả trả về từ lần thực thi command đầu tiên được lưu đệm trong bộ nhớ, rồi tất cả các lời gọi tiếp theo trong ngữ cảnh yêu cầu này tới dịch vụ phụ thuộc đó chỉ cần lấy kết quả từ bộ nhớ đệm ra.

Như vậy, lợi ích là không phải thực thi lặp đi lặp lại nhiều lần cùng một command trong một ngữ cảnh yêu cầu, **tránh thực thi lặp yêu cầu mạng, nâng cao hiệu năng của toàn bộ yêu cầu**.

Lấy ví dụ. Chẳng hạn trong một ngữ cảnh yêu cầu, chúng ta yêu cầu lấy dữ liệu của productId bằng 1, lần đầu bộ nhớ đệm chưa có, thì sẽ lấy dữ liệu từ dịch vụ sản phẩm, trả về kết quả dữ liệu mới nhất, đồng thời lưu dữ liệu vào bộ nhớ. Sau đó trong cùng ngữ cảnh yêu cầu, nếu còn yêu cầu lấy dữ liệu của productId bằng 1, thì lấy thẳng từ bộ nhớ đệm.

![hystrix-request-cache](diagram:high-availability/hystrix-request-cache/hystrix-request-cache)

HystrixCommand và HystrixObservableCommand đều có thể chỉ định một cache key, sau đó Hystrix sẽ tự động lưu bộ nhớ đệm, rồi trong cùng một request context, nếu truy cập lần nữa thì sẽ dùng trực tiếp bộ nhớ đệm.

Dưới đây, chúng ta kết hợp một **tình huống nghiệp vụ** cụ thể để xem cách dùng kỹ thuật request cache. Tất nhiên, đoạn code dưới đây chỉ là một Demo cơ bản mà thôi.

Giờ giả sử chúng ta cần làm một API **truy vấn dữ liệu sản phẩm hàng loạt**, trong đó chúng ta dùng HystrixCommand để truy vấn một lần dữ liệu của nhiều id sản phẩm. Nhưng ở đây có một vấn đề: nếu bộ nhớ đệm cục bộ của Nginx mất hiệu lực, lấy lại một lô bộ nhớ đệm, mà productIds được truyền sang không được loại trùng, chẳng hạn `productIds=1,1,1,2,2`, thì có thể id sản phẩm xuất hiện lặp, nếu theo logic nghiệp vụ trước đây, có thể sẽ truy vấn sản phẩm productId=1 ba lần, sản phẩm productId=2 hai lần.

Với API truy vấn dữ liệu sản phẩm hàng loạt, chúng ta có thể dùng request cache để tối ưu, nghĩa là một yêu cầu là một request context, với các sản phẩm giống nhau chỉ thực thi truy vấn một lần, phần lặp còn lại đều đi qua request cache.

## Cài đặt filter ngữ cảnh yêu cầu của Hystrix và đăng ký

Định nghĩa lớp HystrixRequestContextFilter, cài đặt interface Filter.

```java
/**
 * Filter ngữ cảnh yêu cầu của Hystrix
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

Sau đó đăng ký đối tượng filter này vào SpringBoot Application.

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

## command ghi đè phương thức getCacheKey()

Trong GetProductInfoCommand, ghi đè phương thức getCacheKey(), như vậy kết quả của mỗi yêu cầu đều sẽ được đặt trong ngữ cảnh yêu cầu của Hystrix. Lần yêu cầu dữ liệu của cùng productId tiếp theo sẽ lấy thẳng từ bộ nhớ đệm, không cần gọi phương thức run() nữa.

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
     * Kết quả của mỗi yêu cầu đều được đặt vào ngữ cảnh yêu cầu mà Hystrix gắn kết
     *
     * @return cacheKey khóa bộ nhớ đệm
     */
    @Override
    public String getCacheKey() {
        return "product_info_" + productId;
    }

    /**
     * Xóa bộ nhớ đệm của một id sản phẩm nào đó
     *
     * @param productId id sản phẩm
     */
    public static void flushCache(Long productId) {
        HystrixRequestCache.getInstance(KEY,
                HystrixConcurrencyStrategyDefault.getInstance()).clear("product_info_" + productId);
    }
}
```

Ở đây viết một phương thức flushCache(), dùng để chúng ta khi phát triển xóa bộ nhớ đệm thủ công.

## controller gọi command để truy vấn thông tin sản phẩm

Trong một ngữ cảnh yêu cầu web, truyền vào danh sách id sản phẩm, truy vấn thông tin của nhiều sản phẩm. Với mỗi productId, đều tạo một command.

Nếu danh sách id không được loại trùng, thì với id lặp, lần truy vấn thứ hai sẽ đi thẳng vào bộ nhớ đệm.

```java
@Controller
public class CacheController {

    /**
     * Yêu cầu truy vấn một lần nhiều bản ghi dữ liệu sản phẩm hàng loạt
     *
     * @param productIds danh sách id sản phẩm phân tách bằng dấu ,
     * @return trạng thái phản hồi
     */
    @RequestMapping("/getProductInfos")
    @ResponseBody
    public String getProductInfos(String productIds) {
        for (String productId : productIds.split(",")) {
            // Với mỗi productId, đều tạo một command
            GetProductInfoCommand getProductInfoCommand = new GetProductInfoCommand(Long.valueOf(productId));
            ProductInfo productInfo = getProductInfoCommand.execute();
            System.out.println("是否是从缓存中取的结果：" + getProductInfoCommand.isResponseFromCache());
        }

        return "success";
    }
}
```

## Phát yêu cầu

Gọi API, truy vấn thông tin của nhiều sản phẩm.

```
http://localhost:8080/getProductInfos?productIds=1,1,1,2,2,5
```

Trên console, chúng ta có thể thấy kết quả sau.

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

Lần đầu truy vấn dữ liệu của productId=1, sẽ gọi API để truy vấn, không lấy kết quả từ bộ nhớ đệm. Còn khi sau đó lại có yêu cầu truy vấn productId=1, thì lấy thẳng bộ nhớ đệm, như vậy hiệu suất rõ ràng cao hơn rất nhiều.

## Xóa bộ nhớ đệm

Chúng ta viết một UpdateProductInfoCommand, sau khi cập nhật thông tin sản phẩm, gọi thủ công flushCache() đã viết trước đó, xóa bộ nhớ đệm một cách thủ công.

```java
public class UpdateProductInfoCommand extends HystrixCommand<Boolean> {

    private Long productId;

    public UpdateProductInfoCommand(Long productId) {
        super(HystrixCommandGroupKey.Factory.asKey("UpdateProductInfoGroup"));
        this.productId = productId;
    }

    @Override
    protected Boolean run() throws Exception {
        // Ở đây thực hiện một lần cập nhật thông tin sản phẩm
        // ...

        // Sau đó xóa bộ nhớ đệm
        GetProductInfoCommand.flushCache(productId);
        return true;
    }
}
```

Như vậy, các yêu cầu truy vấn sản phẩm này sau đó, lần đầu tiên sẽ đi qua lời gọi API để truy vấn thông tin sản phẩm mới nhất.
