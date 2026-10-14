---
source:
  locale: zh
  slug: database-shard-dynamic-expand
  hash: 'sha256:v1:32fceb0cc07f4331bfbc09992612040125dd8097084537a72c6715eb3ba40852'
status: machine
translatedAt: '2026-10-14'
---
# Phương án mở rộng và thu hẹp động

## Câu hỏi phỏng vấn

Thiết kế phương án sharding có thể mở rộng và thu hẹp động như thế nào?

## Tâm lý người phỏng vấn

Đối với sharding, chủ yếu phải đối mặt với các vấn đề sau:

-   Chọn một middleware cơ sở dữ liệu, khảo sát, học, kiểm thử;
-   Thiết kế một phương án sharding của bạn, bạn muốn chia thành bao nhiêu cơ sở dữ liệu, mỗi cơ sở dữ liệu chia thành bao nhiêu bảng, ví dụ 3 cơ sở dữ liệu, mỗi cơ sở dữ liệu 4 bảng;
-   Dựa trên middleware cơ sở dữ liệu đã chọn, cùng môi trường sharding đã dựng ở môi trường kiểm thử, rồi kiểm thử xem có đọc ghi sharding bình thường được không;
-   Hoàn tất **di chuyển** từ một cơ sở dữ liệu một bảng sang sharding, phương án ghi kép;
-   Hệ thống trực tuyến bắt đầu cung cấp dịch vụ ra bên ngoài dựa trên sharding;
-   Mở rộng rồi, mở rộng thành 6 cơ sở dữ liệu, mỗi cơ sở dữ liệu cần 12 bảng, bạn làm thế nào để thêm nhiều cơ sở dữ liệu và bảng hơn?

Đây là việc bạn buộc phải đối mặt, tức là bạn đã làm xong phương án sharding, rồi một đống cơ sở dữ liệu và bảng đã được tạo, phát triển mã dựa trên middleware sharding đều xong, kiểm thử đều ok, dữ liệu có thể phân bố đều vào các cơ sở dữ liệu và các bảng, hơn nữa tiếp đó bạn còn dùng phương án ghi kép đưa hệ thống lên một cái rụp, đã trực tiếp chạy dựa trên phương án sharding.

Vậy bây giờ vấn đề đến rồi, các cơ sở dữ liệu và bảng này của bạn lại không chống đỡ nổi, phải tiếp tục mở rộng thì làm sao? Có thể là dung lượng mỗi cơ sở dữ liệu của bạn lại sắp đầy, hoặc lượng dữ liệu bảng của bạn lại quá lớn, cũng có thể là mức đồng thời ghi của mỗi cơ sở dữ liệu quá cao, bạn phải tiếp tục mở rộng.

Đây đều là những việc làm sharding trực tuyến buộc phải trải qua.

## Phân tích câu trả lời

### Mở rộng có ngừng hệ thống (không khuyến nghị)

Phương án này giống như di chuyển có ngừng hệ thống, các bước gần như giống nhau, điểm duy nhất là công cụ nhập dữ liệu đó, là rút dữ liệu của cơ sở dữ liệu và bảng hiện có ra rồi từ từ đổ vào cơ sở dữ liệu và bảng mới. Nhưng tốt nhất đừng làm như vậy, hơi không đáng tin, vì đã **sharding** thì chứng tỏ lượng dữ liệu thật sự quá lớn, có thể lên tới hàng trăm triệu bản ghi, thậm chí hàng tỷ, bạn làm vậy có thể xảy ra vấn đề.

Khi di chuyển từ một cơ sở dữ liệu một bảng sang sharding, lượng dữ liệu không quá lớn, bảng đơn lớn nhất cũng chỉ 20 đến 30 triệu. Vậy bạn viết một công cụ, dùng thêm vài máy chạy song song, 1 giờ là nhập dữ liệu xong. Cái này không vấn đề.

Nếu 3 cơ sở dữ liệu + 12 bảng, chạy một thời gian rồi, lượng dữ liệu đã 100~200 triệu. Chỉ riêng nhập 200 triệu bản ghi cũng mất vài tiếng, 6 giờ, vừa nhập xong dữ liệu, còn phải làm các việc sửa cấu hình tiếp theo, khởi động lại hệ thống, kiểm thử xác minh, 10 giờ mới làm xong được. Vì vậy không thể làm như vậy.

### Phương án sau tối ưu

Ngay từ đầu là 32 cơ sở dữ liệu, mỗi cơ sở dữ liệu 32 bảng, vậy tổng cộng là 1024 bảng.

Tôi có thể nói với các bạn, cách chia này, thứ nhất, về cơ bản các công ty internet trong nước chắc chắn đều đủ dùng, thứ hai, dù là chống đỡ mức đồng thời hay chống đỡ lượng dữ liệu đều không vấn đề.

Mức đồng thời ghi bình thường mà mỗi cơ sở dữ liệu chịu tải là 1000, vậy 32 cơ sở dữ liệu có thể chịu tải mức đồng thời ghi $32 \times 1000 = 32000$, nếu mỗi cơ sở dữ liệu chịu tải mức đồng thời ghi 1500, tổng cộng là $32 \times 1500 = 48000$ mức đồng thời ghi, gần 50 nghìn mức đồng thời ghi mỗi giây, phía trước thêm một MQ, san phẳng đỉnh tải (peak shaving), mỗi giây ghi vào MQ 80 nghìn bản ghi, mỗi giây tiêu thụ 50 nghìn bản ghi.

Một số công ty, trừ phi là những công ty xếp hạng rất đầu trong nước, cơ sở dữ liệu của hệ thống cốt lõi nhất của họ có thể có quy mô hàng trăm cơ sở dữ liệu như vậy, 128 cơ sở dữ liệu, 256 cơ sở dữ liệu, 512 cơ sở dữ liệu.

1024 bảng, giả sử mỗi bảng đặt 5 triệu bản ghi, trong MySQL có thể đặt 5 tỷ bản ghi.

Mức đồng thời ghi 50 nghìn mỗi giây, tổng cộng 5 tỷ bản ghi, đối với phần lớn các công ty internet trong nước, thực ra nói chung đều đủ.

Nói về mở rộng sharding, **lần sharding đầu tiên, hãy chia một lần cho đủ**, 32 cơ sở dữ liệu, 1024 bảng, đối với phần lớn các công ty internet vừa và nhỏ có thể đã chống đỡ được vài năm.

Một thực hành là dùng $32 \times 32$ để sharding, tức là chia thành 32 cơ sở dữ liệu, mỗi cơ sở dữ liệu một bảng chia thành 32 bảng. Tổng cộng là 1024 bảng. Dựa vào một id nào đó, trước hết lấy phần dư theo 32 để định tuyến đến cơ sở dữ liệu, rồi lấy phần dư theo 32 để định tuyến đến bảng trong cơ sở dữ liệu.

| orderId | id % 32 (cơ sở dữ liệu) | id / 32 % 32 (bảng) |
| ------- | ----------------------- | ------------------- |
| 259     | 3                       | 8                   |
| 1189    | 5                       | 5                   |
| 352     | 0                       | 11                  |
| 4593    | 17                      | 15                  |

Lúc mới đầu, các cơ sở dữ liệu này có thể là cơ sở dữ liệu logic, được tạo trên cùng một cơ sở dữ liệu, tức là một máy chủ MySQL có thể tạo n cơ sở dữ liệu, ví dụ 32 cơ sở dữ liệu. Về sau nếu cần tách, thì chỉ cần liên tục di chuyển các cơ sở dữ liệu giữa các máy chủ MySQL là được. Rồi hệ thống phối hợp sửa cấu hình một chút là xong.

Ví dụ nhiều nhất có thể mở rộng đến 32 máy chủ cơ sở dữ liệu, mỗi máy chủ cơ sở dữ liệu là một cơ sở dữ liệu. Nếu vẫn chưa đủ? Nhiều nhất có thể mở rộng đến 1024 máy chủ cơ sở dữ liệu, trên mỗi máy chủ cơ sở dữ liệu một cơ sở dữ liệu một bảng, vậy nhiều nhất là 1024 bảng.

Làm như vậy thì không cần tự viết mã để di chuyển dữ liệu, giao hết cho DBA làm là xong, nhưng DBA quả thật cần làm một số công việc di chuyển cơ sở dữ liệu và bảng, nhưng dù sao cũng hiệu quả hơn nhiều so với việc bạn tự viết mã rồi rút dữ liệu, nhập dữ liệu.

Dù là muốn giảm số lượng cơ sở dữ liệu cũng rất đơn giản, thực ra nói thẳng ra là thu hẹp theo bội số là được, rồi sửa lại quy tắc định tuyến một chút.

Ở đây tổng kết các bước:

1. Định sẵn vài máy chủ cơ sở dữ liệu, mỗi máy chủ có mấy cơ sở dữ liệu, mỗi cơ sở dữ liệu bao nhiêu bảng, khuyến nghị là $32 \text{ cơ sở dữ liệu} \times 32 \text{ bảng}$, đối với phần lớn các công ty, có thể đủ dùng trong vài năm.
2. Quy tắc định tuyến, orderId mod 32 = cơ sở dữ liệu, orderId / 32 mod 32 = bảng
3. Khi mở rộng, xin thêm nhiều máy chủ cơ sở dữ liệu hơn, cài MySQL, mở rộng theo bội số, 4 máy chủ, mở rộng lên 8 máy chủ, rồi lên 16 máy chủ.
4. DBA phụ trách di chuyển các cơ sở dữ liệu của máy chủ cơ sở dữ liệu ban đầu sang máy chủ cơ sở dữ liệu mới, di chuyển cơ sở dữ liệu có một số công cụ tiện lợi.
5. Phía chúng ta chỉ cần sửa cấu hình một chút, điều chỉnh địa chỉ máy chủ cơ sở dữ liệu nơi cơ sở dữ liệu đã di chuyển đang đặt.
6. Phát hành lại hệ thống, lên trực tuyến, quy tắc định tuyến ban đầu không cần đổi chút nào, có thể trực tiếp dựa trên tài nguyên máy chủ cơ sở dữ liệu gấp n lần, tiếp tục cung cấp dịch vụ cho hệ thống trực tuyến.
