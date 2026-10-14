---
source:
  locale: zh
  slug: why-mq
  hash: 'sha256:v1:d85800610bd5ac920111f2abc85b5b837999503953882cadb78dd816c7b9e240'
status: machine
translatedAt: '2026-10-14'
---
# Tại sao sử dụng hàng đợi thông điệp?

## Câu hỏi phỏng vấn

-   Tại sao sử dụng hàng đợi thông điệp?
-   Hàng đợi thông điệp có những ưu điểm và nhược điểm gì?
-   Kafka, ActiveMQ, RabbitMQ, RocketMQ khác nhau như thế nào, và phù hợp với những tình huống nào?

## Tâm lý người phỏng vấn

Thực ra người phỏng vấn chủ yếu muốn xem:

-   **Thứ nhất**, bạn có biết tại sao hệ thống của mình lại cần dùng hàng đợi thông điệp (message queue) hay không?

    Không ít ứng viên nói rằng dự án của mình có dùng Redis, MQ, nhưng thực ra họ không biết tại sao mình phải dùng thứ đó. Nói thẳng ra, là dùng cho có, hoặc là kiến trúc do người khác thiết kế, còn họ từ đầu đến cuối chưa từng suy nghĩ.

    Người chưa bao giờ tự hỏi "tại sao" về kiến trúc của mình chắc chắn là người bình thường không chịu suy nghĩ, và người phỏng vấn thường có ấn tượng rất xấu với loại ứng viên này. Bởi vì người phỏng vấn lo rằng sau khi bạn vào nhóm, bạn chỉ biết làm việc một cách máy móc, không biết tự suy nghĩ.

-   **Thứ hai**, bạn đã dùng hàng đợi thông điệp, vậy bạn có biết dùng nó có lợi ích và tác hại gì không?

    Nếu bạn chưa từng cân nhắc điều này, mà cứ mù quáng đưa một MQ vào hệ thống, thì sau này xảy ra sự cố, chẳng phải bạn sẽ bỏ đi và để lại hố cho công ty sao? Nếu bạn chưa từng cân nhắc những nhược điểm và rủi ro có thể có khi đưa vào một công nghệ, thì người phỏng vấn tuyển loại ứng viên này về về cơ bản là nhận một người chuyên đào hố. Chỉ sợ bạn làm một năm đào cả đống hố, rồi tự mình nhảy việc, để lại hậu họa vô tận cho công ty.

-   **Thứ ba**, bạn đã dùng MQ, có thể là một loại MQ nào đó, vậy lúc đó bạn có khảo sát hay không?

    Đừng ngây ngô tự mình nghĩ ra rồi tùy theo sở thích cá nhân mà dùng bừa một MQ, ví dụ Kafka, thậm chí chưa từng khảo sát xem trong ngành thực sự có những loại MQ phổ biến nào. Ưu điểm và nhược điểm của từng MQ là gì. Mỗi MQ **không có tốt xấu tuyệt đối**, mà quan trọng là dùng ở tình huống nào thì có thể **phát huy sở trường, tránh sở đoản, tận dụng ưu thế và né tránh điểm yếu**.

    Nếu tuyển vào nhóm một ứng viên không cân nhắc đến lựa chọn công nghệ, leader giao cho anh ta một nhiệm vụ, thiết kế một hệ thống nào đó, anh ta dùng một số công nghệ bên trong mà có thể chưa từng cân nhắc việc lựa chọn, cuối cùng công nghệ được chọn chưa chắc đã phù hợp, cũng vẫn là để lại hố.

## Phân tích câu trả lời

### Tại sao sử dụng hàng đợi thông điệp

Thực ra là hỏi bạn hàng đợi thông điệp có những tình huống sử dụng nào, sau đó trong dự án của bạn cụ thể là tình huống gì, hãy nói xem trong tình huống đó bạn dùng hàng đợi thông điệp để làm gì.

Người phỏng vấn hỏi câu này, **câu trả lời mong đợi** là: công ty của bạn có một **tình huống nghiệp vụ** nào đó, tình huống nghiệp vụ này có một thách thức kỹ thuật nào đó, nếu không dùng MQ thì có thể rất phiền phức, nhưng bây giờ sau khi dùng MQ thì mang lại cho bạn rất nhiều lợi ích.

Trước hết hãy nói về các tình huống sử dụng phổ biến của hàng đợi thông điệp. Thực ra có rất nhiều tình huống, nhưng cốt lõi nhất có 3 loại: **tách rời (decoupling)**, **bất đồng bộ**, **san phẳng đỉnh tải (peak shaving)**.

#### Tách rời

Hãy xem tình huống này. Hệ thống A gửi dữ liệu đến ba hệ thống B, C, D, thông qua việc gọi API. Nếu hệ thống E cũng cần dữ liệu này thì sao? Nếu bây giờ hệ thống D không cần nữa thì sao? Người phụ trách hệ thống A gần như sụp đổ......

![mq-1](asset:high-concurrency/why-mq/mq-1.png)

Trong tình huống này, hệ thống A bị ràng buộc chặt chẽ với đủ loại hệ thống khác, hệ thống A tạo ra một dữ liệu khá quan trọng, rất nhiều hệ thống cần hệ thống A gửi dữ liệu này đến. Hệ thống A phải luôn luôn cân nhắc nếu bốn hệ thống B, C, D, E bị sập thì phải làm sao? Có cần gửi lại không, có cần lưu thông điệp lại không? Tóc bạc cả đầu!

Nếu dùng MQ, hệ thống A tạo ra một dữ liệu, gửi vào MQ, hệ thống nào cần dữ liệu thì tự vào MQ tiêu thụ. Nếu hệ thống mới cần dữ liệu, chỉ cần tiêu thụ trực tiếp từ MQ; nếu một hệ thống nào đó không cần dữ liệu này nữa, thì chỉ cần hủy việc tiêu thụ thông điệp từ MQ. Như vậy, hệ thống A hoàn toàn không cần cân nhắc phải gửi dữ liệu cho ai, không cần duy trì đoạn code này, cũng không cần cân nhắc việc người ta gọi thành công hay thất bại, hết thời gian chờ.

![mq-2](asset:high-concurrency/why-mq/mq-2.png)

**Tóm lại**: thông qua một MQ, với mô hình thông điệp publish/subscribe (pub/sub), hệ thống A được tách rời hoàn toàn khỏi các hệ thống khác.

**Mẹo phỏng vấn**: bạn cần cân nhắc xem trong hệ thống mình phụ trách có tình huống tương tự hay không, tức là một hệ thống hoặc một module gọi nhiều hệ thống hoặc module khác, các lời gọi giữa chúng rất phức tạp, bảo trì rất phiền phức. Nhưng thực ra lời gọi này không cần phải gọi API đồng bộ trực tiếp, nếu dùng MQ để bất đồng bộ hóa và tách rời thì cũng được, bạn cần cân nhắc xem trong dự án của mình có thể dùng MQ để tách rời hệ thống hay không. Hãy thể hiện phần này trong CV: dùng MQ để tách rời.

#### Bất đồng bộ

Hãy xem thêm một tình huống nữa. Hệ thống A nhận một yêu cầu, cần ghi vào cơ sở dữ liệu cục bộ của mình, và còn cần ghi vào cơ sở dữ liệu của ba hệ thống B, C, D; ghi cơ sở dữ liệu cục bộ mất 3ms, ba hệ thống B, C, D ghi cơ sở dữ liệu lần lượt mất 300ms, 450ms, 200ms. Tổng độ trễ của yêu cầu cuối cùng là 3 + 300 + 450 + 200 = 953ms, gần 1s, người dùng cảm thấy sao mà chậm quá, chậm chết đi được. Người dùng gửi yêu cầu qua trình duyệt, phải chờ 1s, điều này gần như không thể chấp nhận được.

![mq-3](asset:high-concurrency/why-mq/mq-3.png)

Thông thường các doanh nghiệp internet, đối với thao tác trực tiếp của người dùng, yêu cầu là mỗi yêu cầu đều phải hoàn thành trong vòng 200 ms, để người dùng gần như không cảm nhận được.

Nếu **dùng MQ**, thì hệ thống A gửi liên tiếp 3 thông điệp vào hàng đợi MQ, giả sử mất 5ms, thì tổng thời gian từ lúc hệ thống A nhận một yêu cầu đến lúc trả về phản hồi cho người dùng là 3 + 5 = 8ms, đối với người dùng, cảm giác chỉ là bấm một nút, 8ms sau là trả về ngay, thích quá! Website làm thật tốt, thật nhanh!

![mq-4](asset:high-concurrency/why-mq/mq-4.png)

#### San phẳng đỉnh tải

Mỗi ngày từ 0:00 đến 12:00, hệ thống A yên ả, số yêu cầu đồng thời mỗi giây chỉ có 50. Kết quả là mỗi lần đến 12:00 ~ 13:00, số yêu cầu đồng thời mỗi giây đột nhiên tăng vọt lên hơn 5 nghìn. Nhưng hệ thống lại dựa trực tiếp vào MySQL, một lượng lớn yêu cầu đổ vào MySQL, mỗi giây thực thi khoảng 5 nghìn câu SQL trên MySQL.

MySQL thông thường chịu được khoảng 2 nghìn yêu cầu mỗi giây là gần hết khả năng, nếu mỗi giây có 5 nghìn yêu cầu, có thể sẽ làm MySQL sập luôn, khiến hệ thống sụp đổ, người dùng cũng không thể dùng hệ thống được nữa.

Nhưng khi giờ cao điểm qua đi, đến buổi chiều thì thành giờ thấp điểm, có thể chỉ có mười nghìn người dùng cùng thao tác trên website, số yêu cầu mỗi giây có thể chỉ khoảng 50 yêu cầu, gần như không gây áp lực gì cho toàn bộ hệ thống.

![mq-5](asset:high-concurrency/why-mq/mq-5.png)

Nếu dùng MQ, mỗi giây 5 nghìn yêu cầu được ghi vào MQ, hệ thống A mỗi giây xử lý tối đa 2 nghìn yêu cầu, vì MySQL mỗi giây xử lý tối đa 2 nghìn. Hệ thống A kéo yêu cầu từ MQ một cách chậm rãi, mỗi giây kéo 2 nghìn yêu cầu, không vượt quá số yêu cầu tối đa mà mình có thể xử lý mỗi giây là ổn, như vậy, dù là giờ cao điểm, hệ thống A cũng tuyệt đối không bị sập. Còn MQ mỗi giây có 5 nghìn yêu cầu đi vào, chỉ có 2 nghìn yêu cầu đi ra, kết quả là vào giờ cao điểm buổi trưa (1 giờ), có thể có vài trăm nghìn thậm chí vài triệu yêu cầu tồn đọng trong MQ.

![mq-6](asset:high-concurrency/why-mq/mq-6.png)

Việc tồn đọng trong thời gian cao điểm ngắn ngủi này là ổn, bởi vì sau khi giờ cao điểm qua đi, mỗi giây chỉ có 50 yêu cầu đi vào MQ, nhưng hệ thống A vẫn xử lý theo tốc độ 2 nghìn yêu cầu mỗi giây. Vì vậy, chỉ cần giờ cao điểm qua đi, hệ thống A sẽ nhanh chóng giải quyết hết các thông điệp tồn đọng.

### Hàng đợi thông điệp có ưu nhược điểm gì

Ưu điểm thì ở trên đã nói rồi, đó là **có lợi ích tương ứng trong các tình huống đặc biệt**: **tách rời**, **bất đồng bộ**, **san phẳng đỉnh tải**.

Nhược điểm có mấy điểm sau:

-   Tính sẵn sàng của hệ thống giảm

    Hệ thống càng đưa vào nhiều phụ thuộc bên ngoài thì càng dễ sập. Vốn dĩ hệ thống A chỉ cần gọi API của ba hệ thống B, C, D là xong, bốn hệ thống A, B, C, D vẫn chạy tốt, chẳng có vấn đề gì, vậy mà bạn cứ thêm một MQ vào, lỡ MQ sập thì làm sao? MQ vừa sập, cả hệ thống sụp đổ, chẳng phải bạn xong đời sao? Cách đảm bảo tính sẵn sàng cao của hàng đợi thông điệp, có thể [bấm vào đây để xem](doc:advanced-java/high-concurrency/how-to-ensure-high-availability-of-message-queues).

-   Độ phức tạp của hệ thống tăng lên

    Cứng nhắc thêm một MQ vào, bạn làm sao [đảm bảo thông điệp không bị tiêu thụ trùng lặp](doc:advanced-java/high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed)? Làm sao [xử lý tình huống mất thông điệp](doc:advanced-java/high-concurrency/how-to-ensure-the-reliable-transmission-of-messages)? Làm sao đảm bảo tính thứ tự khi truyền thông điệp? Đau đầu quá, một đống vấn đề, khổ sở vô cùng.

-   Vấn đề tính nhất quán

    Hệ thống A xử lý xong rồi trả về thành công ngay, ai cũng nghĩ yêu cầu của bạn đã thành công; nhưng vấn đề là, ở ba hệ thống B, C, D, nếu hai hệ thống B và D ghi cơ sở dữ liệu thành công, mà hệ thống C ghi cơ sở dữ liệu thất bại, thì làm sao? Dữ liệu của bạn sẽ không nhất quán.

    Vì vậy hàng đợi thông điệp thực chất là một kiến trúc cực kỳ phức tạp, đưa nó vào có rất nhiều lợi ích, nhưng cũng phải có đủ loại giải pháp kỹ thuật và kiến trúc bổ sung để tránh những tác hại mà nó mang lại, sau khi làm xong bạn sẽ phát hiện, trời ơi, độ phức tạp của hệ thống tăng lên một bậc, có lẽ phức tạp gấp 10 lần. Nhưng vào thời khắc then chốt, cần dùng thì vẫn phải dùng.

### Kafka, ActiveMQ, RabbitMQ, RocketMQ có ưu nhược điểm gì?

| Đặc tính                         | ActiveMQ                                                             | RabbitMQ                                                  | RocketMQ                                                                                                                                         | Kafka                                                                                                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thông lượng trên một máy         | Cấp chục nghìn, thấp hơn RocketMQ và Kafka một bậc                   | Như ActiveMQ                                              | Cấp trăm nghìn, hỗ trợ thông lượng cao                                                                                                           | Cấp trăm nghìn, thông lượng cao, thường kết hợp với các hệ thống dữ liệu lớn để tính toán dữ liệu thời gian thực, thu thập log và các tình huống tương tự                              |
| Ảnh hưởng của số lượng topic đến thông lượng |                                                          |                                                           | Số lượng topic có thể đạt cấp vài trăm/vài nghìn, thông lượng giảm với mức độ khá nhỏ, đây là một ưu thế lớn của RocketMQ, với cùng một máy có thể hỗ trợ lượng lớn topic | Khi topic từ vài chục đến vài trăm, thông lượng giảm mạnh, với cùng một máy, Kafka cố gắng đảm bảo số lượng topic không quá nhiều, nếu cần hỗ trợ topic quy mô lớn, phải bổ sung thêm tài nguyên máy |
| Độ trễ                           | Cấp ms                                                               | Cấp micro giây, đây là một đặc điểm lớn của RabbitMQ, độ trễ thấp nhất | Cấp ms                                                                                                                                           | Độ trễ trong vòng cấp ms                                                                                                                                                               |
| Tính sẵn sàng                    | Cao, dựa trên kiến trúc master/replica (master-slave) để đạt tính sẵn sàng cao | Như ActiveMQ                                              | Rất cao, kiến trúc phân tán                                                                                                                      | Rất cao, phân tán, một dữ liệu có nhiều bản sao, một số ít máy sập thì không mất dữ liệu, không dẫn đến không khả dụng                                                                 |
| Độ tin cậy của thông điệp        | Có xác suất thấp bị mất dữ liệu                                      | Về cơ bản không mất                                       | Sau khi tối ưu cấu hình tham số, có thể đạt mức không mất dữ liệu                                                                               | Như RocketMQ                                                                                                                                                                           |
| Hỗ trợ chức năng                 | Chức năng trong lĩnh vực MQ cực kỳ đầy đủ                            | Phát triển bằng erlang, khả năng đồng thời rất mạnh, hiệu năng rất tốt, độ trễ rất thấp | Chức năng MQ khá hoàn thiện, lại còn phân tán, khả năng mở rộng tốt                                                                             | Chức năng khá đơn giản, chủ yếu hỗ trợ các chức năng MQ đơn giản, được sử dụng quy mô lớn trong tính toán thời gian thực và thu thập log ở lĩnh vực dữ liệu lớn                         |

Tổng kết lại, sau khi so sánh các mặt, có những đề xuất sau:

Hệ thống nghiệp vụ thông thường muốn đưa vào MQ, thời kỳ đầu mọi người đều dùng ActiveMQ, nhưng bây giờ thực sự không còn nhiều người dùng nữa, chưa được kiểm chứng trong các tình huống thông lượng quy mô lớn, cộng đồng cũng không sôi nổi lắm, vì vậy mọi người bỏ qua đi, cá nhân tôi không khuyến nghị dùng nó nữa.

Sau đó mọi người bắt đầu dùng RabbitMQ, nhưng thực sự ngôn ngữ erlang đã ngăn cản đông đảo kỹ sư Java đi sâu nghiên cứu và làm chủ nó, đối với công ty thì gần như ở trạng thái không kiểm soát được, nhưng đúng là nó mã nguồn mở, được hỗ trợ khá ổn định, mức độ hoạt động cũng cao.

Có điều hiện nay thực sự ngày càng nhiều công ty dùng RocketMQ, quả thật rất tốt, dù sao cũng là sản phẩm của Alibaba, nhưng cộng đồng có thể có rủi ro đột nhiên "ngỏm" (hiện nay RocketMQ đã được tặng cho [Apache](https://github.com/apache/rocketmq), nhưng mức độ hoạt động trên GitHub thực ra không cao). Nếu tuyệt đối tự tin vào năng lực kỹ thuật của công ty mình thì nên dùng RocketMQ, nếu không thì cứ ngoan ngoãn dùng RabbitMQ đi, họ có cộng đồng mã nguồn mở sôi nổi, tuyệt đối không "ngỏm" được.

Vì vậy với **công ty vừa và nhỏ**, năng lực kỹ thuật ở mức bình thường, thách thức kỹ thuật không quá cao, dùng RabbitMQ là lựa chọn không tồi; với **công ty lớn**, năng lực nghiên cứu phát triển kiến trúc nền tảng mạnh, dùng RocketMQ là lựa chọn rất tốt.

Nếu là các tình huống như tính toán thời gian thực, thu thập log trong **lĩnh vực dữ liệu lớn**, thì dùng Kafka là chuẩn mực của ngành, tuyệt đối không có vấn đề, mức độ hoạt động của cộng đồng rất cao, tuyệt đối không "ngỏm", huống chi nó gần như là quy chuẩn thực tế của lĩnh vực này trên toàn thế giới.
