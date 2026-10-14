---
source:
  locale: zh
  slug: distributed-session
  hash: 'sha256:v1:b209c76c073320513e15b846e34fceb488972bed6eb658f82422807c0c64e649'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để triển khai Session phân tán?

## Câu hỏi phỏng vấn

Khi triển khai cụm (cluster), Session phân tán được triển khai như thế nào?

## Tâm lý người phỏng vấn

Người phỏng vấn đã hỏi bạn một loạt vấn đề về cách Dubbo hoạt động. Biết dùng Dubbo là có thể biến một hệ thống nguyên khối thành hệ thống phân tán, và sau khi phân tán thì một loạt vấn đề kéo theo, lớn nhất là **giao dịch phân tán**, **tính idempotent của API**, **khóa phân tán**, và cuối cùng là **Session phân tán**.

Tất nhiên vấn đề trong hệ thống phân tán đâu chỉ có chừng này, rất nhiều, độ phức tạp rất cao, ở đây chỉ nói vài vấn đề thường gặp, cũng là vài vấn đề hay được hỏi khi phỏng vấn.

## Phân tích câu trả lời

Session là gì? Trình duyệt có Cookie, trong một khoảng thời gian Cookie này luôn tồn tại, và mỗi lần gửi yêu cầu đều kèm theo một `jsessionid cookie` đặc biệt, dựa vào đó, phía server có thể duy trì một vùng Session tương ứng, bên trong có thể đặt một ít dữ liệu.

Nhìn chung, chỉ cần bạn chưa đóng trình duyệt, Cookie vẫn còn thì Session tương ứng vẫn còn, nhưng nếu Cookie mất thì Session cũng mất. Thường gặp ở những thứ như giỏ hàng, hay lưu trạng thái đăng nhập.

Không nói nhiều về điều này, ai hiểu Java đều nên biết.

Trong hệ thống nguyên khối, dùng Session như vậy thì không có vấn đề, nhưng nếu là hệ thống phân tán thì sao, nhiều dịch vụ như vậy, trạng thái Session được duy trì ở đâu?

Thực ra có rất nhiều cách, nhưng những cách phổ biến thường dùng là các cách sau:

### Hoàn toàn không dùng Session

Dùng JWT Token để lưu danh tính người dùng, rồi lấy các thông tin khác từ cơ sở dữ liệu hoặc cache. Như vậy yêu cầu được phân phối đến server nào cũng không quan trọng.

### Tomcat + Redis

Cách này khá tiện, code dùng Session vẫn giống như trước, vẫn dựa trên hỗ trợ Session gốc của Tomcat, rồi dùng một thứ gọi là `Tomcat RedisSessionManager`, để tất cả các Tomcat mà chúng ta triển khai đều lưu dữ liệu Session vào Redis.

Cấu hình trong tệp cấu hình của Tomcat:

```xml
<Valve className="com.orangefunction.tomcat.redissessions.RedisSessionHandlerValve" />

<Manager className="com.orangefunction.tomcat.redissessions.RedisSessionManager"
         host="{redis.host}"
         port="{redis.port}"
         database="{redis.dbnum}"
         maxInactiveInterval="60"/>
```

Sau đó chỉ định host và port của Redis là ok.

```xml
<Valve className="com.orangefunction.tomcat.redissessions.RedisSessionHandlerValve" />
<Manager className="com.orangefunction.tomcat.redissessions.RedisSessionManager"
	 sentinelMaster="mymaster"
	 sentinels="<sentinel1-ip>:26379,<sentinel2-ip>:26379,<sentinel3-ip>:26379"
	 maxInactiveInterval="60"/>
```

Cũng có thể dùng cách trên để lưu dữ liệu Session dựa trên cụm Redis có tính sẵn sàng cao được hỗ trợ bởi Redis Sentinel, cách nào cũng ok.

### Spring Session + Redis

Cách thứ hai nói ở trên sẽ ghép nối chặt (tight coupling) với container Tomcat, nếu tôi muốn chuyển Web container sang Jetty thì chẳng lẽ phải cấu hình lại toàn bộ cho Jetty?

Vì cách Tomcat + Redis ở trên dùng tốt nhưng **phụ thuộc nặng vào Web container**, không dễ chuyển code sang Web container khác, nhất là nếu bạn đổi technology stack thì sao? Ví dụ đổi sang Spring Cloud hoặc Spring Boot thì sao?

Vì vậy hiện nay cách tốt hơn vẫn là dựa trên giải pháp trọn gói của Java, tức là Spring. Spring về cơ bản bao trọn phần lớn các framework chúng ta cần dùng, Spring Cloud làm microservices, Spring Boot làm scaffold, nên dùng Spring Session là một lựa chọn rất tốt.

Cấu hình trong pom.xml:

```xml
<dependency>
  <groupId>org.springframework.session</groupId>
  <artifactId>spring-session-data-redis</artifactId>
  <version>1.2.1.RELEASE</version>
</dependency>
<dependency>
  <groupId>redis.clients</groupId>
  <artifactId>jedis</artifactId>
  <version>2.8.1</version>
</dependency>
```

Cấu hình trong tệp cấu hình Spring:

```xml
<bean id="redisHttpSessionConfiguration"
     class="org.springframework.session.data.redis.config.annotation.web.http.RedisHttpSessionConfiguration">
    <property name="maxInactiveIntervalInSeconds" value="600"/>
</bean>

<bean id="jedisPoolConfig" class="redis.clients.jedis.JedisPoolConfig">
    <property name="maxTotal" value="100" />
    <property name="maxIdle" value="10" />
</bean>

<bean id="jedisConnectionFactory"
      class="org.springframework.data.redis.connection.jedis.JedisConnectionFactory" destroy-method="destroy">
    <property name="hostName" value="${redis_hostname}"/>
    <property name="port" value="${redis_port}"/>
    <property name="password" value="${redis_pwd}" />
    <property name="timeout" value="3000"/>
    <property name="usePool" value="true"/>
    <property name="poolConfig" ref="jedisPoolConfig"/>
</bean>
```

Cấu hình trong web.xml:

```xml
<filter>
    <filter-name>springSessionRepositoryFilter</filter-name>
    <filter-class>org.springframework.web.filter.DelegatingFilterProxy</filter-class>
</filter>
<filter-mapping>
    <filter-name>springSessionRepositoryFilter</filter-name>
    <url-pattern>/*</url-pattern>
</filter-mapping>
```

Code ví dụ:

```java
@RestController
@RequestMapping("/test")
public class TestController {

    @RequestMapping("/putIntoSession")
    public String putIntoSession(HttpServletRequest request, String username) {
        request.getSession().setAttribute("name",  "leo");
        return "ok";
    }

    @RequestMapping("/getFromSession")
    public String getFromSession(HttpServletRequest request, Model model){
        String name = request.getSession().getAttribute("name");
        return name;
    }
}
```

Code trên là ok, cấu hình cho Spring Session lưu dữ liệu Session dựa trên Redis, rồi cấu hình một filter của Spring Session, như vậy các thao tác liên quan đến Session đều được giao cho Spring Session quản lý. Sau đó trong code, dùng thao tác Session gốc, tức là trực tiếp dựa trên Spring Session để lấy dữ liệu từ Redis.

Có rất nhiều cách để triển khai session phân tán, những gì tôi nói chỉ là vài cách khá phổ biến. Tomcat + Redis được dùng khá nhiều ở giai đoạn đầu, nhưng ghép nối chặt vào Tomcat; những năm gần đây thì triển khai thông qua Spring Session.
