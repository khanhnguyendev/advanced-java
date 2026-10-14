---
source:
  locale: zh
  slug: hystrix-introduction
  hash: 'sha256:v1:8265377e5efd6294d8f8f0b69af53d3e0b2e330ab324d056f91782b3833bb685'
status: machine
translatedAt: '2026-10-14'
---
# Xây dựng kiến trúc dịch vụ có tính sẵn sàng cao với Hystrix

Tham khảo [Hystrix Home](https://github.com/Netflix/Hystrix/wiki#what).

## Hystrix là gì?

Trong hệ thống phân tán, mỗi dịch vụ đều có thể gọi rất nhiều dịch vụ khác; những dịch vụ được gọi đó chính là **dịch vụ phụ thuộc**, và đôi khi một số dịch vụ phụ thuộc gặp sự cố cũng là chuyện hoàn toàn bình thường.

Hystrix cho phép chúng ta kiểm soát các lời gọi giữa các dịch vụ trong hệ thống phân tán, bổ sung một số **cơ chế chịu lỗi** đối với **độ trễ khi gọi** hoặc **sự cố của dịch vụ phụ thuộc**.

Hystrix **cô lập tài nguyên (isolation)** cho các dịch vụ phụ thuộc, nhờ đó ngăn sự cố của một dịch vụ phụ thuộc lan rộng sang mọi lời gọi tới các dịch vụ phụ thuộc khác trong toàn hệ thống; đồng thời Hystrix còn cung cấp cơ chế fallback khi xảy ra sự cố.

**Tóm lại, Hystrix giúp chúng ta nâng cao tính sẵn sàng và độ ổn định của hệ thống phân tán thông qua những phương pháp này.**

## Lịch sử của Hystrix

Hystrix là một framework đảm bảo tính sẵn sàng cao. Từ năm 2011, đội ngũ API của Netflix (có thể coi là một website video như Youku hay iQiyi ở nước ngoài) bắt đầu thực hiện một số công việc nhằm nâng cao tính sẵn sàng và độ ổn định của hệ thống, và Hystrix được phát triển ra từ thời điểm đó.

Đến năm 2012, Hystrix đã khá trưởng thành và ổn định; trong Netflix, ngoài đội ngũ API, rất nhiều đội ngũ khác cũng bắt đầu sử dụng Hystrix.

Đến nay, mỗi ngày Netflix có hàng tỷ lời gọi giữa các dịch vụ được thực hiện thông qua framework Hystrix, và Hystrix cũng giúp website Netflix nâng cao tính sẵn sàng và độ ổn định tổng thể.

[Tháng 11 năm 2018, Hystrix thông báo trên trang chủ GitHub rằng sẽ không phát triển thêm tính năng mới và khuyến nghị lập trình viên dùng các dự án mã nguồn mở khác vẫn đang hoạt động](https://github.com/Netflix/Hystrix/blob/master/README.md#hystrix-status). Việc chuyển sang chế độ bảo trì tuyệt đối không có nghĩa là Hystrix hết giá trị. Ngược lại, Hystrix đã khơi nguồn cho rất nhiều ý tưởng và dự án tuyệt vời, và phần kiến thức về tính sẵn sàng cao của chúng ta vẫn sẽ được trình bày xoay quanh Hystrix.

## Nguyên tắc thiết kế của Hystrix

-   **Kiểm soát và bảo vệ chịu lỗi** đối với độ trễ khi gọi và lỗi khi gọi xảy ra trong các lời gọi tới dịch vụ phụ thuộc.
-   Trong hệ thống phân tán phức tạp, ngăn sự cố của một dịch vụ phụ thuộc lan rộng ra toàn hệ thống. Ví dụ một dịch vụ gặp sự cố khiến các dịch vụ khác cũng gặp sự cố theo.
-   Hỗ trợ `fail-fast` (fail nhanh) và khôi phục nhanh.
-   Hỗ trợ fallback để suy giảm dịch vụ một cách êm dịu.
-   Hỗ trợ giám sát, cảnh báo và các thao tác vận hành gần thời gian thực.

Hãy lấy một ví dụ.

Có một hệ thống phân tán như sau: dịch vụ A phụ thuộc vào dịch vụ B, dịch vụ B phụ thuộc vào các dịch vụ C/D/E. Trong một hệ thống trưởng thành như vậy, giả sử tối đa chỉ có 100 luồng. Trong điều kiện bình thường, 40 luồng đồng thời gọi dịch vụ C, 30 luồng đồng thời gọi D và 30 luồng đồng thời gọi E.

Gọi dịch vụ C chỉ mất 20ms, nhưng giờ dịch vụ C gặp sự cố, chẳng hạn bị trễ hoặc sập, lúc này các luồng sẽ bị hang (treo) khoảng 2s. 40 luồng đều bị kẹt hết, và do yêu cầu liên tục đổ vào, các luồng khác cũng được dùng để gọi dịch vụ C và cũng bị kẹt theo. Như vậy tài nguyên luồng của dịch vụ B bị cạn kiệt, không thể nhận yêu cầu mới, thậm chí có thể do quá nhiều luồng liên tục chạy mà chính nó bị sập. Ảnh hưởng này chắc chắn sẽ lan sang dịch vụ A, khiến dịch vụ A cũng sập theo.

![service-invoke-road](asset:high-availability/hystrix-introduction/service-invoke-road.png)

Hystrix có thể cô lập tài nguyên cho tình huống này, chẳng hạn giới hạn dịch vụ B chỉ có 40 luồng gọi dịch vụ C. Khi 40 luồng này bị hang, 60 luồng còn lại vẫn có thể gọi và làm việc bình thường. Nhờ đó đảm bảo toàn hệ thống không bị kéo sập.

## Các nguyên tắc thiết kế chi tiết hơn của Hystrix

-   Ngăn bất kỳ dịch vụ phụ thuộc nào làm cạn kiệt toàn bộ tài nguyên, chẳng hạn toàn bộ tài nguyên luồng trong tomcat.
-   Tránh việc yêu cầu phải xếp hàng và tồn đọng, dùng giới hạn lưu lượng (rate limiting) và `fail fast` để kiểm soát sự cố.
-   Cung cấp cơ chế fallback để ứng phó với sự cố.
-   Dùng các kỹ thuật cô lập tài nguyên, chẳng hạn `bulkhead` (cô lập theo khoang), `swimlane` (kỹ thuật làn bơi) và `circuit breaker` (bộ ngắt mạch), để hạn chế ảnh hưởng của sự cố ở bất kỳ dịch vụ phụ thuộc nào.
-   Nâng cao tốc độ phát hiện sự cố thông qua các chức năng thống kê, giám sát và cảnh báo gần thời gian thực.
-   Nâng cao tốc độ xử lý và khôi phục sự cố thông qua chức năng **sửa đổi nóng** thuộc tính và cấu hình gần thời gian thực.
-   Bảo vệ trước mọi tình huống sự cố khi gọi dịch vụ phụ thuộc, chứ không chỉ các sự cố mạng.
