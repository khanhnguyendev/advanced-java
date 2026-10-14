---
source:
  locale: zh
  slug: hystrix-circuit-breaker
  hash: 'sha256:v1:c51c29661f9b7fc6fc9f95724918c2a018ffde574aa25a973a703814bc8ab71f'
status: machine
translatedAt: '2026-10-14'
---
# Tìm hiểu sâu nguyên lý thực thi circuit breaker của Hystrix

### Máy trạng thái

Circuit breaker (bộ ngắt mạch) của Hystrix có ba trạng thái, lần lượt là đóng (Closed), mở (Open) và nửa mở (Half-Open), quan hệ chuyển đổi giữa ba trạng thái như sau:

![image-20191104211642271](asset:high-availability/hystrix-circuit-breaker/hystrix-circuit-breaker-state-machine.png)

1. `Closed` circuit breaker đóng: các yêu cầu gọi xuống hạ nguồn đi qua bình thường
1. `Open` circuit breaker mở: chặn việc gọi dịch vụ hạ nguồn, đi thẳng vào logic Fallback
1. `Half-Open` circuit breaker ở trạng thái nửa mở: [SleepWindowInMilliseconds](#h5)

### [Enabled](https://github.com/Netflix/Hystrix/wiki/Configuration#circuitbreakerenabled)

```java
HystrixCommandProperties.Setter()
    .withCircuitBreakerEnabled(boolean)
```

Kiểm soát circuit breaker có hoạt động hay không, bao gồm theo dõi tình trạng sức khỏe của các lời gọi dịch vụ phụ thuộc, và khi có quá nhiều ngoại lệ thì có cho phép kích hoạt ngắt mạch hay không. Giá trị mặc định là `true`.

### [circuitBreaker.requestVolumeThreshold](https://github.com/Netflix/Hystrix/wiki/Configuration#circuitbreakerrequestvolumethreshold)

```java
HystrixCommandProperties.Setter()
    .withCircuitBreakerRequestVolumeThreshold(int)
```

Biểu thị trong một **cửa sổ trượt thời gian (tham số này cũng rất quan trọng, sẽ nói bên dưới)** của một lần thống kê, cần có ít nhất bao nhiêu yêu cầu đi qua thì mới có thể kích hoạt ngắt mạch, giá trị mặc định là 20. **Lưu lượng đi qua circuit breaker của Hystrix chỉ khi vượt quá một ngưỡng nhất định thì mới có thể kích hoạt ngắt mạch.** Chẳng hạn, yêu cầu lưu lượng đi qua circuit breaker trong 10s phải đạt 20, mà số yêu cầu thực tế đi qua circuit breaker chỉ có 19, thì dù cả 19 yêu cầu này đều thất bại cũng sẽ không xét xem có cần ngắt mạch hay không.

### [circuitBreaker.errorThresholdPercentage](https://github.com/Netflix/Hystrix/wiki/Configuration#circuitBreaker.errorThresholdPercentage)

```java
HystrixCommandProperties.Setter()
    .withCircuitBreakerErrorThresholdPercentage(int)
```

Biểu thị tỷ lệ ngoại lệ đạt bao nhiêu thì mới kích hoạt ngắt mạch, giá trị mặc định là 50(%).

#### [circuitBreaker.sleepWindowInMilliseconds](https://github.com/Netflix/Hystrix/wiki/Configuration#circuitbreakersleepwindowinmilliseconds)

```java
HystrixCommandProperties.Setter()
    .withCircuitBreakerSleepWindowInMilliseconds(int)
```

Sau khi circuit breaker chuyển trạng thái từ Close sang Open, trong khoảng thời gian `SleepWindowInMilliseconds` tiếp theo, tất cả yêu cầu đi qua circuit breaker này sẽ bị ngắt mạch, không gọi dịch vụ phía sau, đi thẳng vào cơ chế suy giảm dịch vụ (fallback), giá trị mặc định là 5000(ms).

Còn sau khi khoảng thời gian của tham số này trôi qua, circuit breaker sẽ chuyển sang trạng thái nửa đóng nửa mở `Half-Open`, thử để một yêu cầu đi qua circuit breaker, xem có gọi bình thường được không. Nếu gọi thành công thì tự động phục hồi, circuit breaker chuyển về trạng thái Close.

### [ForceOpen](https://github.com/Netflix/Hystrix/wiki/Configuration#circuitbreakerforceopen)

```java
HystrixCommandProperties.Setter()
    .withCircuitBreakerForceOpen(boolean)
```

Nếu đặt là true thì buộc mở circuit breaker ngay, tương đương với ngắt mạch thủ công, suy giảm dịch vụ thủ công, giá trị mặc định là `false`.

### [ForceClosed](https://github.com/Netflix/Hystrix/wiki/Configuration#circuitbreakerforceclosed)

```java
HystrixCommandProperties.Setter()
    .withCircuitBreakerForceClosed(boolean)
```

Nếu đặt là true thì buộc đóng circuit breaker ngay, tương đương với dừng ngắt mạch thủ công, nâng cấp thủ công, giá trị mặc định là `false`.

### Bộ thống kê Metrics

Cộng tác chặt chẽ với circuit breaker của Hystrix còn có một thành phần quan trọng khác —— **bộ thống kê (Metrics)**. Tham số quan trọng nhất trong bộ thống kê là cửa sổ trượt ([metrics.rollingStats.timeInMilliseconds](https://github.com/Netflix/Hystrix/wiki/Configuration#metricsrollingstatstimeinmilliseconds)) và bucket ([metrics.rollingStats.numBuckets](https://github.com/Netflix/Hystrix/wiki/Configuration#metricsrollingstatsnumbuckets)), ở đây trích dẫn [một đoạn blog](https://zhenbianshu.github.io/2018/09/hystrix_configuration_analysis.html) để giải thích cửa sổ trượt (giá trị mặc định là 10000 ms):

> Một hành khách ngồi ở ghế cạnh cửa sổ trên đoàn tàu đang chạy, hai bên con đường mà tàu chạy qua trồng một hàng cây bạch dương cao thẳng, theo đà tiến của tàu, những cây bạch dương ven đường nhanh chóng lướt qua cửa sổ. Chúng ta dùng mỗi cái cây để đại diện cho một yêu cầu, dùng sự chạy của tàu để đại diện cho thời gian trôi, vậy thì cửa sổ trên tàu này chính là một cửa sổ trượt điển hình, những cây bạch dương mà hành khách nhìn thấy qua cửa sổ chính là dữ liệu mà Hystrix cần thống kê.

Hystrix không phải cứ có một yêu cầu đi qua là thống kê, mà chia đều toàn bộ cửa sổ trượt thành numBuckets phần, mỗi khi thời gian trôi qua một phần thì thống kê một lần. **Sau khi trải qua một cửa sổ thời gian, mới xét xem trạng thái circuit breaker có cần mở hay không, xin xem ví dụ dưới đây.**

## Demo minh họa

### Tham số cấu hình HystrixCommand

Trong GetProductInfoCommand, cấu hình các tham số liên quan đến circuit breaker của Setter.

-   Trong cửa sổ trượt, có ít nhất 20 yêu cầu thì mới có thể kích hoạt ngắt mạch.
-   Tỷ lệ ngoại lệ đạt 40% thì mới kích hoạt ngắt mạch.
-   Trong 3000ms sau khi ngắt mạch, tất cả yêu cầu đều bị reject, đi thẳng vào suy giảm dịch vụ, không gọi phương thức run(). Sau 3000ms, chuyển sang trạng thái half-open.

Trong phương thức run(), chúng ta kiểm tra xem productId có bằng -1 hay không, nếu đúng thì ném ngoại lệ trực tiếp. Viết như vậy, khi test sau này chúng ta có thể truyền productId=-1, để **mô phỏng dịch vụ thực thi bị ngoại lệ**.

Trong logic suy giảm dịch vụ, chúng ta chỉ cần trả về sản phẩm suy giảm dịch vụ là được.

```java
public class GetProductInfoCommand extends HystrixCommand<ProductInfo> {

    private Long productId;

    private static final HystrixCommandKey KEY = HystrixCommandKey.Factory.asKey("GetProductInfoCommand");

    public GetProductInfoCommand(Long productId) {
        super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ProductInfoService"))
                .andCommandKey(KEY)
                .andCommandPropertiesDefaults(HystrixCommandProperties.Setter()
                        // Có cho phép circuit breaker hoạt động hay không
                        .withCircuitBreakerEnabled(true)
                        // Trong cửa sổ trượt, có ít nhất bao nhiêu yêu cầu thì mới có thể kích hoạt ngắt mạch
                        .withCircuitBreakerRequestVolumeThreshold(20)
                        // Tỷ lệ ngoại lệ đạt bao nhiêu thì mới kích hoạt ngắt mạch, mặc định 50%
                        .withCircuitBreakerErrorThresholdPercentage(40)
                        // Sau khi ngắt mạch, trong bao lâu thì reject trực tiếp yêu cầu, sau đó vào trạng thái half-open, mặc định 5000ms
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

### Lớp test ngắt mạch

Trong lớp test, 30 yêu cầu đầu tiên, chúng ta truyền productId=-1, sau đó ngủ 3s, rồi 70 yêu cầu sau, truyền productId=1.

```java
@SpringBootTest
@RunWith(SpringRunner.class)
public class CircuitBreakerTest {

    @Test
    public void testCircuitBreaker() {
        String baseURL = "http://localhost:8080/getProductInfo?productId=";

        for (int i = 0; i < 30; ++i) {
            // Truyền vào -1, sẽ ném ngoại lệ, sau đó đi theo logic suy giảm dịch vụ
            HttpClientUtils.sendGetRequest(baseURL + "-1");
        }

        TimeUtils.sleep(3);
        System.out.println("After sleeping...");

        for (int i = 31; i < 100; ++i) {
            // Truyền vào 1, đi theo lời gọi dịch vụ bình thường
            HttpClientUtils.sendGetRequest(baseURL + "1");
        }
    }
}
```

### Kết quả test

Từ kết quả test, chúng ta có thể thấy rõ toàn bộ quá trình hệ thống ngắt mạch và phục hồi.

```java
调用接口查询商品数据，productId=-1
ProductInfo(id=null, name=降级商品, price=null, pictureList=null, specification=null, service=null, color=null, size=null, shopId=null, modifiedTime=null, cityId=null, cityName=null, brandId=null, brandName=null)
// ...
// Ở đây kết quả bên trên được in lặp lại 20 lần


ProductInfo(id=null, name=降级商品, price=null, pictureList=null, specification=null, service=null, color=null, size=null, shopId=null, modifiedTime=null, cityId=null, cityName=null, brandId=null, brandName=null)
// ...
// Ở đây kết quả bên trên được in lặp lại 8 lần


// Sau khi ngủ 3s
调用接口查询商品数据，productId=1
ProductInfo(id=1, name=iphone7手机, price=5599.0, pictureList=a.jpg,b.jpg, specification=iphone7的规格, service=iphone7的售后服务, color=红色,白色,黑色, size=5.5, shopId=1, modifiedTime=2017-01-01 12:00:00, cityId=1, cityName=null, brandId=1, brandName=null)
// ...
// Ở đây kết quả bên trên được in lặp lại 69 lần
```

Trong 30 yêu cầu đầu tiên, productId chúng ta truyền vào là -1, nên trong quá trình thực thi dịch vụ sẽ ném ngoại lệ. Chúng ta đã đặt rằng ít nhất 20 yêu cầu đi qua circuit breaker và tỷ lệ ngoại lệ vượt quá 40% thì kích hoạt ngắt mạch. Vì vậy đã thực hiện 21 lần gọi API, mỗi lần đều ném ngoại lệ và đi theo suy giảm dịch vụ, sau 21 lần, circuit breaker bị mở.

9 yêu cầu sau đó sẽ không thực thi phương thức `run()`, cũng sẽ không in ra thông tin sau.

```c
调用接口查询商品数据，productId=-1
```

Mà đi thẳng vào logic suy giảm dịch vụ, gọi getFallback() để thực thi.

Sau khi ngủ 3s, trong 70 yêu cầu sau đó, chúng ta đều truyền productId bằng 1. Do phía trước chúng ta đã đặt rằng sau 3000ms circuit breaker chuyển sang trạng thái `half-open`. Vì vậy Hystrix sẽ thử thực thi yêu cầu, thấy thành công, thì circuit breaker đóng lại, và tất cả yêu cầu sau đó cũng đều gọi bình thường được.

### Nội dung tham khảo

1. [Hystrix issue 1459](https://github.com/Netflix/Hystrix/issues/1459)
1. [Hystrix Metrics](https://github.com/Netflix/Hystrix/wiki/Configuration#metrics)
