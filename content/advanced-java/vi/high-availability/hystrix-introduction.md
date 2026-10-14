---
source:
  locale: zh
  slug: hystrix-introduction
  hash: 'sha256:v1:8265377e5efd6294d8f8f0b69af53d3e0b2e330ab324d056f91782b3833bb685'
status: machine
translatedAt: '2026-10-14'
---
# Xây dựng kiến trúc dịch vụ có tính sẵn sàng cao bằng Hystrix

Tham khảo [Hystrix Home](https://github.com/Netflix/Hystrix/wiki#what).

## Hystrix là gì?

Trong hệ thống phân tán, mỗi dịch vụ đều có thể gọi rất nhiều dịch vụ khác, những dịch vụ được gọi đó chính là **dịch vụ phụ thuộc**, đôi khi một số dịch vụ phụ thuộc gặp sự cố cũng là chuyện hoàn toàn bình thường.

Hystrix cho phép chúng ta kiểm soát các lời gọi giữa các dịch vụ trong hệ thống phân tán, bổ sung một số cơ chế **chịu lỗi** đối với **độ trễ khi gọi** hoặc **sự cố của dịch vụ phụ thuộc**.

Hystrix thực hiện **cô lập tài nguyên** đối với các dịch vụ phụ thuộc, từ đó ngăn sự cố của một dịch vụ phụ thuộc lan rộng ra trong tất cả các lời gọi dịch vụ phụ thuộc của toàn hệ thống; đồng thời Hystrix còn cung cấp cơ chế suy giảm dịch vụ (fallback) khi xảy ra sự cố.

**Tóm lại, Hystrix thông qua các phương pháp này giúp chúng ta nâng cao tính sẵn sàng và tính ổn định của hệ thống phân tán.**

## Lịch sử của Hystrix

Hystrix là một framework đảm bảo tính sẵn sàng cao. Nhóm API của Netflix (có thể xem là một website video như Youku hay iQiyi ở nước ngoài) bắt đầu từ năm 2011 thực hiện một số công việc nhằm nâng cao tính sẵn sàng và tính ổn định của hệ thống, Hystrix được phát triển ra từ thời điểm đó.

Đến năm 2012, Hystrix đã trở nên khá trưởng thành và ổn định, tại Netflix, ngoài nhóm API ra, rất nhiều nhóm khác cũng bắt đầu sử dụng Hystrix.

Cho đến nay, tại Netflix mỗi ngày có hàng tỷ lời gọi giữa các dịch vụ được thực hiện thông qua framework Hystrix, và Hystrix cũng đã giúp website Netflix nâng cao tính sẵn sàng và tính ổn định tổng thể.

[Tháng 11 năm 2018, Hystrix tuyên bố trên trang chủ Github của mình rằng sẽ không phát triển thêm tính năng mới, và khuyến nghị các nhà phát triển sử dụng các dự án mã nguồn mở khác vẫn còn hoạt động](https://github.com/Netflix/Hystrix/blob/master/README.md#hystrix-status). Việc chuyển sang chế độ bảo trì tuyệt nhiên không có nghĩa là Hystrix không còn giá trị. Ngược lại, Hystrix đã khơi nguồn cho rất nhiều ý tưởng và dự án tuyệt vời, phần kiến thức về tính sẵn sàng cao của chúng ta vẫn sẽ được giảng giải xoay quanh Hystrix.

## Nguyên tắc thiết kế của Hystrix

-   **Kiểm soát và bảo vệ chịu lỗi** đối với độ trễ khi gọi và lỗi khi gọi dịch vụ phụ thuộc.
-   Trong hệ thống phân tán phức tạp, ngăn sự cố của một dịch vụ phụ thuộc lan rộng ra toàn hệ thống. Ví dụ một dịch vụ gặp sự cố, khiến các dịch vụ khác cũng gặp sự cố theo.
-   Hỗ trợ `fail-fast` (thất bại nhanh) và phục hồi nhanh.
-   Hỗ trợ suy giảm dịch vụ êm dịu (graceful degradation).
-   Hỗ trợ giám sát, cảnh báo và các thao tác vận hành gần thời gian thực.

Lấy một ví dụ.

Có một hệ thống phân tán như sau, dịch vụ A phụ thuộc vào dịch vụ B, dịch vụ B phụ thuộc vào các dịch vụ C/D/E. Trong một hệ thống trưởng thành như vậy, ví dụ nhiều nhất có thể chỉ có 100 luồng tài nguyên. Trong điều kiện bình thường, 40 luồng gọi đồng thời dịch vụ C, 30 luồng gọi đồng thời dịch vụ D và 30 luồng gọi đồng thời dịch vụ E.

Gọi dịch vụ C chỉ cần 20ms, giờ vì dịch vụ C gặp sự cố, ví dụ bị trễ, hoặc sập, lúc này các luồng sẽ bị treo khoảng 2s. 40 luồng đều bị kẹt, do yêu cầu liên tục đổ vào, các luồng khác cũng được dùng để gọi dịch vụ C, và cũng sẽ bị kẹt. Điều này khiến tài nguyên luồng của dịch vụ B bị cạn kiệt, không thể nhận yêu cầu mới, thậm chí có thể do lượng lớn luồng liên tục vận hành mà tự mình sập. Ảnh hưởng này chắc chắn sẽ lan đến dịch vụ A, khiến dịch vụ A cũng sập theo.

![service-invoke-road](asset:high-availability/hystrix-introduction/service-invoke-road.png)

Hystrix có thể thực hiện cô lập tài nguyên, ví dụ giới hạn dịch vụ B chỉ có 40 luồng gọi dịch vụ C. Khi 40 luồng này bị treo, 60 luồng còn lại vẫn có thể gọi và làm việc bình thường. Nhờ đó đảm bảo toàn hệ thống không bị kéo sập.

## Các nguyên tắc thiết kế chi tiết hơn của Hystrix

-   Ngăn bất kỳ dịch vụ phụ thuộc nào làm cạn kiệt toàn bộ tài nguyên, ví dụ toàn bộ tài nguyên luồng trong tomcat.
-   Tránh việc yêu cầu xếp hàng và tồn đọng, dùng giới hạn lưu lượng (rate limiting) và `fail fast` để kiểm soát sự cố.
-   Cung cấp cơ chế suy giảm dịch vụ để đối phó với sự cố.
-   Dùng các kỹ thuật cô lập tài nguyên, ví dụ `bulkhead` (kỹ thuật cô lập theo khoang), `swimlane` (kỹ thuật làn bơi), `circuit breaker` (kỹ thuật bộ ngắt mạch) để hạn chế ảnh hưởng của sự cố ở bất kỳ dịch vụ phụ thuộc nào.
-   Thông qua các chức năng thống kê, giám sát, cảnh báo gần thời gian thực, nâng cao tốc độ phát hiện sự cố.
-   Thông qua chức năng **sửa đổi nóng** thuộc tính và cấu hình gần thời gian thực, nâng cao tốc độ xử lý và phục hồi sự cố.
-   Bảo vệ trước mọi tình huống sự cố của lời gọi dịch vụ phụ thuộc, chứ không chỉ riêng sự cố mạng.
