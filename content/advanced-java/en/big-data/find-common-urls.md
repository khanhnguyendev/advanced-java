---
source:
  locale: zh
  slug: find-common-urls
  hash: 'sha256:v1:f713d4336e953e34cc11d25d1589bbdd3bd741e541dfb01b5f46bf0ff94db75a'
status: machine
translatedAt: '2026-10-14'
---
# How to Find Identical URLs Among Large Amounts of URLs?

## Problem Description

Given two files, a and b, each storing 5 billion URLs, with each URL taking 64B and a memory limit of 4G, find the URLs common to both files.

## Approach

### 1. Divide and conquer

Each URL takes 64B, so 5 billion URLs take about 320GB.

> 5, 000, 000, 000 _ 64B ≈ 5GB _ 64 = 320GB

Since memory is only 4G, we cannot load all the URLs into memory at once. For problems of this type, the usual approach is **divide and conquer**: split the URLs of a file into multiple small files by some feature, so that each small file is no larger than 4G and can be read into memory and processed.

**The idea is as follows**:

First traverse file a, compute `hash(URL) % 1000` for each URL, and store the URL into a<sub>0</sub>, a<sub>1</sub>, a<sub>2</sub>, ..., a<sub>999</sub> according to the result, so each file is about 300MB. Traverse file b in the same way and store its URLs into b<sub>0</sub>, b<sub>1</sub>, b<sub>2</sub>, ..., b<sub>999</sub>. After this step, all URLs that could be identical are in corresponding small files: a<sub>0</sub> corresponds to b<sub>0</sub>, ..., a<sub>999</sub> corresponds to b<sub>999</sub>, and non-corresponding small files cannot contain identical URLs. So all we need to do is find the identical URLs in each of these 1000 pairs of small files.

Next, traverse a<sub>i</sub> ( `i∈[0,999]` ) and store its URLs in a HashSet. Then traverse each URL in b<sub>i</sub> and check whether it exists in the HashSet. If it does, it is a common URL and can be saved to a separate file.

### 2. Is a prefix tree feasible?

> In general, URLs do not differ much in length, and most of their leading characters are the same. In this case, a **trie** (prefix tree) is a very good data structure for storage: it lowers the storage cost while improving query efficiency.
>
> Feedback from [@ChunelFeng](https://github.com/ChunelFeng). [#212](https://github.com/doocs/advanced-java/issues/212)

An issue asked whether a trie can be used directly, so let us estimate whether this approach is feasible.

Background: a machine with 4G of memory, processing 320G of data.

The problem states 64B. Counting one character as one byte, that is 64 characters (we consider the extreme case here). We will not repeat the definition of a trie; see [trie](https://doocs.github.io/leetcode/tags/#%E5%A4%9A%E7%BA%BF%E7%A8%8B).

- **Tree height**: the length of a URL is the height the tree can reach, so at most 64 levels.

- **Number of children per node**: since these are URLs, besides digits and letters there are also characters such as `%`, `/`, `:` etc. To simplify the calculation and make it easier to follow, we only use English letters plus digits: 62+10=72. That is, a node has at most 72 children, taking 72B.

- **Total size of nodes**: since the 320G sample is large enough, consider the worst case, where the final tree is a full 72-ary tree of 64 levels. The memory used is the number of nodes \* the node size:

  - Number of nodes: for a full tree with N = 64 levels and K = 72 branches, the number of nodes (a geometric series sum) is `1 * (1-72^64)/ (1 - 72) = (72^64 - 1)/ (71)`, estimated as `71^63` nodes.

  - Node size: each node takes 1B
    - the current character: 1B
    - whether a value exists at the current position: 1b (the usual size of a Bool), taking the minimum here.

So the total size is `71^63 * 1B/ 1000 ≈ 71^60 KB ≈ 71 ^ 63 GB`. This value is already huge, and we took the minimum at every step of the estimate.

---

At this point some readers may be frightened: where did so much data come from? Doesn't a trie compress data?

The result above is not accurate. For 320G of data, the number of nodes generated is at most 320G (when the paths do not overlap at all), because the full N-ary tree discussed above cannot actually form; only a small part of it is filled. Even so, a single node cannot handle this amount of data, and the approach is neither scalable nor stable. So a plain trie depends too heavily on the data distribution. If most of your URLs are identical, the compression ratio is very high and processing 320G on a single 4G machine may be possible, but for the application scenario the interviewer wants to hear about, that probability is too small. So we still need divide and conquer to reduce memory.

Optimization on top of approach 1: the previous method used a HashSet to detect duplicates. Hashing is more efficient than accessing a trie, while a trie can reduce memory.

So in an interview you can mention the trie approach. In this scenario, parsing 320G of offline data is not time-sensitive, so we can trade speed for space.

- Approach 1 mentioned single files of 300MB+. With a trie these 300MB+ may be compressed to, say, 200MB+. Considering machine utilization, in scenarios where the CPU is plentiful you can introduce concurrency: since the compression ratio is 1/3, the remaining space can be freed up to load more files for concurrent processing and raise throughput.

- If the CPU is not plentiful, for example a single core, you can consider increasing the size of the split files. The original 1000 files drop to 200, so the file size is enlarged two times, from 300MB to 300\*5 = 1.5G, which fills the memory of a 4G machine, reduces the number of IO operations and the copying from kernel mode to user mode. You could also mention DMA.

> Translator's note: the original says "two times"; the usual answer, by the arithmetic that follows, is five.

## Summary

### Divide and conquer

1. Divide and conquer, using hash modulo;
1. Count each sub-file with a HashSet.

### Prefix tree

1. Use the common prefixes of strings, trading speed to reduce memory usage.
