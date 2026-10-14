---
source:
  locale: zh
  slug: es-optimizing-query-performance
  hash: 'sha256:v1:0644c179492493c544baf422fedb47846270bf2c94160fdf36501819b42559fd'
status: machine
translatedAt: '2026-10-14'
---
# Tối ưu hiệu năng truy vấn của ES

## Câu hỏi phỏng vấn

Khi lượng dữ liệu của ES rất lớn (cỡ hàng tỷ bản ghi), làm thế nào để nâng cao hiệu quả truy vấn?

## Tâm lý người phỏng vấn

Câu hỏi này chắc chắn sẽ được hỏi. Nói thẳng ra, người phỏng vấn muốn xem bạn đã thực sự làm việc với ES hay chưa, vì sao vậy? Thực ra hiệu năng của ES không tốt như bạn tưởng. Rất nhiều lúc khi lượng dữ liệu lớn lên, đặc biệt là khi có vài trăm triệu bản ghi, có thể bạn sẽ ngỡ ngàng nhận ra: chạy một lần tìm kiếm mà mất tới `5~10s`, thật tệ hại. Lần tìm kiếm đầu tiên mất `5~10s`, nhưng những lần sau lại nhanh hơn hẳn, có thể chỉ vài trăm mili giây.

Bạn sẽ thấy bối rối: chẳng lẽ mỗi người dùng truy cập lần đầu đều bị chậm, bị giật như vậy sao? Vì thế nếu bạn chưa từng dùng ES, hoặc chỉ nghịch demo cho vui, khi bị hỏi câu này sẽ dễ lúng túng, và bộc lộ rằng bạn thực sự chưa thạo ES.

## Phân tích câu trả lời

Nói thật, tối ưu hiệu năng ES không có viên đạn bạc nào cả. Ý là gì? Là **đừng mong chỉ cần tiện tay chỉnh một tham số là có thể xử lý mọi tình huống chậm**. Có thể ở một số tình huống, đổi một tham số hoặc chỉnh lại cú pháp là xong, nhưng chắc chắn không phải tình huống nào cũng làm được như vậy.

### Đòn sát thủ của tối ưu hiệu năng: filesystem cache

Dữ liệu bạn ghi vào ES thực chất đều được ghi vào các tệp trên đĩa. **Khi truy vấn**, hệ điều hành sẽ tự động đưa dữ liệu trong các tệp đĩa đó vào `filesystem cache` (bộ nhớ đệm của hệ thống tệp).

![es-search-process](asset:high-concurrency/es-optimizing-query-performance/es-search-process.png)

Công cụ tìm kiếm của ES phụ thuộc rất nặng vào `filesystem cache` bên dưới. Nếu bạn cấp cho `filesystem cache` nhiều bộ nhớ hơn, cố gắng để bộ nhớ chứa được toàn bộ các tệp dữ liệu chỉ mục `idx segment file ` , thì khi tìm kiếm gần như đều chạy trên bộ nhớ, hiệu năng sẽ rất cao.

Chênh lệch hiệu năng rốt cuộc lớn đến đâu? Qua nhiều lần kiểm thử và kiểm thử chịu tải trước đây của chúng tôi, nếu chạy qua đĩa thì thường chắc chắn sẽ quá một giây, hiệu năng tìm kiếm ở mức giây: 1 giây, 5 giây, 10 giây. Nhưng nếu chạy qua `filesystem cache` , tức là hoàn toàn trên bộ nhớ, thì nhìn chung hiệu năng cao hơn chạy qua đĩa một bậc, gần như ở mức mili giây, từ vài mili giây đến vài trăm mili giây.

Có một trường hợp thực tế như sau. Một công ty có 3 máy làm node ES, mỗi máy trông có vẻ nhiều bộ nhớ, 64G, tổng bộ nhớ là `64 * 3 = 192G` . Mỗi máy cấp cho JVM heap của ES là `32G` , vậy phần còn lại dành cho `filesystem cache` chỉ là `32G` mỗi máy, tổng cộng toàn cụm dành cho `filesystem cache` là `32 * 3 = 96G` bộ nhớ. Trong khi đó, toàn bộ các tệp dữ liệu chỉ mục trên đĩa chiếm tổng cộng `1T` dung lượng đĩa trên 3 máy, dữ liệu ES là `1T` , nên mỗi máy chứa `300G` dữ liệu. Hiệu năng như vậy có tốt không? Bộ nhớ của `filesystem cache` chỉ có 100G, tức một phần mười dữ liệu nằm trong bộ nhớ, phần còn lại nằm trên đĩa, nên khi bạn thực hiện tìm kiếm, phần lớn thao tác đều chạy qua đĩa, hiệu năng chắc chắn kém.

Suy cho cùng, muốn ES có hiệu năng tốt, trường hợp tốt nhất là bộ nhớ của máy chứa được ít nhất một nửa tổng lượng dữ liệu của bạn.

Theo kinh nghiệm thực tế trên môi trường production của chúng tôi, trường hợp tốt nhất là chỉ lưu một lượng nhỏ dữ liệu trong ES, tức là **những chỉ mục dùng để tìm kiếm**. Nếu bộ nhớ dành cho `filesystem cache` là 100G thì hãy giữ dữ liệu chỉ mục trong phạm vi `100G` , như vậy gần như toàn bộ dữ liệu của bạn được tìm kiếm trên bộ nhớ, hiệu năng cực cao, thường có thể dưới 1 giây.

Ví dụ bạn có một dòng dữ liệu `id,name,age ....` gồm 30 trường. Nhưng khi tìm kiếm, bạn chỉ cần tìm theo ba trường `id,name,age` . Nếu bạn ngây thơ ghi tất cả các trường của dòng dữ liệu vào ES, thì `90%` dữ liệu không dùng để tìm kiếm, vậy mà vẫn chiếm dụng không gian `filesystem cache` trên máy ES; mỗi bản ghi càng lớn thì lượng dữ liệu mà `filesystem cahce` có thể lưu đệm càng ít. Thực ra chỉ cần ghi vào ES **một vài trường** dùng để truy xuất, chẳng hạn chỉ ghi ba trường `id,name,age` vào ES, rồi lưu dữ liệu các trường còn lại trong mysql/hbase. Chúng tôi thường đề xuất dùng kiến trúc `es + hbase` như vậy.

Đặc điểm của hbase là **phù hợp để lưu trữ trực tuyến dữ liệu quy mô lớn**, tức là có thể ghi vào hbase một lượng dữ liệu khổng lồ, nhưng đừng thực hiện tìm kiếm phức tạp, chỉ nên làm một số thao tác truy vấn rất đơn giản theo id hoặc theo khoảng. Tìm kiếm trong ES theo name và age, kết quả nhận được có thể chỉ khoảng 20 `doc id` , sau đó dựa vào `doc id` đến hbase truy vấn **dữ liệu đầy đủ** tương ứng với từng `doc id` , rồi trả về cho frontend.

Dữ liệu ghi vào ES tốt nhất là nhỏ hơn hoặc bằng, hoặc lớn hơn một chút so với dung lượng bộ nhớ filesystem cache của ES. Khi đó truy xuất từ ES có thể mất 20ms, rồi dựa vào id mà ES trả về để truy vấn 20 bản ghi trong hbase, có thể mất khoảng 30ms. Nếu làm theo cách cũ, để 1T dữ liệu trong ES thì mỗi lần truy vấn mất 5~10s, còn bây giờ hiệu năng có thể rất cao, mỗi lần truy vấn chỉ 50ms.

### Làm nóng dữ liệu

Giả sử bạn đã làm theo phương án trên mà lượng dữ liệu ghi vào mỗi máy trong cụm ES vẫn vượt `filesystem cache` gấp đôi, ví dụ mỗi máy ghi 60G dữ liệu mà `filesystem cache` chỉ 30G, thì vẫn còn 30G dữ liệu nằm lại trên đĩa.

Lúc này có thể thực hiện **làm nóng dữ liệu**.

Lấy ví dụ Weibo, với những dữ liệu của các tài khoản lớn mà bình thường có rất nhiều người xem, bạn tự dựng sẵn một hệ thống ở hậu trường, cứ cách một lúc hệ thống hậu trường lại tìm kiếm dữ liệu nóng đó, nạp vào `filesystem cache` . Về sau, khi người dùng thật sự vào xem dữ liệu nóng này, họ tìm kiếm thẳng từ bộ nhớ, rất nhanh.

Hoặc với thương mại điện tử, bạn có thể lấy những sản phẩm thường được xem nhiều nhất, chẳng hạn iphone 8, dữ liệu nóng thì dựng sẵn một chương trình ở hậu trường, cứ mỗi 1 phút tự chủ động truy cập một lần để nạp vào `filesystem cache` .

Với những dữ liệu bạn cho là khá nóng, thường xuyên có người truy cập, tốt nhất nên **xây dựng một hệ thống con chuyên làm nóng bộ nhớ đệm**, tức là cứ cách một khoảng thời gian lại truy cập trước vào dữ liệu nóng để đưa dữ liệu vào `filesystem cache` . Như vậy lần sau có người truy cập, hiệu năng chắc chắn sẽ tốt hơn nhiều.

### Tách dữ liệu nguội và nóng

ES có thể làm giống như phân tách ngang của mysql, tức là ghi lượng lớn dữ liệu ít được truy cập, tần suất thấp vào một chỉ mục riêng, còn dữ liệu nóng được truy cập thường xuyên thì ghi vào một chỉ mục riêng khác. Tốt nhất là **ghi dữ liệu nguội vào một chỉ mục, dữ liệu nóng vào chỉ mục khác**, như vậy có thể đảm bảo sau khi dữ liệu nóng được làm nóng, chúng cố gắng ở lại trong `filesystem os cache` , **đừng để dữ liệu nguội đẩy chúng ra**.

Hãy xem, giả sử bạn có 6 máy, 2 chỉ mục, một chỉ mục chứa dữ liệu nguội, một chỉ mục chứa dữ liệu nóng, mỗi chỉ mục có 3 shard. 3 máy chứa index dữ liệu nóng, 3 máy còn lại chứa index dữ liệu nguội. Như vậy phần lớn thời gian bạn truy cập index dữ liệu nóng, dữ liệu nóng có thể chỉ chiếm 10% tổng lượng dữ liệu, lượng dữ liệu rất ít, gần như toàn bộ được giữ trong `filesystem cache` , nhờ đó đảm bảo hiệu năng truy cập dữ liệu nóng rất cao. Còn dữ liệu nguội nằm ở index khác, không cùng máy với index dữ liệu nóng, hai bên không liên quan gì đến nhau. Nếu có người truy cập dữ liệu nguội, nhiều dữ liệu có thể nằm trên đĩa, hiệu năng kém hơn một chút, nhưng chỉ 10% người dùng truy cập dữ liệu nguội, 90% người dùng truy cập dữ liệu nóng, thì cũng không sao.

### Thiết kế mô hình document

Với MySQL, chúng ta thường có một số truy vấn liên kết phức tạp. Trong ES thì làm thế nào? Trong ES, cố gắng đừng dùng các truy vấn liên kết phức tạp, một khi dùng thì hiệu năng thường không tốt lắm.

Tốt nhất là hoàn tất việc liên kết ngay trong hệ thống Java, rồi ghi trực tiếp dữ liệu đã liên kết vào ES. Khi tìm kiếm, không cần dùng cú pháp tìm kiếm của ES để thực hiện các tìm kiếm liên kết kiểu join nữa.

Thiết kế mô hình document rất quan trọng, với nhiều thao tác, đừng đợi đến lúc tìm kiếm mới nghĩ đến việc thực hiện đủ thứ thao tác phức tạp lộn xộn. ES chỉ hỗ trợ chừng đó thao tác, đừng nghĩ đến việc dùng ES để làm những việc mà nó không giỏi. Nếu thật sự có thao tác như vậy, cố gắng hoàn tất ngay từ lúc thiết kế mô hình document, ở bước ghi dữ liệu. Ngoài ra, với những thao tác quá phức tạp, chẳng hạn tìm kiếm join/nested/parent-child đều nên tránh, hiệu năng đều rất kém.

### Tối ưu hiệu năng phân trang

Phân trang của ES khá tệ, vì sao? Lấy ví dụ, giả sử mỗi trang có 10 bản ghi, và bạn muốn truy vấn trang thứ 100, thực tế sẽ phải lấy 1000 bản ghi đầu tiên lưu trên mỗi shard về một node điều phối. Nếu bạn có 5 shard thì sẽ có 5000 bản ghi, sau đó node điều phối tiến hành gộp, xử lý 5000 bản ghi này rồi mới lấy ra 10 bản ghi cuối cùng của trang thứ 100.

Với hệ thống phân tán, muốn truy vấn 10 bản ghi của trang 100, không thể nào mỗi shard trong 5 shard chỉ truy vấn 2 bản ghi rồi cuối cùng gộp thành 10 bản ghi ở node điều phối được. Bạn **bắt buộc** phải lấy 1000 bản ghi từ mỗi shard về, rồi sắp xếp, lọc... theo yêu cầu của bạn, cuối cùng phân trang lại một lần nữa để lấy dữ liệu của trang 100. Khi bạn lật trang càng sâu thì mỗi shard trả về càng nhiều dữ liệu, thời gian xử lý của node điều phối càng dài, rất tệ hại. Vì vậy khi dùng ES để phân trang, bạn sẽ thấy càng lật về phía sau càng chậm.

Trước đây chúng tôi cũng từng gặp vấn đề này: dùng ES để phân trang, vài trang đầu chỉ mất vài chục mili giây, nhưng khi lật đến trang 10 hoặc vài chục trang thì gần như phải mất 5~10 giây mới truy vấn ra được một trang dữ liệu.

Có giải pháp nào không?

#### Không cho phép phân trang sâu (mặc định phân trang sâu có hiệu năng rất kém)

Hãy nói với product manager rằng hệ thống của bạn không cho phép lật trang sâu như vậy, mặc định lật càng sâu thì hiệu năng càng kém.

#### Tương tự như danh sách sản phẩm đề xuất trong app, kéo xuống để hiện từng trang

Tương tự như Weibo, kéo xuống để làm mới và hiện ra từng trang, bạn có thể dùng `scroll api` , cách dùng thì tự tìm kiếm trên mạng.

scroll sẽ tạo cho bạn **một snapshot của toàn bộ dữ liệu** ngay một lần, sau đó mỗi lần cuộn để lật trang tiếp theo là di chuyển qua **con trỏ** `scroll_id` để lấy trang kế tiếp rồi trang kế tiếp nữa, hiệu năng cao hơn rất nhiều so với kiểu phân trang nói ở trên, gần như đều ở mức mili giây.

Tuy nhiên, điểm duy nhất là cách này phù hợp với kiểu kéo xuống để lật trang như Weibo, **không phù hợp với tình huống nhảy đến trang bất kỳ**. Nghĩa là bạn không thể vào trang 10, rồi sang trang 120, rồi lại quay về trang 58, không thể nhảy trang tùy ý. Vì vậy hiện nay rất nhiều sản phẩm không cho phép bạn lật trang tùy ý, app cũng như một số website, chỉ cho bạn kéo xuống và lật từng trang một.

Khi khởi tạo phải chỉ định tham số `scroll` , để cho ES biết cần lưu ngữ cảnh của lần tìm kiếm này trong bao lâu. Bạn cần đảm bảo người dùng không lật trang liên tục suốt vài giờ, nếu không có thể thất bại do hết thời gian chờ.

Ngoài `scroll api` , bạn cũng có thể dùng `search_after` , ý tưởng của `search_after` là dùng kết quả của trang trước để giúp truy xuất dữ liệu của trang kế tiếp. Rõ ràng cách này cũng không cho phép bạn lật trang tùy ý, bạn chỉ có thể lật từng trang về phía sau. Khi khởi tạo, cần dùng một trường có giá trị duy nhất làm trường sort.
