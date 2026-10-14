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

A large-scale volume of log data is stored in a single huge file that cannot be read into memory directly. The task is to extract the IP that visited Baidu the most times on a given day.

## Solution Approach

This problem only cares about the IP that visited Baidu the most on one particular day. So you can first make one pass over the file and record the information about IPs that visited Baidu on that day into a separate large file. The method that follows is the same as in the previous problem: roughly, first hash-map the IPs, then use a HashMap to count the occurrences of each IP, and finally find the IP with the highest count.

> Note: here we only need the IP with the most occurrences, so there is no need for a heap; a single variable max is enough.

## Method Summary

1. Divide and conquer, using hash modulo;
2. Use a HashMap to count frequencies;
3. To find the **largest** TopN, use a **min-heap**; to find the **smallest** TopN, use a **max-heap**.
