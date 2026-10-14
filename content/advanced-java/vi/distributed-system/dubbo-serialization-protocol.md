---
source:
  locale: zh
  slug: dubbo-serialization-protocol
  hash: 'sha256:v1:129b2acdd4a5831d5d3b48090e9b19df1850314c96f5a94790105d758ddd99f5'
status: machine
translatedAt: '2026-10-14'
---
# Giao thức tuần tự hóa của Dubbo

## Câu hỏi phỏng vấn

Dubbo hỗ trợ những giao thức giao tiếp nào? Hỗ trợ những giao thức tuần tự hóa nào? Hãy nói về cấu trúc dữ liệu của Hessian? Bạn có biết PB không? Vì sao PB có hiệu quả cao nhất?

## Tâm lý người phỏng vấn

Câu hỏi trước, nói về nguyên lý hoạt động cơ bản của Dubbo, là thứ bạn bắt buộc phải biết, ít nhất phải biết Dubbo chia thành những tầng nào, rồi bình thường khởi tạo một yêu cầu RPC ra sao, đăng ký, phát hiện, gọi, những thứ này là cơ bản.

Tiếp theo có thể hỏi sâu vào tầng dưới, ví dụ bước đầu tiên có thể hỏi trước về phần giao thức tuần tự hóa (serialization), tức là khi RPC bình thường thì dữ liệu đi qua con đường nào?

## Phân tích câu trả lời

**Tuần tự hóa** là quá trình chuyển cấu trúc dữ liệu hoặc một số đối tượng thành chuỗi nhị phân, còn **giải tuần tự hóa** là quá trình chuyển chuỗi nhị phân được sinh ra trong quá trình tuần tự hóa trở lại thành cấu trúc dữ liệu hoặc đối tượng.

![serialize-deserialize](diagram:distributed-system/dubbo-serialization-protocol/serialize-deserialize)

### Dubbo hỗ trợ các giao thức giao tiếp khác nhau

-   Giao thức dubbo `dubbo://`

**Mặc định** là đi theo giao thức dubbo, một kết nối dài duy nhất, giao tiếp bất đồng bộ NIO, dùng hessian làm giao thức tuần tự hóa. Trường hợp sử dụng là: lượng dữ liệu truyền nhỏ (mỗi yêu cầu trong vòng 100kb), nhưng lượng đồng thời rất cao, và số máy của người tiêu thụ dịch vụ (consumer) lớn hơn nhiều so với số máy của nhà cung cấp dịch vụ (provider).

Để hỗ trợ kịch bản tải đồng thời cao (high concurrency), thường nhà cung cấp dịch vụ chỉ có vài máy, nhưng người tiêu thụ dịch vụ có hàng trăm máy, có thể mỗi ngày lượng gọi lên tới hơn một trăm triệu lần! Lúc này dùng kết nối dài là phù hợp nhất, tức là duy trì một kết nối dài với mỗi người tiêu thụ dịch vụ là được, có thể tổng cộng chỉ khoảng 100 kết nối. Sau đó trực tiếp dựa trên kết nối dài để giao tiếp bất đồng bộ NIO, có thể chịu được các yêu cầu đồng thời cao.

Kết nối dài, nói cho dễ hiểu, là sau khi thiết lập kết nối thì có thể liên tục gửi yêu cầu, không cần thiết lập lại kết nối.

![dubbo-keep-connection](diagram:distributed-system/dubbo-serialization-protocol/dubbo-keep-connection)

Còn kết nối ngắn thì mỗi lần trước khi gửi yêu cầu cần phải thiết lập lại một kết nối.

![dubbo-not-keep-connection](diagram:distributed-system/dubbo-serialization-protocol/dubbo-not-keep-connection)

-   Giao thức rmi `rmi://`

Giao thức RMI được hiện thực bằng java.rmi.\* tiêu chuẩn của JDK, dùng kết nối ngắn kiểu chặn (blocking) và cách tuần tự hóa tiêu chuẩn của JDK. Nhiều kết nối ngắn, phù hợp với trường hợp số lượng consumer và provider xấp xỉ nhau, phù hợp với truyền tệp, thường ít dùng.

-   Giao thức hessian `hessian://`

Giao thức Hessian 1 dùng để tích hợp các dịch vụ Hessian; tầng dưới Hessian dùng giao tiếp Http, dùng Servlet để công bố dịch vụ, Dubbo mặc định nhúng Jetty làm server. Đi theo giao thức tuần tự hóa hessian, nhiều kết nối ngắn, phù hợp với trường hợp số lượng provider còn nhiều hơn số lượng consumer, phù hợp với truyền tệp, thường ít dùng.

-   Giao thức http `http://`

Giao thức gọi từ xa dựa trên biểu mẫu HTTP, được hiện thực bằng HttpInvoker của Spring. Đi theo tuần tự hóa biểu mẫu.

-   Giao thức thrift `thrift://`

Giao thức thrift mà dubbo hiện đang hỗ trợ là bản mở rộng của giao thức gốc thrift, trên nền giao thức gốc đã thêm một số thông tin header bổ sung, ví dụ service name, magic number, v.v.

-   webservice `webservice://`

Giao thức gọi từ xa dựa trên WebService, được hiện thực dựa trên frontend-simple và transports-http của Apache CXF. Đi theo tuần tự hóa văn bản SOAP.

-   Giao thức memcached `memcached://`

Giao thức RPC được hiện thực dựa trên memcached.

-   Giao thức redis `redis://`

Giao thức RPC được hiện thực dựa trên Redis.

-   Giao thức rest `rest://`

Hỗ trợ gọi REST được hiện thực dựa trên API REST tiêu chuẩn của Java là JAX-RS 2.0 (viết tắt của Java API for RESTful Web Services).

-   Giao thức gPRC `grpc://`

Dubbo bắt đầu hỗ trợ giao thức gRPC từ phiên bản 2.7.5; với các lập trình viên dự định dùng giao tiếp HTTP/2, hoặc muốn tận dụng các khả năng mà gRPC mang lại như Stream, áp lực ngược (backpressure), lập trình Reactive, đều có thể cân nhắc bật giao thức gRPC.

### Các giao thức tuần tự hóa mà Dubbo hỗ trợ

Dubbo hỗ trợ nhiều giao thức tuần tự hóa như hession, tuần tự hóa nhị phân của Java, json, tuần tự hóa văn bản SOAP. Nhưng hessian là giao thức tuần tự hóa mặc định của nó.

### Hãy nói về cấu trúc dữ liệu của Hessian

Cơ chế tuần tự hóa đối tượng của Hessian có 8 kiểu nguyên thủy:

-   Dữ liệu nhị phân nguyên thủy
-   boolean
-   64-bit date (ngày tháng dưới dạng giá trị mili giây 64 bit)
-   64-bit double
-   32-bit int
-   64-bit long
-   null
-   string mã hóa UTF-8

Ngoài ra còn có 3 kiểu đệ quy:

-   list for lists and arrays
-   map for maps and dictionaries
-   object for objects

Còn có một kiểu đặc biệt:

-   ref: dùng để biểu diễn tham chiếu tới đối tượng dùng chung.

### Vì sao PB có hiệu quả cao nhất?

Thực ra PB có hiệu năng tốt như vậy chủ yếu nhờ hai điểm: **thứ nhất**, nó dùng trình biên dịch proto, tự động thực hiện tuần tự hóa và giải tuần tự hóa, tốc độ rất nhanh, nhanh hơn `XML` và `JSON` khoảng `20~100` lần; **thứ hai**, hiệu quả nén dữ liệu của nó tốt, tức là dữ liệu sau khi tuần tự hóa có kích thước nhỏ. Vì kích thước nhỏ nên khi truyền sẽ được tối ưu về băng thông và tốc độ.
