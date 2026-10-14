---
source:
  locale: zh
  slug: find-top-100-words
  hash: 'sha256:v1:45434b898716957f86e466f849239c3f736f65aeca9d2acdc750035a8ede494e'
status: machine
translatedAt: '2026-10-14'
---
# How to Find High-Frequency Words in Large Amounts of Data?

## Problem Description

There is a 1GB file in which each line is a word, each word is no larger than 16B, and the memory limit is 1MB. Return the 100 words with the highest frequency (Top 100).

## Approach

Because of the memory limit, we still cannot read all the words of the large file into memory at once. So we can again use a **divide and conquer** strategy: break the large file into multiple small files, each smaller than 1MB, so that a single small file can be read directly into memory and processed.

**The idea is as follows**:

First traverse the large file. For each word x, compute `hash(x) % 5000` and store words with result i into file a<sub>i</sub>. After the traversal we have 5000 small files, each about 200KB. If some small file is still larger than 1MB, keep splitting it in the same way.

Next, count the 100 most frequent words in each small file. The simplest way is to use a HashMap, where the key is the word and the value is how often the word appears. Specifically: for each word x encountered, if it does not exist in the map, execute `map.put(x, 1)`; if it exists, execute `map.put(x, map.get(x)+1)` to add 1 to its frequency.

Above we counted the frequency of each word in every small file. Next we can find the 100 words with the highest frequency overall by maintaining a **min-heap**. Specifically: traverse each small file in turn and build a **min-heap** of size 100. If the occurrence count of the word being traversed is greater than that of the word at the top of the heap, replace the top word with the new word and readjust into a **min-heap**. When the traversal ends, the words in the min-heap are the 100 words with the highest frequency.

## Summary

1. Divide and conquer, using hash modulo;
2. Count frequencies with a HashMap;
3. To find the **largest** TopN, use a **min-heap**; to find the **smallest** TopN, use a **max-heap**.
