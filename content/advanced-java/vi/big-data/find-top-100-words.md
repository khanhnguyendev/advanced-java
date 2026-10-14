---
source:
  locale: zh
  slug: find-top-100-words
  hash: 'sha256:v1:45434b898716957f86e466f849239c3f736f65aeca9d2acdc750035a8ede494e'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để tìm các từ có tần suất cao từ lượng dữ liệu lớn?

## Mô tả đề bài

Có một tệp 1GB, mỗi dòng trong tệp là một từ, kích thước mỗi từ không quá 16B, giới hạn bộ nhớ là 1MB, yêu cầu trả về 100 từ có tần suất cao nhất (Top 100).

## Hướng giải

Do giới hạn bộ nhớ, ta vẫn không thể đọc toàn bộ các từ của tệp lớn vào bộ nhớ một lần. Vì vậy, tương tự có thể dùng **chiến lược chia để trị**: phân rã một tệp lớn thành nhiều tệp nhỏ, đảm bảo kích thước mỗi tệp nhỏ hơn 1MB, rồi đọc trực tiếp từng tệp nhỏ vào bộ nhớ để xử lý.

**Ý tưởng như sau**:

Trước hết duyệt tệp lớn, với mỗi từ x duyệt được, thực hiện `hash(x) % 5000`, lưu các từ có kết quả là i vào tệp a<sub>i</sub>. Sau khi duyệt xong, ta thu được 5000 tệp nhỏ. Kích thước mỗi tệp nhỏ khoảng 200KB. Nếu tệp nhỏ nào vẫn có kích thước vượt quá 1MB thì tiếp tục phân rã bằng cách tương tự.

Tiếp theo thống kê 100 từ có tần suất cao nhất trong từng tệp nhỏ. Cách đơn giản nhất là dùng HashMap, trong đó key là từ, value là tần suất xuất hiện của từ đó. Cách làm cụ thể: với từ x duyệt được, nếu chưa có trong map thì thực hiện `map.put(x, 1)` ; nếu đã có thì thực hiện `map.put(x, map.get(x)+1)` , tăng tần suất của từ đó thêm 1.

Ở trên ta đã thống kê tần suất xuất hiện của các từ trong từng tệp nhỏ. Tiếp theo, ta có thể duy trì một **min-heap** để tìm ra 100 từ có tần suất cao nhất trong tất cả các từ. Cách làm cụ thể: lần lượt duyệt từng tệp nhỏ, xây dựng một **min-heap** có kích thước 100. Nếu số lần xuất hiện của từ duyệt được lớn hơn số lần xuất hiện của từ ở đỉnh heap thì thay từ ở đỉnh heap bằng từ mới, rồi điều chỉnh lại thành **min-heap**; sau khi duyệt xong, các từ trong min-heap chính là 100 từ có tần suất cao nhất.

## Tổng kết phương pháp

1. Chia để trị, băm rồi lấy phần dư;
2. Dùng HashMap để thống kê tần suất;
3. Tìm TopN **lớn nhất** thì dùng **min-heap**; tìm TopN **nhỏ nhất** thì dùng **max-heap**.
