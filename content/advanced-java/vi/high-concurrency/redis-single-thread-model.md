---
source:
  locale: zh
  slug: redis-single-thread-model
  hash: 'sha256:v1:084d77058a30583b74b133f170080bd6b3306965f426526a6b88bc956649dfeb'
status: machine
translatedAt: '2026-10-14'
---
# Sự khác biệt giữa Redis và Memcached

## Câu hỏi phỏng vấn

Redis và Memcached khác nhau thế nào? Mô hình luồng của Redis là gì? Tại sao Redis đơn luồng mà vẫn chịu được tải đồng thời cao (high concurrency)?

## Tâm lý người phỏng vấn

Đây là câu hỏi cơ bản nhất khi hỏi về Redis. Một nguyên lý nội tại và đặc điểm cơ bản nhất của Redis chính là Redis thực chất là **mô hình làm việc đơn luồng**. Nếu bạn còn không biết điều này, thì sau này dùng Redis gặp sự cố chẳng phải sẽ không biết gì hay sao?

Cũng có thể người phỏng vấn sẽ hỏi bạn sự khác biệt giữa Redis và Memcached. Memcached là giải pháp bộ nhớ đệm (cache) được các công ty internet lớn dùng phổ biến những năm trước, nhưng mấy năm gần đây gần như đều là Redis, hầu như không còn công ty nào dùng Memcached nữa.

## Phân tích câu trả lời

### Redis và Memcached khác nhau thế nào?

#### Redis hỗ trợ cấu trúc dữ liệu phức tạp

So với Memcached, Redis có [nhiều cấu trúc dữ liệu hơn](doc:advanced-java/high-concurrency/redis-data-types), hỗ trợ các thao tác dữ liệu phong phú hơn. Nếu cần bộ nhớ đệm hỗ trợ cấu trúc và thao tác phức tạp hơn, Redis sẽ là lựa chọn tốt.

#### Redis hỗ trợ sẵn chế độ cụm

Từ phiên bản Redis3.x đã hỗ trợ chế độ cluster, còn Memcached không có chế độ cụm sẵn, phải dựa vào client để ghi dữ liệu phân mảnh vào cụm.

#### So sánh hiệu năng

Do Redis chỉ dùng **một nhân**, còn Memcached có thể dùng **nhiều nhân**, nên tính trung bình trên mỗi nhân, Redis có hiệu năng cao hơn Memcached khi lưu dữ liệu nhỏ. Còn với dữ liệu từ 100k trở lên, hiệu năng của Memcached cao hơn Redis. Dù gần đây Redis cũng đã tối ưu hiệu năng khi lưu dữ liệu lớn, nhưng so với Memcached thì vẫn còn kém đôi chút.

### Mô hình luồng của Redis

Bên trong Redis dùng bộ xử lý sự kiện tệp `file event handler` , bộ xử lý sự kiện tệp này là đơn luồng, nên Redis mới được gọi là mô hình đơn luồng. Nó dùng cơ chế ghép kênh I/O (IO multiplexing) để đồng thời lắng nghe nhiều socket, đưa các socket phát sinh sự kiện vào hàng đợi trong bộ nhớ, bộ điều phối sự kiện dựa vào loại sự kiện trên socket để chọn bộ xử lý sự kiện tương ứng xử lý.

Cấu trúc của bộ xử lý sự kiện tệp gồm 4 phần:

-   Nhiều socket
-   Chương trình ghép kênh I/O
-   Bộ điều phối sự kiện tệp
-   Bộ xử lý sự kiện (bộ xử lý trả lời kết nối, bộ xử lý yêu cầu lệnh, bộ xử lý phản hồi lệnh)

Nhiều socket có thể đồng thời phát sinh các thao tác khác nhau, mỗi thao tác tương ứng một sự kiện tệp khác nhau, nhưng chương trình ghép kênh I/O sẽ lắng nghe nhiều socket, đưa các socket phát sinh sự kiện vào hàng đợi để xếp hàng, mỗi lần bộ điều phối sự kiện lấy một socket ra khỏi hàng đợi, căn cứ vào loại sự kiện của socket để giao cho bộ xử lý sự kiện tương ứng xử lý.

Hãy xem một lần giao tiếp giữa client và Redis:

![Redis-single-thread-model](diagram:high-concurrency/redis-single-thread-model/redis-single-thread-model)

Cần hiểu rằng giao tiếp được thực hiện thông qua socket, bạn nào chưa rõ thì có thể xem trước về lập trình mạng socket.

Đầu tiên, khi tiến trình server của Redis khởi tạo, nó sẽ liên kết sự kiện `AE_READABLE` của server socket với bộ xử lý trả lời kết nối.

Client socket01 yêu cầu thiết lập kết nối tới server socket của tiến trình Redis, lúc này server socket sẽ phát sinh một sự kiện `AE_READABLE` , chương trình ghép kênh I/O lắng nghe được sự kiện do server socket phát sinh thì đưa socket đó vào hàng đợi. Bộ điều phối sự kiện tệp lấy socket từ hàng đợi, giao cho **bộ xử lý trả lời kết nối**. Bộ xử lý trả lời kết nối sẽ tạo ra một socket01 có thể giao tiếp với client, và liên kết sự kiện `AE_READABLE` của socket01 này với bộ xử lý yêu cầu lệnh.

Giả sử lúc này client gửi một yêu cầu `set key value` , socket01 trong Redis sẽ phát sinh sự kiện `AE_READABLE` , chương trình ghép kênh I/O đưa socket01 vào hàng đợi, lúc này bộ điều phối sự kiện lấy từ hàng đợi được sự kiện `AE_READABLE` do socket01 phát sinh, vì sự kiện `AE_READABLE` của socket01 trước đó đã được liên kết với bộ xử lý yêu cầu lệnh, nên bộ điều phối sự kiện giao sự kiện cho bộ xử lý yêu cầu lệnh xử lý. Bộ xử lý yêu cầu lệnh đọc `key value` của socket01 và hoàn tất việc thiết lập `key value` trong bộ nhớ của mình. Sau khi thao tác xong, nó sẽ liên kết sự kiện `AE_WRITABLE` của socket01 với bộ xử lý phản hồi lệnh.

Nếu lúc này client đã sẵn sàng nhận kết quả trả về, thì socket01 trong Redis sẽ phát sinh một sự kiện `AE_WRITABLE` , cũng được đưa vào hàng đợi, bộ điều phối sự kiện tìm bộ xử lý phản hồi lệnh được liên kết, bộ xử lý phản hồi lệnh ghi kết quả của thao tác lần này vào socket01, chẳng hạn `ok` , sau đó hủy liên kết giữa sự kiện `AE_WRITABLE` của socket01 và bộ xử lý phản hồi lệnh.

Như vậy là hoàn tất một lần giao tiếp. Về quá trình một lần giao tiếp của Redis, bạn đọc nên đọc cuốn [Redis: Thiết kế và triển khai (tác giả Huang Jianhong)](https://github.com/doocs/technical-books#database) để học một cách hệ thống.

### Tại sao mô hình đơn luồng của Redis vẫn hiệu quả đến vậy?

-   Thao tác thuần trên bộ nhớ.
-   Cốt lõi dựa trên cơ chế ghép kênh I/O không chặn.
-   Cài đặt bằng ngôn ngữ C. Nhìn chung, chương trình viết bằng C "gần" hệ điều hành hơn nên tốc độ thực thi tương đối nhanh hơn.
-   Đơn luồng lại tránh được vấn đề chuyển ngữ cảnh thường xuyên của đa luồng, ngăn ngừa các vấn đề tranh chấp mà đa luồng có thể gây ra.

### Redis 6.0 bắt đầu đưa vào đa luồng

**Chú ý!** Các phiên bản Redis sau 6.0 đã từ bỏ thiết kế mô hình đơn luồng, **Redis vốn chạy đơn luồng cũng bắt đầu dùng mô hình đa luồng một cách có chọn lọc**.

Trước đó còn nhấn mạnh tính hiệu quả của mô hình đơn luồng Redis, giờ sao lại đưa đa luồng vào? Điều này thực ra cho thấy ở một số khía cạnh, đơn luồng của Redis đã không còn lợi thế. Bởi vì các lời gọi hệ thống Read/Write đọc ghi mạng chiếm phần lớn thời gian CPU trong quá trình Redis thực thi, nếu làm phần đọc ghi mạng theo kiểu đa luồng thì hiệu năng sẽ được cải thiện rất nhiều.

**Phần đa luồng của Redis chỉ dùng để xử lý đọc ghi dữ liệu mạng và phân tích giao thức, việc thực thi lệnh vẫn là đơn luồng.** Sở dĩ thiết kế như vậy là vì không muốn Redis trở nên phức tạp do đa luồng, phải kiểm soát các vấn đề đồng thời của key, lua, transaction, LPUSH/LPOP, v.v.

### Tổng kết

Redis chọn mô hình đơn luồng để xử lý request của client chủ yếu là vì CPU không phải là nút thắt cổ chai của máy chủ Redis, nên mức tăng hiệu năng do mô hình đa luồng mang lại không bù được chi phí phát triển và bảo trì mà nó kéo theo, nút thắt hiệu năng của hệ thống cũng chủ yếu nằm ở thao tác network I/O. Còn việc Redis đưa vào thao tác đa luồng cũng xuất phát từ cân nhắc về hiệu năng: với một số thao tác xóa key-value lớn, giải phóng không gian bộ nhớ bằng đa luồng một cách không chặn (thao tác giải phóng không chặn đọc ghi network IO, vì đọc ghi network IO và việc thực thi lệnh giải phóng không cùng một luồng) cũng có thể giảm thời gian chặn luồng chính của Redis, nâng cao hiệu quả thực thi.
