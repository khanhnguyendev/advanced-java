---
source:
  locale: zh
  slug: redis-master-slave
  hash: 'sha256:v1:6f8efdf3fcb4f9e94b9e14246a636789e8b62e089d8c1473ba37b1adfd80c0bc'
status: machine
translatedAt: '2026-10-14'
---
# Kiến trúc master/replica của Redis

Redis trên một máy có thể chịu QPS vào khoảng từ hơn chục nghìn đến vài chục nghìn. Đối với bộ nhớ đệm (cache), thường dùng để chịu **tải đọc đồng thời cao (high concurrency)**. Vì vậy kiến trúc được làm thành kiến trúc master/replica (master-slave), một master nhiều replica: master phụ trách ghi và sao chép dữ liệu sang các node slave khác, các node replica phụ trách đọc. **Tất cả request đọc đều đi qua node replica**. Như vậy cũng có thể dễ dàng mở rộng ngang, **chịu tải đọc đồng thời cao**.

![Redis-master-slave](asset:high-concurrency/redis-master-slave/redis-master-slave.png)

Redis replication -> kiến trúc master/replica -> tách đọc/ghi -> mở rộng ngang để chịu tải đọc đồng thời cao

## Cơ chế cốt lõi của Redis replication

-   Redis sao chép dữ liệu sang các node slave theo **cách bất đồng bộ**, tuy nhiên từ Redis2.8, slave node sẽ định kỳ xác nhận lượng dữ liệu mà nó sao chép mỗi lần;
-   Một master node có thể cấu hình nhiều slave node;
-   Slave node cũng có thể kết nối với các slave node khác;
-   Khi slave node thực hiện sao chép, sẽ không block hoạt động bình thường của master node;
-   Khi slave node thực hiện sao chép, cũng không block các thao tác truy vấn tới chính nó, nó sẽ dùng tập dữ liệu cũ để cung cấp dịch vụ; nhưng khi sao chép xong, cần xóa tập dữ liệu cũ, nạp tập dữ liệu mới, lúc này sẽ tạm dừng cung cấp dịch vụ ra bên ngoài;
-   Slave node chủ yếu dùng để mở rộng ngang, tách đọc/ghi, các slave node được mở rộng có thể nâng cao thông lượng đọc.

Chú ý, nếu dùng kiến trúc master/replica thì khuyến nghị bắt buộc phải **bật** [lưu trữ bền vững (persistence)](doc:advanced-java/high-concurrency/redis-persistence) cho master node, không khuyến nghị dùng slave node làm bản sao lưu nóng cho dữ liệu của master node, vì như vậy nếu bạn tắt lưu trữ bền vững của master, có thể khi master sập rồi khởi động lại thì dữ liệu rỗng, rồi chỉ cần qua một lần sao chép, dữ liệu của slave node cũng mất theo.

Ngoài ra, các phương án sao lưu khác nhau của master cũng cần được thực hiện. Phòng khi toàn bộ tệp cục bộ bị mất, hãy chọn một bản rdb từ bản sao lưu để khôi phục master, như vậy mới **đảm bảo khi khởi động là có dữ liệu**. Ngay cả khi dùng [cơ chế tính sẵn sàng cao](doc:advanced-java/high-concurrency/redis-sentinel) sẽ giải thích sau đó, slave node có thể tự động tiếp quản master node, nhưng cũng có thể sentinel chưa kịp phát hiện master failure thì master node đã tự động khởi động lại, vẫn có thể khiến dữ liệu của tất cả slave node ở trên bị xóa sạch.

## Nguyên lý cốt lõi của sao chép master/replica trong Redis

Khi khởi động một slave node, nó sẽ gửi một lệnh `PSYNC` đến master node.

Nếu đây là lần đầu slave node kết nối tới master node thì sẽ kích hoạt một lần sao chép toàn bộ `full resynchronization` . Lúc này master sẽ khởi động một luồng nền, bắt đầu tạo một tệp snapshot `RDB` , đồng thời còn lưu đệm trong bộ nhớ tất cả các lệnh ghi mới nhận được từ client. Sau khi tệp `RDB` được tạo xong, master sẽ gửi `RDB` này cho slave, slave sẽ **ghi vào đĩa cục bộ trước, rồi mới nạp từ đĩa cục bộ vào bộ nhớ**, tiếp đó master sẽ gửi các lệnh ghi được lưu đệm trong bộ nhớ cho slave, slave cũng sẽ đồng bộ những dữ liệu này. Nếu slave node bị sự cố mạng với master node, bị ngắt kết nối thì sẽ tự động kết nối lại, sau khi kết nối, master node chỉ sao chép cho slave phần dữ liệu còn thiếu.

![Redis-master-slave-replication](asset:high-concurrency/redis-master-slave/redis-master-slave-replication.png)

### Tiếp tục sao chép từ điểm dừng trong sao chép master/replica

Từ Redis2.8, đã hỗ trợ tiếp tục sao chép từ điểm dừng trong sao chép master/replica: nếu trong quá trình sao chép, kết nối mạng bị đứt thì có thể tiếp tục sao chép từ chỗ lần trước đã dừng, chứ không phải sao chép lại từ đầu.

Master node sẽ duy trì một backlog trong bộ nhớ, master và slave đều lưu một replica offset và một master run id, offset được lưu trong backlog. Nếu kết nối mạng giữa master và slave bị đứt, slave sẽ yêu cầu master tiếp tục sao chép từ replica offset lần trước, nếu không tìm thấy offset tương ứng thì sẽ thực hiện một lần `resynchronization` .

> Nếu định vị master node theo host+ip thì không đáng tin cậy, nếu master node khởi động lại hoặc dữ liệu có thay đổi thì slave node nên phân biệt theo run id khác nhau.

### Sao chép không qua đĩa

Master tạo `RDB` trực tiếp trong bộ nhớ, rồi gửi cho slave, không ghi xuống đĩa cục bộ của mình nữa. Chỉ cần bật `repl-diskless-sync yes` trong tệp cấu hình.

```bash
repl-diskless-sync yes

# Chờ 5s rồi mới bắt đầu sao chép, vì phải đợi thêm nhiều slave kết nối lại
repl-diskless-sync-delay 5
```

### Xử lý key hết hạn

Slave không tự làm hết hạn key, chỉ chờ master làm hết hạn key. Nếu master làm hết hạn một key, hoặc loại bỏ một key qua LRU, thì sẽ mô phỏng một lệnh del gửi cho slave.

## Quy trình đầy đủ của sao chép

Khi slave node khởi động, nó sẽ lưu thông tin của master node ở cục bộ, gồm `host` và `ip` của master node, nhưng quy trình sao chép chưa bắt đầu.

Bên trong slave node có một tác vụ định kỳ, mỗi giây kiểm tra xem có master node mới cần kết nối và sao chép hay không, nếu phát hiện thì thiết lập kết nối mạng socket với master node. Sau đó slave node gửi lệnh `ping` cho master node. Nếu master có đặt requirepass thì slave node phải gửi mật khẩu masterauth sang để xác thực. Master node **thực hiện sao chép toàn bộ lần đầu**, gửi tất cả dữ liệu cho slave node. Còn sau đó, master node liên tục sao chép các lệnh ghi cho slave node một cách bất đồng bộ.

![Redis-master-slave-replication-detail](asset:high-concurrency/redis-master-slave/redis-master-slave-replication-detail.png)

### Sao chép toàn bộ

-   Master thực hiện bgsave, tạo một tệp snapshot rdb ở cục bộ.
-   Master node gửi tệp snapshot rdb cho slave node, nếu thời gian sao chép rdb vượt quá 60 giây (repl-timeout) thì slave node sẽ cho rằng sao chép thất bại, có thể điều chỉnh tham số này lớn hơn một cách phù hợp (với máy dùng card mạng gigabit, thường truyền 100MB mỗi giây, tệp 6G rất có thể vượt quá 60s)
-   Khi master node tạo rdb, sẽ lưu đệm tất cả các lệnh ghi mới trong bộ nhớ, sau khi slave node lưu xong rdb thì mới sao chép các lệnh ghi mới cho slave node.
-   Nếu trong thời gian sao chép, vùng đệm bộ nhớ liên tục tiêu thụ vượt quá 64MB, hoặc một lần vượt quá 256MB thì dừng sao chép, sao chép thất bại.

```bash
client-output-buffer-limit slave 256MB 64MB 60
```

-   Sau khi slave node nhận được rdb, xóa sạch dữ liệu cũ của mình, rồi nạp lại rdb vào bộ nhớ của mình. Chú ý, trước khi xóa dữ liệu cũ, slave node vẫn **dựa trên phiên bản dữ liệu cũ** để cung cấp dịch vụ ra bên ngoài.
-   Nếu slave node bật AOF thì sẽ thực hiện ngay BGREWRITEAOF, ghi lại AOF.

### Sao chép gia tăng

-   Nếu trong quá trình sao chép toàn bộ, kết nối mạng master-slave bị đứt, thì khi slave kết nối lại master sẽ kích hoạt sao chép gia tăng.
-   Master lấy trực tiếp từ backlog của mình phần dữ liệu bị mất, gửi cho slave node, mặc định backlog là 1MB.
-   Master dựa vào offset trong psync mà slave gửi để lấy dữ liệu từ backlog.

### heartbeat

Các node master và replica đều gửi thông tin heartbeat cho nhau.

Master mặc định cứ mỗi 10 giây gửi một heartbeat, slave node cứ mỗi 1 giây gửi một heartbeat.

### Sao chép bất đồng bộ

Mỗi khi master nhận được lệnh ghi, trước hết ghi dữ liệu ở bên trong, sau đó gửi bất đồng bộ cho slave node.

## Làm thế nào để Redis đạt được tính sẵn sàng cao

Nếu hệ thống trong 365 ngày có 99.99% thời gian đều cung cấp dịch vụ ra bên ngoài một cách trơn tru, thì nói hệ thống có tính sẵn sàng cao.

Một slave sập thì không ảnh hưởng đến tính sẵn sàng, vì còn các slave khác đang cung cấp dịch vụ truy vấn ra bên ngoài với cùng dữ liệu.

Nhưng nếu master node sập thì sao? Không ghi dữ liệu được nữa, khi ghi bộ nhớ đệm thì tất cả đều thất bại. Slave node còn có tác dụng gì, không còn master sao chép dữ liệu cho chúng, hệ thống coi như không khả dụng.

Kiến trúc tính sẵn sàng cao của Redis gọi là `failover` **chuyển đổi dự phòng**, cũng có thể gọi là chuyển đổi master/replica.

Quá trình master node tự động được phát hiện khi gặp sự cố, và tự động chuyển một slave node nào đó thành master node, gọi là chuyển đổi master/replica. Quá trình này thực hiện tính sẵn sàng cao trong kiến trúc master/replica của Redis.

Phần sau sẽ giải thích chi tiết [tính sẵn sàng cao của Redis dựa trên Sentinel](doc:advanced-java/high-concurrency/redis-sentinel).
