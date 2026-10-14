---
source:
  locale: zh
  slug: redis-data-types
  hash: 'sha256:v1:f49becd73105f36799846d540b7f98a2ae9270343546d805a2852ef6ba87b492'
status: machine
translatedAt: '2026-10-14'
---
# Các kiểu dữ liệu của Redis và tình huống sử dụng

## Câu hỏi phỏng vấn

Redis có những kiểu dữ liệu nào? Mỗi kiểu phù hợp dùng trong những tình huống nào?

## Tâm lý người phỏng vấn

Trừ khi người phỏng vấn xem hồ sơ thấy bạn là người khá sơ cấp với dưới 3 năm kinh nghiệm, có thể chưa nghiên cứu sâu về kỹ thuật, thì họ mới hỏi loại câu này. Nếu không, trong thời gian phỏng vấn quý báu, người phỏng vấn thật sự không muốn hỏi nhiều.

Thực ra hỏi câu này chủ yếu có hai lý do:

-   Xem bạn rốt cuộc có hiểu toàn diện Redis có những chức năng gì, thường dùng thế nào, tình huống nào dùng gì hay không, sợ rằng bạn chỉ biết thao tác KV đơn giản nhất;
-   Xem bạn đã dùng Redis như thế nào trong các dự án thực tế.

Nếu bạn trả lời không tốt, không nói ra được vài kiểu dữ liệu, cũng không nói được tình huống nào, thì bạn xong rồi, ấn tượng của người phỏng vấn về bạn chắc chắn không tốt, họ sẽ cho rằng bình thường bạn chỉ làm set và get đơn giản.

## Phân tích câu trả lời

Redis chủ yếu có các kiểu dữ liệu sau:

-   Strings
-   Hashes
-   Lists
-   Sets
-   Sorted Sets

> Ngoài 5 kiểu dữ liệu này, Redis còn có Bitmaps, HyperLogLogs, Streams, v.v.

### Strings

Đây là kiểu đơn giản nhất, chỉ là set và get thông thường, dùng làm bộ nhớ đệm (cache) KV đơn giản.

```bash
set college szu
```

### Hashes

Đây là một cấu trúc tương tự map, thường dùng để lưu dữ liệu có cấu trúc, ví dụ một đối tượng (với điều kiện là **đối tượng này không lồng đối tượng khác**) vào bộ nhớ đệm Redis, sau đó mỗi lần đọc ghi bộ nhớ đệm, có thể chỉ thao tác trên **một trường nào đó** trong hash.

```bash
hset person name bingo
hset person age 20
hset person id 1
hget person name
```

```json
(person = {
  "name": "bingo",
  "age": 20,
  "id": 1
})
```

### Lists

Lists là danh sách có thứ tự, có thể làm ra rất nhiều trò.

Ví dụ có thể dùng list để lưu các cấu trúc dữ liệu dạng danh sách, như danh sách người theo dõi, danh sách bình luận của bài viết, v.v.

Ví dụ có thể dùng lệnh lrange để đọc các phần tử trong một khoảng đóng nào đó, có thể dựa vào list để cài đặt truy vấn phân trang, đây là một chức năng rất tuyệt, dựa trên Redis cài đặt phân trang hiệu năng cao đơn giản, có thể làm kiểu như Weibo kéo xuống để phân trang liên tục, hiệu năng cao, cứ từng trang một mà đi.

```bash
# 0 là vị trí bắt đầu, -1 là vị trí kết thúc, khi vị trí kết thúc là -1 nghĩa là vị trí cuối cùng của danh sách, tức là xem tất cả.
lrange mylist 0 -1
```

Ví dụ có thể làm một hàng đợi thông điệp đơn giản, nhét vào từ đầu list, lấy ra ở đuôi list.

```bash
lpush mylist 1
lpush mylist 2
lpush mylist 3 4 5

# 1
rpop mylist
```

### Sets

Sets là tập hợp không có thứ tự, tự động loại bỏ trùng lặp.

Có thể trực tiếp dựa trên set để ném dữ liệu cần loại trùng của hệ thống vào, tự động được loại trùng. Nếu bạn cần loại trùng toàn cục nhanh cho một số dữ liệu, tất nhiên bạn cũng có thể dùng HashSet trong bộ nhớ jvm để loại trùng, nhưng nếu hệ thống của bạn triển khai trên nhiều máy thì sao? Phải dựa vào Redis để loại trùng set toàn cục.

Có thể dựa trên set để làm các thao tác giao, hợp, hiệu. Ví dụ phép giao, có thể lấy giao của danh sách người theo dõi của hai người để xem bạn chung của hai người là ai, đúng không?

Đặt người theo dõi của hai tài khoản lớn vào hai set, rồi lấy giao của hai set.

```bash
#-------Thao tác trên một set-------
# Thêm phần tử
sadd mySet 1

# Xem tất cả phần tử
smembers mySet

# Kiểm tra có chứa một giá trị hay không
sismember mySet 3

# Xóa một/một số phần tử
srem mySet 1
srem mySet 2 4

# Xem số lượng phần tử
scard mySet

# Xóa ngẫu nhiên một phần tử
spop mySet

#-------Thao tác trên nhiều set-------
# Di chuyển phần tử của một set sang set khác
smove yourSet mySet 2

# Tính giao của hai set
sinter yourSet mySet

# Tính hợp của hai set
sunion yourSet mySet

# Tính các phần tử có trong yourSet mà không có trong mySet
sdiff yourSet mySet
```

### Sorted Sets

Sorted Sets là set có sắp xếp, loại trùng nhưng có thể sắp xếp, khi ghi vào thì cho một điểm số, tự động sắp xếp theo điểm số.

```bash
zadd board 85 zhangsan
zadd board 72 lisi
zadd board 96 wangwu
zadd board 63 zhaoliu

# Lấy 3 người dùng đứng đầu bảng xếp hạng (mặc định là tăng dần, nên cần rev để chuyển thành giảm dần)
zrevrange board 0 3

# Lấy thứ hạng của một người dùng
zrank board zhaoliu
```
