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

Hiện có dữ liệu log quy mô lớn được lưu trong một tệp cực lớn, tệp này không thể đọc trực tiếp vào bộ nhớ, yêu cầu trích xuất từ đó IP có số lần truy cập Baidu nhiều nhất trong một ngày nào đó.

## Hướng giải

Bài này chỉ quan tâm đến IP truy cập Baidu nhiều nhất trong một ngày, do đó có thể trước hết duyệt tệp một lần, ghi thông tin liên quan của các IP truy cập Baidu trong ngày đó vào một tệp lớn riêng. Tiếp theo dùng phương pháp giống bài trước, đại khái là trước hết ánh xạ băm các IP, sau đó dùng HashMap thống kê số lần xuất hiện của các IP lặp lại, cuối cùng tính ra IP có số lần xuất hiện nhiều nhất.

> Lưu ý: ở đây chỉ cần tìm IP có số lần xuất hiện nhiều nhất, có thể không cần dùng heap, chỉ cần dùng trực tiếp một biến max là đủ.

## Tổng kết phương pháp

1. Chia để trị, băm rồi lấy phần dư;
2. Dùng HashMap để thống kê tần suất;
3. Tìm TopN phần tử **lớn nhất** thì dùng **min-heap**; tìm TopN phần tử **nhỏ nhất** thì dùng **max-heap**.
