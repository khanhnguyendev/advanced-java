---
source:
  locale: zh
  slug: redis-caching-avalanche-and-caching-penetration
  hash: 'sha256:v1:f880b0fbd86e5670042b9aaec8b220cd844b21cff8f1fe3c01e4d6d1c47aafda'
status: machine
translatedAt: '2026-10-14'
---
# Cache avalanche, cache penetration và cache breakdown

## Câu hỏi phỏng vấn

Bạn có biết cache avalanche (tuyết lở bộ nhớ đệm), cache penetration (xuyên thủng bộ nhớ đệm) và cache breakdown của Redis là gì không? Redis sụp đổ thì sẽ ra sao? Hệ thống nên ứng phó thế nào với tình huống này? Làm thế nào để xử lý cache penetration của Redis?

## Tâm lý người phỏng vấn

Thực ra đây là câu bắt buộc phải hỏi khi nói đến bộ nhớ đệm, vì cache avalanche và cache penetration là hai vấn đề lớn nhất của bộ nhớ đệm: hoặc không xảy ra, một khi đã xảy ra thì là vấn đề chí mạng, nên người phỏng vấn nhất định sẽ hỏi bạn.

## Phân tích câu trả lời

### Cache avalanche

Với hệ thống A, giả sử giờ cao điểm mỗi ngày có 5000 yêu cầu mỗi giây, vốn dĩ bộ nhớ đệm có thể chịu được 4000 yêu cầu mỗi giây vào giờ cao điểm, nhưng máy chủ cache bất ngờ sập hoàn toàn. Cache sập, lúc này 5000 yêu cầu mỗi giây đều rơi hết xuống cơ sở dữ liệu, cơ sở dữ liệu chắc chắn không chịu nổi, nó sẽ báo động một tiếng rồi sập. Lúc này, nếu không áp dụng giải pháp đặc biệt nào để xử lý sự cố này, DBA rất sốt ruột, khởi động lại cơ sở dữ liệu, nhưng cơ sở dữ liệu lập tức lại bị luồng lưu lượng mới đánh gục.

Đây chính là cache avalanche.

![redis-caching-avalanche](diagram:high-concurrency/redis-caching-avalanche-and-caching-penetration/redis-caching-avalanche)

Khoảng 3 năm trước, một công ty internet khá nổi tiếng trong nước từng vì sự cố bộ nhớ đệm mà gây ra avalanche, hệ thống backend sụp đổ toàn bộ, sự cố kéo dài từ chiều hôm đó đến tận 3~4 giờ sáng, công ty thiệt hại vài chục triệu.

Giải pháp cho cache avalanche trước, trong và sau sự cố như sau:

-   Trước sự cố: tính sẵn sàng cao cho Redis, master-slave + Sentinel, Redis cluster, tránh sập hoàn toàn.
-   Trong sự cố: bộ nhớ đệm cục bộ ehcache + hystrix giới hạn lưu lượng & suy giảm dịch vụ (fallback), tránh MySQL bị đánh sập.
-   Sau sự cố: lưu trữ bền vững (persistence) cho Redis, một khi khởi động lại sẽ tự động nạp dữ liệu từ đĩa, nhanh chóng khôi phục dữ liệu cache.

![redis-caching-avalanche-solution](diagram:high-concurrency/redis-caching-avalanche-and-caching-penetration/redis-caching-avalanche-solution)

Người dùng gửi một yêu cầu, hệ thống A nhận yêu cầu thì trước hết tra bộ nhớ đệm cục bộ ehcache, nếu không thấy thì tra Redis. Nếu cả ehcache và Redis đều không có thì tra cơ sở dữ liệu, rồi ghi kết quả từ cơ sở dữ liệu vào ehcache và Redis.

Thành phần giới hạn lưu lượng có thể đặt số yêu cầu mỗi giây được phép đi qua thành phần, còn các yêu cầu còn lại không qua được thì xử lý thế nào? **Cho suy giảm dịch vụ!** Có thể trả về một số giá trị mặc định, hoặc lời nhắc thân thiện, hoặc giá trị rỗng.

Lợi ích:

-   Cơ sở dữ liệu tuyệt đối không sập, thành phần giới hạn lưu lượng đảm bảo mỗi giây chỉ có chừng đó yêu cầu đi qua.
-   Chỉ cần cơ sở dữ liệu không sập, tức là với người dùng, 2/5 số yêu cầu vẫn được xử lý.
-   Chỉ cần 2/5 số yêu cầu được xử lý, nghĩa là hệ thống của bạn chưa sập, với người dùng có thể là bấm vài lần không ra trang, nhưng bấm thêm vài lần nữa là ra.

### Cache penetration

Với hệ thống A, giả sử một giây có 5000 yêu cầu, kết quả trong đó 4000 yêu cầu là tấn công độc hại do hacker phát ra.

4000 yêu cầu tấn công đó của hacker không tra được trong bộ nhớ đệm, mỗi lần bạn đi tra trong cơ sở dữ liệu cũng không tra được.

Ví dụ nhé. id trong cơ sở dữ liệu bắt đầu từ 1, kết quả các yêu cầu hacker gửi đến có id đều là số âm. Như vậy bộ nhớ đệm sẽ không có, yêu cầu lần nào cũng "**coi bộ nhớ đệm như không có**", truy vấn thẳng cơ sở dữ liệu. Kịch bản cache penetration do tấn công độc hại này sẽ đánh sập thẳng cơ sở dữ liệu.

![redis-caching-penetration](diagram:high-concurrency/redis-caching-avalanche-and-caching-penetration/redis-caching-penetration)

Cách giải quyết rất đơn giản, mỗi lần hệ thống A không tra được trong cơ sở dữ liệu thì ghi một giá trị rỗng vào bộ nhớ đệm, ví dụ `set -999 UNKNOWN`. Sau đó đặt một thời gian hết hạn, như vậy lần sau có cùng key đến truy cập, trước khi cache hết hiệu lực, đều có thể lấy dữ liệu thẳng từ bộ nhớ đệm.

Tất nhiên, nếu hacker mỗi lần dùng một id số âm khác nhau để tấn công thì cách ghi giá trị rỗng có thể không còn hiệu quả. Cách làm thường gặp hơn là thêm bloom filter (bộ lọc Bloom) trước bộ nhớ đệm, băm ánh xạ tất cả dữ liệu có thể có trong cơ sở dữ liệu vào bloom filter. Sau đó với mỗi yêu cầu, tiến hành kiểm tra như sau:

-   Key của dữ liệu yêu cầu không tồn tại trong bloom filter thì có thể xác định dữ liệu chắc chắn không tồn tại trong cơ sở dữ liệu, hệ thống có thể trả về ngay là không tồn tại.
-   Key của dữ liệu yêu cầu tồn tại trong bloom filter thì tiếp tục truy vấn vào bộ nhớ đệm.

Dùng bloom filter có thể đóng vai trò sàng lọc sơ bộ đối với các yêu cầu truy cập, tránh áp lực truy vấn do dữ liệu không tồn tại gây ra.

![redis-caching-avoid-penetration](diagram:high-concurrency/redis-caching-avalanche-and-caching-penetration/redis-caching-avoid-penetration)

### Cache breakdown

Cache breakdown là khi một key nào đó rất nóng, được truy cập cực kỳ thường xuyên, ở trạng thái truy cập tải đồng thời cao một cách tập trung; khi key này hết hiệu lực trong khoảnh khắc, một lượng lớn yêu cầu sẽ xuyên thủng bộ nhớ đệm, yêu cầu thẳng cơ sở dữ liệu, giống như đục một lỗ thủng trên một bức chắn.

Cách giải quyết trong các tình huống khác nhau có thể như sau:

-   Nếu dữ liệu được cache về cơ bản không bao giờ cập nhật, có thể thử đặt dữ liệu nóng đó là không bao giờ hết hạn.
-   Nếu dữ liệu được cache ít cập nhật, và toàn bộ quy trình làm mới cache tốn ít thời gian, có thể dùng khóa loại trừ lẫn nhau phân tán dựa trên middleware phân tán như Redis, zookeeper, hoặc khóa loại trừ lẫn nhau cục bộ, để đảm bảo chỉ một số ít yêu cầu được truy vấn cơ sở dữ liệu và xây dựng lại cache, các luồng còn lại sau khi khóa được giải phóng có thể truy cập cache mới.
-   Nếu dữ liệu được cache cập nhật thường xuyên, hoặc quy trình làm mới cache tốn nhiều thời gian, có thể dùng luồng định kỳ chủ động xây dựng lại cache trước khi cache hết hạn, hoặc kéo dài thời gian hết hạn của cache, để đảm bảo mọi yêu cầu luôn truy cập được cache tương ứng.
