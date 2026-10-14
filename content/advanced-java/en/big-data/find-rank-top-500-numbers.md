---
source:
  locale: zh
  slug: find-rank-top-500-numbers
  hash: 'sha256:v1:1d885208a842395e680ff3a88a487c502a6bdbcf1348a9d31cc2eb8b6c579774'
status: machine
translatedAt: '2026-10-14'
---
# How to Find the Top 500 Numbers?

## Problem Description

There are 20 arrays, each with 500 elements in sorted order. How can we find the top 500 numbers among these 20\*500 numbers?

## Approach

For TopK problems, the most common method is heap sort. For this problem, assuming the arrays are sorted in descending order, the following method can be used:

First build a max-heap whose size equals the number of arrays, that is 20, and put the largest value of each array into the heap.

Then remove the top element of the heap and save it into another array of size 500, then insert into the max-heap the next element of the array that the removed element came from.

Repeat the steps above until the 500th element has been removed, which means the largest 500 numbers have been found.

> So that after taking a value out of the heap we know which array it came from, and can take the next value from that array, we can store an array pointer in the heap and provide a comparison method for this pointer.

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
     * The value
     */
    private int value;

    /**
     * The array the value came from
     */
    private int source;

    /**
     * The index of the value within the array
     */
    private int index;

    public DataWithSource(int value, int source, int index) {
        this.value = value;
        this.source = source;
        this.index = index;
    }

    /**
     *
     * PriorityQueue is implemented as a min-heap, so here we change
     * the comparison logic of two integers to make PriorityQueue a max-heap
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

        // Create an array of size columnSize to hold the result
        int[] result = new int[columnSize];

        PriorityQueue<DataWithSource> maxHeap = new PriorityQueue<>();
        for (int i = 0; i < rowSize; ++i) {
            // Put the largest element of each array into the heap
            DataWithSource d = new DataWithSource(data[i][0], i, 0);
            maxHeap.add(d);
        }

        int num = 0;
        while (num < columnSize) {
            // Remove the top element of the heap
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

## Summary

For TopK, why not consider heap sort?
