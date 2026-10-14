---
source:
  locale: zh
  slug: count-different-phone-numbers
  hash: 'sha256:v1:77e1fe66bad3b320a08911d3829bd7d8786b140cf15252b204be399c064c3cf2'
status: machine
translatedAt: '2026-10-14'
---
# How to Count Distinct Phone Numbers?

## Problem Description

A file contains some phone numbers, each an 8-digit number. Count the number of distinct numbers.

## Approach

At heart this is again a problem of **duplicate data**, and for this kind of problem the bitmap should be the first thing to consider.

In this problem, 8-digit phone numbers can represent 10<sup>8</sup> numbers, that is 100 million. If each number is represented by one bit, we need 100 million bits in total, about 12M of memory.

**The idea is as follows**:

Allocate a bitmap array of length 100 million, initialized to 0. Then traverse all phone numbers and set the bit corresponding to each number to 1. After the traversal, a bit of 1 means the phone number exists in the file, otherwise it does not. The number of bits with value 1 is the number of distinct phone numbers.

## Summary

For duplicate-data problems, remember to consider the bitmap.
