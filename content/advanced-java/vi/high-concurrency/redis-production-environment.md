---
source:
  locale: zh
  slug: redis-production-environment
  hash: 'sha256:v1:a846849cdf769a9665b06bfa2c29e1dc70a15ae7568d8162b70a51263da802eb'
status: machine
translatedAt: '2026-10-14'
---
# Phương án triển khai Redis trên môi trường production

## Câu hỏi phỏng vấn

Redis trên môi trường production được triển khai như thế nào?

## Tâm lý người phỏng vấn

Xem bạn có hiểu kiến trúc triển khai của cụm (cluster) Redis production của công ty mình hay không; nếu bạn không hiểu thì quả thật là thiếu trách nhiệm. Redis của bạn là kiến trúc master-slave? Kiến trúc cụm? Dùng phương án cụm nào? Có đảm bảo tính sẵn sàng cao không? Có bật cơ chế lưu trữ bền vững (persistence) để đảm bảo có thể khôi phục dữ liệu không? Redis trực tuyến được cấp bao nhiêu GB bộ nhớ? Đã đặt những tham số nào? Sau khi kiểm thử áp lực, cụm Redis của các bạn chịu được bao nhiêu QPS?

Bạn à, những điều này bạn phải nắm rõ như lòng bàn tay, nếu không thì quả thật là bạn chưa suy nghĩ kỹ.

## Phân tích câu trả lời

Redis cluster, 10 máy, 5 máy triển khai instance master của Redis, 5 máy còn lại triển khai instance replica của Redis, mỗi instance master gắn một instance replica, 5 node cung cấp dịch vụ đọc ghi ra bên ngoài, QPS đọc ghi đỉnh của mỗi node có thể đạt 50 nghìn mỗi giây, 5 máy tối đa là 250 nghìn yêu cầu đọc ghi mỗi giây.

Cấu hình máy là gì? Bộ nhớ 32G + CPU 8 nhân + đĩa 1T, nhưng cấp cho tiến trình Redis là 10g bộ nhớ; nói chung trên môi trường production trực tuyến, bộ nhớ Redis cố gắng đừng vượt quá 10g, vượt quá 10g có thể gặp vấn đề.

5 máy cung cấp đọc ghi ra bên ngoài, tổng cộng có 50g bộ nhớ.

Vì mỗi instance master đều gắn một instance replica nên có tính sẵn sàng cao, bất kỳ instance master nào sập đều sẽ tự động chuyển đổi dự phòng, instance replica của Redis sẽ tự động trở thành instance master để tiếp tục cung cấp dịch vụ đọc ghi.

Bạn ghi vào bộ nhớ dữ liệu gì? Kích thước mỗi bản ghi là bao nhiêu? Dữ liệu sản phẩm, mỗi bản ghi là 10kb. 100 bản ghi là 1mb, 100 nghìn bản ghi là 1g. Thường trú trong bộ nhớ là 2 triệu bản ghi dữ liệu sản phẩm, chiếm 20g bộ nhớ, chưa đến 50% tổng bộ nhớ. Hiện tại vào giờ cao điểm là khoảng 3500 yêu cầu mỗi giây.

Thực ra ở các công ty lớn, sẽ có team hạ tầng phụ trách vận hành cụm cache.
