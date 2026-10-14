---
source:
  locale: zh
  slug: micro-services-technology-stack
  hash: 'sha256:v1:41e97a60f74cb09a02298727eba86ebf6ce2ca522412a1b01d094f5285fe25b8'
status: machine
translatedAt: '2026-10-14'
---
# Technology stack của microservices

## Technology stack

### Phát triển microservices

Vai trò: phát triển dịch vụ nhanh chóng.

-   Spring
-   Spring MVC
-   Spring Boot

[Spring](https://spring.io/) hiện là một framework không thể thiếu đối với lập trình viên JavaWeb; Spring Boot đơn giản hóa phần cấu hình khi phát triển Spring và hiện cũng là framework phát triển chủ đạo trong ngành.

### Đăng ký và khám phá microservices

Vai trò: khám phá dịch vụ, đăng ký dịch vụ, quản lý tập trung các dịch vụ.

#### Eureka

-   Eureka Server : cung cấp dịch vụ đăng ký dịch vụ; sau khi khởi động, các node sẽ đăng ký trong Eureka Server.
-   Eureka Client : đơn giản hóa các thao tác tương tác với Eureka Server.
-   Spring Cloud Netflix : [GitHub](https://github.com/spring-cloud/spring-cloud-netflix), [Tài liệu](https://cloud.spring.io/spring-cloud-netflix/reference/html/)

#### Zookeeper

> ZooKeeper is a centralized service for maintaining configuration information, naming, providing distributed synchronization, and providing group services.

[Zookeeper](https://github.com/apache/zookeeper) là một dịch vụ tập trung, dùng để duy trì thông tin cấu hình, đặt tên, cung cấp đồng bộ hóa phân tán và cung cấp dịch vụ nhóm.

#### Điểm khác nhau giữa Zookeeper và Eureka

Zookeeper đảm bảo CP, Eureka đảm bảo AP:

-   C: tính nhất quán của dữ liệu;
-   A: tính sẵn sàng của dịch vụ;
-   P: khả năng chịu lỗi của dịch vụ đối với sự cố phân vùng mạng. Trong bất kỳ hệ thống phân tán nào, ba đặc tính này không thể được thỏa mãn đồng thời, tối đa chỉ thỏa mãn được hai.

### Quản lý cấu hình microservices

Vai trò: quản lý thống nhất, tập trung thông tin cấu hình của một hoặc nhiều dịch vụ.

#### [Disconf](https://github.com/knightliao/disconf)

Distributed Configuration Management Platform (nền tảng quản lý cấu hình phân tán), là một thành phần/nền tảng dùng chung chuyên về quản lý cấu hình của các hệ thống phân tán, cung cấp dịch vụ quản lý cấu hình thống nhất, và là một giải pháp cấu hình phân tán thống nhất hoàn chỉnh dựa trên zookeeper.

#### [SpringCloudConfig](https://github.com/spring-cloud/spring-cloud-config)

#### [Apollo](https://github.com/ctripcorp/apollo)

Apollo (Apollo, tên thần thoại Hy Lạp) là trung tâm cấu hình phân tán do bộ phận framework của Ctrip nghiên cứu phát triển; nó có thể quản lý tập trung cấu hình của ứng dụng ở các môi trường và cụm khác nhau, sau khi cấu hình được sửa đổi có thể đẩy theo thời gian thực tới phía ứng dụng, đồng thời có các đặc tính như phân quyền và quản trị quy trình chuẩn mực, được dùng trong các tình huống quản lý cấu hình microservices.

### Xác thực và phân quyền

Vai trò: theo các quy tắc hoặc chính sách bảo mật do hệ thống đặt ra, người dùng có thể truy cập và chỉ được truy cập các tài nguyên mà mình được cấp quyền, không hơn không kém.

#### [Spring Security](https://spring.io/projects/spring-security)

#### [Apache Shiro](http://shiro.apache.org/)

> Apache Shiro™ is a powerful and easy-to-use Java security framework that performs authentication, authorization, cryptography, and session management. With Shiro’s easy-to-understand API, you can quickly and easily secure any application – from the smallest mobile applications to the largest web and enterprise applications.

### Xử lý theo lô

Vai trò: xử lý hàng loạt dữ liệu hoặc công việc cùng loại

#### [Spring Batch](https://spring.io/projects/spring-batch)

### Tác vụ định thời

> Vai trò: làm gì đó theo lịch định sẵn.

#### [Quartz](http://www.quartz-scheduler.org/)

### Gọi microservices (giao thức)

> Giao thức giao tiếp

#### Rest

-   Gửi yêu cầu Rest qua HTTP/HTTPS để trao đổi dữ liệu

#### RPC

-   Remote Procedure Call
-   Là một giao thức cho phép yêu cầu dịch vụ từ chương trình trên máy tính từ xa thông qua mạng mà không cần hiểu công nghệ mạng bên dưới. RPC không phụ thuộc vào giao thức truyền tải mạng cụ thể, tcp, udp v.v. đều được.

#### [gRPC](https://www.grpc.io/)

> A high-performance, open-source universal RPC framework

Cái gọi là framework RPC (remote procedure call, lời gọi thủ tục từ xa) thực chất là cung cấp một cơ chế để các ứng dụng có thể giao tiếp với nhau, đồng thời cũng tuân theo mô hình server/client. Khi sử dụng, client gọi API do server cung cấp giống như gọi một hàm cục bộ.

#### RMI

-   Remote Method Invocation
-   Gọi thuần Java

### Gọi API của dịch vụ

> Vai trò: giao tiếp giữa nhiều dịch vụ

#### [Feign(HTTP)](https://github.com/OpenFeign/feign)

Các microservices của Spring Cloud Netflix đều được cung cấp dưới dạng API HTTP, vì vậy có thể dùng HttpClient của Apache hoặc RestTemplate của Spring để gọi; còn Feign là một HTTP client dùng tiện lợi hơn, dùng giống như gọi phương thức của chính dự án mình, không cảm nhận được là đang gọi phương thức từ xa.

### Ngắt mạch dịch vụ

> Vai trò: khi yêu cầu đạt tới một ngưỡng nhất định thì không cho yêu cầu tiếp tục.

#### [Hystrix](https://github.com/Netflix/Hystrix)

> Hystrix is a latency and fault tolerance library designed to isolate points of access to remote systems, services and 3rd party libraries, stop cascading failure and enable resilience in complex distributed systems where failure is inevitable.

#### [Sentinel](https://github.com/alibaba/Sentinel)

> A lightweight powerful flow control component enabling reliability and monitoring for microservices. (thư viện Java nhẹ để kiểm soát lưu lượng, ngắt mạch và suy giảm dịch vụ (fallback))

### Cân bằng tải của dịch vụ

> Vai trò: giảm áp lực lên dịch vụ, tăng thông lượng

#### [Ribbon](https://github.com/Netflix/ribbon)

> Spring Cloud Ribbon là một công cụ cân bằng tải phía client dựa trên HTTP và TCP, được triển khai dựa trên Netflix Ribbon

#### [Nginx](https://github.com/nginx/nginx)

Nginx (engine x) là một web server HTTP và reverse proxy hiệu năng cao, đồng thời cũng cung cấp dịch vụ IMAP/POP3/SMTP

#### Điểm khác nhau giữa Nginx và Ribbon

Nginx thuộc loại cân bằng tải phía server, Ribbon thuộc loại cân bằng tải phía client. Nginx tác động lên Tomcat, còn Ribbon tác động lên các lời gọi giữa các dịch vụ (RPC).

### Hàng đợi thông điệp

> Vai trò: tách rời (decoupling) nghiệp vụ, xử lý dữ liệu theo kiểu bất đồng bộ

#### [Kafka](http://kafka.apache.org/)

#### [RabbitMQ](https://www.rabbitmq.com/)

#### [RocketMQ](http://rocketmq.apache.org/)

#### [activeMQ](http://activemq.apache.org/)

### Thu thập log (elk)

> Vai trò: thu thập log của các dịch vụ để cung cấp phân tích log, chân dung người dùng v.v.

#### [Elasticsearch](https://github.com/elastic/elasticsearch)

#### [Logstash](https://github.com/elastic/logstash)

#### [Kibana](https://github.com/elastic/kibana)

### API gateway

> Vai trò: yêu cầu từ bên ngoài được chặn và xử lý qua API gateway, rồi mới được chuyển tiếp tới dịch vụ thật

#### [Zuul](https://github.com/Netflix/zuul)

> Zuul is a gateway service that provides dynamic routing, monitoring, resiliency, security, and more.

### Giám sát dịch vụ

> Vai trò: hiển thị tình trạng hoạt động của từng dịch vụ (CPU, bộ nhớ, lượng truy cập v.v.) dưới dạng trực quan hoặc không trực quan

#### [Zabbix](https://github.com/jjmartres/Zabbix)

#### [Nagios](https://www.nagios.org/)

#### [Metrics](https://metrics.dropwizard.io)

### Truy vết chuỗi gọi dịch vụ

> Vai trò: làm rõ quan hệ gọi giữa các dịch vụ

#### [Zipkin](https://github.com/openzipkin/zipkin)

#### [Brave](https://github.com/openzipkin/brave)

### Lưu trữ dữ liệu

> Vai trò: lưu trữ dữ liệu

#### Cơ sở dữ liệu quan hệ

##### [MySql](https://www.mysql.com/)

##### [Oracle](https://www.oracle.com/index.html)

##### [MsSQL](https://docs.microsoft.com/zh-cn/sql/?view=sql-server-ver15)

##### [PostgreSql](https://www.postgresql.org/)

#### Cơ sở dữ liệu phi quan hệ

##### [Mongodb](https://www.mongodb.com/)

##### [Elasticsearch](https://github.com/elastic/elasticsearch)

### Bộ nhớ đệm

> Vai trò: lưu trữ dữ liệu

#### [redis](https://redis.io/)

### Sharding

> Vai trò: giải pháp phân mảnh cơ sở dữ liệu và bảng.

#### [ShardingSphere](http://shardingsphere.apache.org/)

#### [Mycat](http://www.mycat.io/)

### Triển khai dịch vụ

> Vai trò: triển khai, đưa dự án lên môi trường chạy thật và tích hợp liên tục một cách nhanh chóng.

#### [Docker](http://www.docker.com/)

#### [Jenkins](https://jenkins.io/zh/)

#### [Kubernetes(K8s)](https://kubernetes.io/)

#### [Mesos](http://mesos.apache.org/)
