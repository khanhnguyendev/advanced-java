---
source:
  locale: zh
  slug: find-hotest-query-string
  hash: 'sha256:v1:dd01a7dbc95607c6dcc541cfadf98d9dd49a75664b6fcb9cadfb2340ca1309a0'
status: machine
translatedAt: '2026-10-14'
---
# How to Find the Hottest Query Strings?

## Problem Description

A search engine records, in a log file, every query string users use in each search. Each query string is no longer than 255 bytes.

Suppose there are currently 10 million records (the query strings are highly repetitive: although there are 10 million in total, after removing duplicates there are no more than 3 million). Find the 10 hottest query strings, using no more than 1G of memory. (The higher the repetition of a query string, the more users queried it, and the hotter it is.)

## Approach

Each query string is at most 255B, so 10 million strings need about 2.55G of memory. Therefore we cannot read all the strings into memory for processing.

### Method 1: divide and conquer

Divide and conquer is still a very practical method.

Split the data into multiple small files so that the strings of a single small file can be loaded directly into memory, then find the 10 strings with the most occurrences in each file. Finally, use a min-heap to find the 10 strings with the most occurrences across all files.

This method works, but it is not the best. Other methods are introduced below.

### Method 2: HashMap

Although the total number of strings is large, there are no more than 3 million after deduplication, so we can consider keeping all strings and their occurrence counts in a HashMap. The space it takes is 3 million\*(255+4)≈777M (where 4 is the 4 bytes taken by an integer). So 1G of memory is more than enough.

**The idea is as follows**:

First traverse the strings. If a string is not in the map, store it directly with value 1; if it is in the map, add 1 to its value. This step has time complexity `O(N)`.

Then traverse the map and build a min-heap of 10 elements. If the occurrence count of the string being traversed is greater than that of the string at the top of the heap, replace it and adjust the heap back into a min-heap.

When the traversal ends, the 10 strings in the heap are the strings with the most occurrences. This step has time complexity `O(Nlog10)`.

### Method 3: prefix tree

Method 2 used a HashMap to count occurrences. When these strings share many common prefixes, a prefix tree can be used instead: each node stores the number of occurrences of the string, and 0 means it has not appeared.

**The idea is as follows**:

While traversing the strings, search the prefix tree. If the string is found, add 1 to the count stored in its node; otherwise build new nodes for the string and, once built, set the occurrence count in the leaf node to 1.

Finally, still use a min-heap to rank the strings by occurrence count.

## Summary

A prefix tree is often used to count how many times strings appear. Another major use of it is string lookup, such as checking whether duplicate strings exist.
