---
source:
  locale: zh
  slug: find-top-1-ip
  hash: 'sha256:v1:f7b8b70938bfb292bb0040d68e7b0843fd9e1c279216ae45bad0657fb2d03d09'
status: machine
translatedAt: '2026-10-14'
---
# How Do You Find the IP That Visited Baidu Most on a Given Day?

## Problem Description

A massive amount of log data is stored in one huge file that cannot be read into memory all at once. Extract the IP that visited Baidu the most times on a given day.

## Solution Approach

This problem only cares about the IP that visited Baidu the most on one particular day. So first, make one pass over the file and record the relevant IP information for that day's visits to Baidu into a separate large file. The rest of the approach is the same as in the previous problem: hash-map the IPs into smaller files, count the occurrences of each IP with a HashMap, and finally find the IP with the highest count.

> Note: since only the single most frequent IP is needed, a heap is not necessary; a single variable max is enough.

## Summary of Methods

1. Divide and conquer: split the data by hash modulo;
2. Count frequencies with a HashMap;
3. To find the **largest** TopN, use a **min-heap**; to find the **smallest** TopN, use a **max-heap**.
