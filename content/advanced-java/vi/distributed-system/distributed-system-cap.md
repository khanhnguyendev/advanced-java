---
source:
  locale: zh
  slug: distributed-system-cap
  hash: 'sha256:v1:9854fa09d8b0628aa763d21e02004baae8d54564524b42ac3bc44fc03633dbae'
status: machine
translatedAt: '2026-10-14'
---
# Định lý CAP trong hệ thống phân tán

## Chữ P trong định lý CAP của hệ thống phân tán có ý nghĩa gì

Trước đây khi tìm hiểu định lý CAP, tác giả có rất nhiều băn khoăn. Định lý CAP phát biểu rằng trong hệ thống phân tán chỉ có thể thỏa mãn hai trong ba tính chất, tức là có tồn tại hệ thống phân tán CA. Tác giả đã đọc rất nhiều bài viết về CAP trên mạng; dù cách giải thích về P trong các bài này rất đa dạng, nhưng tóm lại phần lớn đều cho rằng P là không thể thiếu, nghĩa là hệ thống phân tán chỉ có thể là AP hoặc CP. Quan điểm này mâu thuẫn với lý thuyết mà tôi từng hiểu (có tồn tại hệ thống phân tán CA), nên mới có sự băn khoăn đó.

> Định lý này bắt nguồn từ một phỏng đoán do nhà khoa học máy tính Eric Brewer của Đại học California, Berkeley (University of California, Berkeley) đưa ra tại Hội thảo về Nguyên lý Tính toán Phân tán (PODC) năm 2000. Năm 2002, Seth Gilbert và Nancy Lynch của Viện Công nghệ Massachusetts (MIT) công bố chứng minh cho phỏng đoán của Brewer, biến nó thành một định lý.

### Định lý CAP là gì (CAP theorem)

Trong khoa học máy tính lý thuyết, định lý CAP (CAP theorem), còn được gọi là định lý Brewer (Brewer's theorem), chỉ ra rằng đối với một hệ thống tính toán phân tán, không thể đồng thời thỏa mãn cả ba điều sau:

-   Tính nhất quán (Consistency) (tương đương với việc tất cả các nút truy cập cùng một bản sao dữ liệu mới nhất)
-   Tính sẵn sàng (Availability) (mỗi yêu cầu đều nhận được một phản hồi không lỗi, nhưng không đảm bảo dữ liệu nhận được là dữ liệu mới nhất)
-   Khả năng chịu phân vùng (Partition tolerance) (xét về hiệu quả thực tế, phân vùng tương đương với yêu cầu về giới hạn thời gian của giao tiếp. Nếu hệ thống không thể đạt được tính nhất quán dữ liệu trong giới hạn thời gian, nghĩa là đã xảy ra phân vùng, và hệ thống buộc phải lựa chọn giữa C và A đối với thao tác hiện tại.)

### Khả năng chịu phân vùng (Partition tolerance)

Cách đơn giản nhất để hiểu lý thuyết CAP là hình dung hai nút nằm ở hai phía của một phân vùng. Nếu cho phép ít nhất một nút cập nhật trạng thái thì sẽ dẫn đến dữ liệu không nhất quán, tức là mất tính chất C. Nếu để đảm bảo tính nhất quán dữ liệu mà đặt nút ở một phía của phân vùng ở trạng thái không khả dụng thì lại mất tính chất A. Chỉ khi hai nút có thể liên lạc với nhau thì mới vừa đảm bảo được C vừa đảm bảo được A, nhưng điều này lại dẫn đến mất tính chất P.

-   P là khả năng chịu phân vùng. Sau khi hiện tượng phân vùng xuất hiện thì cần có khả năng chịu lỗi, và chịu lỗi ở đây là lựa chọn giữa A và C. Nếu hệ thống phân tán không có hiện tượng phân vùng (không xuất hiện tình trạng không nhất quán hay không khả dụng) thì bản thân nó không có phân vùng; đã không có phân vùng thì càng không có khả năng chịu phân vùng P.
-   Dù hệ thống tôi thiết kế là hệ thống AP hay CP, nếu không xuất hiện tình trạng không nhất quán hay không khả dụng thì hệ thống đó đang ở trạng thái CA.
-   Điều kiện tiên quyết để P thể hiện ra là phải có tình huống phân vùng tồn tại.

> Nguồn bài viết: [Định lý CAP trên Wikipedia](https://zh.wikipedia.org/wiki/CAP%E5%AE%9A%E7%90%86)

## So sánh một số framework thường dùng theo CAP

| Framework | Loại |
| --------- | ---- |
| Eureka    | AP   |
| Zookeeper | CP   |
| Consul    | CP   |

### Eureka

> Eureka đảm bảo tính sẵn sàng và đạt nhất quán cuối cùng (eventual consistency).

Tất cả các nút của Eureka đều ngang hàng, dữ liệu trên mọi nút đều giống nhau, và các Eureka có thể đăng ký chéo cho nhau.  
Eureka client dùng bộ cân bằng tải round-robin tích hợp sẵn để đăng ký, có một khoảng thời gian kiểm tra; nếu trong một khoảng thời gian nhất định không nhận được heartbeat thì mới xóa thông tin đăng ký của nút đó. Nếu client phát hiện Eureka hiện tại không khả dụng thì sẽ chuyển sang nút khác; nếu tất cả Eureka đều sập thì Eureka client sẽ dùng dữ liệu của lần cuối cùng làm bộ nhớ đệm (cache) cục bộ. Vì vậy mỗi thiết kế nêu trên đều khiến nó không có đặc tính `一致性` (tính nhất quán).

Lưu ý: do đặc tính AP của Eureka và cơ chế đồng bộ theo khoảng thời gian giữa các yêu cầu, khi cập nhật dịch vụ thường thủ công dùng API của Eureka để đặt trạng thái dịch vụ hiện tại thành `offline`, rồi chờ 2 khoảng thời gian đồng bộ mới khởi động lại, như vậy có thể đảm bảo việc cập nhật nút dịch vụ ảnh hưởng ở mức tối thiểu đến toàn hệ thống.

### Zookeeper

> Tính nhất quán mạnh

Zookeeper sẽ ngừng cung cấp dịch vụ khi bầu chọn leader, chỉ sau khi bầu chọn leader thành công mới có thể cung cấp dịch vụ, và thời gian bầu chọn khá lâu. Bên trong nó dùng cơ chế bỏ phiếu bầu chọn paxos, chỉ khi nhận được hơn một nửa số phiếu mới trở thành leader, nếu không sẽ bỏ phiếu lại, vì vậy khi triển khai tốt nhất số nút trong cụm (cluster) là số lẻ không nhỏ hơn 3 (nhưng ai đảm bảo được rằng sau khi có nút sập thì số nút vẫn là số lẻ?). Việc kiểm tra tình trạng của Zookeeper thường dùng kết nối dài TCP; khi mạng nội bộ chập chờn hoặc nút tương ứng bị nghẽn đều sẽ trở nên không khả dụng, điều này vẫn khá nguy hiểm.

### Consul

Giống Zookeeper, dữ liệu theo CP.

Khi đăng ký trong Consul, chỉ khi hơn một nửa số nút ghi thành công thì mới coi là đăng ký thành công; khi leader sập, trong thời gian bầu chọn lại toàn bộ Consul không khả dụng, đảm bảo tính nhất quán mạnh nhưng hy sinh tính sẵn sàng.  
Có rất nhiều blog nói Consul thuộc AP, nhưng chính thức đã xác nhận nó là cơ chế CP. Địa chỉ bản gốc: https://developer.hashicorp.com/consul/docs/concept/consensus
