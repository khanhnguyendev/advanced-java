---
source:
  locale: zh
  slug: distributed-system-cap
  hash: 'sha256:v1:9854fa09d8b0628aa763d21e02004baae8d54564524b42ac3bc44fc03633dbae'
status: machine
translatedAt: '2026-10-14'
---
# Định lý CAP trong hệ thống phân tán

## P trong định lý CAP của hệ thống phân tán có ý nghĩa gì

Trước đây khi tìm hiểu định lý CAP, tác giả có rất nhiều thắc mắc. Định nghĩa của định lý CAP là: trong hệ thống phân tán chỉ có thể thỏa mãn hai trong ba yếu tố, tức là có tồn tại hệ thống CA phân tán. Tác giả đã tra cứu rất nhiều bài viết về CAP trên mạng; dù các bài này giải thích về P theo đủ kiểu khác nhau, nhưng tổng kết lại thì hầu hết đều cho rằng P là yếu tố không thể thiếu, nghĩa là hệ thống phân tán chỉ có thể là AP hoặc CP. Lý thuyết này mâu thuẫn với những gì tôi biết trước đó (tồn tại hệ thống CA phân tán), vì vậy mới nảy sinh thắc mắc.

> Định lý này bắt nguồn từ một giả thuyết do Eric Brewer, nhà khoa học máy tính tại Đại học California, Berkeley (University of California, Berkeley), đưa ra tại Hội thảo về Nguyên lý Tính toán Phân tán (PODC) năm 2000. Năm 2002, Seth Gilbert và Nancy Lynch của Viện Công nghệ Massachusetts (MIT) đã công bố chứng minh cho giả thuyết của Brewer, biến nó thành một định lý.

### Định lý CAP (CAP theorem) là gì

Trong khoa học máy tính lý thuyết, định lý CAP (CAP theorem), còn gọi là định lý Brewer (Brewer's theorem), chỉ ra rằng một hệ thống tính toán phân tán không thể đồng thời thỏa mãn cả ba điều sau:

-   Tính nhất quán (Consistency) (tương đương với việc tất cả các nút đều truy cập cùng một bản sao dữ liệu mới nhất)
-   Tính khả dụng (Availability) (mỗi yêu cầu đều nhận được một phản hồi không lỗi, nhưng không đảm bảo dữ liệu nhận được là dữ liệu mới nhất)
-   Khả năng chịu phân vùng (Partition tolerance) (xét về hiệu quả thực tế, phân vùng tương đương với yêu cầu về giới hạn thời gian của giao tiếp. Nếu hệ thống không thể đạt được tính nhất quán dữ liệu trong giới hạn thời gian, nghĩa là đã xảy ra phân vùng, và hệ thống buộc phải lựa chọn giữa C và A đối với thao tác hiện tại.)

### Khả năng chịu phân vùng (Partition tolerance)

Cách đơn giản nhất để hiểu lý thuyết CAP là hình dung hai nút nằm ở hai phía của một phân vùng. Nếu cho phép ít nhất một nút cập nhật trạng thái thì dữ liệu sẽ không nhất quán, tức là mất tính chất C. Nếu để đảm bảo nhất quán dữ liệu mà đặt nút ở một phía của phân vùng thành không khả dụng thì lại mất tính chất A. Chỉ khi hai nút có thể giao tiếp với nhau thì mới vừa đảm bảo được C vừa đảm bảo được A, nhưng điều này lại dẫn đến mất tính chất P.

-   P là khả năng chịu phân vùng. Sau khi hiện tượng phân vùng xuất hiện thì cần có sự chịu lỗi, và chịu lỗi nghĩa là lựa chọn giữa A và C. Nếu hệ thống phân tán không có hiện tượng phân vùng (không xuất hiện tình trạng không nhất quán hay không khả dụng) thì bản thân nó không có phân vùng; đã không có phân vùng thì càng không có khả năng chịu phân vùng P.
-   Dù hệ thống tôi thiết kế là hệ thống AP hay CP, nếu không xảy ra tình trạng không nhất quán hay không khả dụng thì hệ thống đó đang ở trạng thái CA.
-   Điều kiện tiên quyết để P thể hiện ra là phải tồn tại tình huống phân vùng.

> Nguồn bài viết: [Định lý CAP trên Wikipedia](https://zh.wikipedia.org/wiki/CAP%E5%AE%9A%E7%90%86)

## So sánh một số framework thường dùng theo CAP

| Framework | Loại |
| --------- | ---- |
| Eureka    | AP   |
| Zookeeper | CP   |
| Consul    | CP   |

### Eureka

> Eureka đảm bảo tính khả dụng và đạt được tính nhất quán cuối cùng.

Tất cả các nút của Eureka đều ngang hàng, dữ liệu trên mọi nút đều giống nhau, và các Eureka có thể đăng ký chéo cho nhau.  
Eureka client dùng bộ cân bằng tải round-robin tích hợp sẵn để đăng ký, có một khoảng thời gian kiểm tra; chỉ khi không nhận được heartbeat trong một khoảng thời gian nhất định thì thông tin đăng ký của nút đó mới bị gỡ bỏ. Nếu client phát hiện Eureka hiện tại không khả dụng, nó sẽ chuyển sang nút khác; nếu tất cả Eureka đều sập, Eureka client sẽ dùng dữ liệu của lần gần nhất làm bộ nhớ đệm cục bộ. Vì vậy, mỗi thiết kế nêu trên đều khiến nó không có đặc tính `一致性` (tính nhất quán).

Lưu ý: do đặc tính AP của Eureka và cơ chế đồng bộ theo khoảng thời gian giữa các yêu cầu, khi cập nhật dịch vụ thường sẽ dùng API của Eureka để đặt thủ công trạng thái dịch vụ hiện tại thành `offline`, rồi đợi 2 chu kỳ đồng bộ mới khởi động lại, nhờ đó đảm bảo việc cập nhật nút dịch vụ ảnh hưởng ít nhất đến toàn bộ hệ thống.

### Zookeeper

> Tính nhất quán mạnh

Zookeeper sẽ ngừng cung cấp dịch vụ khi bầu chọn leader, chỉ sau khi bầu chọn leader thành công mới có thể cung cấp dịch vụ, và thời gian bầu chọn khá dài. Bên trong nó dùng cơ chế bỏ phiếu bầu chọn paxos, chỉ khi nhận được hơn một nửa số phiếu mới trở thành leader, nếu không sẽ bỏ phiếu lại, nên khi triển khai tốt nhất số nút trong cụm là số lẻ không nhỏ hơn 3 (nhưng ai đảm bảo được rằng sau khi sập một số nút thì số nút còn lại vẫn là số lẻ?). Việc kiểm tra sức khỏe của Zookeeper thường dùng kết nối dài TCP; khi mạng nội bộ chập chờn hoặc nút tương ứng bị chặn thì nó sẽ trở nên không khả dụng, điều này khá nguy hiểm.

### Consul

Giống như Zookeeper, dữ liệu là CP

Khi đăng ký với Consul, chỉ khi hơn một nửa số nút ghi thành công thì mới coi là đăng ký thành công. Khi leader sập, trong thời gian bầu chọn lại, toàn bộ Consul không khả dụng; nó đảm bảo tính nhất quán mạnh nhưng hy sinh tính khả dụng.  
Có nhiều blog nói Consul thuộc AP, nhưng phía chính thức đã xác nhận nó là cơ chế CP. Địa chỉ bản gốc: https://developer.hashicorp.com/consul/docs/concept/consensus
