---
source:
  locale: zh
  slug: why-dubbo
  hash: 'sha256:v1:85a241de0071f701c3a941dae95303474c1e6b66bfa08c0b43affb0a5e5cf680'
status: machine
translatedAt: '2026-10-14'
---
# Tại sao phải tách hệ thống?

## Câu hỏi phỏng vấn

Vì sao phải tách hệ thống? Tách hệ thống như thế nào? Sau khi tách không dùng Dubbo có được không?

## Tâm lý người phỏng vấn

Bắt đầu từ câu hỏi này là đã vào phần hệ thống phân tán rồi. Bây giờ đi phỏng vấn thì hệ thống phân tán đã thành thứ mặc định phải có, không công ty nào là không hỏi bạn về chuyện phân tán. Nếu bạn không biết gì về hệ thống phân tán thì CV gần như không thể xem nổi, sẽ chẳng ai mời bạn đi phỏng vấn.

Thực ra vì sao lại như vậy? Đó là do sự phát triển kỹ thuật của cả ngành.

Những năm đầu, theo ấn tượng của tôi là vào khoảng đầu năm 2010, cả ngành IT rất ít người nói về hệ thống phân tán, chứ đừng nói đến microservices; tuy rằng nhiều công ty lớn như BAT, do độ phức tạp của hệ thống, đã sớm có kiến trúc phân tán với một lượng lớn dịch vụ, chỉ có điều microservices phần lớn được hiện thực dựa trên một bộ framework tự xây dựng.

Nhưng quả thật thời đó mọi người rất coi trọng ssh2, hầu hết các công ty vừa và nhỏ gần như đều chơi struts2, spring, hibernate; muộn hơn một chút mới chuyển sang tổ hợp spring mvc, spring, mybatis. Trình độ kỹ thuật của cả ngành thời đó là như vậy: Oracle rất hot, quản trị viên Oracle rất đắt giá, tối ưu hiệu năng Oracle v.v. đều là chiêu tuyệt kỹ của dân IT. Đến dữ liệu lớn cũng chẳng ai nhắc tới, và các trung tâm đào tạo chứng chỉ như OCP, OCM thì đắt khách vô cùng.

Nhưng theo sự phát triển của thời đại, dần dần nhiều công ty bắt đầu chấp nhận kiến trúc hệ thống phân tán, và có ảnh hưởng đặc biệt quan trọng tới ngành chính là Dubbo của Alibaba, **ở một mức độ nào đó, Alibaba đã thúc đẩy kỹ thuật của ngành tiến lên ở điểm này**.

Chính nhờ có Dubbo của Alibaba mà nhiều công ty vừa và nhỏ mới có thể dựa trên Dubbo để tách hệ thống thành nhiều dịch vụ, mỗi người phụ trách một dịch vụ, code của mọi người không xung đột nhau, các dịch vụ có thể tự quản, muốn dùng công nghệ gì cũng được, mỗi lần phát hành nếu chỉ sửa một dịch vụ thì chỉ cần đưa dịch vụ đó lên là xong, không cần tất cả mọi người cùng nhau tích hợp và chạy thử, mỗi lần phát hành lại là vài trăm nghìn dòng code, thậm chí vài triệu dòng code.

Đến ngày nay, thật vui khi thấy hệ thống phân tán đã thành thứ mặc định phải có trong phỏng vấn của ngành; bất kỳ lập trình viên bình thường nào cũng nên nắm được thứ này, thực ra đó là sự tiến bộ của ngành, cũng là sự tiến bộ kỹ thuật của tất cả dân code IT. Vì vậy, một khi hệ thống phân tán đã thành mặc định, người phỏng vấn đương nhiên sẽ hỏi, bởi nhiều công ty hiện nay đều là kiến trúc phân tán, microservices, nên người phỏng vấn tất nhiên phải kiểm tra bạn.

## Phân tích câu trả lời

### Vì sao phải tách hệ thống?

Lên mạng tra thì đáp án cực kỳ rời rạc và phức tạp, vụn vặt, lý do một đống. Nhưng ở đây tôi muốn cho mọi người một cảm nhận trực quan:

Nếu **không tách**, một hệ thống lớn có vài trăm nghìn dòng code, 20 người cùng bảo trì một bộ code thì đúng là bi kịch. Code sửa qua sửa lại là xung đột, đủ loại xung đột và việc hợp nhất code phải xử lý, rất tốn thời gian; thường là tôi sửa code của tôi, bạn gọi code của tôi, khiến code của bạn cũng phải kiểm thử lại, phiền chết đi được; rồi mỗi lần phát hành là cả hệ thống vài trăm nghìn dòng code cùng phát hành, mọi người phải thấp thỏm cùng nhau chuẩn bị lên production, lên production vài trăm nghìn dòng code thì mỗi lần có thể phải làm rất nhiều việc kiểm tra, xử lý rất nhiều vấn đề bất thường, vừa phiền phức vừa khổ sở; hơn nữa nếu bây giờ tôi định nâng cấp công nghệ lên phiên bản spring mới nhất thì cũng không được, vì có thể làm code của bạn báo lỗi, tôi không dám tùy tiện đổi công nghệ.

Giả sử một hệ thống có 200 nghìn dòng code, trong đó A sửa 1000 dòng, nhưng khi phát hành thì cả hệ thống lớn 200 nghìn dòng code này cùng được phát hành. Điều đó có nghĩa là 200 nghìn dòng code trên môi trường production đều có thể phát sinh đủ loại thay đổi; 20 người, ai cũng phải căng thẳng ngồi chờ trước máy tính, sau khi lên production thì kiểm tra log, xem phần mình phụ trách có vấn đề gì không.

A chỉ kiểm tra chức năng tương ứng với 10 nghìn dòng code mình phụ trách, đảm bảo ổn là rút; không may là khi lên production, A vô ý sửa một cấu hình nào đó của máy trên production, khiến một số chức năng tương ứng với 20 nghìn dòng code do B và C phụ trách bị lỗi.

Vài chục người phụ trách bảo trì một ứng dụng nguyên khối (monolith) vài trăm nghìn dòng code, mỗi lần lên production phải chuẩn bị mấy tuần, lên production -> triển khai -> kiểm tra chức năng mình phụ trách.

**Sau khi tách**, cả thế giới trở nên sạch sẽ: hệ thống vài trăm nghìn dòng code được tách thành 20 dịch vụ, trung bình mỗi dịch vụ chỉ 10 đến 20 nghìn dòng code, mỗi dịch vụ được triển khai trên máy riêng. 20 dự án, 20 repository git, 20 lập trình viên, mỗi người chỉ cần bảo trì dịch vụ của mình, đó là code độc lập của riêng mình, không liên quan gì đến người khác. Không còn xung đột code nữa, sướng. Mỗi lần chỉ cần kiểm thử code của mình, sướng. Mỗi lần chỉ cần phát hành một dịch vụ nhỏ của mình, sướng. Về mặt kỹ thuật muốn nâng cấp thế nào thì nâng cấp, chỉ cần giữ nguyên API là được, quá sướng.

Vì vậy nói đơn giản, tóm lại bằng một câu: nếu là loại dự án vừa và lớn với lượng code lên tới vài trăm nghìn dòng, trong nhóm có vài chục người, thì nếu không tách hệ thống, **hiệu suất phát triển cực kỳ thấp**, vấn đề rất nhiều. Nhưng sau khi tách hệ thống, mỗi người chỉ phụ trách một phần nhỏ của mình, muốn làm gì thì làm. Sau khi tách thành hệ thống phân tán, có thể nâng cao đáng kể hiệu suất phát triển của các nhóm lớn làm hệ thống phức tạp.

Nhưng đồng thời cũng cần **lưu ý** một điểm: sau khi tách hệ thống thành hệ thống phân tán, hàng loạt vấn đề mà hệ thống phân tán phải đối mặt cũng nối đuôi nhau kéo đến, nên các câu hỏi phía sau đều xoay quanh **những thách thức kỹ thuật phức tạp do hệ thống phân tán mang lại**.

### Tách hệ thống như thế nào?

Câu hỏi này nói lớn thì có thể rất lớn, có thể kéo sang thiết kế mô hình hướng miền (domain-driven design); nói nhỏ thì cũng rất nhỏ. Tôi không muốn đưa ra cách nói quá học thuật, vì bạn cũng không thể học thuộc đáp án này, đến lúc đó cứ nói thẳng ra. Vẫn nói đơn giản thôi, đến lúc đó mọi người tự biết trả lời thế nào là được.

Tách hệ thống thành hệ thống phân tán, tách thành nhiều dịch vụ, tách thành kiến trúc microservices, cần phải tách nhiều vòng. Không phải một kiến trúc sư vừa đến là tách xong một lần và sau này không cần tách nữa.

Vòng đầu tiên: nhóm tiếp tục mở rộng, một dịch vụ đã tách, lúc đầu 1 người bảo trì 10 nghìn dòng code, sau này hệ thống nghiệp vụ ngày càng phức tạp, dịch vụ này lên 100 nghìn dòng code, 5 người; vòng thứ hai, 1 dịch vụ -> 5 dịch vụ, mỗi dịch vụ 20 nghìn dòng code, mỗi người phụ trách một dịch vụ.

Nếu nhiều người bảo trì một dịch vụ, trong tình huống lý tưởng nhất, với vài chục người thì 1 người phụ trách 1 hoặc 2~3 dịch vụ; khi khối lượng công việc của một dịch vụ tăng lên, code ngày càng nhiều, một bạn phụ trách một dịch vụ, lượng code lên 100 nghìn dòng, bản thân bạn đó không kham nổi, thì bây giờ một mình tách ra thành 5 dịch vụ, vẫn 1 người gánh, phụ trách 5 người, rồi tiếp tục tuyển người, 2 người, cho bạn đó dẫn dắt, 3 người phụ trách 5 dịch vụ, trong đó 2 người mỗi người phụ trách 2 dịch vụ, 1 người phụ trách 1 dịch vụ.

Đề xuất cá nhân: code của một dịch vụ không nên quá nhiều, khoảng 10 nghìn dòng, cùng lắm là hai ba chục nghìn dòng.

Phần lớn các hệ thống đều phải **tách nhiều vòng**. Lần tách đầu tiên có thể chỉ là tách các mô-đun trước đây ra, ví dụ tách hệ thống thương mại điện tử thành hệ thống đơn hàng, hệ thống sản phẩm, hệ thống thu mua, hệ thống kho, hệ thống người dùng, v.v.

Nhưng về sau mỗi hệ thống có thể lại ngày càng phức tạp, ví dụ hệ thống thu mua lại chia thành hệ thống quản lý nhà cung cấp, hệ thống quản lý đơn thu mua; hệ thống đơn hàng lại tách thành hệ thống giỏ hàng, hệ thống giá, hệ thống quản lý đơn hàng.

Nói sâu thì thực sự rất sâu, nên ở đây tôi đưa ra một ví dụ để bạn tự cảm nhận, **ý cốt lõi là tùy tình hình mà tách một vòng trước, sau này nếu hệ thống phức tạp hơn thì có thể tiếp tục tách**. Bạn chỉ cần dựa vào ví dụ về hệ thống mình phụ trách để cân nhắc là được.

### Sau khi tách không dùng Dubbo có được không?

Tất nhiên là được. Tệ nhất thì các hệ thống trực tiếp giao tiếp với nhau bằng API http thuần dựa trên spring mvc, còn làm gì được nữa. Nhưng chắc chắn là có vấn đề, vì việc bảo trì giao tiếp bằng API http có chi phí rất cao, bạn phải cân nhắc đủ thứ vấn đề lằng nhằng như **thử lại khi hết thời gian chờ (timeout)**, **cân bằng tải**, v.v. Ví dụ hệ thống đơn hàng của bạn gọi hệ thống sản phẩm, hệ thống sản phẩm triển khai trên 5 máy, làm sao bạn phân phối đều yêu cầu cho 5 máy đó? Đó chẳng phải là cân bằng tải sao? Nếu tự làm hết thì cũng được, nhưng quả thật rất khổ.

Vì vậy nói thẳng ra thì Dubbo là một framework RPC, nghĩa là ở phía cục bộ bạn chỉ thực hiện việc gọi API, nhưng Dubbo sẽ proxy yêu cầu gọi này, giao tiếp mạng với máy từ xa, xử lý giúp bạn cân bằng tải, tự động nhận biết instance dịch vụ lên xuống, thử lại khi hết thời gian chờ, và đủ thứ vấn đề lằng nhằng khác. Như vậy bạn không cần tự làm nữa, dùng Dubbo là được.
