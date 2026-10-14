---
source:
  locale: zh
  slug: dubbo-load-balancing
  hash: 'sha256:v1:955dd7ed7a8cd22cf2d8674d37471ff8cbe23d4c1720c113a2142c06e99a20ab'
status: machine
translatedAt: '2026-10-14'
---
# Chiến lược cân bằng tải và chiến lược chịu lỗi cụm của Dubbo

## Câu hỏi phỏng vấn

Dubbo có những chiến lược cân bằng tải và chiến lược chịu lỗi cụm nào? Còn chiến lược proxy động thì sao?

## Tâm lý người phỏng vấn

Tiếp tục hỏi sâu thôi, đây đều là những thứ bắt buộc phải biết khi dùng Dubbo: bạn phải biết nguyên lý cơ bản, biết tuần tự hóa là giao thức gì, còn phải biết khi dùng Dubbo cụ thể thì cân bằng tải thế nào, đạt tính sẵn sàng cao thế nào, proxy động thế nào.

Nói thẳng ra là xem bạn có quen thuộc với Dubbo hay không:

-   Nguyên lý hoạt động của Dubbo: đăng ký dịch vụ, trung tâm đăng ký dịch vụ (service registry), consumer, giao tiếp qua proxy, cân bằng tải;
-   Giao tiếp mạng, tuần tự hóa: giao thức dubbo, kết nối dài, NIO, giao thức tuần tự hóa hessian;
-   Chiến lược cân bằng tải, chiến lược chịu lỗi cụm (cluster), chiến lược proxy động: khi Dubbo chạy thì một số chức năng vận hành ra sao? Làm cân bằng tải thế nào? Làm chịu lỗi cụm thế nào? Sinh proxy động thế nào?
-   Cơ chế SPI của Dubbo: bạn có hiểu cơ chế SPI của Dubbo không? Làm thế nào để mở rộng Dubbo dựa trên cơ chế SPI?

## Phân tích câu trả lời

### Chiến lược cân bằng tải của Dubbo

#### RandomLoadBalance

Theo mặc định, Dubbo dùng RandomLoadBalance, tức là hiện thực cân bằng tải bằng cách gọi **ngẫu nhiên**; có thể **đặt trọng số khác nhau** cho các instance khác nhau của provider, khi đó sẽ cân bằng tải theo trọng số, trọng số càng lớn thì lưu lượng được phân bổ càng cao; thường dùng mặc định này là được.

Ý tưởng của thuật toán rất đơn giản. Giả sử có một nhóm server servers = `[A, B, C]`, trọng số tương ứng của chúng là weights = `[5, 3, 2]`, tổng trọng số là 10. Bây giờ trải các giá trị trọng số này lên một trục tọa độ một chiều, khoảng `[0, 5)` thuộc server A, khoảng `[5, 8)` thuộc server B, khoảng `[8, 10)` thuộc server C. Tiếp theo dùng bộ sinh số ngẫu nhiên sinh ra một số ngẫu nhiên nằm trong khoảng `[0, 10)`, rồi tính xem số ngẫu nhiên này rơi vào khoảng nào. Ví dụ số 3 sẽ rơi vào khoảng tương ứng của server A, lúc này trả về server A là được. Máy có trọng số càng lớn thì khoảng tương ứng trên trục tọa độ càng rộng, do đó số do bộ sinh số ngẫu nhiên sinh ra sẽ có xác suất lớn hơn rơi vào khoảng này. Chỉ cần phân bố của số ngẫu nhiên do bộ sinh số ngẫu nhiên tạo ra tốt, thì sau nhiều lần chọn, tỷ lệ số lần mỗi server được chọn sẽ gần với tỷ lệ trọng số của nó. Ví dụ, sau mười nghìn lần chọn, số lần server A được chọn khoảng 5000 lần, server B khoảng 3000 lần, server C khoảng 2000 lần.

#### RoundRobinLoadBalance

Cái này mặc định là phân phối lưu lượng đều cho từng máy, nhưng nếu hiệu năng của các máy không giống nhau thì dễ khiến máy có hiệu năng kém bị quá tải. Vì vậy lúc này cần điều chỉnh trọng số, để máy có hiệu năng kém nhận trọng số nhỏ hơn một chút, lưu lượng ít hơn một chút.

Lấy một ví dụ.

Xin máy từ bạn vận hành, đôi khi chúng ta may mắn, đúng lúc tài nguyên công ty khá dồi dào, vừa có một loạt máy ảo nóng hổi mới ra lò, cấu hình khá cao: máy 8 nhân + 16G, xin được 2 máy. Một thời gian sau, chúng ta thấy 2 máy hơi không đủ, tôi đi tìm bạn vận hành nói: "anh bạn, anh có thể cho tôi thêm một máy nữa không", nhưng lúc này chỉ còn lại một máy 4 nhân + 8G. Tôi vẫn phải nhận.

Lúc này, có thể đặt trọng số 4 cho hai máy 8 nhân 16G, và đặt trọng số 2 cho 1 máy 4 nhân 8G còn lại.

#### LeastActiveLoadBalance

Trang chính thức giải thích `LeastActiveLoadBalance` là "**cân bằng tải theo số lần gọi đang hoạt động ít nhất**"; số lần gọi đang hoạt động càng nhỏ thì cho thấy nhà cung cấp dịch vụ đó càng hiệu quả, trong một đơn vị thời gian có thể xử lý nhiều yêu cầu hơn, nên lúc này yêu cầu sẽ được ưu tiên phân phối cho nhà cung cấp dịch vụ đó.

Ý tưởng cơ bản của thuật toán cân bằng tải theo số lần hoạt động ít nhất như sau:

Mỗi nhà cung cấp dịch vụ tương ứng với một số lần hoạt động `active`. Ban đầu, `active` của tất cả nhà cung cấp dịch vụ đều bằng 0. Mỗi khi nhận được một yêu cầu, `active` của nhà cung cấp dịch vụ tương ứng sẽ cộng thêm 1, sau khi xử lý xong yêu cầu thì `active` giảm đi 1. Vì vậy nếu nhà cung cấp dịch vụ có hiệu năng tốt, xử lý yêu cầu càng hiệu quả thì `active` cũng giảm càng nhanh. Do đó có thể ưu tiên phân phối yêu cầu cho nhà cung cấp dịch vụ như vậy.

Tất nhiên, ngoài số lần hoạt động ít nhất, `LeastActiveLoadBalance` còn đưa thêm giá trị trọng số vào khi hiện thực. Vì vậy nói chính xác, `LeastActiveLoadBalance` được hiện thực dựa trên thuật toán số lần hoạt động ít nhất có trọng số.

#### ConsistentHashLoadBalance

Thuật toán Hash nhất quán: các yêu cầu có cùng tham số nhất định được phân phối tới cùng một provider; khi provider sập, lưu lượng còn lại sẽ được phân phối đều dựa trên các nút ảo, dao động sẽ không quá lớn. **Nếu thứ bạn cần không phải là cân bằng tải ngẫu nhiên** mà là muốn một loại yêu cầu đều đến cùng một nút, thì dùng chiến lược Hash nhất quán này.

> Về mô tả chi tiết hơn của chiến lược cân bằng tải Dubbo, có thể xem trang chính thức https://dubbo.apache.org/zh/docs/advanced/loadbalance .

### Chiến lược chịu lỗi cụm của Dubbo

#### Chế độ Failover Cluster

Tự động chuyển đổi khi thất bại, tự động thử lại trên máy khác, **mặc định** là chế độ này, thường gặp ở thao tác đọc. (Thất bại thì thử lại trên máy khác)

Có thể cấu hình số lần thử lại bằng các cách sau:

```xml
<dubbo:service retries="2" />
```

Hoặc

```xml
<dubbo:reference retries="2" />
```

Hoặc

```xml
<dubbo:reference>
    <dubbo:method name="findFoo" retries="2" />
</dubbo:reference>
```

#### Chế độ Failfast Cluster

Một lần gọi thất bại là thất bại ngay lập tức, thường gặp ở thao tác ghi không idempotent, ví dụ thêm một bản ghi (gọi thất bại là thất bại ngay)

#### Chế độ Failsafe Cluster

Khi xảy ra ngoại lệ thì bỏ qua, thường dùng cho các lời gọi API không quan trọng, ví dụ ghi log.

Ví dụ cấu hình như sau:

```xml
<dubbo:service cluster="failsafe" />
```

Hoặc

```xml
<dubbo:reference cluster="failsafe" />
```

#### Chế độ Failback Cluster

Khi thất bại thì tự động ghi lại yêu cầu ở nền, rồi gửi lại theo định kỳ, khá phù hợp với việc ghi vào hàng đợi thông điệp (message queue) kiểu như vậy.

#### Chế độ Forking Cluster

**Gọi song song** nhiều provider, chỉ cần một cái thành công là trả về ngay. Thường dùng cho thao tác đọc có yêu cầu tính thời gian thực khá cao, nhưng sẽ lãng phí nhiều tài nguyên dịch vụ hơn, có thể đặt số song song tối đa bằng `forks="2"`.

#### Chế độ Broadcast Cluster

Gọi lần lượt tất cả provider. Bất kỳ provider nào gặp lỗi thì báo lỗi (hỗ trợ từ phiên bản `2.1.0`). Thường dùng để thông báo cho tất cả nhà cung cấp dịch vụ cập nhật thông tin tài nguyên cục bộ như bộ nhớ đệm hoặc log.

> Về mô tả chi tiết hơn của chiến lược chịu lỗi cụm Dubbo, có thể xem trang chính thức https://dubbo.apache.org/zh/docs/advanced/fault-tolerent-strategy .

### Chiến lược proxy động của Dubbo

Mặc định dùng javassist để sinh bytecode động, tạo lớp proxy. Nhưng có thể cấu hình chiến lược proxy động của riêng mình qua cơ chế mở rộng spi.
