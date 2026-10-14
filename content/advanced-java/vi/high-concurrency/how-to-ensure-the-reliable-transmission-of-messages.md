---
source:
  locale: zh
  slug: how-to-ensure-the-reliable-transmission-of-messages
  hash: 'sha256:v1:5e2b989adad2c98bc3867b227834ac0baf518cb82e299bfae083cbb87a858767'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để đảm bảo truyền thông điệp với độ tin cậy cao?

## Câu hỏi phỏng vấn

Làm thế nào để đảm bảo truyền thông điệp với độ tin cậy cao? Hay nói cách khác, làm thế nào để xử lý vấn đề mất thông điệp?

## Tâm lý người phỏng vấn

Điều này là chắc chắn, dùng MQ có một nguyên tắc cơ bản là **dữ liệu không được thừa một bản ghi, cũng không được thiếu một bản ghi**. Không được thừa chính là [vấn đề tiêu thụ trùng lặp và tính idempotent](doc:advanced-java/high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed) đã nói ở trước. Không được thiếu nghĩa là dữ liệu đừng để bị mất. Vậy vấn đề này bạn nhất định phải cân nhắc.

Nếu bạn dùng MQ để truyền những thông điệp cực kỳ cốt lõi, ví dụ các thông điệp tính cước, trừ tiền, thì phải đảm bảo trong quá trình MQ truyền tải **tuyệt đối không làm mất thông điệp tính cước**.

## Phân tích câu trả lời

Vấn đề mất dữ liệu có thể xuất hiện ở producer, MQ và consumer, chúng ta hãy lần lượt phân tích từ RabbitMQ và Kafka.

### RabbitMQ

![rabbitmq-message-lose](asset:high-concurrency/how-to-ensure-the-reliable-transmission-of-messages/rabbitmq-message-lose.png)

#### Producer làm mất dữ liệu

Khi producer gửi dữ liệu đến RabbitMQ, có thể dữ liệu bị mất giữa đường, do vấn đề mạng hay gì đó đều có thể xảy ra.

Lúc này có thể chọn dùng chức năng giao dịch do RabbitMQ cung cấp, tức là producer mở giao dịch RabbitMQ `channel.txSelect()` **trước khi gửi dữ liệu**, rồi gửi thông điệp, nếu thông điệp không được RabbitMQ nhận thành công thì producer sẽ nhận được ngoại lệ báo lỗi, lúc này có thể rollback giao dịch `channel.txRollback()`, rồi thử gửi lại thông điệp; nếu đã nhận được thông điệp thì có thể commit giao dịch `channel.txCommit()`.

```java
try {
    // Tạo kết nối thông qua factory
    connection = factory.newConnection();
    // Lấy channel
    channel = connection.createChannel();
    // Mở giao dịch
    channel.txSelect();

    // Gửi thông điệp ở đây
    channel.basicPublish(exchange, routingKey, MessageProperties.PERSISTENT_TEXT_PLAIN, msg.getBytes());

    // Mô phỏng việc xảy ra ngoại lệ
    int result = 1 / 0;

    // Commit giao dịch
    channel.txCommit();
} catch (IOException | TimeoutException e) {
    // Bắt ngoại lệ, rollback giao dịch
    channel.txRollback();
}
```

Nhưng vấn đề là, cơ chế giao dịch (đồng bộ) của RabbitMQ mà dùng thì về cơ bản **thông lượng sẽ giảm xuống, vì quá tốn hiệu năng**.

Vì vậy nói chung, nếu bạn muốn đảm bảo thông điệp ghi vào RabbitMQ không bị mất, có thể bật chế độ `confirm`, sau khi bật chế độ `confirm` ở phía producer, mỗi thông điệp bạn ghi sẽ được cấp một id duy nhất, sau đó nếu đã ghi vào RabbitMQ, RabbitMQ sẽ gửi lại cho bạn một thông điệp `ack`, cho bạn biết thông điệp này ok rồi. Nếu RabbitMQ không xử lý được thông điệp này, sẽ gọi lại một API `nack` của bạn, cho bạn biết thông điệp này nhận thất bại, bạn có thể thử lại. Hơn nữa bạn có thể kết hợp cơ chế này để tự duy trì trạng thái của từng id thông điệp trong bộ nhớ, nếu quá một khoảng thời gian nhất định vẫn chưa nhận được callback của thông điệp này thì bạn có thể gửi lại.

Điểm khác biệt lớn nhất giữa cơ chế giao dịch và cơ chế `confirm` là **cơ chế giao dịch là đồng bộ**, sau khi bạn commit một giao dịch thì sẽ **bị chặn** ở đó, còn cơ chế `confirm` là **bất đồng bộ**, sau khi gửi một thông điệp bạn có thể gửi tiếp thông điệp tiếp theo, rồi sau khi RabbitMQ nhận thông điệp đó sẽ gọi lại bất đồng bộ một API của bạn để thông báo thông điệp này đã được nhận.

Vì vậy nói chung ở phía producer, để **tránh mất dữ liệu**, đều dùng cơ chế `confirm`.

> Channel đã ở chế độ giao dịch (transaction) thì không thể thiết lập thành chế độ confirm nữa, tức là hai chế độ này không thể cùng tồn tại.

Phía client hiện thực `confirm` của producer có 3 cách:

1.**Chế độ confirm thông thường**: Sau mỗi lần gửi một thông điệp, gọi phương thức `waitForConfirms()`, chờ server confirm, nếu server trả về false hoặc không trả về trong một khoảng thời gian, client có thể gửi lại thông điệp.

```java
channel.basicPublish(ConfirmConfig.exchangeName, ConfirmConfig.routingKey, MessageProperties.PERSISTENT_TEXT_PLAIN, ConfirmConfig.msg_10B.getBytes());
if (!channel.waitForConfirms()) {
    // Gửi thông điệp thất bại
    // ...
}
```

2.**Chế độ confirm theo lô**: Sau mỗi lần gửi một lô thông điệp, gọi phương thức `waitForConfirms()`, chờ server confirm.

```java
channel.confirmSelect();
for (int i = 0; i < batchCount; ++i) {
    channel.basicPublish(ConfirmConfig.exchangeName, ConfirmConfig.routingKey, MessageProperties.PERSISTENT_TEXT_PLAIN, ConfirmConfig.msg_10B.getBytes());
}
if (!channel.waitForConfirms()) {
    // Gửi thông điệp thất bại
    // ...
}
```

3.**Chế độ confirm bất đồng bộ**: Cung cấp một phương thức callback, sau khi server confirm một hoặc nhiều thông điệp thì client sẽ gọi lại phương thức này.

```java
SortedSet<Long> confirmSet = Collections.synchronizedSortedSet(new TreeSet<Long>());
channel.confirmSelect();
channel.addConfirmListener(new ConfirmListener() {
    public void handleAck(long deliveryTag, boolean multiple) throws IOException {
        if (multiple) {
            confirmSet.headSet(deliveryTag + 1).clear();
        } else {
            confirmSet.remove(deliveryTag);
        }
    }

    public void handleNack(long deliveryTag, boolean multiple) throws IOException {
        System.out.println("Nack, SeqNo: " + deliveryTag + ", multiple: " + multiple);
        if (multiple) {
            confirmSet.headSet(deliveryTag + 1).clear();
        } else {
            confirmSet.remove(deliveryTag);
        }
    }
});

while (true) {
    long nextSeqNo = channel.getNextPublishSeqNo();
    channel.basicPublish(ConfirmConfig.exchangeName, ConfirmConfig.routingKey, MessageProperties.PERSISTENT_TEXT_PLAIN, ConfirmConfig.msg_10B.getBytes());
    confirmSet.add(nextSeqNo);
}
```

#### RabbitMQ làm mất dữ liệu

Tức là chính RabbitMQ làm mất dữ liệu, trường hợp này bạn phải **bật lưu trữ bền vững (persistence) của RabbitMQ**, tức là sau khi thông điệp được ghi vào sẽ được lưu bền vững xuống đĩa, dù RabbitMQ tự sập, **sau khi phục hồi sẽ tự động đọc lại dữ liệu đã lưu trước đó**, nói chung dữ liệu sẽ không mất. Chỉ trừ trường hợp cực kỳ hiếm gặp là RabbitMQ chưa kịp lưu bền vững thì tự sập, **có thể dẫn đến mất một lượng nhỏ dữ liệu**, nhưng xác suất này khá nhỏ.

Thiết lập lưu trữ bền vững có **hai bước**:

-   Khi tạo queue thì đặt nó ở chế độ bền vững. Như vậy có thể đảm bảo RabbitMQ lưu bền vững metadata của queue, nhưng nó sẽ không lưu bền vững dữ liệu bên trong queue.

-   Bước thứ hai là khi gửi thông điệp thì đặt `deliveryMode` của thông điệp thành 2. Tức là đặt thông điệp ở chế độ bền vững, lúc này RabbitMQ sẽ lưu bền vững thông điệp xuống đĩa.

Phải thiết lập đồng thời cả hai loại lưu trữ bền vững này mới được, RabbitMQ dù sập, khi khởi động lại cũng sẽ khôi phục queue từ đĩa, khôi phục dữ liệu trong queue này.

Lưu ý, dù bạn đã bật cơ chế lưu trữ bền vững cho RabbitMQ, vẫn có một khả năng là thông điệp này đã được ghi vào RabbitMQ nhưng chưa kịp lưu bền vững xuống đĩa, không may lúc này RabbitMQ sập, sẽ dẫn đến mất một ít dữ liệu trong bộ nhớ.

Vì vậy, lưu trữ bền vững có thể kết hợp với cơ chế `confirm` ở phía producer, chỉ sau khi thông điệp được lưu bền vững xuống đĩa thì mới thông báo `ack` cho producer, nên dù trước khi lưu xuống đĩa RabbitMQ sập, dữ liệu mất, producer không nhận được `ack`, bạn cũng có thể tự gửi lại.

#### Phía consumer làm mất dữ liệu

Nếu RabbitMQ mất dữ liệu thì chủ yếu là do khi bạn tiêu thụ, **vừa tiêu thụ được, chưa kịp xử lý thì tiến trình sập**, ví dụ bị khởi động lại, thế là khó xử, RabbitMQ cho rằng bạn đã tiêu thụ rồi, dữ liệu này coi như mất.

Lúc này phải dùng cơ chế `ack` do RabbitMQ cung cấp, nói đơn giản là bạn phải tắt `ack` tự động của RabbitMQ, có thể làm bằng cách gọi một api, sau đó mỗi lần trong code của bạn đảm bảo đã xử lý xong thì mới `ack` trong chương trình. Như vậy nếu bạn chưa xử lý xong thì chẳng phải không có `ack` sao? Khi đó RabbitMQ cho rằng bạn chưa xử lý xong, lúc này RabbitMQ sẽ giao việc tiêu thụ này cho consumer khác xử lý, thông điệp sẽ không bị mất.

> Để đảm bảo thông điệp đến consumer một cách đáng tin cậy từ hàng đợi, RabbitMQ cung cấp cơ chế xác nhận thông điệp. Khi khai báo hàng đợi, consumer có thể chỉ định tham số noAck, khi noAck=false, RabbitMQ sẽ chờ consumer gửi lại tín hiệu ack một cách tường minh, rồi mới xóa thông điệp khỏi bộ nhớ (và đĩa, nếu là thông điệp bền vững). Ngược lại, một khi thông điệp được consumer tiêu thụ, RabbitMQ sẽ xóa nó khỏi hàng đợi ngay lập tức.

![rabbitmq-message-lose-solution](asset:high-concurrency/how-to-ensure-the-reliable-transmission-of-messages/rabbitmq-message-lose-solution.png)

### Kafka

#### Phía consumer làm mất dữ liệu

Trường hợp duy nhất có thể khiến consumer làm mất dữ liệu là: bạn đã tiêu thụ được thông điệp này, rồi phía consumer **tự động commit offset**, khiến Kafka tưởng rằng bạn đã tiêu thụ xong thông điệp này, nhưng thực ra bạn mới chuẩn bị xử lý thông điệp này, chưa xử lý thì bạn đã sập, lúc này thông điệp này mất.

Chẳng phải giống RabbitMQ sao, mọi người đều biết Kafka sẽ tự động commit offset, vậy chỉ cần **tắt tự động commit** offset, sau khi xử lý xong thì tự commit offset thủ công, là có thể đảm bảo dữ liệu không mất. Nhưng lúc này thực sự **vẫn có thể bị tiêu thụ trùng lặp**, ví dụ bạn vừa xử lý xong, chưa commit offset thì tự sập, lúc này chắc chắn sẽ tiêu thụ trùng lặp một lần, tự đảm bảo tính idempotent là được.

Một vấn đề gặp trong production là: consumer Kafka của chúng tôi sau khi tiêu thụ được dữ liệu thì ghi vào một queue trong bộ nhớ để đệm trước, kết quả là có lúc bạn vừa ghi thông điệp vào queue trong bộ nhớ, thì consumer tự động commit offset. Rồi lúc này chúng tôi khởi động lại hệ thống, sẽ dẫn đến việc dữ liệu trong queue bộ nhớ chưa kịp xử lý bị mất.

#### Kafka làm mất dữ liệu

Một kịch bản khá phổ biến ở phần này là một broker nào đó của Kafka sập, rồi bầu lại leader của partition. Mọi người thử nghĩ, nếu lúc này các follower khác vừa hay còn một số dữ liệu chưa đồng bộ, kết quả leader sập, rồi bầu một follower nào đó thành leader, chẳng phải thiếu mất một ít dữ liệu sao? Thế là mất một số dữ liệu.

Production cũng từng gặp, chúng tôi cũng vậy, trước đây máy leader của Kafka sập, sau khi chuyển follower thành leader thì phát hiện dữ liệu này bị mất.

Vì vậy lúc này nói chung yêu cầu tối thiểu phải thiết lập 4 tham số sau:

-   Thiết lập tham số `replication.factor` cho topic: giá trị này phải lớn hơn 1, yêu cầu mỗi partition phải có ít nhất 2 bản sao.
-   Thiết lập tham số `min.insync.replicas` ở phía server Kafka: giá trị này phải lớn hơn 1, đây là yêu cầu một leader phải nhận biết được có ít nhất một follower vẫn giữ liên lạc với mình, không bị tụt lại, như vậy mới đảm bảo khi leader sập vẫn còn một follower chứ.
-   Thiết lập `acks=all` ở phía producer: đây là yêu cầu mỗi dữ liệu phải **được ghi vào tất cả replica rồi mới được coi là ghi thành công**.
-   Thiết lập `retries=MAX` ở phía producer (một giá trị rất rất rất lớn, nghĩa là thử lại vô hạn lần): đây là **yêu cầu một khi ghi thất bại thì thử lại vô hạn lần**, bị kẹt ở đây.

Production của chúng tôi được cấu hình đúng theo các yêu cầu trên, sau khi cấu hình như vậy, ít nhất ở phía Kafka broker có thể đảm bảo khi broker chứa leader gặp sự cố, tiến hành chuyển leader, dữ liệu sẽ không bị mất.

#### Producer có làm mất dữ liệu không?

Nếu đã thiết lập `acks=all` theo hướng trên thì chắc chắn không mất, yêu cầu là leader của bạn nhận được thông điệp, tất cả follower đều đã đồng bộ thông điệp rồi thì mới coi là lần ghi này thành công. Nếu không thỏa mãn điều kiện này, producer sẽ tự động thử lại liên tục, thử lại vô hạn lần.

### RocketMQ

#### Các kịch bản mất thông điệp

1. Producer gửi thông điệp đến MQ có thể bị mất thông điệp
2. MQ nhận thông điệp rồi ghi xuống đĩa cứng có thể bị mất thông điệp
3. Sau khi thông điệp được ghi xuống đĩa cứng, đĩa cứng hỏng làm mất thông điệp
4. Consumer tiêu thụ MQ cũng có thể bị mất thông điệp
5. Cả node MQ sập làm mất thông điệp

#### Làm thế nào để producer gửi thông điệp mà không bị mất?

Để giải quyết vấn đề mất thông điệp khi gửi, có thể dùng cơ chế **thông điệp giao dịch** có sẵn của RocketMQ

Nguyên lý thông điệp giao dịch: Trước tiên producer sẽ gửi một **thông điệp half** (là lớp bọc của thông điệp gốc), thông điệp này không hiển thị với consumer, MQ trả về trạng thái nhận thông điệp thông qua cơ chế ACK, producer thực thi giao dịch cục bộ và trả về cho MQ một trạng thái (Commit, RollBack, v.v.), nếu là Commit thì MQ sẽ chuyển thông điệp cho downstream, RollBack thì sẽ loại bỏ thông điệp này, nếu trạng thái là UnKnow thì sau một khoảng thời gian sẽ kiểm tra lại trạng thái giao dịch cục bộ, mặc định kiểm tra lại 15 lần, nếu luôn ở trạng thái UnKnow thì sẽ loại bỏ thông điệp này.

Tại sao phải gửi một thông điệp half trước, tác dụng là để xác định trước xem MQ có vấn đề không, dịch vụ có bình thường không.

#### Làm thế nào để MQ nhận thông điệp rồi ghi xuống đĩa cứng mà không bị mất?

Khi lưu xuống đĩa thì bỏ qua cache, chuyển sang flush đĩa đồng bộ, bước này cần sửa tệp cấu hình của Broker, đổi flushDiskType thành chiến lược flush đĩa đồng bộ SYNC_FLUSH, mặc định là flush đĩa bất đồng bộ ASYNC_FLUSH, một khi flush đĩa đồng bộ trả về thành công thì chắc chắn đảm bảo thông điệp đã được lưu bền vững xuống đĩa.

#### Làm thế nào để thông điệp không bị mất khi đĩa cứng hỏng sau khi ghi?

Để đảm bảo việc hỏng đĩa không làm mất dữ liệu, RocketMQ dùng cấu trúc master/replica (master-slave), triển khai cụm, dữ liệu trong Leader đều có bản sao lưu ở nhiều Follower, ngăn việc lỗi điểm đơn làm mất dữ liệu.

Nếu node Master sập thì sao? Sau khi node Master sập, DLedger xuất hiện

-   Tiếp quản commitLog của MQ
-   Bầu chọn node replica
-   Sao chép tệp ở trạng thái uncommited, đa số node replica nhận được thì đổi sang commited

#### Làm thế nào để consumer tiêu thụ MQ mà không bị mất thông điệp?

1. Nếu việc tiêu thụ thất bại do vấn đề mạng thì có thể dùng cơ chế thử lại, mặc định mỗi thông điệp thử lại 16 lần
2. Tiêu thụ bất đồng bộ đa luồng thất bại, MQ cho rằng đã tiêu thụ thành công nhưng thực tế đối với logic nghiệp vụ thì thông điệp chưa được ghi nhận, giải pháp là làm theo khuyến nghị chính thức của mq: thực thi giao dịch cục bộ trước rồi mới trả về trạng thái thành công.

#### Làm thế nào để cả node MQ sập mà không bị mất thông điệp?

Với trường hợp cực đoan này, sau khi gửi thông điệp thất bại có thể lưu vào cục bộ trước, ví dụ đưa vào cache, rồi khởi động thêm một luồng quét các thông điệp trong cache để thử gửi lại.
