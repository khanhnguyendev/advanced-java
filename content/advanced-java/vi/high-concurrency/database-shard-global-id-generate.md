---
source:
  locale: zh
  slug: database-shard-global-id-generate
  hash: 'sha256:v1:d9c370ccf988c86adc5901db4d2eea131b5ca8878e0e2604423de1a5f5ef2784'
status: machine
translatedAt: '2026-10-14'
---
# Xử lý ID khóa chính như thế nào?

## Câu hỏi phỏng vấn

Sau khi sharding, khóa chính id được xử lý như thế nào?

## Tâm lý người phỏng vấn

Thực ra đây là một vấn đề bạn tất yếu phải đối mặt sau khi sharding, đó là id sinh ra thế nào? Vì nếu chia thành nhiều bảng, mỗi bảng đều cộng dồn từ 1 thì chắc chắn không đúng, cần một id **duy nhất toàn cục** để hỗ trợ. Vì vậy đây đều là những vấn đề bạn phải cân nhắc trong môi trường production thực tế.

## Phân tích câu trả lời

### Phương án hiện thực dựa trên cơ sở dữ liệu

#### id tự tăng của cơ sở dữ liệu

Tức là mỗi lần hệ thống của bạn cần một id, đều chèn một bản ghi không có ý nghĩa nghiệp vụ gì vào một bảng của một cơ sở dữ liệu, rồi lấy một id tự tăng của cơ sở dữ liệu. Sau khi lấy được id này thì ghi vào sharding tương ứng.

Ưu điểm của phương án này là tiện lợi đơn giản, ai cũng biết dùng; **nhược điểm là sinh ở một cơ sở dữ liệu đơn** id tự tăng, nếu tải đồng thời cao thì sẽ có nút thắt cổ chai; nếu bạn nhất định muốn cải tiến thì mở riêng một dịch vụ, dịch vụ này mỗi lần lấy giá trị id lớn nhất hiện tại, rồi tự tăng thêm vài id, trả về một lô id trong một lần, sau đó sửa giá trị id lớn nhất hiện tại thành giá trị sau khi tăng thêm vài id; nhưng **dù thế nào cũng đều dựa trên một cơ sở dữ liệu đơn**.

**Kịch bản phù hợp**: bạn sharding chỉ có hai lý do, hoặc là mức đồng thời của cơ sở dữ liệu đơn quá cao, hoặc là lượng dữ liệu của cơ sở dữ liệu đơn quá lớn; trừ phi việc sharding và mở rộng của bạn là do **mức đồng thời không cao nhưng lượng dữ liệu quá lớn** gây ra, bạn có thể dùng phương án này, vì có thể mức đồng thời cao nhất mỗi giây cũng chỉ vài trăm, thì dùng riêng một cơ sở dữ liệu và bảng để sinh khóa chính tự tăng là được.

#### Đặt sequence của cơ sở dữ liệu hoặc bước nhảy của trường tự tăng trong bảng

Có thể đặt sequence của cơ sở dữ liệu hoặc bước nhảy của trường tự tăng của bảng để co giãn theo chiều ngang.

Ví dụ, hiện có 8 node dịch vụ, mỗi node dịch vụ dùng một chức năng sequence để sinh ID, ID khởi đầu của mỗi sequence khác nhau, và tăng dần lần lượt, bước nhảy đều là 8.

![database-id-sequence-step](diagram:high-concurrency/database-shard-global-id-generate/database-id-sequence-step)

**Kịch bản phù hợp**: khi người dùng muốn tránh sinh ID trùng lặp, phương án này hiện thực khá đơn giản, cũng đạt được mục tiêu hiệu năng. Nhưng node dịch vụ cố định, bước nhảy cũng cố định, sau này nếu còn muốn thêm node dịch vụ thì khó làm.

### UUID

Ưu điểm là sinh cục bộ, không cần dựa vào cơ sở dữ liệu nữa; điểm không tốt là UUID quá dài, chiếm nhiều dung lượng, **hiệu năng khi làm khóa chính quá kém**; quan trọng hơn là UUID không có tính có thứ tự, khiến chỉ mục B+ tree khi ghi có quá nhiều thao tác ghi ngẫu nhiên (ID liên tục có thể sinh ra một phần ghi tuần tự), ngoài ra, do khi ghi không thể sinh ra thao tác append có thứ tự, mà cần thực hiện thao tác insert, sẽ phải đọc cả node B+ tree vào bộ nhớ, sau khi chèn bản ghi này sẽ ghi cả node trở lại đĩa, thao tác này khi bản ghi chiếm dung lượng khá lớn thì hiệu năng giảm rõ rệt.

Kịch bản phù hợp: nếu bạn muốn sinh ngẫu nhiên một tên tệp, mã số gì đó thì có thể dùng UUID, nhưng làm khóa chính thì không được dùng UUID.

```java
UUID.randomUUID().toString().replace("-", "") -> sfsdf23423rr234sfdaf
```

### Lấy thời gian hiện tại của hệ thống

Cái này là lấy thời gian hiện tại là được, nhưng vấn đề là, **khi mức đồng thời rất cao**, ví dụ một giây đồng thời vài nghìn, **sẽ có trường hợp trùng lặp**, cái này chắc chắn không phù hợp. Về cơ bản không cần cân nhắc.

Kịch bản phù hợp: nói chung nếu dùng phương án này, là ghép thời gian hiện tại với nhiều trường nghiệp vụ khác lại, làm thành một id, nếu về nghiệp vụ bạn thấy chấp nhận được thì cũng được. Bạn có thể ghép giá trị các trường nghiệp vụ khác với thời gian hiện tại, tạo thành một mã số duy nhất toàn cục.

### Thuật toán snowflake

Thuật toán snowflake là thuật toán sinh id phân tán do twitter mã nguồn mở, được hiện thực bằng ngôn ngữ Scala, là lấy một id kiểu long 64 bit, 1 bit không dùng, dùng 41 bits trong đó làm số mili giây, dùng 10 bits làm id máy làm việc, 12 bits làm số thứ tự.

-   1 bit: không dùng, tại sao? Vì trong nhị phân, nếu bit đầu tiên là 1 thì đều là số âm, nhưng id chúng ta sinh ra đều là số dương, nên bit đầu tiên thống nhất đều là 0.
-   41 bits: biểu diễn timestamp, đơn vị là mili giây. 41 bits có thể biểu diễn số lên tới `2^41 - 1` , tức là có thể định danh `2^41 - 1` giá trị mili giây, quy đổi ra năm là biểu diễn khoảng thời gian 69 năm.
-   10 bits: ghi id máy làm việc, biểu diễn dịch vụ này nhiều nhất có thể triển khai trên 2^10 máy, tức là 1024 máy. Nhưng trong 10 bits thì 5 bits biểu diễn id phòng máy (datacenter), 5 bits biểu diễn id máy. Nghĩa là nhiều nhất biểu diễn `2^5` phòng máy (32 phòng máy), mỗi phòng máy có thể biểu diễn `2^5` máy (32 máy).
-   12 bits: dùng để ghi các id khác nhau sinh ra trong cùng một mili giây, số lớn nhất mà 12 bits có thể biểu diễn là `2^12 - 1 = 4095` , tức là có thể dùng số mà 12 bits này biểu diễn để phân biệt 4096 id khác nhau (số 0 đến số 4095) **trong cùng một mili giây**.

```sh
0 | 0001100 10100010 10111110 10001001 01011100 00 | 10001 | 1 1001 | 0000 00000000
```

```java
public class IdWorker {

    private long workerId;
    private long datacenterId;
    private long sequence;

    public IdWorker(long workerId, long datacenterId, long sequence) {
        // sanity check for workerId
        // Đây chỉ là kiểm tra một chút, yêu cầu id phòng máy và id máy bạn truyền vào không được vượt quá 32, không được nhỏ hơn 0
        if (workerId > maxWorkerId || workerId < 0) {
            throw new IllegalArgumentException(
                    String.format("worker Id can't be greater than %d or less than 0", maxWorkerId));
        }
        if (datacenterId > maxDatacenterId || datacenterId < 0) {
            throw new IllegalArgumentException(
                    String.format("datacenter Id can't be greater than %d or less than 0", maxDatacenterId));
        }
        System.out.printf(
                "worker starting. timestamp left shift %d, datacenter id bits %d, worker id bits %d, sequence bits %d, workerid %d",
                timestampLeftShift, datacenterIdBits, workerIdBits, sequenceBits, workerId);

        this.workerId = workerId;
        this.datacenterId = datacenterId;
        this.sequence = sequence;
    }

    private long twepoch = 1288834974657L;

    private long workerIdBits = 5L;
    private long datacenterIdBits = 5L;

    // Đây là phép tính nhị phân, 5 bit nhiều nhất chỉ có 31 số, tức là id máy nhiều nhất chỉ trong vòng 32
    private long maxWorkerId = -1L ^ (-1L << workerIdBits);

    // Ý nghĩa tương tự, 5 bit nhiều nhất chỉ có 31 số, id phòng máy nhiều nhất chỉ trong vòng 32
    private long maxDatacenterId = -1L ^ (-1L << datacenterIdBits);
    private long sequenceBits = 12L;

    private long workerIdShift = sequenceBits;
    private long datacenterIdShift = sequenceBits + workerIdBits;
    private long timestampLeftShift = sequenceBits + workerIdBits + datacenterIdBits;
    private long sequenceMask = -1L ^ (-1L << sequenceBits);

    private long lastTimestamp = -1L;

    public long getWorkerId() {
        return workerId;
    }

    public long getDatacenterId() {
        return datacenterId;
    }

    public long getTimestamp() {
        return System.currentTimeMillis();
    }

    public synchronized long nextId() {
        // Đây là lấy timestamp hiện tại, đơn vị là mili giây
        long timestamp = timeGen();

        if (timestamp < lastTimestamp) {
            System.err.printf("clock is moving backwards.  Rejecting requests until %d.", lastTimestamp);
            throw new RuntimeException(String.format(
                    "Clock moved backwards.  Refusing to generate id for %d milliseconds", lastTimestamp - timestamp));
        }

        if (lastTimestamp == timestamp) {
            // Ý là trong một mili giây nhiều nhất chỉ có 4096 số
            // Dù bạn truyền vào bao nhiêu, phép toán bit này đảm bảo luôn nằm trong phạm vi 4096, tránh việc bạn tự truyền sequence vượt quá phạm vi 4096
            sequence = (sequence + 1) & sequenceMask;
            if (sequence == 0) {
                timestamp = tilNextMillis(lastTimestamp);
            }
        } else {
            sequence = 0;
        }

        // Đây là ghi lại timestamp của lần sinh id gần nhất, đơn vị là mili giây
        lastTimestamp = timestamp;

        // Đây là dịch trái timestamp, đặt vào chỗ 41 bit;
        // dịch trái id phòng máy đặt vào chỗ 5 bit;
        // dịch trái id máy đặt vào chỗ 5 bit; số thứ tự đặt ở 12 bit cuối;
        // Cuối cùng ghép lại thành một số nhị phân 64 bit, chuyển sang hệ 10 chính là một số kiểu long
        return ((timestamp - twepoch) << timestampLeftShift) | (datacenterId << datacenterIdShift)
                | (workerId << workerIdShift) | sequence;
    }

    private long tilNextMillis(long lastTimestamp) {
        long timestamp = timeGen();
        while (timestamp <= lastTimestamp) {
            timestamp = timeGen();
        }
        return timestamp;
    }

    private long timeGen() {
        return System.currentTimeMillis();
    }

    // ---------------Kiểm thử---------------
    public static void main(String[] args) {
        IdWorker worker = new IdWorker(1, 1, 1);
        for (int i = 0; i < 30; i++) {
            System.out.println(worker.nextId());
        }
    }

}

```

Nói thế nào nhỉ, đại khái là ý này, tức là 41 bit là một timestamp theo đơn vị mili giây hiện tại, đúng ý này; rồi 5 bit là **phòng máy** id mà bạn truyền vào (nhưng lớn nhất chỉ trong vòng 32), 5 bit còn lại là **máy** id mà bạn truyền vào (nhưng lớn nhất chỉ trong vòng 32), 12 bit số thứ tự còn lại, tức là nếu so với lần sinh id trước của bạn vẫn còn trong cùng một mili giây, thì sẽ cộng dồn thứ tự cho bạn, nhiều nhất trong vòng 4096 số thứ tự.

Vì vậy bạn tự dùng lớp tiện ích này, tự làm một dịch vụ, rồi khởi tạo một đối tượng như vậy cho mỗi máy của mỗi phòng máy, lúc đầu số thứ tự của máy này của phòng máy này là 0. Rồi mỗi lần nhận được một yêu cầu, nói rằng máy này của phòng máy này cần sinh một id, bạn tìm Worker tương ứng để sinh.

Dùng thuật toán snowflake này, bạn có thể phát triển dịch vụ của công ty mình, thậm chí với id phòng máy và id máy, dù sao cũng chừa sẵn cho bạn 5 bit + 5 bit, bạn đổi thành thứ khác có ý nghĩa nghiệp vụ cũng được.

Thuật toán snowflake này tương đối vẫn khá đáng tin, nên nếu bạn thật sự làm sinh id phân tán, nếu tải đồng thời cao thì dùng cái này hiệu năng chắc khá tốt, kịch bản mức đồng thời vài chục nghìn mỗi giây nói chung cũng đủ cho bạn dùng.
