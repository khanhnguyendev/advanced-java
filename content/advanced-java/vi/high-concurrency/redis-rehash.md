---
source:
  locale: zh
  slug: redis-rehash
  hash: 'sha256:v1:c562d354b5f2583dfd636785e4de4bbee0a12abf2ba29396ee232d17be3102f3'
status: machine
translatedAt: '2026-10-14'
---
# Quá trình rehash của Redis

## Câu hỏi phỏng vấn

Bạn có tìm hiểu về quá trình rehash của Redis không?

## Tâm lý người phỏng vấn

Kiến thức này được xem là điểm phỏng vấn khá ít gặp trong redis, nhưng khi bạn giới thiệu quá trình rehash của HashMap hoặc ConcurrentHashMap, bạn có thể chủ động nhắc với người phỏng vấn rằng bạn không chỉ hiểu những thứ đó, mà còn hiểu quá trình rehash trong Redis.

Redis nổi tiếng với tốc độ nhanh, hiệu năng tốt, chúng ta biết dung lượng ban đầu của Redis là có hạn, khi dung lượng không đủ thì cần mở rộng, vậy cách mở rộng là gì? Chuyển toàn bộ dữ liệu trong một lần sao? Vậy khi lượng dữ liệu lên đến hàng chục triệu, hàng trăm triệu, điều này chắc chắn sẽ chặn việc thực thi lệnh của Redis. Vì vậy rất cần tìm hiểu quá trình rehash trong Redis.

## Phân tích câu trả lời

Như mọi người đều biết, Redis chủ yếu dùng để lưu trữ cặp khóa-giá trị (`Key-Value Pair`), cách lưu trữ cặp khóa-giá trị được hiện thực bằng dictionary (từ điển), còn tầng dưới của dictionary trong Redis lại được hiện thực qua bảng băm (hash table). Các node trong bảng băm lưu các cặp khóa-giá trị của dictionary. Tương tự HashMap trong Java, ánh xạ Key đến vị trí node của bảng băm thông qua hàm băm.

Cấu trúc dữ liệu của dictionary trong Redis như sau:

```c
// Cấu trúc dữ liệu tương ứng của dictionary, cấu trúc của bảng hash có thể tham khảo mã nguồn redis, ở đây không mô tả
typedef struct dict {
    dictType *type;  // Kiểu dictionary
    void *privdata;  // Dữ liệu riêng
    dictht ht[2];    // 2 bảng băm, đây cũng là cấu trúc dữ liệu quan trọng để thực hiện rehash, từ đây cũng thấy tầng dưới của dictionary được hiện thực bằng bảng băm.
    long rehashidx;   // Cờ quan trọng của quá trình rehash, giá trị -1 nghĩa là rehash chưa diễn ra
    int iterators;   //  Số iterator đang lặp hiện tại
} dict;
```

Khi mở rộng hoặc thu hẹp bảng băm, chương trình cần rehash tất cả các cặp khóa-giá trị mà bảng băm hiện có vào bảng băm mới, quá trình cụ thể như sau:

### 1. Cấp phát không gian cho bảng băm dự phòng của dictionary.

Nếu thực hiện thao tác mở rộng, thì kích thước bảng băm dự phòng là 2<sup>n</sup> (lũy thừa n của 2) đầu tiên lớn hơn hoặc bằng số cặp khóa-giá trị của bảng băm cần mở rộng *2; [`5*2=10,` nên dung lượng bảng băm dự phòng là 2<sup>n</sup> đầu tiên lớn hơn 10, tức 16]

Nếu thực hiện thao tác thu hẹp, thì kích thước bảng băm dự phòng là 2<sup>n</sup> đầu tiên lớn hơn hoặc bằng số cặp khóa-giá trị (`ht[0] .used`) của bảng băm cần mở rộng.

### 2. rehash tiến dần

Khi lượng dữ liệu rất lớn (hàng chục triệu, hàng trăm triệu), quá trình rehash không được hoàn thành trong một lần, mà được hoàn thành **một cách tiến dần**. Lợi ích của **rehash tiến dần** là tránh gây ảnh hưởng đến máy chủ.

Bản chất của rehash tiến dần:

1. Nhờ rehashidx, chia đều công việc tính toán cần thiết để rehash các cặp khóa-giá trị lên từng thao tác thêm, xóa, tìm kiếm và cập nhật của dictionary, nhờ đó tránh được khối lượng tính toán khổng lồ do rehash tập trung gây ra.
2. Trong thời gian rehash đang diễn ra, mỗi lần thực hiện thao tác thêm, xóa, tìm kiếm hoặc cập nhật trên dictionary, ngoài việc thực hiện thao tác được chỉ định, chương trình còn tiện thể rehash tất cả các cặp khóa-giá trị trên chỉ mục rehashidx của bảng băm gốc sang bảng băm dự phòng; khi công việc rehash hoàn tất, chương trình tăng giá trị của thuộc tính rehashidx thêm 1.
