---
source:
  locale: zh
  slug: how-to-ensure-high-concurrency-and-high-availability-of-redis
  hash: 'sha256:v1:dcbb285b6ccf23c14105f07f3cefc33bba99002a312b70990cbd5d2953e6d615'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để đảm bảo tải đồng thời cao và tính sẵn sàng cao của Redis?

## Câu hỏi phỏng vấn

Làm thế nào để đảm bảo tải đồng thời cao (high concurrency) và tính sẵn sàng cao của redis? Bạn có thể giới thiệu nguyên lý sao chép master/replica (master-slave) của redis không? Bạn có thể giới thiệu nguyên lý Sentinel của redis không?

## Tâm lý người phỏng vấn

Thực ra hỏi câu này chủ yếu là để kiểm tra: redis trên một máy chịu được mức đồng thời cao đến đâu? Nếu một máy không chịu nổi thì mở rộng thế nào để chịu được nhiều đồng thời hơn? redis có thể sập không? Đã là redis có thể sập thì làm sao đảm bảo redis có tính sẵn sàng cao?

Thực ra đều là những vấn đề trong dự án mà bạn chắc chắn phải cân nhắc, nếu bạn chưa từng cân nhắc thì quả thật bạn suy nghĩ quá ít về các vấn đề trong hệ thống production.

## Phân tích câu trả lời

Nếu bạn dùng công nghệ bộ nhớ đệm (cache) redis, chắc chắn phải cân nhắc làm sao dùng redis để thêm nhiều máy nhằm đảm bảo redis có tải đồng thời cao, và cũng phải cân nhắc làm sao để redis không phải sụp hẳn sau khi sập, tức là tính sẵn sàng cao của redis.

Do phần này có nhiều nội dung, nên sẽ chia thành hai tiểu mục để trình bày.

-   [Kiến trúc master/replica của redis](doc:advanced-java/high-concurrency/redis-master-slave)
-   [Tính sẵn sàng cao của redis dựa trên Sentinel](doc:advanced-java/high-concurrency/redis-sentinel)

redis đạt được **tải đồng thời cao** chủ yếu dựa vào **kiến trúc master/replica**, một master nhiều replica. Nhìn chung, với nhiều dự án như vậy là đủ: một master để ghi dữ liệu, trên một máy chịu vài chục nghìn QPS, nhiều replica để truy vấn dữ liệu, nhiều instance replica có thể cung cấp 100 nghìn QPS mỗi giây.

Nếu muốn vừa đạt tải đồng thời cao vừa chứa được lượng lớn dữ liệu thì cần cụm redis, sau khi dùng cụm redis có thể cung cấp mức đồng thời đọc ghi vài trăm nghìn mỗi giây.

Về tính sẵn sàng cao của redis, nếu triển khai theo kiến trúc master/replica thì thêm Sentinel là được, là có thể thực hiện: khi bất kỳ instance nào sập, có thể chuyển đổi master/replica.
