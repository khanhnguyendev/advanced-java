---
source:
  locale: zh
  slug: microservices-introduction
  hash: 'sha256:v1:3e281c521ac121ce5d9f1b7c960f47242cfd308747c23dd7d030d926a3cd8e9d'
status: machine
translatedAt: '2026-10-14'
---
# Mô tả về kiến trúc microservices

> Dịch từ bài [Microservices](https://martinfowler.com/articles/microservices.html) trên trang web của [Martin Fowler](https://martinfowler.com/). Bài khá dài, cần một chút kiên nhẫn để đọc.<br> Trình độ của người dịch có hạn, nếu có chỗ chưa phù hợp, mong mọi người góp ý chỉnh sửa, xin cảm ơn.

Vài năm gần đây xuất hiện thuật ngữ “kiến trúc microservices”, mô tả một cách thiết kế ứng dụng phần mềm cụ thể thành một bộ các dịch vụ có thể triển khai độc lập. Dù phong cách kiến trúc này chưa có định nghĩa chính xác, nhưng về cách tổ chức xoay quanh năng lực nghiệp vụ, triển khai tự động, sự thông minh đặt ở các endpoint và kiểm soát phân tán đối với ngôn ngữ và dữ liệu, chúng vẫn có một số đặc điểm chung.

“Microservices” – lại thêm một thuật ngữ mới trên con phố đông đúc của kiến trúc phần mềm. Dù khuynh hướng tự nhiên của chúng ta là liếc nhìn nó với vẻ coi thường, thuật ngữ này mô tả một phong cách hệ thống phần mềm ngày càng hấp dẫn. Vài năm qua, chúng tôi đã thấy nhiều dự án dùng phong cách này, và kết quả cho tới nay đều tích cực, đến mức nó đã trở thành phong cách mặc định khi xây dựng ứng dụng doanh nghiệp của nhiều đồng nghiệp ThoughtWorks của chúng tôi. Tiếc là không có nhiều tài liệu phác họa phong cách microservices và cách hiện thực nó.

Nói ngắn gọn, phong cách kiến trúc microservices [1] là cách phát triển một ứng dụng đơn lẻ thành một bộ các dịch vụ nhỏ, mỗi dịch vụ nhỏ chạy trong tiến trình riêng và giao tiếp bằng cơ chế nhẹ (thường là API tài nguyên HTTP). Các dịch vụ này được xây dựng xoay quanh chức năng nghiệp vụ và có thể được triển khai độc lập nhờ cơ chế triển khai hoàn toàn tự động. Các dịch vụ này dùng chung một mức quản lý tập trung tối thiểu, có thể được viết bằng các ngôn ngữ lập trình khác nhau và dùng các công nghệ lưu trữ dữ liệu khác nhau.

Trước khi bắt đầu giải thích phong cách microservices, so sánh nó với phong cách nguyên khối (monolithic) là hữu ích: ứng dụng nguyên khối được xây dựng thành một đơn vị duy nhất. Ứng dụng doanh nghiệp thường gồm ba phần: giao diện người dùng phía client (gồm các trang HTML và JavaScript chạy trong trình duyệt trên máy người dùng), hệ thống cơ sở dữ liệu (gồm nhiều bảng, thường được quản lý trong cơ sở dữ liệu quan hệ) và ứng dụng phía server. Ứng dụng phía server xử lý các yêu cầu HTTP, thực hiện một số xử lý logic, truy xuất và cập nhật dữ liệu từ cơ sở dữ liệu, chọn dữ liệu và điền vào các view HTML để gửi tới trình duyệt. Ứng dụng phía server này là một khối thống nhất – một tệp thực thi logic duy nhất [2]. Mọi thay đổi với hệ thống đều kéo theo việc build và triển khai phiên bản mới của ứng dụng phía server.

Server nguyên khối như vậy là cách tự nhiên để xây dựng hệ thống loại này. Toàn bộ logic xử lý một yêu cầu chạy trong cùng một tiến trình, cho phép bạn dùng các tính năng cơ bản của ngôn ngữ để chia ứng dụng thành lớp, hàm và không gian tên. Cần lưu ý rằng bạn có thể chạy và kiểm thử ứng dụng trên laptop của lập trình viên, và dùng pipeline triển khai để đảm bảo các thay đổi với chương trình được kiểm thử đầy đủ và triển khai lên môi trường production. Bạn có thể mở rộng chiều ngang hệ thống nguyên khối bằng cách chạy nhiều instance phía sau bộ cân bằng tải.

Ứng dụng nguyên khối có thể thành công, nhưng ngày càng nhiều người thấy không hài lòng với chúng – nhất là khi ngày càng nhiều ứng dụng được triển khai lên đám mây. Chu kỳ thay đổi bị ràng buộc với nhau – ngay cả khi chỉ thay đổi một phần nhỏ của ứng dụng, cũng cần build lại và triển khai toàn bộ ứng dụng nguyên khối. Theo thời gian, thường rất khó giữ cấu trúc module hóa tốt, và càng khó giữ cho những thay đổi chỉ nên ảnh hưởng một module nằm gọn trong module đó. Khi mở rộng hệ thống, buộc phải mở rộng toàn bộ hệ thống ứng dụng chứ không thể chỉ mở rộng những phần cần thêm tài nguyên.

![sketch](diagram:micro-services/microservices-introduction/sketch)

Những điều bất mãn này đã sinh ra phong cách kiến trúc microservices: xây dựng ứng dụng thành một bộ các dịch vụ. Ngoài việc các dịch vụ có thể triển khai độc lập và mở rộng độc lập, mỗi dịch vụ còn cung cấp một ranh giới module vững chắc, thậm chí cho phép viết các dịch vụ khác nhau bằng các ngôn ngữ lập trình khác nhau. Chúng cũng có thể do các đội khác nhau quản lý.

Chúng tôi không cho rằng phong cách microservices là mới mẻ hay sáng tạo; nguồn gốc của nó ít nhất có thể truy về các nguyên lý thiết kế của Unix. Nhưng chúng tôi cho rằng chưa có đủ nhiều người cân nhắc kiến trúc microservices, và nếu dùng nó thì việc phát triển nhiều phần mềm sẽ tốt hơn.

## Các đặc điểm của kiến trúc microservices

Dù không thể nói phong cách kiến trúc microservices có một định nghĩa chính thức, chúng tôi có thể thử mô tả một số đặc điểm chung mà chúng tôi cho là các kiến trúc phù hợp với nhãn này có. Như mọi định nghĩa phác họa các đặc điểm chung, không phải mọi kiến trúc microservices đều có tất cả các đặc điểm, nhưng chúng tôi kỳ vọng phần lớn kiến trúc microservices có phần lớn các đặc điểm. Dù các tác giả chúng tôi luôn là thành viên tích cực của cộng đồng khá lỏng lẻo này, ý định của chúng tôi vẫn là cố gắng mô tả những gì hai chúng tôi đã thấy trong công việc của mình và của các đội mà chúng tôi biết. Cần nói rõ là chúng tôi không đặt ra các định nghĩa liên quan.

### Chia thành phần qua dịch vụ

Từ khi tham gia ngành phần mềm, chúng tôi luôn mong muốn xây dựng hệ thống bằng cách ghép các thành phần lại với nhau, giống cách chúng ta thấy mọi thứ được tạo ra trong thế giới vật lý. Trong vài thập kỷ qua, chúng ta đã thấy tiến bộ rất lớn ở các thư viện phần mềm chung của hầu hết các nền tảng ngôn ngữ.

Khi nói về thành phần (component), ta gặp một khó khăn về định nghĩa: thành phần là gì? Định nghĩa của chúng tôi là: thành phần là một đơn vị phần mềm có thể thay thế và nâng cấp độc lập.

Kiến trúc microservices cũng dùng thư viện phần mềm, nhưng cách chính để chia phần mềm thành thành phần là tách thành nhiều dịch vụ. Chúng tôi định nghĩa thư viện là thành phần được liên kết vào chương trình và được gọi bằng lời gọi hàm trong bộ nhớ, còn dịch vụ là thành phần ngoài tiến trình, giao tiếp qua cơ chế như yêu cầu web service hoặc gọi thủ tục từ xa. (Điều này khác với khái niệm service object trong nhiều chương trình hướng đối tượng [3].)

Một lý do chính để dùng dịch vụ làm thành phần (thay vì thư viện) là dịch vụ có thể triển khai độc lập. Nếu bạn có một ứng dụng [4] gồm nhiều thư viện trong một tiến trình duy nhất, thay đổi ở bất kỳ thành phần nào cũng dẫn đến việc triển khai lại toàn bộ ứng dụng. Nhưng nếu ứng dụng được tách thành nhiều dịch vụ thì thay đổi của một dịch vụ chỉ cần triển khai lại dịch vụ đó. Tất nhiên điều này không tuyệt đối: một số thay đổi API dịch vụ có thể dẫn đến thay đổi phối hợp giữa nhiều dịch vụ, nhưng mục tiêu của một kiến trúc microservices tốt là giảm thiểu các thay đổi phối hợp đó thông qua ranh giới dịch vụ có tính gắn kết và cơ chế tiến hóa trong giao thức dịch vụ.

Một hệ quả khác của việc dùng dịch vụ làm thành phần là API thành phần rõ ràng hơn. Hầu hết ngôn ngữ không có cơ chế tốt để định nghĩa API được công bố tường minh. Thường chỉ có tài liệu và quy tắc để ngăn client phá vỡ tính đóng gói của thành phần, dẫn đến các thành phần ràng buộc chặt quá mức với nhau. Dùng cơ chế gọi từ xa tường minh, dịch vụ có thể tránh điều này dễ dàng hơn.

Dùng dịch vụ kiểu này cũng có điểm không tốt. Gọi từ xa tốn kém hơn gọi trong tiến trình, và API từ xa cần được thiết kế với hạt thô hơn, thường khó dùng hơn. Nếu cần thay đổi cách phân chia trách nhiệm giữa các thành phần, thì khi vượt qua ranh giới tiến trình, việc dịch chuyển hành vi giữa các thành phần càng khó thực hiện.

Xấp xỉ, có thể ánh xạ mỗi dịch vụ với một tiến trình lúc chạy, nhưng đó chỉ là xấp xỉ. Một dịch vụ có thể gồm nhiều tiến trình luôn được phát triển và triển khai cùng nhau, ví dụ tiến trình của một hệ thống ứng dụng và cơ sở dữ liệu chỉ dịch vụ đó dùng.

### Tổ chức xoay quanh năng lực nghiệp vụ

Khi chia ứng dụng lớn thành nhiều phần, ban quản lý thường tập trung vào tầng kỹ thuật, dẫn đến việc chia thành đội UI, đội logic phía server, đội cơ sở dữ liệu. Khi các đội bị chia theo cách này, ngay cả một thay đổi đơn giản cũng có thể dẫn tới một dự án xuyên đội cần thời gian và phê duyệt ngân sách. Một đội thông minh sẽ tối ưu quanh việc này, “chọn cái hại nhỏ hơn trong hai cái hại”: cứ ép logic vào bất kỳ ứng dụng nào mà họ truy cập được. Nói cách khác, logic ở khắp nơi. Đây là một ví dụ của định luật Conway [5].

> Bất kỳ tổ chức nào thiết kế một hệ thống (theo nghĩa rộng) đều sẽ tạo ra một thiết kế có cấu trúc là bản sao của cấu trúc giao tiếp của tổ chức đó.<br> — Melvyn Conway, 1967

![conways-law](diagram:micro-services/microservices-introduction/conways-law)

Microservices dùng cách phân chia khác: chia hệ thống thành nhiều dịch vụ xoay quanh chức năng nghiệp vụ. Các dịch vụ này hiện thực phần mềm toàn diện cho lĩnh vực nghiệp vụ đó, gồm giao diện người dùng, lưu trữ bền vững và mọi cộng tác bên ngoài. Do đó, các đội là liên chức năng, có đủ mọi kỹ năng cần cho phát triển: trải nghiệm người dùng, cơ sở dữ liệu và quản lý dự án.

![PreferFunctionalStaffOrganization](diagram:micro-services/microservices-introduction/preferfunctionalstafforganization)

Một công ty được tổ chức theo cách này là [www.comparethemarket.com](http://www.comparethemarket.com/). Các đội liên chức năng chịu trách nhiệm xây dựng và vận hành từng sản phẩm, mỗi sản phẩm được tách thành nhiều dịch vụ độc lập, giao tiếp với nhau qua message bus.

Ứng dụng nguyên khối lớn cũng có thể được module hóa xoay quanh chức năng nghiệp vụ, dù đây không phải trường hợp phổ biến. Tất nhiên, chúng tôi sẽ thúc giục các đội lớn xây dựng ứng dụng nguyên khối tự chia thành các đội nhỏ theo dòng nghiệp vụ. Vấn đề chính chúng tôi thấy ở đây là họ thường tổ chức xoay quanh quá nhiều ngữ cảnh. Nếu hệ thống nguyên khối vượt qua nhiều ranh giới module, từng thành viên trong đội sẽ khó nhét chúng vào trí nhớ ngắn hạn. Ngoài ra, chúng tôi thấy việc duy trì các dòng module hóa đòi hỏi rất nhiều quy tắc để thực thi. Sự tách biệt tường minh hơn mà thành phần dịch vụ yêu cầu giúp giữ ranh giới đội rõ ràng dễ dàng hơn.

### Là sản phẩm chứ không phải dự án

Hầu hết nỗ lực phát triển ứng dụng mà chúng tôi thấy đều dùng mô hình dự án: mục tiêu là bàn giao một phần mềm nào đó rồi coi như xong việc. Khi hoàn thành, phần mềm được bàn giao cho tổ chức bảo trì, và đội dự án đã xây dựng nó cũng giải tán theo.

Những người ủng hộ microservices có xu hướng tránh mô hình này, và cho rằng đội nên chịu trách nhiệm cho toàn bộ vòng đời sản phẩm. Một nguồn cảm hứng chung cho điều này là khái niệm [“you build, you run it”](https://queue.acm.org/detail.cfm?id=1142065) của Amazon, trong đó đội phát triển chịu hoàn toàn trách nhiệm đối với phần mềm trên production. Điều này khiến lập trình viên thường xuyên tiếp xúc với việc phần mềm của họ chạy ra sao trên môi trường production và tăng liên hệ với người dùng, vì họ phải gánh ít nhất một phần công việc hỗ trợ.

Tư duy sản phẩm gắn chặt với năng lực nghiệp vụ. Cần liên tục quan tâm phần mềm giúp người dùng nâng cao năng lực nghiệp vụ như thế nào, thay vì coi phần mềm là một tập chức năng sẽ được hoàn thành.

Không có lý do gì để cách tiếp cận này không dùng được cho ứng dụng đơn lẻ, nhưng độ hạt nhỏ hơn của dịch vụ giúp dễ thiết lập quan hệ cá nhân giữa người phát triển dịch vụ và người dùng.

### Endpoint thông minh và đường ống ngốc

Khi thiết lập giao tiếp giữa các tiến trình khác nhau, chúng tôi đã thấy nhiều sản phẩm và phương pháp nhấn mạnh việc đặt rất nhiều tính năng thông minh vào chính cơ chế giao tiếp. Một ví dụ điển hình là Enterprise Service Bus (ESB), trong đó các sản phẩm ESB thường gồm các công cụ phức tạp để định tuyến thông điệp, điều phối (orchestration), chuyển đổi và áp dụng quy tắc nghiệp vụ.

Cộng đồng microservices có xu hướng dùng cách khác: endpoint thông minh và đường ống ngốc (dumb pipes). Mục tiêu của ứng dụng xây dựng trên microservices là tách rời nhiều nhất có thể và gắn kết nhiều nhất có thể – chúng sở hữu logic miền của riêng mình và hành xử giống bộ lọc (filter) trong triết lý UNIX cổ điển hơn – nhận yêu cầu, áp dụng logic phù hợp rồi tạo phản hồi. Chúng được điều phối (choreography) bằng các giao thức kiểu REST đơn giản, thay vì giao thức phức tạp như WS-Choreography hay BPEL hoặc điều phối (orchestration) qua công cụ trung tâm.

Hai giao thức dùng phổ biến nhất là yêu cầu-phản hồi HTTP với API tài nguyên và truyền thông điệp nhẹ [8]. Cách diễn đạt tốt nhất cho giao thức thứ nhất là

> Hãy là chính web, chứ không ẩn đằng sau web.<br> —[Ian Robinson](http://www.amazon.com/gp/product/0596805829?ie=UTF8&tag=martinfowlerc-20&linkCode=as2&camp=1789&creative=9325&creativeASIN=0596805829)

Các đội microservices dùng chính những quy tắc và giao thức đã xây dựng nên World Wide Web (và ở mức lớn hơn là UNIX). Xét từ góc độ người phát triển và người vận hành, các tài nguyên thường dùng có thể được cache rất dễ dàng.

Cách thông dụng thứ hai là truyền thông điệp qua message bus nhẹ. Hạ tầng được chọn thường là ngốc (ngốc ở chỗ chỉ đóng vai trò bộ định tuyến thông điệp) – các hiện thực đơn giản như RabbitMQ hay ZeroMQ chỉ cung cấp một cấu trúc trao đổi bất đồng bộ đáng tin cậy – trong dịch vụ, tính năng thông minh vẫn nằm ở các endpoint tạo ra và tiêu thụ thông điệp, tức là nằm trong từng dịch vụ.

Trong ứng dụng nguyên khối, các thành phần thực thi trong cùng một tiến trình và giao tiếp với nhau qua lời gọi phương thức hoặc lời gọi hàm. Vấn đề lớn nhất khi biến hệ thống nguyên khối thành microservices nằm ở sự thay đổi mẫu giao tiếp. Một cách chuyển đổi ngây thơ là chuyển từ lời gọi phương thức trong bộ nhớ sang RPC, dẫn đến giao tiếp quá thường xuyên và hiệu năng kém. Thay vào đó, bạn cần thay giao tiếp hạt mịn bằng giao tiếp hạt thô.

### Quản trị phi tập trung

Một hệ quả của quản trị tập trung là xu hướng tiêu chuẩn hóa trên một nền tảng công nghệ duy nhất. Kinh nghiệm cho thấy cách này đang co hẹp – không phải vấn đề nào cũng là cái đinh, không phải vấn đề nào cũng là cái búa. Chúng tôi thích dùng đúng công cụ cho việc cần làm, còn ứng dụng nguyên khối ở một mức nào đó có thể tận dụng ưu thế của ngôn ngữ, điều này không phổ biến.

Khi tách các thành phần của hệ thống nguyên khối thành dịch vụ, khi xây dựng chúng ta có lựa chọn riêng. Bạn muốn dùng Node.js để làm một trang báo cáo đơn giản? Cứ làm. Dùng C++ để viết một thành phần gần thời gian thực đặc biệt hóc búa? Tuyệt vời. Bạn muốn đổi sang một loại cơ sở dữ liệu khác phù hợp hơn với thao tác đọc dữ liệu của thành phần? Chúng ta có công nghệ để dựng lại nó.

Tất nhiên, chỉ vì bạn có thể làm điều gì đó không có nghĩa là bạn nên làm – nhưng chia hệ thống theo cách này nghĩa là bạn có quyền lựa chọn.

Các đội xây dựng microservices cũng thích dùng cách khác để đạt tiêu chuẩn. Họ thích ý tưởng tạo ra các công cụ hữu ích hơn là tiêu chuẩn viết trên giấy, để các lập trình viên khác dùng các công cụ đó giải quyết các vấn đề tương tự mà họ gặp. Đôi khi các công cụ này được thu hoạch từ quá trình hiện thực và chia sẻ với nhóm rộng hơn, nhưng không hoàn toàn dùng mô hình mã nguồn mở nội bộ. Giờ đây git và github đã trở thành lựa chọn hệ thống quản lý phiên bản trên thực tế, thực hành mã nguồn mở nội bộ cũng ngày càng phổ biến.

Netflix là một ví dụ tốt về việc theo triết lý này. Đặc biệt, việc chia sẻ mã hữu ích và đã được thị trường kiểm chứng dưới dạng thư viện khuyến khích các lập trình viên khác giải quyết các vấn đề tương tự theo cách tương tự, đồng thời vẫn mở cửa cho việc dùng cách khác. Thư viện dùng chung có xu hướng tập trung vào các vấn đề chung về lưu trữ dữ liệu, giao tiếp liên tiến trình và tự động hóa hạ tầng mà chúng ta sẽ bàn sâu ở phần sau.

Với cộng đồng microservices, chi phí phát sinh (overhead) đặc biệt thiếu hấp dẫn. Điều này không có nghĩa là cộng đồng không coi trọng hợp đồng dịch vụ. Hoàn toàn ngược lại, vì họ có nhiều hợp đồng hơn. Chỉ là họ đang tìm các cách khác để quản lý các hợp đồng đó. Các mẫu như [Tolerant Reader](https://martinfowler.com/bliki/TolerantReader.html) và [Consumer-Driven Contracts](https://martinfowler.com/articles/consumerDrivenContracts.html) thường được dùng trong microservices. Các mẫu này hỗ trợ hợp đồng dịch vụ tiến hóa độc lập. Thực thi hợp đồng hướng người tiêu dùng như một phần của quá trình build làm tăng sự tự tin và cho phản hồi nhanh hơn về việc dịch vụ có đang hoạt động hay không. Thực tế, chúng tôi biết một đội ở Úc dùng mẫu hợp đồng hướng người tiêu dùng này để điều khiển việc xây dựng nghiệp vụ mới. Họ dùng công cụ đơn giản để định nghĩa hợp đồng của dịch vụ. Điều này trở thành một phần của quá trình build tự động, ngay cả khi mã của dịch vụ mới còn chưa được viết. Dịch vụ chỉ được tạo ra khi thỏa mãn hợp đồng - đây là một cách thanh lịch để tránh thế lưỡng nan "YAGNI" [9] khi xây dựng phần mềm mới. Các kỹ thuật và công cụ phát triển quanh những điều này hạn chế nhu cầu quản lý hợp đồng tập trung bằng cách giảm ràng buộc về thời gian (temporal coupling) giữa các dịch vụ.

Có lẽ đỉnh cao của quản trị phi tập trung là triết lý build it/run it được Amazon phổ biến rộng rãi. Đội phải chịu trách nhiệm về mọi khía cạnh của phần mềm họ xây dựng, gồm cả vận hành 7\*24. Phân quyền trách nhiệm ở mức này chắc chắn không phải chuẩn mực, nhưng chúng tôi thấy ngày càng nhiều công ty giao thêm trách nhiệm cho đội phát triển. Netflix là một công ty khác áp dụng triết lý này [11]. Mỗi ngày 3 giờ sáng bị máy nhắn tin gọi dậy chắc chắn là động lực mạnh khiến bạn quan tâm đến chất lượng khi viết mã. Đây là một số ý tưởng về việc rời xa mô hình quản trị tập trung truyền thống càng xa càng tốt.

### Quản lý dữ liệu phân tán

Việc phi tập trung hóa quản lý dữ liệu thể hiện theo nhiều cách khác nhau. Ở mức trừu tượng nhất, điều đó có nghĩa là mô hình khái niệm về thế giới sẽ khác nhau giữa các hệ thống. Đây là vấn đề thường gặp khi tích hợp một doanh nghiệp lớn: góc nhìn bán hàng về khách hàng sẽ khác góc nhìn hỗ trợ. Một số thứ trong góc nhìn bán hàng của khách hàng có thể không xuất hiện trong góc nhìn hỗ trợ. Chúng thực sự có thể có các thuộc tính khác nhau và (tệ hơn) có các thuộc tính chung nhưng ngữ nghĩa khác nhau một cách tinh tế.

Vấn đề này thường gặp giữa các ứng dụng, nhưng cũng có thể xảy ra bên trong ứng dụng, nhất là khi ứng dụng được chia thành các thành phần tách biệt. Một cách tư duy hữu ích là khái niệm Domain-Driven Design (DDD) về [ngữ cảnh có biên](http://martinfowler.com/bliki/BoundedContext.html) (Bounded Context). DDD chia một miền phức tạp thành nhiều ngữ cảnh có biên và vạch ra quan hệ giữa chúng. Quá trình này hữu ích cho cả kiến trúc nguyên khối lẫn microservices, nhưng giữa dịch vụ và ranh giới ngữ cảnh có sự tương quan tự nhiên, ranh giới giúp làm rõ và củng cố sự tách biệt, như mô tả trong phần năng lực nghiệp vụ.

Giống như phi tập trung hóa quyết định về mô hình khái niệm, microservices cũng phi tập trung hóa quyết định lưu trữ dữ liệu. Trong khi ứng dụng nguyên khối thích một cơ sở dữ liệu logic duy nhất cho lưu trữ bền vững, doanh nghiệp thường có xu hướng dùng chung một cơ sở dữ liệu duy nhất cho một loạt ứng dụng – các quyết định này bị thúc đẩy bởi mô hình kinh doanh cấp phép của nhà cung cấp. Microservices thích để mỗi dịch vụ tự quản lý cơ sở dữ liệu của mình, hoặc là các instance khác nhau của cùng một công nghệ cơ sở dữ liệu, hoặc là các hệ cơ sở dữ liệu hoàn toàn khác nhau - đây là cái gọi là [lưu trữ bền vững hỗn hợp](https://martinfowler.com/bliki/PolyglotPersistence.html) (Polyglot Persistence). Bạn có thể dùng polyglot persistence trong ứng dụng nguyên khối, nhưng nó thường xuất hiện hơn trong microservices.

![decentralised-data](diagram:micro-services/microservices-introduction/decentralised-data)

Với dữ liệu xuyên microservices, phi tập trung hóa trách nhiệm có ảnh hưởng đến quản lý cập nhật. Cách thông dụng để xử lý cập nhật là dùng giao dịch để đảm bảo tính nhất quán khi cập nhật nhiều tài nguyên. Cách này thường được dùng trong ứng dụng nguyên khối.

Dùng giao dịch kiểu này giúp ích cho tính nhất quán, nhưng tạo ra ràng buộc về thời gian đáng kể, gây vấn đề khi xuyên nhiều dịch vụ. Giao dịch phân tán nổi tiếng là khó hiện thực, do đó kiến trúc microservices nhấn mạnh [phối hợp không giao dịch giữa các dịch vụ](http://www.eaipatterns.com/ramblings/18_starbucks.html), với nhận thức rõ ràng rằng tính nhất quán có thể chỉ là nhất quán cuối cùng và vấn đề được xử lý bằng các thao tác bù.

Với nhiều đội phát triển, chọn quản lý sự không nhất quán theo cách này là một thách thức mới, nhưng nó thường khớp với thực tiễn kinh doanh. Doanh nghiệp thường chấp nhận một mức độ không nhất quán để phản ứng nhanh với nhu cầu, đồng thời có một dạng quy trình đảo ngược nào đó để xử lý lỗi. Sự đánh đổi này đáng giá, miễn là chi phí sửa lỗi nhỏ hơn chi phí thiệt hại kinh doanh khi yêu cầu nhất quán cao hơn.

### Tự động hóa hạ tầng

Kỹ thuật tự động hóa hạ tầng đã thay đổi rất lớn trong vài năm qua – đặc biệt là sự phát triển của đám mây và AWS đã giảm độ phức tạp vận hành khi xây dựng, triển khai và chạy microservices.

Nhiều sản phẩm hoặc hệ thống xây dựng bằng microservices do các đội có nhiều kinh nghiệm về phân phối liên tục (continuous delivery) và tích hợp liên tục xây dựng. Các đội xây dựng phần mềm theo cách này dùng rộng rãi kỹ thuật tự động hóa hạ tầng, như thể hiện trong build pipeline dưới đây.

![basic-pipeline](diagram:micro-services/microservices-introduction/basic-pipeline)

Vì đây không phải bài về phân phối liên tục nên chúng tôi chỉ tập trung vào vài đặc tính then chốt của nó. Chúng tôi muốn có nhiều tự tin nhất có thể rằng phần mềm chạy đúng, nên chúng tôi thực hiện rất nhiều **kiểm thử tự động**. Muốn phần mềm đạt trạng thái “thăng cấp” (Promotion) để được “đẩy lên” pipeline nghĩa là phải **triển khai tự động** phần mềm vào mỗi môi trường mới.

Một ứng dụng nguyên khối có thể được build, kiểm thử và đẩy qua các môi trường này rất suôn sẻ. Thực tế cho thấy, một khi bạn đã đầu tư vào việc tự động hóa quy trình sản xuất cho hệ thống nguyên khối, thì việc triển khai thêm nhiều ứng dụng dường như không còn đáng sợ nữa. Hãy nhớ rằng một trong các mục tiêu của phân phối liên tục là làm cho công việc “triển khai” trở nên “nhàm chán”, nên dù là một hay ba ứng dụng, miễn là việc triển khai vẫn “nhàm chán” thì chẳng có gì đáng lo [12].

Một lĩnh vực khác mà chúng tôi thấy các đội tự động hóa hạ tầng nhiều là quản lý microservices trong môi trường production. So với khẳng định ở trên của chúng tôi (miễn là triển khai nhàm chán), giữa ứng dụng nguyên khối và microservices không có khác biệt lớn, nhưng môi trường chạy của mỗi lần triển khai có thể khác nhau rất nhiều.

![micro-deployment](diagram:micro-services/microservices-introduction/micro-deployment)

### Thiết kế để sẵn sàng cho sự cố

Hệ quả của việc dùng dịch vụ làm thành phần là cần thiết kế ứng dụng sao cho chúng có thể chịu được sự cố của dịch vụ. Bất kỳ lời gọi dịch vụ nào cũng có thể thất bại nếu nhà cung cấp dịch vụ không khả dụng, và client phải phản hồi điều này một cách êm dịu nhất có thể. So với thiết kế nguyên khối, đây là một nhược điểm, vì nó đưa thêm độ phức tạp để xử lý. Hệ quả là các đội microservices không ngừng suy ngẫm về việc sự cố dịch vụ ảnh hưởng đến trải nghiệm người dùng như thế nào. [Simian Army](https://github.com/Netflix/SimianArmy) của Netflix có thể gây ra sự cố cho dịch vụ, thậm chí cả trung tâm dữ liệu, ngay trong ngày làm việc, để kiểm tra khả năng phục hồi và giám sát của ứng dụng.

Kiểu kiểm thử tự động trên production này đủ để khiến hầu hết các nhóm vận hành run lên, như trước một kỳ nghỉ dài cả tuần sắp đến. Điều này không có nghĩa là phong cách kiến trúc nguyên khối không xây dựng được hệ thống giám sát tiên tiến – chỉ là theo kinh nghiệm của chúng tôi, điều đó không phổ biến trong hệ thống nguyên khối.

Vì dịch vụ có thể gặp sự cố bất kỳ lúc nào, nên khả năng phát hiện sự cố nhanh chóng và nếu có thể thì tự động khôi phục dịch vụ là cực kỳ quan trọng. Ứng dụng microservices rất coi trọng giám sát thời gian thực của ứng dụng, như kiểm tra các thành phần kiến trúc (cơ sở dữ liệu nhận bao nhiêu yêu cầu mỗi giây) và các số đo liên quan đến nghiệp vụ (ví dụ mỗi phút nhận được bao nhiêu đơn hàng). Giám sát ngữ nghĩa có thể cung cấp hệ thống cảnh báo sớm khi có vấn đề, từ đó kích hoạt đội phát triển theo dõi và điều tra.

Điều này đặc biệt quan trọng với kiến trúc microservices, vì microservices ưa chuộng phối hợp theo sự kiện (choreography) và cộng tác qua sự kiện, dẫn đến một số tình huống nảy sinh. Dù nhiều chuyên gia tích cực về giá trị của sự nảy sinh tình cờ, sự thật là “hành vi nảy sinh” đôi khi có thể là điều xấu. Giám sát là then chốt để nhanh chóng phát hiện hành vi nảy sinh xấu và sửa chúng.

Hệ thống nguyên khối cũng có thể đạt được giám sát minh bạch như microservices – thực tế chúng cũng nên như vậy. Điểm khác là bạn phải biết được khi nào các dịch vụ chạy trong các tiến trình khác nhau bị mất kết nối. Với các thư viện trong cùng tiến trình, tính minh bạch này ít hữu ích hơn.

Các đội microservices muốn thấy giám sát và ghi nhật ký phức tạp cho từng dịch vụ, ví dụ bảng điều khiển hiển thị trạng thái “chạy/sập” và nhiều chỉ số vận hành và nghiệp vụ. Thông tin chi tiết về trạng thái circuit breaker, thông lượng hiện tại và độ trễ cũng là các ví dụ khác mà chúng tôi thường gặp trong công việc.

### Thiết kế tiến hóa

Những người thực hành microservices thường có nền tảng thiết kế tiến hóa, và coi việc phân rã dịch vụ là công cụ bổ sung giúp lập trình viên ứng dụng kiểm soát thay đổi trong ứng dụng mà không làm chậm tốc độ thay đổi. Kiểm soát thay đổi không nhất thiết có nghĩa là giảm thay đổi – với thái độ và công cụ đúng, bạn có thể thực hiện thay đổi phần mềm thường xuyên, nhanh và được kiểm soát tốt.

Mỗi khi cố gắng phân rã hệ thống phần mềm thành các thành phần, bạn đều đối mặt quyết định cách chia – nguyên tắc nào để chúng ta quyết định chia ứng dụng? Thuộc tính then chốt của thành phần là đặc tính có thể thay thế và nâng cấp độc lập [13] – nghĩa là chúng ta tìm những điểm mà ta có thể hình dung việc viết lại thành phần mà không ảnh hưởng đến các bên cộng tác. Thực tế, nhiều nhóm microservices còn đi xa hơn bằng cách kỳ vọng rõ ràng nhiều dịch vụ sẽ bị loại bỏ thay vì tiến hóa lâu dài.

Trang web Guardian là một ví dụ tốt về ứng dụng được thiết kế và xây dựng thành nguyên khối nhưng cũng đang tiến hóa theo hướng microservices. Hệ thống nguyên khối ban đầu vẫn là lõi của trang web, nhưng họ thích thêm tính năng mới bằng cách xây dựng một số microservices dùng API. Cách này đặc biệt tiện cho các tính năng về bản chất là tạm thời, ví dụ trang chuyên dụng xử lý một sự kiện thể thao. Phần này của trang web có thể được ghép nhanh bằng ngôn ngữ phát triển nhanh và bị xóa ngay sau khi sự kiện kết thúc. Chúng tôi đã thấy cách tương tự ở các tổ chức tài chính, thêm dịch vụ mới cho cơ hội thị trường và loại bỏ sau vài tháng hoặc thậm chí vài tuần.

Sự nhấn mạnh tính có thể thay thế này là một trường hợp đặc biệt của nguyên tắc chung trong thiết kế module hóa, tức là dùng mẫu thay đổi để điều khiển việc hiện thực module hóa [14]. Mọi người đều muốn đặt những thứ thay đổi cùng lúc vào cùng một module; module hệ thống hiếm khi thay đổi nên nằm ở dịch vụ khác với phần hiện đang trải qua nhiều biến động. Nếu bạn thấy mình liên tục sửa hai dịch vụ cùng lúc, đó là dấu hiệu cho thấy chúng nên được gộp lại.

Đặt thành phần vào dịch vụ tạo thêm cơ hội cho kế hoạch phát hành hạt mịn hơn. Với hệ thống nguyên khối, mọi thay đổi đều cần build và triển khai đầy đủ toàn bộ ứng dụng. Nhưng với microservices, bạn chỉ cần triển khai lại dịch vụ đã sửa. Điều này có thể đơn giản hóa và tăng tốc quá trình phát hành. Nhược điểm là bạn phải lo thay đổi ở một dịch vụ làm hỏng các bên tiêu thụ của nó. Cách tích hợp truyền thống là cố gắng giải quyết bằng quản lý phiên bản, nhưng trong thế giới microservices, ưu tiên là chỉ dùng quản lý phiên bản như phương án cuối cùng. Có thể tránh được rất nhiều việc quản lý phiên bản bằng cách thiết kế dịch vụ chịu được thay đổi từ nhà cung cấp dịch vụ càng nhiều càng tốt.

## Microservices có phải là tương lai?

Mục đích chính của chúng tôi khi viết bài này là giải thích các ý tưởng và nguyên lý chính của microservices. Bằng cách dành thời gian làm điều đó, chúng tôi rõ ràng cho rằng phong cách kiến trúc microservices là một ý tưởng quan trọng – đáng được cân nhắc nghiêm túc khi phát triển hệ thống doanh nghiệp. Gần đây chúng tôi đã xây dựng vài hệ thống theo cách này, và biết các đội khác cũng tán thành phong cách này.

Chúng tôi biết những người tiên phong ở mức độ nào đó cho phong cách kiến trúc này, gồm Amazon, Netflix, The Guardian của Anh, Trung tâm Dịch vụ Số của Chính phủ Anh, realestate.com.au, Forward và comparethemarket.com. Các hội nghị công nghệ năm 2013 đầy ví dụ về các công ty đang chuyển sang thứ có thể xếp vào microservices, gồm Travis CI. Ngoài ra, có nhiều tổ chức từ lâu đã làm thứ mà chúng tôi gọi là microservices nhưng chưa từng dùng cái tên này. (Thường điều này được gắn nhãn SOA – dù như chúng tôi đã nói, SOA có nhiều dạng mâu thuẫn nhau. [15])

Tuy nhiên, dù có những trải nghiệm tích cực này, không có nghĩa là chúng tôi chắc chắn microservices là hướng phát triển tương lai của kiến trúc phần mềm. Dù trải nghiệm của chúng tôi cho đến nay là tích cực so với ứng dụng nguyên khối, chúng tôi nhận thức được rằng chưa đủ thời gian để đưa ra phán đoán đầy đủ và trọn vẹn.

Thông thường, hậu quả thật sự của một quyết định kiến trúc chỉ thật sự hiện ra sau nhiều năm kể từ khi quyết định được đưa ra. Chúng tôi đã thấy một số dự án do các đội giỏi với mong muốn module hóa mạnh mẽ thực hiện, nhưng cuối cùng lại xây ra một kiến trúc nguyên khối và mục ruỗng dần trong vài năm. Nhiều người cho rằng nếu dùng microservices thì ít có khả năng xuất hiện sự mục ruỗng này, vì ranh giới dịch vụ rõ ràng và khó bị làm rối tùy tiện. Tuy nhiên, với các hệ thống được phát triển đủ lâu, trừ khi chúng ta đã thấy đủ nhiều, nếu không chúng ta không thể thật sự đánh giá kiến trúc microservices trưởng thành ra sao.

Có người cảm thấy microservices có lẽ khó trưởng thành, và điều đó chắc chắn có lý do. Thành công của mọi nỗ lực chia thành phần phụ thuộc vào mức độ phần mềm khớp với các thành phần. Việc xác định chính xác ranh giới của một thành phần nên nằm ở đâu là công việc khó. Thiết kế tiến hóa thừa nhận việc khó định vị đúng ranh giới, nên tập trung công việc vào việc dễ tái cấu trúc ranh giới. Nhưng khi các thành phần trở thành các dịch vụ giao tiếp từ xa, việc tái cấu trúc khó hơn so với việc gọi giữa các thư viện trong cùng một tiến trình. Di chuyển mã qua ranh giới dịch vụ trở nên khó khăn. Mọi thay đổi API đều cần phối hợp giữa các bên tham gia. Các tầng tương thích ngược cũng cần được thêm vào. Kiểm thử cũng trở nên phức tạp hơn.

Một vấn đề khác là nếu các thành phần không thể ghép gọn gàng thành một hệ thống thì mọi việc đã làm chỉ là chuyển độ phức tạp từ bên trong thành phần sang các kết nối giữa các thành phần. Hậu quả không chỉ là dời độ phức tạp đi nơi khác mà còn chuyển nó sang các ranh giới không còn tường minh và khó kiểm soát. Khi nhìn vào bên trong một thành phần nhỏ và đơn giản, người ta dễ cảm thấy mọi thứ đã tốt hơn, nhưng lại bỏ qua các kết nối lộn xộn giữa các dịch vụ.

Cuối cùng còn có yếu tố kỹ năng của đội. Kỹ thuật mới thường được các đội có tay nghề vững hơn áp dụng. Một kỹ thuật hiệu quả với đội có tay nghề vững hơn không nhất thiết phù hợp với đội kém hơn một chút. Chúng tôi đã thấy rất nhiều trường hợp các đội kém hơn xây ra kiến trúc nguyên khối lộn xộn. Khi sự lộn xộn này xảy ra với microservices thì sẽ ra sao? Điều này cần thời gian để quan sát. Một đội tồi luôn xây ra hệ thống tồi – trong trường hợp đó, rất khó nói microservices rốt cuộc đã giảm bớt hay làm mọi thứ tệ hơn.

Một lập luận hợp lý mà chúng tôi nghe được là bạn không nên bắt đầu với kiến trúc microservices mà nên bắt đầu từ hệ thống nguyên khối, giữ nó module hóa, và tách thành microservices khi hệ thống nguyên khối gặp vấn đề. (Lời khuyên này không lý tưởng, vì API tốt trong tiến trình thường không phải là API dịch vụ tốt.)

Vì vậy chúng tôi viết điều này với sự lạc quan thận trọng. Cho đến nay chúng tôi đã thấy đủ nhiều về phong cách microservices để cảm thấy nó có thể là con đường đáng đi. Chúng tôi không thể chắc chắn cuối cùng sẽ đi đến đâu, nhưng một trong những thách thức của phát triển phần mềm là bạn chỉ có thể đưa ra quyết định dựa trên thông tin chưa hoàn hảo mà bạn hiện có.

## Chú thích

1: Thuật ngữ "microservice" được thảo luận tại một hội thảo của các kiến trúc sư phần mềm gần Venice vào tháng 5 năm 2011 để mô tả điều mà những người tham dự coi là một phong cách kiến trúc chung mà nhiều người trong số họ vừa khám phá gần đây. Tháng 5 năm 2012, cùng nhóm này quyết định chọn "microservices" là tên phù hợp nhất. James đã trình bày một số ý tưởng này như một case study vào tháng 3 năm 2012 tại 33rd Degree ở Krakow trong bài [Microservices - Java, the Unix Way](http://2012.33degree.org/talk/show/67), Fred George cũng trình bày [vào khoảng thời gian đó](http://www.slideshare.net/fredgeorge/micro-service-architecure). Adrian Cockcroft tại Netflix, mô tả cách tiếp cận này là "fine grained SOA", đã tiên phong phong cách này ở quy mô web, cũng như nhiều người khác được nhắc đến trong bài này - Joe Walnes, Dan North, Evan Botcher và Graham Tackley.

2: Thuật ngữ monolith đã được cộng đồng Unix dùng từ lâu. Nó xuất hiện trong [The Art of Unix Programming](https://www.amazon.com/gp/product/B003U2T5BA?ie=UTF8&tag=martinfowlerc-20&linkCode=as2&camp=1789&creative=9325&creativeASIN=B003U2T5BA) để mô tả các hệ thống trở nên quá lớn.

3: Nhiều nhà thiết kế hướng đối tượng, trong đó có chúng tôi, dùng thuật ngữ service object theo nghĩa của [Domain-Driven Design](https://www.amazon.com/gp/product/0321125215?ie=UTF8&tag=martinfowlerc-20&linkCode=as2&camp=1789&creative=9325&creativeASIN=0321125215) để chỉ một đối tượng thực hiện một quy trình quan trọng không gắn với một entity. Đây là khái niệm khác với cách chúng tôi dùng "service" trong bài này. Đáng tiếc là thuật ngữ service có cả hai nghĩa và chúng ta phải sống chung với tính đa nghĩa này.

4: Chúng tôi coi [ứng dụng là một cấu trúc xã hội](https://martinfowler.com/bliki/ApplicationBoundary.html) gắn kết với nhau một cơ sở mã, một nhóm chức năng và một nguồn kinh phí.

5: Bài báo gốc có thể tìm thấy trên trang web của Melvyn Conway [tại đây](http://www.melconway.com/Home/Committees_Paper.html).

6: Chúng tôi không thể không nhắc đến phát biểu của Jim Webber rằng ESB là viết tắt của ["Egregious Spaghetti Box"](http://www.infoq.com/presentations/soa-without-esb).

7: Netflix nêu rõ mối liên hệ này - cho đến gần đây vẫn gọi phong cách kiến trúc của họ là fine-grained SOA.

8: Ở quy mô cực lớn, các tổ chức thường chuyển sang giao thức nhị phân - ví dụ [protobufs](https://code.google.com/p/protobuf/). Các hệ thống dùng những giao thức này vẫn thể hiện đặc tính smart endpoints, dumb pipes - và đánh đổi tính minh bạch lấy quy mô. Hầu hết các thuộc tính web và chắc chắn đại đa số doanh nghiệp không cần thực hiện đánh đổi này - tính minh bạch có thể là một lợi thế lớn.

9: "YAGNI" hay "You Aren't Going To Need It" là một [nguyên tắc XP](http://c2.com/cgi/wiki?YouArentGonnaNeedIt) và lời khuyên không thêm tính năng cho đến khi bạn biết mình cần chúng.

10: Hơi thiếu thành thật khi chúng tôi tuyên bố rằng ứng dụng nguyên khối chỉ dùng một ngôn ngữ - để xây dựng hệ thống trên web ngày nay, có lẽ bạn cần biết JavaScript và XHTML, CSS, ngôn ngữ phía server bạn chọn, SQL và một phương ngữ ORM. Khó mà gọi là một ngôn ngữ, nhưng bạn hiểu ý chúng tôi.

11: Adrian Cockcroft đặc biệt nhắc đến "developer self-service" và "Developers run what they wrote"(sic) trong [bài trình bày xuất sắc này](http://www.slideshare.net/adrianco/flowcon-added-to-for-cmg-keynote-talk-on-how-speed-wins-and-how-netflix-is-doing-continuous-delivery) tại Flowcon vào tháng 11 năm 2013.

12: Ở đây chúng tôi hơi thiếu thành thật. Rõ ràng triển khai nhiều dịch vụ hơn, trong các topology phức tạp hơn, khó hơn triển khai một hệ thống nguyên khối đơn lẻ. May là các mẫu thiết kế làm giảm độ phức tạp này - tuy vậy đầu tư vào công cụ vẫn là bắt buộc.

13: Thực tế, Dan North gọi phong cách này là _Replaceable Component Architecture_ thay vì microservices. Vì cái tên này dường như chỉ nói đến một tập con các đặc điểm nên chúng tôi ưa dùng tên sau.

14: Kent Beck nêu bật điều này là một trong các nguyên tắc thiết kế của ông trong [Implementation Patterns](https://www.amazon.com/gp/product/0321413091?ie=UTF8&tag=martinfowlerc-20&linkCode=as2&camp=1789&creative=9325&creativeASIN=0321413091).

15: Và SOA hầu như không phải gốc rễ của lịch sử này. Tôi nhớ nhiều người nói "chúng tôi đã làm thế này nhiều năm rồi" khi thuật ngữ SOA xuất hiện vào đầu thế kỷ. Một lập luận là phong cách này có nguồn gốc từ cách các chương trình COBOL giao tiếp qua tệp dữ liệu trong những ngày đầu của điện toán doanh nghiệp. Theo một hướng khác, có thể lập luận rằng microservices cũng là thứ giống mô hình lập trình Erlang, nhưng áp dụng trong bối cảnh ứng dụng doanh nghiệp.
