---
source:
  locale: zh
  slug: hystrix-thread-pool-current-limiting
  hash: 'sha256:v1:1bc165702d27f14d79d9b44dc13452402c322fa98a477c034370c9806e8962c9'
status: machine
translatedAt: '2026-10-14'
---
# Tìm hiểu sâu cô lập thread pool và giới hạn lưu lượng API của Hystrix

Phần trước đã nói về bộ nhớ đệm yêu cầu (cache) request cache của Hystrix, suy giảm dịch vụ êm dịu (graceful degradation) fallback, và ngắt mạch nhanh (circuit breaking) của circuit breaker (bộ ngắt mạch); bài này chúng ta sẽ nói chi tiết về cô lập thread pool (nhóm luồng) và giới hạn lưu lượng (rate limiting) API của Hystrix.

![hystrix-process](asset:high-availability/hystrix-thread-pool-current-limiting/hystrix-process.png)

Hystrix thông qua việc kiểm tra thread pool hoặc semaphore đã đầy hay chưa, các yêu cầu vượt quá dung lượng sẽ bị Reject và đi theo suy giảm dịch vụ, từ đó đạt được tác dụng giới hạn lưu lượng.

Giới hạn lưu lượng là giới hạn lượng truy cập tới các dịch vụ phía sau, chẳng hạn giới hạn việc bạn truy cập tài nguyên của MySQL, Redis, Zookeeper và các middleware phía sau khác, thực ra là để tránh lưu lượng quá lớn đánh sập trực tiếp các dịch vụ phía sau.

## Thiết kế của kỹ thuật cô lập thread pool

Hystrix áp dụng kỹ thuật cô lập khoang Bulkhead Partition (bulkhead, cô lập theo khoang), để cô lập tài nguyên (isolation) các phụ thuộc bên ngoài, từ đó tránh việc sự cố của bất kỳ phụ thuộc bên ngoài nào làm dịch vụ này sụp đổ.

**Cô lập khoang** là chia không gian bên trong thân tàu thành nhiều khoang; một khi có vài khoang bị hư hỏng và nước tràn vào, nước sẽ không chảy qua lại giữa các khoang, nhờ vậy khi tàu bị hư hại, vẫn có đủ lực nổi và độ ổn định, từ đó giảm nguy cơ chìm tàu ngay lập tức.

![bulkhead-partition](asset:high-availability/hystrix-thread-pool-current-limiting/bulkhead-partition.jpg)

Hystrix dùng một thread pool riêng cho mỗi phụ thuộc bên ngoài, như vậy nếu việc gọi phụ thuộc bên ngoài đó bị trễ rất nghiêm trọng, thì cùng lắm chỉ là cạn kiệt thread pool của chính phụ thuộc đó mà thôi, không ảnh hưởng tới các lời gọi phụ thuộc khác.

## Các tình huống Hystrix áp dụng cơ chế thread pool

-   Mỗi dịch vụ đều gọi hàng chục dịch vụ phụ thuộc phía sau, các dịch vụ phụ thuộc phía sau đó thường do rất nhiều nhóm khác nhau phát triển.
-   Mỗi dịch vụ phụ thuộc phía sau đều cung cấp thư viện gọi client của riêng nó, chẳng hạn nếu dùng thrift thì sẽ cung cấp phụ thuộc thrift tương ứng.
-   Thư viện gọi client có thể thay đổi bất cứ lúc nào.
-   Thư viện gọi client có thể bất cứ lúc nào thêm logic yêu cầu mạng mới.
-   Thư viện gọi client có thể chứa các logic như tự động thử lại, phân tích dữ liệu, bộ nhớ đệm trong bộ nhớ, v.v.
-   Thư viện gọi client nhìn chung là một hộp đen đối với bên gọi, bao gồm chi tiết cài đặt, truy cập mạng, cấu hình mặc định, v.v.
-   Trong môi trường production thực tế, thường xuyên xảy ra việc bên gọi bất ngờ phát hiện thư viện gọi client đã có một số thay đổi.
-   Dù thư viện gọi client không đổi, bản thân dịch vụ phụ thuộc cũng có thể có thay đổi về mặt logic.
-   Một số thư viện gọi client của phụ thuộc có thể còn kéo thêm các thư viện phụ thuộc khác, mà có thể các thư viện phụ thuộc đó được cấu hình không đúng.
-   Phần lớn yêu cầu mạng đều là gọi đồng bộ.
-   Gọi thất bại và độ trễ cũng có thể xảy ra trong code của chính thư viện gọi client, không nhất thiết là xảy ra trong yêu cầu mạng.

Nói đơn giản, bạn phải mặc định rằng thư viện gọi client rất không đáng tin, và có thể xảy ra đủ loại thay đổi bất cứ lúc nào, nên cần dùng cách cô lập cưỡng chế để đảm bảo sự cố của bất kỳ dịch vụ nào cũng không ảnh hưởng đến dịch vụ hiện tại.

## Ưu điểm của cơ chế thread pool

-   Bất kỳ dịch vụ phụ thuộc nào cũng có thể được cô lập trong thread pool riêng của nó, dù tài nguyên thread pool của nó bị lấp đầy cũng không ảnh hưởng đến lời gọi bất kỳ dịch vụ nào khác.
-   Dịch vụ có thể bất cứ lúc nào đưa vào một dịch vụ phụ thuộc mới, vì dù dịch vụ phụ thuộc mới này có vấn đề cũng không ảnh hưởng đến lời gọi bất kỳ dịch vụ nào khác.
-   Khi một dịch vụ phụ thuộc đang gặp sự cố hồi phục trở lại, có thể dọn sạch thread pool để lập tức phục hồi lời gọi dịch vụ đó, còn nếu thread pool của tomcat bị chiếm đầy thì việc phục hồi lại rất phiền phức.
-   Nếu một thư viện gọi client cấu hình có vấn đề, tình trạng sức khỏe của thread pool sẽ được báo cáo bất cứ lúc nào, chẳng hạn thống kê số lần thành công/thất bại/từ chối/hết thời gian chờ (timeout), sau đó có thể sửa đổi nóng cấu hình gọi dịch vụ phụ thuộc gần thời gian thực mà không cần dừng máy.
-   Dựa trên bản chất bất đồng bộ của thread pool, có thể xây dựng một lớp gọi bất đồng bộ phía trên các lời gọi đồng bộ.

Nói đơn giản, lợi ích lớn nhất là cô lập tài nguyên, đảm bảo bất kỳ dịch vụ phụ thuộc nào gặp sự cố cũng không kéo sập dịch vụ hiện tại.

## Nhược điểm của cơ chế thread pool

-   Nhược điểm lớn nhất của cơ chế thread pool là tăng chi phí CPU.<br>
    Ngoài luồng gọi của chính tomcat, còn có thread pool do Hystrix tự quản lý.

-   Việc thực thi mỗi command đều dựa vào một luồng độc lập, sẽ có xếp hàng, điều phối, và chuyển đổi ngữ cảnh.
-   Chính Hystrix chính thức đã làm một thống kê chi phí bổ sung do đa luồng bất đồng bộ mang lại, thông qua so sánh gọi bất đồng bộ đa luồng + gọi đồng bộ để rút ra, Netflix API mỗi ngày thực thi 1 tỷ lần gọi qua Hystrix, mỗi instance dịch vụ có trên 40 thread pool, mỗi thread pool có khoảng 10 luồng.） Cuối cùng phát hiện rằng chi phí bổ sung của việc dùng Hystrix là mang lại độ trễ khoảng 3ms cho yêu cầu, độ trễ tối đa trong vòng 10ms, so với việc nâng cao tính sẵn sàng và tính ổn định thì điều này là chấp nhận được.

Chúng ta có thể dùng kỹ thuật semaphore của Hystrix để giới hạn lượng truy cập đồng thời tới một dịch vụ phụ thuộc nào đó, thay vì giới hạn lưu lượng bằng kích thước thread pool/hàng đợi.

Kỹ thuật semaphore có thể dùng để giới hạn lưu lượng và san phẳng đỉnh tải (peak shaving), nhưng không thể dùng để timeout và cô lập đối với dịch vụ có độ trễ lời gọi.

Đặt `execution.isolation.strategy` thành `SEMAPHORE`, thì Hystrix sẽ dùng cơ chế semaphore để thay cho cơ chế thread pool, nhằm giới hạn lưu lượng truy cập dịch vụ phụ thuộc. Nếu khi gọi qua semaphore mà lời gọi mạng bên dưới bị trễ rất nghiêm trọng, thì không thể timeout được, chỉ có thể block mãi. Một khi số lượng yêu cầu vượt quá số lượng mà semaphore quy định, sẽ lập tức bật giới hạn lưu lượng.

## Demo giới hạn lưu lượng API

Giả sử kích thước thread pool là 8, kích thước hàng đợi chờ là 10. Thời lượng timeout chúng ta đặt dài một chút, 20s.

Bên trong command, viết cứng code, làm một lệnh sleep, chẳng hạn sleep 3s.

-   withCoreSize: đặt kích thước thread pool.
-   withMaxQueueSize: đặt kích thước hàng đợi chờ.
-   withQueueSizeRejectionThreshold: tham số này dùng phối hợp với withMaxQueueSize, kích thước hàng đợi chờ lấy giá trị nhỏ hơn của hai tham số này.

Nếu chỉ đặt kích thước thread pool, mà hai tham số liên quan đến queue còn lại không được đặt, thì hàng đợi chờ ở trạng thái đóng.

```java
public class GetProductInfoCommand extends HystrixCommand<ProductInfo> {

    private Long productId;

    private static final HystrixCommandKey KEY = HystrixCommandKey.Factory.asKey("GetProductInfoCommand");

    public GetProductInfoCommand(Long productId) {
        super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ProductInfoService"))
                .andCommandKey(KEY)
                // Thông tin cấu hình liên quan đến thread pool
                .andThreadPoolPropertiesDefaults(HystrixThreadPoolProperties.Setter()
                        // Đặt kích thước thread pool là 8
                        .withCoreSize(8)
                        // Đặt kích thước hàng đợi chờ là 10
                        .withMaxQueueSize(10)
                        .withQueueSizeRejectionThreshold(12))
                .andCommandPropertiesDefaults(HystrixCommandProperties.Setter()
                        .withCircuitBreakerEnabled(true)
                        .withCircuitBreakerRequestVolumeThreshold(20)
                        .withCircuitBreakerErrorThresholdPercentage(40)
                        .withCircuitBreakerSleepWindowInMilliseconds(3000)
                        // Đặt thời gian timeout
                        .withExecutionTimeoutInMilliseconds(20000)
                        // Đặt số yêu cầu đồng thời tối đa của fallback
                        .withFallbackIsolationSemaphoreMaxConcurrentRequests(30)));
        this.productId = productId;
    }

    @Override
    protected ProductInfo run() throws Exception {
        System.out.println("调用接口查询商品数据，productId=" + productId);

        if (productId == -1L) {
            throw new Exception();
        }

        // Yêu cầu đến sẽ bị treo (hang) ở đây 3 giây
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

Chúng ta mô phỏng 25 yêu cầu. 8 yêu cầu đầu tiên, khi gọi API sẽ bị treo luôn 3s, thì 10 yêu cầu tiếp theo sẽ vào hàng đợi chờ để đợi các yêu cầu trước thực thi xong. 7 yêu cầu cuối cùng đến sẽ bị reject trực tiếp, gọi logic suy giảm dịch vụ.

```java
@SpringBootTest
@RunWith(SpringRunner.class)
public class RejectTest {

    @Test
    public void testReject() {
        for (int i = 0; i < 25; ++i) {
            new Thread(() -> HttpClientUtils.sendGetRequest("http://localhost:8080/getProductInfo?productId=-2")).start();
        }
        // Ngăn luồng chính kết thúc thực thi sớm
        TimeUtils.sleep(50);
    }
}
```

Từ kết quả thực thi, chúng ta có thể thấy rõ tổng cộng in ra 7 sản phẩm suy giảm dịch vụ. Đây chính là kết quả khi số yêu cầu vượt quá số lượng thread pool + hàng đợi nên bị reject trực tiếp.

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
// Phía sau đều là một số thông tin sản phẩm bình thường, không dán ra nữa
// ...
```
