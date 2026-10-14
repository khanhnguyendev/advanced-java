---
source:
  locale: zh
  slug: hystrix-semphore-isolation
  hash: 'sha256:v1:97c7d7ffc9706a518ad43c5009eb6d3994a9edf1c3868a4a471ad6bc8ccf4199'
status: machine
translatedAt: '2026-10-14'
---
# Cô lập tài nguyên dựa trên cơ chế semaphore của Hystrix

Một chức năng cốt lõi của Hystrix thực chất chính là cái gọi là **cô lập tài nguyên** (isolation); vấn đề cốt lõi nhất cần giải quyết là cô lập việc gọi nhiều dịch vụ phụ thuộc vào các nhóm tài nguyên riêng của từng dịch vụ. Điều này tránh tình trạng việc gọi một dịch vụ phụ thuộc nào đó, do API của dịch vụ phụ thuộc bị trễ hoặc thất bại, khiến toàn bộ tài nguyên luồng của dịch vụ bị tiêu tốn vào việc gọi API của dịch vụ đó. Một khi tài nguyên luồng của một dịch vụ bị cạn kiệt hoàn toàn, có thể dẫn đến dịch vụ sụp đổ, thậm chí sự cố này còn lan rộng ra liên tục.

Hystrix thực hiện cô lập tài nguyên chủ yếu bằng hai kỹ thuật:

-   thread pool (nhóm luồng)
-   semaphore

Mặc định, Hystrix dùng chế độ thread pool.

Phần trước đã nói về kỹ thuật thread pool; phần này sẽ nói về cơ chế semaphore để cô lập tài nguyên, cũng như sự khác biệt và tình huống áp dụng cụ thể của hai kỹ thuật này.

## Cơ chế semaphore

Việc cô lập tài nguyên bằng semaphore chỉ đóng vai trò như một công tắc. Ví dụ, semaphore của dịch vụ A có kích thước 10, nghĩa là cùng lúc chỉ cho phép 10 luồng tomcat truy cập dịch vụ A, các yêu cầu còn lại đều bị từ chối, qua đó đạt được tác dụng cô lập tài nguyên và bảo vệ bằng giới hạn lưu lượng (rate limiting).

![hystrix-semphore](diagram:high-availability/hystrix-semphore-isolation/hystrix-semphore)

## Khác biệt giữa thread pool và semaphore

Kỹ thuật cô lập bằng thread pool không phải là kiểm soát các luồng của web container như tomcat. Nói chặt chẽ hơn, kỹ thuật cô lập thread pool của Hystrix kiểm soát việc thực thi của luồng tomcat. Khi thread pool của Hystrix đầy, nó đảm bảo luồng tomcat không bị treo do việc gọi API của dịch vụ phụ thuộc bị trễ hoặc gặp sự cố; các luồng tomcat khác không bị kẹt, có thể trả về nhanh và phục vụ những việc khác.

Kỹ thuật cô lập thread pool dùng luồng riêng của Hystrix để thực thi lời gọi; còn kỹ thuật cô lập bằng semaphore là để luồng tomcat gọi trực tiếp dịch vụ phụ thuộc. Cô lập bằng semaphore chỉ là một chốt chặn: semaphore có bao nhiêu thì cho phép bấy nhiêu luồng tomcat đi qua và thực thi.

![hystrix-semphore-thread-pool](diagram:high-availability/hystrix-semphore-isolation/hystrix-semphore-thread-pool)

**Tình huống áp dụng**:

-   **Kỹ thuật thread pool** phù hợp với đại đa số tình huống, chẳng hạn khi chúng ta gọi và truy cập yêu cầu mạng tới dịch vụ phụ thuộc, cần kiểm soát hết thời gian chờ (timeout) của lời gọi (bắt ngoại lệ timeout).
-   **Kỹ thuật semaphore** phù hợp khi việc truy cập của bạn không phải là truy cập phụ thuộc bên ngoài, mà là truy cập một số logic nghiệp vụ khá phức tạp bên trong, và code bên trong hệ thống không hề liên quan đến yêu cầu mạng nào; khi đó chỉ cần giới hạn lưu lượng thông thường bằng semaphore là đủ, vì không cần bắt các vấn đề kiểu timeout.

## Demo semaphore đơn giản

Trong bối cảnh nghiệp vụ, tình huống nào khá phù hợp với semaphore?

Ví dụ, thông thường dịch vụ bộ nhớ đệm (cache) có thể đặt một số dữ liệu có số lượng đặc biệt ít nhưng được truy cập đặc biệt thường xuyên vào bộ nhớ thuần của chính nó.

Lấy ví dụ. Thông thường sau khi lấy được dữ liệu sản phẩm, chúng ta phải lấy sản phẩm thuộc vị trí địa lý nào, tỉnh, thành phố, người bán, v.v.; những thông tin này có thể nằm trong bộ nhớ thuần của chính nó, chẳng hạn chỉ là một Map. Với loại logic truy cập trực tiếp bộ nhớ cục bộ như vậy, khá phù hợp để dùng semaphore làm một lớp cô lập đơn giản.

Ưu điểm là không cần tự quản lý thread pool, không cần bận tâm đến timeout, cũng không cần chuyển đổi ngữ cảnh luồng. Cô lập bằng semaphore thì hiệu năng tương đối cao hơn.

Giả sử đây là bộ nhớ đệm cục bộ, chúng ta có thể lấy cityName thông qua cityId.

```java
public class LocationCache {
    private static Map<Long, String> cityMap = new HashMap<>();

    static {
        cityMap.put(1L, "北京");
    }

    /**
     * Lấy cityName thông qua cityId
     *
     * @param cityId id thành phố
     * @return tên thành phố
     */
    public static String getCityName(Long cityId) {
        return cityMap.get(cityId);
    }
}
```

Viết một GetCityNameCommand, đặt chiến lược là **semaphore**. Trong phương thức run() lấy dữ liệu từ bộ nhớ đệm cục bộ. Mục đích của chúng ta là cô lập tài nguyên cho đoạn code lấy dữ liệu bộ nhớ đệm cục bộ.

```java
public class GetCityNameCommand extends HystrixCommand<String> {

    private Long cityId;

    public GetCityNameCommand(Long cityId) {
        // Đặt chiến lược cô lập bằng semaphore
        super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("GetCityNameGroup"))
                .andCommandPropertiesDefaults(HystrixCommandProperties.Setter()
                        .withExecutionIsolationStrategy(HystrixCommandProperties.ExecutionIsolationStrategy.SEMAPHORE)));

        this.cityId = cityId;
    }

    @Override
    protected String run() {
        // Đoạn code cần được cô lập bằng semaphore
        return LocationCache.getCityName(cityId);
    }
}
```

Ở tầng API, tạo GetCityNameCommand, truyền vào cityId, thực thi phương thức execute(), thì đoạn code lấy bộ nhớ đệm cityName cục bộ sẽ được cô lập tài nguyên bằng semaphore.

```java
@RequestMapping("/getProductInfo")
@ResponseBody
public String getProductInfo(Long productId) {
    HystrixCommand<ProductInfo> getProductInfoCommand = new GetProductInfoCommand(productId);

    // Thực thi qua command để lấy dữ liệu sản phẩm mới nhất
    ProductInfo productInfo = getProductInfoCommand.execute();

    Long cityId = productInfo.getCityId();

    GetCityNameCommand getCityNameCommand = new GetCityNameCommand(cityId);
    // Đoạn code lấy bộ nhớ cục bộ (cityName) sẽ được cô lập tài nguyên bằng semaphore
    String cityName = getCityNameCommand.execute();

    productInfo.setCityName(cityName);

    System.out.println(productInfo);
    return "success";
}
```
