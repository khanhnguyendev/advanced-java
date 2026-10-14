---
source:
  locale: zh
  slug: sort-the-query-strings-by-counts
  hash: 'sha256:v1:eb07fb1afff0359fd5772c87e8de8d19a1c1bae476ac20ce05780cf7ae4ef778'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để sắp xếp theo tần suất của query?

## Mô tả đề bài

Có 10 tệp, mỗi tệp có kích thước 1G, mỗi dòng của mỗi tệp chứa một query của người dùng, query trong mỗi tệp đều có thể trùng lặp. Yêu cầu sắp xếp theo tần suất của query.

## Hướng giải

Nếu độ lặp của query khá lớn thì có thể cân nhắc đọc tất cả query vào bộ nhớ để xử lý một lần; nếu tỷ lệ lặp của query không cao thì bộ nhớ khả dụng không đủ chứa tất cả query, lúc này cần dùng chia để trị hoặc các phương pháp khác để giải quyết.

### Phương pháp một: dùng HashMap

Nếu tỷ lệ lặp của query cao, nghĩa là tổng số query khác nhau khá nhỏ, có thể cân nhắc nạp tất cả query vào HashMap trong bộ nhớ. Sau đó có thể sắp xếp theo số lần xuất hiện của query.

### Phương pháp hai: chia để trị

Chia để trị cần dựa vào kích thước lượng dữ liệu và kích thước bộ nhớ khả dụng để xác định quy mô chia bài toán. Với đề bài này, có thể duyệt tuần tự query trong 10 tệp, dùng hàm Hash `hash(query) % 10` để chia các query này vào 10 tệp nhỏ. Sau đó với mỗi tệp nhỏ dùng HashMap thống kê số lần xuất hiện của query, sắp xếp theo số lần rồi ghi vào một tệp riêng khác.

Tiếp đó sắp xếp tất cả các tệp theo số lần của query, ở đây có thể dùng sắp xếp trộn (vì không thể đọc tất cả query vào bộ nhớ nên cần dùng sắp xếp ngoài).

## Tổng kết phương pháp

-   Nếu bộ nhớ đủ, đọc trực tiếp vào để sắp xếp;
-   Nếu bộ nhớ không đủ, trước hết chia thành các tệp nhỏ, sau khi các tệp nhỏ đã được sắp xếp thì dùng sắp xếp ngoài để trộn.
