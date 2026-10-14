---
source:
  locale: zh
  slug: sort-the-query-strings-by-counts
  hash: 'sha256:v1:eb07fb1afff0359fd5772c87e8de8d19a1c1bae476ac20ce05780cf7ae4ef778'
status: machine
translatedAt: '2026-10-14'
---
# How to Sort Queries by Frequency?

## Problem Description

There are 10 files of 1G each. Each line of each file holds a user query, and queries may repeat within each file. Sort the queries by frequency.

## Approach

If the queries are highly repetitive, you can consider reading all the queries into memory at once. If the repetition rate is low, the available memory cannot hold all the queries, and then divide and conquer or other methods are needed.

### Method 1: HashMap

If the repetition rate is high, the total number of distinct queries is small, so you can load all the queries into a HashMap in memory. Then sort by the number of times each query appears.

### Method 2: divide and conquer

Divide and conquer needs the scale of the split to be determined by the data volume and the available memory. For this problem, traverse the queries in the 10 files sequentially and divide them into 10 small files using the hash function `hash(query) % 10`. Then count the occurrences of each query in every small file with a HashMap, sort by count, and write the result to a separate file.

Next, sort all the files by query count. Merge sort can be used here (since not all queries can be read into memory, external sorting is required).

## Summary

-   If memory is enough, read everything in and sort directly;
-   If memory is not enough, first divide into small files, sort each small file, then merge them with external sorting.
