---
source:
  locale: zh
  slug: redis-cluster
  hash: 'sha256:v1:b2301c4f74a1c7fc4f3acb688789757d2731fdd6e4cde9c6e3039ce149da50fd'
status: machine
translatedAt: '2026-10-14'
---
# Nguyên lý chế độ cụm của Redis

## Câu hỏi phỏng vấn

Bạn có thể giải thích nguyên lý hoạt động của chế độ cụm (cluster) Redis không? Ở chế độ cụm, key của Redis được định vị như thế nào? Có những thuật toán định vị phân tán nào? Bạn có hiểu thuật toán consistent hash không?

## Tâm lý người phỏng vấn

Vài năm trước, nếu Redis muốn chạy nhiều node, mỗi node lưu một phần dữ liệu thì phải **nhờ đến một số middleware**, ví dụ `codis` hoặc `twemproxy`. Với các middleware Redis này, bạn đọc/ghi qua middleware, và middleware chịu trách nhiệm lưu dữ liệu của bạn theo kiểu phân tán trên các instance Redis ở nhiều máy.

Hai năm gần đây Redis không ngừng phát triển, liên tục có phiên bản mới. Chế độ cụm hiện nay của Redis cho phép triển khai nhiều instance Redis trên nhiều máy, mỗi instance lưu một phần dữ liệu; đồng thời mỗi instance master của Redis có thể gắn thêm các instance replica, và tự động đảm bảo rằng nếu instance master sập thì hệ thống sẽ tự chuyển sang instance replica.

Với các phiên bản Redis mới, mọi người đều dùng Redis cluster, tức chế độ cụm được Redis hỗ trợ nguyên bản, nên người phỏng vấn chắc chắn sẽ hỏi dồn bạn một loạt câu về Redis cluster. Nếu bạn chưa dùng Redis cluster thì cũng bình thường, trước đây nhiều người dùng client kiểu codis để hỗ trợ cụm, nhưng ít nhất bạn cũng nên tìm hiểu Redis cluster.

Nếu lượng dữ liệu của bạn nhỏ, chủ yếu phục vụ kịch bản tải đồng thời cao và hiệu năng cao, chẳng hạn bộ nhớ đệm (cache) của bạn chỉ vài GB, thì một máy là đủ, có thể dùng replication: một master nhiều slave, số slave cần bao nhiêu tùy thuộc vào thông lượng đọc yêu cầu; sau đó tự dựng một cụm sentinel để đảm bảo tính sẵn sàng cao của kiến trúc master-slave Redis.

Redis cluster chủ yếu nhắm đến kịch bản **dữ liệu quy mô lớn + tải đồng thời cao + tính sẵn sàng cao**. Redis cluster hỗ trợ N master node, mỗi master node có thể gắn nhiều slave node. Nhờ vậy toàn bộ Redis có thể mở rộng theo chiều ngang. Nếu bạn cần cache lượng dữ liệu lớn hơn thì cứ mở rộng ngang thêm nhiều master node, mỗi master node sẽ chứa được nhiều dữ liệu hơn.

## Phân tích câu trả lời

### Giới thiệu Redis cluster

-   Tự động phân mảnh (shard) dữ liệu, mỗi master chứa một phần dữ liệu
-   Cung cấp hỗ trợ tính sẵn sàng cao tích hợp sẵn, khi một số master không khả dụng thì cụm vẫn tiếp tục hoạt động được

Trong kiến trúc Redis cluster, mỗi Redis phải mở hai số hiệu cổng: một là 6379, cổng còn lại là cổng đó cộng thêm 1w (10000), ví dụ 16379.

Cổng 16379 dùng để giao tiếp giữa các node, tức cluster bus. Giao tiếp qua cluster bus dùng để phát hiện sự cố, cập nhật cấu hình và ủy quyền chuyển đổi dự phòng khi có lỗi. Cluster bus dùng một giao thức nhị phân khác, giao thức `gossip`, để các node trao đổi dữ liệu hiệu quả, tốn ít băng thông mạng và thời gian xử lý hơn.

### Cơ chế giao tiếp nội bộ giữa các node

#### Nguyên lý giao tiếp cơ bản

Có hai cách để duy trì metadata của cụm: tập trung và giao thức Gossip. Các node của Redis cluster giao tiếp với nhau bằng giao thức gossip.

**Tập trung** là lưu metadata của cụm (thông tin node, sự cố, v.v.) tập trung ở một node nào đó. Đại diện tiêu biểu của lưu trữ metadata tập trung trong lĩnh vực dữ liệu lớn là `storm`. Đây là công cụ tính toán thời gian thực phân tán cho dữ liệu lớn, có cấu trúc lưu trữ metadata tập trung, bên dưới dựa vào zookeeper (middleware điều phối phân tán) để lưu trữ và duy trì toàn bộ metadata.

![zookeeper-centralized-storage](asset:high-concurrency/redis-cluster/zookeeper-centralized-storage.png)

Redis duy trì metadata của cụm theo một cách khác, giao thức `gossip`: mọi node đều giữ một bản metadata, khi metadata ở một node nào đó thay đổi thì node đó liên tục gửi metadata cho các node khác để chúng cũng cập nhật metadata.

![Redis-gossip](asset:high-concurrency/redis-cluster/redis-gossip.png)

**Ưu điểm** của kiểu **tập trung** là việc đọc và cập nhật metadata có độ trễ rất thấp: metadata vừa thay đổi là được cập nhật ngay vào kho lưu trữ tập trung, các node khác khi đọc sẽ nhận biết được; **nhược điểm** là toàn bộ áp lực cập nhật metadata đều dồn vào một chỗ, có thể gây áp lực lên kho lưu trữ metadata.

Ưu điểm của gossip là việc cập nhật metadata phân tán, không tập trung một chỗ, các yêu cầu cập nhật lần lượt đổ vào tất cả node, nên giảm được áp lực; nhược điểm là cập nhật metadata có độ trễ, có thể khiến một số thao tác trong cụm bị chậm trễ.

-   Cổng 10000: mỗi node có một cổng chuyên dùng để giao tiếp giữa các node, bằng cổng phục vụ của chính nó + 10000, ví dụ 7001 thì cổng dùng để giao tiếp giữa các node là 17001. Cứ mỗi khoảng thời gian, mỗi node gửi thông điệp `ping` đến vài node khác, đồng thời các node đó nhận được `ping` thì trả về `pong`.

-   Thông tin trao đổi: gồm thông tin sự cố, việc thêm và xóa node, thông tin hash slot, v.v.

#### Giao thức gossip

Giao thức gossip gồm nhiều loại thông điệp, như `ping`, `pong`, `meet`, `fail`, v.v.

-   meet: một node gửi meet cho node mới gia nhập, để node mới tham gia vào cụm, sau đó node mới sẽ bắt đầu giao tiếp với các node khác.

```bash
Redis-trib.rb add-node
```

Thực chất bên trong là gửi một thông điệp gossip meet cho node mới gia nhập, thông báo cho node đó tham gia vào cụm của chúng ta.

-   ping: mỗi node thường xuyên gửi ping cho các node khác, trong đó chứa trạng thái của chính nó và metadata cụm mà nó duy trì, các node trao đổi metadata với nhau qua ping.
-   pong: trả lời ping và meet, chứa trạng thái của chính nó và thông tin khác, cũng dùng để quảng bá thông tin và cập nhật.
-   fail: sau khi một node xác định một node khác bị fail, nó gửi fail cho các node khác, thông báo rằng node nào đó đã sập.

#### Tìm hiểu sâu thông điệp ping

Khi ping phải mang theo một số metadata, nếu quá thường xuyên thì có thể làm tăng gánh nặng cho mạng.

Mỗi node mỗi giây thực hiện 10 lần ping, mỗi lần chọn 5 node khác lâu nhất chưa giao tiếp. Tất nhiên nếu phát hiện độ trễ giao tiếp với một node đạt `cluster_node_timeout / 2` thì gửi ping ngay lập tức, tránh việc trao đổi dữ liệu bị trễ quá lâu, tụt hậu quá lâu. Chẳng hạn hai node đã 10 phút không trao đổi dữ liệu thì toàn cụm rơi vào tình trạng metadata bất nhất nghiêm trọng, sẽ gây ra vấn đề. Vì vậy `cluster_node_timeout` có thể điều chỉnh, nếu đặt khá lớn thì tần suất ping sẽ giảm.

Mỗi lần ping sẽ mang theo thông tin của chính node đó, cùng với thông tin của 1/10 các node khác, gửi đi để trao đổi. Ít nhất chứa thông tin của `3` node khác, nhiều nhất chứa thông tin của `总节点数减 2` (tổng số node trừ 2) node khác.

### Thuật toán định vị phân tán

-   Thuật toán hash (phải xây dựng lại lượng lớn cache)
-   Thuật toán consistent hash (tự động di chuyển cache) + node ảo (tự động cân bằng tải)
-   Thuật toán hash slot của Redis cluster

#### Thuật toán hash

Khi một key đến, trước hết tính giá trị hash, sau đó lấy phần dư theo số node, rồi đưa vào các master node khác nhau. Một khi có master node sập, mọi yêu cầu đến đều được lấy phần dư theo số master node còn lại mới nhất để cố lấy dữ liệu. Điều này khiến **phần lớn yêu cầu đến đều không lấy được cache hợp lệ**, làm một lượng lớn lưu lượng đổ vào cơ sở dữ liệu.

![hash](asset:high-concurrency/redis-cluster/hash.png)

#### Thuật toán consistent hash

Thuật toán consistent hash tổ chức toàn bộ không gian giá trị hash thành một vòng tròn ảo, toàn bộ không gian được tổ chức theo chiều kim đồng hồ, tiếp theo hash từng master node (dùng ip hoặc tên máy chủ của server). Như vậy xác định được vị trí của mỗi node trên vòng hash.

Khi một key đến, trước hết tính giá trị hash và xác định vị trí của dữ liệu trên vòng, từ vị trí đó **"đi" theo chiều kim đồng hồ** dọc vòng, master node đầu tiên gặp phải chính là vị trí của key.

Trong thuật toán consistent hash, nếu một node sập, dữ liệu bị ảnh hưởng chỉ là dữ liệu nằm giữa node đó và node đứng trước nó trên vòng (node đầu tiên gặp khi đi ngược chiều kim đồng hồ), phần còn lại không bị ảnh hưởng. Thêm một node cũng tương tự.

Tuy nhiên, khi có quá ít node, thuật toán consistent hash dễ gây ra vấn đề **điểm nóng cache** do các node phân bố không đều. Để giải quyết vấn đề điểm nóng này, thuật toán consistent hash đưa vào cơ chế node ảo, tức là tính nhiều hash cho mỗi node, mỗi vị trí kết quả tính được đặt một node ảo. Nhờ vậy đạt được việc phân bố dữ liệu đồng đều và cân bằng tải.

![consistent-hashing-algorithm](asset:high-concurrency/redis-cluster/consistent-hashing-algorithm.png)

#### Thuật toán hash slot của Redis cluster

Redis cluster có cố định `16384` hash slot, tính giá trị `CRC16` cho mỗi `key`, sau đó lấy phần dư theo `16384`, sẽ có được hash slot tương ứng của key.

Mỗi master trong Redis cluster đều nắm giữ một phần slot, ví dụ có 3 master thì có thể mỗi master nắm giữ hơn 5000 hash slot. Hash slot giúp việc thêm và gỡ node rất đơn giản: thêm một master thì chuyển một phần hash slot của các master khác sang, bớt một master thì chuyển hash slot của nó sang các master khác. Chi phí di chuyển hash slot rất thấp. Api phía client có thể khiến các dữ liệu chỉ định đi vào cùng một hash slot, thông qua `hash tag`.

Một máy nào đó sập thì hai node còn lại không bị ảnh hưởng. Vì key tìm đến hash slot chứ không phải máy.

![hash-slot](asset:high-concurrency/redis-cluster/hash-slot.png)

### Tính sẵn sàng cao và nguyên lý chuyển đổi master-replica của Redis cluster

Nguyên lý tính sẵn sàng cao của Redis cluster gần như giống với Sentinel.

#### Xác định node sập

Nếu một node cho rằng một node khác sập thì đó là `pfail`, tức **sập chủ quan**. Nếu nhiều node đều cho rằng node khác đã sập thì đó là `fail`, tức **sập khách quan**, gần như giống nguyên lý của Sentinel: sdown, odown.

Trong khoảng `cluster-node-timeout`, nếu một node mãi không trả về `pong` thì bị coi là `pfail`.

Nếu một node cho rằng một node nào đó `pfail`, thì sẽ `ping` cho các node khác qua thông điệp `gossip ping`, nếu **quá nửa** số node đều cho rằng `pfail` thì nó trở thành `fail`.

#### Lọc node replica

Với master node đã sập, chọn một trong tất cả slave node của nó để chuyển thành master node.

Kiểm tra thời gian ngắt kết nối giữa từng slave node và master node, nếu vượt quá `cluster-node-timeout * cluster-slave-validity-factor` thì **không đủ tư cách** chuyển thành `master`.

#### Bầu chọn node replica

Mỗi node replica dựa vào offset dữ liệu mà nó đã sao chép từ master để đặt một thời điểm bầu chọn; node replica có offset càng lớn (sao chép được càng nhiều dữ liệu) thì thời điểm bầu chọn càng sớm, được ưu tiên bầu chọn.

Tất cả master node bắt đầu bỏ phiếu bầu chọn slave, bỏ phiếu cho slave tham gia bầu chọn, nếu phần lớn master node `（N/2 + 1）` đều bỏ phiếu cho một node replica nào đó thì bầu chọn thành công, node replica đó có thể chuyển thành master.

Node replica thực hiện chuyển đổi master-replica, node replica chuyển thành node master.

#### So sánh với Sentinel

Toàn bộ quy trình rất giống với Sentinel, vì vậy có thể nói Redis cluster có chức năng mạnh mẽ, tích hợp trực tiếp chức năng của replication và sentinel.
