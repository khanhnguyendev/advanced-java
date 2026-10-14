---
source:
  locale: zh
  slug: why-cache
  hash: 'sha256:v1:7750a3354c6b7cf4607c720e77fa536de876140e4a870b55230677da2975dcd2'
status: machine
translatedAt: '2026-10-14'
---
# Cách sử dụng bộ nhớ đệm

## Câu hỏi phỏng vấn

Trong dự án, bộ nhớ đệm (cache) được sử dụng như thế nào? Tại sao phải dùng bộ nhớ đệm? Dùng bộ nhớ đệm không đúng cách sẽ gây ra hậu quả gì?

## Tâm lý người phỏng vấn

Câu hỏi này, các công ty internet chắc chắn sẽ hỏi. Nếu một người đến bộ nhớ đệm cũng không rõ thì quả thật khá khó xử.

Hễ hỏi đến bộ nhớ đệm, câu đầu tiên chắc chắn là hỏi dự án của bạn dùng bộ nhớ đệm ở đâu? Vì sao phải dùng? Không dùng có được không? Dùng rồi thì có thể có hậu quả xấu gì?

Đây là để xem bạn có suy nghĩ gì đằng sau thứ gọi là bộ nhớ đệm hay không. Nếu bạn chỉ dùng bừa một cách ngây ngô, không đưa ra được lời giải thích hợp lý cho người phỏng vấn, thì ấn tượng của người phỏng vấn về bạn chắc chắn sẽ không tốt, họ sẽ cho rằng bạn bình thường suy nghĩ quá ít, chỉ biết làm việc.

## Phân tích câu trả lời

### Trong dự án, bộ nhớ đệm được sử dụng như thế nào?

Phần này cần kết hợp với nghiệp vụ trong dự án của chính bạn.

### Tại sao phải dùng bộ nhớ đệm?

Dùng bộ nhớ đệm chủ yếu có hai mục đích: **hiệu năng cao** và **tải đồng thời cao (high concurrency)**.

#### Hiệu năng cao

Giả sử có tình huống thế này: bạn có một thao tác, một request đến, bạn hì hục thực hiện đủ thứ thao tác lộn xộn trên mysql, mất một lúc lâu mới truy vấn ra một kết quả, tốn 600ms. Nhưng kết quả này có thể trong vài giờ tới sẽ không thay đổi, hoặc có thay đổi thì cũng không cần phản hồi ngay cho người dùng. Vậy lúc này làm sao?

Dùng bộ nhớ đệm thôi, kết quả mất công truy vấn 600ms thì ném vào bộ nhớ đệm, một key tương ứng một value. Lần sau có người truy vấn, đừng đi qua mysql mất 600ms nữa, mà lấy thẳng từ bộ nhớ đệm, truy vấn ra một value qua một key, 2ms là xong. Hiệu năng tăng 300 lần.

Tức là với những kết quả cần thao tác phức tạp và tốn thời gian mới truy vấn ra được, lại chắc chắn về sau ít thay đổi, mà có rất nhiều request đọc, thì cứ đặt thẳng kết quả truy vấn vào bộ nhớ đệm, về sau đọc trực tiếp từ bộ nhớ đệm là được.

#### Tải đồng thời cao

mysql là một cơ sở dữ liệu nặng nề như vậy, về cơ bản không được thiết kế để bạn chơi tải đồng thời cao. Tuy cũng có thể làm được, nhưng vốn dĩ hỗ trợ không tốt. mysql trên một máy chịu đến `2000QPS` là bắt đầu dễ phát cảnh báo.

Vì vậy nếu bạn có một hệ thống mà giờ cao điểm mỗi giây có 10 nghìn request đến, thì một mysql trên một máy chắc chắn sẽ sập. Lúc này bạn chỉ còn cách dùng bộ nhớ đệm, đặt nhiều dữ liệu vào bộ nhớ đệm, đừng để ở mysql. Chức năng của bộ nhớ đệm đơn giản, nói thẳng ra chỉ là thao tác kiểu `key-value` , một máy chịu được lượng đồng thời dễ dàng vài chục nghìn đến hàng trăm nghìn mỗi giây, hỗ trợ tải đồng thời cao quá dễ. Lượng đồng thời mà một máy gánh được gấp mysql trên một máy vài chục lần.

> Bộ nhớ đệm chạy trên bộ nhớ, và bộ nhớ vốn dĩ hỗ trợ tải đồng thời cao.

### Dùng bộ nhớ đệm rồi sẽ có hậu quả xấu gì?

Các vấn đề thường gặp của bộ nhớ đệm gồm:

-   [Bộ nhớ đệm và cơ sở dữ liệu ghi kép không nhất quán](doc:advanced-java/high-concurrency/redis-consistence)
-   [Cache avalanche (tuyết lở bộ nhớ đệm), cache penetration (xuyên thủng bộ nhớ đệm), cache breakdown](doc:advanced-java/high-concurrency/redis-caching-avalanche-and-caching-penetration)
-   [Tranh chấp đồng thời trên bộ nhớ đệm](doc:advanced-java/high-concurrency/redis-cas)

Nhấp vào các liên kết để xem trực tiếp các vấn đề liên quan đến bộ nhớ đệm và giải pháp.
