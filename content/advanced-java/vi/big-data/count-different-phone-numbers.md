---
source:
  locale: zh
  slug: count-different-phone-numbers
  hash: 'sha256:v1:77e1fe66bad3b320a08911d3829bd7d8786b140cf15252b204be399c064c3cf2'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để thống kê số lượng số điện thoại khác nhau?

## Mô tả đề bài

Biết một tệp chứa một số số điện thoại, mỗi số gồm 8 chữ số, hãy thống kê số lượng các số khác nhau.

## Hướng giải

Về bản chất, bài này vẫn là bài toán **dữ liệu trùng lặp**; với loại bài toán này, thường cân nhắc trước tiên là phương pháp bitmap.

Với đề bài này, số điện thoại 8 chữ số có thể biểu diễn 10<sup>8</sup> số, tức 100 triệu số. Mỗi số ta dùng một bit để biểu diễn thì tổng cộng cần 100 triệu bit, bộ nhớ chiếm khoảng 12M.

**Ý tưởng như sau**:

Cấp phát một mảng bitmap có độ dài 100 triệu, khởi tạo bằng 0. Sau đó duyệt tất cả số điện thoại, đặt bit tương ứng với số điện thoại trong bitmap thành 1. Sau khi duyệt xong, nếu bit bằng 1 thì nghĩa là số điện thoại này tồn tại trong tệp, ngược lại là không tồn tại. Số lượng bit có giá trị 1 chính là số lượng các số điện thoại khác nhau.

## Tổng kết phương pháp

Khi giải bài toán dữ liệu trùng lặp, hãy nhớ cân nhắc phương pháp bitmap.
