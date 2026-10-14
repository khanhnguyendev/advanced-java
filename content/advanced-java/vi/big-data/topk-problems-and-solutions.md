---
source:
  locale: zh
  slug: topk-problems-and-solutions
  hash: 'sha256:v1:5c14ca87aec7c9fd86dbee92ae9a5c5d57c294b614e78d335180f39f4d4a3ac0'
status: machine
translatedAt: '2026-10-14'
---
# Các cách tiếp cận thường dùng cho bài toán TopK trong dữ liệu lớn

Khi xử lý dữ liệu quy mô lớn, thường gặp bài toán topK. Khi thiết kế cấu trúc dữ liệu và thuật toán, điều cần cân nhắc chủ yếu là mức độ phù hợp giữa thuật toán hiện tại (bao gồm cả cấu trúc dữ liệu) với bối cảnh cho trước (ví dụ quy mô dữ liệu, kiểu dữ liệu), và nút thắt cốt lõi nhất của bài toán hiện tại là gì (giảm độ phức tạp thời gian hay giảm độ phức tạp không gian).

Trước hết, ta hãy xem một vài ví dụ về bài toán topK thường gặp:

1. Cho 100 số int, tìm 10 số lớn nhất trong đó;
1. Cho 1 tỷ số int, tìm 10 số lớn nhất trong đó (10 số này có thể không có thứ tự);
1. Cho 1 tỷ số int, tìm 10 số lớn nhất trong đó (10 số này được sắp xếp theo thứ tự);
1. Cho 1 tỷ số int không trùng lặp, tìm 10 số lớn nhất trong đó;
1. Cho 10 mảng, mỗi mảng có 100 triệu số int, tìm 10 số lớn nhất trong đó;
1. Cho 1 tỷ số kiểu string, tìm 10 số lớn nhất trong đó (chỉ cần truy vấn 1 lần);
1. Cho 1 tỷ số kiểu string, tìm k số lớn nhất trong đó (cần truy vấn lặp lại nhiều lần, trong đó k là một số ngẫu nhiên).

Các bài toán trên trông rất giống nhau, nhưng cách giải lại khác nhau rất nhiều. Chỉ cần sơ suất một chút, bài toán topK có thể trở thành nút thắt của hệ thống. Tuy nhiên cũng không cần lo lắng quá, tiếp theo tôi sẽ tổng hợp một số hướng giải quyết thường gặp; khi gặp bài toán, các bạn hãy nắm vững và kết hợp linh hoạt những ý tưởng cơ bản này là có thể tùy cơ ứng biến.
<br>

## 1. Phương pháp sắp xếp vun đống

Ở đây nói đến phương pháp sắp xếp vun đống (heap sort), chứ không phải quick sort hay shell sort. Tuy độ phức tạp thời gian lý thuyết đều là `O(nlogn)`, nhưng heap sort có một ưu thế khi làm topK, đó là có thể duy trì một min-heap chỉ chứa k số (hãy nghĩ kỹ xem vì sao là min-heap nhé), khi số mới thêm vào lớn hơn số ở đỉnh heap thì loại phần tử đỉnh heap ra và thêm số mới vào.

Dùng C++ để minh họa, heap trong stl là priority_queue (không phải set).

```cpp
int main() {
    const int topK = 3;
    vector<int> vec = {4,1,5,8,7,2,3,0,6,9};
    priority_queue<int, vector<int>, greater<>> pq;    // min-heap
    for (const auto& x : vec) {
        pq.push(x);
        if (pq.size() > topK) {
            // Nếu vượt quá số lượng thì lấy ra dữ liệu ở đỉnh heap (nhỏ nhất)
            pq.pop();
        }
    }

    while (!pq.empty()) {
        cout << pq.top() << endl;    // Xuất lần lượt là 7,8,9
        pq.pop();
    }

    return 0;
}
```

> Java cũng cung cấp cấu trúc dữ liệu PriorityQueue.

## 2. Phương pháp tương tự quick sort

Quick sort thì ai cũng biết; với bài toán topK, có thể cải tiến quick sort, chỉ đệ quy tính toán trên một phần dữ liệu. Ví dụ, tìm 10 số lớn nhất trong 100 số, ở vòng lặp đầu tiên, pivot được di chuyển đến vị trí 80, thì tiếp theo chỉ cần tìm 10 số lớn nhất trong 20 số phía sau.

Ưu thế của cách làm này là độ phức tạp thời gian tối ưu lý thuyết có thể đạt `O(n)`, tuy nhiên độ phức tạp thời gian trung bình vẫn là `O(nlogn)`. Cần nói rõ là với cách này, k số lớn nhất tìm ra không có thứ tự với nhau.

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
    // Chuyển bài toán tìm k số lớn nhất thành tìm size-k số nhỏ nhất
    int target = size - k;
    partSort(arr, 0, size - 1, target);
    vector<int> ret(arr.end() - k, arr.end());
    return ret;
}

int main() {
    vector<int> vec = {4,1,5,8,7,2,3,0,6,9};
    auto ret = getMaxNumbers(vec, 3);

    for (auto x : ret) {
        cout << x << endl;    // Xuất 7, 8, 9 (về lý thuyết không có thứ tự)
    }

    return 0;
}
```

<br>

## 3. Dùng bitmap

Đôi khi bài toán topK gặp lượng dữ liệu quá lớn, bộ nhớ không thể nạp toàn bộ. Lúc này, có thể cân nhắc lưu dữ liệu vào bitmap để tiện truy vấn.

Ví dụ, cho 10 dữ liệu kiểu int là [13, 12, 11, 1, 2, 3, 4, 5, 6, 7], mỗi dữ liệu kiểu int chiếm 4 byte, vậy mảng này chiếm 40 byte. Bây giờ đặt chúng vào một bitmap kiểu bool có độ dài 16, kết quả là [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0], vừa giảm mức chiếm dụng không gian xuống 4 byte, vừa có thể dễ dàng nhìn ra 3 số lớn nhất là 11, 12 và 13.

Cần nói rõ là bitmap kết hợp với skip list thường có hiệu quả bất ngờ. Ví dụ dữ liệu trên còn có thể ghi lại thành: bắt đầu từ bit thứ 1, có 7 bit 1 liên tiếp; bắt đầu từ bit thứ 11, có 3 bit 1 liên tiếp. Làm như vậy, độ phức tạp không gian được giảm thêm một bước.

Ưu thế của cách làm này đương nhiên là giảm độ phức tạp không gian. Tuy nhiên cần lưu ý một điều, bitmap khá phù hợp để truy vấn dữ liệu không trùng lặp và có phạm vi (ví dụ, dữ liệu đều nằm trong khoảng 0 ~ 1 tỷ). Với trường hợp có dữ liệu trùng lặp, có thể cân nhắc dùng kết hợp với các cấu trúc như hash.
<br>

## 4. Dùng hash

Nếu gặp bài toán truy vấn độ lớn của dữ liệu kiểu string, có thể cân nhắc phương pháp hash.

Ví dụ, tìm 3 số lớn nhất trong 10 số kiểu string ["1001", "23", "1002", "3003", "2001", "1111", "65", "834", "5", "987"]. Trước hết ta hash theo độ dài, được độ dài lớn nhất là 4, và có 5 string có độ dài 4. Tiếp theo hash theo giá trị của chữ số cao nhất, thấy có 1 string có chữ số cao nhất là "3", 1 string là "2", 3 string là "1". Tiếp đó, có thể thiết kế thêm hàm hash, hoặc dùng vòng lặp, để tìm ra string lớn nhất trong 3 string có chữ số cao nhất là "1", như vậy là tìm được 3 dữ liệu có giá trị lớn nhất.

Phương pháp này khá phù hợp để truy vấn địa chỉ trang web hoặc số điện thoại. Nhược điểm là nếu cần truy vấn nhiều lần thì phải tính hash nhiều lần, và cần thiết kế nhiều hàm hash tùy theo tình huống thực tế.
<br>

## 5. Cây tiền tố

Cấu trúc cụ thể và cách truy vấn của cây tiền tố (trie) xin không nhắc lại ở đây, bạn có thể tự tìm kiếm trên mạng sẽ có rất nhiều. Ở đây chủ yếu nói về ưu nhược điểm.

![](asset:big-data/topk-problems-and-solutions/topk-trie.png)

Tư tưởng của cây tiền tố vẫn là xây dựng thông tin chỉ mục ở giai đoạn đầu, giai đoạn sau có thể truy vấn lặp lại nhiều lần, và việc thêm xóa dữ liệu về sau cũng rất thuận tiện. Nó khá phù hợp với trường hợp cần truy vấn lặp lại nhiều lần.

Ví dụ, truy vấn lặp lại nhiều lần k url lớn nhất theo thứ tự từ điển (chẳng hạn: z>y>...>b>a), dùng cây tiền tố để lưu dữ liệu một lượt thì rất phù hợp. Vừa giảm độ phức tạp không gian, vừa tăng tốc hiệu quả truy vấn.
<br>

## 6. Truy vấn kết hợp

Các phương pháp trên đều là những phương pháp khá độc lập. Thực ra trong công việc thực tế, những bài toán gặp nhiều hơn vẫn là bài toán hỗn hợp, điều này đòi hỏi ta phải nắm vững các nội dung liên quan và vận dụng linh hoạt.

Tôi lấy một ví dụ: dịch vụ phân tán của chúng ta chạy trên 10 máy khác nhau, dịch vụ triển khai trên mỗi máy đều nhận 10000 yêu cầu, và ghi lại thời gian xử lý của 10000 yêu cầu này (giá trị thời gian là dữ liệu int), hãy tìm trong 10\*10000 yêu cầu này 50 yêu cầu có thời gian xử lý lớn nhất, theo thứ tự từ cao xuống thấp. Hãy xem bài toán này, rất thực tế phải không. Ta thử kết hợp các phương pháp giới thiệu ở trên để giải.

### Phương pháp một

Trước hết, với 10000 dữ liệu trên mỗi máy, dùng phương pháp tương tự quick sort để tìm thông tin thời gian top50 của từng máy. Lúc này, 50 dữ liệu trên mỗi máy là không có thứ tự.

Sau đó, gom 50 dữ liệu của 10 máy (tổng cộng 500 dữ liệu) lại, làm một lần quick sort tương tự nữa để tìm 50 số lớn nhất (lúc này 50 số này không có thứ tự).

Cuối cùng, quick sort 50 dữ liệu này để thu được kết quả cuối cùng.

### Phương pháp hai

Trước hết dùng heap sort, lần lượt tìm ra 50 dữ liệu có thời gian cao nhất trên 10 máy, lúc này 50 dữ liệu này đã được sắp xếp từ lớn đến nhỏ.

Sau đó, ta lần lượt lấy 5 dữ liệu có thời gian cao nhất của mỗi máy trong 10 máy, đưa vào min-heap.

Cuối cùng, duyệt dữ liệu trên 10 máy, mỗi máy lặp từ dữ liệu thứ 6 trở xuống, nếu giá trị này lớn hơn dữ liệu ở đỉnh heap thì bỏ dữ liệu đỉnh heap và thêm giá trị này vào, tiếp tục so sánh tương tự với giá trị tiếp theo. Nếu giá trị này nhỏ hơn giá trị ở đỉnh heap thì kết thúc vòng lặp hiện tại, và thực hiện thao tác tương tự trên máy tiếp theo.

Ở trên tôi giới thiệu hai phương pháp, không phải để nói phương pháp nào tốt hơn hay có độ phức tạp thời gian thấp hơn, mà muốn nói rằng cùng một việc có nhiều cách giải quyết khác nhau, và khi lượng dữ liệu tăng lên, có thể cần nhiều hình thức kết hợp hơn. Trong lĩnh vực này, dữ liệu quyết định cấu trúc dữ liệu, cấu trúc dữ liệu quyết định thuật toán.

**Không có phương pháp tốt nhất, chỉ có những lập trình viên không ngừng tìm kiếm phương pháp tốt hơn. Cái phù hợp mới là tốt nhất.**

Nào, cố lên, bạn có thể tìm ra cách tốt hơn!!!
