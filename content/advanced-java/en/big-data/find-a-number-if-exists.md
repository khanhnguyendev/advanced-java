---
source:
  locale: zh
  slug: find-a-number-if-exists
  hash: 'sha256:v1:5eb3626b3a104881060604b4bd615db1b56d8feb58f9fc843b55a11da1809773'
status: machine
translatedAt: '2026-10-14'
---
# How to Determine Whether a Number Exists in Large Amounts of Data?

## Problem Description

Given 4 billion unsorted, non-repeating unsigned int integers, and then one more number, how can we quickly determine whether this number is among the 4 billion integers?

## Approach

### Method 1: divide and conquer

This can still be solved with divide and conquer. The method is similar to the earlier ones, so we will not repeat it.

### Method 2: bitmap

Since the range of an unsigned int is `[0, 1 << 32)`, we use `1<<32=4,294,967,296` bits to represent each number. All bits are initially 0, so the total memory required is 4,294,967,296b≈512M.

We read the 4 billion integers and set the corresponding bits to 1. Then we read the number to query and check whether the corresponding bit is 1: if it is 1 the number exists, and if it is 0 it does not.

## Summary

**For determining whether a number exists or whether numbers repeat**, the bitmap is a very efficient method.
