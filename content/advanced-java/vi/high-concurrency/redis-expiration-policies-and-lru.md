---
source:
  locale: zh
  slug: redis-expiration-policies-and-lru
  hash: 'sha256:v1:59363b25187396fcdf23f0d32f20720cdfe1fd2ef26375f812de9db904770e01'
status: machine
translatedAt: '2026-10-14'
---
# Chiến lược hết hạn và thuật toán LRU của Redis

## Câu hỏi phỏng vấn

Redis có những chiến lược hết hạn nào? Có những cơ chế loại bỏ dữ liệu khi đầy bộ nhớ nào? Hãy viết tay cài đặt code LRU?

## Tâm lý người phỏng vấn

Nếu bạn còn không biết câu hỏi này, vừa nghe đã bối rối, trả lời không được, thì khi viết code online bạn sẽ mặc nhiên cho rằng dữ liệu đã ghi vào Redis thì nhất định sẽ tồn tại, về sau gây ra đủ loại bug cho hệ thống, ai sẽ chịu trách nhiệm?

Có hai vấn đề thường gặp:

-   Dữ liệu ghi vào Redis sao lại mất?

Có thể có bạn gặp tình huống Redis trên môi trường production thường xuyên mất một số dữ liệu, ghi vào rồi, một lúc sau có thể không còn nữa. Trời ơi, bạn ơi, bạn hỏi câu này tức là bạn đã dùng Redis sai rồi. Redis là bộ nhớ đệm (cache), bạn lại coi nó là nơi lưu trữ à?

Bộ nhớ đệm là gì? Là dùng bộ nhớ làm nơi đệm. Bộ nhớ có vô hạn không? Bộ nhớ rất quý và có hạn, còn đĩa thì rẻ và có rất nhiều. Một máy có thể chỉ có vài chục G bộ nhớ, nhưng có thể có vài T dung lượng đĩa. Redis chủ yếu dựa vào bộ nhớ để thực hiện các thao tác đọc ghi hiệu năng cao, tải đồng thời cao (high concurrency).

Vậy bộ nhớ đã có hạn, ví dụ Redis chỉ dùng được 10G, nếu bạn ghi vào 20G dữ liệu thì sẽ làm sao? Tất nhiên sẽ loại bỏ 10G dữ liệu, rồi chỉ giữ lại 10G dữ liệu. Vậy loại bỏ dữ liệu nào? Giữ lại dữ liệu nào? Tất nhiên là loại bỏ dữ liệu ít dùng, giữ lại dữ liệu thường dùng.

-   Dữ liệu rõ ràng đã hết hạn, sao vẫn chiếm bộ nhớ?

Điều này do chiến lược hết hạn của Redis quyết định.

## Phân tích câu trả lời

### Chiến lược hết hạn của Redis

Chiến lược hết hạn của Redis là: **xóa định kỳ + xóa lười (lazy)**.

Cái gọi là **xóa định kỳ** nghĩa là mặc định cứ mỗi 100ms Redis sẽ lấy ngẫu nhiên một số key đã được đặt thời gian hết hạn, kiểm tra xem chúng đã hết hạn chưa, nếu hết hạn thì xóa.

Giả sử trong Redis có 100 nghìn key, đều đã đặt thời gian hết hạn, nếu cứ mỗi vài trăm mili giây bạn kiểm tra 100 nghìn key đó thì Redis gần như sập, tải cpu sẽ rất cao, bị tiêu tốn vào việc kiểm tra các key hết hạn. Chú ý, ở đây không phải cứ mỗi 100ms là duyệt tất cả các key có đặt thời gian hết hạn, làm như vậy sẽ là một **thảm họa** về hiệu năng. Thực tế Redis cứ mỗi 100ms **lấy ngẫu nhiên** một số key để kiểm tra và xóa.

Nhưng vấn đề là xóa định kỳ có thể khiến nhiều key hết hạn đến hạn mà không bị xóa, vậy làm sao? Đó chính là xóa lười. Nghĩa là khi bạn lấy một key nào đó, Redis sẽ kiểm tra, key này nếu có đặt thời gian hết hạn thì đã hết hạn chưa? Nếu đã hết hạn thì lúc đó sẽ xóa, và không trả về bất cứ thứ gì cho bạn.

> Khi lấy key, nếu lúc đó key đã hết hạn thì xóa, không trả về bất cứ thứ gì.

Nhưng thực ra như vậy vẫn có vấn đề: nếu xóa định kỳ bỏ sót nhiều key hết hạn, mà bạn cũng không kịp truy vấn, tức là không đi qua xóa lười, thì sẽ ra sao? Nếu một lượng lớn key hết hạn chất đống trong bộ nhớ, khiến bộ nhớ của Redis cạn kiệt, thì làm sao?

Đáp án là: **dùng cơ chế loại bỏ khi đầy bộ nhớ**.

### Cơ chế loại bỏ khi đầy bộ nhớ

Redis có các cơ chế loại bỏ khi đầy bộ nhớ sau:

-   noeviction: khi bộ nhớ không đủ chứa dữ liệu mới ghi, thao tác ghi mới sẽ báo lỗi, cái này chắc chẳng ai dùng, thật sự quá tệ.
-   **allkeys-lru**: khi bộ nhớ không đủ chứa dữ liệu mới ghi, trong **không gian key** thì loại bỏ key ít được dùng gần đây nhất (cái này là **dùng nhiều nhất**).
-   allkeys-random: khi bộ nhớ không đủ chứa dữ liệu mới ghi, trong **không gian key** thì loại bỏ ngẫu nhiên một key, cái này chắc chẳng ai dùng, sao phải ngẫu nhiên, chắc chắn là loại bỏ key ít được dùng gần đây nhất rồi.
-   volatile-lru: khi bộ nhớ không đủ chứa dữ liệu mới ghi, trong **không gian key đã đặt thời gian hết hạn** thì loại bỏ key ít được dùng gần đây nhất (cái này thường không phù hợp lắm).
-   volatile-random: khi bộ nhớ không đủ chứa dữ liệu mới ghi, trong **không gian key đã đặt thời gian hết hạn** thì **loại bỏ ngẫu nhiên** một key.
-   volatile-ttl: khi bộ nhớ không đủ chứa dữ liệu mới ghi, trong **không gian key đã đặt thời gian hết hạn** thì key có **thời gian hết hạn sớm hơn** được loại bỏ trước.

### Viết tay một thuật toán LRU

LRU là viết tắt của Least Recently Used, dịch ra là "ít được dùng gần đây nhất". Nghĩa là thuật toán LRU sẽ loại bỏ bộ nhớ đệm ít được dùng gần đây nhất, nhường chỗ cho bộ nhớ đệm mới được dùng. Mà thứ được đọc nhiều nhất thường cũng là thứ có số lần đọc nhiều nhất, nên dùng tốt thuật toán LRU, chúng ta có thể nâng cao hiệu quả bộ nhớ đệm cho dữ liệu nóng, nâng cao tỷ lệ sử dụng bộ nhớ của dịch vụ bộ nhớ đệm.

Vậy cài đặt như thế nào?

Thực ra ý tưởng cài đặt rất đơn giản, như được mô tả trong hình dưới đây.

![](diagram:high-concurrency/redis-expiration-policies-and-lru/lru)

Bạn có thể viết tay ngay tại chỗ thuật toán LRU nguyên thủy nhất, nhưng lượng code quá lớn, dường như không thực tế.

Không đòi hỏi bạn tự tay xây dựng LRU từ tầng thấp nhất, nhưng ít nhất phải biết cách tận dụng các cấu trúc dữ liệu có sẵn của JDK để cài đặt một LRU phiên bản Java.

![](diagram:high-concurrency/redis-expiration-policies-and-lru/lru-cache)

```java
public class LRUCache<K, V> extends LinkedHashMap<K, V> {
    private int capacity;

    /**
     * Truyền vào số lượng dữ liệu tối đa có thể lưu đệm
     *
     * @param capacity kích thước bộ nhớ đệm
     */
    public LRUCache(int capacity) {
        super(capacity, 0.75f, true);
        this.capacity = capacity;
    }

    /**
     * Nếu lượng dữ liệu trong map lớn hơn dung lượng tối đa đã đặt thì trả về true, khi thêm đối tượng mới sẽ xóa dữ liệu cũ nhất
     *
     * @param eldest phần tử dữ liệu cũ nhất
     * @return true thì xóa dữ liệu cũ nhất
     */
    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        // Khi lượng dữ liệu trong map lớn hơn số lượng bộ nhớ đệm chỉ định thì tự động xóa dữ liệu cũ nhất
        return size() > capacity;
    }
}
```
