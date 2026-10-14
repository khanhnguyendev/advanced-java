---
source:
  locale: zh
  slug: event-driven-data-management-for-microservices
  hash: 'sha256:v1:8282c603281ab570084c941917f5d2b0715c75b1c1b6ad6d1d90caf2b72edb5e'
status: machine
translatedAt: '2026-10-14'
---
# Quản lý dữ liệu hướng sự kiện của microservices

## 1.1 Microservices và bài toán quản lý dữ liệu phân tán

Ứng dụng nguyên khối thường có một cơ sở dữ liệu quan hệ, lợi ích đi kèm là ứng dụng có thể dùng giao dịch ACID, mang lại một số đặc tính vận hành quan trọng:

1. Atomicity (tính nguyên tử) – mọi thay đổi đều có tính nguyên tử
2. Consistency (tính nhất quán) – trạng thái cơ sở dữ liệu luôn nhất quán
3. Isolation (tính cô lập) – dù các giao dịch thực thi đồng thời, trông vẫn như tuần tự
4. Durable (tính bền vững) – một khi giao dịch đã commit thì không thể rollback

Với các đặc tính trên, ứng dụng có thể được đơn giản hóa thành: bắt đầu một giao dịch, thay đổi (chèn, xóa, cập nhật) nhiều dòng, rồi commit giao dịch.

Một ưu điểm khác của cơ sở dữ liệu quan hệ là hỗ trợ SQL (ngôn ngữ truy vấn mạnh, khai báo, hướng bảng). Người dùng có thể rất dễ dàng kết hợp dữ liệu của nhiều bảng bằng truy vấn, bộ lập lịch truy vấn của RDBMS quyết định cách thực thi tốt nhất, người dùng không cần lo các vấn đề ở tầng thấp như cách truy cập cơ sở dữ liệu. Ngoài ra, vì mọi dữ liệu của ứng dụng đều ở trong một cơ sở dữ liệu nên rất dễ truy vấn.

Tuy nhiên, với kiến trúc microservices, việc truy cập dữ liệu trở nên rất phức tạp, vì dữ liệu là riêng tư của từng microservice và cách duy nhất để truy cập là qua API. Cách đóng gói truy cập dữ liệu này giúp các microservices ràng buộc lỏng và độc lập với nhau. Nếu nhiều dịch vụ truy cập cùng một dữ liệu thì mỗi lần cập nhật schema sẽ phải thay đổi thời điểm truy cập và phối hợp giữa mọi dịch vụ.

Hơn nữa, các microservices khác nhau thường dùng các cơ sở dữ liệu khác nhau. Ứng dụng sinh ra đủ loại dữ liệu, và cơ sở dữ liệu quan hệ không nhất thiết là lựa chọn tốt nhất. Trong một số tình huống, một cơ sở dữ liệu NoSQL có thể cung cấp mô hình dữ liệu tiện hơn, hiệu năng và khả năng mở rộng tốt hơn. Ví dụ, ứng dụng sinh ra và truy vấn chuỗi ký tự dùng công cụ tìm kiếm văn bản như Elasticsearch; tương tự, ứng dụng sinh dữ liệu đồ thị xã hội có thể dùng cơ sở dữ liệu đồ thị như Neo4j. Do đó, ứng dụng dựa trên microservices thường dùng kết hợp cả SQL và NoSQL, cách làm được gọi là polyglot persistence.

Kiến trúc lưu trữ dữ liệu phân vùng, polyglot-persistent có nhiều ưu điểm, gồm các dịch vụ ràng buộc lỏng cùng hiệu năng và khả năng mở rộng tốt hơn. Tuy nhiên, đi kèm là các thách thức của quản lý dữ liệu phân tán.

Thách thức đầu tiên là làm thế nào hoàn thành một giao dịch mà vẫn giữ được tính nhất quán dữ liệu giữa nhiều dịch vụ. Để thấy vấn đề này, lấy ví dụ một cửa hàng B2B trực tuyến: dịch vụ khách hàng duy trì các thông tin của khách hàng, ví dụ hạn mức tín dụng (credit lines). Dịch vụ đơn hàng quản lý đơn hàng, cần xác minh đơn mới không xung đột với hạn mức tín dụng của khách. Trong ứng dụng nguyên khối, dịch vụ đơn hàng chỉ cần dùng giao dịch ACID để kiểm tra tín dụng khả dụng và tạo đơn.

Ngược lại, trong kiến trúc microservices, bảng đơn hàng và bảng khách hàng là bảng riêng của dịch vụ tương ứng, như hình dưới:

![service table](diagram:micro-services/event-driven-data-management-for-microservices/private-table-of-the-corresponding-service)

Dịch vụ đơn hàng không thể truy cập trực tiếp bảng khách hàng mà chỉ có thể truy cập qua API do dịch vụ khách hàng công bố. Dịch vụ đơn hàng cũng có thể dùng giao dịch phân tán, tức là commit hai pha (2PC) quen thuộc. Tuy nhiên, 2PC không phải lựa chọn khả thi trong ứng dụng hiện nay. Theo định lý CAP, phải chọn giữa tính sẵn sàng (availability) và tính nhất quán ACID (consistency), và availability thường là lựa chọn tốt hơn. Hơn nữa, nhiều công nghệ hiện đại, như nhiều cơ sở dữ liệu NoSQL, không hỗ trợ 2PC. Duy trì tính nhất quán dữ liệu giữa các dịch vụ và cơ sở dữ liệu là yêu cầu căn bản, nên cần tìm giải pháp khác.

Thách thức thứ hai là làm thế nào truy xuất dữ liệu từ nhiều dịch vụ. Ví dụ, giả sử ứng dụng cần hiển thị khách hàng và các đơn hàng của họ. Nếu dịch vụ đơn hàng cung cấp API để nhận thông tin đơn hàng của khách thì có thể nhận dữ liệu bằng thao tác join ở phía ứng dụng: ứng dụng lấy thông tin khách từ dịch vụ khách hàng, lấy các đơn của khách này từ dịch vụ đơn hàng. Giả sử dịch vụ đơn hàng chỉ hỗ trợ truy vấn đơn theo khóa chính (có thể do dùng cơ sở dữ liệu NoSQL chỉ hỗ trợ truy xuất theo khóa chính), khi đó không có cách phù hợp để nhận dữ liệu cần thiết.

## 1.2 Kiến trúc hướng sự kiện

Với nhiều ứng dụng, giải pháp là dùng kiến trúc hướng sự kiện (event-driven architecture). Trong kiến trúc này, khi có việc quan trọng xảy ra, ví dụ cập nhật một thực thể nghiệp vụ, microservice sẽ phát một sự kiện. Khi microservice đăng ký các sự kiện này nhận được sự kiện, nó có thể cập nhật thực thể nghiệp vụ của chính mình, và cũng có thể kéo theo việc phát thêm sự kiện.

Có thể dùng sự kiện để thực hiện giao dịch nghiệp vụ xuyên nhiều dịch vụ. Giao dịch thường gồm một chuỗi bước, mỗi bước gồm một microservice cập nhật thực thể nghiệp vụ và phát một sự kiện kích hoạt bước tiếp theo. Hình dưới cho thấy cách dùng phương pháp hướng sự kiện để kiểm tra tín dụng khả dụng khi tạo đơn hàng, các microservices trao đổi sự kiện qua message broker.

1. Dịch vụ đơn hàng tạo một Order (đơn hàng) ở trạng thái NEW, phát sự kiện “Order Created Event” (tạo đơn hàng).

![Order-Created-Event](diagram:micro-services/event-driven-data-management-for-microservices/order-created-event)

2. Dịch vụ khách hàng tiêu thụ sự kiện Order Created Event, giữ trước tín dụng cho đơn hàng này, rồi phát sự kiện “Credit Reserved Event” (giữ trước tín dụng).

![Credit-Reserved-Event](diagram:micro-services/event-driven-data-management-for-microservices/credit-reserved-event)

3. Dịch vụ đơn hàng tiêu thụ Credit Reserved Event, đổi trạng thái đơn hàng thành OPEN.

![Status-is-OPEN](diagram:micro-services/event-driven-data-management-for-microservices/status-is-open)

Các tình huống phức tạp hơn có thể thêm nhiều bước, ví dụ giữ hàng tồn kho đồng thời với việc kiểm tra tín dụng của khách.

Xét rằng (a) mỗi dịch vụ cập nhật cơ sở dữ liệu và phát sự kiện một cách nguyên tử, và (b) message broker đảm bảo sự kiện được chuyển giao ít nhất một lần, thì có thể hoàn thành giao dịch nghiệp vụ xuyên nhiều dịch vụ (giao dịch này không phải giao dịch ACID). Mẫu này cung cấp đảm bảo yếu, ví dụ nhất quán cuối cùng (eventual consistency). Loại giao dịch này được gọi là mô hình BASE.

Cũng có thể dùng sự kiện để duy trì các view hiện thực hóa (materialized view) kết hợp trước (pre-join) dữ liệu do các microservices khác nhau sở hữu. Dịch vụ duy trì view này đăng ký các sự kiện liên quan và cập nhật view. Ví dụ, dịch vụ cập nhật view đơn hàng của khách (duy trì view đơn hàng của khách) sẽ đăng ký các sự kiện do dịch vụ khách hàng và dịch vụ đơn hàng phát ra.

![pre-join](diagram:micro-services/event-driven-data-management-for-microservices/pre-join)

Khi dịch vụ cập nhật view đơn hàng của khách nhận được sự kiện về khách hàng hoặc đơn hàng, nó sẽ cập nhật tập dữ liệu view đơn hàng của khách. Có thể dùng cơ sở dữ liệu tài liệu (ví dụ MongoDB) để hiện thực view đơn hàng của khách, lưu một tài liệu cho mỗi khách. Dịch vụ truy vấn view đơn hàng của khách chịu trách nhiệm trả lời các truy vấn về khách hàng và các đơn hàng gần đây (bằng cách truy vấn tập dữ liệu view đơn hàng của khách).

Kiến trúc hướng sự kiện cũng có cả ưu và nhược điểm. Kiến trúc này cho phép giao dịch xuyên nhiều dịch vụ và đảm bảo nhất quán cuối cùng, đồng thời cho phép ứng dụng duy trì các view hiện thực hóa; nhược điểm là mô hình lập trình phức tạp hơn mô hình giao dịch ACID: để phục hồi từ lỗi ở tầng ứng dụng, còn cần thực hiện các giao dịch bù (compensating transaction), ví dụ nếu kiểm tra tín dụng không thành công thì phải hủy đơn hàng; ngoài ra, ứng dụng phải đối phó với dữ liệu không nhất quán, vì thay đổi do các giao dịch đang diễn ra (in-flight) gây ra là nhìn thấy được, và ứng dụng cũng gặp vấn đề dữ liệu không nhất quán khi đọc view hiện thực hóa chưa được cập nhật. Một nhược điểm khác là bên đăng ký phải phát hiện và bỏ qua các sự kiện dư thừa.

## 1.3 Thao tác nguyên tử (Achieving Atomicity)

Kiến trúc hướng sự kiện còn gặp vấn đề về tính nguyên tử giữa cập nhật cơ sở dữ liệu và phát sự kiện. Ví dụ, dịch vụ đơn hàng phải chèn một dòng vào bảng ORDER rồi phát sự kiện Order Created; hai thao tác này cần có tính nguyên tử. Nếu sau khi cập nhật cơ sở dữ liệu, dịch vụ bị sập (crash) khiến sự kiện không được phát, hệ thống sẽ rơi vào trạng thái không nhất quán. Cách chuẩn để đảm bảo thao tác nguyên tử là dùng giao dịch phân tán bao gồm cả cơ sở dữ liệu và message broker. Tuy nhiên, dựa trên định lý CAP đã mô tả ở trên, đó không phải điều chúng ta muốn.

### 1.3.1 Dùng giao dịch cục bộ để phát sự kiện

Một cách để có tính nguyên tử là để ứng dụng phát sự kiện dùng một multi-step process chỉ gồm các giao dịch cục bộ. Mấu chốt là một bảng EVENT, bảng này đóng vai trò danh sách thông điệp trong cơ sở dữ liệu lưu thực thể nghiệp vụ. Ứng dụng bắt đầu một giao dịch (cục bộ) của cơ sở dữ liệu, cập nhật trạng thái thực thể nghiệp vụ, chèn một sự kiện vào bảng EVENT, rồi commit giao dịch. Một tiến trình hoặc luồng ứng dụng độc lập khác truy vấn bảng EVENT, phát sự kiện lên message broker, rồi dùng giao dịch cục bộ đánh dấu sự kiện đó là đã phát, như hình dưới:

![multi-step process](diagram:micro-services/event-driven-data-management-for-microservices/multi-step-process)

Dịch vụ đơn hàng chèn một dòng vào bảng ORDER, rồi chèn sự kiện Order Created vào bảng EVENT; luồng hoặc tiến trình phát sự kiện truy vấn bảng EVENT để lấy các sự kiện chưa phát, phát chúng, rồi cập nhật bảng EVENT để đánh dấu các sự kiện này là đã phát.

Cách này cũng có cả ưu và nhược điểm. Ưu điểm là đảm bảo việc phát sự kiện không phụ thuộc vào 2PC, và ứng dụng phát các sự kiện ở mức nghiệp vụ mà không cần suy luận chúng đã xảy ra như thế nào; nhược điểm là cách này dễ sai sót vì lập trình viên phải nhớ phát sự kiện. Ngoài ra, cách này là thách thức với một số ứng dụng dùng cơ sở dữ liệu NoSQL, vì bản thân NoSQL có khả năng giao dịch và truy vấn hạn chế.

Cách này không cần 2PC vì ứng dụng dùng giao dịch cục bộ để cập nhật trạng thái và phát sự kiện. Giờ hãy xem một cách khác, trong đó ứng dụng chỉ cần cập nhật trạng thái đơn giản mà vẫn đạt được tính nguyên tử.

### 1.3.2 Khai thác nhật ký giao dịch của cơ sở dữ liệu

Một cách khác để luồng hoặc tiến trình phát sự kiện có tính nguyên tử mà không cần 2PC là khai thác (mining) nhật ký giao dịch hoặc nhật ký commit của cơ sở dữ liệu. Ứng dụng cập nhật cơ sở dữ liệu, các thay đổi sinh ra trong nhật ký giao dịch của cơ sở dữ liệu; tiến trình hoặc luồng khai thác nhật ký giao dịch đọc các nhật ký này rồi phát chúng lên message broker. Như hình dưới:

![No-2PC-required](diagram:micro-services/event-driven-data-management-for-microservices/no-2pc-required)

Ví dụ của cách này là dự án LinkedIn Databus. Databus khai thác nhật ký giao dịch của Oracle và phát sự kiện dựa trên các thay đổi; LinkedIn dùng Databus để đảm bảo tính nhất quán giữa các bản ghi trong hệ thống.

Một ví dụ khác là cơ chế streams của AWS DynamoDB, một cơ sở dữ liệu NoSQL được quản lý. Một DynamoDB stream gồm các thay đổi (thao tác tạo, cập nhật và xóa) theo thứ tự thời gian của một bảng cơ sở dữ liệu trong 24 giờ qua; ứng dụng có thể đọc các thay đổi này từ stream rồi phát chúng dưới dạng sự kiện.

Khai thác nhật ký giao dịch cũng có cả ưu và nhược điểm. Ưu điểm là đảm bảo mỗi lần cập nhật đều phát sự kiện mà không phụ thuộc 2PC. Khai thác nhật ký giao dịch có thể được đơn giản hóa bằng cách tách việc phát sự kiện khỏi logic nghiệp vụ của ứng dụng; nhược điểm chính là nhật ký giao dịch có định dạng khác nhau ở các cơ sở dữ liệu khác nhau, thậm chí khác nhau giữa các phiên bản của cùng một cơ sở dữ liệu; ngoài ra rất khó chuyển từ các bản ghi cập nhật nhật ký giao dịch cấp thấp sang sự kiện nghiệp vụ cấp cao.

Cách khai thác nhật ký giao dịch cho phép ứng dụng cập nhật trực tiếp cơ sở dữ liệu mà không cần 2PC can thiệp. Tiếp theo xem một cách hoàn toàn khác: không cần cập nhật trạng thái mà chỉ dựa vào sự kiện.

### 1.3.3 Dùng event sourcing

Event sourcing (nguồn sự kiện) đạt được tính nguyên tử mà không cần 2PC, đảm bảo tính nhất quán của thực thể nghiệp vụ, bằng cách dùng một cách tiếp cận hoàn toàn khác, lấy sự kiện làm trung tâm. Ứng dụng lưu một chuỗi các sự kiện thay đổi trạng thái của thực thể nghiệp vụ, thay vì lưu trạng thái hiện tại của thực thể. Ứng dụng có thể dựng lại trạng thái hiện tại của thực thể bằng cách phát lại (replay) các sự kiện. Mỗi khi thực thể nghiệp vụ thay đổi, sự kiện mới được thêm vào dòng thời gian. Vì lưu sự kiện là một thao tác đơn nên chắc chắn có tính nguyên tử.

Để hiểu cách event sourcing hoạt động, hãy xét thực thể đơn hàng làm ví dụ. Theo cách truyền thống, mỗi đơn hàng ánh xạ tới một dòng trong bảng ORDER, ví dụ cùng các dòng trong bảng ORDER_LINE_ITEM. Nhưng với event sourcing, dịch vụ đơn hàng lưu một đơn hàng dưới dạng chuỗi sự kiện thay đổi trạng thái: đã tạo, đã phê duyệt, đã giao hàng, đã hủy; mỗi sự kiện chứa đủ dữ liệu để dựng lại trạng thái đơn hàng.

![Event-sourcing](diagram:micro-services/event-driven-data-management-for-microservices/event-sourcing)

Sự kiện được lưu lâu dài trong cơ sở dữ liệu sự kiện (event store), cung cấp API để thêm và lấy các sự kiện của thực thể. Event store tương tự message broker đã mô tả ở trên, cung cấp API để đăng ký sự kiện. Event store chuyển sự kiện đến mọi bên đăng ký quan tâm; event store là xương sống của kiến trúc microservices hướng sự kiện.

Event sourcing có nhiều ưu điểm: giải quyết vấn đề then chốt của kiến trúc hướng sự kiện, cho phép phát sự kiện một cách đáng tin cậy mỗi khi có thay đổi trạng thái, từ đó giải quyết vấn đề nhất quán dữ liệu trong kiến trúc microservices. Ngoài ra, vì lưu bền vững sự kiện thay vì đối tượng nên tránh được object relational impedance mismatch problem.

Event sourcing cung cấp nhật ký giám sát thay đổi của thực thể nghiệp vụ đáng tin cậy 100%, cho phép lấy trạng thái của thực thể tại bất kỳ thời điểm nào. Ngoài ra, event sourcing cho phép logic nghiệp vụ được cấu thành từ các thực thể nghiệp vụ ràng buộc lỏng trao đổi sự kiện với nhau. Những ưu điểm này khiến việc chuyển ứng dụng nguyên khối sang kiến trúc microservices trở nên tương đối dễ dàng.

Event sourcing cũng có khá nhiều nhược điểm: do dùng mô hình lập trình khác hoặc chưa quen nên việc học lại không dễ; event store chỉ hỗ trợ truy vấn thực thể nghiệp vụ theo khóa chính, phải dùng Command Query Responsibility Segregation (CQRS) để thực hiện truy vấn, do đó ứng dụng phải xử lý dữ liệu nhất quán cuối cùng.

## 1.4 Tổng kết

Trong kiến trúc microservices, mỗi microservice có tập dữ liệu riêng của mình. Các microservices khác nhau có thể dùng cơ sở dữ liệu SQL hoặc NoSQL khác nhau. Dù kiến trúc cơ sở dữ liệu này có ưu điểm mạnh, nó cũng đối mặt với thách thức quản lý dữ liệu phân tán. Thách thức đầu tiên là làm thế nào duy trì tính nhất quán của giao dịch nghiệp vụ giữa nhiều dịch vụ; thách thức thứ hai là làm thế nào lấy dữ liệu nhất quán từ môi trường nhiều dịch vụ.

Giải pháp tốt nhất là áp dụng kiến trúc hướng sự kiện. Một thách thức gặp phải là làm thế nào cập nhật trạng thái và phát sự kiện một cách nguyên tử. Có vài cách giải quyết, gồm coi cơ sở dữ liệu như hàng đợi thông điệp, khai thác nhật ký giao dịch và event sourcing.
