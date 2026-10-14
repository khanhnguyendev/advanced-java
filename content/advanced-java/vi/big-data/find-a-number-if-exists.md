---
source:
  locale: zh
  slug: find-a-number-if-exists
  hash: 'sha256:v1:5eb3626b3a104881060604b4bd615db1b56d8feb58f9fc843b55a11da1809773'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để xác định một số có tồn tại trong lượng dữ liệu lớn hay không?

## Mô tả đề bài

Cho 4 tỷ số nguyên kiểu unsigned int không trùng lặp và chưa được sắp xếp, sau đó cho thêm một số, làm thế nào để nhanh chóng xác định số này có nằm trong 4 tỷ số nguyên đó hay không?

## Hướng giải

### Phương pháp một: chia để trị

Vẫn có thể giải bằng chia để trị, phương pháp tương tự các đề trước nên không nhắc lại.

### Phương pháp hai: bitmap

Vì phạm vi của số unsigned int là `[0, 1 << 32)`, ta dùng `1<<32=4,294,967,296` bit để biểu diễn từng số. Ban đầu các bit đều là 0, thì tổng bộ nhớ cần là: 4,294,967,296b≈512M.

Ta đọc 4 tỷ số nguyên này, đặt bit tương ứng thành 1. Sau đó đọc số cần truy vấn, xem bit tương ứng có bằng 1 không: nếu bằng 1 nghĩa là tồn tại, nếu bằng 0 nghĩa là không tồn tại.

## Tổng kết phương pháp

**Với bài toán kiểm tra số có tồn tại hay không, kiểm tra số có trùng lặp hay không**, bitmap là một phương pháp rất hiệu quả.
