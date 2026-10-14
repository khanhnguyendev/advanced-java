---
source:
  locale: zh
  slug: mq-interview
  hash: 'sha256:v1:bc9f5ecfbb4b03a8df2e429c752c7539c323ff5e94a49f13a4f6a7fe2e701b7f'
status: machine
translatedAt: '2026-10-14'
---
# Tình huống phỏng vấn về hàng đợi thông điệp

**Người phỏng vấn**: Xin chào.

**Ứng viên**: Xin chào.

(Người phỏng vấn thấy trong CV của bạn một điểm nổi bật: bạn từng dùng `MQ` trong dự án, ví dụ bạn đã dùng `ActiveMQ`.)

**Người phỏng vấn**: Bạn đã dùng hàng đợi thông điệp (message queue) trong hệ thống chưa? (Người phỏng vấn mở đầu buổi phỏng vấn với giọng điệu thân thiện.)

**Ứng viên**: Dạ rồi ạ (lúc này thấy chưa có vấn đề gì).

**Người phỏng vấn**: Vậy bạn kể xem trong dự án các bạn dùng hàng đợi thông điệp như thế nào?

**Ứng viên**: Ba hoa một hồi, "Hệ thống này hệ thống kia của chúng em gửi thông điệp nọ thông điệp kia vào hàng đợi, các hệ thống khác sẽ tiêu thụ. Ví dụ chúng em có một hệ thống đơn hàng, mỗi lần tạo đơn hàng mới, hệ thống đơn hàng sẽ gửi một thông điệp vào `ActiveMQ`, phía sau có một hệ thống tồn kho phụ trách lấy thông điệp rồi cập nhật tồn kho."

(Một số bạn sẽ rơi vào một hiểu lầm ở đây: bạn chỉ biết và chỉ trả lời được các bạn dùng hàng đợi thông điệp này như thế nào, dùng nó để làm việc gì.)

**Người phỏng vấn**: Vậy tại sao các bạn lại dùng hàng đợi thông điệp? Hệ thống đơn hàng không gửi thông điệp vào `MQ`, mà gọi thẳng một API của hệ thống tồn kho, một cái là xong ngay, tồn kho cũng được cập nhật rồi còn gì.

**Ứng viên**: Ờ... (khựng lại một chút, tại sao ư? Mình chưa nghĩ kỹ bao giờ, sếp bảo dùng thì dùng thôi), đành nói bừa vài câu cho qua.

(Người phỏng vấn nghe bạn khựng lại rồi nói bừa vài câu, trong lòng bắt đầu thấy không ổn, nghi ngờ rằng trước đây bạn hoàn toàn chưa suy nghĩ về vấn đề này.)

**Người phỏng vấn**: Vậy bạn nói xem dùng hàng đợi thông điệp có những ưu điểm và nhược điểm gì?

(Lúc này người phỏng vấn nghĩ: bạn chưa cân nhắc vì sao phải dùng `MQ` trong dự án, vậy mình hỏi nhẹ hơn một chút, xem bạn đã từng cân nhắc ưu điểm và nhược điểm của hàng đợi thông điệp khi dùng nó hay chưa.)

**Ứng viên**: Cái này... (thực sự bình thường chưa nghĩ đến vấn đề này... lại nói bừa)

(Lúc này người phỏng vấn càng thấy bạn này không ổn, bình thường chẳng suy nghĩ gì.)

**Người phỏng vấn**: `Kafka`, `ActiveMQ`, `RabbitMQ`, `RocketMQ` khác nhau như thế nào?

(Người phỏng vấn hỏi câu này là để bỏ qua những chủ đề mang tính lý thuyết, xem thẳng bạn có hiểu các middleware `MQ` khác nhau không, có tìm hiểu bài bản không, có khảo sát không.)

**Ứng viên**: Chúng em chỉ dùng `ActiveMQ`, nên những cái khác chưa dùng... sự khác biệt thì cũng không rõ lắm...

(Lúc này người phỏng vấn càng cảm thấy bạn này bình thường chỉ dùng bừa, hoàn toàn không suy nghĩ, thấy là không đạt.)

**Người phỏng vấn**: Vậy các bạn đảm bảo tính sẵn sàng cao của hàng đợi thông điệp như thế nào?

**Ứng viên**: Cái này... bình thường em chỉ gọi API đơn giản thôi, không rõ hàng đợi thông điệp được triển khai thế nào...

**Người phỏng vấn**: Làm sao đảm bảo thông điệp không bị tiêu thụ trùng lặp? Làm sao đảm bảo việc tiêu thụ có tính idempotent?

**Ứng viên**: Gì ạ? (`MQ` chẳng phải chỉ cần ghi vào và tiêu thụ là được sao, đâu ra lắm vấn đề vậy)

**Người phỏng vấn**: Làm sao đảm bảo độ tin cậy khi truyền thông điệp? Nếu thông điệp bị mất thì làm thế nào?

**Ứng viên**: Chúng em hầu như chưa từng mất thông điệp...

**Người phỏng vấn**: Vậy làm sao đảm bảo tính thứ tự của thông điệp?

**Ứng viên**: Tính thứ tự? Ý là gì ạ? Tại sao em phải đảm bảo tính thứ tự của thông điệp? Chẳng phải nó vốn đã có thứ tự rồi sao?

**Người phỏng vấn**: Làm sao giải quyết vấn đề trễ (delay) và hết hạn (expiry) của hàng đợi thông điệp? Khi hàng đợi thông điệp đầy thì xử lý thế nào? Có vài triệu thông điệp tồn đọng liên tục trong vài giờ, bạn nói xem giải quyết ra sao?

**Ứng viên**: Không phải, bình thường em chưa gặp những vấn đề này, chỉ dùng đơn giản thôi, biết một số chức năng của `MQ`.

**Người phỏng vấn**: Nếu để bạn viết một hàng đợi thông điệp, bạn sẽ thiết kế kiến trúc như thế nào? Nói qua hướng suy nghĩ của bạn.

**Ứng viên**: ..... Em xin phép về thôi ạ....

---

Đây thực ra là một phong cách phỏng vấn của người phỏng vấn: câu hỏi không dàn trải, mà từ một điểm nhỏ rồi mở rộng dần. Ví dụ người phỏng vấn có thể trò chuyện với bạn về chủ đề tải đồng thời cao (high concurrency), và trong chủ đề này sẽ nói về bộ nhớ đệm (cache), `MQ` và nhiều thứ khác, **từ nông đến sâu, đào sâu từng bước**.

Thực ra những gì ở trên là một quá trình khảo sát kỹ thuật rất điển hình về hàng đợi thông điệp. Một người phỏng vấn giỏi nhất định sẽ bắt đầu từ một điểm bạn đã làm, sau đó khai triển từng lớp để khảo sát sâu, hỏi hết câu này đến câu khác, cho đến khi truy tận gốc điểm kỹ thuật đó, hỏi đến tầng sâu nhất.
