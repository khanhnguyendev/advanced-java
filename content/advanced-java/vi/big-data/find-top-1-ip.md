---
source:
  locale: zh
  slug: find-top-1-ip
  hash: 'sha256:v1:f7b8b70938bfb292bb0040d68e7b0843fd9e1c279216ae45bad0657fb2d03d09'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để tìm IP truy cập website Baidu nhiều nhất trong một ngày?

## Mô tả đề bài

Hiện có dữ liệu log quy mô lớn được lưu trong một tệp cực lớn, tệp này không thể đọc trực tiếp vào bộ nhớ. Yêu cầu trích xuất từ đó IP truy cập Baidu nhiều lần nhất trong một ngày nào đó.

## Hướng giải

Bài này chỉ quan tâm đến IP truy cập Baidu nhiều nhất trong một ngày, vì vậy trước hết có thể duyệt tệp một lượt, ghi các thông tin liên quan đến IP truy cập Baidu trong ngày đó vào một tệp lớn riêng. Tiếp theo áp dụng phương pháp giống bài trước, đại khái là trước hết ánh xạ băm các IP, sau đó dùng HashMap để thống kê số lần lặp của từng IP, cuối cùng tính ra IP có số lần lặp nhiều nhất.

> Lưu ý: ở đây chỉ cần tìm IP xuất hiện nhiều lần nhất, nên không nhất thiết phải dùng heap, chỉ cần dùng trực tiếp một biến max là đủ.

## Tóm tắt phương pháp

1. Chia để trị, băm rồi lấy phần dư;
2. Dùng HashMap để thống kê tần suất;
3. Để tìm TopN phần tử **lớn nhất**, dùng **min-heap**; để tìm TopN phần tử **nhỏ nhất**, dùng **max-heap**.
