---
source:
  locale: zh
  slug: mq-time-delay-and-expired-failure
  hash: 'sha256:v1:2285da021756ab987c9697bc57c803b6413f37d011dfe0c0e40563579cece906'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để giải quyết vấn đề độ trễ và hết hạn của hàng đợi thông điệp?

## Câu hỏi phỏng vấn

Làm thế nào để giải quyết vấn đề độ trễ và hết hạn của hàng đợi thông điệp? Khi hàng đợi thông điệp đầy thì xử lý thế nào? Có vài triệu thông điệp tồn đọng liên tục trong vài giờ, bạn nói xem giải quyết ra sao?

## Tâm lý người phỏng vấn

Bạn xem cách hỏi này, thực chất kịch bản nhắm đến đều là: có thể phía consumer của bạn gặp sự cố, không tiêu thụ nữa; hoặc tốc độ tiêu thụ cực kỳ chậm. Tiếp theo thì tai hại rồi, có thể đĩa của cụm hàng đợi thông điệp của bạn sắp ghi đầy mà vẫn không ai tiêu thụ, lúc này làm thế nào? Hoặc là toàn bộ bị tồn đọng mấy tiếng, lúc này bạn làm thế nào? Hoặc là bạn tồn đọng quá lâu, dẫn đến ví dụ RabbitMQ đã đặt thời gian hết hạn của thông điệp thì thông điệp mất hết, phải làm sao?

Vì vậy chuyện này thực ra khá phổ biến trên production, thường thì không xảy ra, nhưng đã xảy ra là chuyện lớn. Thường gặp, lấy ví dụ, mỗi lần consumer tiêu thụ xong phải ghi vào mysql, kết quả mysql sập, consumer bị hang ở đó, không nhúc nhích; hoặc consumer gặp trục trặc gì đó, dẫn đến tốc độ tiêu thụ cực kỳ chậm.

## Phân tích câu trả lời

Về chuyện này, chúng ta hãy phân tích từng cái một, trước hết giả sử một kịch bản: hiện tại phía consumer của chúng ta gặp sự cố, rồi lượng lớn thông điệp bị tồn đọng trong mq, bây giờ xảy ra sự cố rồi, hoảng.

### Lượng lớn thông điệp tồn đọng trong mq vài giờ mà chưa giải quyết

Vài chục triệu dữ liệu tồn đọng trong MQ bảy tám tiếng, từ hơn 4 giờ chiều, tồn đọng đến hơn 11 giờ đêm. Đây là một kịch bản chúng tôi thực sự đã gặp, đúng là sự cố trên production, lúc này hoặc là sửa vấn đề của consumer, cho nó phục hồi tốc độ tiêu thụ, rồi ngây ngô chờ mấy tiếng cho tiêu thụ xong. Cái này chắc chắn không thể nói trong buổi phỏng vấn.

Một consumer một giây là 1000 bản ghi, một giây 3 consumer là 3000 bản ghi, một phút là 180 nghìn bản ghi. Vì vậy nếu bạn tồn đọng từ vài triệu đến hơn chục triệu dữ liệu, dù consumer đã phục hồi thì cũng cần khoảng 1 giờ mới phục hồi được.

Thường lúc này chỉ có thể khẩn cấp mở rộng tạm thời, các bước thao tác và hướng suy nghĩ cụ thể như sau:

-   Trước hết sửa vấn đề của consumer, đảm bảo nó phục hồi tốc độ tiêu thụ, rồi dừng tất cả consumer hiện có.
-   Tạo một topic mới, số partition gấp 10 lần ban đầu, tạm thời tạo sẵn số lượng queue gấp 10 lần ban đầu.
-   Sau đó viết một chương trình consumer phân phối dữ liệu tạm thời, chương trình này được triển khai lên để tiêu thụ dữ liệu tồn đọng, **sau khi tiêu thụ không xử lý tốn thời gian**, mà ghi thẳng một cách đều đặn theo kiểu xoay vòng vào số lượng queue gấp 10 lần vừa tạo tạm thời.
-   Tiếp theo tạm thời trưng dụng số máy gấp 10 lần để triển khai consumer, mỗi nhóm consumer tiêu thụ dữ liệu của một queue tạm thời. Cách làm này tương đương với việc tạm thời mở rộng tài nguyên queue và tài nguyên consumer gấp 10 lần, tiêu thụ dữ liệu với tốc độ gấp 10 lần bình thường.
-   Sau khi tiêu thụ nhanh hết dữ liệu tồn đọng, **phải khôi phục kiến trúc đã triển khai ban đầu**, **lại** dùng các máy consumer ban đầu để tiêu thụ thông điệp.

### Thông điệp trong mq bị hết hạn

Giả sử bạn dùng RabbitMQ, RabbtiMQ có thể đặt thời gian hết hạn, tức là TTL. Nếu thông điệp tồn đọng trong queue quá một khoảng thời gian nhất định sẽ bị RabbitMQ dọn dẹp, dữ liệu này mất. Đây là cái bẫy thứ hai. Lúc này không phải dữ liệu tồn đọng lượng lớn trong mq, mà là **lượng lớn dữ liệu bị mất thẳng**.

Trong trường hợp này, không phải là cần tăng consumer để tiêu thụ thông điệp tồn đọng, vì thực tế không có gì tồn đọng, mà là mất lượng lớn thông điệp. Chúng ta có thể áp dụng một phương án là **nạp lại hàng loạt**, trước đây trên production chúng tôi cũng từng làm trong kịch bản tương tự. Tức là khi tồn đọng lượng lớn, lúc đó chúng tôi trực tiếp bỏ dữ liệu, rồi đợi qua giờ cao điểm, ví dụ mọi người cùng uống cà phê thức khuya đến sau 12 giờ đêm, người dùng đã đi ngủ. Lúc này chúng tôi bắt đầu viết chương trình, viết một chương trình tạm thời, truy vấn từng chút một lô dữ liệu bị mất đó ra, rồi nạp lại vào mq, bù lại dữ liệu bị mất ban ngày. Cũng chỉ có thể như vậy thôi.

Giả sử 10.000 đơn hàng tồn đọng trong mq, chưa xử lý, trong đó 1000 đơn hàng bị mất, bạn chỉ có thể viết chương trình thủ công truy vấn 1000 đơn hàng đó ra, gửi thủ công vào mq để bù lại một lần.

### mq sắp ghi đầy

Nếu thông điệp tồn đọng trong mq, bạn rất lâu vẫn chưa xử lý xong, lúc này dẫn đến mq sắp ghi đầy, làm sao đây? Còn cách nào khác không? Không có, ai bảo phương án đầu tiên của bạn thực hiện quá chậm, bạn viết chương trình tạm thời, kết nối dữ liệu vào để tiêu thụ, **tiêu thụ một cái bỏ một cái, không cần nữa**, tiêu thụ nhanh hết tất cả thông điệp. Sau đó đi theo phương án thứ hai, đến tối thì bù dữ liệu.

---

Đối với RocketMQ, chính thức đã đưa ra giải pháp cho vấn đề thông điệp tồn đọng.

### 1. Tăng mức độ song song khi tiêu thụ

Phần lớn các hành vi tiêu thụ thông điệp đều thuộc loại IO-bound, tức là có thể thao tác cơ sở dữ liệu, hoặc gọi RPC, tốc độ tiêu thụ của loại hành vi này phụ thuộc vào thông lượng của cơ sở dữ liệu phía sau hoặc hệ thống bên ngoài, bằng cách tăng mức độ song song khi tiêu thụ có thể tăng tổng thông lượng tiêu thụ, nhưng khi mức độ song song tăng đến một mức nhất định thì ngược lại sẽ giảm. Vì vậy, ứng dụng phải đặt mức độ song song hợp lý. Dưới đây là một số cách sửa mức độ song song khi tiêu thụ:

Trong cùng một ConsumerGroup, tăng mức độ song song bằng cách tăng số lượng instance Consumer (cần lưu ý instance Consumer vượt quá số queue đăng ký thì vô tác dụng). Có thể thêm máy, hoặc khởi động nhiều tiến trình trên các máy hiện có.
Tăng số luồng tiêu thụ song song của một Consumer, thực hiện bằng cách sửa tham số consumeThreadMin, consumeThreadMax.

### 2. Tiêu thụ theo lô

Một số quy trình nghiệp vụ nếu hỗ trợ tiêu thụ theo lô thì có thể tăng đáng kể thông lượng tiêu thụ, ví dụ ứng dụng trừ tiền đơn hàng, xử lý một đơn hàng một lần mất 1 s, xử lý 10 đơn hàng một lần có thể cũng chỉ mất 2 s, như vậy có thể tăng mạnh thông lượng tiêu thụ, bằng cách đặt tham số consumeMessageBatchMaxSize của consumer, mặc định là 1, tức là mỗi lần chỉ tiêu thụ một thông điệp, ví dụ đặt là N thì số thông điệp tiêu thụ mỗi lần nhỏ hơn hoặc bằng N.

### 3. Bỏ qua thông điệp không quan trọng

Khi xảy ra tồn đọng thông điệp, nếu tốc độ tiêu thụ mãi không đuổi kịp tốc độ gửi, nếu nghiệp vụ không đòi hỏi cao về dữ liệu thì có thể chọn bỏ các thông điệp không quan trọng. Ví dụ, khi số thông điệp tồn đọng của một queue nào đó đạt trên 100000 bản ghi, thì thử bỏ một phần hoặc toàn bộ thông điệp, như vậy có thể nhanh chóng đuổi kịp tốc độ gửi thông điệp. Mã ví dụ như sau:

```java
public ConsumeConcurrentlyStatus consumeMessage(
            List<MessageExt> msgs,
            ConsumeConcurrentlyContext context) {
    long offset = msgs.get(0).getQueueOffset();
    String maxOffset =
            msgs.get(0).getProperty(Message.PROPERTY_MAX_OFFSET);
    long diff = Long.parseLong(maxOffset) - offset;
    if (diff > 100000) {
        // TODO xử lý đặc biệt khi thông điệp tồn đọng
        return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
    }
    // TODO quá trình tiêu thụ bình thường
    return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
}
```

### 4. Tối ưu quá trình tiêu thụ từng thông điệp

Ví dụ như sau, quá trình tiêu thụ của một thông điệp nào đó như sau:

-   Truy vấn [dữ liệu 1] từ DB theo thông điệp
-   Truy vấn [dữ liệu 2] từ DB theo thông điệp
-   Tính toán nghiệp vụ phức tạp
-   Chèn [dữ liệu 3] vào DB
-   Chèn [dữ liệu 4] vào DB

Quá trình tiêu thụ thông điệp này có 4 lần tương tác với DB, nếu tính mỗi lần 5ms thì tổng cộng mất 20ms, giả sử tính toán nghiệp vụ mất 5ms thì tổng cộng mất 25ms, vì vậy nếu có thể tối ưu 4 lần tương tác DB thành 2 lần thì tổng thời gian có thể tối ưu xuống 15ms, tức là hiệu năng tổng thể tăng 40%. Vì vậy nếu ứng dụng nhạy cảm với độ trễ thì có thể triển khai DB trên ổ SSD, so với đĩa SCSI thì RT của loại trước nhỏ hơn rất nhiều.
