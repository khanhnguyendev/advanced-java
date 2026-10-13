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

Trong hệ thống phân tán, mỗi dịch vụ đều có thể gọi đến rất nhiều dịch vụ khác. Những dịch vụ bị gọi đó chính là **dịch vụ phụ thuộc**, và việc một số dịch vụ phụ thuộc gặp sự cố là chuyện hoàn toàn bình thường.

Hystrix cho phép chúng ta kiểm soát các lời gọi giữa các dịch vụ trong hệ thống phân tán, bổ sung một số **cơ chế chịu lỗi** đối với **độ trễ khi gọi** hoặc **sự cố của dịch vụ phụ thuộc**.

Hystrix thực hiện **cô lập tài nguyên** đối với các dịch vụ phụ thuộc, nhờ đó ngăn sự cố của một dịch vụ phụ thuộc lan sang tất cả các lời gọi dịch vụ phụ thuộc khác trong toàn hệ thống; đồng thời Hystrix còn cung cấp cơ chế hạ cấp dịch vụ fallback khi có sự cố.

**Tóm lại, Hystrix giúp chúng ta nâng cao tính khả dụng và độ ổn định của hệ thống phân tán thông qua các phương pháp này.**

## Lịch sử của Hystrix

Hystrix là một framework đảm bảo tính sẵn sàng cao. Nhóm API của Netflix (có thể coi là một website video tương tự Youku hay iQiyi ở nước ngoài) bắt đầu thực hiện một số công việc nhằm nâng cao tính khả dụng và độ ổn định của hệ thống từ năm 2011, và Hystrix được phát triển từ đó.

Đến năm 2012, Hystrix đã khá hoàn thiện và ổn định; tại Netflix, ngoài nhóm API, nhiều nhóm khác cũng bắt đầu sử dụng Hystrix.

Cho đến ngày nay, mỗi ngày Netflix có hàng tỷ lượt gọi giữa các dịch vụ được thực hiện thông qua framework Hystrix, và Hystrix cũng giúp website Netflix nâng cao tính khả dụng và độ ổn định tổng thể.

[Vào tháng 11 năm 2018, Hystrix thông báo trên trang chủ GitHub rằng sẽ không phát triển thêm tính năng mới và khuyến nghị lập trình viên sử dụng các dự án mã nguồn mở khác vẫn còn hoạt động](https://github.com/Netflix/Hystrix/blob/master/README.md#hystrix-status). Việc chuyển sang chế độ bảo trì không có nghĩa là Hystrix không còn giá trị. Ngược lại, Hystrix đã truyền cảm hứng cho rất nhiều ý tưởng và dự án tuyệt vời, và phần kiến thức về tính sẵn sàng cao của chúng ta vẫn sẽ được giảng giải xoay quanh Hystrix.

## Các nguyên tắc thiết kế của Hystrix

-   **Kiểm soát và bảo vệ chịu lỗi** đối với độ trễ và lỗi xảy ra khi gọi các dịch vụ phụ thuộc.
-   Trong hệ thống phân tán phức tạp, ngăn sự cố của một dịch vụ phụ thuộc lan ra toàn hệ thống. Ví dụ một dịch vụ gặp sự cố khiến các dịch vụ khác cũng gặp sự cố theo.
-   Hỗ trợ `fail-fast` (thất bại nhanh) và phục hồi nhanh.
-   Hỗ trợ hạ cấp dịch vụ nhẹ nhàng (graceful degradation) bằng fallback.
-   Hỗ trợ giám sát, cảnh báo và các thao tác vận hành gần như theo thời gian thực.

Hãy lấy một ví dụ.

Có một hệ thống phân tán như sau: dịch vụ A phụ thuộc vào dịch vụ B, dịch vụ B phụ thuộc vào các dịch vụ C/D/E. Trong một hệ thống hoàn chỉnh như vậy, giả sử tối đa chỉ có 100 luồng tài nguyên. Trong điều kiện bình thường, 40 luồng gọi đồng thời dịch vụ C, còn D/E mỗi dịch vụ có 30 luồng gọi đồng thời.

Gọi dịch vụ C chỉ mất 20ms. Bây giờ giả sử dịch vụ C gặp sự cố, chẳng hạn bị chậm hoặc bị treo, khi đó các luồng sẽ bị hang khoảng 2s. Cả 40 luồng đều bị kẹt, và do các yêu cầu liên tục đổ vào, những luồng khác cũng được dùng để gọi dịch vụ C và cũng sẽ bị kẹt. Điều này khiến tài nguyên luồng của dịch vụ B bị cạn kiệt, không thể nhận yêu cầu mới, thậm chí có thể tự sập vì quá nhiều luồng liên tục hoạt động. Ảnh hưởng này chắc chắn sẽ lan đến dịch vụ A, khiến dịch vụ A cũng bị sập theo.

![service-invoke-road](asset:high-availability/hystrix-introduction/service-invoke-road.png)

Hystrix có thể cô lập tài nguyên cho tình huống này, chẳng hạn giới hạn dịch vụ B chỉ có 40 luồng được gọi dịch vụ C. Khi 40 luồng này bị hang, 60 luồng còn lại vẫn có thể gọi và làm việc bình thường. Nhờ đó đảm bảo toàn hệ thống không bị kéo sập.

## Các nguyên tắc thiết kế chi tiết hơn của Hystrix

-   Ngăn bất kỳ dịch vụ phụ thuộc nào làm cạn kiệt toàn bộ tài nguyên, ví dụ toàn bộ tài nguyên luồng trong tomcat.
-   Tránh việc yêu cầu phải xếp hàng và bị tồn đọng, dùng giới hạn lưu lượng và `fail fast` để kiểm soát sự cố.
-   Cung cấp cơ chế hạ cấp dịch vụ fallback để ứng phó với sự cố.
-   Sử dụng các kỹ thuật cô lập tài nguyên, chẳng hạn `bulkhead` (kỹ thuật cô lập theo vách ngăn), `swimlane` (kỹ thuật làn đường), `circuit breaker` (kỹ thuật ngắt mạch) để hạn chế ảnh hưởng của sự cố từ bất kỳ dịch vụ phụ thuộc nào.
-   Thông qua các chức năng thống kê, giám sát, cảnh báo gần như theo thời gian thực để tăng tốc độ phát hiện sự cố.
-   Thông qua chức năng **sửa nóng** thuộc tính và cấu hình gần như theo thời gian thực để tăng tốc độ xử lý sự cố và phục hồi.
-   Bảo vệ trước mọi trường hợp lỗi khi gọi dịch vụ phụ thuộc, chứ không chỉ riêng các lỗi mạng.
