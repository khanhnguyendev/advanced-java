---
source:
  locale: zh
  slug: hystrix-execution-isolation
  hash: 'sha256:v1:528a5a92d133cac06cff126ca252f86aca4c21e8249efbd3cec86fa7e778b6a1'
status: machine
translatedAt: '2026-10-14'
---
# Kiểm soát chi tiết chiến lược cô lập của Hystrix

Hystrix thực hiện cô lập (isolation) tài nguyên với hai chiến lược:

-   cô lập bằng thread pool (nhóm luồng)
-   cô lập bằng semaphore

Đối với phần cô lập tài nguyên này, thực ra có thể thực hiện một mức kiểm soát chi tiết nhất định.

## execution.isolation.strategy

Chỉ định chiến lược cô lập tài nguyên của HystrixCommand.run(): `THREAD` or `SEMAPHORE`, một loại dựa trên thread pool, một loại dựa trên semaphore.

```java
// to use thread isolation
HystrixCommandProperties.Setter().withExecutionIsolationStrategy(ExecutionIsolationStrategy.THREAD)

// to use semaphore isolation
HystrixCommandProperties.Setter().withExecutionIsolationStrategy(ExecutionIsolationStrategy.SEMAPHORE)
```

Với cơ chế thread pool, mỗi command chạy trong một luồng, việc giới hạn lưu lượng (rate limiting) được kiểm soát bằng kích thước thread pool; với cơ chế semaphore, command chạy trong luồng gọi (tức thread pool của Tomcat), việc giới hạn lưu lượng được thực hiện bằng dung lượng của semaphore.

Làm thế nào để chọn giữa thread pool và semaphore?

**Chiến lược mặc định** là thread pool.

Lợi ích lớn nhất của **thread pool** là với yêu cầu truy cập mạng, nếu có hết thời gian chờ (timeout) thì có thể tránh được việc luồng gọi bị chặn.

Còn tình huống dùng semaphore thường nhắm đến các kịch bản có lượng đồng thời cực lớn, mỗi instance dịch vụ mỗi giây có đến vài trăm `QPS`; khi đó nếu dùng thread pool thì số luồng thường không nhiều, có thể không chống đỡ nổi mức đồng thời cao như vậy, mà nếu muốn chống đỡ thì có thể phải tốn rất nhiều tài nguyên luồng, vì vậy hãy dùng semaphore để giới hạn lưu lượng và bảo vệ. Semaphore thường gặp ở các dịch vụ có logic nghiệp vụ thuần bộ nhớ, không liên quan đến bất kỳ yêu cầu truy cập mạng nào.

## command key & command group

Khi dùng cô lập bằng thread pool, chúng ta phân chia ba thứ **dịch vụ phụ thuộc**, **API của dịch vụ phụ thuộc** và **thread pool** như thế nào?

Mỗi command đều có thể đặt tên riêng cho mình là command key, đồng thời có thể đặt nhóm riêng là command group.

```java
private static final Setter cachedSetter = Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ExampleGroup"))
                                                 .andCommandKey(HystrixCommandKey.Factory.asKey("HelloWorld"));

public CommandHelloWorld(String name) {
    super(cachedSetter);
    this.name = name;
}
```

command group là một khái niệm rất quan trọng; mặc định, thread pool được định nghĩa thông qua command group, và command group còn được dùng để tổng hợp một số thông tin giám sát và cảnh báo. Các yêu cầu trong cùng một command group đều đi vào cùng một thread pool.

## command thread pool

ThreadPoolKey đại diện cho một HystrixThreadPool, dùng để giám sát, thống kê và lưu bộ nhớ đệm (cache) thống nhất. ThreadPoolKey mặc định chính là tên của command group. Mỗi command đều được gắn với ThreadPool tương ứng với ThreadPoolKey của nó.

Nếu không muốn dùng trực tiếp command group, cũng có thể đặt tên ThreadPool thủ công.

```java
private static final Setter cachedSetter = Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ExampleGroup"))
                                                 .andCommandKey(HystrixCommandKey.Factory.asKey("HelloWorld"))
                                                 .andThreadPoolKey(HystrixThreadPoolKey.Factory.asKey("HelloWorldPool"));

public CommandHelloWorld(String name) {
    super(cachedSetter);
    this.name = name;
}
```

## command key & command group & command thread pool

**command key** đại diện cho một loại command, nói chung đại diện cho một API nào đó của dịch vụ phụ thuộc phía hạ nguồn.

**command group** đại diện cho một dịch vụ phụ thuộc hạ nguồn nào đó, điều này rất hợp lý, vì một dịch vụ phụ thuộc có thể mở ra nhiều API, mỗi API là một command key. Về mặt logic, command group thống kê số lần gọi, số lần thành công, số lần timeout, số lần thất bại, v.v. của một nhóm command key, nhờ đó có thể thấy tình hình truy cập tổng thể của một dịch vụ nào đó. **Nói chung, khuyến nghị chia một thread pool theo một dịch vụ, các command key mặc định đều thuộc cùng một thread pool.**

Ví dụ có một dịch vụ A, bạn ước tính `QPS` tổng thể của tất cả API cộng lại của dịch vụ A khoảng 100 mỗi giây, và bạn có một dịch vụ B gọi dịch vụ A. Dịch vụ B của bạn triển khai 10 instance, trên mỗi instance dùng command group để ứng với dịch vụ A hạ nguồn. Cấp cho một thread pool, cỡ khoảng 10 là đủ, như vậy QPS truy cập tổng thể của dịch vụ B tới dịch vụ A sẽ vào khoảng 100 mỗi giây.

Tuy nhiên, nếu command group ứng với một dịch vụ, mà vài API mà dịch vụ này mở ra có lưu lượng truy cập rất khác nhau, chênh lệch cực kỳ lớn, thì có thể bạn sẽ muốn bên trong command group ứng với dịch vụ này, bao gồm các command key ứng với nhiều API, thực hiện một số cô lập tài nguyên chi tiết. **Nghĩa là, mong muốn dùng các thread pool khác nhau cho các API khác nhau của cùng một dịch vụ.**

```
command key -> command group

command key -> thread pool key riêng của nó
```

Về mặt logic, nhiều command key thuộc về một command group, khi thống kê sẽ được gộp chung. Mỗi command key có thread pool riêng, mỗi API có thread pool riêng, để thực hiện cô lập tài nguyên và giới hạn lưu lượng.

Nói thẳng ra, nếu command key của bạn muốn dùng thread pool riêng, có thể định nghĩa thread pool key riêng của mình, vậy là ok.

## coreSize

Đặt kích thước thread pool, mặc định là 10. Nói chung, dùng kích thước mặc định 10 luồng này là đủ.

```java
HystrixThreadPoolProperties.Setter().withCoreSize(int value);
```

## queueSizeRejectionThreshold

Nếu 10 luồng trong thread pool đều đang làm việc, không còn luồng rảnh để làm việc khác, thì lúc này khi có yêu cầu đến sẽ vào hàng đợi trước và tồn đọng. Nếu hàng đợi đã đầy, khi có yêu cầu đến nữa sẽ bị reject (từ chối) trực tiếp, thực thi logic suy giảm dịch vụ (fallback) và trả về nhanh.

![hystrix-thread-pool-queue](diagram:high-availability/hystrix-execution-isolation/hystrix-thread-pool-queue)

Kiểm soát ngưỡng (threshold) reject sau khi queue đầy; vì maxQueueSize không cho phép sửa đổi nóng, nên cung cấp tham số này để có thể sửa đổi nóng, kiểm soát kích thước tối đa của hàng đợi.

```java
HystrixThreadPoolProperties.Setter().withQueueSizeRejectionThreshold(int value);
```

## execution.isolation.semaphore.maxConcurrentRequests

Đặt lượng đồng thời tối đa được phép truy cập khi dùng chiến lược cô lập SEMAPHORE; vượt quá lượng đồng thời tối đa này, yêu cầu bị reject trực tiếp.

Việc đặt lượng đồng thời này nên tương tự với việc đặt kích thước thread pool, nhưng nếu dựa trên semaphore thì hiệu năng sẽ tốt hơn nhiều, và chi phí của bản thân framework Hystrix cũng nhỏ hơn nhiều.

Giá trị mặc định là 10, nên đặt nhỏ một chút, vì một khi đặt quá lớn mà lại xảy ra độ trễ, có thể khiến tài nguyên luồng của chính tomcat bị chiếm đầy trong tích tắc.

```java
HystrixCommandProperties.Setter().withExecutionIsolationSemaphoreMaxConcurrentRequests(int value);
```
