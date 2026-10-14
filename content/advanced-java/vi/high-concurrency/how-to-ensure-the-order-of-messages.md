---
source:
  locale: zh
  slug: how-to-ensure-the-order-of-messages
  hash: 'sha256:v1:80e6b3081b7319a5aec6126ded2195ebf05ae5e00764d2035d2dcf2de3f442f7'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để đảm bảo tính thứ tự của thông điệp?

## Câu hỏi phỏng vấn

Làm thế nào để đảm bảo tính thứ tự của thông điệp?

## Tâm lý người phỏng vấn

Thực ra đây cũng là chủ đề chắc chắn bị hỏi khi dùng MQ, thứ nhất xem bạn có hiểu về chuyện thứ tự này không? Thứ hai xem bạn có cách nào đảm bảo thông điệp có thứ tự không? Đây là vấn đề thường gặp trong hệ thống production.

## Phân tích câu trả lời

Tôi lấy một ví dụ, trước đây chúng tôi từng làm một hệ thống đồng bộ mysql `binlog`, áp lực vẫn rất lớn, lượng dữ liệu đồng bộ mỗi ngày lên đến hơn trăm triệu bản ghi, tức là dữ liệu được đồng bộ nguyên vẹn từ một cơ sở dữ liệu mysql sang một cơ sở dữ liệu mysql khác (mysql -> mysql). Một tình huống thường gặp là, ví dụ team dữ liệu lớn cần đồng bộ một cơ sở dữ liệu mysql về, để thực hiện đủ loại thao tác phức tạp trên dữ liệu của hệ thống nghiệp vụ của công ty.

Bạn thêm, xóa, sửa một bản ghi trong mysql, sẽ sinh ra tương ứng 3 bản `binlog` cho thêm, xóa, sửa, tiếp đó ba bản `binlog` này được gửi vào MQ, rồi được tiêu thụ ra và thực thi lần lượt, ít nhất cũng phải đảm bảo chúng đúng thứ tự chứ? Nếu không, vốn là: thêm, sửa, xóa; bạn lại đảo thứ tự thành thực thi xóa, sửa, thêm, chẳng phải sai hết sao.

Vốn dĩ khi dữ liệu này được đồng bộ về, cuối cùng nó phải bị xóa; kết quả bạn làm sai thứ tự này, cuối cùng dữ liệu này lại được giữ lại, đồng bộ dữ liệu bị sai.

Trước hết xem hai kịch bản thứ tự bị đảo lộn:

-   **RabbitMQ**: một queue, nhiều consumer. Ví dụ, producer gửi vào RabbitMQ ba dữ liệu, theo thứ tự là data1/data2/data3, được đẩy vào một hàng đợi trong bộ nhớ của RabbitMQ. Có ba consumer, mỗi consumer tiêu thụ một trong ba dữ liệu này từ MQ, kết quả consumer 2 thực hiện xong thao tác trước, lưu data2 vào cơ sở dữ liệu, sau đó mới đến data1/data3. Như vậy rõ ràng là bị đảo.

![rabbitmq-order-01](diagram:high-concurrency/how-to-ensure-the-order-of-messages/rabbitmq-order-01)

-   **Kafka**: ví dụ chúng ta tạo một topic, có ba partition. Khi producer ghi, thực ra có thể chỉ định một key, ví dụ chúng ta chỉ định id của một đơn hàng nào đó làm key, thì dữ liệu liên quan đến đơn hàng này chắc chắn sẽ được phân phối vào cùng một partition, và dữ liệu trong partition này chắc chắn có thứ tự.<br>Khi consumer lấy dữ liệu từ partition ra, cũng chắc chắn có thứ tự. Đến đây, thứ tự vẫn ok, không bị đảo. Tiếp theo, trong consumer chúng ta có thể sẽ dùng **nhiều luồng để xử lý thông điệp đồng thời**. Vì nếu consumer tiêu thụ xử lý bằng một luồng đơn mà việc xử lý khá tốn thời gian, ví dụ xử lý một thông điệp mất vài chục ms, thì 1 giây chỉ xử lý được vài chục thông điệp, thông lượng này quá thấp. Còn nhiều luồng chạy đồng thời thì thứ tự có thể bị đảo lộn.

![kafka-order-01](diagram:high-concurrency/how-to-ensure-the-order-of-messages/kafka-order-01)

### Giải pháp

#### RabbitMQ

Tách thành nhiều queue, mỗi queue một consumer, tức là chỉ nhiều queue hơn thôi, đúng là phiền hơn một chút, cách này cũng làm thông lượng giảm, có thể dùng nhiều luồng bên trong consumer để tiêu thụ.

![rabbitmq-order-02](diagram:high-concurrency/how-to-ensure-the-order-of-messages/rabbitmq-order-02)

Hoặc chỉ một queue nhưng tương ứng với một consumer, sau đó consumer này dùng hàng đợi trong bộ nhớ để xếp hàng, rồi phân phối cho các worker bên dưới xử lý.

Lưu ý, ở đây consumer không trực tiếp tiêu thụ thông điệp, mà băm thông điệp theo giá trị khóa (ví dụ: id đơn hàng), các thông điệp có cùng giá trị băm được lưu vào cùng một hàng đợi trong bộ nhớ. Nghĩa là, các thông điệp cần đảm bảo thứ tự được lưu vào cùng một hàng đợi trong bộ nhớ, rồi do một worker duy nhất xử lý.

#### Kafka

-   Một topic, một partition, một consumer, tiêu thụ bằng một luồng đơn bên trong, thông lượng của luồng đơn quá thấp, nói chung sẽ không dùng cách này.
-   Tạo N queue trong bộ nhớ, dữ liệu có cùng key đều vào cùng một queue trong bộ nhớ; sau đó với N luồng, mỗi luồng tiêu thụ một queue trong bộ nhớ là được, như vậy có thể đảm bảo tính thứ tự.

![kafka-order-02](diagram:high-concurrency/how-to-ensure-the-order-of-messages/kafka-order-02)
