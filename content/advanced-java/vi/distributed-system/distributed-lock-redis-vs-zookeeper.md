---
source:
  locale: zh
  slug: distributed-lock-redis-vs-zookeeper
  hash: 'sha256:v1:f8f366102d50f199a6ab7c2517236af455132bdf606196116a81ab8a9f945258'
status: machine
translatedAt: '2026-10-14'
---
# Redis vs Zookeeper khi triển khai khóa phân tán

## Câu hỏi phỏng vấn

Nhìn chung có những cách nào để triển khai khóa phân tán? Dùng Redis thì thiết kế khóa phân tán như thế nào? Dùng zk để thiết kế khóa phân tán có được không? Giữa hai cách triển khai khóa phân tán này, cách nào có hiệu suất cao hơn?

## Tâm lý người phỏng vấn

Thực ra các câu hỏi thường được đặt như vậy: hỏi bạn về zk trước, rồi chuyển sang các vấn đề liên quan đến zk, chẳng hạn khóa phân tán. Bởi vì trong phát triển hệ thống phân tán, khóa phân tán là tình huống sử dụng khá phổ biến.

## Phân tích câu trả lời

### Khóa phân tán bằng Redis

Tên chính thức là thuật toán `RedLock`, thuật toán khóa phân tán do chính Redis hỗ trợ.

Khóa phân tán này có 3 điểm cần cân nhắc quan trọng:

-   Loại trừ lẫn nhau (chỉ một client được lấy khóa)
-   Không được deadlock
-   Chịu lỗi (chỉ cần phần lớn các node Redis đã tạo được khóa này là đủ)

#### Khóa phân tán đơn giản nhất bằng Redis

Cách triển khai đơn giản nhất là dùng `SET key value [EX seconds] [PX milliseconds] NX` trong Redis để tạo một key, như vậy là đã khóa. Trong đó:

-   `NX`: nghĩa là chỉ khi `key` chưa tồn tại thì mới đặt thành công; nếu lúc này trong redis đã có `key` đó thì đặt thất bại và trả về `nil`.
-   `EX seconds`: đặt thời gian hết hạn của `key`, chính xác đến mức giây. Nghĩa là sau `seconds` giây khóa tự động được giải phóng; nếu người khác khi tạo thấy đã có rồi thì không thể khóa.
-   `PX milliseconds`: cũng là đặt thời gian hết hạn của `key`, nhưng chính xác đến mức mili giây.

Ví dụ thực hiện lệnh sau:

```r
SET resource_name my_random_value PX 30000 NX
```

Giải phóng khóa chính là xóa key, nhưng thường có thể dùng script `lua` để xóa, và chỉ xóa khi value giống nhau:

```lua
-- Khi xóa khóa, tìm value tương ứng với key, so sánh với value mình truyền vào, chỉ xóa nếu giống nhau.
if redis.call("get",KEYS[1]) == ARGV[1] then
    return redis.call("del",KEYS[1])
else
    return 0
end
```

Tại sao phải dùng giá trị ngẫu nhiên `random_value`? Vì nếu một client lấy được khóa nhưng bị chặn rất lâu mới thực hiện xong, ví dụ vượt quá 30 giây, thì lúc đó khóa có thể đã tự động được giải phóng, và có thể client khác đã lấy được khóa này; nếu lúc này bạn xóa thẳng key thì sẽ có vấn đề, nên phải dùng giá trị ngẫu nhiên cộng với script `lua` ở trên để giải phóng khóa.

Nhưng cách này chắc chắn là không đủ. Vì nếu là Redis một instance thông thường thì sẽ có điểm lỗi đơn (single point of failure). Còn nếu là Redis master/replica thông thường, thì do sao chép bất đồng bộ giữa master và replica của Redis, nếu node master sập (key mất theo), key chưa kịp đồng bộ sang node replica, lúc này node replica được chuyển thành master, người khác có thể set key và do đó lấy được khóa.

#### Thuật toán RedLock

Tình huống này giả định có một Redis cluster với 5 instance Redis master. Sau đó thực hiện các bước sau để lấy một khóa:

1. Lấy timestamp hiện tại, đơn vị là mili giây;
2. Tương tự như trên, lần lượt thử tạo khóa trên từng node master, với thời gian chờ (timeout) khá ngắn, thường chỉ vài chục mili giây (thời gian chờ mà client dùng để lấy khóa phải nhỏ hơn tổng thời gian tự động giải phóng khóa. Ví dụ, nếu thời gian tự động giải phóng là 10 giây thì thời gian chờ có thể nằm trong khoảng `5~50` mili giây);
3. Thử thiết lập khóa trên **đa số các node**, ví dụ 5 node thì yêu cầu 3 node, tức `n / 2 + 1`;
4. Client tính thời gian đã dùng để thiết lập khóa, nếu thời gian thiết lập khóa nhỏ hơn thời gian chờ thì coi như thiết lập thành công;
5. Nếu thiết lập khóa thất bại thì lần lượt xóa các khóa đã tạo trước đó;
6. Chỉ cần người khác đã tạo một khóa phân tán thì bạn phải **liên tục thăm dò (polling) để thử lấy khóa**.

![redis-redlock](asset:distributed-system/distributed-lock-redis-vs-zookeeper/redis-redlock.png)

[Redis chính thức](https://redis.io/) đưa ra hai phương pháp triển khai khóa phân tán dựa trên Redis như trên, xem giải thích chi tiết tại: https://redis.io/topics/distlock .

### Khóa phân tán bằng zk

Khóa phân tán bằng zk thực ra có thể làm khá đơn giản: một node thử tạo một znode tạm thời (ephemeral), nếu tạo thành công thì đã lấy được khóa; lúc này client khác đến tạo khóa sẽ thất bại, chỉ có thể **đăng ký một listener** để theo dõi khóa này. Giải phóng khóa là xóa znode này, một khi được giải phóng thì client sẽ được thông báo, rồi một client đang chờ có thể khóa lại lần nữa.

```java
/**
 * ZooKeeperSession
 */
public class ZooKeeperSession {

    private static CountDownLatch connectedSemaphore = new CountDownLatch(1);

    private ZooKeeper zookeeper;
    private CountDownLatch latch;

    public ZooKeeperSession() {
        try {
            this.zookeeper = new ZooKeeper("192.168.31.187:2181,192.168.31.19:2181,192.168.31.227:2181", 50000, new ZooKeeperWatcher());
            try {
                connectedSemaphore.await();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }

            System.out.println("ZooKeeper session established......");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Lấy khóa phân tán
     *
     * @param productId
     */
    public Boolean acquireDistributedLock(Long productId) {
        String path = "/product-lock-" + productId;

        try {
            zookeeper.create(path, "".getBytes(), Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL);
            return true;
        } catch (Exception e) {
            while (true) {
                try {
                    // Tương đương đăng ký một listener cho node, để xem node này có tồn tại hay không
                    Stat stat = zk.exists(path, true);

                    if (stat != null) {
                        this.latch = new CountDownLatch(1);
                        this.latch.await(waitTime, TimeUnit.MILLISECONDS);
                        this.latch = null;
                    }
                    zookeeper.create(path, "".getBytes(), Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL);
                    return true;
                } catch (Exception ee) {
                    continue;
                }
            }

        }
        return true;
    }

    /**
     * Giải phóng một khóa phân tán
     *
     * @param productId
     */
    public void releaseDistributedLock(Long productId) {
        String path = "/product-lock-" + productId;
        try {
            zookeeper.delete(path, -1);
            System.out.println("release the lock for product[id=" + productId + "]......");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Watcher để thiết lập session zk
     */
    private class ZooKeeperWatcher implements Watcher {

        public void process(WatchedEvent event) {
            System.out.println("Receive watched event: " + event.getState());

            if (KeeperState.SyncConnected == event.getState()) {
                connectedSemaphore.countDown();
            }

            if (this.latch != null) {
                this.latch.countDown();
            }
        }

    }

    /**
     * Lớp nội tĩnh đóng gói singleton
     */
    private static class Singleton {

        private static ZooKeeperSession instance;

        static {
            instance = new ZooKeeperSession();
        }

        public static ZooKeeperSession getInstance() {
            return instance;
        }

    }

    /**
     * Lấy singleton
     *
     * @return
     */
    public static ZooKeeperSession getInstance() {
        return Singleton.getInstance();
    }

    /**
     * Phương thức tiện ích để khởi tạo singleton
     */
    public static void init() {
        getInstance();
    }

}
```

Cũng có thể dùng một cách khác là tạo node tuần tự tạm thời:

Nếu có một khóa bị nhiều người tranh giành, lúc này nhiều người sẽ xếp hàng, người đầu tiên lấy được khóa sẽ thực thi rồi giải phóng khóa; mỗi người phía sau sẽ theo dõi node do người **đứng ngay trước mình** tạo ra, một khi có người giải phóng khóa thì người đứng sau họ sẽ được ZooKeeper thông báo, khi được thông báo là ổn, mình đã lấy được khóa và có thể thực thi code.

```java
public class ZooKeeperDistributedLock implements Watcher {

    private ZooKeeper zk;
    private String locksRoot = "/locks";
    private String productId;
    private String waitNode;
    private String lockNode;
    private CountDownLatch latch;
    private CountDownLatch connectedLatch = new CountDownLatch(1);
    private int sessionTimeout = 30000;

    public ZooKeeperDistributedLock(String productId) {
        this.productId = productId;
        try {
            String address = "192.168.31.187:2181,192.168.31.19:2181,192.168.31.227:2181";
            zk = new ZooKeeper(address, sessionTimeout, this);
            connectedLatch.await();
        } catch (IOException e) {
            throw new LockException(e);
        } catch (KeeperException e) {
            throw new LockException(e);
        } catch (InterruptedException e) {
            throw new LockException(e);
        }
    }

    public void process(WatchedEvent event) {
        if (event.getState() == KeeperState.SyncConnected) {
            connectedLatch.countDown();
            return;
        }

        if (this.latch != null) {
            this.latch.countDown();
        }
    }

    public void acquireDistributedLock() {
        try {
            if (this.tryLock()) {
                return;
            } else {
                waitForLock(waitNode, sessionTimeout);
            }
        } catch (KeeperException e) {
            throw new LockException(e);
        } catch (InterruptedException e) {
            throw new LockException(e);
        }
    }

    public boolean tryLock() {
        try {
            // locksRoot được truyền vào + "/" + productId
            // Giả sử productId đại diện cho id của một sản phẩm, ví dụ 1
            // locksRoot = locks
            // /locks/10000000000，/locks/10000000001，/locks/10000000002
            lockNode = zk.create(locksRoot + "/" + productId, new byte[0], ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL_SEQUENTIAL);

            // Xem node vừa tạo có phải node nhỏ nhất hay không
            // locks：10000000000，10000000001，10000000002
            List<String> locks = zk.getChildren(locksRoot, false);
            Collections.sort(locks);

            if (lockNode.equals(locksRoot + "/" + locks.get(0))) {
                // Nếu là node nhỏ nhất thì nghĩa là đã lấy được khóa
                return true;
            }

            // Nếu không phải node nhỏ nhất, tìm node nhỏ hơn mình 1
            int previousLockIndex = -1;
            for (int i = 0; i < locks.size(); i++) {
                if (lockNode.equals(locksRoot + "/" +locks.get(i))){
                    previousLockIndex = i - 1;
                    break;
                }
            }

            this.waitNode = locks.get(previousLockIndex);
        } catch (KeeperException e) {
            throw new LockException(e);
        } catch (InterruptedException e) {
            throw new LockException(e);
        }
        return false;
    }

    private boolean waitForLock(String waitNode, long waitTime) throws InterruptedException, KeeperException {
        Stat stat = zk.exists(locksRoot + "/" + waitNode, true);
        if (stat != null) {
            this.latch = new CountDownLatch(1);
            this.latch.await(waitTime, TimeUnit.MILLISECONDS);
            this.latch = null;
        }
        return true;
    }

    public void unlock() {
        try {
            // Xóa node /locks/10000000000
            // Xóa node /locks/10000000001
            System.out.println("unlock " + lockNode);
            zk.delete(lockNode, -1);
            lockNode = null;
            zk.close();
        } catch (InterruptedException e) {
            e.printStackTrace();
        } catch (KeeperException e) {
            e.printStackTrace();
        }
    }

    public class LockException extends RuntimeException {
        private static final long serialVersionUID = 1L;

        public LockException(String e) {
            super(e);
        }

        public LockException(Exception e) {
            super(e);
        }
    }
}
```

Tuy nhiên, dùng node tạm thời của zk sẽ có thêm một vấn đề: do zk dựa vào heartbeat định kỳ của session để duy trì client, nếu client rơi vào GC kéo dài, zk có thể cho rằng client đã sập mà giải phóng khóa, để client khác lấy khóa; nhưng sau khi GC phục hồi, client đó vẫn cho rằng mình đang giữ khóa, từ đó có thể xuất hiện tình huống nhiều client cùng lúc lấy được khóa. [#209](https://github.com/doocs/advanced-java/issues/209)

Với trường hợp này, có thể tinh chỉnh JVM để cố gắng tránh xảy ra GC kéo dài.

### So sánh khóa phân tán của redis và zk

-   Khóa phân tán của redis thực ra **cần tự mình liên tục thử lấy khóa**, khá tốn hiệu năng.
-   Khóa phân tán của zk, nếu không lấy được khóa thì chỉ cần đăng ký một listener, không cần chủ động liên tục thử lấy khóa, chi phí hiệu năng nhỏ hơn.

Một điểm khác là, nếu client lấy khóa của Redis gặp bug và sập thì chỉ có thể chờ hết thời gian chờ rồi khóa mới được giải phóng; còn với zk, vì tạo ra là znode tạm thời, chỉ cần client sập thì znode biến mất, khóa tự động được giải phóng.

Mọi người không thấy khóa phân tán của Redis khá phiền sao? Phải duyệt để khóa, tính thời gian, v.v. Khóa phân tán của zk có ngữ nghĩa rõ ràng, triển khai đơn giản.

Vì vậy tạm không phân tích quá nhiều thứ, chỉ nói hai điểm này: theo thực tiễn cá nhân tôi, khóa phân tán của zk đáng tin cậy hơn khóa phân tán của Redis, mà mô hình lại đơn giản, dễ dùng.
