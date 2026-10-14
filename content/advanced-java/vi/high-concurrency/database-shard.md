---
source:
  locale: zh
  slug: database-shard
  hash: 'sha256:v1:9c5c1de30ff89363123ec42f8049214c79979b372bf53dbe6fb0204ce8add38f'
status: machine
translatedAt: '2026-10-14'
---
# Tại sao cần sharding?

## Câu hỏi phỏng vấn

Tại sao cần sharding (thiết kế hệ thống tải đồng thời cao thì ở tầng cơ sở dữ liệu nên thiết kế như thế nào)? Bạn đã dùng những middleware sharding nào? Các middleware sharding khác nhau có ưu điểm và nhược điểm gì? Cụ thể các bạn đã tách dọc hay tách ngang cơ sở dữ liệu như thế nào?

## Tâm lý người phỏng vấn

Thực ra phần này chắc chắn liên quan đến **tải đồng thời cao**, vì sharding nhất định là để **chống đỡ hai vấn đề: tải đồng thời cao và lượng dữ liệu lớn**. Hơn nữa nói thật, nhất là phỏng vấn ở các công ty internet, về cơ bản đều sẽ hỏi như vậy, câu hỏi kỹ thuật phổ biến như sharding mà không hỏi thì thật sự không được, còn nếu bạn không biết thì cũng thật sự không thể chấp nhận được!

## Phân tích câu trả lời

### Tại sao cần sharding? (Thiết kế hệ thống tải đồng thời cao thì ở tầng cơ sở dữ liệu nên thiết kế như thế nào?)

Nói thẳng ra, tách cơ sở dữ liệu và tách bảng là hai việc khác nhau, mọi người đừng nhầm lẫn, có thể chỉ tách cơ sở dữ liệu mà không tách bảng, cũng có thể chỉ tách bảng mà không tách cơ sở dữ liệu, đều có thể xảy ra.

Trước hết tôi đưa ra cho mọi người một kịch bản.

Giả sử bây giờ chúng ta là một công ty khởi nghiệp nhỏ (hoặc một phòng ban mới vừa nổi lên của một công ty cỡ BAT), hiện có 200 nghìn người dùng đăng ký, mỗi ngày có 10 nghìn người dùng hoạt động, mỗi ngày lượng dữ liệu của một bảng là 1000, rồi giờ cao điểm mỗi giây có tối đa 10 yêu cầu đồng thời. Trời ơi, với hệ thống kiểu này thì tìm đại một người có vài năm kinh nghiệm, dẫn thêm vài bạn mới được đào tạo ra, làm sao cũng được.

Không ngờ chúng ta lại may mắn đến vậy, gặp được một CEO dẫn dắt chúng ta đi trên con đường rộng mở, nghiệp vụ phát triển như vũ bão, qua vài tháng, số người dùng đăng ký đạt 20 triệu! Số người dùng hoạt động mỗi ngày là 1 triệu! Lượng dữ liệu một bảng mỗi ngày là 100 nghìn bản ghi! Giờ cao điểm mỗi giây tối đa đạt 1000 yêu cầu! Đồng thời công ty còn tiện thể gọi vốn hai vòng, thu về hàng trăm triệu nhân dân tệ! Định giá công ty đạt mức kinh ngạc hàng trăm triệu USD! Đây là nhịp điệu của một kỳ lân nhỏ!

Được rồi, không sao, bây giờ mọi người cảm thấy áp lực đã hơi lớn, tại sao ư? Vì mỗi ngày tăng thêm 100 nghìn bản ghi, một tháng tăng thêm 3 triệu bản ghi, bây giờ bảng đơn của chúng ta đã có vài triệu bản ghi, sắp vượt 10 triệu. Nhưng vẫn còn gượng chống được. Yêu cầu giờ cao điểm hiện tại là 1000, chúng ta triển khai vài máy trực tuyến, làm cân bằng tải một chút, cơ sở dữ liệu chống đỡ 1000QPS cũng tạm ổn. Nhưng bây giờ mọi người bắt đầu cảm thấy hơi lo, tiếp theo làm thế nào đây......

Vài tháng tiếp theo, trời ơi, CEO quá đỉnh, số người dùng của công ty đã đạt 100 triệu, công ty tiếp tục gọi vốn hàng tỷ nhân dân tệ! Định giá công ty đạt mức kinh ngạc hàng tỷ USD, trở thành công ty khởi nghiệp ngôi sao đỉnh nhất trong nước năm nay! Trời, chúng ta quá may mắn.

Nhưng đồng thời chúng ta cũng bất hạnh, vì lúc này số người dùng hoạt động mỗi ngày là hàng chục triệu, mỗi ngày một bảng tăng thêm tới 500 nghìn bản ghi, hiện tại tổng lượng dữ liệu của một bảng đã đạt 20 đến 30 triệu rồi! Không chịu nổi nữa! Dung lượng đĩa của cơ sở dữ liệu liên tục bị tiêu hao! Tải đồng thời giờ cao điểm đạt mức kinh ngạc `5000~8000` ! Đừng đùa nữa anh bạn. Tôi đảm bảo với bạn, hệ thống của bạn không chống đỡ nổi đến bây giờ, đã sập rồi!

Được rồi, đọc đến đây bạn cũng gần như hiểu sharding là chuyện gì rồi, thực ra nó đi theo sự phát triển nghiệp vụ của công ty bạn, nghiệp vụ công ty càng phát triển tốt, người dùng càng nhiều, lượng dữ liệu càng lớn, lượng yêu cầu càng lớn, thì một cơ sở dữ liệu đơn của bạn chắc chắn không chịu nổi.

#### Tách bảng

Ví dụ bảng đơn của bạn đã có vài chục triệu bản ghi, bạn chắc chắn chống đỡ nổi không? Tuyệt đối không, **lượng dữ liệu của bảng đơn quá lớn** sẽ ảnh hưởng cực lớn đến **hiệu năng thực thi** sql của bạn, về sau sql của bạn có thể chạy rất chậm. Nói chung, theo kinh nghiệm của tôi, khi bảng đơn đến vài triệu bản ghi thì hiệu năng sẽ tương đối kém đi, bạn phải tách bảng rồi.

Tách bảng nghĩa là gì? Là đặt dữ liệu của một bảng vào nhiều bảng, rồi khi truy vấn bạn chỉ truy vấn một bảng. Ví dụ tách bảng theo id người dùng, đặt dữ liệu của một người dùng vào một bảng. Rồi khi thao tác, với một người dùng bạn chỉ cần thao tác bảng đó. Như vậy có thể kiểm soát lượng dữ liệu của mỗi bảng trong phạm vi kiểm soát được, ví dụ mỗi bảng cố định trong vòng 2 triệu.

#### Tách cơ sở dữ liệu

Tách cơ sở dữ liệu nghĩa là gì? Là một cơ sở dữ liệu theo kinh nghiệm của chúng tôi, chống đỡ tối đa đến tải đồng thời 2000, nhất định phải mở rộng, và mức đồng thời của một cơ sở dữ liệu đơn khỏe mạnh tốt nhất bạn nên giữ khoảng 1000 mỗi giây, đừng quá lớn. Vậy bạn có thể tách dữ liệu của một cơ sở dữ liệu ra nhiều cơ sở dữ liệu, khi truy cập chỉ cần truy cập một cơ sở dữ liệu là được.

Đây chính là cái gọi là **sharding**, tại sao cần sharding? Bạn hiểu rồi chứ.

| #                      | Trước khi sharding                                       | Sau khi sharding                                                                         |
| ---------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Khả năng chịu tải đồng thời | MySQL triển khai trên một máy, không chịu nổi tải đồng thời cao | MySQL từ một máy lên nhiều máy, mức đồng thời chịu được tăng gấp nhiều lần               |
| Mức sử dụng đĩa        | Dung lượng đĩa MySQL trên một máy gần như đầy            | Tách thành nhiều cơ sở dữ liệu, tỷ lệ sử dụng đĩa của máy chủ cơ sở dữ liệu giảm mạnh    |
| Hiệu năng thực thi SQL | Lượng dữ liệu bảng đơn quá lớn, SQL càng chạy càng chậm  | Lượng dữ liệu bảng đơn giảm, hiệu quả thực thi SQL tăng rõ rệt                           |

### Đã dùng những middleware sharding nào? Các middleware sharding khác nhau có ưu điểm và nhược điểm gì?

Cái này thực ra là xem bạn biết những middleware sharding nào, ưu nhược điểm của từng middleware là gì? Rồi bạn đã dùng những middleware sharding nào.

Các middleware khá phổ biến gồm:

-   Cobar
-   TDDL
-   Atlas
-   Sharding-jdbc
-   Mycat

#### Cobar

Do nhóm b2b của Alibaba phát triển và mã nguồn mở, thuộc phương án tầng proxy, tức nằm giữa máy chủ ứng dụng và máy chủ cơ sở dữ liệu. Chương trình ứng dụng truy cập cụm Cobar qua driver JDBC, Cobar dựa vào SQL và quy tắc sharding để phân rã SQL, rồi phân phối đến các instance cơ sở dữ liệu khác nhau của cụm MySQL để thực thi. Những năm đầu còn dùng được, nhưng mấy năm gần đây đều không cập nhật, về cơ bản không ai dùng, gần như ở trạng thái bị bỏ rơi. Hơn nữa không hỗ trợ các thao tác như tách đọc/ghi, stored procedure, join xuyên cơ sở dữ liệu và phân trang.

#### TDDL

Do nhóm Taobao phát triển, thuộc phương án tầng client. Hỗ trợ cú pháp crud cơ bản và tách đọc/ghi, nhưng không hỗ trợ các cú pháp như join, truy vấn nhiều bảng. Hiện nay cũng không dùng nhiều, vì còn phụ thuộc vào hệ thống quản lý cấu hình diamond của Taobao.

#### Atlas

Do 360 mã nguồn mở, thuộc phương án tầng proxy, trước đây có một số công ty dùng, nhưng quả thật có một vấn đề rất lớn là lần bảo trì mới nhất của cộng đồng đã từ 5 năm trước. Vì vậy, hiện nay các công ty dùng về cơ bản cũng rất ít.

#### Sharding-jdbc

Do Dangdang mã nguồn mở, thuộc phương án tầng client, là phương án tầng client của [ `ShardingSphere` ](https://shardingsphere.apache.org), [ `ShardingSphere` ](https://shardingsphere.apache.org) còn cung cấp phương án tầng proxy là Sharding-Proxy. Quả thật trước đây dùng khá nhiều, vì hỗ trợ cú pháp SQL cũng khá nhiều, không có quá nhiều hạn chế, hơn nữa tính đến 2019.4, đã phát hành đến phiên bản `4.0.0-RC1`, hỗ trợ sharding, tách đọc/ghi, sinh id phân tán, giao dịch mềm (giao dịch kiểu gửi nỗ lực tối đa, giao dịch TCC). Hơn nữa quả thật trước đây các công ty sử dụng khá nhiều (trên trang chính thức có đăng ký các công ty sử dụng, có thể thấy từ 2017 cho đến nay là có không ít công ty đang dùng), hiện nay cộng đồng vẫn luôn phát triển và bảo trì, coi như khá sôi động, cá nhân tôi cho rằng đây vẫn là một **phương án có thể lựa chọn** hiện nay.

#### Mycat

Được cải tạo dựa trên Cobar, thuộc phương án tầng proxy, hỗ trợ các chức năng rất hoàn thiện, hơn nữa hiện nay hẳn là middleware cơ sở dữ liệu rất hot và ngày càng phổ biến, cộng đồng rất sôi động, cũng có một số công ty bắt đầu dùng. Nhưng quả thật so với Sharding jdbc thì trẻ hơn một chút, trải qua ít thử thách hơn.

#### Tổng kết

Tóm lại, hiện nay thực ra nên cân nhắc là Sharding-jdbc và Mycat, hai cái này đều có thể cân nhắc sử dụng.

Phương án tầng client như Sharding-jdbc có **ưu điểm là không cần triển khai, chi phí vận hành thấp, không cần tầng proxy chuyển tiếp yêu cầu lần hai, hiệu năng rất cao**, nhưng nếu gặp nâng cấp gì đó thì cần nâng cấp lại phiên bản rồi phát hành lại cho từng hệ thống, mỗi hệ thống đều phải **gắn kết** với phụ thuộc của Sharding-jdbc;

Phương án tầng proxy như Mycat có **nhược điểm là cần triển khai**, tự vận hành một bộ middleware, chi phí vận hành cao, nhưng **lợi ích là trong suốt với từng dự án**, nếu gặp nâng cấp gì đó thì chỉ cần làm ở middleware của mình là được.

Thông thường, hai phương án này thực ra đều có thể chọn dùng, nhưng cá nhân tôi đề xuất công ty vừa và nhỏ chọn Sharding-jdbc, phương án tầng client nhẹ nhàng, chi phí bảo trì thấp, không cần phân thêm nhân lực, hơn nữa độ phức tạp hệ thống của công ty vừa và nhỏ sẽ thấp hơn, dự án cũng không nhiều đến vậy; còn công ty vừa và lớn thì tốt nhất vẫn chọn phương án tầng proxy kiểu Mycat, vì có thể hệ thống và dự án của công ty lớn rất nhiều, đội ngũ rất lớn, nhân sự dồi dào, thì tốt nhất là chuyên cử một người nghiên cứu và bảo trì Mycat, rồi một lượng lớn dự án cứ dùng trực tiếp một cách trong suốt là được.

### Cụ thể các bạn đã tách dọc hay tách ngang cơ sở dữ liệu như thế nào?

**Tách ngang** nghĩa là đưa dữ liệu của một bảng vào nhiều bảng của nhiều cơ sở dữ liệu, nhưng cấu trúc bảng của mỗi cơ sở dữ liệu đều giống nhau, chỉ là dữ liệu đặt trong bảng của mỗi cơ sở dữ liệu khác nhau, dữ liệu của tất cả các bảng cộng lại là toàn bộ dữ liệu. Ý nghĩa của tách ngang là đặt dữ liệu đồng đều vào nhiều cơ sở dữ liệu hơn, rồi dùng nhiều cơ sở dữ liệu để chống đỡ mức đồng thời cao hơn, ngoài ra là dùng dung lượng lưu trữ của nhiều cơ sở dữ liệu để mở rộng.

![database-split-horizon](asset:high-concurrency/database-shard/database-split-horizon.png)

**Tách dọc** nghĩa là **tách một bảng có rất nhiều trường thành nhiều bảng**, **hoặc lên nhiều cơ sở dữ liệu**. Cấu trúc của mỗi bảng ở mỗi cơ sở dữ liệu đều khác nhau, mỗi bảng đều chứa một phần các trường. Nói chung, sẽ **đặt các trường ít mà tần suất truy cập rất cao vào một bảng**, rồi **đặt các trường nhiều mà tần suất truy cập rất thấp vào một bảng khác**. Vì cơ sở dữ liệu có bộ nhớ đệm, các trường của dòng có tần suất truy cập cao của bạn càng ít thì càng có thể cache được nhiều dòng hơn trong bộ nhớ đệm, hiệu năng càng tốt. Cái này nói chung làm ở tầng bảng nhiều hơn.

![database-split-vertically](asset:high-concurrency/database-shard/database-split-vertically.png)

Cái này thực ra khá phổ biến, không nhất thiết phải do tôi nói, nhiều bạn có thể tự mình đã làm, tách một bảng lớn ra, bảng đơn hàng, bảng thanh toán đơn hàng, bảng sản phẩm của đơn hàng.

Còn có **tách ở tầng bảng**, tức là tách bảng, biến một bảng thành N bảng, tức là **kiểm soát lượng dữ liệu của mỗi bảng trong một phạm vi nhất định**, đảm bảo hiệu năng SQL. Nếu không, lượng dữ liệu bảng đơn càng lớn thì hiệu năng SQL càng kém. Thường là khoảng 2 triệu dòng, đừng quá nhiều, nhưng cũng phải xem bạn thao tác cụ thể ra sao, cũng có thể là 5 triệu, hoặc 1 triệu. SQL của bạn càng phức tạp thì càng nên để số dòng bảng đơn càng ít.

Được rồi, dù tách cơ sở dữ liệu hay tách bảng, các middleware cơ sở dữ liệu nói ở trên đều hỗ trợ được. Tức là về cơ bản các middleware đó làm được việc: sau khi bạn sharding, **middleware có thể dựa vào giá trị của một trường nào đó mà bạn chỉ định**, ví dụ userid, **tự động định tuyến đến cơ sở dữ liệu tương ứng, rồi tự động định tuyến đến bảng tương ứng**.

Bạn phải cân nhắc xem trong dự án của bạn nên sharding như thế nào. Nói chung, tách dọc thì bạn có thể làm ở tầng bảng, tách các bảng có đặc biệt nhiều trường; tách ngang thì bạn có thể nói là mức đồng thời không chịu nổi, hoặc lượng dữ liệu quá lớn, dung lượng không chịu nổi, bạn tách ra, tách theo trường nào thì bạn tự nghĩ cho kỹ; tách bảng thì bạn cân nhắc, nếu dù đã tách đến từng cơ sở dữ liệu, mức đồng thời và dung lượng đều ok rồi, nhưng bảng của mỗi cơ sở dữ liệu vẫn quá lớn, thì bạn tách bảng, chia bảng này ra, đảm bảo lượng dữ liệu của mỗi bảng không quá lớn.

Hơn nữa ở đây còn có hai **cách sharding**:

-   Một là chia theo range, tức là mỗi cơ sở dữ liệu một đoạn dữ liệu liên tục, cái này nói chung chia theo ví dụ như **khoảng thời gian**, nhưng cách này thường ít dùng, vì rất dễ sinh ra vấn đề điểm nóng, một lượng lớn lưu lượng đều đánh vào dữ liệu mới nhất.
-   Hoặc là hash theo một trường nào đó để phân tán đồng đều, cái này dùng phổ biến hơn.

Chia theo range, lợi ích là khi mở rộng rất đơn giản, vì bạn chỉ cần chuẩn bị sẵn, chuẩn bị một cơ sở dữ liệu cho mỗi tháng là được, đến một tháng mới, tự nhiên sẽ ghi vào cơ sở dữ liệu mới; nhược điểm là phần lớn yêu cầu đều truy cập dữ liệu mới nhất. Thực tế dùng range trên production thì phải xem kịch bản.

Phân phối theo hash, lợi ích là có thể phân bổ đều lượng dữ liệu và áp lực yêu cầu của mỗi cơ sở dữ liệu; điểm xấu là khi mở rộng khá phiền phức, sẽ có một quá trình di chuyển dữ liệu, dữ liệu trước đó cần tính lại giá trị hash rồi phân bổ lại vào các cơ sở dữ liệu hoặc bảng khác nhau.
