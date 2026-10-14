---
source:
  locale: zh
  slug: find-mid-value-in-500-millions
  hash: 'sha256:v1:cbca4f4a2c5368b068eb71b5c5b61fc90e8e8d6594acd2e842f5a339c092a5f2'
status: machine
translatedAt: '2026-10-14'
---
# How to Find the Median Among 500 Million Numbers?

## Problem Description

Find the median among 500 million numbers. After the data is sorted, the number in the middle position is the median. When the number of samples is odd, the median is the `(N+1)/2`-th number; when the number of samples is even, the median is the average of the `N/2`-th number and the `1+N/2`-th number.

## Approach

If there were no memory limit, we could read all the numbers into memory, sort them, and find the median. But even the best sorting algorithms have time complexity `O(NlogN)`. Here we use other methods.

### Method 1: two heaps

Maintain two heaps, a max-heap and a min-heap. The largest number in the max-heap is **less than or equal to** the smallest number in the min-heap, and the difference in the number of elements between the two heaps is at most 1.

If the total number of data items is **even**, once the two heaps are built, **the median is the average of the two heap-top elements**. When the total is **odd**, depending on the sizes of the two heaps, **the median is certainly the top of the heap with more data**.

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

> See [LeetCode No.295](https://leetcode.com/problems/find-median-from-data-stream/)

This method needs to load all the data into memory, so it cannot be used when the data volume is very large; it is **suitable for small data volumes**. With 500 million numbers at 4B each, 2G of memory is needed in total. If the available memory is less than 2G, this method cannot be used. Another method is introduced below.

### Method 2: divide and conquer

The idea of divide and conquer is to gradually turn a large problem into smaller problems that are solved one by one.

For this problem, read the 500 million numbers sequentially. For each number num read, if the highest bit of its binary representation is 1, write the number to f1; otherwise write it to f0. This step divides the 500 million numbers into two parts, and every number in f0 is greater than every number in f1 (the highest bit is the sign bit).

After the split, it is easy to tell whether the median is in f0 or f1. Suppose f1 holds 100 million numbers; then the median must be in f0, and it is the average of the 150 millionth number in f0 (in ascending order) and the number after it.

> **Hint**: the median of 500 million numbers is the average of the 250 millionth number and its right neighbor. If f1 has 100 million numbers, the median is the average of the two numbers starting from the 150 millionth number in f0.

f0 can be split into two again by its next-highest bit, and so on, until the split files can be loaded into memory. Once the data is loaded into memory, sort it directly and find the median.

> **Note**: when the total number of data items is even, if the two files after splitting contain the same number of items, then the median is the average of the maximum of the file with smaller data and the minimum of the file with larger data.

## Summary

Divide and conquer is really great!
