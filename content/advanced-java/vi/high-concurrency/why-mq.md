---
source:
  locale: zh
  slug: why-mq
  hash: 'sha256:v1:d85800610bd5ac920111f2abc85b5b837999503953882cadb78dd816c7b9e240'
status: machine
translatedAt: '2026-10-14'
---
# Tại sao phải sử dụng hàng đợi thông điệp?

## Câu hỏi phỏng vấn

-   Tại sao phải sử dụng hàng đợi thông điệp (message queue)?
-   Hàng đợi thông điệp có ưu điểm và nhược điểm gì?
-   Kafka, ActiveMQ, RabbitMQ, RocketMQ khác nhau thế nào, và mỗi loại phù hợp với những tình huống nào?

## Tâm lý người phỏng vấn

Thực ra người phỏng vấn chủ yếu muốn xem:

-   **Thứ nhất**, bạn có biết vì sao hệ thống của mình lại phải dùng hàng đợi thông điệp hay không?

    Không ít ứng viên nói dự án của mình có dùng Redis, MQ, nhưng thực ra không biết tại sao phải dùng. Nói thẳng ra là dùng cho có, hoặc đó là kiến trúc do người khác thiết kế và họ chưa từng suy nghĩ về nó từ đầu đến cuối.

    Người chưa bao giờ tự hỏi "tại sao" về kiến trúc của mình chắc chắn là người bình thường không chịu suy nghĩ, và người phỏng vấn thường có ấn tượng rất xấu với kiểu ứng viên này. Họ lo rằng sau khi bạn vào nhóm, bạn chỉ biết làm việc máy móc mà không biết tự suy nghĩ.

-   **Thứ hai**, đã dùng hàng đợi thông điệp thì bạn có biết dùng nó có lợi và có hại gì không?

    Nếu chưa từng cân nhắc điều này mà cứ đưa MQ vào hệ thống một cách mù quáng, thì khi sự cố xảy ra, chẳng phải bạn sẽ bỏ đi và để lại hố cho công ty sao? Nếu bạn chưa cân nhắc những bất lợi và rủi ro có thể có khi đưa một công nghệ vào, thì người phỏng vấn mà tuyển ứng viên như vậy về cơ bản là tuyển phải kiểu "đào hố". Điều đáng sợ là bạn làm 1 năm đào ra cả đống hố, rồi tự nhảy việc, để lại hậu quả vô tận cho công ty.

-   **Thứ ba**, đã dùng MQ, có thể là một loại MQ cụ thể, vậy lúc đó bạn có khảo sát hay chưa?

    Đừng ngây ngô tự quyết theo sở thích cá nhân rồi dùng bừa một loại MQ, chẳng hạn Kafka, mà thậm chí chưa từng khảo sát xem trong ngành có những loại MQ phổ biến nào, ưu điểm và nhược điểm của từng loại là gì. Mỗi loại MQ **không có tốt hay xấu tuyệt đối**; vấn đề là dùng ở tình huống nào thì có thể **phát huy sở trường, tránh sở đoản, tận dụng ưu thế và né điểm yếu**.

    Nếu tuyển vào nhóm một ứng viên không cân nhắc việc chọn công nghệ, rồi leader giao cho anh ta thiết kế một hệ thống nào đó, anh ta dùng một số công nghệ bên trong mà có thể chưa từng cân nhắc việc lựa chọn, thì công nghệ cuối cùng được chọn chưa chắc đã phù hợp, và kết quả vẫn là để lại hố.

## Phân tích câu trả lời

### Tại sao phải sử dụng hàng đợi thông điệp

Thực chất là hỏi bạn hàng đợi thông điệp có những tình huống sử dụng nào, trong dự án của bạn cụ thể là tình huống nào, và trong tình huống đó bạn dùng hàng đợi thông điệp để làm gì.

Khi người phỏng vấn hỏi câu này, **câu trả lời mong đợi** là: công ty bạn có một **tình huống nghiệp vụ** nào đó, tình huống nghiệp vụ này có một thách thức kỹ thuật nào đó, nếu không dùng MQ thì có thể rất phiền phức, nhưng sau khi dùng MQ thì mang lại cho bạn rất nhiều lợi ích.

Trước hết hãy nói về các tình huống sử dụng phổ biến của hàng đợi thông điệp. Tình huống thì có rất nhiều, nhưng cốt lõi là 3 tình huống: **tách rời (decoupling)**, **bất đồng bộ**, **san phẳng đỉnh tải (peak shaving)**.

#### Tách rời

Hãy xem tình huống này. Hệ thống A gửi dữ liệu tới ba hệ thống B, C, D thông qua việc gọi API. Nếu hệ thống E cũng cần dữ liệu này thì sao? Nếu hệ thống D giờ không cần nữa thì sao? Người phụ trách hệ thống A gần như phát điên......

![mq-1](asset:high-concurrency/why-mq/mq-1.png)

Trong tình huống này, hệ thống A bị phụ thuộc chặt chẽ vào đủ loại hệ thống khác. Hệ thống A sinh ra một bản dữ liệu khá quan trọng, và rất nhiều hệ thống cần hệ thống A gửi dữ liệu này tới. Hệ thống A phải luôn luôn cân nhắc: nếu bốn hệ thống B, C, D, E sập thì làm sao? Có cần gửi lại không, có cần lưu thông điệp lại không? Tóc bạc hết cả rồi!

Nếu dùng MQ, hệ thống A sinh ra một bản dữ liệu và gửi vào MQ, hệ thống nào cần dữ liệu thì tự vào MQ để tiêu thụ. Nếu có hệ thống mới cần dữ liệu thì chỉ cần tiêu thụ trực tiếp từ MQ; nếu một hệ thống nào đó không cần dữ liệu này nữa thì chỉ cần hủy việc tiêu thụ thông điệp trong MQ. Như vậy, hệ thống A hoàn toàn không cần cân nhắc phải gửi dữ liệu cho ai, không cần bảo trì đoạn mã đó, cũng không cần quan tâm bên kia gọi thành công hay thất bại, hết thời gian chờ.

![mq-2](asset:high-concurrency/why-mq/mq-2.png)

**Tóm lại**: nhờ một MQ với mô hình publish/subscribe (Pub/Sub), hệ thống A được tách rời hoàn toàn khỏi các hệ thống khác.

**Mẹo phỏng vấn**: bạn cần cân nhắc xem trong hệ thống mình phụ trách có tình huống tương tự hay không, tức là một hệ thống hoặc một module gọi nhiều hệ thống hoặc module khác, các lời gọi giữa chúng rất phức tạp và bảo trì rất phiền. Nhưng thực ra những lời gọi này không cần gọi API đồng bộ trực tiếp; nếu dùng MQ để bất đồng bộ hóa và tách rời thì cũng được. Bạn cần cân nhắc xem trong dự án của mình có thể áp dụng MQ để tách rời hệ thống hay không. Hãy thể hiện nội dung này trong CV: dùng MQ để tách rời.

#### Bất đồng bộ

Hãy xem thêm một tình huống nữa. Hệ thống A nhận một yêu cầu, cần ghi vào cơ sở dữ liệu cục bộ của mình, đồng thời phải ghi vào cơ sở dữ liệu ở ba hệ thống B, C, D. Ghi cơ sở dữ liệu cục bộ mất 3ms, ghi cơ sở dữ liệu ở ba hệ thống B, C, D lần lượt mất 300ms, 450ms, 200ms. Tổng độ trễ của yêu cầu cuối cùng là 3 + 300 + 450 + 200 = 953ms, gần 1s, người dùng sẽ thấy sao mà chậm kinh khủng. Người dùng gửi yêu cầu qua trình duyệt rồi phải chờ khoảng 1s, điều này gần như không thể chấp nhận được.

![mq-3](asset:high-concurrency/why-mq/mq-3.png)

Với các doanh nghiệp internet nói chung, đối với thao tác trực tiếp của người dùng, yêu cầu thường là mỗi yêu cầu phải hoàn thành trong vòng 200 ms để người dùng gần như không cảm nhận được.

Nếu **dùng MQ**, hệ thống A gửi liên tiếp 3 thông điệp vào hàng đợi MQ, giả sử mất 5ms, thì tổng thời gian từ lúc hệ thống A nhận một yêu cầu đến lúc trả phản hồi cho người dùng là 3 + 5 = 8ms. Với người dùng, cảm giác chỉ là bấm một nút, 8ms sau là đã trả về ngay, thích quá! Website làm thật tốt, thật nhanh!

![mq-4](asset:high-concurrency/why-mq/mq-4.png)

#### San phẳng đỉnh tải

Mỗi ngày từ 0:00 đến 12:00, hệ thống A phẳng lặng, mỗi giây chỉ có 50 yêu cầu đồng thời. Nhưng cứ đến 12:00 ~ 13:00, số yêu cầu đồng thời mỗi giây đột nhiên tăng vọt lên hơn 5 nghìn. Tuy nhiên hệ thống lại làm việc trực tiếp trên MySQL, một lượng lớn yêu cầu đổ vào MySQL, mỗi giây thực thi khoảng 5 nghìn câu SQL trên MySQL.

Một MySQL thông thường chịu được khoảng 2 nghìn yêu cầu mỗi giây là gần hết sức; nếu mỗi giây tới 5 nghìn yêu cầu thì rất có thể sẽ đánh sập MySQL, khiến hệ thống sập và người dùng không thể dùng hệ thống nữa.

Nhưng khi giờ cao điểm qua đi, đến buổi chiều là giờ thấp điểm, có thể chỉ có 10 nghìn người dùng thao tác đồng thời trên website, số yêu cầu mỗi giây có thể chỉ khoảng 50, gần như không gây chút áp lực nào lên toàn hệ thống.

![mq-5](asset:high-concurrency/why-mq/mq-5.png)

Nếu dùng MQ, mỗi giây 5 nghìn yêu cầu được ghi vào MQ, hệ thống A mỗi giây xử lý tối đa 2 nghìn yêu cầu vì MySQL mỗi giây xử lý tối đa 2 nghìn. Hệ thống A từ từ kéo yêu cầu từ MQ về, mỗi giây kéo 2 nghìn yêu cầu, không vượt quá số yêu cầu tối đa mà mình xử lý được mỗi giây là ổn. Như vậy, dù vào giờ cao điểm, hệ thống A cũng tuyệt đối không bị sập. Còn MQ mỗi giây nhận vào 5 nghìn yêu cầu mà chỉ đưa ra 2 nghìn, kết quả là vào giờ cao điểm buổi trưa (1 tiếng), có thể có hàng trăm nghìn thậm chí hàng triệu yêu cầu bị tồn đọng trong MQ.

![mq-6](asset:high-concurrency/why-mq/mq-6.png)

Việc tồn đọng ngắn hạn trong giờ cao điểm này là chấp nhận được, vì sau giờ cao điểm, mỗi giây chỉ có 50 yêu cầu vào MQ, nhưng hệ thống A vẫn xử lý với tốc độ 2 nghìn yêu cầu mỗi giây. Vì vậy, chỉ cần giờ cao điểm qua đi, hệ thống A sẽ nhanh chóng xử lý hết số thông điệp tồn đọng.

### Hàng đợi thông điệp có ưu điểm và nhược điểm gì

Ưu điểm đã nói ở trên, đó là **mang lại lợi ích tương ứng trong các tình huống đặc thù**: **tách rời**, **bất đồng bộ**, **san phẳng đỉnh tải**.

Nhược điểm có mấy điểm sau:

-   Tính sẵn sàng của hệ thống giảm

    Hệ thống phụ thuộc vào càng nhiều thành phần bên ngoài thì càng dễ sập. Vốn dĩ chỉ cần hệ thống A gọi API của ba hệ thống B, C, D, bốn hệ thống A, B, C, D vẫn chạy tốt, không có vấn đề gì, vậy mà bạn cứ nhất quyết thêm MQ vào, lỡ MQ sập thì sao? MQ mà sập là cả hệ thống sụp đổ, thế chẳng phải bạn tiêu rồi sao? Về cách đảm bảo tính sẵn sàng cao của hàng đợi thông điệp, bạn có thể [bấm vào đây để xem](doc:advanced-java/high-concurrency/how-to-ensure-high-availability-of-message-queues).

-   Độ phức tạp của hệ thống tăng

    Cứng nhắc thêm MQ vào, làm sao bạn [đảm bảo thông điệp không bị tiêu thụ trùng lặp](doc:advanced-java/high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed)? Làm sao [xử lý trường hợp mất thông điệp](doc:advanced-java/high-concurrency/how-to-ensure-the-reliable-transmission-of-messages)? Làm sao đảm bảo tính thứ tự khi truyền thông điệp? Đau đầu quá, một đống vấn đề, khổ không tả nổi.

-   Vấn đề tính nhất quán

    Hệ thống A xử lý xong là trả về thành công ngay, ai cũng tưởng yêu cầu của bạn đã thành công; nhưng vấn đề là, ở ba hệ thống B, C, D, nếu hai hệ thống B và D ghi cơ sở dữ liệu thành công mà hệ thống C ghi thất bại thì làm sao? Dữ liệu của bạn sẽ không nhất quán.

    Vì vậy hàng đợi thông điệp thực chất là một kiến trúc rất phức tạp. Đưa nó vào có rất nhiều lợi ích, nhưng cũng phải có đủ loại phương án kỹ thuật và kiến trúc bổ sung để khắc phục những tác hại do nó mang lại. Làm xong bạn sẽ thấy, trời ơi, độ phức tạp của hệ thống tăng lên cả một bậc, có thể phức tạp gấp 10 lần. Nhưng vào thời điểm then chốt, cần dùng thì vẫn phải dùng.

### Kafka, ActiveMQ, RabbitMQ, RocketMQ có ưu điểm và nhược điểm gì?

| Đặc tính                              | ActiveMQ                                                       | RabbitMQ                                                                  | RocketMQ                                                                                                                                          | Kafka                                                                                                                                                                                       |
| ------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thông lượng trên một máy              | Hàng chục nghìn, thấp hơn RocketMQ và Kafka một bậc            | Giống ActiveMQ                                                            | Hàng trăm nghìn, hỗ trợ thông lượng cao                                                                                                           | Hàng trăm nghìn, thông lượng cao, thường kết hợp với các hệ thống dữ liệu lớn trong các tình huống như tính toán dữ liệu thời gian thực, thu thập log                                        |
| Ảnh hưởng của số lượng topic đến thông lượng |                                                         |                                                                           | Số topic có thể đạt hàng trăm/hàng nghìn, thông lượng chỉ giảm nhẹ, đây là một ưu thế lớn của RocketMQ; với cùng cấu hình máy vẫn hỗ trợ được rất nhiều topic | Khi số topic tăng từ vài chục lên vài trăm, thông lượng giảm mạnh; với cùng cấu hình máy, Kafka cố gắng không để số topic quá nhiều, nếu cần hỗ trợ số topic lớn thì phải tăng thêm tài nguyên máy |
| Độ trễ                                | Mức ms                                                         | Mức micro giây, đây là một đặc điểm lớn của RabbitMQ, độ trễ thấp nhất    | Mức ms                                                                                                                                            | Độ trễ trong vòng mức ms                                                                                                                                                                    |
| Tính sẵn sàng                         | Cao, đạt tính sẵn sàng cao dựa trên kiến trúc master/replica (master-slave) | Giống ActiveMQ                                                | Rất cao, kiến trúc phân tán                                                                                                                       | Rất cao, phân tán, một dữ liệu có nhiều bản sao, một số ít máy sập cũng không mất dữ liệu và không gây mất tính sẵn sàng                                                                    |
| Độ tin cậy của thông điệp             | Có xác suất thấp bị mất dữ liệu                                | Về cơ bản không mất                                                       | Sau khi tối ưu cấu hình tham số, có thể đạt mức không mất dữ liệu                                                                                 | Giống RocketMQ                                                                                                                                                                              |
| Hỗ trợ tính năng                      | Tính năng trong lĩnh vực MQ cực kỳ đầy đủ                      | Phát triển bằng erlang, khả năng xử lý đồng thời rất mạnh, hiệu năng rất tốt, độ trễ rất thấp | Tính năng MQ khá hoàn thiện, lại còn phân tán, khả năng mở rộng tốt                                                                  | Tính năng khá đơn giản, chủ yếu hỗ trợ các chức năng MQ cơ bản, được sử dụng quy mô lớn trong tính toán thời gian thực và thu thập log ở lĩnh vực dữ liệu lớn                                |

Tổng hợp lại, sau khi so sánh đủ mặt, có các khuyến nghị sau:

Khi một hệ thống nghiệp vụ thông thường cần đưa MQ vào, thời kỳ đầu mọi người đều dùng ActiveMQ, nhưng hiện nay thực sự không còn nhiều người dùng nữa, nó chưa được kiểm chứng trong các tình huống thông lượng lớn, cộng đồng cũng không sôi động, nên mọi người thôi bỏ đi, cá nhân tôi không khuyến nghị dùng nó nữa.

Sau đó mọi người bắt đầu dùng RabbitMQ, nhưng ngôn ngữ erlang đã ngăn cản rất nhiều kỹ sư Java đi sâu nghiên cứu và làm chủ nó, đối với công ty thì gần như ở trạng thái không kiểm soát được; tuy nhiên nó là mã nguồn mở, được hỗ trợ khá ổn định và có độ sôi động cao.

Còn hiện nay ngày càng nhiều công ty dùng RocketMQ, quả thật rất tốt, dù sao cũng là sản phẩm của Alibaba, nhưng cộng đồng có thể có nguy cơ đột ngột "tắt lịm" (hiện RocketMQ đã được tặng cho [Apache](https://github.com/apache/rocketmq), nhưng mức độ sôi động trên GitHub thực ra không cao). Nếu bạn hoàn toàn tự tin vào năng lực kỹ thuật của công ty mình thì khuyến nghị dùng RocketMQ, còn không thì cứ ngoan ngoãn dùng RabbitMQ, họ có cộng đồng mã nguồn mở sôi động, chắc chắn sẽ không "tắt lịm".

Vì vậy, với **công ty vừa và nhỏ**, năng lực kỹ thuật ở mức bình thường, thách thức kỹ thuật không quá cao, dùng RabbitMQ là lựa chọn tốt; với **công ty lớn**, năng lực nghiên cứu phát triển hạ tầng mạnh, dùng RocketMQ là lựa chọn rất hay.

Nếu là các tình huống như tính toán thời gian thực, thu thập log trong **lĩnh vực dữ liệu lớn**, thì dùng Kafka là tiêu chuẩn của ngành, tuyệt đối không có vấn đề gì, mức độ sôi động của cộng đồng rất cao, chắc chắn sẽ không "tắt lịm", huống chi nó gần như là quy chuẩn thực tế của lĩnh vực này trên toàn thế giới.
