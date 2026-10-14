---
source:
  locale: zh
  slug: distributed-system-interview
  hash: 'sha256:v1:5334f47996272bdfa100d3a6d1cc8efbbe0c209a140bea37660c0c35a76fa174'
status: machine
translatedAt: '2026-10-14'
---
# Chuỗi câu hỏi phỏng vấn dồn dập về hệ thống phân tán

Có một số bạn trước đây chủ yếu làm trong các ngành truyền thống hoặc các dự án gia công, luôn làm việc ở những công ty nhỏ, kỹ thuật dùng vẫn khá đơn giản. Họ có một vấn đề chung là hầu như chưa từng làm hệ thống phân tán. Hiện nay các công ty internet thường làm hệ thống phân tán, và mọi người không phải là đang làm các hệ thống phân tán tầng thấp như hệ thống lưu trữ phân tán Hadoop HDFS, hệ thống tính toán phân tán Hadoop MapReduce / Spark, hay hệ thống tính toán luồng phân tán Storm.

Hệ thống nghiệp vụ phân tán là việc tách một hệ thống lớn vốn được phát triển bằng Java thành **nhiều hệ thống con**, các hệ thống con gọi lẫn nhau để tạo thành một hệ thống lớn hoàn chỉnh. Giả sử trước đây bạn làm một hệ thống OA, bên trong gồm mô-đun phân quyền, mô-đun nhân viên, mô-đun nghỉ phép, mô-đun tài chính; tất cả nằm trong một dự án, các mô-đun gọi lẫn nhau, triển khai trên 1 máy. Bây giờ nếu bạn tách hệ thống này ra thành 4 hệ thống là hệ thống phân quyền, hệ thống nhân viên, hệ thống nghỉ phép, hệ thống tài chính, tức 4 dự án, triển khai lần lượt trên 4 máy. Khi một yêu cầu đến, để hoàn tất yêu cầu này, hệ thống nhân viên gọi hệ thống phân quyền, gọi hệ thống nghỉ phép, gọi hệ thống tài chính; 4 hệ thống mỗi hệ thống hoàn thành một phần công việc, và chỉ sau khi cả 4 hệ thống làm xong thì yêu cầu mới được coi là hoàn tất.

![simple-distributed-system-oa](asset:distributed-system/distributed-system-interview/simple-distributed-system-oa.png)

> Mấy năm gần đây Spring Cloud bắt đầu nổi lên và trở nên phổ biến, nhưng mới chỉ thịnh hành, chưa bắt đầu được dùng rộng rãi; hiện nay thứ được dùng phổ biến là Dubbo, vì vậy ở đây cũng chủ yếu nói về Dubbo.

Người phỏng vấn (interviewer) có thể sẽ hỏi bạn các câu hỏi sau.

## Vì sao phải tách hệ thống?

-   Vì sao phải tách hệ thống? Tách hệ thống như thế nào? Sau khi tách không dùng Dubbo có được không? Dubbo và thrift khác nhau ở điểm nào?

## Framework dịch vụ phân tán

-   Hãy nói về nguyên lý hoạt động của Dubbo? Trung tâm đăng ký dịch vụ (service registry) sập thì có thể tiếp tục liên lạc được không?
-   Dubbo hỗ trợ những giao thức tuần tự hóa (serialization) nào? Hãy nói về cấu trúc dữ liệu của Hessian? Bạn có biết PB không? Vì sao PB có hiệu quả cao nhất?
-   Dubbo có những chiến lược cân bằng tải và chiến lược tính sẵn sàng cao nào? Còn chiến lược proxy động thì sao?
-   Tư tưởng SPI của Dubbo là gì?
-   Làm thế nào để thực hiện quản trị dịch vụ, suy giảm dịch vụ (fallback), thử lại khi thất bại và thử lại khi hết thời gian chờ (timeout) dựa trên Dubbo?
-   Tính idempotent của API dịch vụ phân tán được thiết kế như thế nào (ví dụ không được trừ tiền hai lần)?
-   Làm thế nào để đảm bảo tính thứ tự của các yêu cầu tới API dịch vụ phân tán?
-   Làm thế nào để tự thiết kế một framework RPC tương tự Dubbo?

## Khóa phân tán

-   Dùng Redis để thiết kế khóa phân tán như thế nào? Dùng zk để thiết kế khóa phân tán có được không? Trong hai cách triển khai khóa phân tán này, cách nào có hiệu quả cao hơn?

## Giao dịch phân tán

-   Bạn có hiểu về giao dịch phân tán không? Các bạn giải quyết vấn đề giao dịch phân tán như thế nào? Nếu TCC gặp sự cố mạng không kết nối được thì làm thế nào? XA đảm bảo tính nhất quán như thế nào?

## Session phân tán

-   Khi triển khai theo cụm (cluster), Session phân tán được hiện thực như thế nào?
