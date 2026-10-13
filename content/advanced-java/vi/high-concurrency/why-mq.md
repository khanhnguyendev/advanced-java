---
source:
  locale: zh
  slug: why-mq
  hash: 'sha256:v1:d85800610bd5ac920111f2abc85b5b837999503953882cadb78dd816c7b9e240'
status: machine
translatedAt: '2026-10-14'
---
# Tại sao nên dùng hàng đợi tin nhắn?

## Câu hỏi phỏng vấn

-   Tại sao nên dùng hàng đợi tin nhắn?
-   Hàng đợi tin nhắn có những ưu điểm và nhược điểm gì?
-   Kafka, ActiveMQ, RabbitMQ, RocketMQ khác nhau thế nào, và phù hợp với những tình huống nào?

## Tâm lý người phỏng vấn

Thực ra người phỏng vấn chủ yếu muốn xem:

-   **Thứ nhất**, bạn có biết vì sao hệ thống của các bạn lại phải dùng hàng đợi tin nhắn hay không?

    Không ít ứng viên nói rằng dự án của mình đã dùng Redis, MQ, nhưng thực ra họ không biết vì sao phải dùng những thứ đó. Nói thẳng ra là dùng cho có, hoặc là kiến trúc do người khác thiết kế, còn họ từ đầu đến cuối chưa từng suy nghĩ.

    Người chưa bao giờ tự hỏi "tại sao" về kiến trúc của mình chắc chắn là người bình thường không chịu suy nghĩ, và người phỏng vấn thường có ấn tượng rất xấu về loại ứng viên này. Bởi họ lo rằng sau khi bạn vào nhóm, bạn sẽ chỉ làm việc máy móc, đần độn mà không biết tự suy nghĩ.

-   **Thứ hai**, đã dùng hàng đợi tin nhắn thì bạn có biết dùng nó có lợi và hại gì không?

    Nếu bạn chưa từng cân nhắc điều này, mà cứ mù quáng đưa một MQ vào hệ thống, thì sau này xảy ra sự cố có phải bạn sẽ bỏ đi, để lại hố cho công ty không? Nếu bạn chưa từng cân nhắc những mặt trái và rủi ro có thể có khi đưa một công nghệ vào, thì nếu người phỏng vấn tuyển loại ứng viên này vào, về cơ bản đó rất có thể là kiểu người đào hố. Sợ nhất là bạn làm 1 năm đào một đống hố rồi tự nhảy việc, để lại hậu quả vô tận cho công ty.

-   **Thứ ba**, bạn đã dùng MQ, có thể là một loại MQ cụ thể nào đó, vậy lúc đó bạn đã khảo sát chưa?

    Đừng ngây ngô tự quyết định theo sở thích cá nhân rồi dùng bừa một MQ, ví dụ Kafka, thậm chí chưa từng tìm hiểu xem trong ngành đang phổ biến những loại MQ nào, ưu điểm và nhược điểm của từng loại là gì. Mỗi MQ **không có tốt xấu tuyệt đối**, mà quan trọng là dùng vào tình huống nào thì có thể **phát huy sở trường, tận dụng ưu thế, tránh điểm yếu**.

    Nếu tuyển vào nhóm một ứng viên không biết cân nhắc lựa chọn công nghệ, khi leader giao cho họ một nhiệm vụ, chẳng hạn thiết kế một hệ thống nào đó, họ dùng một số công nghệ bên trong mà có thể chưa từng cân nhắc việc lựa chọn, thì công nghệ được chọn cuối cùng chưa chắc đã phù hợp, và cũng là để lại hố.

## Phân tích câu trả lời

### Tại sao nên dùng hàng đợi tin nhắn

Thực ra là hỏi bạn hàng đợi tin nhắn có những tình huống sử dụng nào, rồi trong dự án của bạn cụ thể là tình huống gì, và bạn dùng hàng đợi tin nhắn trong tình huống đó để làm gì.

Khi người phỏng vấn hỏi câu này, **câu trả lời mong đợi** là: công ty bạn có một **tình huống nghiệp vụ** nào đó, tình huống nghiệp vụ này có một thách thức kỹ thuật nào đó, nếu không dùng MQ có thể sẽ rất phiền phức, nhưng sau khi dùng MQ thì nó mang lại cho bạn rất nhiều lợi ích.

Trước hết hãy nói về các tình huống sử dụng phổ biến của hàng đợi tin nhắn. Thực ra có rất nhiều tình huống, nhưng cốt lõi có 3 tình huống: **tách rời (decoupling)**, **bất đồng bộ**, **san phẳng đỉnh tải**.

#### Tách rời

Hãy xem tình huống này. Hệ thống A gửi dữ liệu đến ba hệ thống B, C, D thông qua lời gọi giao diện. Nếu hệ thống E cũng cần dữ liệu này thì sao? Nếu bây giờ hệ thống D không cần nữa thì sao? Người phụ trách hệ thống A gần như suy sụp......

![mq-1](asset:high-concurrency/why-mq/mq-1.png)

Trong tình huống này, hệ thống A bị ràng buộc chặt chẽ với đủ thứ hệ thống khác. Hệ thống A tạo ra một dữ liệu khá quan trọng, và rất nhiều hệ thống cần hệ thống A gửi dữ liệu này đến. Hệ thống A phải luôn luôn cân nhắc: nếu bốn hệ thống B, C, D, E bị sập thì làm thế nào? Có phải gửi lại không, có phải lưu tin nhắn lại không? Tóc bạc hết cả rồi!

Nếu dùng MQ, hệ thống A tạo ra một dữ liệu và gửi vào MQ, hệ thống nào cần dữ liệu thì tự vào MQ để tiêu thụ. Nếu có hệ thống mới cần dữ liệu, chỉ cần tiêu thụ trực tiếp từ MQ; nếu một hệ thống không cần dữ liệu này nữa thì chỉ cần hủy việc tiêu thụ tin nhắn từ MQ. Như vậy, hệ thống A hoàn toàn không cần cân nhắc phải gửi dữ liệu cho ai, không cần bảo trì đoạn mã này, cũng không cần quan tâm họ gọi thành công hay thất bại, hết thời gian chờ hay không.

![mq-2](asset:high-concurrency/why-mq/mq-2.png)

**Tổng kết**: thông qua một MQ với mô hình tin nhắn Pub/Sub (xuất bản/đăng ký), hệ thống A được tách rời hoàn toàn khỏi các hệ thống khác.

**Mẹo phỏng vấn**: bạn cần cân nhắc xem trong hệ thống bạn phụ trách có tình huống tương tự hay không, tức là một hệ thống hoặc một module gọi nhiều hệ thống hoặc module khác, các lời gọi giữa chúng rất phức tạp và bảo trì rất phiền phức. Nhưng thực ra những lời gọi này không cần phải gọi giao diện đồng bộ trực tiếp, nếu dùng MQ để bất đồng bộ hóa và tách rời chúng cũng được. Bạn cần cân nhắc xem trong dự án của mình có thể áp dụng MQ để tách rời hệ thống hay không. Hãy thể hiện phần này trong CV: dùng MQ để tách rời.

#### Bất đồng bộ

Xem tiếp một tình huống nữa. Hệ thống A nhận một yêu cầu, cần ghi vào cơ sở dữ liệu cục bộ của mình, đồng thời còn cần ghi vào cơ sở dữ liệu của ba hệ thống B, C, D. Ghi vào cơ sở dữ liệu cục bộ mất 3ms, ba hệ thống B, C, D ghi vào cơ sở dữ liệu lần lượt mất 300ms, 450ms, 200ms. Tổng độ trễ của yêu cầu cuối cùng là 3 + 300 + 450 + 200 = 953ms, gần 1s, người dùng cảm thấy cái gì mà chậm kinh khủng. Người dùng gửi yêu cầu qua trình duyệt rồi chờ 1s, điều này gần như không thể chấp nhận được.

![mq-3](asset:high-concurrency/why-mq/mq-3.png)

Thông thường, các doanh nghiệp internet yêu cầu các thao tác trực tiếp của người dùng phải hoàn thành mỗi yêu cầu trong vòng 200 ms, để người dùng gần như không cảm nhận được.

Nếu **dùng MQ**, hệ thống A gửi liên tiếp 3 tin nhắn vào hàng đợi MQ, giả sử mất 5ms, thì tổng thời gian từ lúc hệ thống A nhận một yêu cầu đến lúc trả phản hồi cho người dùng là 3 + 5 = 8ms. Với người dùng, cảm giác chỉ là bấm một nút, 8ms sau là trả về ngay, sướng! Website làm thật tốt, thật nhanh!

![mq-4](asset:high-concurrency/why-mq/mq-4.png)

#### San phẳng đỉnh tải

Mỗi ngày từ 0:00 đến 12:00, hệ thống A rất yên ả, mỗi giây chỉ có 50 yêu cầu đồng thời. Nhưng mỗi khi đến 12:00 ~ 13:00, số lượng yêu cầu đồng thời mỗi giây đột ngột tăng vọt lên 5k+. Nhưng hệ thống dựa trực tiếp trên MySQL, một lượng lớn yêu cầu đổ vào MySQL, mỗi giây thực thi khoảng 5k câu SQL trên MySQL.

Một MySQL thông thường chịu được khoảng 2k yêu cầu mỗi giây là gần hết khả năng, nếu mỗi giây có 5k yêu cầu thì có thể làm MySQL sập luôn, khiến hệ thống sụp đổ và người dùng không thể sử dụng hệ thống nữa.

Nhưng khi giờ cao điểm qua đi, đến buổi chiều là giờ thấp điểm, có thể chỉ có 1w (10 nghìn) người dùng thao tác đồng thời trên website, số lượng yêu cầu mỗi giây có thể chỉ khoảng 50, gần như không gây áp lực gì cho toàn hệ thống.

![mq-5](asset:high-concurrency/why-mq/mq-5.png)

Nếu dùng MQ, mỗi giây 5k yêu cầu được ghi vào MQ, hệ thống A mỗi giây xử lý tối đa 2k yêu cầu, vì MySQL mỗi giây xử lý tối đa 2k. Hệ thống A từ từ kéo yêu cầu từ MQ về, mỗi giây kéo 2k yêu cầu, không vượt quá số lượng yêu cầu tối đa mà nó xử lý được mỗi giây là ổn. Như vậy, dù là giờ cao điểm, hệ thống A cũng tuyệt đối không bị sập. Còn MQ mỗi giây nhận vào 5k yêu cầu mà chỉ đưa ra 2k yêu cầu, kết quả là vào giờ cao điểm buổi trưa (1 tiếng), có thể có vài chục vạn thậm chí vài triệu yêu cầu bị tồn đọng trong MQ.

![mq-6](asset:high-concurrency/why-mq/mq-6.png)

Việc tồn đọng ngắn hạn trong giờ cao điểm này là ổn, vì sau khi giờ cao điểm qua đi, mỗi giây chỉ có 50 yêu cầu vào MQ, nhưng hệ thống A vẫn xử lý với tốc độ 2k yêu cầu mỗi giây. Vì vậy, chỉ cần giờ cao điểm qua đi, hệ thống A sẽ nhanh chóng giải quyết hết số tin nhắn tồn đọng.

### Hàng đợi tin nhắn có ưu điểm và nhược điểm gì

Ưu điểm đã nói ở trên, đó là **có những lợi ích tương ứng trong các tình huống đặc biệt**: **tách rời**, **bất đồng bộ**, **san phẳng đỉnh tải**.

Nhược điểm có mấy điểm sau:

-   Tính khả dụng của hệ thống giảm

    Hệ thống càng đưa vào nhiều phụ thuộc bên ngoài thì càng dễ sập. Vốn dĩ chỉ là hệ thống A gọi giao diện của ba hệ thống B, C, D, bốn hệ thống A, B, C, D vẫn đang chạy tốt, không có vấn đề gì, vậy mà bạn cứ nhất quyết thêm một MQ vào, lỡ MQ sập thì sao? MQ mà sập là cả hệ thống sụp đổ, bạn chẳng phải xong đời sao? Về cách đảm bảo tính sẵn sàng cao của hàng đợi tin nhắn, bạn có thể [nhấp vào đây để xem](doc:advanced-java/high-concurrency/how-to-ensure-high-availability-of-message-queues).

-   Độ phức tạp của hệ thống tăng

    Cứng nhắc thêm một MQ vào, bạn làm thế nào để [đảm bảo tin nhắn không bị tiêu thụ trùng lặp](doc:advanced-java/high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed)? Làm thế nào để [xử lý trường hợp mất tin nhắn](doc:advanced-java/high-concurrency/how-to-ensure-the-reliable-transmission-of-messages)? Làm thế nào để đảm bảo tính thứ tự khi truyền tin nhắn? Đau đầu quá, một đống vấn đề, khổ sở vô cùng.

-   Vấn đề nhất quán

    Hệ thống A xử lý xong rồi trả về thành công ngay, ai cũng nghĩ yêu cầu của bạn đã thành công; nhưng vấn đề là, nếu trong ba hệ thống B, C, D, hai hệ thống B và D ghi cơ sở dữ liệu thành công, còn hệ thống C ghi thất bại, thì làm sao? Dữ liệu của bạn sẽ không nhất quán.

    Vì vậy hàng đợi tin nhắn thực chất là một kiến trúc rất phức tạp. Việc đưa nó vào mang lại nhiều lợi ích, nhưng bạn cũng phải xây dựng đủ loại giải pháp kỹ thuật và kiến trúc bổ sung để tránh những mặt trái mà nó gây ra. Làm xong bạn sẽ thấy, trời ơi, độ phức tạp của hệ thống tăng lên cả một bậc độ lớn, có lẽ phức tạp gấp 10 lần. Nhưng vào thời khắc then chốt, cần dùng thì vẫn phải dùng.

### Kafka, ActiveMQ, RabbitMQ, RocketMQ có ưu điểm và nhược điểm gì?

| Đặc tính                         | ActiveMQ                                              | RabbitMQ                                                               | RocketMQ                                                                                                                                         | Kafka                                                                                                                                                                                              |
| -------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thông lượng trên một máy         | Cấp vạn, thấp hơn RocketMQ và Kafka một bậc độ lớn    | Giống ActiveMQ                                                         | Cấp 10 vạn, hỗ trợ thông lượng cao                                                                                                               | Cấp 10 vạn, thông lượng cao, thường kết hợp với các hệ thống dữ liệu lớn trong các tình huống như tính toán dữ liệu thời gian thực, thu thập log                                                    |
| Ảnh hưởng của số lượng topic đến thông lượng |                                           |                                                                        | topic có thể đạt cấp vài trăm/vài nghìn, thông lượng chỉ giảm nhẹ, đây là một ưu thế lớn của RocketMQ, với cùng số máy có thể hỗ trợ lượng lớn topic | Khi topic tăng từ vài chục đến vài trăm, thông lượng giảm mạnh; với cùng số máy, Kafka cố gắng giữ số lượng topic không quá nhiều, nếu cần hỗ trợ topic quy mô lớn thì phải tăng thêm tài nguyên máy |
| Tính kịp thời                    | Cấp ms                                                | Cấp micro giây, đây là một đặc điểm lớn của RabbitMQ, độ trễ thấp nhất | Cấp ms                                                                                                                                           | Độ trễ trong vòng cấp ms                                                                                                                                                                           |
| Tính khả dụng                    | Cao, đạt tính sẵn sàng cao dựa trên kiến trúc primary/replica | Giống ActiveMQ                                                 | Rất cao, kiến trúc phân tán                                                                                                                      | Rất cao, phân tán, một dữ liệu có nhiều bản sao, một số ít máy sập cũng không mất dữ liệu, không gây mất khả dụng                                                                                   |
| Độ tin cậy của tin nhắn          | Có xác suất thấp bị mất dữ liệu                       | Về cơ bản không mất                                                    | Sau khi tối ưu cấu hình tham số, có thể đạt 0 mất mát                                                                                            | Giống RocketMQ                                                                                                                                                                                     |
| Hỗ trợ chức năng                 | Chức năng trong lĩnh vực MQ cực kỳ đầy đủ             | Phát triển bằng erlang, khả năng đồng thời rất mạnh, hiệu năng cực tốt, độ trễ rất thấp | Chức năng MQ khá hoàn thiện, lại còn phân tán, khả năng mở rộng tốt                                                                  | Chức năng khá đơn giản, chủ yếu hỗ trợ các chức năng MQ cơ bản, được sử dụng quy mô lớn trong tính toán thời gian thực và thu thập log ở lĩnh vực dữ liệu lớn                                      |

Tóm lại, sau khi so sánh các mặt, có những đề xuất sau:

Các hệ thống nghiệp vụ thông thường khi cần đưa MQ vào, thuở ban đầu mọi người đều dùng ActiveMQ, nhưng hiện nay thực sự không còn nhiều người dùng nữa, nó chưa được kiểm chứng trong các tình huống thông lượng quy mô lớn, cộng đồng cũng không sôi động lắm, nên thôi bỏ đi, cá nhân tôi không khuyên dùng nó nữa.

Sau đó mọi người bắt đầu dùng RabbitMQ, nhưng đúng là ngôn ngữ erlang đã cản trở một lượng lớn kỹ sư Java đi sâu nghiên cứu và làm chủ nó, đối với công ty thì gần như ở trạng thái không kiểm soát được, nhưng phải nói rằng nó là mã nguồn mở, được hỗ trợ khá ổn định, và độ sôi động cũng cao.

Tuy nhiên hiện nay ngày càng có nhiều công ty dùng RocketMQ, thực sự rất tốt, dù sao cũng là sản phẩm của Alibaba, nhưng cộng đồng có thể có rủi ro đột ngột "ngỏm" (hiện RocketMQ đã được quyên tặng cho [Apache](https://github.com/apache/rocketmq), nhưng độ sôi động trên GitHub thực ra không cao). Nếu bạn hoàn toàn tự tin vào sức mạnh kỹ thuật của công ty mình thì nên dùng RocketMQ, nếu không thì hãy về ngoan ngoãn dùng RabbitMQ, họ có cộng đồng mã nguồn mở sôi động, tuyệt đối không "ngỏm".

Vì vậy, đối với **công ty vừa và nhỏ**, sức mạnh kỹ thuật tương đối bình thường, thách thức kỹ thuật không quá cao, dùng RabbitMQ là lựa chọn tốt; còn **công ty lớn**, năng lực nghiên cứu phát triển hạ tầng mạnh, dùng RocketMQ là lựa chọn rất tốt.

Nếu là các tình huống như tính toán thời gian thực, thu thập log trong **lĩnh vực dữ liệu lớn**, thì dùng Kafka là tiêu chuẩn của ngành, tuyệt đối không có vấn đề gì, độ sôi động của cộng đồng rất cao, tuyệt đối không "ngỏm", huống chi nó gần như là chuẩn mực thực tế của lĩnh vực này trên toàn thế giới.
