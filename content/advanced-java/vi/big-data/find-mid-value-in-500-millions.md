---
source:
  locale: zh
  slug: find-mid-value-in-500-millions
  hash: 'sha256:v1:cbca4f4a2c5368b068eb71b5c5b61fc90e8e8d6594acd2e842f5a339c092a5f2'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để tìm số trung vị trong 5 trăm triệu số?

## Mô tả đề bài

Tìm số trung vị trong 500 triệu số. Sau khi sắp xếp dữ liệu, số ở vị trí chính giữa là số trung vị. Khi số mẫu là số lẻ, số trung vị là số thứ `(N+1)/2`; khi số mẫu là số chẵn, số trung vị là trung bình của số thứ `N/2` và số thứ `1+N/2`.

## Hướng giải

Nếu đề bài này không giới hạn kích thước bộ nhớ thì có thể đọc tất cả các số vào bộ nhớ, sắp xếp rồi tìm số trung vị. Nhưng ngay cả thuật toán sắp xếp tốt nhất cũng có độ phức tạp thời gian là `O(NlogN)` . Ở đây dùng các phương pháp khác.

### Phương pháp một: hai heap

Duy trì hai heap, một max-heap và một min-heap. Số lớn nhất trong max-heap **nhỏ hơn hoặc bằng** số nhỏ nhất trong min-heap; đảm bảo chênh lệch số phần tử giữa hai heap không quá 1.

Nếu tổng số dữ liệu là **số chẵn**, sau khi hai heap được xây xong, **số trung vị là trung bình của hai phần tử ở đỉnh hai heap**. Khi tổng số dữ liệu là **số lẻ**, dựa vào kích thước của hai heap, **số trung vị chắc chắn nằm ở đỉnh của heap có nhiều dữ liệu hơn**.

```java
class MedianFinder {

    private PriorityQueue<Integer> maxHeap;
    private PriorityQueue<Integer> minHeap;

    /** initialize your data structure here. */
    public MedianFinder() {
        maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
        minHeap = new PriorityQueue<>(Integer::compareTo);
    }

    public void addNum(int num) {
        if (maxHeap.isEmpty() || maxHeap.peek() > num) {
            maxHeap.offer(num);
        } else {
            minHeap.offer(num);
        }

        int size1 = maxHeap.size();
        int size2 = minHeap.size();
        if (size1 - size2 > 1) {
            minHeap.offer(maxHeap.poll());
        } else if (size2 - size1 > 1) {
            maxHeap.offer(minHeap.poll());
        }
    }

    public double findMedian() {
        int size1 = maxHeap.size();
        int size2 = minHeap.size();

        return size1 == size2
            ? (maxHeap.peek() + minHeap.peek()) * 1.0 / 2
            : (size1 > size2 ? maxHeap.peek() : minHeap.peek());
    }
}
```

> Xem [LeetCode No.295](https://leetcode.com/problems/find-median-from-data-stream/)

Phương pháp trên cần nạp toàn bộ dữ liệu vào bộ nhớ. Khi lượng dữ liệu rất lớn thì không thể làm như vậy, do đó phương pháp này **phù hợp với trường hợp lượng dữ liệu nhỏ**. 500 triệu số, mỗi số chiếm 4B, tổng cộng cần 2G bộ nhớ. Nếu bộ nhớ khả dụng không đủ 2G thì không thể dùng phương pháp này, phần dưới giới thiệu một phương pháp khác.

### Phương pháp hai: chia để trị

Tư tưởng của chia để trị là dần chuyển một bài toán lớn thành các bài toán có quy mô nhỏ hơn để giải.

Với đề bài này, đọc tuần tự 500 triệu số, với số num đọc được, nếu bit cao nhất trong dạng nhị phân của nó là 1 thì ghi số này vào f1, ngược lại ghi vào f0. Qua bước này, có thể chia 500 triệu số thành hai phần, và các số trong f0 đều lớn hơn các số trong f1 (bit cao nhất là bit dấu).

Sau khi chia, có thể dễ dàng biết số trung vị nằm trong f0 hay f1. Giả sử f1 có 100 triệu số thì số trung vị chắc chắn nằm trong f0, và là trung bình của số thứ 150 triệu theo thứ tự từ nhỏ đến lớn trong f0 với số đứng ngay sau nó.

> **Lưu ý**, số trung vị của 500 triệu số là trung bình của số thứ 250 triệu và số liền kề bên phải. Nếu f1 có 100 triệu số thì số trung vị là trung bình của hai số tính từ số thứ 150 triệu trong f0.

Với f0 có thể dùng bit cao thứ hai của nhị phân để tiếp tục chia tệp làm đôi, cứ chia như vậy cho đến khi tệp sau khi chia có thể được nạp vào bộ nhớ, nạp dữ liệu vào bộ nhớ xong thì sắp xếp trực tiếp, rồi tìm số trung vị.

> **Chú ý**, khi tổng số dữ liệu là số chẵn, nếu sau khi chia hai tệp có số dữ liệu bằng nhau thì số trung vị là trung bình của giá trị lớn nhất trong tệp chứa dữ liệu nhỏ hơn và giá trị nhỏ nhất trong tệp chứa dữ liệu lớn hơn.

## Tổng kết phương pháp

Chia để trị, quá tuyệt!
