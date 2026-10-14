---
source:
  locale: zh
  slug: advantages-and-disadvantages-of-microservice
  hash: 'sha256:v1:19fdaa2c11f64fa38c25e2d6b77a2004693767255279d05b88c4d47fd94595ca'
status: machine
translatedAt: '2026-10-14'
---
# Ưu điểm và hạn chế của kiến trúc microservices

## Phát triển ứng dụng nguyên khối

Giả sử bạn chuẩn bị phát triển một phần mềm điều phối taxi cạnh tranh với Uber và Hailo. Sau các cuộc họp ban đầu và phân tích yêu cầu, bạn có thể bắt đầu dự án mới bằng tay hoặc dùng trình sinh mã dựa trên Rails, Spring Boot, Play hoặc Maven; kiến trúc lục giác (hexagonal) của nó được module hóa, sơ đồ kiến trúc như sau:

![monolithic-application-architecture-diagram](diagram:micro-services/advantages-and-disadvantages-of-microservice/monolithic-application-architecture-diagram)

Lõi của ứng dụng là logic nghiệp vụ, do các module định nghĩa dịch vụ, đối tượng miền và sự kiện thực hiện. Bao quanh lõi là các adapter giao tiếp với thế giới bên ngoài. Adapter gồm các thành phần truy cập cơ sở dữ liệu, thành phần thông điệp để tạo và xử lý thông điệp, và các module web hỗ trợ truy cập API hoặc UI.

Dù logic được module hóa, cuối cùng nó vẫn được đóng gói và triển khai thành ứng dụng nguyên khối. Định dạng cụ thể phụ thuộc vào ngôn ngữ và framework của ứng dụng. Ví dụ, nhiều ứng dụng Java được đóng gói thành WAR và triển khai trên Tomcat hoặc Jetty, trong khi các ứng dụng Java khác được đóng gói thành JAR tự chứa; tương tự, Rails và Node.js được đóng gói thành cây thư mục phân cấp.

Phong cách phát triển ứng dụng này rất phổ biến vì IDE và các công cụ khác đều giỏi phát triển một ứng dụng đơn giản; loại ứng dụng này cũng dễ gỡ lỗi, chỉ cần chạy ứng dụng và dùng Selenium điều khiển UI là có thể kiểm thử đầu-cuối. Ứng dụng nguyên khối cũng dễ triển khai: chỉ cần sao chép ứng dụng đã đóng gói lên máy chủ, và dễ mở rộng bằng cách chạy nhiều bản sao phía sau bộ cân bằng tải. Ở giai đoạn đầu, loại ứng dụng này chạy rất tốt.

## Hạn chế của ứng dụng nguyên khối

Đáng tiếc là cách tiếp cận đơn giản này có giới hạn rất lớn. Một ứng dụng đơn giản sẽ dần lớn lên theo thời gian. Trong mỗi sprint, đội phát triển phải đối mặt với các "story" mới và viết nhiều mã mới. Sau vài năm, ứng dụng nhỏ và đơn giản đó trở thành một con quái vật khổng lồ. Đây là một ví dụ: gần đây tôi trao đổi với một lập trình viên đang viết công cụ phân tích quan hệ phụ thuộc giữa các tệp JAR trong một ứng dụng có hàng triệu dòng mã. Tôi tin chắc đoạn mã này chính là con quái vật mà nhiều lập trình viên đã tạo ra qua nhiều năm nỗ lực.

Một khi ứng dụng của bạn trở thành con quái vật vừa lớn vừa phức tạp, đội phát triển chắc chắn sẽ rất khổ sở. Phát triển và triển khai linh hoạt (agile) trở nên khó khăn. Vấn đề chính là ứng dụng quá phức tạp đến mức không một lập trình viên đơn lẻ nào có thể hiểu hết. Do đó, sửa lỗi và thêm tính năng mới một cách đúng đắn trở nên rất khó và tốn thời gian. Ngoài ra, tinh thần của đội cũng đi xuống. Nếu mã khó hiểu thì không thể sửa đúng, cuối cùng sa vào vũng lầy khổng lồ không thể hiểu nổi.

Ứng dụng nguyên khối cũng làm giảm tốc độ phát triển. Ứng dụng càng lớn, thời gian khởi động càng lâu. Ví dụ, một khảo sát gần đây cho thấy thời gian khởi động ứng dụng đôi khi vượt quá 12 phút. Tôi cũng từng nghe có ứng dụng cần 40 phút để khởi động. Nếu lập trình viên phải thường xuyên khởi động lại ứng dụng thì phần lớn thời gian sẽ trôi qua trong chờ đợi, năng suất bị ảnh hưởng rất nhiều.

Ngoài ra, ứng dụng nguyên khối phức tạp và đồ sộ cũng không thuận lợi cho phát triển liên tục. Ngày nay, ứng dụng SaaS thường thay đổi nhiều lần mỗi ngày, điều này rất khó với mô hình nguyên khối. Hơn nữa, ảnh hưởng của những thay đổi này không được hiểu rõ nên buộc phải kiểm thử thủ công rất nhiều. Từ đó, triển khai liên tục (continuous deployment) cũng trở nên khó khăn.

Ứng dụng nguyên khối rất khó mở rộng khi các module khác nhau có xung đột về tài nguyên. Ví dụ, một module thực hiện logic nhạy cảm với CPU nên triển khai trên AWS EC2 Compute Optimized instances, trong khi module cơ sở dữ liệu trong bộ nhớ lại phù hợp hơn với EC2 Memory-optimized instances. Tuy nhiên, vì các module này được triển khai cùng nhau nên buộc phải thỏa hiệp trong việc chọn phần cứng.

Một vấn đề khác của ứng dụng nguyên khối là độ tin cậy. Vì mọi module chạy trong cùng một tiến trình, một lỗi ở bất kỳ module nào, ví dụ rò rỉ bộ nhớ, đều có thể làm sập cả tiến trình. Ngoài ra, vì mọi instance của ứng dụng đều giống nhau, lỗi này sẽ ảnh hưởng đến độ tin cậy của toàn bộ ứng dụng.

Cuối cùng, ứng dụng nguyên khối khiến việc áp dụng kiến trúc và ngôn ngữ mới rất khó. Ví dụ, hãy tưởng tượng bạn có hai triệu dòng mã viết bằng framework XYZ. Nếu muốn đổi sang framework ABC thì cả thời gian lẫn chi phí đều rất đắt đỏ, dù ABC tốt hơn. Do đó đây là một hố sâu không thể vượt qua; bạn buộc phải cúi đầu trước lựa chọn ban đầu.

Tóm lại: ban đầu bạn có một ứng dụng nghiệp vụ then chốt rất thành công, sau đó nó trở thành một con quái vật khổng lồ, không thể hiểu nổi. Vì dùng công nghệ lỗi thời, kém hiệu quả nên rất khó tuyển lập trình viên tiềm năng. Ứng dụng không thể mở rộng, độ tin cậy thấp, và cuối cùng phát triển và triển khai linh hoạt trở nên bất khả thi.

Vậy ứng phó thế nào?

## Kiến trúc microservices: xử lý sự phức tạp

Nhiều công ty như Amazon, eBay và Netflix đã giải quyết các vấn đề trên bằng cách áp dụng mẫu kiến trúc microservices. Ý tưởng là không phát triển một ứng dụng nguyên khối khổng lồ mà phân rã ứng dụng thành các microservices nhỏ, liên kết với nhau.

Một microservice thường thực hiện một chức năng cụ thể, như quản lý đơn hàng, quản lý khách hàng, v.v. Mỗi microservice là một ứng dụng lục giác thu nhỏ, có logic nghiệp vụ và adapter riêng. Một số microservice còn công bố API cho các microservice khác và client của ứng dụng sử dụng. Một số khác hiện thực Web UI; khi chạy, mỗi instance có thể là một VM đám mây hoặc một container Docker.

Ví dụ, hệ thống mô tả ở trên có thể được phân rã như sau:

![deal-with-complex things-1](diagram:micro-services/advantages-and-disadvantages-of-microservice/deal-with-complex-things-1)

Mỗi vùng chức năng của ứng dụng đều được thực hiện bằng microservice; ngoài ra, ứng dụng Web được tách thành một loạt ứng dụng Web đơn giản (ví dụ một ứng dụng cho hành khách, một cho tài xế taxi). Việc tách như vậy giúp triển khai cho các người dùng, thiết bị và tình huống ứng dụng đặc thù khác nhau dễ dàng hơn.

Mỗi dịch vụ backend mở một REST API, nhiều dịch vụ bản thân cũng dùng API do các dịch vụ khác cung cấp. Ví dụ, quản lý tài xế dùng dịch vụ thông báo để báo cho tài xế biết một nhu cầu tiềm năng. Các dịch vụ UI kích hoạt các dịch vụ khác để cập nhật trang Web. Tất cả dịch vụ đều giao tiếp bất đồng bộ, dựa trên thông điệp. Cơ chế bên trong của microservices sẽ được bàn trong các phần sau của loạt bài.

Một số REST API cũng được mở cho ứng dụng di động của hành khách và tài xế. Các ứng dụng này không truy cập trực tiếp dịch vụ backend mà chuyển thông điệp trung gian qua API Gateway. API Gateway chịu trách nhiệm cân bằng tải, bộ nhớ đệm (cache), kiểm soát truy cập, tính phí và giám sát API, v.v., có thể dễ dàng hiện thực bằng NGINX; các bài sau sẽ giới thiệu về API Gateway.

![deal-with-complex-things-2](diagram:micro-services/advantages-and-disadvantages-of-microservice/deal-with-complex-things-2)

Mẫu kiến trúc microservices trong hình trên tương ứng với trục Y của Scale Cube, một mô hình mở rộng ba chiều được mô tả trong cuốn _The Art of Scalability_. Hai trục mở rộng còn lại là trục X, gồm nhiều bản sao ứng dụng chạy phía sau bộ cân bằng tải, và trục Z, định tuyến yêu cầu đến dịch vụ liên quan.

Về cơ bản có thể biểu diễn ứng dụng theo ba chiều trên: trục Y là phân rã ứng dụng thành microservices. Khi chạy, trục X là chạy nhiều instance phía sau bộ cân bằng tải để cung cấp thông lượng. Một số ứng dụng còn dùng trục Z để phân vùng dịch vụ. Hình dưới minh họa cách dịch vụ quản lý chuyến đi được triển khai trên Docker chạy trên AWS EC2.

![deal-with-complex-things-3](diagram:micro-services/advantages-and-disadvantages-of-microservice/deal-with-complex-things-3)

Khi chạy, dịch vụ quản lý chuyến đi gồm nhiều instance dịch vụ. Mỗi instance dịch vụ là một container Docker. Để đảm bảo tính sẵn sàng cao, các container này thường chạy trên nhiều VM đám mây. Phía trước các instance dịch vụ là một lớp cân bằng tải như NGINX, chịu trách nhiệm phân phối yêu cầu giữa các instance. Bộ cân bằng tải cũng đồng thời xử lý các yêu cầu khác, chẳng hạn bộ nhớ đệm, kiểm soát quyền, thống kê và giám sát API.

Mẫu kiến trúc microservices này tác động sâu sắc đến quan hệ giữa ứng dụng và cơ sở dữ liệu. **Không như truyền thống nhiều dịch vụ dùng chung một cơ sở dữ liệu, trong kiến trúc microservices mỗi dịch vụ có cơ sở dữ liệu riêng.** Ngoài ra, cách nghĩ này cũng ảnh hưởng đến mô hình dữ liệu cấp doanh nghiệp. Đồng thời, mô hình này có nghĩa là dữ liệu bị nhân bản; nhưng nếu muốn có lợi ích mà microservices mang lại thì mỗi dịch vụ một cơ sở dữ liệu riêng là bắt buộc, vì kiến trúc này đòi hỏi sự ràng buộc lỏng như vậy. Hình dưới minh họa kiến trúc cơ sở dữ liệu của ứng dụng ví dụ.

![deal-with-complex-things-4](diagram:micro-services/advantages-and-disadvantages-of-microservice/deal-with-complex-things-4)

Mỗi dịch vụ có cơ sở dữ liệu riêng, ngoài ra mỗi dịch vụ có thể dùng loại cơ sở dữ liệu phù hợp với mình nhất, còn gọi là kiến trúc polyglot persistence. Ví dụ, quản lý tài xế (tìm tài xế nào gần hành khách hơn) phải dùng cơ sở dữ liệu hỗ trợ truy vấn thông tin địa lý.

Nhìn bề ngoài, mẫu kiến trúc microservices hơi giống SOA, đều gồm nhiều dịch vụ. Nhưng có thể nhìn vấn đề từ góc khác: mẫu kiến trúc microservices là một SOA không có web service (WS-\*) và không có ESB. Ứng dụng microservices ưa dùng các giao thức đơn giản, nhẹ như REST thay vì WS-\*, và tránh dùng ESB cùng các chức năng tương tự ESB bên trong microservices. Mẫu kiến trúc microservices cũng từ chối các khái niệm của SOA như canonical schema.

## Lợi ích của kiến trúc microservices

Mẫu kiến trúc microservices có nhiều lợi ích. Trước hết, nó giải quyết vấn đề độ phức tạp bằng cách phân rã ứng dụng nguyên khối khổng lồ thành nhiều dịch vụ. Với chức năng không đổi, ứng dụng được chia thành các nhánh hay dịch vụ có thể quản lý. Mỗi dịch vụ có ranh giới được định nghĩa rõ bằng API dựa trên RPC hoặc điều khiển bằng thông điệp. Mẫu kiến trúc microservices cung cấp giải pháp module hóa cho những chức năng rất khó đạt được với cách viết mã nguyên khối; nhờ đó từng dịch vụ rất dễ phát triển, hiểu và bảo trì.

Thứ hai, kiến trúc này cho phép mỗi dịch vụ có đội phát triển chuyên trách. Lập trình viên được tự do chọn công nghệ phát triển và cung cấp dịch vụ API. Tất nhiên, nhiều công ty cố tránh hỗn loạn nên chỉ cho phép một số lựa chọn công nghệ. Nhưng sự tự do này có nghĩa là lập trình viên không bị buộc dùng công nghệ lỗi thời được chọn khi dự án mới bắt đầu, mà có thể chọn công nghệ hiện nay. Thậm chí, vì dịch vụ tương đối đơn giản nên viết lại mã cũ bằng công nghệ hiện nay cũng không quá khó.

Thứ ba, trong mẫu kiến trúc microservices, mỗi microservice được triển khai độc lập. Lập trình viên không còn cần phối hợp tác động của việc triển khai các dịch vụ khác lên dịch vụ của mình. Thay đổi này giúp tăng tốc triển khai. Đội UI có thể dùng A/B testing và triển khai thay đổi nhanh chóng. Mẫu kiến trúc microservices khiến triển khai liên tục trở nên khả thi.

Cuối cùng, mẫu kiến trúc microservices cho phép mỗi dịch vụ mở rộng độc lập. Có thể triển khai mỗi dịch vụ ở quy mô đáp ứng nhu cầu của nó, thậm chí dùng phần cứng phù hợp hơn với nhu cầu tài nguyên của dịch vụ. Ví dụ, có thể triển khai dịch vụ nhạy cảm với CPU trên EC2 Compute Optimized instances, và triển khai cơ sở dữ liệu trong bộ nhớ trên EC2 memory-optimized instances.

## Hạn chế của kiến trúc microservices

Fred Brooks đã viết cách đây 30 năm: "there are no silver bullets"; như mọi công nghệ khác, kiến trúc microservices cũng có hạn chế. Một trong số đó giống với tên gọi của nó: "micro" nhấn mạnh kích thước dịch vụ, và thực tế có một số lập trình viên cổ vũ xây dựng các nhóm dịch vụ lớn hơn một chút, 10-100 LOC. Dù dịch vụ nhỏ được ưa chuộng, đừng quên đây chỉ là lựa chọn ở đầu cuối chứ không phải mục đích cuối cùng. Mục đích của microservices là phân rã ứng dụng hiệu quả để phát triển và triển khai linh hoạt.

Một hạn chế chính khác là ứng dụng microservices là hệ thống phân tán, từ đó kéo theo độ phức tạp vốn có. Lập trình viên cần chọn giữa RPC và truyền thông điệp để hiện thực cơ chế giao tiếp liên tiến trình. Hơn nữa, họ phải viết mã xử lý các lỗi cục bộ như truyền thông điệp quá chậm hoặc không khả dụng. Tất nhiên điều này không khó, nhưng so với việc gọi phương thức ở mức ngôn ngữ hoặc gọi tiến trình trong ứng dụng nguyên khối, kỹ thuật này trong microservices phức tạp hơn một chút.

Một thách thức khác của microservices đến từ kiến trúc cơ sở dữ liệu phân vùng. Trong giao dịch nghiệp vụ, việc cập nhật đồng thời nhiều thực thể nghiệp vụ rất phổ biến. Giao dịch như vậy rất dễ với ứng dụng nguyên khối vì chỉ có một cơ sở dữ liệu. Trong ứng dụng kiến trúc microservices, cần cập nhật các cơ sở dữ liệu khác nhau do các dịch vụ khác nhau sử dụng. Dùng giao dịch phân tán chưa chắc là lựa chọn tốt, không chỉ vì định lý CAP mà còn vì các cơ sở dữ liệu NoSQL có khả năng mở rộng cao và middleware truyền thông điệp ngày nay không hỗ trợ yêu cầu này. Cuối cùng bạn buộc phải dùng cách tiếp cận nhất quán cuối cùng (eventual consistency), đặt ra yêu cầu và thách thức cao hơn cho lập trình viên.

Kiểm thử một ứng dụng dựa trên kiến trúc microservices cũng là công việc phức tạp. Ví dụ, với framework Spring Boot phổ biến, kiểm thử REST API của một ứng dụng web nguyên khối là việc rất dễ. Ngược lại, kiểm thử cùng một dịch vụ như vậy đòi hỏi phải khởi động tất cả các dịch vụ liên quan đến nó (ít nhất cần stub của các dịch vụ đó). Một lần nữa, đừng đánh giá thấp độ phức tạp mà kiến trúc microservices mang lại.

Một thách thức khác là thay đổi trong ứng dụng theo mẫu kiến trúc microservices sẽ lan tới nhiều dịch vụ. Ví dụ, giả sử bạn đang làm một use case cần sửa các dịch vụ A, B, C, trong đó A phụ thuộc B, B phụ thuộc C. Trong ứng dụng nguyên khối, chỉ cần sửa các module liên quan, tích hợp thay đổi rồi triển khai. Ngược lại, mẫu kiến trúc microservices đòi hỏi phải cân nhắc tác động của thay đổi lên các dịch vụ khác nhau. Ví dụ, cần cập nhật dịch vụ C trước, rồi B, cuối cùng mới là A. May mắn là nhiều thay đổi thường chỉ ảnh hưởng một dịch vụ, còn thay đổi cần phối hợp nhiều dịch vụ thì hiếm.

Triển khai một ứng dụng microservices cũng phức tạp; một ứng dụng nguyên khối chỉ cần triển khai trên các máy chủ phía sau bộ cân bằng tải. Mỗi instance ứng dụng cần cấu hình các dịch vụ hạ tầng như cơ sở dữ liệu và middleware thông điệp. Ngược lại, một ứng dụng microservices thường gồm một lượng lớn dịch vụ. Ví dụ, theo Adrian Cockcroft, Hailo gồm 160 dịch vụ khác nhau, Netflix có khoảng 600 dịch vụ. Mỗi dịch vụ có nhiều instance. Điều này tạo ra nhiều phần cần cấu hình, triển khai, mở rộng và giám sát; ngoài ra còn cần hiện thực cơ chế khám phá dịch vụ (service discovery, sẽ đăng ở các bài sau) để tìm địa chỉ (gồm địa chỉ máy chủ và cổng) của dịch vụ mà nó giao tiếp. Cách giải quyết truyền thống không thể giải quyết vấn đề phức tạp như vậy. Do đó, triển khai thành công một ứng dụng microservices đòi hỏi lập trình viên phải kiểm soát tốt phương pháp triển khai và mức độ tự động hóa cao.

Một cách tự động hóa là dùng dịch vụ PaaS như Cloud Foundry. PaaS cung cấp cho lập trình viên cách triển khai và quản lý microservices đơn giản, đóng gói và giải quyết sẵn tất cả các vấn đề này. Đồng thời, các chuyên gia hệ thống và mạng cấu hình PaaS có thể áp dụng thực hành tốt nhất và chính sách để đơn giản hóa các vấn đề này. Một cách khác để tự động triển khai ứng dụng microservices là tự phát triển một hệ thống kiểu PaaS cơ bản cho riêng mình. Điểm khởi đầu điển hình là dùng giải pháp cụm như Mesos hoặc Kubernetes kết hợp với Docker. Trong các bài sau của loạt bài, chúng ta sẽ xem cách dựa trên phương pháp triển khai phần mềm như NGINX để dễ dàng cung cấp bộ nhớ đệm, kiểm soát quyền, thống kê và giám sát API ở tầng microservices.

## Tổng kết

Xây dựng ứng dụng phức tạp thực sự rất khó. Kiến trúc nguyên khối phù hợp hơn với ứng dụng đơn giản, nhẹ. Nếu dùng nó để phát triển ứng dụng phức tạp thì thực sự sẽ rất tệ. Mẫu kiến trúc microservices có thể dùng để xây dựng ứng dụng phức tạp; tất nhiên, mô hình kiến trúc này cũng có nhược điểm và thách thức riêng.
