---
source:
  locale: zh
  slug: hystrix-fallback
  hash: 'sha256:v1:e96a2e731f3ab40405ccb10507abbee0255e6e1df342cde21e7d05cae220ae3d'
status: machine
translatedAt: '2026-10-14'
---
# Cơ chế suy giảm dịch vụ fallback dựa trên bộ nhớ đệm cục bộ

Hystrix gặp bốn tình huống sau đều sẽ gọi cơ chế suy giảm dịch vụ (fallback):

-   Circuit breaker đang ở trạng thái mở.
-   Nhóm tài nguyên đã đầy (thread pool + hàng đợi / semaphore).
-   Hystrix gọi các API khác nhau, hoặc truy cập các phụ thuộc bên ngoài, chẳng hạn MySQL, Redis, Zookeeper, Kafka, v.v., xuất hiện bất kỳ ngoại lệ nào.
-   Khi truy cập phụ thuộc bên ngoài, thời gian truy cập quá dài, báo ngoại lệ TimeoutException.

## Hai cơ chế suy giảm dịch vụ kinh điển nhất

-   Dữ liệu thuần bộ nhớ<br>
    Trong logic suy giảm dịch vụ, bạn có thể duy trì một ehcache trong bộ nhớ, làm một bộ nhớ đệm (cache) thuần bộ nhớ tự động dọn dẹp theo LRU, để dữ liệu nằm trong bộ nhớ đệm. Nếu phụ thuộc bên ngoài có ngoại lệ, phần suy giảm dịch vụ ở đây sẽ thử lấy dữ liệu trực tiếp từ ehcache.

-   Giá trị mặc định<br>
    Trong logic suy giảm dịch vụ, cũng có thể trả về trực tiếp một giá trị mặc định.

Trong `HystrixCommand`, logic suy giảm dịch vụ được viết bằng cách cài đặt API getFallback(); còn trong `HystrixObservableCommand`, thì cài đặt phương thức resumeWithFallback().

Bây giờ, chúng ta dùng một ví dụ đơn giản để minh họa việc suy giảm dịch vụ được thực hiện như thế nào.

Chẳng hạn có **tình huống** như sau. Hiện giờ chúng ta có dữ liệu sản phẩm chứa brandId, giả sử logic bình thường là: lấy được một bản ghi dữ liệu sản phẩm, dựa trên brandId để gọi API của dịch vụ thương hiệu, lấy tên mới nhất của thương hiệu là brandName.

Giả sử API của dịch vụ thương hiệu sập, thì chúng ta có thể thử lấy từ bộ nhớ cục bộ một bản dữ liệu hơi cũ, tạm dùng cho qua.

## Bước một: Lấy dữ liệu từ bộ nhớ đệm cục bộ

Đoạn code lấy tên thương hiệu cục bộ đại khái như sau.

```java
/**
 * Bộ nhớ đệm cục bộ của tên thương hiệu
 *
 */
public class BrandCache {

    private static Map<Long, String> brandMap = new HashMap<>();

    static {
        brandMap.put(1L, "Nike");
    }

    /**
     * brandId lấy brandName
     *
     * @param brandId id thương hiệu
     * @return tên thương hiệu
     */
    public static String getBrandName(Long brandId) {
        return brandMap.get(brandId);
    }
```

## Bước hai: Cài đặt GetBrandNameCommand

Trong GetBrandNameCommand, logic bình thường của phương thức run() là gọi API của dịch vụ thương hiệu để lấy tên thương hiệu; nếu gọi thất bại, báo lỗi, thì sẽ gọi cơ chế suy giảm dịch vụ.

Ở đây, chúng ta **mô phỏng việc gọi API báo lỗi** trực tiếp, bằng cách ném ra một ngoại lệ.

Còn trong phương thức getFallback() chính là **logic suy giảm dịch vụ** của chúng ta, chúng ta lấy trực tiếp dữ liệu **tên thương hiệu** từ bộ nhớ đệm cục bộ.

```java
/**
 * Command lấy tên thương hiệu
 *
 */
public class GetBrandNameCommand extends HystrixCommand<String> {

    private Long brandId;

    public GetBrandNameCommand(Long brandId) {
        super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("BrandService"))
                .andCommandKey(HystrixCommandKey.Factory.asKey("GetBrandNameCommand"))
                .andCommandPropertiesDefaults(HystrixCommandProperties.Setter()
                        // Đặt số yêu cầu đồng thời tối đa của cơ chế suy giảm dịch vụ
                        .withFallbackIsolationSemaphoreMaxConcurrentRequests(15)));
        this.brandId = brandId;
    }

    @Override
    protected String run() throws Exception {
        // Logic bình thường ở đây phải là gọi API của một dịch vụ thương hiệu để lấy tên
        // Nếu gọi thất bại, báo lỗi, thì sẽ gọi cơ chế suy giảm dịch vụ fallback

        // Ở đây chúng ta mô phỏng trực tiếp việc gọi báo lỗi, ném ngoại lệ
        throw new Exception();
    }

    @Override
    protected String getFallback() {
        return BrandCache.getBrandName(brandId);
    }
}
```

`FallbackIsolationSemaphoreMaxConcurrentRequests` dùng để đặt lượng yêu cầu đồng thời tối đa mà phần suy giảm dịch vụ cho phép, giá trị mặc định là 10, được giới hạn lưu lượng (rate limiting) thông qua cơ chế semaphore. Nếu vượt quá giá trị tối đa này thì reject trực tiếp.

## Bước ba: CacheController gọi API

Trong CacheController, chúng ta lấy brandId thông qua productInfo, rồi tạo GetBrandNameCommand và thực thi, để thử lấy brandName. Việc thực thi ở đây sẽ báo lỗi, vì chúng ta ném ngoại lệ trực tiếp trong phương thức run(), Hystrix sẽ gọi phương thức getFallback() để đi theo logic suy giảm dịch vụ.

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

        // Thực thi sẽ ném ngoại lệ báo lỗi, sau đó đi theo suy giảm dịch vụ
        String brandName = getBrandNameCommand.execute();
        productInfo.setBrandName(brandName);

        System.out.println(productInfo);
        return "success";
    }
}
```

Phần minh họa về logic suy giảm dịch vụ về cơ bản đến đây là kết thúc.
