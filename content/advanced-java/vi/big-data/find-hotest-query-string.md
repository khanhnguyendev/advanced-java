---
source:
  locale: zh
  slug: find-hotest-query-string
  hash: 'sha256:v1:dd01a7dbc95607c6dcc541cfadf98d9dd49a75664b6fcb9cadfb2340ca1309a0'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để truy vấn chuỗi truy vấn phổ biến nhất?

## Mô tả đề bài

Công cụ tìm kiếm ghi lại vào tệp nhật ký tất cả các chuỗi truy vấn mà người dùng đã dùng cho mỗi lần tìm kiếm, độ dài mỗi chuỗi truy vấn không quá 255 byte.

Giả sử hiện có 10 triệu bản ghi (các chuỗi truy vấn này có độ lặp khá cao, tuy tổng là 10 triệu nhưng nếu loại bỏ trùng lặp thì không quá 3 triệu). Hãy thống kê 10 chuỗi truy vấn phổ biến nhất, yêu cầu bộ nhớ sử dụng không vượt quá 1G. (Một chuỗi truy vấn có độ lặp càng cao thì càng có nhiều người dùng truy vấn nó, và càng phổ biến.)

## Hướng giải

Mỗi chuỗi truy vấn dài tối đa 255B, 10 triệu chuỗi cần chiếm khoảng 2.55G bộ nhớ, do đó ta không thể đọc toàn bộ chuỗi vào bộ nhớ để xử lý.

### Phương pháp một: chia để trị

Chia để trị vẫn là một phương pháp rất thực dụng.

Chia thành nhiều tệp nhỏ, đảm bảo các chuỗi trong một tệp nhỏ có thể được nạp trực tiếp vào bộ nhớ để xử lý, rồi tìm 10 chuỗi xuất hiện nhiều nhất trong từng tệp; cuối cùng dùng một min-heap để thống kê ra 10 chuỗi xuất hiện nhiều nhất trong tất cả các tệp.

Phương pháp này khả thi nhưng không phải tốt nhất, phần dưới giới thiệu các phương pháp khác.

### Phương pháp hai: dùng HashMap

Tuy tổng số chuỗi khá nhiều, nhưng sau khi loại trùng không quá 3 triệu, do đó có thể cân nhắc lưu tất cả chuỗi cùng số lần xuất hiện vào một HashMap, không gian chiếm dụng là 3 triệu\*(255+4)≈777M (trong đó 4 là 4 byte của một số nguyên). Có thể thấy không gian bộ nhớ 1G là hoàn toàn đủ dùng.

**Ý tưởng như sau**:

Trước hết, duyệt các chuỗi, nếu chưa có trong map thì lưu thẳng vào map với value là 1; nếu đã có trong map thì tăng value tương ứng thêm 1, bước này có độ phức tạp thời gian `O(N)` .

Tiếp đó duyệt map, xây dựng một min-heap gồm 10 phần tử, nếu số lần xuất hiện của chuỗi duyệt được lớn hơn số lần xuất hiện của chuỗi ở đỉnh heap thì thay thế, và điều chỉnh heap thành min-heap.

Sau khi duyệt xong, 10 chuỗi trong heap chính là các chuỗi xuất hiện nhiều nhất. Bước này có độ phức tạp thời gian `O(Nlog10)` .

### Phương pháp ba: cây tiền tố

Phương pháp hai dùng HashMap để thống kê số lần, khi các chuỗi này có nhiều tiền tố giống nhau thì có thể cân nhắc dùng cây tiền tố để thống kê số lần xuất hiện của chuỗi: node của cây lưu số lần xuất hiện của chuỗi, 0 nghĩa là chưa xuất hiện.

**Ý tưởng như sau**:

Khi duyệt các chuỗi, tìm trong cây tiền tố; nếu tìm thấy thì tăng số lần của chuỗi lưu trong node thêm 1, ngược lại tạo node mới cho chuỗi này, sau khi tạo xong thì đặt số lần xuất hiện của chuỗi tại node lá là 1.

Cuối cùng vẫn dùng min-heap để sắp xếp theo số lần xuất hiện của các chuỗi.

## Tổng kết phương pháp

Cây tiền tố thường được dùng để thống kê số lần xuất hiện của chuỗi. Một công dụng lớn khác của nó là tìm kiếm chuỗi, kiểm tra có chuỗi trùng lặp hay không, v.v.
