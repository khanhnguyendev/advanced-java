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

Có một lượng lớn dữ liệu log được lưu trong một tệp cực lớn, tệp này không thể đọc trực tiếp vào bộ nhớ. Yêu cầu trích xuất ra địa chỉ IP truy cập Baidu nhiều lần nhất trong một ngày nào đó.

## Hướng giải

Bài này chỉ quan tâm đến IP truy cập Baidu nhiều nhất trong một ngày, vì vậy trước tiên có thể duyệt tệp một lượt, ghi các thông tin liên quan đến IP truy cập Baidu của ngày đó vào một tệp lớn riêng. Tiếp theo áp dụng phương pháp giống bài trước: đầu tiên băm và ánh xạ các IP, sau đó dùng HashMap để thống kê số lần xuất hiện của các IP trùng lặp, cuối cùng tính ra IP có số lần lặp nhiều nhất.

> Lưu ý: ở đây chỉ cần tìm IP có số lần xuất hiện nhiều nhất, nên không cần dùng heap, chỉ cần dùng trực tiếp một biến max là đủ.

## Tổng kết phương pháp

1. Chia để trị, băm rồi lấy phần dư;
2. Dùng HashMap để thống kê tần suất;
3. Để tìm TopN phần tử **lớn nhất**, dùng **min-heap**; để tìm TopN phần tử **nhỏ nhất**, dùng **max-heap**.
