---
source:
  locale: zh
  slug: es-write-query-search
  hash: 'sha256:v1:8308a0c5553e88aca4e9b5b46d3d45063894cf517da63effb75e6e6b46da3fe2'
status: machine
translatedAt: '2026-10-14'
---
# Nguyên lý ghi dữ liệu của ES

## Câu hỏi phỏng vấn

Nguyên lý hoạt động khi ES ghi dữ liệu là gì? Nguyên lý hoạt động khi ES truy vấn dữ liệu là gì? Giới thiệu về Lucene bên dưới đi? Bạn có hiểu chỉ mục đảo ngược (inverted index) không?

## Tâm lý người phỏng vấn

Hỏi câu này, thực ra người phỏng vấn muốn xem bạn có hiểu một số nguyên lý cơ bản của es không, vì dùng es chẳng qua là ghi dữ liệu và tìm kiếm dữ liệu. Nếu bạn không hiểu khi bạn gửi một yêu cầu ghi và tìm kiếm thì es đang làm gì, thì bạn thật sự là......

Với es về cơ bản chỉ là một hộp đen, bạn còn làm được gì? Việc duy nhất bạn làm được là dùng api của es để đọc ghi dữ liệu. Nếu xảy ra vấn đề gì mà bạn không biết gì cả, thì còn trông đợi gì ở bạn nữa?

## Phân tích câu trả lời

### Quá trình es ghi dữ liệu

-   Client chọn một node và gửi yêu cầu đến đó, node này chính là `coordinating node` (node điều phối).
-   `coordinating node` thực hiện **định tuyến** cho document, chuyển tiếp yêu cầu đến node tương ứng (có primary shard).
-   `primary shard` trên node thực tế xử lý yêu cầu, sau đó đồng bộ dữ liệu sang `replica node`.
-   `coordinating node` nếu thấy `primary node` và tất cả `replica node` đều đã xong, thì trả về kết quả phản hồi cho client.

![es-write](asset:high-concurrency/es-write-query-search/es-write.png)

### Quá trình es đọc dữ liệu

Có thể truy vấn thông qua `doc id`, sẽ băm theo `doc id`, xác định được lúc đó `doc id` được phân bổ vào shard nào, rồi truy vấn từ shard đó.

-   Client gửi yêu cầu đến **một node bất kỳ**, node này trở thành `coordinate node`.
-   `coordinate node` định tuyến băm theo `doc id`, chuyển tiếp yêu cầu đến node tương ứng, lúc này sẽ dùng **thuật toán xoay vòng ngẫu nhiên** `round-robin`, chọn ngẫu nhiên một trong `primary shard` và tất cả replica của nó, để cân bằng tải cho yêu cầu đọc.
-   Node nhận yêu cầu trả về document cho `coordinate node`.
-   `coordinate node` trả về document cho client.

### Quá trình es tìm kiếm dữ liệu

Điểm mạnh nhất của es là tìm kiếm toàn văn, ví dụ bạn có ba bản ghi dữ liệu:

```
java thật vui
java khó học quá
j2ee cực kỳ đỉnh
```

Bạn tìm kiếm theo từ khóa `java`, tìm ra các `document` chứa `java`. es sẽ trả về cho bạn: java thật vui, java khó học quá.

-   Client gửi yêu cầu đến một `coordinate node`.
-   Node điều phối chuyển tiếp yêu cầu tìm kiếm đến `primary shard` hoặc `replica shard` tương ứng của **tất cả** shard, cái nào cũng được.
-   query phase: mỗi shard trả kết quả tìm kiếm của mình (thực chất là một số `doc id`) cho node điều phối, node điều phối thực hiện các thao tác như hợp nhất dữ liệu, sắp xếp, phân trang, tạo ra kết quả cuối cùng.
-   fetch phase: tiếp theo node điều phối dựa vào `doc id` để **kéo dữ liệu** `document` **thực tế** từ các node, cuối cùng trả về cho client.

> Yêu cầu ghi là ghi vào primary shard, sau đó đồng bộ cho tất cả replica shard; yêu cầu đọc có thể đọc từ primary shard hoặc replica shard, dùng thuật toán xoay vòng ngẫu nhiên.

### Nguyên lý bên dưới của việc ghi dữ liệu

![es-write-detail](asset:high-concurrency/es-write-query-search/es-write-detail.png)

Trước hết ghi vào buffer trong bộ nhớ, khi còn ở trong buffer thì dữ liệu không tìm kiếm được; đồng thời ghi dữ liệu vào tệp nhật ký translog.

Nếu buffer sắp đầy, hoặc đến một thời điểm nhất định, sẽ `refresh` dữ liệu buffer trong bộ nhớ vào một `segment file` mới, nhưng lúc này dữ liệu không trực tiếp vào tệp đĩa `segment file`, mà vào `os cache` trước. Quá trình này chính là `refresh`.

Cứ mỗi 1 giây, es ghi dữ liệu trong buffer vào một `segment file` **mới**, mỗi giây sẽ sinh ra một **tệp đĩa mới** `segment file`, `segment file` này lưu dữ liệu được ghi vào buffer trong 1 giây gần nhất.

Nhưng nếu lúc này buffer không có dữ liệu thì tất nhiên sẽ không thực hiện thao tác refresh, nếu buffer có dữ liệu, mặc định 1 giây thực hiện một lần refresh, đẩy vào một segment file mới.

Trong hệ điều hành, tệp đĩa thực ra đều có một thứ gọi là `os cache`, tức là bộ nhớ đệm của hệ điều hành, nghĩa là trước khi dữ liệu được ghi vào tệp đĩa, sẽ vào `os cache` trước, vào một bộ nhớ đệm ở cấp hệ điều hành. Chỉ cần dữ liệu trong `buffer` được thao tác refresh đẩy vào `os cache`, dữ liệu này có thể được tìm kiếm thấy.

Tại sao nói es là **gần thời gian thực**? `NRT`, tên đầy đủ là `near real-time`. Mặc định cứ mỗi 1 giây refresh một lần, nên es là gần thời gian thực, vì dữ liệu ghi vào sau 1 giây mới thấy được. Có thể thông qua `restful api` hoặc `java api` của es để **thủ công** thực hiện một thao tác refresh, tức là thủ công đẩy dữ liệu trong buffer vào `os cache`, để dữ liệu có thể được tìm kiếm ngay lập tức. Chỉ cần dữ liệu được đưa vào `os cache`, buffer sẽ bị xóa sạch, vì không cần giữ buffer nữa, dữ liệu trong translog đã được lưu bền vững (persistence) xuống đĩa một bản.

Lặp lại các bước trên, dữ liệu mới liên tục vào buffer và translog, liên tục ghi dữ liệu `buffer` vào hết segment file mới này đến `segment file` mới khác, mỗi lần `refresh` xong buffer được xóa sạch, translog được giữ lại. Theo quá trình này, translog sẽ ngày càng lớn. Khi translog đạt đến một độ dài nhất định, sẽ kích hoạt thao tác `commit`.

Bước đầu tiên của thao tác commit là `refresh` dữ liệu hiện có trong buffer vào `os cache`, xóa sạch buffer. Sau đó, ghi một `commit point` vào tệp đĩa, bên trong đánh dấu tất cả `segment file` tương ứng với `commit point` này, đồng thời cưỡng chế `fsync` toàn bộ dữ liệu hiện có trong `os cache` xuống tệp đĩa. Cuối cùng **xóa sạch** tệp nhật ký translog hiện có, khởi động một translog mới, lúc này thao tác commit hoàn tất.

Thao tác commit này gọi là `flush`. Mặc định cứ 30 phút tự động thực hiện một lần `flush`, nhưng nếu translog quá lớn cũng sẽ kích hoạt `flush`. Thao tác flush tương ứng với toàn bộ quá trình commit, chúng ta có thể thông qua api của es để thủ công thực hiện thao tác flush, thủ công fsync cưỡng chế dữ liệu trong os cache xuống đĩa.

Tác dụng của tệp nhật ký translog là gì? Trước khi bạn thực hiện thao tác commit, dữ liệu hoặc là nằm trong buffer, hoặc là nằm trong os cache, dù là buffer hay os cache đều là bộ nhớ, một khi máy này chết, dữ liệu trong bộ nhớ mất hết. Vì vậy cần ghi các thao tác tương ứng với dữ liệu vào một tệp nhật ký chuyên dụng `translog`, một khi lúc này máy sập, khi khởi động lại, es sẽ tự động đọc dữ liệu trong tệp nhật ký translog, khôi phục vào buffer bộ nhớ và os cache.

translog thực ra cũng được ghi vào os cache trước, mặc định cứ 5 giây flush xuống đĩa một lần, nên mặc định có thể có 5 giây dữ liệu chỉ nằm trong buffer hoặc os cache của tệp translog, nếu lúc này máy sập, sẽ **mất** 5 giây dữ liệu. Nhưng như vậy hiệu năng khá tốt, tối đa mất 5 giây dữ liệu. Cũng có thể đặt translog sao cho mỗi thao tác ghi đều phải `fsync` trực tiếp xuống đĩa, nhưng hiệu năng sẽ kém đi nhiều.

-   `index.translog.sync_interval` kiểm soát bao lâu translog fsync xuống đĩa một lần, tối thiểu là 100ms;
-   `index.translog.durability` translog flush mỗi 5 giây hay mỗi yêu cầu đều fsync, tham số này có 2 giá trị: request (mỗi yêu cầu đều thực hiện fsync, es phải chờ translog fsync xuống đĩa rồi mới trả về thành công) và async (giá trị mặc định, translog cứ 5 giây fsync một lần).

Thực tế ở chỗ này, nếu người phỏng vấn không hỏi bạn về vấn đề es mất dữ liệu, bạn có thể ở đây khoe một chút với người phỏng vấn, bạn nói, thực ra es thứ nhất là gần thời gian thực, dữ liệu ghi vào 1 giây sau có thể tìm kiếm được; có thể mất dữ liệu. Có 5 giây dữ liệu nằm trong buffer, os cache của translog, os cache của segment file, mà không nằm trên đĩa, lúc này nếu sập, sẽ dẫn đến **mất dữ liệu** 5 giây.

**Tóm lại**, dữ liệu trước hết được ghi vào buffer trong bộ nhớ, sau đó cứ mỗi 1s, dữ liệu được refresh vào os cache, vào os cache thì dữ liệu có thể được tìm kiếm (vì vậy chúng ta mới nói es từ lúc ghi đến lúc có thể tìm kiếm được, ở giữa có độ trễ 1s). Cứ mỗi 5s, dữ liệu được ghi vào tệp translog (như vậy nếu máy sập, dữ liệu trong bộ nhớ mất hết, tối đa sẽ mất 5s dữ liệu), translog lớn đến một mức nhất định, hoặc mặc định cứ 30mins, sẽ kích hoạt thao tác commit, flush toàn bộ dữ liệu của vùng đệm vào tệp đĩa segment file.

> Sau khi dữ liệu được ghi vào segment file, đồng thời chỉ mục đảo ngược cũng được xây dựng xong.

### Nguyên lý bên dưới của việc xóa/cập nhật dữ liệu

Nếu là thao tác xóa, khi commit sẽ sinh ra một tệp `.del`, bên trong đánh dấu một doc nào đó ở trạng thái `deleted`, vậy khi tìm kiếm dựa vào tệp `.del` sẽ biết doc này đã bị xóa hay chưa.

Nếu là thao tác cập nhật, là đánh dấu doc gốc ở trạng thái `deleted`, rồi ghi mới một bản ghi dữ liệu.

Mỗi lần buffer refresh sẽ sinh ra một `segment file`, nên mặc định là 1 giây một `segment file`, như vậy `segment file` sẽ ngày càng nhiều, lúc này sẽ định kỳ thực hiện merge. Mỗi lần merge, sẽ gộp nhiều `segment file` thành một, đồng thời ở đây sẽ **xóa vật lý** các doc được đánh dấu `deleted`, sau đó ghi `segment file` mới xuống đĩa, ở đây sẽ ghi một `commit point`, đánh dấu tất cả `segment file` mới, rồi mở `segment file` để dùng cho tìm kiếm, đồng thời xóa `segment file` cũ.

### lucene bên dưới

Nói đơn giản, lucene là một gói jar, bên trong chứa mã của các thuật toán đã được đóng gói để xây dựng chỉ mục đảo ngược. Khi phát triển bằng Java, chúng ta đưa lucene jar vào, rồi phát triển dựa trên api của lucene là được.

Thông qua lucene, chúng ta có thể xây dựng chỉ mục cho dữ liệu hiện có, lucene sẽ tổ chức cấu trúc dữ liệu của chỉ mục cho chúng ta trên đĩa cục bộ.

### Chỉ mục đảo ngược

Trong công cụ tìm kiếm, mỗi tài liệu đều có một ID tài liệu tương ứng, nội dung tài liệu được biểu diễn thành một tập hợp các từ khóa. Ví dụ, tài liệu 1 sau khi tách từ, trích xuất được 20 từ khóa, mỗi từ khóa đều ghi lại số lần xuất hiện và vị trí xuất hiện của nó trong tài liệu.

Vậy, chỉ mục đảo ngược chính là ánh xạ **từ từ khóa đến** ID tài liệu, mỗi từ khóa đều tương ứng với một loạt tệp, các từ khóa đều xuất hiện trong những tệp này.

Lấy một ví dụ.

Có các tài liệu sau:

| DocId | Doc                                                              |
| ----- | ---------------------------------------------------------------- |
| 1     | Cha đẻ Google Maps nhảy việc sang Facebook                       |
| 2     | Cha đẻ Google Maps gia nhập Facebook                             |
| 3     | Người sáng lập Google Maps Lars rời Google gia nhập Facebook     |
| 4     | Cha đẻ Google Maps nhảy việc sang Facebook liên quan đến việc hủy dự án Wave |
| 5     | Cha đẻ Google Maps Lars gia nhập mạng xã hội Facebook            |

Sau khi tách từ tài liệu, thu được **chỉ mục đảo ngược** sau.

| WordId | Word          | DocIds        |
| ------ | ------------- | ------------- |
| 1      | Google        | 1, 2, 3, 4, 5 |
| 2      | Maps          | 1, 2, 3, 4, 5 |
| 3      | cha đẻ        | 1, 2, 4, 5    |
| 4      | nhảy việc     | 1, 4          |
| 5      | Facebook      | 1, 2, 3, 4, 5 |
| 6      | gia nhập      | 2, 3, 5       |
| 7      | người sáng lập | 3            |
| 8      | Lars          | 3, 5          |
| 9      | rời           | 3             |
| 10     | liên quan đến | 4             |
| ..     | ..            | ..            |

Ngoài ra, chỉ mục đảo ngược thực dụng còn có thể ghi lại nhiều thông tin hơn, ví dụ thông tin tần suất tài liệu, cho biết trong tập hợp tài liệu có bao nhiêu tài liệu chứa một từ nào đó.

Vậy, có chỉ mục đảo ngược, công cụ tìm kiếm có thể đáp ứng truy vấn của người dùng một cách rất thuận tiện. Ví dụ người dùng nhập truy vấn `Facebook`, hệ thống tìm kiếm tra chỉ mục đảo ngược, đọc ra các tài liệu chứa từ này, các tài liệu này chính là kết quả tìm kiếm cung cấp cho người dùng.

Cần lưu ý hai chi tiết quan trọng của chỉ mục đảo ngược:

-   Tất cả các term trong chỉ mục đảo ngược đều tương ứng với một hoặc nhiều tài liệu;
-   Các term trong chỉ mục đảo ngược **được sắp xếp tăng dần theo thứ tự từ điển**

> Trên đây chỉ là một ví dụ đơn giản, không sắp xếp tăng dần nghiêm ngặt theo thứ tự từ điển.
