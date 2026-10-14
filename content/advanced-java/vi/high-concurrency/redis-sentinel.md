---
source:
  locale: zh
  slug: redis-sentinel
  hash: 'sha256:v1:c9a7e6e2f653765f345b4f6fcdbbc76277a7fea000331c8202a7064eb29f6085'
status: machine
translatedAt: '2026-10-14'
---
# Cụm Sentinel của Redis đạt tính sẵn sàng cao

## Giới thiệu về Sentinel

sentinel, tên tiếng Trung là 哨兵. Sentinel là một thành phần rất quan trọng trong kiến trúc cụm (cluster) Redis, chủ yếu có các chức năng sau:

-   Giám sát cụm: chịu trách nhiệm giám sát tiến trình master và slave của Redis có hoạt động bình thường hay không.
-   Thông báo: nếu một instance Redis nào đó gặp sự cố, Sentinel chịu trách nhiệm gửi thông điệp làm cảnh báo thông báo cho quản trị viên.
-   Chuyển đổi dự phòng (failover): nếu master node sập, sẽ tự động chuyển sang slave node.
-   Trung tâm cấu hình: nếu chuyển đổi dự phòng xảy ra, thông báo cho client địa chỉ master mới.

Sentinel dùng để đạt tính sẵn sàng cao cho cụm Redis, bản thân nó cũng là phân tán, chạy như một cụm Sentinel và phối hợp làm việc với nhau.

-   Khi chuyển đổi dự phòng, để xác định một master node có sập hay không, cần phần lớn các Sentinel đồng ý, liên quan đến vấn đề bầu chọn phân tán.
-   Ngay cả khi một số node Sentinel sập, cụm Sentinel vẫn hoạt động bình thường, vì nếu một hệ thống chuyển đổi dự phòng, vốn là thành phần quan trọng của cơ chế tính sẵn sàng cao, mà bản thân lại là điểm đơn (single point) thì thật tệ hại.

## Kiến thức cốt lõi về Sentinel

-   Sentinel cần ít nhất 3 instance để đảm bảo sự vững chắc của chính nó.
-   Kiến trúc triển khai Sentinel + Redis master/replica (master-slave) **không đảm bảo mất dữ liệu bằng không**, chỉ đảm bảo được tính sẵn sàng cao của cụm Redis.
-   Với kiến trúc triển khai phức tạp như Sentinel + Redis master/replica, cố gắng kiểm thử và diễn tập đầy đủ ở cả môi trường test và môi trường production.

Cụm Sentinel phải triển khai trên 2 node trở lên, nếu cụm Sentinel chỉ triển khai 2 instance Sentinel thì quorum = 1.

```
+----+         +----+
| M1 |---------| R1 |
| S1 |         | S2 |
+----+         +----+
```

Cấu hình `quorum=1` , nếu master sập, chỉ cần 1 trong s1 và s2 cho rằng master sập là có thể chuyển đổi, đồng thời s1 và s2 sẽ bầu ra một Sentinel để thực hiện chuyển đổi dự phòng. Nhưng đồng thời lúc này cần majority, tức là đa số Sentinel đều đang chạy.

```
2 Sentinel, majority=2
3 Sentinel, majority=2
4 Sentinel, majority=2
5 Sentinel, majority=3
...
```

Nếu lúc này chỉ có tiến trình M1 sập, Sentinel s1 chạy bình thường thì chuyển đổi dự phòng là OK. Nhưng nếu cả máy đang chạy M1 và S1 sập, thì Sentinel chỉ còn 1, lúc này không có majority để cho phép thực hiện chuyển đổi dự phòng, tuy máy còn lại có một R1 nhưng chuyển đổi dự phòng sẽ không được thực hiện.

Cụm Sentinel 3 node kinh điển như sau:

```
       +----+
       | M1 |
       | S1 |
       +----+
          |
+----+    |    +----+
| R2 |----+----| R3 |
| S2 |         | S3 |
+----+         +----+
```

Cấu hình `quorum=2` , nếu máy chứa M1 sập, thì trong ba Sentinel còn lại 2, S2 và S3 có thể nhất trí cho rằng master sập, rồi bầu ra một Sentinel để thực hiện chuyển đổi dự phòng, đồng thời majority của 3 Sentinel là 2, nên 2 Sentinel còn lại đang chạy thì có thể cho phép thực hiện chuyển đổi dự phòng.

## Vấn đề mất dữ liệu khi Sentinel chuyển đổi master/replica trong Redis

### Hai trường hợp dẫn đến mất dữ liệu

Quá trình chuyển đổi master/replica có thể dẫn đến mất dữ liệu:

-   Mất dữ liệu do sao chép bất đồng bộ

Vì sao chép master->slave là bất đồng bộ, nên có thể một phần dữ liệu chưa kịp sao chép sang slave thì master đã sập, lúc này phần dữ liệu đó bị mất.

![async-replication-data-lose-case](asset:high-concurrency/redis-sentinel/async-replication-data-lose-case.png)

-   Mất dữ liệu do split-brain

Split-brain (não tách), nghĩa là máy chứa một master nào đó đột nhiên **tách khỏi mạng bình thường**, không kết nối được với các máy slave khác, nhưng thực tế master vẫn đang chạy. Lúc này Sentinel có thể sẽ **cho rằng** master sập, rồi mở bầu chọn, chuyển các slave khác thành master. Lúc này, trong cụm sẽ có hai master, đó chính là cái gọi là **split-brain**.

Lúc này tuy một slave nào đó đã được chuyển thành master, nhưng có thể client chưa kịp chuyển sang master mới, vẫn tiếp tục ghi dữ liệu vào master cũ. Vì vậy khi master cũ phục hồi trở lại, nó sẽ được gắn vào master mới làm một slave, dữ liệu của nó sẽ bị xóa sạch, sao chép lại dữ liệu từ master mới. Còn master mới không có dữ liệu mà client ghi vào về sau, do đó phần dữ liệu này cũng bị mất.

![Redis-cluster-split-brain](asset:high-concurrency/redis-sentinel/redis-cluster-split-brain.png)

### Giải pháp cho vấn đề mất dữ liệu

Thực hiện cấu hình như sau:

```bash
min-slaves-to-write 1
min-slaves-max-lag 10
```

Nghĩa là yêu cầu có ít nhất 1 slave, độ trễ sao chép và đồng bộ dữ liệu không được vượt quá 10 giây.

Nếu một khi độ trễ sao chép và đồng bộ dữ liệu của tất cả slave đều vượt quá 10 giây, thì lúc này master sẽ không nhận bất kỳ request nào nữa.

-   Giảm mất dữ liệu do sao chép bất đồng bộ

Có cấu hình `min-slaves-max-lag` này, có thể đảm bảo rằng một khi slave sao chép dữ liệu và độ trễ ack quá dài, thì cho rằng có thể master sập sẽ mất quá nhiều dữ liệu, nên từ chối request ghi, như vậy có thể đưa dữ liệu bị mất do một phần dữ liệu chưa đồng bộ sang slave khi master sập xuống trong phạm vi kiểm soát được.

-   Giảm mất dữ liệu do split-brain

Nếu một master xuất hiện split-brain, mất kết nối với các slave khác, thì hai cấu hình trên có thể đảm bảo rằng, nếu không thể tiếp tục gửi dữ liệu cho số lượng slave chỉ định, mà slave quá 10 giây không gửi thông điệp ack cho nó, thì trực tiếp từ chối request ghi của client. Vì vậy trong tình huống split-brain, tối đa chỉ mất dữ liệu của 10 giây.

## Cơ chế chuyển đổi sdown và odown

-   sdown là sập chủ quan, tức là nếu một Sentinel tự cho rằng một master sập thì đó là sập chủ quan
-   odown là sập khách quan, nếu số lượng Sentinel đạt quorum đều cho rằng một master sập thì đó là sập khách quan

Điều kiện để đạt sdown rất đơn giản: nếu một Sentinel ping một master, vượt quá số mili giây chỉ định bởi `is-master-down-after-milliseconds` thì chủ quan cho rằng master sập; nếu một Sentinel trong thời gian chỉ định nhận được số lượng quorum các Sentinel khác cũng cho rằng master đó là sdown thì được coi là odown.

## Cơ chế tự động phát hiện của cụm Sentinel

Việc các Sentinel phát hiện lẫn nhau được thực hiện qua hệ thống `pub/sub` của Redis, mỗi Sentinel đều gửi một thông điệp vào channel `__sentinel__:hello` này, lúc này tất cả các Sentinel khác đều có thể nhận được thông điệp này và nhận biết sự tồn tại của các Sentinel khác.

Cứ mỗi hai giây, mỗi Sentinel đều **gửi một thông điệp** vào channel `__sentinel__:hello` tương ứng với master+slaves mà nó giám sát, nội dung là host, ip và runid của chính nó cùng cấu hình giám sát đối với master này.

Mỗi Sentinel cũng sẽ **lắng nghe** channel `__sentinel__:hello` tương ứng với từng master+slaves mà nó giám sát, rồi nhận biết sự tồn tại của các Sentinel khác cũng đang lắng nghe master+slaves này.

Mỗi Sentinel còn trao đổi với các Sentinel khác cấu hình giám sát đối với `master` , đồng bộ cấu hình giám sát với nhau.

## Tự động hiệu chỉnh cấu hình slave

Sentinel sẽ chịu trách nhiệm tự động hiệu chỉnh một số cấu hình của slave, ví dụ nếu slave sắp trở thành ứng viên master tiềm năng, Sentinel sẽ đảm bảo slave sao chép dữ liệu của master hiện có; nếu slave kết nối nhầm vào một master sai, ví dụ sau khi chuyển đổi dự phòng, thì Sentinel sẽ đảm bảo chúng kết nối vào đúng master.

## Thuật toán bầu chọn slave->master

Nếu một master bị coi là odown, và số lượng Sentinel đạt majority đều cho phép chuyển đổi master/replica, thì một Sentinel nào đó sẽ thực hiện thao tác chuyển đổi master/replica, lúc này trước hết phải bầu ra một slave, sẽ xem xét một số thông tin của slave:

-   Khoảng thời gian bị ngắt kết nối với master
-   Độ ưu tiên của slave
-   Offset sao chép
-   run id

Nếu thời gian một slave bị ngắt kết nối với master đã vượt quá 10 lần `down-after-milliseconds` , cộng thêm khoảng thời gian master sập, thì slave bị coi là không phù hợp để bầu làm master.

```
(down-after-milliseconds * 10) + milliseconds_since_master_is_in_SDOWN_state
```

Tiếp theo sẽ sắp xếp các slave:

-   Sắp xếp theo độ ưu tiên của slave, slave priority càng thấp thì độ ưu tiên càng cao.
-   Nếu slave priority giống nhau thì xem replica offset, slave nào sao chép được nhiều dữ liệu hơn, offset càng lớn thì độ ưu tiên càng cao.
-   Nếu hai điều kiện trên đều giống nhau thì chọn slave có run id nhỏ hơn.

## quorum và majority

Mỗi lần một Sentinel muốn chuyển đổi master/replica, trước hết cần số lượng Sentinel đạt quorum cho rằng odown, sau đó bầu ra một Sentinel để chuyển đổi, Sentinel này còn cần được majority các Sentinel ủy quyền thì mới chính thức thực hiện chuyển đổi.

Nếu quorum < majority, ví dụ 5 Sentinel, majority là 3, quorum đặt là 2, thì chỉ cần 3 Sentinel ủy quyền là có thể thực hiện chuyển đổi.

Nhưng nếu quorum >= majority thì phải có đủ số lượng quorum Sentinel đều ủy quyền, ví dụ 5 Sentinel, quorum là 5, thì phải cả 5 Sentinel đều đồng ý ủy quyền mới có thể thực hiện chuyển đổi.

## configuration epoch

Sentinel sẽ giám sát một bộ Redis master+slaves, có cấu hình giám sát tương ứng.

Sentinel thực hiện chuyển đổi sẽ lấy một configuration epoch từ master mới cần chuyển sang (salve->master), đây là một số version, số version của mỗi lần chuyển đổi đều phải là duy nhất.

Nếu Sentinel được bầu đầu tiên chuyển đổi thất bại, thì các Sentinel khác sẽ chờ khoảng thời gian failover-timeout, rồi tiếp quản và tiếp tục thực hiện chuyển đổi, lúc này sẽ lấy lại một configuration epoch mới làm số version mới.

## Lan truyền configuration

Sau khi Sentinel hoàn tất chuyển đổi, sẽ cập nhật và tạo cấu hình master mới nhất ở cục bộ, rồi đồng bộ cho các Sentinel khác, chính là thông qua cơ chế thông điệp `pub/sub` đã nói trước đó.

Số version trước đó ở đây rất quan trọng, vì các loại thông điệp đều được phát và lắng nghe qua một channel, nên sau khi một Sentinel hoàn tất một lần chuyển đổi mới, cấu hình master mới đi kèm với số version mới. Các Sentinel khác đều dựa vào độ lớn của số version để cập nhật cấu hình master của mình.
