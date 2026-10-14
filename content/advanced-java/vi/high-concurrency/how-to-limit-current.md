---
source:
  locale: zh
  slug: how-to-limit-current
  hash: 'sha256:v1:248cfa55693a1cda4dbbd5c7bf7fdd94b86a92e32e7147a92b47ad7fc78805ad'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để giới hạn lưu lượng? Trong công việc bạn làm như thế nào? Hãy nói về cách triển khai cụ thể?

## Giới hạn lưu lượng là gì

> Giới hạn lưu lượng (rate limiting) có thể coi là một dạng suy giảm dịch vụ (fallback); giới hạn lưu lượng là giới hạn lưu lượng vào và ra của hệ thống nhằm đạt được mục đích bảo vệ hệ thống. Nói chung, thông lượng của hệ thống có thể đo đạc được; để đảm bảo hệ thống vận hành ổn định, một khi đạt tới ngưỡng cần giới hạn thì phải giới hạn lưu lượng và áp dụng một số biện pháp để đạt mục đích giới hạn lưu lượng. Ví dụ: xử lý trì hoãn, từ chối xử lý, hoặc từ chối xử lý một phần, v.v.

## Các phương pháp giới hạn lưu lượng

### Bộ đếm

#### Cách triển khai

Kiểm soát số lượng request trong một đơn vị thời gian.

```java

import java.util.concurrent.atomic.AtomicInteger;

public class Counter {
    /**
     * Số lượng truy cập tối đa
     */
    private final int limit = 10;
    /**
     * Khoảng thời gian truy cập
     */
    private final long timeout = 1000;
    /**
     * Thời điểm request
     */
    private long time;
    /**
     * Bộ đếm hiện tại
     */
    private AtomicInteger reqCount = new AtomicInteger(0);

    public boolean limit() {
        long now = System.currentTimeMillis();
        if (now < time + timeout) {
            // Trong đơn vị thời gian
            reqCount.addAndGet(1);
            return reqCount.get() <= limit;
        } else {
            // Vượt quá đơn vị thời gian
            time = now;
            reqCount = new AtomicInteger(0);
            return true;
        }
    }
}

```

Nhược điểm:

Giả sử lúc 00:01 phát sinh một request, trong khoảng 00:01-00:58 không gửi request nào nữa, đến 00:59 gửi toàn bộ số request còn lại `n-1` (n là số lượng request bị giới hạn), rồi đến 00:01 của phút tiếp theo gửi n request; như vậy trong 2 giây số request đến nơi đã lên tới `2n - 1`.

Giả sử số request mỗi phút là 60, mỗi giây xử lý được 1 request; người dùng gửi 60 request lúc 00:59 và gửi 60 request lúc 01:00, khi đó trong 2 giây có 120 request (mỗi giây 60 request), vượt xa ngưỡng số lượng xử lý mỗi giây.

### Cửa sổ trượt

#### Cách triển khai

Cửa sổ trượt là cải tiến của phương pháp bộ đếm: thêm một đơn vị đo độ mịn thời gian, chia một phút thành nhiều phần bằng nhau (6 phần, mỗi phần 10 giây), đặt một bộ đếm độc lập trên mỗi phần; khi có request trong khoảng 00:00-00:09 thì bộ đếm cộng thêm 1. Số phần chia càng lớn thì thống kê giới hạn lưu lượng càng chi tiết.

```java
package com.example.demo1.service;

import java.util.Iterator;
import java.util.Random;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.stream.IntStream;

public class TimeWindow {
    private ConcurrentLinkedQueue<Long> queue = new ConcurrentLinkedQueue<Long>();

    /**
     * Số giây của khoảng
     */
    private int seconds;

    /**
     * Giới hạn lưu lượng tối đa
     */
    private int max;

    public TimeWindow(int max， int seconds) {
        this.seconds = seconds;
        this.max = max;

        /**
         * Luồng chạy vĩnh viễn thực hiện tác vụ dọn dẹp queue
         */
        new Thread(() -> {
            while (true) {
                try {
                    // Chờ (số giây của khoảng - 1) rồi thực hiện thao tác dọn dẹp
                    Thread.sleep((seconds - 1) * 1000L);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
                clean();
            }
        }).start();

    }

    public static void main(String[] args) throws Exception {

        final TimeWindow timeWindow = new TimeWindow(10， 1);

        // Kiểm thử với 3 luồng
        IntStream.range(0， 3).forEach((i) -> {
            new Thread(() -> {

                while (true) {

                    try {
                        Thread.sleep(new Random().nextInt(20) * 100);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                    timeWindow.take();
                }

            }).start();

        });

    }

    /**
     * Lấy token và thêm thời điểm
     */
    public void take() {

        long start = System.currentTimeMillis();
        try {

            int size = sizeOfValid();
            if (size > max) {
                System.err.println("超限");

            }
            synchronized (queue) {
                if (sizeOfValid() > max) {
                    System.err.println("超限");
                    System.err.println("queue中有 " + queue.size() + " 最大数量 " + max);
                }
                this.queue.offer(System.currentTimeMillis());
            }
            System.out.println("queue中有 " + queue.size() + " 最大数量 " + max);

        }

    }

    public int sizeOfValid() {
        Iterator<Long> it = queue.iterator();
        Long ms = System.currentTimeMillis() - seconds * 1000;
        int count = 0;
        while (it.hasNext()) {
            long t = it.next();
            if (t > ms) {
                // Nằm trong phạm vi thời gian thống kê hiện tại
                count++;
            }
        }

        return count;
    }

    /**
     * Dọn dẹp các thời điểm đã hết hạn
     */
    public void clean() {
        Long c = System.currentTimeMillis() - seconds * 1000;

        Long tl = null;
        while ((tl = queue.peek()) != null && tl < c) {
            System.out.println("清理数据");
            queue.poll();
        }
    }

}

```

### Leaky Bucket (thùng rò)

#### Cách triển khai

Quy định một thùng có dung tích cố định, có nước chảy vào và có nước chảy ra. Với nước chảy vào, chúng ta không thể ước lượng được số lượng và tốc độ nước vào; với nước chảy ra, chúng ta có thể kiểm soát tốc độ.

```java
public class LeakBucket {
    /**
     * Thời gian
     */
    private long time;
    /**
     * Tổng dung lượng
     */
    private Double total;
    /**
     * Tốc độ nước chảy ra
     */
    private Double rate;
    /**
     * Dung lượng hiện tại
     */
    private Double nowSize;

    public boolean limit() {
        long now = System.currentTimeMillis();
        nowSize = Math.max(0， (nowSize - (now - time) * rate));
        time = now;
        if ((nowSize + 1) < total) {
            nowSize++;
            return true;
        } else {
            return false;
        }

    }
}
```

### Token Bucket (thùng token)

#### Cách triển khai

Quy định một thùng có dung tích cố định, token được nạp vào thùng với tốc độ cố định; khi thùng đầy thì token không được cho thêm vào nữa; mỗi khi có một request đến thì lấy một token ra khỏi thùng; nếu trong thùng không còn token thì không thể thực hiện request.

```java
public class TokenBucket {
    /**
     * Thời gian
     */
    private long time;
    /**
     * Tổng dung lượng
     */
    private Double total;
    /**
     * Tốc độ đưa token vào
     */
    private Double rate;
    /**
     * Dung lượng hiện tại
     */
    private Double nowSize;

    public boolean limit() {
        long now = System.currentTimeMillis();
        nowSize = Math.min(total， nowSize + (now - time) * rate);
        time = now;
        if (nowSize < 1) {
            // Trong thùng không có token
            return false;
        } else {
            // Có token
            nowSize -= 1;
            return true;
        }
    }

}
```

## Sử dụng trong công việc

### Spring Cloud Gateway

-   Spring Cloud Gateway mặc định dùng Redis để giới hạn lưu lượng; tác giả thường chỉ chỉnh sửa tham số, tức là dùng sẵn, chứ không triển khai lại các thuật toán nêu trên từ đầu.

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis-reactive</artifactId>
</dependency>
```

```yaml
spring:
    cloud:
        gateway:
            routes:
                - id: requestratelimiter_route

                  uri: lb://pigx-upms
                  order: 10000
                  predicates:
                      - Path=/admin/**

                  filters:
                      - name: RequestRateLimiter

                        args:
                            redis-rate-limiter.replenishRate: 1 # Dung tích của thùng token
                            redis-rate-limiter.burstCapacity: 3 # Tốc độ chảy mỗi giây
                            key-resolver: '#{@remoteAddrKeyResolver}' #Biểu thức SPEL để lấy bean tương ứng

                      - StripPrefix=1
```

```java
@Bean
KeyResolver remoteAddrKeyResolver() {
    return exchange -> Mono.just(exchange.getRequest().getRemoteAddress().getHostName());
}
```

### Sentinel

-   Kiểm soát lưu lượng của từng URL thông qua cấu hình

```xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
</dependency>
```

```yaml
spring:
    cloud:
        nacos:
            discovery:
                server-addr: localhost:8848
        sentinel:
            transport:
                dashboard: localhost:8080
                port: 8720
            datasource:
                ds:
                    nacos:
                        server-addr: localhost:8848
                        dataId: spring-cloud-sentinel-nacos
                        groupId: DEFAULT_GROUP
                        rule-type: flow
                        namespace: xxxxxxxx
```

-   Nội dung cấu hình được chỉnh sửa trên Nacos

```json
[
    {
        "resource": "/hello",
        "limitApp": "default",
        "grade": 1,
        "count": 1,
        "strategy": 0,
        "controlBehavior": 0,
        "clusterMode": false
    }
]
```

-   resource: tên tài nguyên, tức là đối tượng mà quy tắc giới hạn lưu lượng tác động.
-   limitApp: nguồn gọi mà kiểm soát luồng nhắm tới; nếu là default thì không phân biệt nguồn gọi.
-   grade: loại ngưỡng giới hạn lưu lượng, chế độ QPS hoặc số luồng; 0 nghĩa là giới hạn theo số lượng đồng thời, 1 nghĩa là kiểm soát lưu lượng theo QPS.
-   count: ngưỡng giới hạn lưu lượng
-   strategy: căn cứ để xét là chính tài nguyên đó, hay các tài nguyên liên quan khác (refResource), hay theo điểm vào của chuỗi gọi
-   controlBehavior: hiệu quả kiểm soát luồng (từ chối trực tiếp / xếp hàng chờ / chế độ khởi động chậm)
-   clusterMode: có phải chế độ cụm (cluster) hay không

### Tổng kết

> Sentinel và Spring Cloud Gateway đều là các framework giới hạn lưu lượng rất tốt, nhưng trong quá trình sử dụng của tôi chưa đưa [spring-cloud-alibaba](https://github.com/alibaba/spring-cloud-alibaba) vào dự án, nên tôi sẽ chọn **Spring Cloud Gateway**; khi đã tích hợp đầy đủ hoặc tích hợp Nacos vào dự án thì dùng Sentinel sẽ có trải nghiệm tốt hơn.
