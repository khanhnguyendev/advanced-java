---
source:
  locale: zh
  slug: distributed-system-idempotency
  hash: 'sha256:v1:d46b3704a0e2ce1759ca554f785e39031c06c7edb9cd6c88e277ab6f03a29c9c'
status: machine
translatedAt: '2026-10-14'
---
# Thiết kế tính idempotent của API dịch vụ phân tán như thế nào?

## Câu hỏi phỏng vấn

Tính idempotent của API dịch vụ phân tán được thiết kế như thế nào (ví dụ không được trừ tiền hai lần)?

## Tâm lý người phỏng vấn

Từ câu hỏi này, người phỏng vấn đã đi vào phần phỏng vấn **các vấn đề thực tế trên production**.

Một API nào đó trong hệ thống phân tán, phải đảm bảo tính idempotent như thế nào? Chuyện này thực ra là một vấn đề kỹ thuật của môi trường production mà bạn bắt buộc phải cân nhắc khi làm hệ thống phân tán. Nghĩa là gì?

Bạn xem, giả sử bạn có một dịch vụ cung cấp một số API cho bên ngoài gọi, dịch vụ này được triển khai trên 5 máy, tiếp đó có một API là **API thanh toán**. Rồi người dùng thao tác trên giao diện front-end, không hiểu vì sao, tóm lại là một đơn hàng **vô tình phát đi hai yêu cầu thanh toán**, rồi hai yêu cầu này lại phân tán vào các máy khác nhau mà dịch vụ được triển khai, thế là xong, một đơn hàng bị trừ tiền hai lần.

Hoặc hệ thống đơn hàng gọi hệ thống thanh toán để thanh toán, kết quả vô tình do **mạng bị hết thời gian chờ**, rồi hệ thống đơn hàng đi theo cơ chế thử lại mà chúng ta đã thấy ở phía trước, cái thử lại luôn, được rồi, hệ thống thanh toán nhận được hai lần một yêu cầu thanh toán, hơn nữa do thuật toán cân bằng tải mà rơi vào các máy khác nhau, thật là khó xử...

Vì vậy chắc chắn bạn phải biết chuyện này, nếu không hệ thống phân tán bạn làm ra e rằng dễ chôn bẫy.

## Phân tích câu trả lời

Đây không phải là vấn đề kỹ thuật, không có một phương pháp chung, cái này nên **kết hợp với nghiệp vụ** để đảm bảo tính idempotent.

Cái gọi là **tính idempotent** là nói một API, phát cùng một yêu cầu nhiều lần, API của bạn phải đảm bảo kết quả chính xác, ví dụ không được trừ tiền thêm, không được chèn thêm một dữ liệu, không được cộng thêm 1 vào giá trị thống kê. Đó chính là tính idempotent.

Thực ra để đảm bảo tính idempotent chủ yếu có ba điểm:

-   Mỗi yêu cầu bắt buộc phải có một định danh duy nhất, lấy ví dụ: yêu cầu thanh toán đơn hàng, chắc chắn phải chứa id đơn hàng, một id đơn hàng nhiều nhất chỉ thanh toán một lần, đúng không.
-   Mỗi lần xử lý xong yêu cầu, bắt buộc phải có một bản ghi đánh dấu yêu cầu này đã được xử lý. Phương án phổ biến là ghi một trạng thái nào đó trong mysql, ví dụ trước khi thanh toán thì ghi một bản ghi thanh toán (payment record) của đơn hàng này.
-   Mỗi lần nhận yêu cầu cần phải kiểm tra, xem trước đó đã xử lý chưa. Ví dụ, nếu một đơn hàng đã được thanh toán thì đã có một bản ghi thanh toán, khi đó nếu yêu cầu này được gửi lặp lại, thì lúc này trước hết chèn bản ghi thanh toán, orderId đã tồn tại, ràng buộc khóa duy nhất có hiệu lực, báo lỗi, không chèn vào được. Khi đó bạn không cần trừ tiền nữa.

Trong quá trình vận hành thực tế, bạn phải kết hợp với nghiệp vụ của mình, ví dụ tận dụng Redis, dùng orderId làm khóa duy nhất. Chỉ khi chèn thành công bản ghi thanh toán này thì mới có thể thực hiện thanh toán trừ tiền thực sự.

Yêu cầu là thanh toán một đơn hàng thì bắt buộc phải chèn một bản ghi thanh toán, order_id tạo một khóa duy nhất `unique key` . Trước khi thanh toán một đơn hàng, bạn chèn trước một bản ghi thanh toán, order_id đã vào rồi. Bạn có thể ghi một đánh dấu vào Redis, `set order_id payed` , lần sau khi yêu cầu lặp lại đến, truy vấn trước value tương ứng của order_id trong Redis, nếu là `payed` thì nghĩa là đã thanh toán rồi, bạn đừng thanh toán lặp lại nữa.
