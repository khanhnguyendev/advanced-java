---
source:
  locale: zh
  slug: mq-design
  hash: 'sha256:v1:b6add2571423072cb289c986ea4c6900c62c3be6578f990769035c6804297011'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để thiết kế một hàng đợi thông điệp?

## Câu hỏi phỏng vấn

Nếu để bạn viết một hàng đợi thông điệp, bạn sẽ thiết kế kiến trúc như thế nào? Nói qua hướng suy nghĩ của bạn.

## Tâm lý người phỏng vấn

Thực ra khi nói đến câu hỏi này, người phỏng vấn thường muốn khảo sát hai mặt:

-   Bạn đã từng tìm hiểu khá sâu về nguyên lý của một hàng đợi thông điệp nào đó chưa, hoặc nắm được nguyên lý kiến trúc của một hàng đợi thông điệp từ góc nhìn tổng thể.
-   Xem năng lực thiết kế của bạn: cho bạn một hệ thống phổ biến, chính là hệ thống hàng đợi thông điệp, xem bạn có nắm được thiết kế kiến trúc tổng thể từ góc nhìn toàn cục và đưa ra được một số điểm then chốt không.

Nói thật, khi hỏi những câu tương tự, phần lớn mọi người về cơ bản đều bí, vì bình thường chưa bao giờ suy nghĩ về những vấn đề tương tự, **đa số mọi người bình thường chỉ cắm đầu dùng, chưa bao giờ suy nghĩ về những thứ đằng sau**. Những câu hỏi tương tự, ví dụ, nếu để bạn thiết kế một framework Spring thì bạn sẽ làm thế nào? Nếu để bạn thiết kế một framework Dubbo thì bạn sẽ làm thế nào? Nếu để bạn thiết kế một framework MyBatis thì bạn sẽ làm thế nào?

## Phân tích câu trả lời

Thực ra khi trả lời những câu hỏi loại này, nói thẳng ra, không yêu cầu bạn đã đọc mã nguồn của công nghệ đó, ít nhất bạn phải đại khái biết nguyên lý cơ bản, các thành phần cốt lõi, cấu trúc kiến trúc cơ bản của công nghệ đó, rồi tham khảo một số công nghệ mã nguồn mở để nói ra hướng suy nghĩ thiết kế một hệ thống là được.

Ví dụ hệ thống hàng đợi thông điệp này, chúng ta cân nhắc từ các góc độ sau:

-   Trước hết mq này phải hỗ trợ khả năng co giãn (scalability) chứ, tức là khi cần thì mở rộng nhanh, là có thể tăng thông lượng và dung lượng, vậy làm thế nào? Thiết kế một hệ thống phân tán thôi, tham khảo ý tưởng thiết kế của kafka, broker -> topic -> partition, mỗi partition đặt trên một máy, chỉ lưu một phần dữ liệu. Nếu bây giờ tài nguyên không đủ, đơn giản thôi, thêm partition cho topic, rồi di chuyển dữ liệu, thêm máy, chẳng phải có thể lưu nhiều dữ liệu hơn, cung cấp thông lượng cao hơn sao?

-   Tiếp theo bạn phải cân nhắc dữ liệu của mq này có cần ghi xuống đĩa không? Chắc chắn là cần rồi, ghi xuống đĩa mới đảm bảo tiến trình sập thì dữ liệu không bị mất. Vậy khi ghi xuống đĩa thì ghi như thế nào? Ghi tuần tự, như vậy sẽ không có chi phí tìm địa chỉ của việc đọc ghi ngẫu nhiên trên đĩa, hiệu năng đọc ghi tuần tự trên đĩa rất cao, đây chính là hướng đi của kafka.

-   Tiếp theo bạn cân nhắc tính sẵn sàng của mq của bạn? Chuyện này, cụ thể tham khảo cơ chế đảm bảo tính sẵn sàng cao của kafka đã giải thích ở phần tính sẵn sàng trước đó. Nhiều bản sao -> leader & follower -> broker sập thì bầu lại leader là có thể tiếp tục phục vụ bên ngoài.

-   Có hỗ trợ không mất dữ liệu (0 mất) không? Được, tham khảo giải pháp không mất dữ liệu của kafka mà chúng ta đã nói trước đó.

mq chắc chắn rất phức tạp, người phỏng vấn hỏi bạn câu này thực ra là một câu hỏi mở, họ chỉ xem bạn có tư duy và năng lực hình dung, thiết kế tổng thể từ góc độ kiến trúc hay không. Đúng là câu hỏi này có thể loại một loạt người, vì phần lớn mọi người bình thường không suy nghĩ về những thứ này.
