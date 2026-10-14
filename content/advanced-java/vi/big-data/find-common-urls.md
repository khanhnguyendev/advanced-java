---
source:
  locale: zh
  slug: find-common-urls
  hash: 'sha256:v1:f713d4336e953e34cc11d25d1589bbdd3bd741e541dfb01b5f46bf0ff94db75a'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để tìm các URL giống nhau trong lượng dữ liệu lớn các URL?

## Mô tả đề bài

Cho hai tệp a và b, mỗi tệp chứa 5 tỷ URL, mỗi URL chiếm 64B, giới hạn bộ nhớ là 4G. Hãy tìm các URL chung của hai tệp a và b.

## Hướng giải

### 1. Chiến lược chia để trị

Mỗi URL chiếm 64B thì 5 tỷ URL chiếm dung lượng khoảng 320GB.

> 5, 000, 000, 000 _ 64B ≈ 5GB _ 64 = 320GB

Vì bộ nhớ chỉ có 4G nên ta không thể nạp toàn bộ URL vào bộ nhớ để xử lý một lần. Với dạng đề này, thường dùng **chiến lược chia để trị**, tức là: chia các URL trong một tệp thành nhiều tệp nhỏ theo một đặc trưng nào đó, sao cho mỗi tệp nhỏ có kích thước không quá 4G, như vậy có thể đọc tệp nhỏ này vào bộ nhớ để xử lý.

**Ý tưởng như sau**:

Trước hết duyệt tệp a, với mỗi URL duyệt được tính `hash(URL) % 1000`, rồi dựa vào kết quả để lưu URL đó vào a<sub>0</sub>, a<sub>1</sub>, a<sub>2</sub>, ..., a<sub>999</sub>, mỗi tệp có kích thước khoảng 300MB. Duyệt tệp b bằng cách tương tự, lưu các URL của tệp b lần lượt vào các tệp b<sub>0</sub>, b<sub>1</sub>, b<sub>2</sub>, ..., b<sub>999</sub>. Sau khi xử lý như vậy, mọi URL có thể giống nhau đều nằm trong các tệp nhỏ tương ứng, tức a<sub>0</sub> tương ứng b<sub>0</sub>, ..., a<sub>999</sub> tương ứng b<sub>999</sub>; các tệp nhỏ không tương ứng thì không thể có URL giống nhau. Vậy tiếp theo, ta chỉ cần tìm các URL giống nhau trong 1000 cặp tệp nhỏ này.

Tiếp đó duyệt a<sub>i</sub> ( `i∈[0,999]` ), lưu các URL vào một tập HashSet. Sau đó duyệt từng URL trong b<sub>i</sub>, xem nó có tồn tại trong HashSet hay không; nếu có thì đó là URL chung, có thể lưu URL này vào một tệp riêng.

### 2. Cây tiền tố có khả thi không?

> Nói chung, độ dài các URL chênh lệch không lớn, và phần lớn các ký tự đầu giống nhau. Trong trường hợp này rất phù hợp để dùng cấu trúc dữ liệu **cây tiền tố** (trie tree) để lưu trữ, vừa giảm chi phí lưu trữ vừa tăng hiệu quả truy vấn.
>
> Phản hồi bởi [@ChunelFeng](https://github.com/ChunelFeng). [#212](https://github.com/doocs/advanced-java/issues/212)

Có issue đề cập đến việc có thể dùng trực tiếp cây trie hay không, ta hãy tính toán xem phương án này có khả thi không.

Bối cảnh: máy 4G, phải xử lý 320G dữ liệu.

Trước hết đề bài nói 64B; nếu tính một ký tự một byte thì là 64 ký tự (ở đây xét trường hợp cực đoan). Định nghĩa cây Trie xin không nhắc lại, xem [cây tiền tố](https://doocs.github.io/leetcode/tags/#%E5%A4%9A%E7%BA%BF%E7%A8%8B).

- **Chiều cao cây**: độ dài URL chính là chiều cao tối đa mà cây có thể đạt tới, tức cây cao nhất là 64 tầng.

- **Số node con dưới mỗi node**: vì là URL nên ngoài chữ số và chữ cái còn có `%`, `/`, `:` v.v. Ở đây để đơn giản hóa tính toán và dễ hiểu, chỉ dùng ký tự tiếng Anh + chữ số, tổng cộng 62+10=72. Nghĩa là một node có tối đa 72 node con, tức chiếm 72B.

- **Tổng kích thước node**: vì mẫu 320G đủ lớn, ta xét trường hợp xấu nhất là cây cuối cùng là cây 72 nhánh đầy đủ cao 64 tầng. Dung lượng bộ nhớ cuối cùng bằng số node nhân với kích thước node:

  - Số node: với N = 64 tầng, K = 72 nhánh, công thức tính số node của cây (tổng cấp số nhân) là: `1 * (1-72^64)/ (1 - 72) = (72^64 - 1)/ (71)`, ước lượng khoảng `71^63` node.

  - Kích thước node: mỗi node chiếm 1B
    - ký tự hiện tại 1B
    - vị trí hiện tại có giá trị hay không là 1b (kích thước Bool thường gặp), ở đây tính theo kích thước nhỏ nhất.

Vậy tổng kích thước là: `71^63 * 1B/ 1000 ≈ 71^60 KB ≈ 71 ^ 63 GB`, giá trị này đã rất lớn, hơn nữa quá trình tính toán còn xét theo nguyên tắc nhỏ nhất.

---

Viết đến đây có thể một số bạn đọc đã bị dọa, sao lại ra nhiều dữ liệu như vậy, chẳng phải cây trie có tác dụng nén sao?

Kết quả thu được ở đây là không chính xác, vì với 320G dữ liệu, số node sinh ra cùng lắm cũng chỉ là 320G (đường đi hoàn toàn không trùng lặp), do không thể tạo thành cây N nhánh đầy đủ như đã bàn ở trên, mới chỉ lấp đầy một phần nhỏ. Nhưng đối với một máy đơn thì phần dữ liệu này đã không thể xử lý nổi, và phương án không có tính mở rộng và ổn định. Vì vậy cây trie thuần túy phụ thuộc quá nhiều vào phân bố dữ liệu: nếu phần lớn URL của bạn giống nhau thì độ nén rất cao, một máy 4G xử lý 320G là có thể, nhưng với kịch bản ứng dụng mà người phỏng vấn muốn nghe thì xác suất này quá nhỏ. Vì vậy vẫn phải nhờ phương pháp chia để trị để giảm bộ nhớ.

Tối ưu trên phương án một: ở phương pháp trước dùng HashSet để kiểm tra trùng, hiệu suất hash cao hơn hiệu suất truy cập cây trie, còn trie có thể giảm bộ nhớ.

Vì vậy trong buổi phỏng vấn có thể nhắc đến phương án trie; trong kịch bản này, việc xử lý 320G dữ liệu offline không nhạy cảm về thời gian, nên có thể hy sinh tốc độ để đổi lấy không gian.

- Phương án một nói mỗi tệp có kích thước 300MB+, sau khi dùng cây trie thì 300MB+ này sẽ được nén phần nào, ví dụ còn 200MB+; xét đến mức sử dụng hiệu năng máy, trong một số kịch bản CPU dư dả có thể cân nhắc đưa vào xử lý đồng thời, vì tỷ lệ nén 1/3 nên phần không gian còn lại có thể dùng để nạp thêm tệp nhằm xử lý đồng thời, tăng tốc độ xử lý.

- Nếu CPU không dư dả, ví dụ đơn nhân, có thể cân nhắc tăng kích thước tệp khi chia: từ 1000 tệp ban đầu giảm xuống 200 tệp, tức kích thước tệp được mở rộng gấp đôi, trước là 300MB, giờ là 300\*5 = 1.5G, trên máy 4G có thể lấp đầy bộ nhớ, giảm số lần IO, giảm việc sao chép từ kernel mode sang user mode, cũng có thể nhắc thêm DMA.

> Ghi chú của người dịch: bản gốc viết "gấp đôi"; theo phép tính ngay sau đó thì đáp án thông thường là năm lần.

## Tổng kết phương pháp

### Chiến lược chia để trị

1. Chia để trị, băm rồi lấy phần dư;
1. Thống kê bằng HashSet cho từng tệp con.

### Cây tiền tố

1. Tận dụng tiền tố chung của các chuỗi, hy sinh tốc độ để giảm mức chiếm dụng bộ nhớ.
