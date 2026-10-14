---
source:
  locale: zh
  slug: topk-problems-and-solutions
  hash: 'sha256:v1:5c14ca87aec7c9fd86dbee92ae9a5c5d57c294b614e78d335180f39f4d4a3ac0'
status: machine
translatedAt: '2026-10-14'
---
# Common Approaches to TopK Problems in Big Data

Processing large-scale data often involves topK problems. When designing data structures and algorithms, the main things to consider are how well the algorithm (including its data structures) fits the given situation (such as data volume and data type), and what the core bottleneck of the problem is (for example, whether to lower time complexity or space complexity).

First, here are a few common examples of topK problems:

1. Given 100 int numbers, find the largest 10;
1. Given 1 billion int numbers, find the largest 10 (the 10 numbers may be unordered);
1. Given 1 billion int numbers, find the largest 10 (the 10 numbers must be sorted);
1. Given 1 billion non-repeating int numbers, find the largest 10;
1. Given 10 arrays, each with 100 million int numbers, find the largest 10;
1. Given 1 billion numbers of string type, find the largest 10 (only one query is needed);
1. Given 1 billion numbers of string type, find the largest k (repeated queries are needed, where k is a random number).

These problems look similar, but their solutions are very different. With a slight carelessness, the topK problem can become the bottleneck of a system. There is no need to worry too much, though: below I summarize several common approaches. When you meet a problem, master these basic ideas and combine them flexibly, and you will be able to handle whatever comes up.
<br>

## 1. Heap sort

What is meant here is heap sort, not quick sort or Shell sort. Although their theoretical time complexities are all `O(nlogn)`, heap sort has one advantage for topK: it can maintain a min-heap containing only k numbers (think about why it is a min-heap). When a newly added number is greater than the top of the heap, the top element is removed and the new number is added.

Using C++ as the example, the heap in the STL is priority_queue (not set).

```cpp
int main() {
    const int topK = 3;
    vector<int> vec = {4,1,5,8,7,2,3,0,6,9};
    priority_queue<int, vector<int>, greater<>> pq;    // min-heap
    for (const auto& x : vec) {
        pq.push(x);
        if (pq.size() > topK) {
            // If the size is exceeded, pop the top of the heap (the smallest) element
            pq.pop();
        }
    }

    while (!pq.empty()) {
        cout << pq.top() << endl;    // Output in order: 7,8,9
        pq.pop();
    }

    return 0;
}
```

> Java also provides the PriorityQueue data structure.

## 2. Quick-sort-like method

Everyone knows quick sort. For topK problems, quick sort can be improved by recursing on only part of the data. For example, to find the largest 10 among 100 numbers, if after the first pass the povit has been moved to position 80, then we only need to find the largest 10 among the remaining 20 numbers after it.

The advantage is that the theoretical best time complexity can reach `O(n)`, although the average time complexity is still `O(nlogn)`. Note that the k largest numbers found this way are unordered among themselves.

```cpp
int partition(vector<int>& arr, int begin, int end) {
    int left = begin;
    int right = end;
    int povit = arr[begin];

    while (left < right) {
        while (left < right && arr[right] >= povit) {right--;}
        while (left < right && arr[left] <= povit) {left++;}
        if (left < right) {swap(arr[left], arr[right]);}
    }

    swap(arr[begin], arr[left]);
    return left;
}

void partSort(vector<int>& arr, int begin, int end, int target) {
    if (begin >= end) {
        return;
    }

    int povit = partition(arr, begin, end);
    if (target < povit) {
        partSort(arr, begin, povit - 1, target);
    } else if (target > povit) {
        partSort(arr, povit + 1, end, target);
    }
}

vector<int> getMaxNumbers(vector<int>& arr, int k) {
    int size = (int)arr.size();
    // Turn "find the k largest numbers" into "find the size-k smallest numbers"
    int target = size - k;
    partSort(arr, 0, size - 1, target);
    vector<int> ret(arr.end() - k, arr.end());
    return ret;
}

int main() {
    vector<int> vec = {4,1,5,8,7,2,3,0,6,9};
    auto ret = getMaxNumbers(vec, 3);

    for (auto x : ret) {
        cout << x << endl;    // Output 7, 8, 9 (unordered in theory)
    }

    return 0;
}
```

<br>

## 3. Using a bitmap

Sometimes a topK problem involves so much data that memory cannot hold it all. In that case, consider storing the data in a bitmap to make queries easy.

For example, given 10 int values [13, 12, 11, 1, 2, 3, 4, 5, 6, 7], each int takes 4 bytes, so the array takes 40 bytes. Now put them into a bitmap of 16 bool entries, and the result is [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0]. This lowers the space to 4 bytes, and it is also easy to see that the 3 largest numbers are 11, 12 and 13.

Note that a bitmap combined with a skip list often works wonders. For example, the data above can also be recorded as: starting from bit 1, there are 7 consecutive 1s; starting from bit 11, there are 3 consecutive 1s. This reduces the space complexity further.

The advantage of this approach is, of course, lower space complexity. Note, however, that a bitmap is best suited to querying data that is non-repeating and within a range (for example, all data between 0 and 1 billion). When there are duplicates, consider combining it with structures such as hash.
<br>

## 4. Using hash

When you need to compare string-type data by size, consider the hash method.

For example, find the largest 3 among the 10 string numbers ["1001", "23", "1002", "3003", "2001", "1111", "65", "834", "5", "987"]. First hash by length: the maximum length is 4, and 5 strings have length 4. Then hash by the highest digit: 1 string has "3", 1 has "2" and 3 have "1". Next, by designing another hash function or by looping, we find the largest among the 3 strings whose highest digit is "1", which gives the 3 largest values.

This method suits lookups of URLs or phone numbers. The drawback is that if multiple queries are needed, the hash must be computed multiple times, and multiple hash functions must be designed according to the actual situation.
<br>

## 5. Trie

We will not go into the exact structure and query method of a trie here; there is plenty of material online. Here we only discuss its pros and cons.

![](asset:big-data/topk-problems-and-solutions/topk-trie.png)

The idea of a trie is to build index information up front so that it can be queried repeatedly later, and adding or deleting data afterwards is also convenient. It suits situations where repeated queries are needed.

For example, to repeatedly query the k URLs that are largest in character order (for example: z>y>...>b>a), storing the data in a trie is very suitable. It reduces space complexity and speeds up queries.
<br>

## 6. Mixed queries

The methods above are all fairly independent. In real work, the problems we meet are more often mixed problems, which requires us to master the related material and apply it flexibly.

Here is an example: our distributed service runs on 10 different machines, and the service deployed on each machine is requested 10000 times, with the latency of each of these 10000 requests recorded (latency values are int). Among these 10\*10000 requests, find the 50 with the largest latency, from high to low. This is quite realistic. Let us try to combine the methods above to solve it.

### Method 1

First, apply a quick-sort-like method to the 10000 values on each machine to find the top 50 latencies on that machine. At this point the 50 values on each machine are unordered.

Then put the 50 values from each of the 10 machines (500 in total) together and apply the quick-sort-like method again to find the largest 50 (these 50 should be unordered at this point).

Finally, quick sort these 50 values to get the final result.

### Method 2

First, use heap sort to find the 50 highest latencies on each of the 10 machines. At this point these 50 values are already sorted from largest to smallest.

Then take the 5 highest latencies from each of the 10 machines in turn and put them into a min-heap.

Finally, traverse the data on the 10 machines. For each machine, loop downward starting from the 6th value: if the value is greater than the heap top, discard the heap top and add the value, then continue comparing with the next value in the same way. If the value is smaller than the heap top, end the current loop and do the same on the next machine.

I introduced two methods above, not to show which one is better or has lower time complexity, but to say that the same thing can be solved in many different ways, and as the data volume grows, more combinations may be needed. In this field, the data determines the data structure, and the data structure determines the algorithm.

**There is no best method, only programmers who keep looking for better ones. What fits is what is best.**

Keep it up, you can find a better one!!!
