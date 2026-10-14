---
source:
  locale: zh
  slug: es-architecture
  hash: 'sha256:v1:ee7a27bab9d79039957f0c02b32a674229d076132a000ebae998fae2a2a6fbb2'
status: machine
translatedAt: '2026-10-14'
---
# Nguyên lý kiến trúc phân tán của ES

## Câu hỏi phỏng vấn

Bạn có thể nói về nguyên lý kiến trúc phân tán của ES không (ES hiện thực tính phân tán như thế nào)?

## Tâm lý người phỏng vấn

Ở mảng tìm kiếm, lucene là thư viện tìm kiếm phổ biến nhất. Vài năm trước trong ngành thường hỏi: bạn có hiểu lucene không? Bạn có biết nguyên lý của chỉ mục đảo ngược (inverted index) không? Bây giờ đã lỗi thời từ lâu, vì hiện nay rất nhiều dự án trực tiếp dùng công cụ tìm kiếm phân tán dựa trên lucene, tức là ElasticSearch, gọi tắt là ES.

Và hiện nay tìm kiếm phân tán về cơ bản đã trở thành tiêu chuẩn của hệ thống Java trong đa số ngành internet, trong đó đặc biệt phổ biến là ES, vài năm trước khi ES chưa nổi, mọi người thường dùng solr. Nhưng hai năm nay đa số doanh nghiệp và dự án về cơ bản đều đã chuyển sang ES.

Vì vậy khi phỏng vấn ở các công ty internet, chắc chắn sẽ nói chuyện với bạn về công cụ tìm kiếm phân tán, và nhất định sẽ nói về ES, nếu bạn thực sự không biết thì bạn thực sự đã lỗi thời.

Nếu người phỏng vấn hỏi bạn câu đầu tiên, thì thường sẽ hỏi bạn có thể giới thiệu thiết kế kiến trúc phân tán của ES không, để xem hiểu biết cơ bản của bạn về kiến trúc của công cụ tìm kiếm phân tán.

## Phân tích câu trả lời

Ý tưởng thiết kế của ElasticSearch là công cụ tìm kiếm phân tán, bên dưới thực ra vẫn dựa trên lucene. Tư tưởng cốt lõi là khởi động nhiều instance tiến trình ES trên nhiều máy, tạo thành một cụm (cluster) ES.

**Đơn vị cơ bản** lưu trữ dữ liệu trong ES là chỉ mục, ví dụ bây giờ bạn muốn lưu một số dữ liệu đơn hàng trong ES, bạn nên tạo một chỉ mục `order_idx` trong ES, tất cả dữ liệu đơn hàng đều được ghi vào chỉ mục này, một chỉ mục gần như tương đương một cơ sở dữ liệu trong mysql.

```
index -> type -> mapping -> document -> field
```

Thế này nhé, để giới thiệu trực quan hơn, tôi ở đây làm một phép so sánh. Nhưng nhớ là đừng đánh đồng, phép so sánh chỉ để dễ hiểu.

index tương đương cơ sở dữ liệu mysql. Còn type thì không thể so sánh với mysql, một index có thể có nhiều type, các field của mỗi type gần giống nhau, nhưng có một số khác biệt nhỏ. Giả sử có một index, là index đơn hàng, bên trong chuyên chứa dữ liệu đơn hàng. Giống như bạn tạo bảng trong mysql, một số đơn hàng là đơn hàng sản phẩm vật lý, ví dụ một cái áo, một đôi giày; một số đơn hàng là đơn hàng sản phẩm ảo, ví dụ thẻ game, nạp tiền điện thoại. Hai loại đơn hàng này phần lớn field giống nhau, nhưng một số ít field có thể khác biệt đôi chút.

Vì vậy trong index đơn hàng sẽ tạo hai type, một là type đơn hàng sản phẩm vật lý, một là type đơn hàng sản phẩm ảo, hai type này phần lớn field giống nhau, một số ít field khác nhau.

Trong nhiều trường hợp, một index có thể chỉ có một type, nhưng đúng là nếu một index có nhiều type (**lưu ý**, khái niệm `mapping types` đã bị loại bỏ hoàn toàn trong ElasticSearch 7. X, chi tiết có thể tham khảo [tài liệu chính thức](https://github.com/elastic/elasticsearch/blob/6.5/docs/reference/mapping/removal_of_types.asciidoc)), bạn có thể coi index là bảng của một loại, mỗi type cụ thể đại diện cho một bảng trong mysql. Mỗi type có một mapping, nếu bạn coi một type là một bảng cụ thể, thì index đại diện cho một loại mà nhiều type cùng thuộc về, còn mapping là **định nghĩa cấu trúc bảng** của type này, bạn tạo một bảng trong mysql thì chắc chắn phải định nghĩa cấu trúc bảng, bên trong có những field nào, mỗi field kiểu gì. Thực tế một bản ghi dữ liệu bạn ghi vào một type trong index gọi là một document, một document đại diện cho một dòng trong một bảng nào đó của mysql, mỗi document có nhiều field, mỗi field đại diện cho giá trị của một trường trong document này.

![es-index-type-mapping-document-field](asset:high-concurrency/es-architecture/es-index-type-mapping-document-field.png)

Bạn tạo một chỉ mục, chỉ mục này có thể chia thành nhiều `shard`, mỗi shard lưu một phần dữ liệu. Chia thành nhiều shard có lợi ích, thứ nhất là **hỗ trợ mở rộng theo chiều ngang**, ví dụ lượng dữ liệu của bạn là 3T, 3 shard, mỗi shard chỉ có 1T dữ liệu, nếu bây giờ lượng dữ liệu tăng lên 4T, mở rộng thế nào, rất đơn giản, tạo lại một chỉ mục có 4 shard, nạp dữ liệu vào; thứ hai là **nâng cao hiệu năng**, dữ liệu phân bố trên nhiều shard, tức là nhiều server, mọi thao tác đều được thực thi song song, phân tán trên nhiều máy, nâng cao thông lượng và hiệu năng.

Tiếp theo là dữ liệu của shard này thực tế có nhiều bản sao lưu, tức là mỗi shard đều có một `primary shard`, chịu trách nhiệm ghi dữ liệu, nhưng còn có vài `replica shard`. Sau khi `primary shard` ghi dữ liệu, sẽ đồng bộ dữ liệu sang vài `replica shard` khác.

![es-cluster](asset:high-concurrency/es-architecture/es-cluster.png)

Thông qua phương án replica này, dữ liệu của mỗi shard đều có nhiều bản sao lưu, nếu một máy nào đó sập, không sao, vẫn còn các bản sao dữ liệu khác trên các máy khác. Đạt tính sẵn sàng cao rồi chứ.

Nhiều node của cụm ES sẽ tự động bầu một node làm node master, node master này thực ra làm một số công việc quản lý, ví dụ duy trì metadata của chỉ mục, chịu trách nhiệm chuyển đổi vai trò giữa primary shard và replica shard, v.v. Nếu node master sập, thì sẽ bầu lại một node làm node master.

Nếu node không phải master sập, thì node master sẽ để vai trò của primary shard trên node sập đó chuyển sang replica shard trên các máy khác. Tiếp theo nếu bạn sửa được máy sập đó, sau khi khởi động lại, node master sẽ điều khiển việc phân bổ các replica shard còn thiếu sang, đồng bộ dữ liệu được sửa đổi sau đó, v.v., để cụm trở lại bình thường.

Nói đơn giản hơn một chút, nếu một node không phải master nào đó sập. Thì primary shard trên node này chẳng phải mất rồi sao. Vậy thì, master sẽ để replica shard (trên máy khác) tương ứng với primary shard chuyển thành primary shard. Nếu máy sập được sửa xong, node sau khi sửa cũng không còn là primary shard nữa mà là replica shard.

Thực ra những điều trên chính là thiết kế kiến trúc cơ bản nhất của ElasticSearch với tư cách là công cụ tìm kiếm phân tán.
