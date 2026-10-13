---
source:
  locale: zh
  slug: microservices-introduction
  hash: 'sha256:v1:91c87caf8b7ad5627548fd34a87ead0b80a044ae9dfd851fa424333cac85c07b'
status: machine
translatedAt: '2026-10-14'
---
# Mô tả về kiến trúc microservices

> Dịch từ bài [Microservices](https://martinfowler.com/articles/microservices.html) trên trang web của [Martin Fowler](https://martinfowler.com/). Bài viết khá dài, cần một chút kiên nhẫn khi đọc.<br> Trình độ của người dịch có hạn, nếu có chỗ nào chưa phù hợp, mong các bạn góp ý chỉnh sửa, xin cảm ơn.

Trong vài năm qua đã xuất hiện thuật ngữ "kiến trúc microservices", mô tả một phương pháp cụ thể để thiết kế ứng dụng phần mềm thành một bộ gồm nhiều dịch vụ có thể triển khai độc lập. Mặc dù phong cách kiến trúc này chưa có định nghĩa chính xác, nhưng xét về cách tổ chức xoay quanh năng lực nghiệp vụ, triển khai tự động, endpoint thông minh, cũng như kiểm soát phân tán về ngôn ngữ và dữ liệu, chúng vẫn có một số đặc điểm chung.

"Microservices" là một thuật ngữ mới nữa trên con phố đông đúc của kiến trúc phần mềm. Dù xu hướng tự nhiên của chúng ta là liếc nhìn nó một cách coi thường, nhưng thuật ngữ này mô tả một phong cách hệ thống phần mềm ngày càng hấp dẫn. Trong vài năm qua, chúng tôi đã thấy nhiều dự án sử dụng phong cách này, và cho đến nay kết quả đều tích cực, đến mức nó đã trở thành phong cách mặc định để xây dựng ứng dụng doanh nghiệp của nhiều đồng nghiệp ThoughtWorks của chúng tôi. Tuy nhiên đáng tiếc là không có nhiều thông tin tổng quan về phong cách microservices và cách hiện thực nó.

Nói ngắn gọn, phong cách kiến trúc microservices [1] là một phương pháp phát triển một ứng dụng đơn lẻ thành một bộ các dịch vụ nhỏ, mỗi dịch vụ nhỏ chạy trong tiến trình riêng của mình và giao tiếp với nhau bằng cơ chế nhẹ (thường là API tài nguyên HTTP). Các dịch vụ này được xây dựng xoay quanh các chức năng nghiệp vụ, và có thể được triển khai độc lập thông qua cơ chế triển khai hoàn toàn tự động. Các dịch vụ này chỉ dùng chung một mức quản lý tập trung tối thiểu, chúng có thể được viết bằng các ngôn ngữ lập trình khác nhau và sử dụng các công nghệ lưu trữ dữ liệu khác nhau.

Trước khi bắt đầu giải thích phong cách microservices, sẽ hữu ích nếu so sánh nó với phong cách nguyên khối (monolithic): ứng dụng nguyên khối được xây dựng như một đơn vị duy nhất. Ứng dụng doanh nghiệp thường gồm ba phần: giao diện người dùng phía client (gồm các trang HTML và Javascript chạy trong trình duyệt trên máy của người dùng), hệ thống cơ sở dữ liệu (gồm nhiều bảng, thường được quản lý trong cơ sở dữ liệu quan hệ), và ứng dụng phía server. Ứng dụng phía server xử lý các yêu cầu HTTP, thực hiện một số xử lý logic, truy xuất và cập nhật dữ liệu từ cơ sở dữ liệu, chọn dữ liệu rồi điền vào các view HTML để gửi đến trình duyệt. Ứng dụng phía server này là một khối nguyên — một tệp thực thi logic [2]. Mọi thay đổi đối với hệ thống đều liên quan đến việc build và triển khai phiên bản mới của ứng dụng phía server.

Server nguyên khối kiểu này là cách tự nhiên để xây dựng hệ thống như vậy. Toàn bộ logic xử lý một yêu cầu chạy trong một tiến trình, cho phép bạn dùng các tính năng cơ bản của ngôn ngữ để chia ứng dụng thành các lớp, hàm và không gian tên. Cần lưu ý rằng bạn có thể chạy và kiểm thử ứng dụng trên laptop của lập trình viên, và dùng pipeline triển khai để đảm bảo các thay đổi đối với chương trình được kiểm thử đúng mức và triển khai lên môi trường production. Bạn có thể mở rộng theo chiều ngang khối nguyên này bằng cách chạy nhiều instance phía sau một bộ cân bằng tải.

Ứng dụng nguyên khối có thể thành công, nhưng ngày càng có nhiều người cảm thấy không hài lòng với chúng — đặc biệt là khi ngày càng nhiều ứng dụng được triển khai lên đám mây. Chu kỳ thay đổi bị ràng buộc với nhau — ngay cả khi chỉ thay đổi một phần nhỏ của ứng dụng, cũng cần build lại và triển khai toàn bộ ứng dụng nguyên khối. Theo thời gian, thường khó giữ được cấu trúc module hóa tốt, và càng khó giữ cho những thay đổi chỉ ảnh hưởng đến một module duy nhất. Khi mở rộng hệ thống, buộc phải mở rộng toàn bộ hệ thống ứng dụng, chứ không thể chỉ mở rộng những phần của hệ thống cần thêm tài nguyên.

![sketch](asset:micro-services/microservices-introduction/sketch.png)

Những điều không hài lòng này đã sinh ra phong cách kiến trúc microservices: xây dựng ứng dụng thành một bộ các dịch vụ. Ngoài thực tế là các dịch vụ có thể triển khai độc lập và mở rộng độc lập, mỗi dịch vụ còn cung cấp một ranh giới module vững chắc, thậm chí cho phép viết các dịch vụ khác nhau bằng các ngôn ngữ lập trình khác nhau. Chúng cũng có thể được quản lý bởi các nhóm khác nhau.

Chúng tôi không cho rằng phong cách microservices là mới mẻ hay đột phá; nguồn gốc của nó ít nhất có thể truy ngược về các nguyên tắc thiết kế của Unix. Nhưng chúng tôi cho rằng không có đủ nhiều người cân nhắc đến kiến trúc microservices, và nếu dùng nó, việc phát triển nhiều phần mềm sẽ trở nên tốt hơn.

## Các đặc điểm của kiến trúc microservices

Mặc dù không thể nói rằng phong cách kiến trúc microservices có một định nghĩa chính thức, nhưng chúng ta có thể thử mô tả một số đặc điểm chung mà chúng tôi cho rằng các kiến trúc phù hợp với nhãn này đều có. Như với bất kỳ định nghĩa nào phác thảo các đặc điểm chung, không phải mọi kiến trúc microservices đều có tất cả các đặc điểm, nhưng chúng tôi thực sự kỳ vọng hầu hết các kiến trúc microservices đều có hầu hết các đặc điểm. Mặc dù các tác giả chúng tôi luôn là thành viên tích cực của cộng đồng khá lỏng lẻo này, ý định của chúng tôi vẫn là thử mô tả những gì hai chúng tôi đã thấy trong công việc của bản thân và của các nhóm mà chúng tôi biết. Cần nói rõ rằng chúng tôi không đặt ra một số định nghĩa liên quan.

### Thành phần hóa thông qua dịch vụ

Từ khi tham gia ngành phần mềm, chúng ta luôn mong muốn xây dựng hệ thống bằng cách tích hợp các thành phần lại với nhau, giống như cách chúng ta thấy các vật thể trong thế giới vật lý được xây dựng. Trong vài thập kỷ qua, chúng ta đã thấy tiến bộ rất lớn ở các thư viện phần mềm dùng chung của hầu hết các nền tảng ngôn ngữ.

Khi nói về thành phần, chúng ta gặp một vấn đề khó về định nghĩa: thành phần là gì? Định nghĩa của chúng tôi là: thành phần là một đơn vị phần mềm có thể được thay thế và nâng cấp độc lập.

Kiến trúc microservices cũng sử dụng thư viện phần mềm, nhưng cách chính để thành phần hóa phần mềm là tách thành nhiều dịch vụ. Chúng tôi định nghĩa thư viện là thành phần được liên kết vào chương trình và được gọi bằng lời gọi hàm trong bộ nhớ, còn dịch vụ là một thành phần ngoài tiến trình, giao tiếp thông qua các cơ chế như yêu cầu Web service hoặc lời gọi thủ tục từ xa. (Điều này khác với khái niệm service object trong nhiều chương trình hướng đối tượng [3].)

Một lý do chính để dùng dịch vụ làm thành phần (thay vì thư viện) là dịch vụ có thể được triển khai độc lập. Nếu bạn có một ứng dụng [4] gồm nhiều thư viện trong một tiến trình duy nhất, thì bất kỳ thay đổi nào ở một thành phần cũng dẫn đến việc phải triển khai lại toàn bộ ứng dụng. Nhưng nếu ứng dụng có thể được tách thành nhiều dịch vụ, thì thay đổi của một dịch vụ đơn lẻ chỉ cần triển khai lại dịch vụ đó. Tất nhiên điều này không tuyệt đối, một số thay đổi giao diện dịch vụ có thể dẫn đến việc phải sửa đổi phối hợp giữa nhiều dịch vụ, nhưng mục tiêu của một kiến trúc microservices tốt là giảm thiểu những sửa đổi phối hợp này thông qua việc tăng tính cố kết của ranh giới dịch vụ và cơ chế tiến hóa của giao thức dịch vụ.

Một hệ quả khác của việc dùng dịch vụ làm thành phần là giao diện thành phần rõ ràng hơn. Hầu hết các ngôn ngữ không có cơ chế tốt để định nghĩa giao diện được công bố tường minh. Thường thì chỉ có tài liệu và quy tắc để ngăn client phá vỡ tính đóng gói của thành phần, điều này dẫn đến việc các thành phần liên kết chặt chẽ quá mức với nhau. Bằng cách dùng cơ chế gọi từ xa tường minh, dịch vụ có thể tránh tình trạng này dễ dàng hơn.

Dùng dịch vụ như vậy cũng có một số điểm không tốt. Lời gọi từ xa đắt hơn lời gọi trong tiến trình, API từ xa cần được thiết kế với độ chi tiết thô hơn, điều này thường khó dùng hơn. Nếu bạn cần thay đổi cách phân chia trách nhiệm giữa các thành phần, thì khi vượt qua ranh giới tiến trình, việc thay đổi hành vi thành phần này sẽ khó thực hiện hơn.

Xấp xỉ, chúng ta có thể ánh xạ từng dịch vụ thành từng tiến trình lúc chạy, nhưng đây chỉ là một sự xấp xỉ mà thôi. Một dịch vụ có thể gồm nhiều tiến trình luôn được phát triển và triển khai cùng nhau, ví dụ như tiến trình của một hệ thống ứng dụng và cơ sở dữ liệu chỉ do dịch vụ đó sử dụng.

### Tổ chức xoay quanh năng lực nghiệp vụ

Khi chia ứng dụng lớn thành nhiều phần, ban quản lý thường tập trung vào mặt kỹ thuật, dẫn đến việc chia thành nhóm UI, nhóm logic phía server, nhóm cơ sở dữ liệu. Khi các nhóm bị chia theo cách này, ngay cả một thay đổi đơn giản cũng có thể dẫn đến việc phải xin duyệt thời gian và ngân sách cho dự án liên nhóm. Một nhóm thông minh sẽ tối ưu hóa xung quanh điều này, theo kiểu "hại cả hai thì chọn cái nhẹ hơn" — chỉ cần ép logic vào bất kỳ ứng dụng nào họ có thể truy cập. Nói cách khác, logic có ở khắp mọi nơi. Đây là một ví dụ của định luật Conway [5].

> Bất kỳ tổ chức nào thiết kế một hệ thống (theo nghĩa rộng) cũng sẽ tạo ra một thiết kế mà cấu trúc của nó là bản sao của cấu trúc giao tiếp của tổ chức đó.<br> —— Melvyn Conway, 1967

![conways-law](asset:micro-services/microservices-introduction/conways-law.png)

Microservices dùng một cách phân chia khác, nó tách hệ thống thành nhiều dịch vụ xoay quanh các chức năng nghiệp vụ. Các dịch vụ này hiện thực phần mềm ở phạm vi rộng cho lĩnh vực nghiệp vụ đó, bao gồm giao diện người dùng, lưu trữ bền vững và mọi sự cộng tác bên ngoài. Do đó, các nhóm là đa chức năng, bao gồm toàn bộ kỹ năng cần cho phát triển: trải nghiệm người dùng, cơ sở dữ liệu và quản lý dự án.

![PreferFunctionalStaffOrganization](asset:micro-services/microservices-introduction/PreferFunctionalStaffOrganization.png)

Một công ty được tổ chức theo cách này là [www.comparethemarket.com](http://www.comparethemarket.com/). Các nhóm đa chức năng chịu trách nhiệm xây dựng và vận hành từng sản phẩm, mỗi sản phẩm được tách thành nhiều dịch vụ độc lập, giao tiếp với nhau thông qua message bus.

Ứng dụng nguyên khối lớn cũng có thể được module hóa xoay quanh các chức năng nghiệp vụ, mặc dù đây không phải trường hợp phổ biến. Tất nhiên, chúng tôi sẽ thúc giục các nhóm lớn xây dựng hệ thống ứng dụng nguyên khối hãy tự chia mình thành nhiều nhóm nhỏ theo dòng nghiệp vụ. Vấn đề chính chúng tôi thấy ở đây là họ thường tổ chức xoay quanh quá nhiều ngữ cảnh. Nếu khối nguyên vượt qua ranh giới module, thì với từng thành viên trong nhóm, rất khó để đưa chúng vào bộ nhớ ngắn hạn. Ngoài ra, chúng tôi thấy việc module hóa dây chuyền sản xuất cần rất nhiều quy tắc để thực thi. Sự tách biệt rõ ràng hơn mà thành phần dịch vụ đòi hỏi giúp việc giữ ranh giới nhóm rõ ràng dễ dàng hơn.

### Là sản phẩm chứ không phải dự án

Hầu hết các nỗ lực phát triển ứng dụng mà chúng tôi thấy đều dùng mô hình dự án như sau: mục tiêu là giao một số phần mềm, rồi là xong việc. Sau khi hoàn thành, phần mềm được bàn giao cho tổ chức bảo trì, và nhóm dự án đã xây dựng nó cũng giải tán theo.

Những người ủng hộ microservices có xu hướng tránh mô hình này, mà cho rằng nhóm nên chịu trách nhiệm cho toàn bộ vòng đời của sản phẩm. Một nguồn cảm hứng chung cho điều này là khái niệm ["you build, you run it"](https://queue.acm.org/detail.cfm?id=1142065) của Amazon, trong đó nhóm phát triển chịu hoàn toàn trách nhiệm đối với phần mềm trong production. Điều này khiến lập trình viên thường xuyên tiếp xúc với việc phần mềm của họ hoạt động ra sao trong môi trường production, và tăng thêm sự liên hệ với người dùng của họ, vì họ phải đảm nhận ít nhất một phần công việc hỗ trợ.

Tư duy sản phẩm gắn chặt với năng lực nghiệp vụ. Cần liên tục quan tâm đến việc phần mềm giúp người dùng nâng cao năng lực nghiệp vụ như thế nào, thay vì xem phần mềm là một tập các chức năng sắp được hoàn thành.

Không có lý do gì để phương pháp này không thể dùng cho ứng dụng đơn lẻ, nhưng độ chi tiết nhỏ hơn của dịch vụ giúp việc thiết lập quan hệ cá nhân giữa lập trình viên dịch vụ và người dùng dễ dàng hơn.

### Endpoint thông minh và đường ống ngốc

Khi thiết lập giao tiếp giữa các tiến trình khác nhau, chúng ta đã thấy nhiều sản phẩm và phương pháp đều nhấn mạnh việc đưa một lượng lớn tính năng thông minh vào chính cơ chế giao tiếp. Một ví dụ điển hình là enterprise service bus (ESB), trong đó các sản phẩm ESB thường bao gồm các công cụ phức tạp để định tuyến tin nhắn, điều phối (choreography), chuyển đổi và áp dụng các quy tắc nghiệp vụ.

Cộng đồng microservices có xu hướng áp dụng một cách tiếp cận khác: endpoint thông minh và đường ống ngốc. Mục tiêu của ứng dụng xây dựng trên microservices là tách rời nhiều nhất có thể và cố kết nhiều nhất có thể — chúng có logic miền riêng của mình, và hành vi của chúng giống bộ lọc trong triết lý UNIX cổ điển — nhận yêu cầu, áp dụng logic phù hợp và tạo ra phản hồi. Dùng các giao thức đơn giản kiểu REST để điều phối chúng, thay vì dùng các giao thức phức tạp như WS-Choreography hay BPEL hoặc điều phối (orchestration) qua công cụ trung tâm.

Hai giao thức được dùng phổ biến nhất là yêu cầu-phản hồi HTTP với API tài nguyên và truyền tin nhắn nhẹ [8]. Cách diễn đạt tốt nhất cho giao thức thứ nhất là

> Bản thân nó là web, chứ không phải ẩn đằng sau web.<br> ——[Ian Robinson](http://www.amazon.com/gp/product/0596805829?ie=UTF8&tag=martinfowlerc-20&linkCode=as2&camp=1789&creative=9325&creativeASIN=0596805829)

Các quy tắc và giao thức mà nhóm microservices sử dụng chính là các quy tắc và giao thức đã xây dựng nên World Wide Web (và ở mức lớn hơn là UNIX). Từ góc nhìn của lập trình viên và nhân viên vận hành, các tài nguyên thường được dùng có thể được cache rất dễ dàng.

Cách phổ biến thứ hai là truyền tin nhắn trên một message bus nhẹ. Hạ tầng được chọn thường là loại ngốc (ngốc ở đây chỉ đóng vai trò bộ định tuyến tin nhắn) — những hiện thực đơn giản như RabbitMQ hay ZeroMQ chỉ cung cấp một cấu trúc trao đổi bất đồng bộ đáng tin cậy — trong dịch vụ, các tính năng thông minh vẫn nằm ở các endpoint sản xuất và tiêu thụ nhiều tin nhắn, tức là nằm trong từng dịch vụ.

Trong ứng dụng nguyên khối, các thành phần đều thực thi trong cùng một tiến trình, chúng giao tiếp với nhau qua lời gọi phương thức hoặc lời gọi hàm. Vấn đề lớn nhất khi biến khối nguyên thành microservices là sự thay đổi về mô hình giao tiếp. Một cách chuyển đổi ngây thơ là chuyển từ lời gọi phương thức trong bộ nhớ sang RPC, điều này dẫn đến giao tiếp thường xuyên và hiệu năng kém. Ngược lại, bạn cần dùng giao tiếp có độ chi tiết thô thay cho giao tiếp có độ chi tiết mịn.

### Quản trị phi tập trung

Một hệ quả của quản trị tập trung là xu hướng chuẩn hóa trên một nền tảng công nghệ duy nhất. Kinh nghiệm cho thấy cách tiếp cận này đang thu hẹp — không phải vấn đề nào cũng là cái đinh, không phải vấn đề nào cũng là cái búa. Chúng tôi thích dùng đúng công cụ để hoàn thành công việc hơn, và ứng dụng nguyên khối ở một mức độ nào đó có thể tận dụng ưu thế của ngôn ngữ, nhưng điều này không phổ biến.

Tách các thành phần của khối nguyên thành dịch vụ, khi xây dựng các dịch vụ này bạn có thể có lựa chọn riêng. Bạn muốn dùng Node.js để phát triển một trang báo cáo đơn giản? Cứ làm đi. Dùng C++ hiện thực một thành phần cực kỳ thô gần như theo thời gian thực? Tuyệt vời. Bạn muốn đổi sang một cơ sở dữ liệu có phong cách khác, phù hợp hơn với thao tác đọc dữ liệu của thành phần? Chúng ta có công nghệ để dựng lại nó.

Tất nhiên, chỉ vì bạn có thể làm điều gì đó không có nghĩa là bạn nên làm — nhưng chia hệ thống theo cách này nghĩa là bạn có sự lựa chọn.

Khi xây dựng microservices, các nhóm cũng thích dùng các phương pháp khác nhau để đạt chuẩn. Họ thích ý tưởng tạo ra các công cụ hữu ích hơn là các chuẩn viết trên giấy, để các lập trình viên khác có thể dùng các công cụ này giải quyết các vấn đề tương tự mà họ gặp phải. Đôi khi, các công cụ này thường được thu hoạch trong quá trình hiện thực và chia sẻ với nhóm rộng hơn, nhưng không hoàn toàn dùng mô hình mã nguồn mở nội bộ. Hiện nay git và github đã trở thành lựa chọn thực tế cho hệ thống quản lý phiên bản, thực tiễn mở mã nguồn nội bộ cũng ngày càng phổ biến.

Netflix là một ví dụ rất tốt tuân theo triết lý này. Đặc biệt, việc chia sẻ mã hữu ích và đã được thị trường kiểm chứng dưới dạng thư viện khuyến khích các lập trình viên khác giải quyết các vấn đề tương tự theo cách tương tự, đồng thời vẫn mở cửa cho việc áp dụng các phương pháp khác. Các thư viện dùng chung có xu hướng tập trung vào các vấn đề chung như lưu trữ dữ liệu, giao tiếp liên tiến trình và tự động hóa hạ tầng mà chúng ta sẽ thảo luận sâu hơn ở phần sau.

Đối với cộng đồng microservices, chi phí phát sinh (overhead) đặc biệt thiếu sức hấp dẫn. Điều này không có nghĩa là cộng đồng không coi trọng hợp đồng dịch vụ. Ngược lại, chính vì họ có nhiều hợp đồng hơn. Chỉ là họ đang tìm những cách khác để quản lý các hợp đồng này. Các mẫu như [Tolerant Reader](https://martinfowler.com/bliki/TolerantReader.html) và [Consumer-Driven Contracts](https://martinfowler.com/articles/consumerDrivenContracts.html) thường được dùng trong microservices. Những mẫu này hỗ trợ hợp đồng dịch vụ tiến hóa độc lập. Việc thực thi các hợp đồng điều khiển bởi consumer như một phần của quá trình build làm tăng sự tự tin và cho phản hồi nhanh hơn về việc dịch vụ có đang hoạt động hay không. Thực tế, chúng tôi biết một nhóm ở Úc dùng mẫu hợp đồng điều khiển bởi consumer này để dẫn dắt việc xây dựng nghiệp vụ mới. Họ dùng công cụ đơn giản để định nghĩa hợp đồng của dịch vụ. Điều này đã trở thành một phần của quá trình build tự động, ngay cả khi mã của dịch vụ mới còn chưa được viết. Dịch vụ chỉ được tạo ra khi thỏa mãn hợp đồng - đây là một cách thanh lịch để tránh thế khó xử "YAGNI" [9] khi xây dựng phần mềm mới. Các công nghệ và công cụ phát triển xoay quanh điều này, bằng cách giảm sự ràng buộc tạm thời giữa các dịch vụ, đã hạn chế nhu cầu quản lý hợp đồng tập trung.

Có lẽ cảnh giới cao nhất của quản trị phi tập trung là triết lý build it/run it nổi tiếng của Amazon. Nhóm phải chịu trách nhiệm về mọi khía cạnh của phần mềm họ xây dựng, bao gồm vận hành 7\*24 giờ. Mức độ phân quyền trách nhiệm này chắc chắn là không theo khuôn mẫu, nhưng chúng tôi thấy ngày càng nhiều công ty để nhóm phát triển gánh thêm nhiều trách nhiệm hơn. Netflix là một công ty khác áp dụng triết lý này [11]. Mỗi ngày 3 giờ sáng bị máy nhắn tin đánh thức chắc chắn là một động lực mạnh mẽ khiến bạn quan tâm đến chất lượng khi viết mã. Đây là một số ý tưởng về việc tránh xa mô hình quản trị tập trung truyền thống càng nhiều càng tốt.

### Quản lý dữ liệu phân tán

Sự phi tập trung hóa quản lý dữ liệu có nhiều cách thể hiện khác nhau. Ở mức trừu tượng nhất, điều này có nghĩa là làm cho mô hình khái niệm của thế giới khác nhau giữa các hệ thống. Khi tích hợp một doanh nghiệp lớn, góc nhìn bán hàng của khách hàng sẽ khác với góc nhìn hỗ trợ, đây là một vấn đề phổ biến. Một số điều trong góc nhìn bán hàng của khách hàng có thể không xuất hiện trong góc nhìn hỗ trợ. Chúng thực sự có thể có các thuộc tính khác nhau và (tệ hơn) các thuộc tính chung, mà những thuộc tính chung này khác nhau tinh tế về mặt ngữ nghĩa.

Vấn đề này thường gặp giữa các ứng dụng, nhưng cũng có thể xảy ra bên trong ứng dụng, đặc biệt khi ứng dụng được chia thành các thành phần tách biệt. Một cách tư duy hữu ích là ý tưởng Domain-Driven Design (DDD) trong [ngữ cảnh có biên](http://martinfowler.com/bliki/BoundedContext.html) (Bounded Context). DDD chia một miền phức tạp thành nhiều ngữ cảnh có biên, đồng thời ánh xạ mối quan hệ giữa chúng. Quá trình này hữu ích cho cả kiến trúc nguyên khối và kiến trúc microservices, nhưng giữa dịch vụ và ranh giới ngữ cảnh có sự tương quan tự nhiên, ranh giới giúp làm rõ và tăng cường sự tách biệt, như đã mô tả trong phần năng lực nghiệp vụ.

Giống như việc phi tập trung hóa quyết định về mô hình khái niệm, microservices cũng phi tập trung hóa quyết định về lưu trữ dữ liệu. Trong khi ứng dụng nguyên khối thích một cơ sở dữ liệu logic duy nhất để lưu trữ bền vững, thì doanh nghiệp thường có xu hướng để một loạt ứng dụng dùng chung một cơ sở dữ liệu duy nhất — những quyết định này bị thúc đẩy bởi mô hình kinh doanh cấp phép của nhà cung cấp. Microservices có xu hướng để mỗi dịch vụ quản lý cơ sở dữ liệu của riêng mình, hoặc các instance khác nhau của cùng một công nghệ cơ sở dữ liệu, hoặc các hệ thống cơ sở dữ liệu hoàn toàn khác nhau - đây chính là cái gọi là [lưu trữ bền vững hỗn hợp](https://martinfowler.com/bliki/PolyglotPersistence.html) (Polyglot Persistence). Bạn có thể dùng lưu trữ bền vững hỗn hợp trong ứng dụng nguyên khối, nhưng nó xuất hiện thường xuyên hơn trong các dịch vụ.

![decentralised-data](asset:micro-services/microservices-introduction/decentralised-data.png)

Đối với dữ liệu xuyên qua các microservices, việc phi tập trung hóa trách nhiệm có ảnh hưởng đến việc quản lý cập nhật. Cách thường dùng để xử lý cập nhật là dùng giao dịch để đảm bảo tính nhất quán khi cập nhật nhiều tài nguyên. Phương pháp này thường được dùng trong khối nguyên.

Dùng giao dịch như vậy giúp ích cho tính nhất quán, nhưng sẽ tạo ra sự ràng buộc tạm thời đáng kể, điều này gây vấn đề khi trải rộng nhiều dịch vụ. Giao dịch phân tán nổi tiếng là khó hiện thực, vì vậy kiến trúc microservices nhấn mạnh [sự cộng tác không giao dịch giữa các dịch vụ](http://www.eaipatterns.com/ramblings/18_starbucks.html), với nhận thức rõ ràng rằng tính nhất quán có thể chỉ là nhất quán cuối cùng và các vấn đề được xử lý bằng các thao tác bù trừ.

Đối với nhiều nhóm phát triển, chọn quản lý sự không nhất quán theo cách này là một thách thức mới, nhưng điều này thường phù hợp với thực tiễn kinh doanh. Thường thì doanh nghiệp chấp nhận một mức độ không nhất quán nhất định để đáp ứng nhu cầu nhanh chóng, đồng thời có một số kiểu quy trình đảo ngược để xử lý lỗi. Sự đánh đổi này là xứng đáng, miễn là chi phí sửa lỗi nhỏ hơn chi phí tổn thất nghiệp vụ do tính nhất quán cao hơn.

### Tự động hóa hạ tầng

Các kỹ thuật tự động hóa hạ tầng đã có những thay đổi to lớn trong vài năm qua — đặc biệt là sự phát triển của đám mây và AWS đã giảm độ phức tạp vận hành khi xây dựng, triển khai và chạy microservices.

Nhiều sản phẩm hoặc hệ thống xây dựng bằng microservices được xây dựng bởi các nhóm có nhiều kinh nghiệm về phân phối liên tục và tích hợp liên tục. Các nhóm xây dựng phần mềm theo cách này sử dụng rộng rãi các kỹ thuật tự động hóa hạ tầng. Như minh họa trong build pipeline dưới đây.

![basic-pipeline](asset:micro-services/microservices-introduction/basic-pipeline.png)

Vì đây không phải là bài viết về phân phối liên tục, ở đây chúng tôi chỉ tập trung vào vài đặc tính then chốt của phân phối liên tục. Chúng tôi muốn có càng nhiều sự tự tin càng tốt rằng phần mềm của mình chạy bình thường, vì vậy chúng tôi thực hiện rất nhiều **kiểm thử tự động**. Muốn phần mềm đạt trạng thái "thăng cấp" (Promotion) để được "đẩy lên" pipeline, nghĩa là phải **triển khai tự động** phần mềm vào từng môi trường mới.

Một ứng dụng nguyên khối có thể rất vui vẻ được build, kiểm thử và đẩy qua các môi trường này. Thực tế chứng minh rằng, một khi bạn đã đầu tư tự động hóa sản xuất cho khối nguyên, thì việc triển khai thêm nhiều ứng dụng dường như không còn đáng sợ nữa. Hãy nhớ rằng, một trong những mục tiêu của phân phối liên tục là làm cho công việc "triển khai" trở nên "nhàm chán", vì vậy dù là một hay ba ứng dụng, chỉ cần công việc triển khai vẫn "nhàm chán" thì không có gì phải lo lắng [12].

Một lĩnh vực khác mà chúng tôi thấy các nhóm tự động hóa hạ tầng nhiều là quản lý microservices trong môi trường production. So với khẳng định ở trên của chúng tôi (chỉ cần việc triển khai nhàm chán), giữa khối nguyên và microservices không có nhiều khác biệt, nhưng môi trường chạy của mỗi lần triển khai có thể hoàn toàn khác nhau.

![micro-deployment](asset:micro-services/microservices-introduction/micro-deployment.png)

### Thiết kế để sẵn sàng cho sự cố

Hệ quả của việc dùng dịch vụ làm thành phần là cần thiết kế ứng dụng sao cho chúng có thể chịu được sự thất bại của dịch vụ. Nếu nhà cung cấp dịch vụ không khả dụng, bất kỳ lời gọi dịch vụ nào cũng có thể thất bại, client phải phản hồi điều này một cách nhẹ nhàng nhất có thể. So với thiết kế nguyên khối, đây là một nhược điểm, vì nó đưa vào độ phức tạp bổ sung để xử lý. Kết quả là nhóm microservices liên tục suy ngẫm xem sự thất bại của dịch vụ ảnh hưởng đến trải nghiệm người dùng như thế nào. [Simian Army](https://github.com/Netflix/SimianArmy) của Netflix có thể gây ra sự cố cho dịch vụ thậm chí cho cả trung tâm dữ liệu vào ngày làm việc, nhằm kiểm thử khả năng phục hồi và khả năng giám sát của ứng dụng.

Kiểu kiểm thử tự động này trong production đủ khiến hầu hết các nhóm vận hành phấn khích đến run người, giống như trước kỳ nghỉ dài cả tuần sắp tới. Điều này không có nghĩa là phong cách kiến trúc nguyên khối không thể xây dựng hệ thống giám sát tiên tiến — chỉ là theo kinh nghiệm của chúng tôi, điều này không phổ biến trong hệ thống nguyên khối mà thôi.

Vì dịch vụ có thể gặp sự cố bất cứ lúc nào, nên việc có thể phát hiện sự cố nhanh chóng và tự động khôi phục dịch vụ khi có thể trở nên cực kỳ quan trọng. Ứng dụng microservices rất coi trọng việc giám sát thời gian thực ứng dụng, chẳng hạn kiểm tra các phần tử kiến trúc (cơ sở dữ liệu nhận được bao nhiêu yêu cầu mỗi giây) và các chỉ số liên quan đến nghiệp vụ (ví dụ mỗi phút nhận được bao nhiêu đơn hàng). Giám sát ngữ nghĩa có thể cung cấp hệ thống cảnh báo sớm khi xuất hiện vấn đề, từ đó kích hoạt nhóm phát triển theo dõi và điều tra.

Điều này đặc biệt quan trọng với kiến trúc microservices, vì microservices ưa chuộng điều phối (choreography) và cộng tác theo sự kiện, điều này dẫn đến một số tình huống nổi lên (emergent). Mặc dù nhiều chuyên gia có thái độ tích cực về giá trị của các sự kiện ngẫu nhiên, nhưng thực tế là "hành vi nổi lên" đôi khi có thể là điều xấu. Giám sát là then chốt, nó có thể phát hiện nhanh các hành vi nổi lên không tốt và sửa chữa.

Hệ thống nguyên khối cũng có thể hiện thực giám sát trong suốt giống như microservices — thực tế, chúng cũng nên như vậy. Điểm khác biệt là bạn phải có khả năng biết khi nào các dịch vụ chạy trong các tiến trình khác nhau bị ngắt kết nối. Đối với các thư viện trong cùng một tiến trình, tính trong suốt này không có nhiều tác dụng.

Nhóm microservices muốn thấy việc giám sát và ghi log phức tạp cho từng dịch vụ, ví dụ dashboard hiển thị trạng thái "chạy/sập" và các chỉ số khác nhau liên quan đến vận hành và nghiệp vụ. Thông tin chi tiết về trạng thái circuit breaker, thông lượng hiện tại và độ trễ cũng là những ví dụ khác mà chúng tôi thường gặp trong công việc.

### Thiết kế tiến hóa

Những người thực hành microservices thường có nền tảng về thiết kế tiến hóa, và xem việc phân rã dịch vụ là một công cụ nữa giúp lập trình viên ứng dụng kiểm soát các thay đổi trong ứng dụng mà không làm giảm tốc độ thay đổi. Kiểm soát thay đổi không nhất thiết có nghĩa là giảm thay đổi — với thái độ và công cụ đúng đắn, bạn có thể thực hiện các thay đổi đối với phần mềm một cách thường xuyên, nhanh chóng và được kiểm soát tốt.

Mỗi khi cố gắng phân rã hệ thống phần mềm thành các thành phần, bạn sẽ đối mặt với quyết định về cách tách — nguyên tắc để chúng ta quyết định tách ứng dụng là gì? Thuộc tính then chốt của thành phần là khả năng thay thế và nâng cấp độc lập [13] — điều này có nghĩa là chúng ta tìm những điểm này, hình dung cách viết lại thành phần mà không ảnh hưởng đến các cộng tác viên của nó. Thực tế, nhiều nhóm microservices còn xem xét điều này sâu hơn bằng cách kỳ vọng rõ ràng rằng nhiều dịch vụ sẽ bị loại bỏ chứ không phải tiến hóa lâu dài.

Website Guardian là một ví dụ rất tốt về ứng dụng được thiết kế và xây dựng thành khối nguyên, nhưng nó cũng đang không ngừng phát triển theo hướng microservices. Hệ thống nguyên khối ban đầu vẫn là lõi của website, nhưng họ thích bổ sung chức năng mới bằng cách xây dựng một số API microservices. Cách này đặc biệt thuận tiện với các chức năng mang tính tạm thời về bản chất, chẳng hạn trang chuyên dụng xử lý các sự kiện thể thao. Phần này của website có thể được ghép lại nhanh chóng bằng ngôn ngữ phát triển nhanh, và bị xóa ngay sau khi sự kiện kết thúc. Chúng tôi đã thấy cách tiếp cận tương tự ở các tổ chức tài chính, thêm dịch vụ mới cho cơ hội thị trường, rồi loại bỏ sau vài tháng thậm chí vài tuần.

Đặc điểm nhấn mạnh khả năng thay thế này là một trường hợp đặc biệt của nguyên tắc chung trong thiết kế module hóa, tức là điều khiển việc hiện thực module hóa thông qua các mẫu thay đổi [14]. Mọi người đều muốn đặt những thứ thay đổi cùng lúc vào cùng một module, còn các module hệ thống ít thay đổi nên nằm trong các dịch vụ khác với hệ thống hiện đang trải qua nhiều thay đổi. Nếu bạn thấy mình phải thay đổi hai dịch vụ lặp đi lặp lại, điều đó cho thấy chúng nên được gộp lại.

Đưa các thành phần vào dịch vụ có thể tăng thêm cơ hội cho kế hoạch phát hành chi tiết hơn. Với khối nguyên, mọi thay đổi đều cần build và triển khai đầy đủ toàn bộ ứng dụng. Nhưng với microservices, bạn chỉ cần triển khai lại dịch vụ mà bạn đã sửa. Điều này có thể đơn giản hóa và tăng tốc quá trình phát hành. Nhược điểm là bạn phải lo lắng rằng thay đổi của một dịch vụ sẽ làm hỏng các consumer của nó. Phương pháp tích hợp truyền thống là cố gắng dùng kiểm soát phiên bản để giải quyết vấn đề này, nhưng trong thế giới microservices, ưu tiên là chỉ dùng kiểm soát phiên bản như biện pháp cuối cùng. Chúng ta có thể tránh phải kiểm soát phiên bản nhiều bằng cách thiết kế dịch vụ chịu đựng các thay đổi của nhà cung cấp dịch vụ càng nhiều càng tốt.

## Microservices có phải là tương lai không?

Mục đích chính của chúng tôi khi viết bài này là giải thích các ý tưởng và nguyên tắc chính của microservices. Thông qua việc dành thời gian làm điều đó, chúng tôi rõ ràng cho rằng phong cách kiến trúc microservices là một ý tưởng quan trọng — khi nghiên cứu phát triển hệ thống doanh nghiệp, nó đáng được cân nhắc nghiêm túc. Gần đây chúng tôi đã dùng cách này để xây dựng nhiều hệ thống, và biết rằng các nhóm khác cũng đồng tình với phong cách này.

Chúng tôi biết những người tiên phong ở một mức độ nào đó đã khai phá phong cách kiến trúc này, bao gồm Amazon, Netflix, The Guardian của Anh, Government Digital Service của chính phủ Anh, realestate.com.au, Forward và comparethemarket.com. Các hội nghị công nghệ năm 2013 tràn ngập ví dụ về những công ty đang chuyển sang thứ có thể xếp vào loại microservices, bao gồm Travis CI. Ngoài ra, có nhiều tổ chức từ lâu đã làm những thứ mà chúng ta gọi là microservices nhưng không dùng cái tên này. (Thường điều này được gắn nhãn là SOA — mặc dù như chúng tôi đã nói, SOA có nhiều hình thức mâu thuẫn nhau. [15])

Tuy nhiên, dù có những trải nghiệm tích cực này, không có nghĩa là chúng tôi tin chắc rằng microservices là hướng phát triển tương lai của kiến trúc phần mềm. Mặc dù cho đến nay kinh nghiệm của chúng tôi so với ứng dụng nguyên khối là tích cực, chúng tôi nhận ra rằng chưa có đủ thời gian để chúng tôi đưa ra phán đoán đầy đủ và toàn diện.

Thông thường, hiệu quả thực sự của một quyết định kiến trúc chỉ thực sự bộc lộ sau nhiều năm kể từ khi quyết định được đưa ra. Chúng tôi đã thấy một số dự án do các nhóm giỏi với khát vọng module hóa mạnh mẽ thực hiện, nhưng cuối cùng lại xây dựng ra một kiến trúc nguyên khối và không ngừng mục ruỗng trong vòng vài năm. Nhiều người cho rằng nếu dùng microservices thì ít có khả năng xuất hiện sự mục ruỗng này, vì ranh giới dịch vụ rõ ràng và khó bị làm lộn xộn tùy tiện. Tuy nhiên, đối với những hệ thống đã được phát triển đủ lâu, trừ khi chúng ta đã chứng kiến đủ nhiều, nếu không chúng ta không thể thực sự đánh giá kiến trúc microservices trưởng thành như thế nào.

Có người cảm thấy microservices có lẽ khó trưởng thành, điều này đương nhiên có lý do. Thành công hay không của bất kỳ công việc nào làm trên thành phần hóa phụ thuộc vào mức độ phần mềm khớp với các thành phần. Xác định chính xác ranh giới của một thành phần nên xuất hiện ở đâu là một công việc khó khăn. Thiết kế tiến hóa thừa nhận sự khó khăn khi định vị ranh giới một cách chính xác, nên nó chuyển trọng tâm công việc sang việc dễ dàng tái cấu trúc ranh giới. Nhưng khi các thành phần trở thành các dịch vụ giao tiếp từ xa, so với việc gọi giữa các thư viện phần mềm trong một tiến trình duy nhất, việc tái cấu trúc lúc này trở nên khó khăn hơn. Việc di chuyển mã qua ranh giới dịch vụ trở nên khó khăn. Mọi thay đổi của giao diện đều cần được phối hợp giữa các bên tham gia. Các lớp tương thích ngược cũng cần được bổ sung. Kiểm thử cũng trở nên phức tạp hơn.

Một vấn đề khác là, nếu các thành phần này không thể kết hợp gọn gàng thành một hệ thống, thì mọi việc đã làm chỉ là chuyển độ phức tạp bên trong thành phần sang các kết nối giữa các thành phần. Hậu quả của việc này không chỉ là dời nhà cho độ phức tạp, mà còn chuyển độ phức tạp sang những ranh giới không còn rõ ràng và khó kiểm soát. Khi quan sát bên trong một thành phần nhỏ và đơn giản, người ta rất dễ cảm thấy mọi thứ đã tốt hơn, nhưng họ lại bỏ qua những kết nối lộn xộn giữa các dịch vụ.

Cuối cùng, còn có yếu tố kỹ năng của nhóm. Công nghệ mới thường được các nhóm có kỹ thuật vững hơn áp dụng. Một công nghệ hiệu quả hơn đối với nhóm có kỹ thuật vững hơn không nhất thiết phù hợp với nhóm có kỹ thuật kém hơn một chút. Chúng tôi đã thấy rất nhiều trường hợp như vậy, những nhóm có kỹ thuật kém hơn một chút đã xây dựng ra những kiến trúc nguyên khối lộn xộn. Khi sự lộn xộn đó xảy ra với microservices thì sẽ ra sao? Điều này cần thời gian để quan sát. Một nhóm tồi luôn xây dựng một hệ thống tồi — trong trường hợp này, rất khó nói microservices rốt cuộc là giảm bớt sự lộn xộn hay làm mọi thứ tệ hơn.

Một lập luận hợp lý mà chúng tôi nghe được là bạn không nên bắt đầu từ kiến trúc microservices, mà nên bắt đầu từ khối nguyên, giữ tính module hóa, và khi khối nguyên xuất hiện vấn đề thì tách nó thành microservices. (Lời khuyên này không lý tưởng, vì một giao diện tốt trong tiến trình thường không phải là một giao diện dịch vụ tốt.)

Vì vậy chúng tôi viết điều này với sự lạc quan thận trọng. Cho đến nay, chúng tôi đã thấy đủ nhiều về phong cách microservices để cảm thấy rằng nó có thể là một con đường đáng đi. Chúng tôi không thể chắc chắn cuối cùng sẽ kết thúc ở đâu, nhưng một trong những thách thức của phát triển phần mềm là bạn chỉ có thể đưa ra quyết định dựa trên thông tin chưa hoàn hảo mà bạn hiện buộc phải có.

## Chú thích

1: Thuật ngữ "microservice" đã được thảo luận tại một hội thảo của các kiến trúc sư phần mềm gần Venice vào tháng 5 năm 2011, nhằm mô tả điều mà những người tham dự thấy là một phong cách kiến trúc chung mà nhiều người trong số họ gần đây đã khám phá. Vào tháng 5 năm 2012, nhóm này quyết định chọn "microservices" là cái tên phù hợp nhất. James đã trình bày một số ý tưởng này như một nghiên cứu điển hình vào tháng 3 năm 2012 tại 33rd Degree ở Krakow trong bài [Microservices - Java, the Unix Way](http://2012.33degree.org/talk/show/67), Fred George cũng làm tương tự [vào khoảng cùng thời điểm](http://www.slideshare.net/fredgeorge/micro-service-architecure). Adrian Cockcroft tại Netflix, mô tả cách tiếp cận này là "SOA hạt mịn", đã tiên phong phong cách này ở quy mô web, cũng như nhiều người khác được đề cập trong bài viết này - Joe Walnes, Dan North, Evan Botcher và Graham Tackley.

2: Thuật ngữ khối nguyên (monolith) đã được cộng đồng Unix sử dụng từ lâu. Nó xuất hiện trong [The Art of Unix Programming](https://www.amazon.com/gp/product/B003U2T5BA?ie=UTF8&tag=martinfowlerc-20&linkCode=as2&camp=1789&creative=9325&creativeASIN=B003U2T5BA) để mô tả những hệ thống trở nên quá lớn.

3: Nhiều nhà thiết kế hướng đối tượng, bao gồm cả chúng tôi, dùng thuật ngữ service object theo nghĩa của [Domain-Driven Design](https://www.amazon.com/gp/product/0321125215?ie=UTF8&tag=martinfowlerc-20&linkCode=as2&camp=1789&creative=9325&creativeASIN=0321125215) để chỉ một đối tượng thực hiện một quy trình quan trọng không gắn với một thực thể. Đây là một khái niệm khác với cách chúng tôi dùng "service" trong bài viết này. Đáng tiếc là thuật ngữ service có cả hai nghĩa và chúng ta phải chấp nhận hiện tượng đa nghĩa này.

4: Chúng tôi coi [ứng dụng là một cấu trúc xã hội](https://martinfowler.com/bliki/ApplicationBoundary.html) gắn kết một codebase, một nhóm chức năng và một nguồn kinh phí lại với nhau.

5: Bài báo gốc có thể tìm thấy trên trang web của Melvyn Conway [tại đây](http://www.melconway.com/Home/Committees_Paper.html).

6: Chúng tôi không thể không nhắc đến phát biểu của Jim Webber rằng ESB là viết tắt của ["Egregious Spaghetti Box"](http://www.infoq.com/presentations/soa-without-esb) (hộp mì spaghetti quá đáng).

7: Netflix làm cho mối liên hệ này trở nên rõ ràng - cho đến gần đây vẫn gọi phong cách kiến trúc của họ là SOA hạt mịn.

8: Ở quy mô cực lớn, các tổ chức thường chuyển sang giao thức nhị phân - ví dụ [protobufs](https://code.google.com/p/protobuf/). Các hệ thống dùng chúng vẫn thể hiện đặc điểm endpoint thông minh, đường ống ngốc - và đánh đổi tính minh bạch để lấy quy mô. Hầu hết các website và chắc chắn là đại đa số doanh nghiệp không cần thực hiện sự đánh đổi này - tính minh bạch có thể là một lợi thế lớn.

9: "YAGNI" hay "You Aren't Going To Need It" (bạn sẽ không cần đến nó) là một [nguyên tắc XP](http://c2.com/cgi/wiki?YouArentGonnaNeedIt) và là lời khuyên không thêm tính năng cho đến khi bạn biết mình cần chúng.

10: Có hơi thiếu thành thật khi chúng tôi tuyên bố rằng khối nguyên chỉ dùng một ngôn ngữ - để xây dựng hệ thống trên web ngày nay, bạn có lẽ cần biết JavaScript và XHTML, CSS, ngôn ngữ phía server bạn chọn, SQL và một phương ngữ ORM. Khó có thể gọi là một ngôn ngữ duy nhất, nhưng bạn hiểu ý chúng tôi.

11: Adrian Cockcroft đặc biệt nhắc đến "developer self-service" và "Developers run what they wrote"(sic) trong [bài thuyết trình xuất sắc này](http://www.slideshare.net/adrianco/flowcon-added-to-for-cmg-keynote-talk-on-how-speed-wins-and-how-netflix-is-doing-continuous-delivery) trình bày tại Flowcon vào tháng 11 năm 2013.

12: Ở đây chúng tôi hơi thiếu thành thật một chút. Rõ ràng là triển khai nhiều dịch vụ hơn, trong các topology phức tạp hơn, khó hơn triển khai một khối nguyên duy nhất. May mắn là các mẫu thiết kế làm giảm độ phức tạp này - tuy vậy đầu tư vào công cụ vẫn là điều bắt buộc.

13: Thực tế, Dan North gọi phong cách này là _Replaceable Component Architecture_ thay vì microservices. Vì cái tên này dường như chỉ nói đến một tập con các đặc điểm, nên chúng tôi thích cách gọi sau hơn.

14: Kent Beck nhấn mạnh điều này là một trong những nguyên tắc thiết kế của ông trong [Implementation Patterns](https://www.amazon.com/gp/product/0321413091?ie=UTF8&tag=martinfowlerc-20&linkCode=as2&camp=1789&creative=9325&creativeASIN=0321413091).

15: Và SOA khó có thể là gốc rễ của lịch sử này. Tôi nhớ có người nói "chúng tôi đã làm điều này nhiều năm rồi" khi thuật ngữ SOA xuất hiện vào đầu thế kỷ. Một lập luận là phong cách này có gốc rễ từ cách các chương trình COBOL giao tiếp qua tệp dữ liệu trong những ngày đầu của điện toán doanh nghiệp. Theo một hướng khác, có thể lập luận rằng microservices cũng chính là mô hình lập trình Erlang, nhưng được áp dụng vào bối cảnh ứng dụng doanh nghiệp.
