---
source:
  locale: zh
  slug: find-no-repeat-number
  hash: 'sha256:v1:bc683098810cbd47df180b9fa79c6c5b85d387bfbc535b303398dc96fcb8cf92'
status: machine
translatedAt: '2026-10-14'
---
# How to Find Non-Repeating Integers in Large Amounts of Data?

## Problem Description

Find the non-repeating integers among 250 million integers. Note: memory is not large enough to hold all 250 million integers.

## Approach

### Method 1: divide and conquer

Similar to the previous problems: first divide the 250 million numbers into multiple small files, use a HashSet/HashMap to find the non-repeating integers in each small file, then merge the sub-results to get the final result.

### Method 2: bitmap

A **bitmap** uses one or more bits to mark the value corresponding to an element, where the key is the element itself. Storing data in units of bits can save a great deal of storage space.

A bitmap uses a bit array to indicate whether certain elements exist. It can be used for fast lookup, duplicate detection, sorting and so on. Not clear? Let me start with a small example.

Suppose we want to sort 5 elements (6, 4, 2, 1, 5) in `[0,7]` using a bitmap. The range 0~7 contains 8 numbers in total, so only 8 bits, that is 1 byte, are needed. First set every bit to 0:

```
0 0 0 0 0 0 0 0
```

Then traverse the 5 elements. First we meet 6, so the bit at index 6 is changed from 0 to 1; then we meet 4, so the bit at index 4 is changed from 0 to 1:

```
0 0 0 0 1 0 1 0
```

Continue the traversal. When it finishes, the bit array looks like this:

```
0 1 1 0 1 1 1 0
```

The index of every bit that is 1 represents a number:

```
for i in range(8):
    if bits[i] == 1:
        print(i)
```

In this way we have actually implemented sorting.

For problems involving integers, the **bitmap** is a very practical algorithm. Suppose an int takes 4B, that is 32 bits; then the number of integers we can represent is 2<sup>32</sup>.

**For this problem**, we use 2 bits to represent the state of each number:

-   00 means the number has not appeared;
-   01 means the number has appeared once (that is, the non-repeating integers the problem asks for);
-   10 means the number has appeared multiple times.

So the memory needed for these 2<sup>32</sup> integers in total is 2<sup>32</sup>\*2b=1GB. Therefore, when the available memory exceeds 1GB, the bitmap method can be used. Assuming memory meets the needs of the bitmap method, do the following:

Traverse the 250 million integers and look at the corresponding bit in the bitmap: if it is 00, change it to 01; if it is 01, change it to 10; if it is 10, leave it unchanged. When the traversal ends, scan the bitmap and output the integers whose bits are 01.

Of course, this problem explicitly states that **memory is not large enough to hold the 250 million integers**. The memory size of 250 million integers is 2.5e8/1024/1024/1024 \* 4=3.72GB. If memory is larger than 1GB, the problem can be solved with the bitmap method.

## Summary

**For the problem of determining whether numbers repeat**, the bitmap is a very efficient method, provided that memory can meet the storage space the bitmap requires.
