---
source:
  locale: zh
  slug: high-concurrency-design
  hash: 'sha256:v1:edbc10e50587830b6242e3ee6baf1d6905008b4928c7aed01d7a2f5692240f14'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để thiết kế một hệ thống tải đồng thời cao

## Câu hỏi phỏng vấn

Làm thế nào để thiết kế một hệ thống tải đồng thời cao (high concurrency)?

## Tâm lý người phỏng vấn

Nói thật, nếu người phỏng vấn hỏi bạn câu này thì bạn phải dốc toàn bộ sức lực. Vì sao? Vì bạn chẳng thấy hiện nay rất nhiều công ty tuyển dụng, trong JD đều ghi gì sao: ưu tiên người có kinh nghiệm về tải đồng thời cao.

Nếu bạn thực sự có tài năng thực học, từng làm hệ thống tải đồng thời cao ở các công ty internet, thì việc nhận offer về cơ bản dễ như trở bàn tay, không có vấn đề gì. Người phỏng vấn cũng chắc chắn sẽ không hỏi bạn kiểu này, nếu không thì họ thật ngốc.

Giả sử bạn từng làm hệ thống tải đồng thời cao ở một công ty thương mại điện tử nổi tiếng, người dùng trên trăm triệu, lưu lượng một ngày vài chục tỷ, số lượng đồng thời giờ cao điểm hàng chục nghìn, thậm chí trăm nghìn. Vậy thì họ chắc chắn sẽ hỏi kỹ về kiến trúc hệ thống của bạn: hệ thống của các bạn có kiến trúc thế nào? Triển khai ra sao? Triển khai bao nhiêu máy? Dùng bộ nhớ đệm (cache) như thế nào? Dùng MQ như thế nào? Dùng cơ sở dữ liệu như thế nào? Tức là đào sâu xem rốt cuộc bạn đã chịu được tải đồng thời cao bằng cách nào.

Bởi vì người thực sự từng làm tải đồng thời cao chắc chắn biết rằng, kiến trúc hệ thống tách rời khỏi nghiệp vụ chỉ là nói suông trên giấy. Trong kịch bản nghiệp vụ phức tạp mà lại còn tải đồng thời cao, kiến trúc hệ thống chắc chắn không đơn giản như vậy, chẳng lẽ dùng Redis, dùng MQ là xong? Đương nhiên không phải, kiến trúc hệ thống thực tế khi kết hợp với nghiệp vụ sẽ phức tạp hơn nhiều lần so với cái gọi là "kiến trúc tải đồng thời cao" đơn giản kiểu này.

Nếu có người phỏng vấn hỏi bạn câu: làm thế nào để thiết kế một hệ thống tải đồng thời cao? Thì xin lỗi, **chắc chắn là vì thực tế bạn chưa từng làm hệ thống tải đồng thời cao**. Người phỏng vấn xem CV của bạn thấy không có gì nổi bật, cảm giác không ra sao, nên mới hỏi bạn câu: làm thế nào để thiết kế một hệ thống tải đồng thời cao? Nói trắng ra, bản chất là xem bạn có tự nghiên cứu hay không, có tích lũy kiến thức nhất định hay không.

Tốt nhất đương nhiên là tuyển được một người thực sự từng làm tải đồng thời cao, nhưng những người như vậy khan hiếm, khó tuyển. Vì thế phương án kém hơn một chút là tuyển một người đã tự nghiên cứu, dù sao cũng tốt hơn tuyển một người chẳng biết gì!

Cho nên lúc này bạn phải tự mình "trình diễn" một màn, thể hiện toàn bộ kiến thức của bạn về tải đồng thời cao!

## Phân tích câu trả lời

Thực ra, cái gọi là tải đồng thời cao, nếu muốn hiểu vấn đề này thì phải xuất phát từ gốc rễ của nó: vì sao lại có tải đồng thời cao? Vì sao tải đồng thời cao lại "ghê gớm" đến vậy?

Nói đơn giản một chút: lúc đầu hệ thống nào cũng kết nối thẳng vào cơ sở dữ liệu, nhưng cần biết rằng khi cơ sở dữ liệu chịu đến mức hai ba nghìn đồng thời mỗi giây thì về cơ bản là sắp tới giới hạn rồi. Cho nên mới có chuyện nhiều công ty lúc mới bắt đầu kỹ thuật còn khá yếu, kết quả nghiệp vụ phát triển quá nhanh, đôi khi hệ thống không chịu nổi áp lực nên sập.

Đương nhiên sẽ sập, dựa vào đâu mà không sập? Nếu cơ sở dữ liệu của bạn phải gánh tức thời 5000/8000, thậm chí hàng chục nghìn đồng thời mỗi giây thì chắc chắn sẽ sập, vì chẳng hạn MySQL căn bản không chịu nổi lượng đồng thời cao đến vậy.

Vậy tại sao tải đồng thời cao lại "ghê gớm"? Chính là vì hiện nay người dùng internet ngày càng nhiều, rất nhiều app, website, hệ thống phải chịu các request đồng thời cao, giờ cao điểm có thể vài nghìn đồng thời mỗi giây là chuyện rất bình thường. Nếu là các dịp như Lễ độc thân 11/11 thì có thể lên tới vài chục nghìn đến vài trăm nghìn đồng thời mỗi giây.

Vậy với lượng đồng thời cao như thế, cộng thêm nghiệp vụ vốn đã phức tạp như vậy, làm sao đây? Người thực sự giỏi chắc chắn là người từng làm kiến trúc tải đồng thời cao trong hệ thống nghiệp vụ phức tạp, nhưng bạn thì không, vậy tôi sẽ nói cho bạn biết nên trả lời câu hỏi này như thế nào:

Có thể chia làm 6 điểm sau:

-   Tách hệ thống
-   Bộ nhớ đệm
-   MQ
-   Sharding
-   Tách đọc/ghi
-   ElasticSearch

![high-concurrency-system-design](asset:high-concurrency/high-concurrency-design/high-concurrency-system-design.png)

### Tách hệ thống

Tách một hệ thống thành nhiều hệ thống con, dùng Dubbo để làm. Sau đó mỗi hệ thống kết nối một cơ sở dữ liệu, như vậy vốn chỉ có một CSDL, giờ có nhiều cơ sở dữ liệu, chẳng phải cũng có thể chịu được tải đồng thời cao sao.

### Bộ nhớ đệm

Bộ nhớ đệm, bắt buộc phải dùng. Phần lớn các kịch bản tải đồng thời cao đều là **đọc nhiều ghi ít**, vậy bạn hoàn toàn có thể ghi một bản vào cả cơ sở dữ liệu lẫn bộ nhớ đệm, rồi khi đọc thì phần lớn đi qua bộ nhớ đệm là được. Dù sao Redis trên một máy cũng dễ dàng chịu được hàng chục nghìn đồng thời. Vì vậy bạn có thể cân nhắc trong dự án của mình, những **kịch bản đọc chịu phần lớn request chính thì dùng bộ nhớ đệm để chống tải đồng thời cao như thế nào**.

### MQ

MQ, bắt buộc phải dùng MQ. Có thể bạn vẫn gặp kịch bản ghi đồng thời cao, ví dụ trong một thao tác nghiệp vụ phải thao tác cơ sở dữ liệu liên tục hàng chục lần, thêm xóa sửa thêm xóa sửa, điên mất. Vậy thì tải đồng thời cao chắc chắn sẽ làm sập hệ thống của bạn; nếu bạn dùng Redis để chịu phần ghi thì chắc chắn không được, vì nó là bộ nhớ đệm, dữ liệu có thể bị loại bỏ theo LRU bất cứ lúc nào, định dạng dữ liệu lại cực kỳ đơn giản, không hỗ trợ giao dịch. Cho nên cần dùng MySQL thì vẫn phải dùng MySQL. Vậy làm sao? Dùng MQ: lượng lớn request ghi được đổ vào MQ, xếp hàng xử lý từ từ, **hệ thống phía sau tiêu thụ rồi ghi từ từ**, kiểm soát trong phạm vi MySQL chịu được. Vì vậy bạn cần cân nhắc trong dự án của mình, ở những kịch bản chứa logic nghiệp vụ ghi phức tạp, làm thế nào dùng MQ để ghi bất đồng bộ, nâng cao khả năng đồng thời. MQ trên một máy chịu được hàng chục nghìn đồng thời cũng ổn, điều này trước đây đã đặc biệt nói qua.

### Sharding

Sharding: có thể đến cuối cùng, ở tầng cơ sở dữ liệu vẫn không tránh khỏi yêu cầu chống tải đồng thời cao, được thôi, vậy thì tách một cơ sở dữ liệu thành nhiều CSDL, nhiều CSDL cùng chịu lượng đồng thời cao hơn; rồi **tách một bảng thành nhiều bảng**, mỗi bảng giữ lượng dữ liệu ít hơn một chút để tăng hiệu năng chạy SQL.

### Tách đọc/ghi

Tách đọc/ghi: nghĩa là phần lớn thời gian cơ sở dữ liệu cũng là đọc nhiều ghi ít, không cần thiết dồn mọi request vào một CSDL, có thể dựng kiến trúc master/replica (master-slave), **master ghi**, **replica đọc**, làm tách đọc/ghi. Khi **lưu lượng đọc quá nhiều**, còn có thể **thêm nhiều replica hơn**.

### ElasticSearch

Elasticsearch, gọi tắt là ES. ES là hệ thống phân tán, có thể mở rộng tùy ý, phân tán vốn dĩ có thể chịu tải đồng thời cao, vì cứ thế là có thể mở rộng, thêm máy để chịu lượng đồng thời cao hơn. Vậy một số thao tác truy vấn, thống kê tương đối đơn giản có thể cân nhắc dùng ES để đảm nhận, còn một số thao tác kiểu tìm kiếm toàn văn cũng có thể cân nhắc dùng ES.

6 điểm trên về cơ bản là những việc mà một hệ thống tải đồng thời cao chắc chắn phải làm. Mọi người có thể kết hợp kỹ lưỡng với kiến thức đã học trước đó để suy nghĩ, đến lúc đó bạn có thể trình bày một cách hệ thống phần này, rồi mỗi phần cần chú ý những vấn đề gì, trước đây đều đã nói rồi, bạn có thể trình bày thêm, cho thấy bạn có chút tích lũy ở mảng này.

Nói thật, điểm thực sự giỏi của bạn không nằm ở việc hiểu rõ một số kỹ thuật, hay biết đại khái một hệ thống tải đồng thời cao trông như thế nào. Thực tế, trong hệ thống nghiệp vụ phức tạp thật sự, làm tải đồng thời cao phức tạp hơn các điểm nêu trên rất nhiều, từ hàng chục lần đến hàng trăm lần. Bạn cần cân nhắc: cái nào cần sharding, cái nào không cần; bảng đơn trên CSDL đơn và sharding thì join với nhau thế nào; dữ liệu nào cần đưa vào bộ nhớ đệm, đưa dữ liệu nào vào mới chịu được request đồng thời cao. Bạn cần phân tích xong một hệ thống nghiệp vụ phức tạp, rồi từng bước từng bước thêm vào việc cải tạo kiến trúc hệ thống tải đồng thời cao; quá trình này vô cùng phức tạp, một khi đã làm qua một lần và làm tốt, bạn sẽ rất được săn đón trên thị trường này.

Thực ra phần lớn các công ty thực sự coi trọng không phải việc bạn nắm một số kiến thức kiến trúc cơ bản liên quan đến tải đồng thời cao, hay một số kỹ thuật trong kiến trúc như RocketMQ, Kafka, Redis, Elasticsearch; mảng tải đồng thời cao này, bạn hiểu rồi thì cũng chỉ là nhân tài hạng hai. Đối với một hệ thống phân tán phức tạp có vài trăm nghìn dòng code, người đã từng từng bước thiết kế kiến trúc và thực tiễn kiến trúc tải đồng thời cao thì kinh nghiệm đó là vô cùng quý giá.

-----
