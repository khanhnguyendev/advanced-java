---
source:
  locale: zh
  slug: es-introduction
  hash: 'sha256:v1:13a547bbb56ac21eb4d9c44c38f1fe155b992390080f15788cb684f65010bf3c'
status: machine
translatedAt: '2026-10-14'
---
# Giới thiệu công cụ tìm kiếm

## Lịch sử hình thành của Lucene và ES

Lucene là thư viện tìm kiếm tiên tiến nhất, mạnh mẽ nhất về chức năng. Nếu phát triển trực tiếp dựa trên Lucene thì rất phức tạp, ngay cả viết một số chức năng đơn giản cũng phải viết rất nhiều mã Java, cần hiểu sâu nguyên lý.

ElasticSearch dựa trên Lucene, che giấu độ phức tạp của lucene, cung cấp RESTful api / Java api dễ dùng (ngoài ra còn có các API của các ngôn ngữ khác).

-   Công cụ lưu trữ tài liệu phân tán
-   Công cụ tìm kiếm và công cụ phân tích phân tán
-   Phân tán, hỗ trợ dữ liệu cấp PB

## Các khái niệm cốt lõi của ES

### Near Realtime

Gần thời gian thực (near realtime), có hai tầng ý nghĩa:

-   Từ lúc ghi dữ liệu đến lúc dữ liệu có thể được tìm kiếm thấy có một độ trễ nhỏ (khoảng 1s)
-   Thực hiện tìm kiếm và phân tích dựa trên ES có thể đạt mức giây

### Cluster

Cụm (cluster) gồm nhiều node, mỗi node thuộc cụm nào được quyết định thông qua một cấu hình, đối với ứng dụng cỡ vừa và nhỏ, lúc mới bắt đầu một cụm chỉ có một node là rất bình thường.

### Node

Node là một node trong cụm, node cũng có một tên, mặc định được cấp ngẫu nhiên. Mặc định node sẽ gia nhập một cụm có tên là `elasticsearch`. Nếu khởi động trực tiếp một loạt node thì chúng sẽ tự động tạo thành một cụm elasticsearch, tất nhiên một node cũng có thể tạo thành cụm elasticsearch.

### Document & field

Tài liệu là đơn vị dữ liệu nhỏ nhất trong ES, một document có thể là một bản ghi dữ liệu khách hàng, một bản ghi dữ liệu phân loại sản phẩm, một bản ghi dữ liệu đơn hàng, thường được biểu diễn bằng cấu trúc dữ liệu json. Mỗi type dưới mỗi index đều có thể lưu nhiều document. Một document có nhiều field, mỗi field là một trường dữ liệu.

```json
{
    "product_id": "1",
    "product_name": "iPhone X",
    "product_desc": "苹果手机",
    "category_id": "2",
    "category_name": "电子产品"
}
```

### Index

Chỉ mục chứa một loạt dữ liệu tài liệu có cấu trúc tương tự nhau, ví dụ chỉ mục sản phẩm. Một chỉ mục chứa rất nhiều document, một chỉ mục đại diện cho một loại document tương tự hoặc giống nhau.

### Type

Kiểu, mỗi chỉ mục có thể có một hoặc nhiều type, type là một phân loại logic của index, ví dụ dưới index sản phẩm có nhiều type: type hàng hóa tiêu dùng hằng ngày, type đồ điện, type thực phẩm tươi sống. Các field của document dưới mỗi type có thể không hoàn toàn giống nhau.

### shard

Một máy đơn lẻ không thể lưu lượng dữ liệu lớn, ES có thể chia dữ liệu trong một chỉ mục thành nhiều shard, phân bố lưu trữ trên nhiều server. Có shard thì có thể mở rộng theo chiều ngang, lưu nhiều dữ liệu hơn, để các thao tác như tìm kiếm và phân tích được phân tán thực thi trên nhiều server, nâng cao thông lượng và hiệu năng. Mỗi shard là một lucene index.

### replica

Bất kỳ server nào cũng có thể gặp sự cố hoặc sập bất cứ lúc nào, lúc này shard có thể bị mất, vì vậy có thể tạo nhiều replica (bản sao) cho mỗi shard. replica có thể cung cấp dịch vụ dự phòng khi shard gặp sự cố, đảm bảo dữ liệu không mất, nhiều replica còn có thể nâng cao thông lượng và hiệu năng của thao tác tìm kiếm. primary shard (thiết lập một lần khi tạo chỉ mục, không thể sửa, mặc định 5 cái), replica shard (có thể sửa số lượng bất cứ lúc nào, mặc định 1 cái), mặc định mỗi chỉ mục có 10 shard, 5 primary shard, 5 replica shard, cấu hình tính sẵn sàng cao tối thiểu là 2 server.

Nói thế này nhé, shard chia thành primary shard và replica shard. Còn primary shard thường được gọi tắt là shard, replica shard thường được gọi tắt là replica.

![es-cluster-0](diagram:high-concurrency/es-introduction/es-cluster-0)

## Khái niệm cốt lõi của ES so với khái niệm cốt lõi của DB

| ES       | DB                 |
| -------- | ------------------ |
| index    | cơ sở dữ liệu      |
| type     | bảng dữ liệu       |
| document | một dòng dữ liệu   |

Trên đây là một phép so sánh tương đương đơn giản.
