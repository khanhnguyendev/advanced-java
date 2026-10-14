---
source:
  locale: zh
  slug: dubbo-rpc-design
  hash: 'sha256:v1:c4a46b71bb0958cd1bdaf7585f866269a6172d53df9d78d21b9bc3ce7021c3ca'
status: machine
translatedAt: '2026-10-14'
---
# Thiết kế một framework RPC tương tự Dubbo

## Câu hỏi phỏng vấn

Làm thế nào để tự thiết kế một framework RPC tương tự Dubbo?

## Tâm lý người phỏng vấn

Nói thật, câu hỏi này thực ra cùng một đạo lý với việc hỏi bạn làm thế nào để tự thiết kế một MQ, chỉ kiểm tra hai điều:

-   Bạn có hiểu rất sâu về nguyên lý của một framework RPC nào đó hay không.
-   Bạn có thể suy nghĩ từ tổng thể về việc thiết kế một framework RPC như thế nào hay không, kiểm tra năng lực thiết kế hệ thống của bạn.

## Phân tích câu trả lời

Thực ra khi bị hỏi câu này, ít nhất bạn không được tỏ ra yếu thế, vì đây là phổ cập kiến thức, tôi không thể giảng sâu cho bạn về phân tích mã nguồn Kafka hay phân tích mã nguồn Dubbo, huống chi dù tôi có giảng, bạn muốn thực sự tiêu hóa, hiểu và hấp thụ thì ít nhất cũng phải sau cả tháng.

Vì vậy tôi đưa ra cho mọi người một đề xuất: gặp loại câu hỏi này, ít nhất hãy bắt đầu từ nguyên lý của các framework tương tự mà bạn hiểu, tự nói tham chiếu theo nguyên lý của Dubbo, bạn thiết kế thử xem; lấy ví dụ, Dubbo chẳng phải có nhiều tầng như vậy sao? Hơn nữa mỗi tầng làm gì, bạn đại khái có biết không? Vậy thì cứ theo mạch đó mà nói đại khái, ít nhất bạn không được ngơ ngác, như vậy sẽ tốt hơn những người vừa lên đã ngơ ngác, chẳng nói được gì.

Lấy một ví dụ, tôi nói với mọi người một hướng trả lời đơn giản nhất:

-   Vừa lên là dịch vụ của bạn phải đi đăng ký ở trung tâm đăng ký dịch vụ (service registry) đúng không, bạn có phải có một trung tâm đăng ký dịch vụ để lưu thông tin của từng dịch vụ, có thể dùng zookeeper để làm, đúng không.
-   Sau đó consumer của bạn cần đến trung tâm đăng ký dịch vụ để lấy thông tin dịch vụ tương ứng, đúng không, hơn nữa mỗi dịch vụ có thể tồn tại trên nhiều máy.
-   Tiếp theo bạn phải phát một yêu cầu rồi, phát thế nào? Tất nhiên là dựa trên proxy động, bạn hướng tới API để lấy một proxy động, proxy động này chính là một proxy cục bộ của API, rồi proxy này sẽ tìm ra địa chỉ máy tương ứng với dịch vụ.
-   Sau đó tìm máy nào để gửi yêu cầu? Chắc chắn phải có một thuật toán cân bằng tải, ví dụ đơn giản nhất có thể là round-robin ngẫu nhiên, đúng không.
-   Tiếp theo tìm được một máy, là có thể gửi yêu cầu cho nó; vấn đề thứ nhất là gửi thế nào? Bạn có thể nói dùng netty, kiểu nio; vấn đề thứ hai là gửi dữ liệu định dạng gì? Bạn có thể nói dùng giao thức tuần tự hóa (serialization) hessian, hoặc cái khác, đúng không. Rồi yêu cầu đi qua.
-   Phía server cũng như vậy, cần sinh một proxy động cho dịch vụ của bạn, lắng nghe một cổng mạng nào đó, rồi proxy code dịch vụ cục bộ của bạn. Khi nhận được yêu cầu thì gọi code dịch vụ tương ứng, đúng không.

Đây là hướng suy nghĩ về một framework RPC cơ bản nhất, chưa nói bạn có nền tảng kỹ thuật giỏi đến đâu, thì ít nhất hướng suy nghĩ đơn giản nhất này bạn đưa ra trước được không?
