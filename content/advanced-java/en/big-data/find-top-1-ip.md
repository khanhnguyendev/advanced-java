---
source:
  locale: zh
  slug: find-top-1-ip
  hash: 'sha256:v1:f7b8b70938bfb292bb0040d68e7b0843fd9e1c279216ae45bad0657fb2d03d09'
status: machine
translatedAt: '2026-10-14'
---
# How to Find the IP That Visited Baidu Most on a Given Day?

## Problem Description

A large-scale log dataset is stored in one very large file that cannot be read into memory directly. Extract the IP that visited Baidu the most times on a given day.

## Solution approach

This problem only cares about the IP that visited Baidu the most on one particular day. So first traverse the file once and record the relevant information about IPs visiting Baidu on that day into a separate large file. The next steps are the same as in the previous problem: roughly, first hash-map the IPs, then use a HashMap to count the occurrence count of each IP, and finally find the IP with the highest occurrence count.

> Note: only the IP with the most occurrences is needed here, so a heap is unnecessary; a single variable max is enough.

## Method Summary

1. Divide and conquer, using hash modulo;
2. Use a HashMap to count the frequency;
3. To find the **largest** TopN, use a **min-heap**; to find the **smallest** TopN, use a **max-heap**.
