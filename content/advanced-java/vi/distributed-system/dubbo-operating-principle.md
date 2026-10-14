---
source:
  locale: zh
  slug: dubbo-operating-principle
  hash: 'sha256:v1:6d880021d6b82d8915339933efc6bc36fccb10276bd820e806023eb123109eb9'
status: machine
translatedAt: '2026-10-14'
---
# Nguyên lý hoạt động của Dubbo

## Câu hỏi phỏng vấn

Hãy nói về nguyên lý hoạt động của Dubbo? Trung tâm đăng ký dịch vụ (service registry) sập thì có thể tiếp tục liên lạc được không? Hãy nói về quy trình của một yêu cầu RPC?

## Tâm lý người phỏng vấn

MQ, ES, Redis, Dubbo: mở đầu sẽ hỏi bạn một số **câu hỏi mang tính tư duy**, **nguyên lý**, ví dụ nguyên lý kiến trúc tính sẵn sàng cao của Kafka, nguyên lý kiến trúc phân tán của ES, nguyên lý mô hình luồng của Redis, nguyên lý hoạt động của Dubbo; sau đó là một số vấn đề có thể gặp trong môi trường production, vì mỗi công nghệ sau khi đưa vào đều có thể gặp một số vấn đề trên production; rồi thêm một số câu tổng hợp, tức là thiết kế hệ thống, ví dụ yêu cầu bạn thiết kế một MQ, một công cụ tìm kiếm, một bộ nhớ đệm (cache), một framework RPC, v.v.

Đã bắt đầu nói về hệ thống phân tán thì tự nhiên trọng tâm là nói về Dubbo trước, dù sao Dubbo hiện là chuẩn framework RPC của hệ thống phân tán ở phần lớn các công ty trên thực tế, và dựa trên Dubbo cũng có thể xây dựng cả một bộ kiến trúc microservices, nhưng cần tự phát triển rất nhiều.

Tất nhiên từ năm ngoái Spring Cloud rất hot, hiện nay nhiều công ty bắt đầu chuyển sang Spring Cloud, dù sao Spring Cloud là một thứ kiểu trọn bộ của kiến trúc microservices. Nhưng vì nhiều công ty vẫn đang dùng Dubbo nên Dubbo chắc chắn vẫn là trọng điểm của phỏng vấn hiện nay, hơn nữa Dubbo bây giờ đã khởi động lại cộng đồng mã nguồn mở để bảo trì và đã được tặng cho Apache, tương lai hẳn vẫn có một thị phần và vị thế nhất định.

Đã nói về Dubbo thì chắc chắn bắt đầu từ nguyên lý của Dubbo: trước tiên bạn nói về kiến trúc mà Dubbo dùng để hỗ trợ gọi phân tán RPC, sau đó nói về việc với một yêu cầu RPC thì Dubbo hoàn thành như thế nào, đúng không.

## Phân tích câu trả lời

### Nguyên lý hoạt động của Dubbo

-   Tầng thứ nhất: tầng service, tầng API, để nhà cung cấp dịch vụ (provider) và người tiêu thụ (consumer) hiện thực
-   Tầng thứ hai: tầng config, tầng cấu hình, chủ yếu dùng để cấu hình Dubbo theo nhiều cách
-   Tầng thứ ba: tầng proxy, tầng proxy dịch vụ, dù là consumer hay provider thì Dubbo đều sinh proxy cho bạn, giao tiếp mạng được thực hiện giữa các proxy
-   Tầng thứ tư: tầng registry, tầng đăng ký dịch vụ, chịu trách nhiệm đăng ký và phát hiện dịch vụ
-   Tầng thứ năm: tầng cluster, tầng cụm (cluster), đóng gói định tuyến và cân bằng tải của nhiều provider, kết hợp nhiều instance thành một dịch vụ
-   Tầng thứ sáu: tầng monitor, tầng giám sát, giám sát số lần gọi và thời gian gọi của các API RPC
-   Tầng thứ bảy: tầng protocol, tầng gọi từ xa, đóng gói lời gọi RPC
-   Tầng thứ tám: tầng exchange, tầng trao đổi thông tin, đóng gói mô hình yêu cầu và phản hồi, chuyển đồng bộ thành bất đồng bộ
-   Tầng thứ chín: tầng transport, tầng truyền tải mạng, trừu tượng hóa mina và netty thành API thống nhất
-   Tầng thứ mười: tầng serialize, tầng tuần tự hóa dữ liệu

### Quy trình hoạt động

-   Bước 1: provider đăng ký với trung tâm đăng ký dịch vụ
-   Bước 2: consumer đăng ký (subscribe) dịch vụ từ trung tâm đăng ký dịch vụ, trung tâm đăng ký dịch vụ sẽ thông báo cho consumer về các dịch vụ đã đăng ký
-   Bước 3: consumer gọi provider
-   Bước 4: consumer và provider đều thông báo bất đồng bộ cho trung tâm giám sát

![dubbo-operating-principle](diagram:distributed-system/dubbo-operating-principle/dubbo-operating-principle)

### Trung tâm đăng ký dịch vụ sập thì có thể tiếp tục liên lạc được không?

Được, vì ngay khi khởi tạo ban đầu, consumer sẽ **kéo về bộ nhớ đệm cục bộ** các thông tin như địa chỉ của provider, nên trung tâm đăng ký dịch vụ sập thì vẫn có thể tiếp tục liên lạc.
