---
source:
  locale: zh
  slug: choose-microservice-deployment-strategy
  hash: 'sha256:v1:2519b18314c84f277d64c25b1f82e2da8393e8b6d787812b7114a399d65d0b31'
status: machine
translatedAt: '2026-10-14'
---
# Lựa chọn chiến lược triển khai microservices

## Mở đầu

Triển khai một ứng dụng nguyên khối nghĩa là chạy nhiều bản sao của một ứng dụng lớn, thường là cấp một số (N) máy chủ (vật lý hoặc ảo) và chạy một số (M) instance của ứng dụng. Triển khai ứng dụng nguyên khối không hoàn toàn đơn giản, nhưng chắc chắn dễ hơn triển khai ứng dụng microservices.

Một ứng dụng microservices gồm hàng trăm dịch vụ, các dịch vụ có thể được viết bằng những ngôn ngữ và framework khác nhau. Mỗi dịch vụ là một ứng dụng nhỏ riêng, có yêu cầu riêng về triển khai, tài nguyên, mở rộng và giám sát. Ví dụ, có thể chạy một số instance của dịch vụ tùy theo nhu cầu, ngoài ra mỗi instance phải có CPU, bộ nhớ và tài nguyên I/O riêng. Dù phức tạp, thách thức lớn hơn là việc triển khai dịch vụ phải nhanh, đáng tin cậy và tiết kiệm chi phí.

Có một số mẫu triển khai microservices; trước hết hãy bàn về mẫu nhiều instance dịch vụ trên mỗi máy chủ.

## Mẫu nhiều instance dịch vụ trên một máy chủ

Một cách triển khai microservices là mẫu nhiều instance dịch vụ trên một máy chủ. Với mẫu này, cần cấp một số máy vật lý hoặc máy ảo, và chạy nhiều instance dịch vụ trên mỗi máy. Trong nhiều trường hợp, đây là cách triển khai ứng dụng truyền thống. Mỗi instance dịch vụ chạy trên một cổng well-known của một hoặc nhiều máy chủ, và các máy chủ có thể được coi như thú cưng (pets).

Hình dưới đây thể hiện kiến trúc này:

![deployment-strategy-1](diagram:micro-services/choose-microservice-deployment-strategy/deployment-strategy-1)

Mẫu này có một vài tham số. Một tham số là mỗi instance dịch vụ gồm bao nhiêu tiến trình. Ví dụ, cần triển khai một instance dịch vụ Java dưới dạng ứng dụng web trên Apache Tomcat Server. Một instance dịch vụ Node.js có thể gồm một tiến trình cha và một số tiến trình con.

Một tham số khác xác định có bao nhiêu instance dịch vụ chạy trong cùng một nhóm tiến trình. Ví dụ, có thể chạy nhiều ứng dụng web Java trên cùng một Apache Tomcat Server, hoặc chạy nhiều bundle OSGi trong cùng một container OSGi.

Mẫu nhiều instance dịch vụ trên một máy chủ cũng có cả ưu lẫn nhược điểm. Ưu điểm chính là hiệu quả sử dụng tài nguyên. Nhiều instance dịch vụ dùng chung máy chủ và hệ điều hành; nếu một nhóm tiến trình chạy nhiều instance dịch vụ thì còn hiệu quả hơn, ví dụ nhiều ứng dụng web dùng chung một Apache Tomcat Server và JVM.

Một ưu điểm khác là triển khai instance dịch vụ rất nhanh. Chỉ cần sao chép dịch vụ lên máy chủ và khởi động. Nếu dịch vụ viết bằng Java, chỉ cần sao chép tệp JAR hoặc WAR. Với các ngôn ngữ khác như Node.js hay Ruby, cần sao chép mã nguồn. Nói cách khác, tải mạng rất thấp.

Vì không có nhiều tải nên khởi động dịch vụ rất nhanh. Nếu dịch vụ là một tiến trình tự chứa, chỉ cần khởi động; ngược lại, nếu là một instance dịch vụ chạy trong nhóm tiến trình của container, thì cần triển khai động vào container hoặc khởi động lại container.

Ngoài các ưu điểm trên, mẫu này cũng có nhược điểm. Một nhược điểm chính là giữa các instance dịch vụ có rất ít hoặc không có cô lập, trừ khi mỗi instance dịch vụ là một tiến trình riêng. Nếu muốn giám sát chính xác tài nguyên mà mỗi instance dịch vụ sử dụng thì không thể giới hạn tài nguyên của từng instance. Do đó, có thể xảy ra tình trạng một instance dịch vụ hoạt động tệ chiếm hết bộ nhớ hoặc CPU của máy chủ.

Nhiều instance dịch vụ trong cùng một tiến trình hoàn toàn không được cô lập. Ví dụ, tất cả instance có thể dùng chung một JVM heap. Một instance dịch vụ hoạt động tệ có thể dễ dàng gây ảnh hưởng đến các dịch vụ khác trong cùng tiến trình; thậm chí có thể không giám sát được tài nguyên mà từng instance dịch vụ sử dụng.

Một vấn đề nghiêm trọng khác là đội vận hành phải biết các bước triển khai chi tiết. Dịch vụ có thể được viết bằng nhiều ngôn ngữ và framework khác nhau, nên đội phát triển chắc chắn phải trao đổi rất nhiều với đội vận hành. Độ phức tạp đó làm tăng khả năng xảy ra lỗi trong quá trình triển khai.

Có thể thấy, dù quen thuộc, mẫu nhiều instance dịch vụ trên một máy chủ có nhiều nhược điểm nghiêm trọng. Hãy xem có cách triển khai microservices nào khác tránh được các vấn đề này không.

## Mẫu một instance dịch vụ trên một máy chủ

Một cách triển khai microservices khác là mẫu một instance trên một máy chủ. Khi dùng mẫu này, các instance dịch vụ trên mỗi máy chủ độc lập với nhau. Có hai cách hiện thực khác nhau: một instance trên một máy ảo và một instance trên một container.

### Mẫu một instance trên một máy ảo

Với mẫu một instance trên một máy ảo, thường đóng gói dịch vụ thành image máy ảo, ví dụ một Amazon EC2 AMI. Mỗi instance dịch vụ là một VM (ví dụ một EC2 instance) khởi động từ image này. Hình dưới đây thể hiện kiến trúc này:

![deployment-strategy-2](diagram:micro-services/choose-microservice-deployment-strategy/deployment-strategy-2)

Netflix dùng kiến trúc này để triển khai dịch vụ video streaming. Netflix dùng Aminator để đóng gói từng dịch vụ thành một EC2 AMI; mỗi instance dịch vụ đang chạy là một EC2 instance.

Có nhiều công cụ để tự dựng các VM. Có thể cấu hình một máy chủ tích hợp liên tục (CI), ví dụ Jenkins, để gọi Aminator đóng gói dịch vụ thành EC2 AMI. packer.io là một lựa chọn khác để tạo image máy ảo tự động. Khác với Aminator, nó hỗ trợ một loạt công nghệ ảo hóa như EC2, DigitalOcean, VirtualBox và VMware.

Công ty Boxfuse có cách sáng tạo để tạo image máy ảo, khắc phục các nhược điểm nêu dưới đây. Boxfuse đóng gói ứng dụng Java thành image máy ảo tối thiểu; chúng được tạo nhanh, khởi động nhanh, và an toàn hơn vì lộ ra ít API dịch vụ hơn.

Công ty CloudNative có một ứng dụng SaaS để tạo EC2 AMI tên là Bakery. Sau khi kiến trúc microservices của người dùng vượt qua kiểm thử, có thể cấu hình máy chủ CI của riêng mình để kích hoạt Bakery. Bakery đóng gói dịch vụ thành AMI. Dùng ứng dụng SaaS như Bakery nghĩa là không phải mất thời gian dựng hạ tầng tạo AMI của riêng mình.

Mẫu một instance dịch vụ trên một VM có nhiều ưu điểm. Ưu điểm chính của VM là mỗi instance dịch vụ chạy hoàn toàn độc lập, có CPU và bộ nhớ riêng mà không bị dịch vụ khác chiếm dụng.

Một lợi ích khác là có thể dùng hạ tầng đám mây đã trưởng thành, như của AWS; các dịch vụ đám mây cung cấp những tính năng hữu ích như cân bằng tải và khả năng mở rộng.

Một lợi ích nữa là công nghệ hiện thực dịch vụ được đóng gói tự chứa. Một khi dịch vụ được đóng gói thành VM thì nó trở thành một hộp đen. API quản lý của VM trở thành API để triển khai dịch vụ, khiến việc triển khai trở nên rất đơn giản và đáng tin cậy.

Mẫu một instance trên một VM cũng có nhược điểm. Một nhược điểm là hiệu quả sử dụng tài nguyên không cao. Mỗi instance dịch vụ chiếm toàn bộ tài nguyên của một máy ảo, kể cả hệ điều hành. Hơn nữa, trong môi trường IaaS công cộng điển hình, tài nguyên máy ảo được chuẩn hóa nên có thể không được dùng hết.

Ngoài ra, IaaS công cộng tính phí theo VM bất kể VM có bận hay không; ví dụ AWS có tính năng tự động mở rộng, nhưng phản ứng chưa nhanh với nhu cầu theo yêu cầu, buộc người dùng phải triển khai nhiều VM hơn và do đó tăng chi phí triển khai.

Một nhược điểm khác là triển khai phiên bản mới của dịch vụ khá chậm. Image máy ảo do kích thước lớn nên tạo khá chậm; vì cùng lý do, khởi tạo VM cũng chậm, hệ điều hành khởi động cũng cần thời gian. Tuy nhiên không phải lúc nào cũng vậy; một số VM nhẹ, như các VM tạo bằng Boxfuse, khá nhanh.

Nhược điểm thứ ba là đội vận hành phải chịu trách nhiệm cho nhiều công việc tùy biến. Trừ khi dùng công cụ như Boxfuse để giảm bớt phần lớn công việc tạo và quản lý VM; nếu không sẽ tốn nhiều thời gian cho những việc không liên quan nhiều đến nghiệp vụ cốt lõi.

Vậy hãy xem một cách triển khai microservices khác, vẫn có đặc tính của máy ảo nhưng nhẹ hơn.

## Mẫu một instance dịch vụ trên một container

Khi dùng mẫu này, mỗi instance dịch vụ chạy trong container riêng. Container là cơ chế ảo hóa ở tầng hệ điều hành. Một container gồm một số tiến trình chạy trong sandbox. Từ góc nhìn của tiến trình, chúng có không gian tên (namespace) và hệ thống tệp gốc riêng; có thể giới hạn tài nguyên bộ nhớ và CPU của container. Một số container còn có giới hạn I/O. Các công nghệ container loại này gồm Docker và Solaris Zones.

Hình dưới đây thể hiện mẫu này:

![deployment-strategy-3](diagram:micro-services/choose-microservice-deployment-strategy/deployment-strategy-3)

Để dùng mẫu này cần đóng gói dịch vụ thành image container. Image container là một hệ thống tệp chứa các thư viện và ứng dụng cần thiết để chạy dịch vụ. Một số image container gồm cả hệ thống tệp gốc Linux đầy đủ, số khác thì nhẹ. Ví dụ, để triển khai một dịch vụ Java, cần tạo image container chứa thư viện chạy Java, có thể kèm Apache Tomcat server, cùng ứng dụng Java đã biên dịch.

Khi đã đóng gói dịch vụ thành image container, cần khởi động một số container. Thường chạy nhiều container trên một máy vật lý hoặc máy ảo, và có thể cần một hệ thống quản lý cụm như Kubernetes hoặc Marathon để quản lý container. Hệ thống quản lý cụm coi các máy chủ là một nhóm tài nguyên, và tùy theo nhu cầu tài nguyên của từng container mà quyết định lập lịch container lên máy chủ nào.

Mẫu một instance dịch vụ trên một container cũng có cả ưu và nhược điểm. Ưu điểm của container khá giống VM: các instance dịch vụ hoàn toàn độc lập với nhau, và dễ giám sát tài nguyên mà mỗi container tiêu thụ. Giống VM, container dùng kỹ thuật cô lập để triển khai dịch vụ. API quản lý container cũng có thể dùng làm API quản lý dịch vụ.

Tuy nhiên, khác với VM, container là công nghệ nhẹ. Image container được tạo rất nhanh; ví dụ trên laptop, đóng gói một ứng dụng Spring Boot thành image container chỉ mất 5 giây. Vì không cần cơ chế khởi động hệ điều hành nên container cũng khởi động nhanh. Khi container khởi động xong thì dịch vụ bên trong cũng đã chạy.

Dùng container cũng có một số nhược điểm. Dù hạ tầng container phát triển nhanh, vẫn chưa trưởng thành bằng hạ tầng VM. Hơn nữa, vì các container chia sẻ nhân của hệ điều hành host nên không an toàn bằng VM.

Ngoài ra, công nghệ container đặt ra nhiều yêu cầu tùy biến cho việc quản lý image container; trừ khi dùng Google Container Engine hoặc Amazon EC2 Container Service (ECS), người dùng sẽ phải quản lý cả hạ tầng container lẫn hạ tầng VM.

Thứ ba, container thường được triển khai trên hạ tầng tính phí theo VM, nên rõ ràng khách hàng cũng sẽ tốn thêm chi phí triển khai để đáp ứng tải tăng.

Điều thú vị là ranh giới giữa container và VM ngày càng mờ nhạt. Như đã nói, VM của Boxfuse được tạo và khởi động đều nhanh, công nghệ Clear Containers hướng tới tạo VM nhẹ. Công nghệ của công ty Unikernel cũng thu hút sự chú ý, và Docker gần đây đã mua lại công ty Unikernel.

Ngoài những điều trên, công nghệ triển khai serverless, tránh được các nhược điểm của container và VM nêu trên, đang thu hút ngày càng nhiều sự chú ý. Hãy cùng xem.

## Triển khai Serverless

AWS Lambda là một ví dụ về công nghệ triển khai serverless, hỗ trợ các dịch vụ Java, Node.js và Python; chỉ cần đóng gói dịch vụ thành tệp ZIP và tải lên AWS Lambda là có thể triển khai. Có thể cung cấp metadata, gồm tên hàm xử lý yêu cầu dịch vụ (một sự kiện). AWS Lambda tự động chạy đủ số microservice để xử lý yêu cầu, và chỉ tính phí theo thời gian chạy và lượng bộ nhớ tiêu thụ. Tất nhiên, quỷ nằm ở chi tiết, AWS Lambda cũng có giới hạn. Nhưng việc không phải lo lắng về bất kỳ khía cạnh nào của máy chủ, máy ảo hay container là điều hoàn toàn hấp dẫn.

Hàm Lambda là dịch vụ không trạng thái. Thường xử lý yêu cầu bằng cách kích hoạt các dịch vụ của AWS. Ví dụ, khi image được tải lên một S3 bucket và kích hoạt hàm Lambda, có thể chèn một bản ghi vào bảng image của DynamoDB, phát một thông điệp lên luồng Kinesis, kích hoạt hành động xử lý image. Hàm Lambda cũng có thể được kích hoạt qua dịch vụ web của bên thứ ba.

Có bốn cách kích hoạt hàm Lambda:

-   Trực tiếp, dùng yêu cầu dịch vụ web
-   Tự động, phản hồi các sự kiện phát sinh từ, ví dụ, AWS S3, DynamoDB, Kinesis hoặc Simple Email Service
-   Tự động, thông qua AWS API Gateway để xử lý các yêu cầu HTTP từ client của ứng dụng
-   Theo lịch, thông qua cron, khá giống bộ hẹn giờ

Có thể thấy AWS Lambda là cách rất tiện để triển khai microservices. Cách tính phí theo yêu cầu nghĩa là chỉ phải trả cho phần tải mà nghiệp vụ của mình xử lý; ngoài ra, vì không cần hiểu hạ tầng bên dưới nên chỉ cần phát triển ứng dụng của mình.

Tuy nhiên vẫn có khá nhiều giới hạn. Không dùng để triển khai các dịch vụ chạy dài, ví dụ dịch vụ tiêu thụ thông điệp được chuyển tiếp từ broker bên thứ ba; yêu cầu phải hoàn thành trong 300 giây; dịch vụ phải không trạng thái vì về lý thuyết AWS Lambda sẽ tạo một instance riêng cho mỗi yêu cầu; phải viết bằng một trong các ngôn ngữ được hỗ trợ; dịch vụ phải khởi động nhanh, nếu không sẽ bị dừng do hết thời gian chờ.
Triển khai ứng dụng microservices cũng là một thách thức. Có hàng trăm, hàng nghìn dịch vụ viết bằng nhiều ngôn ngữ và framework. Mỗi dịch vụ là một ứng dụng nhỏ, có yêu cầu riêng về triển khai, tài nguyên, mở rộng và giám sát. Có một số mẫu triển khai microservices, gồm một instance trên một VM và một instance trên một container. Lựa chọn khác là AWS Lambda, một cách tiếp cận serverless.
