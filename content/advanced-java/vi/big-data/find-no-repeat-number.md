---
source:
  locale: zh
  slug: find-no-repeat-number
  hash: 'sha256:v1:bc683098810cbd47df180b9fa79c6c5b85d387bfbc535b303398dc96fcb8cf92'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để tìm các số nguyên không trùng lặp trong lượng dữ liệu lớn?

## Mô tả đề bài

Tìm các số nguyên không trùng lặp trong 250 triệu số nguyên. Lưu ý: bộ nhớ không đủ để chứa 250 triệu số nguyên này.

## Hướng giải

### Phương pháp một: chia để trị

Tương tự phương pháp của các đề trước, trước hết chia 250 triệu số vào nhiều tệp nhỏ, dùng HashSet/HashMap tìm các số nguyên không trùng lặp trong từng tệp nhỏ, rồi gộp kết quả của từng phần lại, đó chính là kết quả cuối cùng.

### Phương pháp hai: bitmap

**Bitmap** là dùng một hoặc nhiều bit để đánh dấu giá trị tương ứng của một phần tử, còn khóa chính là phần tử đó. Dùng bit làm đơn vị lưu trữ dữ liệu có thể tiết kiệm đáng kể không gian lưu trữ.

Bitmap dùng mảng bit để biểu diễn một số phần tử có tồn tại hay không. Nó có thể dùng để tìm kiếm nhanh, kiểm tra trùng, sắp xếp, v.v. Chưa rõ lắm? Tôi lấy một ví dụ nhỏ trước.

Giả sử ta cần sắp xếp 5 phần tử (6, 4, 2, 1, 5) thuộc `[0,7]`, có thể dùng phương pháp bitmap. Phạm vi 0~7 có tổng cộng 8 số, chỉ cần 8bit, tức 1 byte. Trước hết đặt mỗi bit về 0:

```
0 0 0 0 0 0 0 0
```

Sau đó duyệt 5 phần tử, gặp 6 trước, thì đặt bit có chỉ số 6 từ 0 thành 1; tiếp đó gặp 4, đặt bit có chỉ số 4 từ 0 thành 1:

```
0 0 0 0 1 0 1 0
```

Duyệt lần lượt, khi kết thúc, mảng bit trông như sau:

```
0 1 1 0 1 1 1 0
```

Chỉ số của mỗi bit bằng 1 biểu diễn một số:

```
for i in range(8):
    if bits[i] == 1:
        print(i)
```

Như vậy thực ra ta đã thực hiện xong việc sắp xếp.

Với các thuật toán liên quan đến số nguyên, **phương pháp bitmap** là một thuật toán rất thực dụng. Giả sử số nguyên int chiếm 4B, tức 32bit, thì số lượng số nguyên ta có thể biểu diễn là 2<sup>32</sup>.

**Với đề bài này**, ta dùng 2 bit để biểu diễn trạng thái của từng số:

-   00 nghĩa là số này chưa xuất hiện;
-   01 nghĩa là số này xuất hiện một lần (chính là số nguyên không trùng lặp mà đề bài cần tìm);
-   10 nghĩa là số này xuất hiện nhiều lần.

Vậy 2<sup>32</sup> số nguyên này cần tổng bộ nhớ là 2<sup>32</sup>\*2b=1GB. Do đó, khi bộ nhớ khả dụng vượt quá 1GB thì có thể dùng phương pháp bitmap. Giả sử bộ nhớ đáp ứng yêu cầu của phương pháp bitmap, thực hiện các thao tác sau:

Duyệt 250 triệu số nguyên, xem bit tương ứng trong bitmap: nếu là 00 thì đổi thành 01, nếu là 01 thì đổi thành 10, nếu là 10 thì giữ nguyên. Sau khi duyệt xong, xem bitmap và xuất các số nguyên có bit tương ứng là 01.

Tất nhiên, đề bài này đặc biệt nói rõ: **bộ nhớ không đủ để chứa 250 triệu số nguyên này**; kích thước bộ nhớ của 250 triệu số nguyên là: 2.5e8/1024/1024/1024 \* 4=3.72GB, nếu bộ nhớ lớn hơn 1GB thì có thể giải bằng phương pháp bitmap.

## Tổng kết phương pháp

**Với bài toán kiểm tra số có trùng lặp hay không**, bitmap là một phương pháp rất hiệu quả, tất nhiên với điều kiện: bộ nhớ phải đáp ứng không gian lưu trữ mà phương pháp bitmap cần.
