---
source:
  locale: zh
  slug: how-eureka-enable-service-discovery-and-service-registration
  hash: 'sha256:v1:ddb0b069769848aeeafde5dffe2919895f279dd61942a57c6a014a7f312b8ccc'
status: machine
translatedAt: '2026-10-14'
---
# Một số quy trình gọi chính của thành phần service discovery Eureka

## Mở đầu

Kiến trúc microservices đang phổ biến hiện nay đang thay đổi cách chúng ta xây dựng ứng dụng, từ một dịch vụ hệ thống nguyên khối (monolith) duy nhất chuyển sang các dịch vụ ngày càng nhỏ hơn có thể triển khai độc lập (gọi là `微服务` (microservices)), cùng nhau tạo nên ứng dụng của chúng ta. Khi xử lý một nghiệp vụ, việc gọi giữa nhiều dịch vụ là không thể tránh khỏi. Giả sử dịch vụ A muốn truy cập dịch vụ B được triển khai trên một máy chủ khác, thì điều kiện tiên quyết là dịch vụ A phải biết địa chỉ IP của máy chứa dịch vụ B và cổng tương ứng của dịch vụ. Cách đơn giản nhất là để dịch vụ A tự duy trì một bản cấu hình của dịch vụ B (gồm địa chỉ IP, cổng và các thông tin khác), nhưng cách này có vài nhược điểm rõ rệt: khi số lượng dịch vụ cần gọi tăng lên thì các tệp cấu hình sẽ được duy trì thế nào; thiếu tính linh hoạt, vì nếu dịch vụ B đổi địa chỉ IP hoặc cổng thì dịch vụ A cũng phải sửa tệp cấu hình tương ứng; và việc mở rộng hay thu hẹp dịch vụ một cách động cũng bất tiện.
Một giải pháp tốt hơn là `服务发现（Service Discovery）` (khám phá dịch vụ). Nó trừu tượng hóa ra một trung tâm đăng ký dịch vụ (service registry): khi một dịch vụ mới lên mạng, dịch vụ đó đăng ký IP và cổng của mình vào trung tâm đăng ký, trung tâm sẽ kiểm tra nhịp tim (heartbeat) định kỳ đối với các dịch vụ đã đăng ký, và khi phát hiện trạng thái dịch vụ bất thường thì loại dịch vụ đó khỏi trung tâm đăng ký và cho ngừng hoạt động. Dịch vụ A chỉ cần lấy thông tin của dịch vụ B từ trung tâm đăng ký; ngay cả khi IP hoặc cổng của dịch vụ B thay đổi, dịch vụ A cũng không cần sửa gì, nhờ vậy các dịch vụ được tách rời ở một mức độ nhất định. Hiện nay trong ngành có nhiều bản triển khai mã nguồn mở của khám phá dịch vụ, chẳng hạn [zookeeper](https://github.com/apache/zookeeper) của `apache`, [eureka](https://github.com/Netflix/eureka) của `Netflix`, [consul](https://github.com/hashicorp/consul) của `hashicorp` và [etcd](https://github.com/etcd-io/etcd) của `CoreOS`.

## Eureka là gì

`Eureka` được định nghĩa trên [GitHub](https://github.com/Netflix/eureka) như sau

> Eureka is a REST (Representational State Transfer) based service that is primarily used in the AWS cloud for locating services for the purpose of load balancing and failover of middle-tier servers.

At Netflix, Eureka is used for the following purposes apart from playing a critical part in mid-tier load balancing.

`Eureka` do công ty [Netflix](https://www.netflix.com) mở mã nguồn, được thiết kế theo mô hình Client / Server, là thành phần đăng ký và khám phá dịch vụ xây dựng trên giao thức http và phát triển bằng Restful API, cung cấp đầy đủ chức năng đăng ký dịch vụ và khám phá dịch vụ, có thể tích hợp liền mạch với `Spring Cloud`. Phía Server đóng vai trò trung tâm đăng ký dịch vụ, chủ yếu cung cấp cho phía Client các chức năng như đăng ký và khám phá dịch vụ, duy trì thông tin đăng ký dịch vụ của Client, đồng thời kiểm tra nhịp tim định kỳ các dịch vụ đã đăng ký và loại chúng khỏi hệ thống khi không khả dụng. Client có thể lấy thông tin đăng ký của các dịch vụ mà mình phụ thuộc thông qua Server, từ đó hoàn tất việc gọi giữa các dịch vụ. Đáng tiếc là từ [github wiki](https://github.com/Netflix/eureka/wiki) chính thức có thể thấy phiên bản 2.0 không còn được mở mã nguồn. Nhưng điều đó không ảnh hưởng đến việc chúng ta tìm hiểu sâu về nó, vì suy cho cùng đăng ký dịch vụ và khám phá dịch vụ tương đối cơ bản và phổ biến, tư tưởng của các framework mã nguồn mở khác cũng tương tự.

## Trung tâm đăng ký dịch vụ Eureka Server

Chúng ta thêm các dependency liên quan của `Eureka Server` vào dự án, rồi thêm annotation `@EnableEurekaServer` vào lớp khởi động là có thể dùng nó làm trung tâm đăng ký dịch vụ. Sau khi khởi động dịch vụ và truy cập trang, ta thấy như sau:

![eureka-server-homepage.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-homepage)

Tiếp theo chúng ta thêm hai module `service-provider` và `service-consumer`, thêm annotation `@EnableEurekaClient` vào lớp khởi động và chỉ định địa chỉ trung tâm đăng ký là `Eureka Server` vừa khởi động. Truy cập lại sẽ thấy cả hai dịch vụ đã được đăng ký.

![eureka-instance-registered-currently.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-instance-registered-currently)

Có thể thấy `Eureka` rất dễ sử dụng, chỉ cần thêm vài annotation và cấu hình là đã có đăng ký dịch vụ và khám phá dịch vụ. Tiếp theo hãy xem nó thực hiện các chức năng này như thế nào.

### Đăng ký dịch vụ

Trung tâm đăng ký dịch vụ cung cấp API đăng ký dịch vụ, được gọi khi một dịch vụ mới khởi động để thực hiện đăng ký, hoặc khi kiểm tra nhịp tim phát hiện trạng thái dịch vụ bất thường thì thay đổi trạng thái của dịch vụ tương ứng. Đăng ký dịch vụ là gửi một yêu cầu `POST` kèm thông tin instance hiện tại đến phương thức `addInstance` của lớp `ApplicationResource`.

![eureka-server-applicationresource-addinstance.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-applicationresource-addinstance)

Có thể thấy phương thức này gọi phương thức `register` của lớp `PeerAwareInstanceRegistryImpl`, phương thức này gồm hai bước chính:

1. Gọi phương thức `register` của lớp cha `AbstractInstanceRegistry` để đăng ký dịch vụ hiện tại vào trung tâm đăng ký dịch vụ
2. Gọi phương thức `replicateToPeers` để đồng bộ thông tin đăng ký dịch vụ sang các node `Eureka Server` khác theo cách bất đồng bộ (asynchronous)

Thông tin đăng ký dịch vụ được lưu trong một `map` lồng nhau, cấu trúc như sau:

![eureka-server-registry-structure.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-registry-structure)

`key` của `map` tầng thứ nhất là tên ứng dụng (tương ứng với `SERVICE-PROVIDER` trong `Demo`), `key` của `map` tầng thứ hai là tên instance tương ứng của ứng dụng (tương ứng với `mghio-mbp:service-provider:9999` trong `Demo`). Một ứng dụng có thể có nhiều instance. Quy trình gọi chính được thể hiện trong hình dưới đây:

![eureka-server-register-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-register-sequence-chart)

### Gia hạn dịch vụ

Việc gia hạn dịch vụ được nhà cung cấp dịch vụ (chẳng hạn `service-provider` trong `Demo`) gọi định kỳ, tương tự nhịp tim, dùng để báo cho trung tâm đăng ký `Eureka Server` biết trạng thái của mình, tránh bị `Eureka Server` coi là dịch vụ đã hỏng rồi loại khỏi hệ thống. Gia hạn dịch vụ là gửi một yêu cầu `PUT` kèm thông tin instance hiện tại đến phương thức `renewLease` của lớp `InstanceResource`.

![eureka-server-instanceresource-renew.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-instanceresource-renew)

Vào phương thức `renew` của `PeerAwareInstanceRegistryImpl` có thể thấy các bước gia hạn dịch vụ về cơ bản giống đăng ký dịch vụ: trước hết cập nhật trạng thái trên node `Eureka Server` hiện tại, sau khi gia hạn thành công thì đồng bộ trạng thái sang các node `Eureka Server` khác theo cách bất đồng bộ. Quy trình gọi chính được thể hiện trong hình dưới đây:

![eureka-server-renew-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-renew-sequence-chart)

### Hủy dịch vụ

Khi nhà cung cấp dịch vụ (chẳng hạn `service-provider` trong `Demo`) dừng dịch vụ, nó sẽ gửi yêu cầu báo cho trung tâm đăng ký `Eureka Server` loại nó khỏi hệ thống và cho ngừng hoạt động, để bên tiêu thụ dịch vụ không gọi phải một dịch vụ không còn tồn tại từ trung tâm đăng ký. Hủy dịch vụ là gửi một yêu cầu `DELETE` kèm thông tin instance hiện tại đến phương thức `cancelLease` của lớp `InstanceResource` để thực hiện loại dịch vụ khỏi hệ thống.

![eureka-server-instanceresource-cancellease.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-instanceresource-cancellease)

Vào phương thức `cancel` của `PeerAwareInstanceRegistryImpl` có thể thấy các bước gia hạn dịch vụ về cơ bản giống đăng ký dịch vụ: trước hết loại dịch vụ đó khỏi node `Eureka Server` hiện tại, sau khi hủy thành công thì đồng bộ trạng thái sang các node `Eureka Server` khác theo cách bất đồng bộ. Quy trình gọi chính được thể hiện trong hình dưới đây:

![eureka-server-cancellease-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-cancellease-sequence-chart)

### Loại bỏ dịch vụ

Với việc loại bỏ dịch vụ, trung tâm đăng ký `Eureka Server` khi khởi động sẽ chạy một luồng nền (daemon thread) `evictionTimer` để định kỳ (mặc định `60` giây) thực hiện kiểm tra dịch vụ. Tiêu chí xác định là những dịch vụ quá một khoảng thời gian nhất định không thực hiện `Renew`, thời gian hết hạn mặc định là `90` giây, tức là khi một dịch vụ đã đăng ký không gia hạn (Renew) với trung tâm đăng ký `Eureka Server` trong vòng `90` giây thì sẽ bị loại khỏi trung tâm đăng ký và cho ngừng hoạt động. Thời gian hết hạn có thể sửa qua cấu hình `eureka.instance.leaseExpirationDurationInSeconds`, chu kỳ kiểm tra định kỳ có thể sửa qua cấu hình `eureka.server.evictionIntervalTimerInMs`. Quy trình gọi chính được thể hiện trong hình dưới đây:

![eureka-server-evict-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-evict-sequence-chart)

## Nhà cung cấp dịch vụ

Đối với nhà cung cấp dịch vụ (chẳng hạn dịch vụ `service-provider` trong `Demo`), có ba loại thao tác chính là `服务注册（Register）` (đăng ký dịch vụ), `服务续约（Renew）` (gia hạn dịch vụ) và `服务下线（Cancel）` (hủy dịch vụ). Tiếp theo hãy xem ba thao tác này được thực hiện như thế nào.

### Đăng ký dịch vụ

Một dịch vụ muốn cung cấp dịch vụ ra bên ngoài thì trước hết phải đăng ký thông tin liên quan vào trung tâm đăng ký `Eureka Server`. Điều kiện tiên quyết để thực hiện bước này là bạn đã cấu hình `eureka.client.register-with-eureka=true`, giá trị mặc định là `true`. Bản thân trung tâm đăng ký không cần tự đăng ký vào chính nó nên cần đặt cấu hình này thành `false`. Việc gọi này khá đơn giản, quy trình gọi chính được thể hiện trong hình dưới đây:

![eureka-service-provider-register-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-register-sequence-chart)

### Gia hạn dịch vụ

Việc gia hạn dịch vụ là nhịp tim do nhà cung cấp dịch vụ phát đi định kỳ (mặc định `30` giây), chủ yếu để báo cho trung tâm đăng ký `Eureka Server` biết trạng thái của mình bình thường và vẫn đang hoạt động, có thể sửa qua cấu hình `eureka.instance.lease-renewal-interval-in-seconds`. Tất nhiên điều kiện tiên quyết để gia hạn dịch vụ là đã cấu hình `eureka.client.register-with-eureka=true` để dịch vụ được đăng ký vào trung tâm đăng ký. Quy trình gọi chính được thể hiện trong hình dưới đây:

![eureka-service-provider-renew-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-provider-renew-sequence-chart)

### Hủy dịch vụ

Khi dịch vụ của nhà cung cấp dừng, nó phải gửi yêu cầu `DELETE` để báo cho trung tâm đăng ký `Eureka Server` biết mình đã ngừng hoạt động, để trung tâm đăng ký loại nó khỏi hệ thống, tránh việc bên tiêu thụ dịch vụ lấy phải một dịch vụ không khả dụng từ trung tâm đăng ký. Quá trình này thực hiện khá đơn giản: thêm annotation `@PreDestroy` vào phương thức `shutdown` của lớp `DiscoveryClient`, khi dịch vụ dừng sẽ tự động kích hoạt việc loại dịch vụ khỏi hệ thống và thực thi logic hủy dịch vụ. Quy trình gọi chính được thể hiện trong hình dưới đây:

![eureka-service-provider-cancel-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-provider-cancel-sequence-chart)

## Bên tiêu thụ dịch vụ

Nếu bên tiêu thụ dịch vụ ở đây không cần được các dịch vụ khác gọi thì thực ra chỉ liên quan đến hai thao tác, đó là `获取服务列表（Fetch）` (lấy danh sách dịch vụ) và `更新服务列表（Update）` (cập nhật danh sách dịch vụ) từ trung tâm đăng ký. Nếu đồng thời cũng cần đăng ký vào trung tâm đăng ký để cung cấp dịch vụ ra bên ngoài thì các quy trình còn lại giống với nhà cung cấp dịch vụ nêu ở trên, không nhắc lại ở đây. Tiếp theo hãy xem hai thao tác này được thực hiện như thế nào.

### Lấy danh sách dịch vụ

Sau khi bên tiêu thụ dịch vụ khởi động, việc đầu tiên chắc chắn là lấy danh sách dịch vụ khả dụng từ trung tâm đăng ký `Eureka Server`, đồng thời cũng lưu một bản vào bộ nhớ đệm (cache) cục bộ. Thao tác lấy danh sách dịch vụ này được thực hiện khi lớp `DiscoverClient` được khởi tạo sau khi dịch vụ khởi động.

![eureka-service-consumer-fetchregistry.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-consumer-fetchregistry)

Có thể thấy điều kiện tiên quyết để thao tác lấy danh sách dịch vụ xảy ra là phải cấu hình `eureka.client.fetch-registry=true`, giá trị mặc định của cấu hình này là `true`. Quy trình gọi chính được thể hiện trong hình dưới đây:

![eureka-service-consumer-fetch-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-consumer-fetch-sequence-chart)

### Cập nhật danh sách dịch vụ

Từ quá trình `获取服务列表（Fetch）` (lấy danh sách dịch vụ) ở trên có thể biết rằng cục bộ cũng có lưu một bản, nên ở đây cần định kỳ đến trung tâm đăng ký `Eureka Server` để lấy cấu hình mới nhất của dịch vụ, rồi so sánh và cập nhật bộ nhớ đệm cục bộ. Khoảng thời gian cập nhật này có thể sửa qua cấu hình `eureka.client.registry-fetch-interval-seconds`, mặc định là `30` giây. Điều kiện tiên quyết để thực hiện bước cập nhật danh sách dịch vụ này là bạn đã cấu hình `eureka.client.register-with-eureka=true`, giá trị mặc định là `true`. Quy trình gọi chính được thể hiện trong hình dưới đây:

![eureka-service-consumer-update-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-consumer-update-sequence-chart)

## Tổng kết

Dự án trong công việc sử dụng stack công nghệ `Spring Cloud`, vốn có một bộ mã nguồn mở rất hoàn chỉnh để tích hợp `Eureka`, dùng rất tiện. Trước đây tôi chỉ thêm annotation và sửa vài thuộc tính cấu hình là xong một mạch, chưa tìm hiểu sâu cách triển khai trong mã nguồn. Bài viết này chủ yếu trình bày các quy trình và cách triển khai liên quan đến đăng ký dịch vụ, khám phá dịch vụ, giúp hiểu thêm một bước về thành phần khám phá dịch vụ `Eureka`.

---

Bài viết tham khảo

[Netflix Eureka](https://github.com/Netflix/eureka)

[Service Discovery in a Microservices Architecture](https://www.nginx.com/blog/service-discovery-in-a-microservices-architecture)
