---
source:
  locale: zh
  slug: how-to-ensure-high-availability-of-message-queues
  hash: 'sha256:v1:e8e01d6d26e4e66d57f95452983a1d2f7a0c230f14314b32a7623988e2babed8'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để đảm bảo tính sẵn sàng cao của hàng đợi thông điệp?

## Câu hỏi phỏng vấn

Làm thế nào để đảm bảo tính sẵn sàng cao của hàng đợi thông điệp?

## Tâm lý người phỏng vấn

Nếu có người hỏi bạn về kiến thức MQ, thì **tính sẵn sàng cao là câu chắc chắn phải hỏi**. [Bài trước](doc:advanced-java/high-concurrency/why-mq) đã nhắc đến việc MQ sẽ làm **giảm tính sẵn sàng của hệ thống**. Vì vậy, chỉ cần bạn dùng MQ thì những điểm tiếp theo được hỏi chắc chắn xoay quanh việc giải quyết các nhược điểm đó của MQ như thế nào.

Nếu bạn ngây ngô cứ thế dùng một MQ mà chưa từng cân nhắc các loại vấn đề, thì bạn xong đời rồi, cảm nhận của người phỏng vấn về bạn sẽ là: chỉ biết dùng đơn giản một số công nghệ, không hề suy nghĩ, và ấn tượng về bạn lập tức không tốt. Nhận những bạn như vậy vào làm một nhân viên bình thường với mức lương dưới 20k thì còn tạm được, nhưng nếu làm kỹ sư cao cấp với mức lương từ 20k trở lên thì thảm, để bạn thiết kế một hệ thống thì bên trong chắc chắn đầy cạm bẫy, xảy ra sự cố thì công ty thiệt hại, cả nhóm cùng gánh trách nhiệm.

## Phân tích câu trả lời

Câu hỏi đặt ra theo cách này là rất hay, vì không thể hỏi bạn đảm bảo tính sẵn sàng cao của Kafka như thế nào, tính sẵn sàng cao của ActiveMQ như thế nào. Người phỏng vấn mà hỏi vậy thì tỏ ra rất thiếu trình độ, người ta có thể đang dùng RabbitMQ, chưa dùng Kafka, vậy bạn vừa vào đã hỏi người ta về Kafka làm gì? Chẳng phải rõ ràng là làm khó người ta sao.

Vì vậy, người phỏng vấn có trình độ sẽ hỏi: đảm bảo tính sẵn sàng cao của MQ như thế nào? Như vậy là bạn dùng MQ nào thì cứ nói về cách bạn hiểu tính sẵn sàng cao của MQ đó.

### Tính sẵn sàng cao của RabbitMQ

RabbitMQ khá tiêu biểu, vì nó **dựa trên master/replica (master-slave)** (không phân tán) để đạt tính sẵn sàng cao, nên ta lấy RabbitMQ làm ví dụ để giải thích cách thứ nhất hiện thực hóa tính sẵn sàng cao của MQ.

RabbitMQ có ba chế độ: chế độ trên một máy, chế độ cụm (cluster) thông thường, chế độ cụm phản chiếu (mirror).

#### Chế độ trên một máy

Chế độ trên một máy chỉ ở mức Demo, thường là bạn khởi động cục bộ để chơi thử, không ai dùng chế độ trên một máy trong môi trường production.

#### Chế độ cụm thông thường (không có tính sẵn sàng cao)

Chế độ cụm thông thường nghĩa là khởi động nhiều instance RabbitMQ trên nhiều máy, mỗi máy một instance. **Queue bạn tạo ra chỉ nằm trên một instance RabbitMQ**, nhưng mỗi instance đều đồng bộ siêu dữ liệu (metadata) của queue (metadata có thể hiểu là một số thông tin cấu hình của queue, thông qua metadata có thể tìm ra instance chứa queue). Khi bạn tiêu thụ, nếu thực tế kết nối vào một instance khác, thì instance đó sẽ kéo dữ liệu từ instance chứa queue về.

![mq-7](diagram:high-concurrency/how-to-ensure-high-availability-of-message-queues/mq-7)

Cách này thực sự rất phiền phức, cũng không hay lắm, **chưa đạt được cái gọi là phân tán**, chỉ là một cụm thông thường. Bởi vì điều này dẫn đến việc hoặc là consumer mỗi lần kết nối ngẫu nhiên một instance rồi kéo dữ liệu, hoặc là cố định kết nối đến instance chứa queue đó để tiêu thụ dữ liệu; cách đầu có **chi phí kéo dữ liệu**, cách sau dẫn đến **nút thắt cổ chai hiệu năng ở một instance**.

Hơn nữa, nếu instance chứa queue sập, các instance khác sẽ không thể kéo dữ liệu từ instance đó nữa; nếu bạn **bật lưu trữ bền vững (persistence) thông điệp**, để RabbitMQ ghi thông điệp xuống đĩa, thì **thông điệp không nhất thiết bị mất**, phải chờ instance này phục hồi rồi mới có thể tiếp tục kéo dữ liệu từ queue này.

Vì vậy chuyện này khá khó xử, nó **không có cái gọi là tính sẵn sàng cao**, **phương án này chủ yếu để tăng thông lượng**, tức là để nhiều node trong cụm cùng phục vụ các thao tác đọc ghi của một queue.

#### Chế độ cụm phản chiếu (⚠️ đã bị loại bỏ, không khuyến nghị sử dụng)

> **⚠️ Cập nhật quan trọng**: Kể từ RabbitMQ 4.0, chế độ cụm phản chiếu đã chính thức bị loại bỏ, không còn hỗ trợ thêm chính sách phản chiếu mới. Khuyến nghị người dùng hiện tại nhanh chóng chuyển sang Quorum Queues.

Chế độ này từng là chế độ có tính sẵn sàng cao của RabbitMQ. Khác với chế độ cụm thông thường, trong chế độ cụm phản chiếu, queue bạn tạo, cả metadata lẫn thông điệp trong queue đều **tồn tại trên nhiều instance**, tức là mỗi node RabbitMQ đều có một **bản phản chiếu hoàn chỉnh** của queue này, nghĩa là chứa toàn bộ dữ liệu của queue. Sau đó mỗi lần bạn ghi thông điệp vào queue, **thông điệp sẽ được tự động đồng bộ** sang queue trên nhiều instance.

![mq-8](diagram:high-concurrency/how-to-ensure-high-availability-of-message-queues/mq-8)

Vậy **làm thế nào để bật chế độ cụm phản chiếu**? Thực ra rất đơn giản, RabbitMQ có bảng điều khiển quản trị rất tốt, chỉ cần thêm một chính sách ở trang quản trị, chính sách này là **chính sách của chế độ cụm phản chiếu**, khi chỉ định có thể yêu cầu đồng bộ dữ liệu sang tất cả node, hoặc đồng bộ sang một số lượng node chỉ định; khi tạo queue lần sau và áp dụng chính sách này, dữ liệu sẽ tự động được đồng bộ sang các node khác.

Như vậy, ưu điểm là bất kỳ máy nào sập cũng không sao, các máy (node) khác vẫn chứa dữ liệu hoàn chỉnh của queue này, các consumer khác đều có thể sang node khác để tiêu thụ dữ liệu. Nhược điểm thì, thứ nhất, chi phí hiệu năng quá lớn, thông điệp cần được đồng bộ sang tất cả các máy, dẫn đến áp lực và tiêu hao băng thông mạng rất nặng! Thứ hai, chơi kiểu này thì không phải phân tán, **không có khả năng mở rộng**, nếu một queue có tải rất nặng, bạn thêm máy thì máy mới thêm vào cũng chứa toàn bộ dữ liệu của queue này, và **không có cách nào mở rộng tuyến tính** queue của bạn. Bạn thử nghĩ, nếu lượng dữ liệu của queue này rất lớn, lớn đến mức dung lượng máy này không chứa nổi, lúc đó phải làm sao?


#### Quorum Queues (hàng đợi quorum, khuyến nghị)

Từ RabbitMQ 3.8, Quorum Queues (hàng đợi quorum) được đưa vào như giải pháp tính sẵn sàng cao mới, nhằm thay thế chế độ cụm phản chiếu truyền thống.

**Nguyên lý cốt lõi**: Dựa trên thuật toán đồng thuận Raft, Quorum Queues đạt tính nhất quán dữ liệu giữa nhiều node thông qua sao chép quorum.

**Ưu điểm chính**:
- **Tính nhất quán dữ liệu**: Dựa trên thuật toán Raft, đảm bảo thông điệp chỉ được coi là ghi thành công sau khi đa số node trong quorum xác nhận
- **Tự động chuyển đổi dự phòng khi lỗi**: sau khi node leader sập, tự động bầu chọn lại, không cần can thiệp thủ công
- **Mở rộng tuyến tính**: có thể mở rộng số lượng bản sao độc lập, không bị giới hạn bởi dung lượng của một node
- **Tối ưu lưu trữ bền vững**: hỗ trợ lưu trữ theo phân đoạn, hiệu năng tốt hơn khi flush cuốn chiếu

**Ví dụ cấu hình**:
```bash
rabbitmqctl set_policy ha-quorum "^quorum\." '{"ha-mode":" quorum"}'
```

**Kịch bản phù hợp**:
- Môi trường production yêu cầu cao về độ tin cậy dữ liệu
- Triển khai phân tán cần khả năng mở rộng tốt hơn
- Lộ trình nâng cấp thay thế chế độ cụm phản chiếu truyền thống

**Lưu ý**:
- Quorum Queues chỉ hỗ trợ thông điệp bền vững (persistent), không phù hợp với queue tạm thời
- Tiêu hao tài nguyên cao hơn queue thông thường, cần hoạch định hợp lý số lượng node
- Cần tối thiểu 3 node mới có thể hình thành quorum hợp lệ

**Khuyến nghị di chuyển**: Với các queue hiện đang dùng cụm phản chiếu, khuyến nghị di chuyển dần sang Quorum Queues. Trong quá trình di chuyển cần chú ý cấu hình lưu trữ bền vững của thông điệp và khả năng tương thích của consumer.

### Tính sẵn sàng cao của Kafka

Một nhận thức kiến trúc cơ bản nhất về Kafka: gồm nhiều broker, mỗi broker là một node; bạn tạo một topic, topic này có thể chia thành nhiều partition, mỗi partition có thể nằm trên các broker khác nhau, mỗi partition chứa một phần dữ liệu.

Đây chính là **hàng đợi thông điệp phân tán một cách tự nhiên**, tức là dữ liệu của một topic **được đặt phân tán trên nhiều máy, mỗi máy chứa một phần dữ liệu**.

Thực tế RabbitMQ và các loại tương tự không phải là hàng đợi thông điệp phân tán, nó là hàng đợi thông điệp truyền thống, chỉ là cung cấp một số cơ chế cụm, HA (High Availability, tính sẵn sàng cao) mà thôi, vì dù chơi kiểu gì, dữ liệu của một queue trong RabbitMQ cũng nằm trong một node, ở chế độ cụm phản chiếu thì mỗi node đều chứa dữ liệu hoàn chỉnh của queue đó.

Trước Kafka 0.8, không có cơ chế HA, tức là bất kỳ broker nào sập thì partition trên broker đó coi như vô dụng, không ghi được cũng không đọc được, không có tính sẵn sàng cao nào để nói.

Ví dụ, giả sử ta tạo một topic, chỉ định số partition là 3, nằm trên ba máy. Nhưng nếu máy thứ hai sập, thì 1/3 dữ liệu của topic này sẽ mất, do đó không thể đạt tính sẵn sàng cao.

![kafka-before](diagram:high-concurrency/how-to-ensure-high-availability-of-message-queues/kafka-before)

Sau Kafka 0.8, cơ chế HA được cung cấp, đó là cơ chế replica (bản sao). Dữ liệu của mỗi partition đều được đồng bộ sang các máy khác, tạo thành nhiều replica của chính nó. Tất cả replica sẽ bầu ra một leader, việc sản xuất và tiêu thụ đều làm việc với leader này, các replica còn lại là follower. Khi ghi, leader chịu trách nhiệm đồng bộ dữ liệu sang tất cả follower, khi đọc thì đọc thẳng dữ liệu trên leader. Tại sao chỉ đọc ghi leader? Rất đơn giản, **nếu bạn có thể đọc ghi tùy ý từng follower thì phải quan tâm đến vấn đề nhất quán dữ liệu**, độ phức tạp của hệ thống quá cao, rất dễ xảy ra sự cố. Kafka sẽ phân bố đều tất cả replica của một partition lên các máy khác nhau, như vậy mới tăng được khả năng chịu lỗi.

![kafka-after](diagram:high-concurrency/how-to-ensure-high-availability-of-message-queues/kafka-after)

Làm như vậy thì mới có cái gọi là **tính sẵn sàng cao**, vì nếu một broker nào đó sập cũng không sao, partition trên broker đó đều có bản sao ở các máy khác. Nếu trên broker sập này có leader của một partition nào đó, thì lúc này sẽ **bầu lại** một leader mới từ các follower, mọi người tiếp tục đọc ghi leader mới đó là được. Như vậy mới có cái gọi là tính sẵn sàng cao.

Khi **ghi dữ liệu**, producer ghi vào leader, sau đó leader ghi dữ liệu xuống đĩa cục bộ, tiếp theo các follower chủ động pull dữ liệu từ leader. Một khi tất cả follower đã đồng bộ xong dữ liệu, sẽ gửi ack cho leader, sau khi leader nhận được ack của tất cả follower, sẽ trả về thông điệp ghi thành công cho producer. (Tất nhiên đây chỉ là một trong các chế độ, còn có thể điều chỉnh hành vi này một cách phù hợp.)

Khi **tiêu thụ**, chỉ đọc từ leader, nhưng chỉ khi một thông điệp đã được tất cả follower đồng bộ thành công và trả về ack thì thông điệp này mới được consumer đọc thấy.

Đọc đến đây, tin rằng bạn đã đại khái hiểu Kafka đảm bảo cơ chế tính sẵn sàng cao như thế nào rồi, đúng không? Không đến nỗi không biết gì, tại chỗ còn có thể vẽ sơ đồ cho người phỏng vấn. Nếu gặp người phỏng vấn thực sự là cao thủ Kafka và hỏi sâu, thì bạn chỉ có thể nói xin lỗi, những phần quá sâu thì bạn chưa nghiên cứu.
