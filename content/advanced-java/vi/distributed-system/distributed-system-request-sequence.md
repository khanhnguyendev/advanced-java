---
source:
  locale: zh
  slug: distributed-system-request-sequence
  hash: 'sha256:v1:6d79dcdd86596ff7b0b0213ccc52b150a18b3b95447ba0cf175ea2c9842a7d1d'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để đảm bảo tính thứ tự của các yêu cầu API dịch vụ phân tán?

## Câu hỏi phỏng vấn

Làm thế nào để đảm bảo tính thứ tự của các yêu cầu API dịch vụ phân tán?

## Tâm lý người phỏng vấn

Thực ra thứ tự gọi API của hệ thống phân tán cũng là một vấn đề, nói chung là không cần đảm bảo thứ tự. Nhưng **đôi khi** quả thật có thể cần đảm bảo **thứ tự nghiêm ngặt**. Lấy một ví dụ cho mọi người: dịch vụ A của bạn gọi dịch vụ B, chèn trước rồi xóa sau. Được rồi, kết quả hai yêu cầu đi qua, rơi vào các máy khác nhau, có thể yêu cầu chèn vì lý do nào đó chạy chậm một chút, khiến yêu cầu xóa chạy trước, lúc này vì chưa có dữ liệu nên chẳng có tác dụng gì; kết quả là lúc này yêu cầu chèn mới đến, được rồi, dữ liệu được chèn vào, thế thì khó xử rồi.

Vốn dĩ phải là "chèn trước -> xóa sau", dữ liệu này đáng lẽ đã mất, kết quả bây giờ là "xóa trước -> chèn sau", dữ liệu vẫn còn, cuối cùng bạn có nghĩ nát óc cũng không hiểu chuyện gì xảy ra.

Vì vậy đây đều là một số vấn đề rất phổ biến của hệ thống phân tán.

## Phân tích câu trả lời

Trước hết, nói chung, đề xuất cá nhân là hệ thống mà các bạn thiết kế từ logic nghiệp vụ tốt nhất là không cần đảm bảo tính thứ tự kiểu này, vì một khi đưa vào đảm bảo tính thứ tự, ví dụ dùng **khóa phân tán**, sẽ **làm tăng độ phức tạp của hệ thống**, đồng thời kéo theo các vấn đề như **hiệu suất thấp**, áp lực lên dữ liệu nóng quá lớn.

Dưới đây tôi đưa ra một phương án mà chúng tôi từng dùng. Nói đơn giản, trước hết bạn phải dùng chiến lược cân bằng tải hash nhất quán của Dubbo, để phân phối tất cả các yêu cầu tương ứng với, ví dụ, một id đơn hàng nào đó tới cùng một máy; tiếp theo là trên máy đó, vì có thể vẫn chạy đồng thời đa luồng, bạn có thể phải lập tức ném các yêu cầu tương ứng với một id đơn hàng nào đó vào một **hàng đợi trong bộ nhớ**, ép buộc xếp hàng, như vậy để đảm bảo tính thứ tự của chúng.

![distributed-system-request-sequence](diagram:distributed-system/distributed-system-request-sequence/distributed-system-request-sequence)

Nhưng như vậy sẽ gây ra rất nhiều vấn đề phía sau, ví dụ nếu yêu cầu tương ứng với một đơn hàng nào đó đặc biệt nhiều, khiến một máy nào đó trở thành **điểm nóng** thì làm thế nào? Giải quyết các vấn đề này lại phải mở ra một loạt phương án kỹ thuật phức tạp phía sau... Loại vấn đề này từng khiến chúng tôi đau đầu không thôi, vì vậy, vẫn đề xuất điều gì?

Tốt nhất là ví dụ như trường hợp vừa rồi, thao tác chèn và xóa của một đơn hàng, có thể gộp thành một thao tác hay không, tức là một thao tác xóa, hoặc cái gì khác, để tránh phát sinh vấn đề này.
