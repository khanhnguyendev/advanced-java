---
source:
  locale: zh
  slug: es-production-cluster
  hash: 'sha256:v1:63aeee3c133123fd25f6f6a2b4baf98f0bbec6fd58bd50dfaab00774d9151bdd'
status: machine
translatedAt: '2026-10-14'
---
# Kiến trúc cụm ES trên môi trường production

## Câu hỏi phỏng vấn

Kiến trúc triển khai của cụm ES trên môi trường production là gì? Lượng dữ liệu của mỗi index khoảng bao nhiêu? Mỗi index có khoảng bao nhiêu shard?

## Tâm lý người phỏng vấn

Câu hỏi này, cũng như các câu về redis phía sau, khi nói đến ES, redis, sharding (phân mảnh CSDL và bảng) của mysql và các công nghệ tương tự thì phỏng vấn nhất định sẽ hỏi! Tức là môi trường production của bạn triển khai như thế nào? Nói thẳng ra, câu hỏi này không có hàm lượng kỹ thuật gì, chỉ là xem bạn có thực sự làm việc này trên môi trường production hay chưa!

Một số bạn có thể chưa từng làm trên môi trường production, chưa thực sự dùng máy chủ online để triển khai cụm ES, cũng chưa thực sự nghịch qua, chưa từng nhập vào cụm ES lượng dữ liệu vài chục triệu thậm chí vài trăm triệu bản ghi, nên có thể bạn không rõ lắm một số chi tiết trong các dự án production.

Nếu bạn chỉ mới nghịch demo, chưa đụng đến cụm ES thật, thì lúc này có thể sẽ bối rối. Đừng bối rối, bạn nhất định phải trả lời câu hỏi này thật nhẹ nhàng tự nhiên, cho thấy rằng bạn thực sự đã làm việc này.

## Phân tích câu trả lời

Thực ra câu hỏi này không có gì khó, nếu bạn thực sự đã làm với ES thì chắc chắn bạn nắm rõ tình hình thực tế của cụm ES production của các bạn: triển khai bao nhiêu máy? Có bao nhiêu index? Mỗi index có bao nhiêu dữ liệu? Mỗi index được cấp bao nhiêu shard? Bạn chắc chắn biết!

Nhưng nếu bạn thực sự chưa làm thì cũng đừng lo, tôi sẽ đưa ra một phiên bản cơ bản, đến lúc đó bạn chỉ cần nói đơn giản là được.

-   Cụm ES production chúng tôi triển khai 5 máy, mỗi máy 6 nhân 64G, tổng bộ nhớ của cụm là 320G.
-   Lượng dữ liệu tăng mỗi ngày của cụm ES khoảng 20 triệu bản ghi, tức khoảng 500MB mỗi ngày, mỗi tháng tăng khoảng 600 triệu bản ghi, 15G. Hiện hệ thống đã chạy được vài tháng, tổng lượng dữ liệu trong cụm ES bây giờ khoảng 100G.
-   Hiện online có 5 index (phần này bạn hãy kết hợp với nghiệp vụ của chính mình, xem những dữ liệu nào có thể đưa vào ES), lượng dữ liệu mỗi index khoảng 20G, nên trong mức dữ liệu này, mỗi index chúng tôi cấp 8 shard, nhiều hơn 3 shard so với mặc định là 5 shard.

Đại khái nói như vậy là được.
