---
source:
  locale: zh
  slug: distributed-system-cap
  hash: 'sha256:v1:9854fa09d8b0628aa763d21e02004baae8d54564524b42ac3bc44fc03633dbae'
status: machine
translatedAt: '2026-10-14'
---
# Định lý CAP trong hệ thống phân tán

## Chữ P trong định lý CAP của hệ thống phân tán mang ý nghĩa gì

Trước đây khi đọc về định lý CAP, tác giả có rất nhiều nghi hoặc. Định nghĩa của định lý CAP là trong hệ thống phân tán chỉ có thể thỏa mãn hai trong ba yếu tố, tức là có tồn tại hệ thống CA phân tán. Tác giả đã tra cứu rất nhiều bài viết về CAP trên mạng, tuy các bài viết này giải thích về P rất khác nhau, nhưng tổng kết lại thì phần lớn các quan điểm đều cho rằng P là không thể thiếu, nghĩa là trong hệ thống phân tán chỉ có thể là AP hoặc CP, lý thuyết này mâu thuẫn với lý thuyết mà tôi từng biết trước đây (có tồn tại hệ thống CA phân tán), vì vậy mới nảy sinh nghi hoặc.

> Định lý này bắt nguồn từ một giả thuyết do nhà khoa học máy tính Eric Brewer của Đại học California, Berkeley (University of California, Berkeley) đưa ra tại Hội nghị chuyên đề về các nguyên lý điện toán phân tán (PODC) năm 2000. Năm 2002, Seth Gilbert và Nancy Lynch của Viện Công nghệ Massachusetts (MIT) đã công bố chứng minh cho giả thuyết của Brewer, biến nó thành một định lý.

### Định lý CAP là gì

Trong khoa học máy tính lý thuyết, định lý CAP (CAP theorem), còn được gọi là định lý Brewer (Brewer's theorem), chỉ ra rằng đối với một hệ thống tính toán phân tán, không thể đồng thời thỏa mãn cả ba điểm sau:

-   Tính nhất quán (Consistency) (tương đương với việc tất cả các node truy cập cùng một bản sao dữ liệu mới nhất)
-   Tính sẵn sàng (Availability) (mỗi yêu cầu đều nhận được một phản hồi không lỗi, nhưng không đảm bảo dữ liệu nhận được là dữ liệu mới nhất)
-   Khả năng chịu phân vùng (Partition tolerance) (xét về hiệu quả thực tế, phân vùng tương đương với yêu cầu về giới hạn thời gian của việc giao tiếp. Nếu hệ thống không thể đạt được tính nhất quán dữ liệu trong giới hạn thời gian, nghĩa là đã xảy ra phân vùng, và phải đưa ra lựa chọn giữa C và A đối với thao tác hiện tại.)

### Khả năng chịu phân vùng

Cách đơn giản nhất để hiểu lý thuyết CAP là tưởng tượng hai node nằm ở hai phía của một phân vùng. Cho phép ít nhất một node cập nhật trạng thái sẽ dẫn đến dữ liệu không nhất quán, tức là mất tính chất C. Nếu để đảm bảo tính nhất quán dữ liệu, đặt node ở một phía của phân vùng thành không khả dụng, thì lại mất tính chất A. Chỉ khi hai node có thể giao tiếp với nhau thì mới vừa đảm bảo C vừa đảm bảo A, mà điều này lại dẫn đến mất tính chất P.

-   P chỉ khả năng chịu phân vùng, sau khi hiện tượng phân vùng xảy ra thì cần chịu lỗi, chịu lỗi nghĩa là lựa chọn giữa A và C. Nếu hệ thống phân tán không có hiện tượng phân vùng (không xuất hiện tình trạng không nhất quán hay không khả dụng) thì bản thân nó không có phân vùng, đã không có phân vùng thì càng không có khả năng chịu phân vùng P.
-   Dù hệ thống tôi thiết kế là AP hay CP, nếu không xuất hiện tình trạng không nhất quán hay không khả dụng, thì hệ thống đó đang ở trạng thái CA
-   Điều kiện tiên quyết để P thể hiện ra là phải có tình huống phân vùng tồn tại

> Nguồn bài viết: [Định lý CAP trên Wikipedia](https://zh.wikipedia.org/wiki/CAP%E5%AE%9A%E7%90%86)

## So sánh một số framework thường dùng theo CAP

| Framework | Thuộc loại |
| --------- | ---------- |
| Eureka    | AP         |
| Zookeeper | CP         |
| Consul    | CP         |

### Eureka

> Eureka đảm bảo tính sẵn sàng, đạt được nhất quán cuối cùng (eventual consistency).

Tất cả các node của Eureka đều ngang hàng, mọi dữ liệu đều giống nhau, và Eureka có thể đăng ký chéo lẫn nhau.  
Eureka client dùng bộ cân bằng tải round-robin tích hợp sẵn để đăng ký, có một khoảng thời gian kiểm tra, nếu trong một khoảng thời gian nhất định không nhận được heartbeat thì mới xóa thông tin đăng ký của node đó; nếu client phát hiện Eureka hiện tại không khả dụng, sẽ chuyển sang node khác, nếu tất cả Eureka đều sập, Eureka client sẽ dùng dữ liệu lần cuối làm bộ nhớ đệm cục bộ; vì vậy mỗi thiết kế nêu trên đều khiến nó không có đặc tính `一致性` (tính nhất quán).

Lưu ý: vì đặc tính AP của Eureka và cơ chế đồng bộ theo khoảng thời gian giữa các yêu cầu, khi cập nhật dịch vụ thường sẽ thủ công dùng API của Eureka để đặt trạng thái dịch vụ hiện tại thành `offline`, và chờ 2 khoảng thời gian đồng bộ rồi mới khởi động lại, như vậy có thể đảm bảo node dịch vụ đang cập nhật ảnh hưởng đến toàn bộ hệ thống ở mức nhỏ nhất.

### Zookeeper

> Tính nhất quán mạnh

Zookeeper khi bầu chọn leader sẽ dừng cung cấp dịch vụ, chỉ sau khi bầu chọn leader thành công mới có thể cung cấp dịch vụ, thời gian bầu chọn khá dài; bên trong dùng cơ chế bỏ phiếu bầu chọn paxos, chỉ khi nhận được số phiếu quá bán mới trở thành leader, nếu không thì bỏ phiếu lại, vì vậy khi triển khai tốt nhất số node trong cụm không nhỏ hơn 3 và là số lẻ (nhưng ai có thể đảm bảo sau khi có node sập thì số node vẫn là số lẻ đây); việc kiểm tra sức khỏe của Zookeeper thường dùng kết nối dài tcp, khi mạng nội bộ chập chờn hoặc node tương ứng bị nghẽn đều sẽ trở thành không khả dụng, điểm này vẫn khá nguy hiểm;

### Consul

Giống Zookeeper, dữ liệu là CP

Khi Consul đăng ký, chỉ khi quá nửa số node đều ghi thành công thì mới coi là đăng ký thành công; khi leader sập, trong thời gian bầu chọn lại toàn bộ Consul không khả dụng, đảm bảo tính nhất quán mạnh nhưng hy sinh tính sẵn sàng.  
Có rất nhiều blog nói Consul thuộc AP, nhưng chính thức đã xác nhận nó là cơ chế CP. Địa chỉ bản gốc: https://developer.hashicorp.com/consul/docs/concept/consensus
