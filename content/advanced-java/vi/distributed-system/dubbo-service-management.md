---
source:
  locale: zh
  slug: dubbo-service-management
  hash: 'sha256:v1:dc54de255dd785769aa3598fdb67176f25e44e482ee89adefbf27d7fec5d2e91'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để quản trị dịch vụ dựa trên Dubbo

## Câu hỏi phỏng vấn

Làm thế nào để thực hiện quản trị dịch vụ, suy giảm dịch vụ (fallback), thử lại khi thất bại và thử lại khi hết thời gian chờ (timeout) dựa trên Dubbo?

## Tâm lý người phỏng vấn

Quản trị dịch vụ: nếu hỏi bạn câu này, thực ra là xem bạn có tư tưởng **quản trị dịch vụ** hay không, vì đây là vấn đề mà người đã làm microservices phức tạp chắc chắn sẽ gặp.

**Suy giảm dịch vụ**: đây là một chủ đề bắt buộc phải có trong hệ thống phân tán phức tạp, vì các hệ thống phân tán gọi qua gọi lại lẫn nhau, bất kỳ hệ thống nào gặp sự cố mà bạn không suy giảm dịch vụ thì cả hệ thống sụp đổ luôn? Vậy thì quá tệ rồi.

**Thử lại khi thất bại**: trong hệ thống phân tán, yêu cầu mạng thường xuyên như vậy, nếu vì vấn đề mạng mà vô tình thất bại một lần thì có phải nên thử lại không?

**Thử lại khi hết thời gian chờ**: giống như trên, nếu vô tình mạng chậm một chút, bị hết thời gian chờ, thì thử lại như thế nào?

## Phân tích câu trả lời

### Quản trị dịch vụ

#### 1. Tự động sinh chuỗi gọi

Một hệ thống phân tán lớn, hay nói theo kiến trúc microservices đang thịnh hành hiện nay, **hệ thống phân tán gồm một lượng lớn dịch vụ**. Vậy các dịch vụ này gọi lẫn nhau như thế nào? Chuỗi gọi là gì? Nói thật, về sau gần như không ai nắm rõ nữa, vì dịch vụ thực sự quá nhiều, có thể là vài trăm thậm chí vài nghìn dịch vụ.

Vậy thì trong hệ thống phân tán xây dựng dựa trên Dubbo, cần tự động ghi lại các lời gọi giữa các dịch vụ, sau đó tự động **sinh ra quan hệ phụ thuộc và chuỗi gọi giữa các dịch vụ**, làm thành một sơ đồ rồi hiển thị ra, mọi người mới nhìn thấy được, đúng không.

![dubbo-service-invoke-road](asset:distributed-system/dubbo-service-management/dubbo-service-invoke-road.png)

#### 2. Thống kê áp lực truy cập và thời gian xử lý của dịch vụ

Cần tự động thống kê **số lần gọi và độ trễ truy cập giữa các API và các dịch vụ**, và phải chia thành hai cấp độ.

-   Một cấp độ là mức độ chi tiết theo API, tức là mỗi API của mỗi dịch vụ mỗi ngày được gọi bao nhiêu lần, độ trễ yêu cầu ở ba mức TP50/TP90/TP99 lần lượt là bao nhiêu;
-   Cấp độ thứ hai là bắt đầu từ cổng vào đầu nguồn, một chuỗi yêu cầu hoàn chỉnh đi qua vài chục dịch vụ để hoàn thành một yêu cầu, mỗi ngày toàn bộ chuỗi chạy bao nhiêu lần, TP50/TP90/TP99 của độ trễ yêu cầu toàn chuỗi lần lượt là bao nhiêu.

Khi đã nắm được những thứ này, sau đó mới có thể xem áp lực của hệ thống hiện tại chủ yếu nằm ở đâu, mở rộng và tối ưu thế nào.

#### 3. Các nội dung khác

-   Phân tầng dịch vụ (tránh phụ thuộc vòng)
-   Giám sát và cảnh báo khi chuỗi gọi thất bại
-   Xác thực quyền của dịch vụ
-   Giám sát tính sẵn sàng của từng dịch vụ (tỷ lệ gọi API thành công? mấy số 9? 99.99%, 99.9%, 99%)

### Suy giảm dịch vụ

Ví dụ dịch vụ A gọi dịch vụ B, kết quả dịch vụ B sập, dịch vụ A thử lại gọi dịch vụ B vài lần vẫn không được, thì suy giảm dịch vụ ngay, đi theo một logic dự phòng, trả phản hồi cho người dùng.

Lấy một ví dụ, chúng ta có API `HelloService` . `HelloServiceImpl` có hiện thực cụ thể của API đó.

```java
public interface HelloService {
   void sayHello();
}

public class HelloServiceImpl implements HelloService {
    public void sayHello() {
        System.out.println("hello world......");
    }
}
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:dubbo="http://code.alibabatech.com/schema/dubbo"
    xsi:schemaLocation="http://www.springframework.org/schema/beans        http://www.springframework.org/schema/beans/spring-beans.xsd        http://code.alibabatech.com/schema/dubbo        http://code.alibabatech.com/schema/dubbo/dubbo.xsd">

    <dubbo:application name="dubbo-provider" />
    <dubbo:registry address="zookeeper://127.0.0.1:2181" />
    <dubbo:protocol name="dubbo" port="20880" />
    <dubbo:service interface="com.zhss.service.HelloService" ref="helloServiceImpl" timeout="10000" />
    <bean id="helloServiceImpl" class="com.zhss.service.HelloServiceImpl" />

</beans>

<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:dubbo="http://code.alibabatech.com/schema/dubbo"
    xsi:schemaLocation="http://www.springframework.org/schema/beans        http://www.springframework.org/schema/beans/spring-beans.xsd        http://code.alibabatech.com/schema/dubbo        http://code.alibabatech.com/schema/dubbo/dubbo.xsd">

    <dubbo:application name="dubbo-consumer"  />

    <dubbo:registry address="zookeeper://127.0.0.1:2181" />

    <dubbo:reference id="fooService" interface="com.test.service.FooService"  timeout="10000" check="false" mock="return null">
    </dubbo:reference>

</beans>

```

Khi gọi API thất bại, có thể dùng `mock` để trả về null thống nhất.

Giá trị của mock cũng có thể sửa thành true, rồi hiện thực một lớp Mock cùng đường dẫn với API, quy tắc đặt tên là hậu tố "tên API + `Mock` ". Sau đó hiện thực logic suy giảm dịch vụ của riêng mình trong lớp Mock.

```java
public class HelloServiceMock implements HelloService {
    public void sayHello() {
        // logic suy giảm dịch vụ
    }
}
```

### Thử lại khi thất bại và thử lại khi hết thời gian chờ

Cái gọi là thử lại khi thất bại, tức là consumer gọi provider mà thất bại, ví dụ ném ngoại lệ, thì lúc này có thể thử lại, hoặc gọi bị hết thời gian chờ cũng có thể thử lại. Cấu hình như sau:

```xml
<dubbo:reference id="xxxx" interface="xx" check="true" async="false" retries="3" timeout="2000"/>
```

Lấy một ví dụ.

API của một dịch vụ nào đó mất 5s, phía bạn không thể cứ ngồi chờ, sau khi bạn cấu hình timeout, tôi chờ 2s mà chưa trả về thì tôi rút luôn, không thể chờ bạn mãi.

Có thể kết hợp với kịch bản cụ thể của công ty các bạn để nói bạn đặt các tham số này như thế nào:

-   `timeout` : thường đặt là `200ms` , chúng ta cho rằng không thể quá `200ms` mà vẫn chưa trả về.
-   `retries` : đặt retries, thường là với yêu cầu đọc, ví dụ bạn muốn truy vấn một dữ liệu, bạn có thể đặt retries, nếu lần đầu không đọc được, báo lỗi, thì thử lại đúng số lần chỉ định, cố gắng đọc lại.
