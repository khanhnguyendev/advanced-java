---
source:
  locale: zh
  slug: sentinel-vs-hystrix
  hash: 'sha256:v1:9843111b7307a38009737c0290d5d43f68730bc350c8940e509119a5045f4ff1'
status: machine
translatedAt: '2026-10-14'
---
# Lựa chọn công nghệ như thế nào? Sentinel hay Hystrix?

Sentinel là thành phần kiểm soát lưu lượng nhẹ, có tính sẵn sàng cao, hướng tới kiến trúc dịch vụ phân tán, do nhóm middleware của Alibaba nghiên cứu phát triển và chính thức mã nguồn mở vào tháng 7 năm 2018. Sentinel lấy lưu lượng làm điểm xuất phát, giúp người dùng nâng cao độ ổn định của dịch vụ qua nhiều khía cạnh như kiểm soát lưu lượng, ngắt mạch (circuit breaking) và suy giảm dịch vụ (fallback), bảo vệ tải hệ thống. Có thể bạn sẽ hỏi: Sentinel khác và giống gì so với Netflix Hystrix, thư viện ngắt mạch và suy giảm dịch vụ vẫn được dùng thường xuyên trước đây? Bài viết này sẽ so sánh Sentinel với Hystrix từ các góc độ như mô hình tài nguyên và mô hình thực thi, thiết kế cô lập (isolation), ngắt mạch và suy giảm dịch vụ, thiết kế thống kê chỉ số thời gian thực, hy vọng giúp ích cho các lập trình viên khi đứng trước việc lựa chọn công nghệ.

Địa chỉ dự án Sentinel: https://github.com/alibaba/Sentinel

## Tổng quan

Trước hết hãy xem phần giới thiệu chính thức của Hystrix:

> Hystrix is a library that helps you control the interactions between these distributed services by adding latency tolerance and fault tolerance logic. Hystrix does this by isolating points of access between the services, stopping cascading failures across them, and providing fallback options, all of which improve your system’s overall resiliency.

Có thể thấy trọng tâm của Hystrix là cơ chế chịu lỗi xoay quanh cô lập và ngắt mạch: các lời gọi bị hết thời gian chờ (timeout) hoặc bị ngắt mạch sẽ fail-fast (thất bại nhanh) và có thể cung cấp cơ chế fallback.

Còn trọng tâm của Sentinel là:

-   Kiểm soát lưu lượng đa dạng
-   Ngắt mạch và suy giảm dịch vụ
-   Bảo vệ tải hệ thống
-   Giám sát thời gian thực và bảng điều khiển

Vấn đề hai bên giải quyết khác nhau khá nhiều, sau đây chúng ta sẽ so sánh cụ thể.

## Đặc tính chung

### 1. So sánh về mô hình tài nguyên và mô hình thực thi

Về thiết kế mô hình tài nguyên, Hystrix dùng mẫu command: lời gọi tới tài nguyên bên ngoài và logic fallback được đóng gói thành một đối tượng command là `HystrixCommand` hoặc `HystrixObservableCommand`, việc thực thi ở tầng dưới được xây dựng trên RxJava. Mỗi Command khi được tạo đều phải chỉ định `commandKey` và `groupKey` (dùng để phân biệt tài nguyên) cùng chiến lược cô lập tương ứng (cô lập bằng thread pool (nhóm luồng) hoặc cô lập bằng semaphore). Ở chế độ cô lập bằng thread pool cần cấu hình các tham số của thread pool (tên, dung lượng, thời gian chờ trong hàng đợi, ...), sau đó Command sẽ được thực thi trong thread pool chỉ định theo chiến lược chịu lỗi chỉ định; ở chế độ cô lập bằng semaphore cần cấu hình số lượng đồng thời tối đa, khi thực thi Command thì Hystrix sẽ giới hạn số lời gọi đồng thời của nó.

**Chú ý**: để biết giới thiệu chi tiết và ví dụ mã của Hystrix, có thể tham khảo phần giải thích chi tiết về Hystrix trong mục [Kiến trúc tính sẵn sàng cao](section:advanced-java/high-availability) của dự án này.

Thiết kế của Sentinel đơn giản hơn. So với Hystrix Command phụ thuộc chặt vào quy tắc cô lập, mức độ ràng buộc giữa định nghĩa tài nguyên và cấu hình quy tắc của Sentinel thấp hơn. Lý do Command của Hystrix phụ thuộc chặt vào cấu hình quy tắc cô lập là vì quy tắc cô lập ảnh hưởng trực tiếp tới việc thực thi Command. Khi thực thi, Hystrix sẽ phân tích quy tắc cô lập của Command để tạo RxJava Scheduler và điều phối việc thực thi trên đó; nếu là chế độ thread pool thì thread pool nằm dưới Scheduler chính là thread pool đã cấu hình, nếu là chế độ semaphore thì đơn giản được bao thành một Scheduler thực thi trên luồng hiện tại.

Sentinel thì không như vậy: khi phát triển, chỉ cần cân nhắc phương thức/đoạn mã này có cần được bảo vệ hay không, còn bảo vệ bằng cách nào thì có thể sửa đổi động theo thời gian thực vào bất cứ lúc nào.

Từ phiên bản `0.1.1`, Sentinel còn hỗ trợ cách định nghĩa tài nguyên dựa trên annotation, có thể chỉ định hàm xử lý ngoại lệ và hàm fallback thông qua tham số của annotation. Sentinel cung cấp nhiều cách cấu hình quy tắc. Ngoài việc đăng ký quy tắc vào bộ nhớ trực tiếp qua API `loadRules`, người dùng còn có thể đăng ký nhiều nguồn dữ liệu bên ngoài để cung cấp quy tắc động. Người dùng có thể thay đổi cấu hình quy tắc một cách động theo tình hình thời gian thực của hệ thống, nguồn dữ liệu sẽ đẩy thay đổi tới Sentinel và có hiệu lực ngay lập tức.

### 2. So sánh về thiết kế cô lập

Cô lập là một trong những chức năng cốt lõi của Hystrix. Hystrix cung cấp hai chiến lược cô lập: cô lập bằng thread pool `Bulkhead Pattern` và cô lập bằng semaphore, trong đó chiến lược được khuyến nghị nhất và cũng dùng nhiều nhất là **cô lập bằng thread pool**. Cô lập bằng thread pool của Hystrix tạo các thread pool khác nhau cho từng tài nguyên, các lời gọi dịch vụ khác nhau đều diễn ra trong các thread pool khác nhau; khi thread pool xảy ra tình trạng chặn như xếp hàng, hết thời gian chờ thì có thể fail-fast và có thể cung cấp cơ chế fallback. Ưu điểm của cô lập bằng thread pool là mức độ cô lập khá cao, có thể xử lý riêng thread pool của một tài nguyên mà không ảnh hưởng tới các tài nguyên khác, nhưng cái giá là overhead chuyển ngữ cảnh luồng khá lớn, đặc biệt ảnh hưởng đáng kể tới các lời gọi có độ trễ thấp.

Tuy nhiên, trên thực tế cô lập bằng thread pool không mang lại nhiều lợi ích. Ảnh hưởng trực tiếp nhất là làm cho tài nguyên máy bị phân mảnh. Hãy xét một tình huống thường gặp: dùng Hystrix trong container Servlet như Tomcat, bản thân số luồng của Tomcat đã rất nhiều (có thể tới vài chục hoặc hơn một trăm), nếu cộng thêm các thread pool mà Hystrix tạo cho từng tài nguyên thì tổng số luồng sẽ rất lớn (vài trăm luồng), khiến việc chuyển ngữ cảnh gây tổn hao rất lớn. Ngoài ra, tính cô lập khá triệt để của chế độ thread pool giúp Hystrix xử lý riêng tình trạng xếp hàng và hết thời gian chờ của thread pool từng tài nguyên, nhưng thực ra đó là vấn đề mà ngắt mạch theo thời gian chờ và kiểm soát lưu lượng cần giải quyết; nếu thành phần đã có khả năng ngắt mạch theo thời gian chờ và kiểm soát lưu lượng thì cô lập bằng thread pool trở nên không còn cần thiết đến thế.

Cô lập bằng semaphore của Hystrix giới hạn số lượng đồng thời của lời gọi tới một tài nguyên. Kiểu cô lập này rất nhẹ, chỉ giới hạn số lời gọi đồng thời tới một tài nguyên mà không tạo thread pool một cách tường minh, nên overhead khá nhỏ và hiệu quả vẫn tốt. Nhưng nhược điểm là không thể tự động suy giảm dịch vụ đối với các lời gọi chậm, chỉ có thể chờ phía client tự hết thời gian chờ, do đó vẫn có thể xảy ra tình trạng chặn lan truyền theo tầng.

Sentinel có thể cung cấp chức năng cô lập bằng semaphore thông qua chế độ kiểm soát lưu lượng theo số luồng đồng thời. Đồng thời, kết hợp với chế độ ngắt mạch và suy giảm dịch vụ dựa trên thời gian phản hồi, có thể tự động suy giảm dịch vụ khi thời gian phản hồi trung bình của tài nguyên không ổn định ở mức khá cao, ngăn không cho quá nhiều lời gọi chậm chiếm hết số lượng đồng thời và ảnh hưởng tới toàn hệ thống.

### 3. So sánh về ngắt mạch và suy giảm dịch vụ

Chức năng ngắt mạch và suy giảm dịch vụ của Sentinel và Hystrix về bản chất đều dựa trên mẫu circuit breaker `Circuit Breaker Pattern`. Cả Sentinel và Hystrix đều hỗ trợ ngắt mạch và suy giảm dịch vụ dựa trên tỷ lệ thất bại (tỷ lệ ngoại lệ): khi lời gọi đạt tới một lượng nhất định và tỷ lệ thất bại đạt ngưỡng đã đặt thì tự động ngắt mạch, lúc này mọi lời gọi tới tài nguyên đó đều bị block, cho tới khi qua cửa sổ thời gian chỉ định mới khôi phục theo kiểu thăm dò. Như đã đề cập ở trên, Sentinel còn hỗ trợ ngắt mạch và suy giảm dịch vụ dựa trên thời gian phản hồi trung bình, có thể tự động ngắt mạch khi thời gian phản hồi của dịch vụ tăng vọt liên tục, từ chối thêm nhiều yêu cầu, cho tới một khoảng thời gian sau mới khôi phục. Cách này ngăn được tình trạng lời gọi quá chậm gây chặn lan truyền theo tầng.

### 4. So sánh về cách thực hiện thống kê chỉ số thời gian thực

Việc thống kê dữ liệu chỉ số thời gian thực của Hystrix và Sentinel đều dựa trên cửa sổ trượt. Các phiên bản Hystrix trước 1.5 hiện thực cửa sổ trượt bằng mảng vòng, cập nhật thông tin thống kê của từng bucket bằng thao tác khóa kết hợp CAS. Từ Hystrix 1.5, cách hiện thực thống kê chỉ số thời gian thực được tái cấu trúc, cấu trúc dữ liệu thống kê chỉ số được trừu tượng hóa thành dạng luồng phản ứng (reactive stream), thuận tiện để bên tiêu thụ tận dụng thông tin chỉ số. Đồng thời tầng dưới được cải tạo thành mô hình hướng sự kiện dựa trên RxJava, khi lời gọi dịch vụ thành công/thất bại/hết thời gian chờ thì phát hành các sự kiện tương ứng, qua một loạt phép biến đổi và tổng hợp cuối cùng thu được luồng dữ liệu thống kê chỉ số thời gian thực, có thể được circuit breaker hoặc Dashboard tiêu thụ.

Hiện tại Sentinel trừu tượng ra interface thống kê chỉ số Metric, tầng dưới có thể có các hiện thực khác nhau; hiện thực mặc định hiện nay là cửa sổ trượt dựa trên LeapArray, về sau tùy nhu cầu có thể đưa vào các hiện thực như reactive stream.

## Đặc tính của Sentinel

Ngoài các đặc tính chung của hai bên đã nói ở trên, Sentinel còn cung cấp các chức năng đặc thù sau:

### 1. Nhẹ, hiệu năng cao

Là một thành phần quản lý lưu lượng có tính sẵn sàng cao với chức năng đầy đủ, lõi sentinel-core của Sentinel không có bất kỳ phụ thuộc thừa nào, sau khi đóng gói chỉ nặng chưa tới 200KB, rất nhẹ. Lập trình viên có thể yên tâm đưa sentinel-core vào mà không lo vấn đề phụ thuộc. Đồng thời, Sentinel cung cấp nhiều điểm mở rộng, người dùng có thể dễ dàng mở rộng theo nhu cầu và tích hợp liền mạch vào Sentinel.

Tổn hao hiệu năng do đưa Sentinel vào là rất nhỏ. Chỉ khi lượng nghiệp vụ trên một máy vượt quá 250 nghìn QPS mới có một số ảnh hưởng đáng kể (khoảng 5% - 10%), khi QPS trên một máy không quá lớn thì tổn hao gần như có thể bỏ qua.

### 2. Kiểm soát lưu lượng

Sentinel có thể dựa trên các quan hệ gọi khác nhau, lấy các chỉ số vận hành khác nhau (như QPS, số lời gọi đồng thời, tải hệ thống, ...) làm chuẩn để kiểm soát lưu lượng cho lời gọi tài nguyên, điều chỉnh các yêu cầu ngẫu nhiên thành hình dạng phù hợp.

Sentinel hỗ trợ nhiều chiến lược định hình lưu lượng, khi QPS quá cao có thể tự động điều chỉnh lưu lượng thành hình dạng phù hợp. Các chế độ thường dùng gồm:

-   **Chế độ từ chối trực tiếp**: yêu cầu vượt mức bị từ chối ngay.
-   **Chế độ khởi động chậm có làm nóng**: khi lưu lượng tăng đột biến, kiểm soát tốc độ lưu lượng đi qua, để lưu lượng đi qua tăng chậm, dần dần tăng tới ngưỡng trên trong một khoảng thời gian nhất định, cho hệ thống lạnh một khoảng thời gian làm nóng, tránh để hệ thống lạnh bị đè sập.
    ![Slow-Start-Preheating-Mode](asset:high-availability/sentinel-vs-hystrix/Slow-Start-Preheating-Mode.jpg)

-   **Chế độ đều đặn**: chế độ đều đặn hiện thực bằng thuật toán Leaky Bucket, kiểm soát nghiêm ngặt khoảng thời gian giữa các yêu cầu đi qua, đồng thời các yêu cầu tồn đọng sẽ xếp hàng, yêu cầu vượt quá thời gian chờ sẽ bị từ chối ngay. Sentinel còn hỗ trợ giới hạn lưu lượng (rate limiting) dựa trên quan hệ gọi, gồm giới hạn theo bên gọi, giới hạn theo điểm vào chuỗi gọi, giới hạn lưu lượng liên kết, ... Nhờ thông tin thống kê chuỗi gọi mạnh mẽ của Sentinel, có thể cung cấp giới hạn lưu lượng chính xác ở các chiều khác nhau.
    ![Homogenizer-mode](diagram:high-availability/sentinel-vs-hystrix/homogenizer-mode)

Hiện tại Sentinel hỗ trợ chuỗi gọi bất đồng bộ chưa tốt lắm, các phiên bản sau sẽ tập trung cải thiện việc hỗ trợ lời gọi bất đồng bộ.

### 3. Bảo vệ tải hệ thống

Sentinel cung cấp bảo vệ ở chiều hệ thống, thuật toán bảo vệ tải mượn ý tưởng của TCP BBR. Khi tải hệ thống khá cao, nếu vẫn tiếp tục cho yêu cầu đi vào thì có thể khiến hệ thống sụp đổ, không thể phản hồi. Trong môi trường cụm (cluster), cân bằng tải mạng sẽ chuyển tiếp lưu lượng vốn do máy này đảm nhận sang các máy khác. Nếu lúc này các máy khác cũng đang ở trạng thái gần ngưỡng thì lưu lượng tăng thêm này sẽ khiến máy đó cũng sụp đổ, cuối cùng làm cả cụm không khả dụng. Với tình huống này, Sentinel cung cấp cơ chế bảo vệ tương ứng, giúp lưu lượng vào của hệ thống và tải hệ thống đạt tới trạng thái cân bằng, bảo đảm hệ thống xử lý được nhiều yêu cầu nhất trong phạm vi năng lực.

![BRP](asset:high-availability/sentinel-vs-hystrix/BRP.jpg)

### 4. Giám sát thời gian thực và bảng điều khiển

Sentinel cung cấp HTTP API để lấy thông tin giám sát thời gian thực, như thông tin thống kê chuỗi gọi, thông tin điểm cụm, thông tin quy tắc, ... Nếu người dùng đang dùng Spring Boot/Spring Cloud và dùng Sentinel Spring Cloud Starter thì còn có thể thuận tiện lấy một số thông tin lúc chạy, như quy tắc động, thông qua Actuator Endpoint mà nó mở ra. Trong tương lai Sentinel còn sẽ hỗ trợ API giám sát chỉ số chuẩn hóa, thuận tiện tích hợp các hệ thống giám sát và hệ thống trực quan hóa, như Prometheus, Grafana, ...

Bảng điều khiển Sentinel (Dashboard) cung cấp các chức năng như phát hiện máy, cấu hình quy tắc, xem giám sát thời gian thực, xem thông tin chuỗi gọi, giúp người dùng xem giám sát và cấu hình rất thuận tiện.

![Sentinel-Dashboard](asset:high-availability/sentinel-vs-hystrix/Sentinel-Dashboard.jpg)

### 5. Hệ sinh thái

Hiện tại Sentinel đã được điều chỉnh để tương thích với Servlet, Dubbo, Spring Boot/Spring Cloud, gRPC, ... Người dùng chỉ cần đưa vào phụ thuộc tương ứng và cấu hình đơn giản là có thể rất thuận tiện tận hưởng khả năng bảo vệ lưu lượng có tính sẵn sàng cao của Sentinel. Trong tương lai Sentinel còn sẽ tương thích với nhiều framework thông dụng hơn, và sẽ cung cấp khả năng bảo vệ lưu lượng cụm cho Service Mesh.

## Tổng kết

| #              | Sentinel                                       | Hystrix                       |
| -------------- | ---------------------------------------------- | ----------------------------- |
| Chiến lược cô lập       | Cô lập bằng semaphore                                     | Cô lập bằng thread pool/semaphore         |
| Chiến lược ngắt mạch và suy giảm dịch vụ   | Dựa trên thời gian phản hồi hoặc tỷ lệ thất bại                         | Dựa trên tỷ lệ thất bại                  |
| Cách thực hiện chỉ số thời gian thực   | Cửa sổ trượt                                       | Cửa sổ trượt (dựa trên RxJava)       |
| Cấu hình quy tắc       | Hỗ trợ nhiều nguồn dữ liệu                                 | Hỗ trợ nhiều nguồn dữ liệu                |
| Khả năng mở rộng         | Nhiều điểm mở rộng                                     | Dạng plugin                    |
| Hỗ trợ dựa trên annotation | Hỗ trợ                                           | Hỗ trợ                          |
| Giới hạn lưu lượng           | Dựa trên QPS, hỗ trợ giới hạn theo quan hệ gọi               | Không hỗ trợ                        |
| Định hình lưu lượng       | Hỗ trợ chế độ khởi động chậm, chế độ đều đặn               | Không hỗ trợ                        |
| Bảo vệ tải hệ thống   | Hỗ trợ                                           | Không hỗ trợ                        |
| Bảng điều khiển         | Dùng ngay, có thể cấu hình quy tắc, xem giám sát theo giây, phát hiện máy, ... | Chưa hoàn thiện                        |
| Tương thích framework thông dụng | Servlet, Spring Cloud, Dubbo, gRPC             | Servlet, Spring Cloud Netflix |
