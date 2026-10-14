---
source:
  locale: zh
  slug: find-rank-top-500-numbers
  hash: 'sha256:v1:1d885208a842395e680ff3a88a487c502a6bdbcf1348a9d31cc2eb8b6c579774'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để tìm 500 số đứng đầu?

## Mô tả đề bài

Có 20 mảng, mỗi mảng có 500 phần tử và được sắp xếp có thứ tự. Làm thế nào để tìm 500 số đứng đầu trong 20\*500 số này?

## Hướng giải

Với bài toán TopK, phương pháp thường dùng nhất là sắp xếp vun đống (heap sort). Với đề bài này, giả sử các mảng được sắp xếp giảm dần, có thể dùng phương pháp sau:

Trước hết xây dựng max-heap có kích thước bằng số lượng mảng, tức là 20, lưu giá trị lớn nhất của mỗi mảng vào heap.

Tiếp đó xóa phần tử ở đỉnh heap, lưu vào một mảng khác có kích thước 500, rồi chèn vào max-heap phần tử kế tiếp trong mảng chứa phần tử vừa xóa.

Lặp lại các bước trên cho đến khi xóa xong phần tử thứ 500, tức là đã tìm ra 500 số lớn nhất.

> Để sau khi lấy một dữ liệu ra khỏi heap, ta biết nó được lấy từ mảng nào và từ đó có thể lấy giá trị tiếp theo của mảng này, có thể lưu con trỏ của mảng vào heap, và cung cấp phương thức so sánh kích thước cho con trỏ này.

```java
import lombok.Data;

import java.util.Arrays;
import java.util.PriorityQueue;

/**
 * @author https://github.com/yanglbme
 */
@Data
public class DataWithSource implements Comparable<DataWithSource> {
    /**
     * Giá trị
     */
    private int value;

    /**
     * Ghi lại mảng nguồn của giá trị
     */
    private int source;

    /**
     * Ghi lại chỉ số của giá trị trong mảng
     */
    private int index;

    public DataWithSource(int value, int source, int index) {
        this.value = value;
        this.source = source;
        this.index = index;
    }

    /**
     *
     * Vì PriorityQueue được hiện thực bằng min-heap, ở đây thay đổi
     * logic so sánh của hai số nguyên để biến PriorityQueue thành max-heap
     */
    @Override
    public int compareTo(DataWithSource o) {
        return Integer.compare(o.getValue(), this.value);
    }
}

class Test {
    public static int[] getTop(int[][] data) {
        int rowSize = data.length;
        int columnSize = data[0].length;

        // Tạo một mảng có kích thước columnSize để lưu kết quả
        int[] result = new int[columnSize];

        PriorityQueue<DataWithSource> maxHeap = new PriorityQueue<>();
        for (int i = 0; i < rowSize; ++i) {
            // Đưa phần tử lớn nhất của mỗi mảng vào heap
            DataWithSource d = new DataWithSource(data[i][0], i, 0);
            maxHeap.add(d);
        }

        int num = 0;
        while (num < columnSize) {
            // Xóa phần tử ở đỉnh heap
            DataWithSource d = maxHeap.poll();
            result[num++] = d.getValue();
            if (num >= columnSize) {
                break;
            }

            d.setValue(data[d.getSource()][d.getIndex() + 1]);
            d.setIndex(d.getIndex() + 1);
            maxHeap.add(d);
        }
        return result;

    }

    public static void main(String[] args) {
        int[][] data = {
                {29, 17, 14, 2, 1},
                {19, 17, 16, 15, 6},
                {30, 25, 20, 14, 5},
        };

        int[] top = getTop(data);
        System.out.println(Arrays.toString(top)); // [30, 29, 25, 20, 19]
    }
}
```

## Tổng kết phương pháp

Tìm TopK, sao không cân nhắc sắp xếp vun đống?
