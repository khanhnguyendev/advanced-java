---
source:
  locale: zh
  slug: hystrix-timeout
  hash: 'sha256:v1:ae4f69b5f7bfc7f949828e22f9b8fd6af6501996b437937712185fb841b6c4ff'
status: machine
translatedAt: '2026-10-14'
---
# Bảo vệ an toàn cho việc gọi API dịch vụ bị hết thời gian chờ dựa trên cơ chế timeout

Nói chung, khi gọi API của dịch vụ phụ thuộc, một vấn đề khá thường gặp là **hết thời gian chờ** (timeout). Trong một hệ thống phân tán phức tạp, hết thời gian chờ là nguyên nhân khiến hệ thống không ổn định hoặc bị rung lắc. Khi xuất hiện lượng lớn timeout, tài nguyên luồng sẽ bị treo (hang) chết, dẫn đến thông lượng giảm mạnh, thậm chí dịch vụ sụp đổ.

Bạn gọi đủ loại dịch vụ phụ thuộc, nhất là ở công ty lớn, thậm chí bạn còn không quen người phát triển dịch vụ đó, không biết trình độ kỹ thuật của người đó ra sao, hoàn toàn không hiểu gì về người đó.

Peter Steiner từng nói, "[On the Internet, nobody knows you're a dog](https://en.wikipedia.org/wiki/On_the_Internet,_nobody_knows_you%27re_a_dog)", nghĩa là ở đầu bên kia của internet, thậm chí bạn còn không biết người ngồi đó có khi là một con chó.

Với những hệ thống phân tán đặc biệt phức tạp, nhất là trong công ty lớn, nhiều nhóm cộng tác quy mô lớn, có thể bạn không biết dịch vụ là của ai, rất có thể anh bạn phát triển dịch vụ đó thậm chí chỉ là một thực tập sinh. Hiệu năng API của dịch vụ phụ thuộc có thể rất không ổn định, có lúc 2ms, có lúc 200ms, thậm chí 2s, đều có thể xảy ra.

Nếu bạn không kiểm soát timeout cho việc gọi các API dịch vụ phụ thuộc để cung cấp biện pháp bảo vệ an toàn cho dịch vụ của mình, thì rất có thể dịch vụ của bạn sẽ bị hiệu năng tệ của các dịch vụ phụ thuộc kéo sập. Rất nhiều lời gọi API chạy rất chậm, rất nhiều luồng bị kẹt chết. Nếu bạn đã cô lập tài nguyên, thì cũng chỉ là các luồng của thread pool bị kẹt chết, nhưng thực ra chúng ta có thể kiểm soát timeout, không cần thiết để chúng bị kẹt hết.

## TimeoutMilliseconds

Trong Hystrix, chúng ta có thể đặt thủ công thời lượng timeout; nếu một command chạy vượt quá thời lượng đã đặt thì bị coi là timeout, Hystrix command được đánh dấu là timeout, đồng thời thực thi logic suy giảm dịch vụ (fallback).

Giá trị mặc định của `TimeoutMilliseconds` là 1000, tức 1000ms.

```java
HystrixCommandProperties.Setter()
    ..withExecutionTimeoutInMilliseconds(int)
```

## TimeoutEnabled

Tham số này dùng để kiểm soát có bật cơ chế timeout hay không, giá trị mặc định là true.

```java
HystrixCommandProperties.Setter()
    .withExecutionTimeoutEnabled(boolean)
```

## Demo minh họa

Trong command, chúng ta đặt thời gian timeout là 500ms, rồi trong phương thức run() đặt thời gian ngủ là 1s, như vậy khi một yêu cầu đến, nó ngủ thẳng 1s, kết quả là do timeout nên logic suy giảm dịch vụ được thực thi.

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
                        // Đặt có bật timeout hay không, mặc định là true
                        .withExecutionTimeoutEnabled(true)
                        // Đặt thời gian timeout, mặc định 1000(ms)
                        .withExecutionTimeoutInMilliseconds(500)
                        .withFallbackIsolationSemaphoreMaxConcurrentRequests(30)));
        this.productId = productId;
    }

    @Override
    protected ProductInfo run() throws Exception {
        System.out.println("调用接口查询商品数据，productId=" + productId);

        // Ngủ 1s
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

Trong lớp test, chúng ta phát yêu cầu trực tiếp.

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

Trong kết quả có thể thấy đã in ra thông tin liên quan đến sản phẩm suy giảm dịch vụ.

```c
ProductInfo(id=null, name=降级商品, price=null, pictureList=null, specification=null, service=null, color=null, size=null, shopId=null, modifiedTime=null, cityId=null, cityName=null, brandId=null, brandName=null)
{"id": 1, "name": "iphone7手机", "price": 5599, "pictureList":"a.jpg,b.jpg", "specification": "iphone7的规格", "service": "iphone7的售后服务", "color": "红色,白色,黑色", "size": "5.5", "shopId": 1, "modifiedTime": "2017-01-01 12:00:00", "cityId": 1, "brandId": 1}
```
