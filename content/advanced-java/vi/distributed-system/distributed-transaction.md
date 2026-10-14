---
source:
  locale: zh
  slug: distributed-transaction
  hash: 'sha256:v1:0f0b028fcea1a077bfcf9a5bcf25f80223cf029041d8a512cccbfd7cb048c891'
status: machine
translatedAt: '2026-10-14'
---
# Nguyên lý giao dịch phân tán

## Câu hỏi phỏng vấn

Bạn có hiểu về giao dịch phân tán không? Các bạn giải quyết vấn đề giao dịch phân tán như thế nào?

## Tâm lý người phỏng vấn

Hễ nói đến việc bạn đã làm hệ thống phân tán thì chắc chắn sẽ bị hỏi về giao dịch phân tán. Nếu bạn hoàn toàn không biết gì về giao dịch phân tán thì quả thực rất thiệt, ít nhất bạn phải biết có những phương án nào, thường làm ra sao, ưu nhược điểm của từng phương án là gì.

Hiện nay trong phỏng vấn, hệ thống phân tán đã trở thành tiêu chuẩn, và **giao dịch phân tán** do hệ thống phân tán mang lại cũng trở thành tiêu chuẩn. Vì khi làm hệ thống chắc chắn bạn phải dùng giao dịch, nếu là hệ thống phân tán thì chắc chắn phải dùng giao dịch phân tán. Chưa nói bạn đã làm hay chưa, ít nhất bạn phải hiểu có những phương án nào, mỗi phương án có thể có cái bẫy gì. Ví dụ vấn đề mạng của phương án TCC, vấn đề tính nhất quán của phương án XA.

## Phân tích câu trả lời

Việc triển khai giao dịch phân tán chủ yếu có 6 phương án sau:

-   Phương án XA
-   Phương án TCC
-   Phương án SAGA
-   Bảng thông điệp cục bộ
-   Phương án thông điệp tin cậy với nhất quán cuối cùng (eventual consistency)
-   Phương án thông báo nỗ lực tối đa

### Phương án commit hai pha/phương án XA

Phương án XA, tức là commit hai pha, có khái niệm **bộ quản lý giao dịch** (transaction manager), chịu trách nhiệm điều phối giao dịch của nhiều cơ sở dữ liệu (bộ quản lý tài nguyên). Bộ quản lý giao dịch trước tiên hỏi từng cơ sở dữ liệu xem đã sẵn sàng chưa. Nếu mọi cơ sở dữ liệu đều trả lời ok thì chính thức commit giao dịch, thực hiện thao tác trên từng cơ sở dữ liệu; nếu bất kỳ một cơ sở dữ liệu nào trả lời không ok thì rollback giao dịch.

Phương án giao dịch phân tán này khá phù hợp với giao dịch phân tán xuyên nhiều CSDL bên trong một ứng dụng nguyên khối, và vì phụ thuộc nặng vào tầng cơ sở dữ liệu để xử lý giao dịch phức tạp nên hiệu suất rất thấp, tuyệt đối không phù hợp với tình huống tải đồng thời cao (high concurrency). Nếu muốn thử thì có thể dùng `Spring + JTA`, bạn tự tìm một demo bất kỳ xem là hiểu.

Phương án này chúng tôi rất ít dùng. Nhìn chung, **bên trong một hệ thống mà xuất hiện thao tác xuyên nhiều CSDL** là **không hợp quy chuẩn**. Tôi có thể giới thiệu một chút: hiện nay với microservices, một hệ thống lớn được chia thành hàng chục thậm chí hàng trăm dịch vụ. Quy định và quy chuẩn của chúng tôi yêu cầu **mỗi dịch vụ chỉ được thao tác trên một CSDL tương ứng của chính nó**.

Nếu bạn muốn thao tác trên CSDL của dịch vụ khác thì không được kết nối thẳng vào CSDL của dịch vụ đó, vì vi phạm quy chuẩn kiến trúc microservices. Nếu truy cập chéo lung tung thì với hàng trăm dịch vụ, toàn bộ sẽ rối tung, một bộ dịch vụ như vậy không thể quản lý, không thể quản trị được, có thể xảy ra tình huống dữ liệu bị người khác sửa sai, CSDL của mình bị người khác ghi làm sập, v.v.

Nếu bạn muốn thao tác trên CSDL của dịch vụ khác thì phải thực hiện bằng cách **gọi API của dịch vụ đó**, tuyệt đối không cho phép truy cập chéo vào CSDL của người khác.

![distributed-transacion-XA](asset:distributed-system/distributed-transaction/distributed-transaction-XA.png)

### Phương án TCC

TCC là viết tắt của: `Try` , `Confirm` , `Cancel` .

-   Giai đoạn Try: giai đoạn này kiểm tra tài nguyên của từng dịch vụ và **khóa hoặc đặt trước** tài nguyên.
-   Giai đoạn Confirm: giai đoạn này **thực hiện thao tác thực sự** trong từng dịch vụ.
-   Giai đoạn Cancel: nếu phương thức nghiệp vụ của bất kỳ dịch vụ nào thực thi lỗi thì ở đây cần **bù trừ**, tức là thực hiện thao tác rollback cho logic nghiệp vụ đã thực thi thành công. (Rollback những cái đã thành công)

Nói thật, phương án này hầu như rất ít người dùng, chúng tôi cũng dùng khá ít, nhưng vẫn có tình huống áp dụng. Vì việc **rollback giao dịch** thực chất là **phụ thuộc nặng vào việc bạn tự viết code để rollback và bù trừ**, khiến code bù trừ phình to, rất khó chịu.

Ví dụ ở chỗ chúng tôi, nhìn chung những tình huống liên quan đến **tiền**, làm việc với tiền, như **thanh toán**, **giao dịch**, thì chúng tôi sẽ dùng TCC, đảm bảo nghiêm ngặt giao dịch phân tán hoặc là toàn bộ thành công, hoặc là toàn bộ tự động rollback, đảm bảo nghiêm ngặt tính đúng đắn của tiền, đảm bảo không xảy ra vấn đề về tiền.

Và tốt nhất là thời gian thực thi của từng nghiệp vụ đều khá ngắn.

Nhưng nói thật, nhìn chung nên cố gắng đừng làm như vậy, tự tay viết logic rollback hay logic bù trừ thật sự quá khó chịu, code nghiệp vụ đó rất khó bảo trì.

![distributed-transacion-TCC](asset:distributed-system/distributed-transaction/distributed-transaction-TCC.png)

### Phương án Saga

Các nghiệp vụ như lõi tài chính có thể chọn phương án TCC để theo đuổi tính nhất quán mạnh và lượng đồng thời cao hơn, còn với các hệ thống nghiệp vụ ở tầng trên lõi tài chính thì thường chọn giao dịch bù trừ. Xử lý giao dịch bù trừ đã được đề xuất từ hơn 30 năm trước trong lý thuyết Saga, cùng với sự phát triển của microservices, những năm gần đây mới dần được mọi người chú ý. Hiện nay trong ngành, việc dùng Saga làm giải pháp cho giao dịch dài (long transaction) được khá nhiều người thừa nhận.

#### Nguyên lý cơ bản

Mỗi bên tham gia trong quy trình nghiệp vụ đều commit giao dịch cục bộ; nếu một bên tham gia nào đó thất bại thì bù trừ cho các bên tham gia đã thành công trước đó. Phía bên trái của hình dưới là quy trình giao dịch bình thường, khi thực thi đến T3 thì xảy ra lỗi, bắt đầu thực thi quy trình bù trừ giao dịch ở bên phải: thực thi ngược các dịch vụ bù trừ C3, C2, C1 của T3, T2, T1, bù trừ dữ liệu mà T3, T2, T1 đã sửa.

![distributed-transacion-TCC](asset:distributed-system/distributed-transaction/distributed-transaction-saga.png)

#### Tình huống sử dụng

Với các tình huống yêu cầu tính nhất quán cao, quy trình ngắn, tải đồng thời cao, như hệ thống lõi tài chính, sẽ ưu tiên cân nhắc phương án TCC. Còn trong một số tình huống khác, chúng ta không cần tính nhất quán mạnh đến vậy, chỉ cần đảm bảo nhất quán cuối cùng là đủ.

Ví dụ nhiều nghiệp vụ ở tầng trên lõi tài chính (tầng kênh, tầng sản phẩm, tầng tích hợp hệ thống), đặc điểm của các hệ thống này là chỉ cần nhất quán cuối cùng, nhiều quy trình, quy trình dài, và có thể phải gọi dịch vụ của công ty khác. Trong trường hợp này nếu chọn phát triển theo phương án TCC thì một là chi phí cao, hai là không thể yêu cầu dịch vụ của công ty khác cũng tuân theo mô hình TCC. Đồng thời quy trình dài, ranh giới giao dịch quá dài, thời gian khóa lâu cũng sẽ ảnh hưởng đến hiệu năng đồng thời.

Vì vậy tình huống áp dụng của mô hình Saga là:

-   Quy trình nghiệp vụ dài, quy trình nghiệp vụ nhiều;
-   Các bên tham gia bao gồm dịch vụ của công ty khác hoặc dịch vụ của hệ thống kế thừa (legacy), không thể cung cấp ba API mà mô hình TCC yêu cầu.

#### Ưu điểm

-   Giai đoạn một commit giao dịch cục bộ, không khóa, hiệu năng cao;
-   Các bên tham gia có thể thực thi bất đồng bộ, thông lượng cao;
-   Dịch vụ bù trừ dễ triển khai, vì thao tác ngược của một thao tác cập nhật khá dễ hiểu.

#### Nhược điểm

-   Không đảm bảo tính cô lập (isolation) của giao dịch.

### Bảng thông điệp cục bộ

Bảng thông điệp cục bộ thực ra là một tư tưởng do ebay ở nước ngoài đưa ra.

Ý đại khái như sau:

1. Hệ thống A trong một giao dịch cục bộ của mình, đồng thời với việc thao tác thì chèn một bản ghi vào bảng thông điệp;
2. Tiếp theo hệ thống A gửi thông điệp này vào MQ;
3. Sau khi hệ thống B nhận được thông điệp, trong một giao dịch, chèn một bản ghi vào bảng thông điệp cục bộ của mình, đồng thời thực thi các thao tác nghiệp vụ khác; nếu thông điệp này đã được xử lý rồi thì giao dịch này sẽ rollback, như vậy **đảm bảo không xử lý trùng lặp thông điệp**;
4. Sau khi hệ thống B thực thi thành công, sẽ cập nhật trạng thái của bảng thông điệp cục bộ của mình và trạng thái của bảng thông điệp của hệ thống A;
5. Nếu hệ thống B xử lý thất bại thì sẽ không cập nhật trạng thái bảng thông điệp, lúc này hệ thống A sẽ định kỳ quét bảng thông điệp của mình, nếu có thông điệp chưa được xử lý thì sẽ gửi lại vào MQ, để B xử lý lại;
6. Phương án này đảm bảo nhất quán cuối cùng, dù giao dịch của B thất bại, A vẫn liên tục gửi lại thông điệp cho đến khi bên B thành công.

Nói thật, vấn đề lớn nhất của phương án này là **phụ thuộc nặng vào bảng thông điệp trong cơ sở dữ liệu để quản lý giao dịch**, vậy nếu là tình huống tải đồng thời cao thì sao? Mở rộng thế nào? Cho nên nhìn chung quả thực rất ít dùng.

![distributed-transaction-local-message-table](asset:distributed-system/distributed-transaction/distributed-transaction-local-message-table.png)

### Phương án thông điệp tin cậy với nhất quán cuối cùng

Ý của phương án này là dứt khoát không dùng bảng thông điệp cục bộ nữa mà triển khai giao dịch trực tiếp dựa trên MQ. Ví dụ RocketMQ của Alibaba hỗ trợ giao dịch thông điệp.

Ý đại khái là:

1. Hệ thống A trước tiên gửi một thông điệp prepared đến mq, nếu việc gửi thông điệp prepared này thất bại thì hủy thao tác luôn, không thực hiện nữa;
2. Nếu thông điệp này gửi thành công thì tiếp tục thực thi giao dịch cục bộ, nếu thành công thì báo mq gửi thông điệp xác nhận, nếu thất bại thì báo mq rollback thông điệp;
3. Nếu đã gửi thông điệp xác nhận thì lúc này hệ thống B sẽ nhận được thông điệp xác nhận, rồi thực thi giao dịch cục bộ;
4. mq sẽ tự động **định kỳ thăm dò (polling)** tất cả thông điệp prepared để gọi lại (callback) API của bạn, hỏi bạn rằng thông điệp này có phải giao dịch cục bộ xử lý thất bại không, những thông điệp chưa gửi xác nhận thì tiếp tục thử lại hay rollback? Nhìn chung ở đây bạn có thể kiểm tra cơ sở dữ liệu xem giao dịch cục bộ trước đó đã thực thi chưa, nếu đã rollback thì ở đây cũng rollback. Điều này nhằm tránh trường hợp giao dịch cục bộ đã thực thi thành công mà thông điệp xác nhận lại gửi thất bại.
5. Trong phương án này, nếu giao dịch của hệ thống B thất bại thì sao? Thử lại thôi, tự động liên tục thử lại cho đến khi thành công; nếu thực sự không được thì hoặc là với các nghiệp vụ quan trọng liên quan đến tiền thì rollback, ví dụ sau khi B rollback cục bộ thì tìm cách thông báo cho hệ thống A cũng rollback; hoặc là gửi cảnh báo để con người rollback và bù trừ thủ công.
6. Phương án này khá phù hợp, hiện nay các công ty internet trong nước phần lớn đều làm như vậy, hoặc bạn dùng loại được RocketMQ hỗ trợ, hoặc bạn tự dựa trên ActiveMQ? RabbitMQ? mà tự đóng gói một bộ logic tương tự, tóm lại ý tưởng là như vậy.

![distributed-transaction-reliable-message](asset:distributed-system/distributed-transaction/distributed-transaction-reliable-message.png)

### Phương án thông báo nỗ lực tối đa

Ý đại khái của phương án này là:

1. Sau khi giao dịch cục bộ của hệ thống A thực thi xong, gửi một thông điệp đến MQ;
2. Ở đây sẽ có một **dịch vụ thông báo nỗ lực tối đa** chuyên tiêu thụ MQ, dịch vụ này tiêu thụ MQ rồi ghi vào cơ sở dữ liệu để lưu lại, hoặc đưa vào một hàng đợi trong bộ nhớ cũng được, sau đó gọi API của hệ thống B;
3. Nếu hệ thống B thực thi thành công thì ok; nếu hệ thống B thực thi thất bại thì dịch vụ thông báo nỗ lực tối đa sẽ định kỳ thử gọi lại hệ thống B, lặp lại N lần, cuối cùng vẫn không được thì bỏ cuộc.

### Công ty của bạn xử lý giao dịch phân tán như thế nào?

Nếu bạn thực sự bị hỏi, có thể nói như thế này: ở một số tình huống đặc biệt nghiêm ngặt của chúng tôi, dùng TCC để đảm bảo nhất quán mạnh; còn ở một số tình huống khác thì dựa trên RocketMQ của Alibaba để triển khai giao dịch phân tán.

Bạn hãy chọn một tình huống có yêu cầu nghiêm ngặt về tiền, tuyệt đối không được sai, thì có thể nói bạn dùng phương án TCC; nếu là tình huống giao dịch phân tán thông thường, ví dụ sau khi chèn đơn hàng thì phải gọi dịch vụ tồn kho để cập nhật tồn kho, dữ liệu tồn kho không nhạy cảm như tiền, thì có thể dùng phương án thông điệp tin cậy với nhất quán cuối cùng.

Xin nhắc nhẹ một chút, với các phiên bản RocketMQ trước 3.2.6 thì có thể làm theo ý tưởng ở trên, nhưng sau đó API có một số thay đổi, tôi không nói thêm ở đây.

Tất nhiên nếu bạn muốn, có thể tham khảo phương án thông điệp tin cậy với nhất quán cuối cùng để tự triển khai một bộ giao dịch phân tán, ví dụ dựa trên RocketMQ.
