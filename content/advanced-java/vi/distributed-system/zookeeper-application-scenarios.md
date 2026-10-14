---
source:
  locale: zh
  slug: zookeeper-application-scenarios
  hash: 'sha256:v1:9c46d35141383904d3be684f7821056b85a0901b620dd812ace25d7709b0e148'
status: machine
translatedAt: '2026-10-14'
---
# Các tình huống sử dụng Zookeeper

## Câu hỏi phỏng vấn

Zookeeper có những tình huống sử dụng nào?

## Tâm lý người phỏng vấn

Chủ đề đang trao đổi là hệ thống phân tán. Sau khi hỏi xong một số vấn đề liên quan đến Dubbo, người phỏng vấn đã xác nhận bạn có hiểu biết cơ bản về framework dịch vụ phân tán/framework RPC. Vì vậy họ có thể bắt đầu chuyển sang các vấn đề khác liên quan đến phân tán.

Khóa phân tán (distributed lock) là thứ rất hay dùng. Khi phát triển hệ thống Java, hệ thống phân tán, bạn có thể gặp một số tình huống cần đến nó. Loại khóa phân tán phổ biến nhất được triển khai dựa trên ZooKeeper.

Nói thật, câu hỏi này thường chỉ để xem bạn có hiểu ZooKeeper hay không, vì ZooKeeper là một hệ thống nền tảng rất phổ biến trong hệ thống phân tán. Câu hỏi hay gặp nhất là: các tình huống sử dụng của ZooKeeper là gì? Nhằm xem bạn có biết một vài tình huống sử dụng cơ bản hay không. Tuy nhiên, nếu đào sâu thì ZooKeeper tất nhiên có thể được hỏi rất sâu.

## Phân tích câu trả lời

Nhìn chung, các tình huống sử dụng của ZooKeeper như sau. Tôi chỉ nêu vài ví dụ đơn giản, bạn nói được vài cái là đủ:

-   Phối hợp phân tán
-   Khóa phân tán
-   Quản lý siêu dữ liệu/thông tin cấu hình
-   HA (tính sẵn sàng cao)

### Phối hợp phân tán

Đây là một cách dùng rất kinh điển của ZooKeeper. Nói đơn giản, giả sử hệ thống A gửi một yêu cầu đến mq, rồi hệ thống B tiêu thụ thông điệp và xử lý. Vậy hệ thống A làm sao biết kết quả xử lý của hệ thống B? Dùng ZooKeeper là có thể thực hiện việc phối hợp giữa các hệ thống phân tán. Sau khi gửi yêu cầu, hệ thống A có thể **đăng ký một listener cho giá trị của một node nào đó** trên ZooKeeper. Khi hệ thống B xử lý xong thì sửa giá trị của node đó trên ZooKeeper, hệ thống A lập tức nhận được thông báo, giải quyết trọn vẹn vấn đề.

![zookeeper-distributed-coordination](diagram:distributed-system/zookeeper-application-scenarios/zookeeper-distributed-coordination)

### Khóa phân tán

Lấy một ví dụ. Có hai thao tác sửa đổi liên tiếp trên cùng một dữ liệu, hai máy đồng thời nhận được yêu cầu, nhưng chỉ có thể một máy thực hiện xong trước rồi máy còn lại mới thực hiện. Lúc này có thể dùng khóa phân tán của ZooKeeper: một máy sau khi nhận yêu cầu sẽ lấy một khóa phân tán trên ZooKeeper trước, tức là tạo một znode, rồi mới thực hiện thao tác; sau đó máy kia cũng **thử tạo** znode đó, kết quả là không tạo được vì đã bị người khác tạo, nên chỉ có thể chờ, đến khi máy đầu tiên thực hiện xong thì mình mới thực hiện.

![zookeeper-distributed-lock-demo](diagram:distributed-system/zookeeper-application-scenarios/zookeeper-distributed-lock-demo)

### Quản lý siêu dữ liệu/thông tin cấu hình

ZooKeeper có thể dùng để quản lý thông tin cấu hình của rất nhiều hệ thống. Ví dụ Kafka, Storm và nhiều hệ thống phân tán khác đều chọn ZooKeeper để quản lý siêu dữ liệu và thông tin cấu hình, kể cả trung tâm đăng ký dịch vụ (service registry) của Dubbo chẳng phải cũng hỗ trợ ZooKeeper đó sao?

![zookeeper-meta-data-manage](diagram:distributed-system/zookeeper-application-scenarios/zookeeper-meta-data-manage)

### HA (tính sẵn sàng cao)

Cái này khá phổ biến. Ví dụ nhiều hệ thống dữ liệu lớn như Hadoop, HDFS, YARN đều chọn phát triển cơ chế HA dựa trên ZooKeeper, tức là một **tiến trình quan trọng thường được chạy thành hai bản chính và dự phòng**, khi tiến trình chính sập thì ZooKeeper lập tức phát hiện và chuyển sang tiến trình dự phòng.

![zookeeper-active-standby](diagram:distributed-system/zookeeper-application-scenarios/zookeeper-active-standby)
