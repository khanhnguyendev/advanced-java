---
source:
  locale: zh
  slug: how-to-ensure-that-messages-are-not-repeatedly-consumed
  hash: 'sha256:v1:69b79a47e604c30a686c03794a835a3ad40fd0fb7ac4fa8eb148578b6eeee1e0'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để đảm bảo thông điệp không bị tiêu thụ trùng lặp?

## Câu hỏi phỏng vấn

Làm thế nào để đảm bảo thông điệp không bị tiêu thụ trùng lặp? Hay nói cách khác, làm thế nào để đảm bảo tính idempotent (idempotency) khi tiêu thụ thông điệp?

## Tâm lý người phỏng vấn

Thực ra đây là một câu hỏi rất thường gặp, hai câu hỏi này về cơ bản có thể được hỏi liền nhau. Đã là tiêu thụ thông điệp thì chắc chắn phải cân nhắc: có bị tiêu thụ trùng lặp không? Có tránh được việc tiêu thụ trùng lặp không? Hay là nếu đã tiêu thụ trùng lặp thì cũng đừng làm hệ thống phát sinh bất thường, có được không? Đây là một vấn đề cơ bản trong lĩnh vực MQ, thực chất vẫn là hỏi bạn **dùng hàng đợi thông điệp thì đảm bảo tính idempotent như thế nào**, đây là một vấn đề bạn phải cân nhắc trong kiến trúc của mình.

## Phân tích câu trả lời

Khi trả lời câu hỏi này, trước hết bạn đừng nghe đến chuyện thông điệp trùng lặp mà đã không biết gì, bạn **trước tiên hãy nói đại khái xem có thể có những vấn đề tiêu thụ trùng lặp nào**.

Trước hết, ví dụ RabbitMQ, RocketMQ, Kafka đều có thể xảy ra vấn đề thông điệp bị tiêu thụ trùng lặp, đó là bình thường. Vì vấn đề này thường không phải do MQ tự đảm bảo mà do chúng ta, những người phát triển, đảm bảo. Chọn Kafka làm ví dụ để nói về việc tiêu thụ trùng lặp xảy ra như thế nào.

Kafka thực tế có khái niệm offset, tức là mỗi thông điệp khi được ghi vào đều có một offset, đại diện cho số thứ tự của thông điệp, sau đó consumer sau khi tiêu thụ dữ liệu, **cứ cách một khoảng thời gian** (theo định kỳ) sẽ commit offset của những thông điệp mình đã tiêu thụ, ngụ ý rằng "tôi đã tiêu thụ rồi, lần sau nếu tôi khởi động lại thì anh cho tôi tiếp tục tiêu thụ từ offset đã tiêu thụ đến lần trước".

Nhưng việc gì cũng có ngoại lệ, ví dụ điều chúng tôi thường gặp trong production trước đây là đôi khi bạn khởi động lại hệ thống, tùy cách bạn khởi động lại, nếu gặp lúc vội, kill thẳng tiến trình rồi khởi động lại. Điều này dẫn đến việc consumer đã xử lý một số thông điệp nhưng chưa kịp commit offset, khá khó xử. Sau khi khởi động lại, một số ít thông điệp sẽ bị tiêu thụ lại một lần nữa.

Lấy một ví dụ.

Có một kịch bản thế này. Dữ liệu 1/2/3 lần lượt vào Kafka, Kafka sẽ cấp cho mỗi dữ liệu trong ba dữ liệu này một offset, đại diện cho số thứ tự của dữ liệu, giả sử các offset được cấp lần lượt là 152/153/154. Khi consumer tiêu thụ từ Kafka cũng tiêu thụ theo thứ tự này. Giả sử khi consumer đã tiêu thụ dữ liệu có `offset=153`, đang chuẩn bị commit offset lên Zookeeper thì tiến trình consumer bị khởi động lại. Khi đó offset của dữ liệu 1/2 đã tiêu thụ chưa được commit, Kafka cũng không biết bạn đã tiêu thụ dữ liệu `offset=153`. Vậy sau khi khởi động lại, consumer sẽ nói với Kafka rằng: này anh bạn, anh hãy tiếp tục truyền cho tôi dữ liệu phía sau chỗ tôi đã tiêu thụ lần trước. Do offset trước đó chưa commit thành công, dữ liệu 1/2 sẽ được truyền lại, nếu lúc này consumer không khử trùng lặp thì sẽ dẫn đến tiêu thụ trùng lặp.

Lưu ý: Kafka phiên bản mới đã chuyển việc lưu trữ offset từ Zookeeper sang các Kafka broker, và dùng topic nội bộ `__consumer_offsets` để lưu trữ.

![mq-10](diagram:high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed/mq-10)

Nếu việc consumer làm là lấy một dữ liệu rồi ghi một bản ghi vào cơ sở dữ liệu, thì có thể bạn sẽ chèn dữ liệu 1/2 vào cơ sở dữ liệu 2 lần, vậy là dữ liệu sai rồi.

Thực ra tiêu thụ trùng lặp không đáng sợ, đáng sợ là bạn không cân nhắc đến việc sau khi tiêu thụ trùng lặp thì **làm sao đảm bảo tính idempotent**.

Lấy ví dụ nhé. Giả sử bạn có một hệ thống, tiêu thụ một thông điệp thì chèn một bản ghi vào cơ sở dữ liệu, nếu một thông điệp bị lặp hai lần, chẳng phải bạn chèn hai bản ghi, dữ liệu chẳng phải sai sao? Nhưng nếu đến lần tiêu thụ thứ hai, bạn tự kiểm tra xem đã tiêu thụ chưa, nếu rồi thì bỏ luôn, như vậy chẳng phải giữ lại một bản ghi, từ đó đảm bảo tính đúng đắn của dữ liệu sao.

Một dữ liệu xuất hiện lặp hai lần mà trong cơ sở dữ liệu chỉ có một bản ghi, thì đã đảm bảo tính idempotent của hệ thống.

Tính idempotent, nói cho dễ hiểu, là một dữ liệu hay một yêu cầu, dù đến lặp lại nhiều lần, bạn phải đảm bảo dữ liệu tương ứng không thay đổi, **không được xảy ra sai sót**.

Vì vậy câu hỏi thứ hai đặt ra: làm sao đảm bảo tính idempotent khi tiêu thụ hàng đợi thông điệp?

Thực ra vẫn phải kết hợp với nghiệp vụ để suy nghĩ, ở đây tôi đưa ra vài hướng:

-   Ví dụ bạn lấy một dữ liệu để ghi vào cơ sở dữ liệu, trước tiên bạn truy vấn theo khóa chính, nếu dữ liệu này đã có rồi thì đừng chèn nữa, update một chút là được.
-   Ví dụ bạn ghi vào Redis, thì không có vấn đề gì, dù sao mỗi lần cũng là set, tự nhiên đã có tính idempotent.
-   Ví dụ nếu không phải hai kịch bản trên, thì làm phức tạp hơn một chút, bạn cần để producer khi gửi mỗi dữ liệu thì thêm vào trong đó một id duy nhất toàn cục, kiểu như id đơn hàng, sau đó khi tiêu thụ được, trước tiên dựa vào id này tra trong ví dụ Redis xem trước đây đã tiêu thụ chưa? Nếu chưa tiêu thụ thì bạn xử lý, rồi ghi id này vào Redis. Nếu đã tiêu thụ rồi thì bạn đừng xử lý nữa, đảm bảo không xử lý lặp cùng một thông điệp là được.
-   Ví dụ dựa vào khóa duy nhất (unique key) của cơ sở dữ liệu để đảm bảo dữ liệu trùng lặp không bị chèn nhiều bản ghi. Vì có ràng buộc khóa duy nhất, chèn dữ liệu trùng lặp chỉ báo lỗi, không dẫn đến dữ liệu bẩn trong cơ sở dữ liệu.

![mq-11](diagram:high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed/mq-11)

Tất nhiên, làm sao đảm bảo việc tiêu thụ MQ có tính idempotent, trong ứng dụng thực tế cần kết hợp với nghiệp vụ cụ thể để xem xét.
