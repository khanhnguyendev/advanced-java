---
source:
  locale: zh
  slug: dubbo-spi
  hash: 'sha256:v1:59472b08c3ee8536d60fd53369e13023afbbeb28af46e32896df076812e81b8d'
status: machine
translatedAt: '2026-10-14'
---
# Cơ chế SPI của Dubbo

## Câu hỏi phỏng vấn

Tư tưởng spi của Dubbo là gì?

## Tâm lý người phỏng vấn

Tiếp tục đi sâu thôi, các thứ mang tính cơ bản ở phía trước đã hỏi xong, xác định bạn hẳn là đều ổn, hiểu một số điều cơ bản của Dubbo, thì hỏi một câu khó hơn một chút, đó là spi: trước hết hỏi bạn spi là gì? Sau đó hỏi spi của Dubbo được hiện thực như thế nào?

Thực ra là xem bạn nắm Dubbo đến đâu.

## Phân tích câu trả lời

### spi là gì?

spi, nói đơn giản, là `service provider interface` , nói thẳng ra nghĩa là gì? Ví dụ bạn có một API, hiện API này có 3 lớp hiện thực, vậy khi hệ thống chạy thì đối với API này rốt cuộc chọn lớp hiện thực nào? Điều này cần đến spi: cần **dựa theo cấu hình chỉ định** hoặc **cấu hình mặc định** để **tìm lớp hiện thực tương ứng**, nạp vào, rồi dùng đối tượng instance của lớp hiện thực đó.

Lấy một ví dụ.

Bạn có một API A. A1/A2/A3 lần lượt là các hiện thực khác nhau của API A. Bạn cấu hình `接口 A = 实现 A2` (API A = hiện thực A2), thì khi hệ thống thực sự chạy sẽ nạp cấu hình của bạn, dùng hiện thực A2 để khởi tạo một đối tượng nhằm cung cấp dịch vụ.

Cơ chế spi thường dùng ở đâu? **Kịch bản mở rộng bằng plugin**, ví dụ bạn phát triển một framework mã nguồn mở cho người khác dùng, nếu bạn muốn người khác tự viết một plugin, cắm vào framework mã nguồn mở của bạn để mở rộng một chức năng nào đó, thì lúc này tư tưởng spi được dùng đến.

### Biểu hiện của tư tưởng spi trong Java

Biểu hiện kinh điển của tư tưởng spi, mọi người bình thường đều đang dùng, ví dụ jdbc.

Java định nghĩa một bộ API jdbc, nhưng Java không cung cấp lớp hiện thực của jdbc.

Nhưng thực tế khi dự án chạy, cần dùng những lớp hiện thực nào của API jdbc? Thông thường, chúng ta phải **dựa vào cơ sở dữ liệu mình dùng**, ví dụ mysql thì bạn đưa `mysql-jdbc-connector.jar` vào; oracle thì bạn đưa `oracle-jdbc-connector.jar` vào.

Khi hệ thống chạy, gặp chỗ bạn dùng API jdbc, nó sẽ dùng ở tầng dưới lớp hiện thực do jar mà bạn đã đưa vào cung cấp.

### Tư tưởng spi của Dubbo

Dubbo cũng dùng tư tưởng spi, nhưng không dùng cơ chế spi của jdk mà tự hiện thực một bộ cơ chế spi.

```java
Protocol protocol = ExtensionLoader.getExtensionLoader(Protocol.class).getAdaptiveExtension();
```

API Protocol, khi hệ thống chạy, Dubbo sẽ xác định nên chọn lớp hiện thực nào của API Protocol này để khởi tạo đối tượng và dùng.

Nó sẽ đi tìm một Protocol mà bạn đã cấu hình, nạp lớp hiện thực Protocol mà bạn cấu hình vào jvm, rồi khởi tạo đối tượng, cứ dùng lớp hiện thực Protocol đó của bạn là được.

Dòng code ở trên được dùng rất nhiều trong Dubbo, tức là với rất nhiều thành phần, đều giữ lại một API và nhiều hiện thực, rồi khi hệ thống chạy thì động dựa theo cấu hình để tìm lớp hiện thực tương ứng. Nếu bạn không cấu hình, thì đi theo hiện thực mặc định, không vấn đề gì.

```java
@SPI("dubbo")
public interface Protocol {

    int getDefaultPort();

    @Adaptive
    <T> Exporter<T> export(Invoker<T> invoker) throws RpcException;

    @Adaptive
    <T> Invoker<T> refer(Class<T> type, URL url) throws RpcException;

    void destroy();

}
```

Trong jar của chính Dubbo, trong tệp `/META_INF/dubbo/internal/com.alibaba.dubbo.rpc.Protocol`:

```xml
dubbo=com.alibaba.dubbo.rpc.protocol.dubbo.DubboProtocol
http=com.alibaba.dubbo.rpc.protocol.http.HttpProtocol
hessian=com.alibaba.dubbo.rpc.protocol.hessian.HessianProtocol
```

Như vậy là đã thấy cơ chế spi của Dubbo mặc định vận hành ra sao rồi: thực ra chính là API Protocol, `@SPI("dubbo")` nói rằng cung cấp lớp hiện thực qua cơ chế SPI, lớp hiện thực được tìm trong tệp cấu hình bằng dubbo làm key mặc định, tên tệp cấu hình giống với tên đầy đủ (fully qualified name) của API, dùng dubbo làm key có thể tìm ra lớp hiện thực mặc định là `com.alibaba.dubbo.rpc.protocol.dubbo.DubboProtocol` .

Nếu muốn thay thế động lớp hiện thực mặc định, cần dùng `@Adaptive`; trong API Protocol có hai phương thức được gắn annotation `@Adaptive`, nghĩa là hai API đó sẽ được hiện thực bằng proxy.

Nghĩa là gì?

Ví dụ API Protocol này có hai phương thức được đánh dấu bằng annotation `@Adaptive`, khi chạy sẽ sinh lớp proxy cho Protocol, bên trong hai phương thức đó của lớp proxy sẽ có code proxy, code proxy sẽ khi chạy động lấy key dựa theo protocol trong url, mặc định là dubbo, bạn cũng có thể tự chỉ định; nếu bạn chỉ định key khác thì sẽ lấy được instance của lớp hiện thực khác.

### Tự mở rộng các thành phần trong Dubbo như thế nào

Dưới đây nói về cách tự mở rộng các thành phần trong Dubbo.

Tự viết một dự án, loại có thể đóng gói thành jar, trong thư mục `src/main/resources` của nó, tạo một `META-INF/services`, bên trong đặt một tệp tên là `com.alibaba.dubbo.rpc.Protocol` , trong tệp thêm một dòng `my=com.bingo.MyProtocol` . Tự đưa jar vào nexus private server.

Sau đó tự tạo một dự án `dubbo provider`, trong dự án này phụ thuộc vào jar mà bạn đã tạo, rồi cấu hình trong tệp cấu hình spring:

```xml
<dubbo:protocol name=”my” port=”20000” />
```

Khi provider khởi động, sẽ nạp dòng cấu hình `my=com.bingo.MyProtocol` trong jar của chúng ta, tiếp đó sẽ dựa theo cấu hình của bạn để dùng MyProtocol mà bạn đã định nghĩa. Đây chỉ là giải thích đơn giản; qua cách trên, bạn có thể thay thế rất nhiều thành phần bên trong Dubbo, chỉ cần ném jar của bạn vào rồi cấu hình một chút là xong.

![dubbo-spi](asset:distributed-system/dubbo-spi/dubbo-spi.png)

Dubbo cung cấp rất nhiều điểm mở rộng tương tự như trên, tức là nếu bạn muốn mở rộng một thứ gì, chỉ cần tự viết một jar, để dự án consumer hoặc provider của bạn phụ thuộc vào jar đó, trong jar của bạn cấu hình sẵn tệp tương ứng với tên API ở thư mục chỉ định, bên trong dùng `key=实现类` (key = lớp hiện thực).

Sau đó với thành phần tương ứng, giống như `<dubbo:protocol>`, dùng lớp hiện thực tương ứng với key của bạn để hiện thực một API nào đó; bạn có thể tự mở rộng các chức năng của Dubbo, cung cấp hiện thực của riêng bạn.

-----
