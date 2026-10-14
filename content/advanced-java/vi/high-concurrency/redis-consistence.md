---
source:
  locale: zh
  slug: redis-consistence
  hash: 'sha256:v1:3e0444d42ca49dde36366b3aa94b2f25f06884672a2fa372d370ab80accbe98b'
status: machine
translatedAt: '2026-10-14'
---
# Vấn đề tính nhất quán giữa bộ nhớ đệm và cơ sở dữ liệu

## Câu hỏi phỏng vấn

Làm thế nào để đảm bảo tính nhất quán khi ghi kép giữa bộ nhớ đệm và cơ sở dữ liệu?

## Tâm lý người phỏng vấn

Chỉ cần bạn dùng bộ nhớ đệm là có thể phải lưu kép và ghi kép giữa bộ nhớ đệm và cơ sở dữ liệu; hễ ghi kép là chắc chắn có vấn đề nhất quán dữ liệu, vậy bạn giải quyết vấn đề nhất quán như thế nào?

## Phân tích câu trả lời

Nói chung, nếu cho phép bộ nhớ đệm thỉnh thoảng hơi lệch so với cơ sở dữ liệu, tức là nếu hệ thống của bạn **không yêu cầu nghiêm ngặt** "bộ nhớ đệm + cơ sở dữ liệu" phải nhất quán, thì tốt nhất đừng làm phương án này, tức là: **tuần tự hóa yêu cầu đọc và yêu cầu ghi**, xếp chúng vào một **hàng đợi trong bộ nhớ**.

Tuần tự hóa có thể đảm bảo chắc chắn không xảy ra bất nhất, nhưng cũng sẽ khiến thông lượng của hệ thống giảm mạnh, phải dùng số máy nhiều gấp mấy lần bình thường để chống đỡ một yêu cầu trực tuyến.

### Cache Aside Pattern

Mô hình đọc ghi bộ nhớ đệm + cơ sở dữ liệu kinh điển nhất là Cache Aside Pattern.

-   Khi đọc, đọc bộ nhớ đệm trước, nếu bộ nhớ đệm không có thì đọc cơ sở dữ liệu, sau đó lấy dữ liệu ra đưa vào bộ nhớ đệm, đồng thời trả về phản hồi.
-   Khi cập nhật, **cập nhật cơ sở dữ liệu trước, rồi mới xóa bộ nhớ đệm**.

**Tại sao là xóa bộ nhớ đệm chứ không phải cập nhật bộ nhớ đệm?**

Lý do rất đơn giản, nhiều khi, trong các kịch bản cache phức tạp hơn một chút, bộ nhớ đệm không đơn thuần là giá trị lấy thẳng từ cơ sở dữ liệu.

Ví dụ có thể đã cập nhật một trường của một bảng, còn cache tương ứng thì cần truy vấn dữ liệu của hai bảng khác và thực hiện phép tính, mới tính ra được giá trị mới nhất của cache.

Ngoài ra, chi phí cập nhật bộ nhớ đệm đôi khi rất cao. Có phải cứ mỗi lần sửa cơ sở dữ liệu là nhất định phải cập nhật lại cache tương ứng không? Có thể có kịch bản như vậy, nhưng với **kịch bản tính toán dữ liệu cache khá phức tạp** thì không phải vậy. Nếu bạn thường xuyên sửa nhiều bảng mà một cache liên quan đến, cache cũng bị cập nhật thường xuyên. Nhưng vấn đề là, **cache này rốt cuộc có bị truy cập thường xuyên không?**

Ví dụ, một trường của bảng mà một cache liên quan đến bị sửa 20 lần, hoặc 100 lần trong 1 phút, thì cache cập nhật 20 lần, 100 lần; nhưng cache này trong 1 phút chỉ bị đọc 1 lần, có **rất nhiều dữ liệu nguội**. Trên thực tế, nếu bạn chỉ xóa bộ nhớ đệm thì trong 1 phút, cache này cũng chỉ bị tính lại một lần, chi phí giảm mạnh. **Dùng đến cache thì mới đi tính cache.**

Thực ra xóa bộ nhớ đệm thay vì cập nhật bộ nhớ đệm chính là tư tưởng tính toán lazy, đừng lần nào cũng tính lại phép tính phức tạp, bất kể nó có được dùng đến hay không, mà để nó đến lúc cần dùng mới tính lại. Như mybatis, hibernate đều có tư tưởng lazy loading (tải lười). Truy vấn một phòng ban, phòng ban đó kèm một danh sách nhân viên, không cần thiết mỗi lần truy vấn phòng ban lại truy vấn luôn dữ liệu của 1000 nhân viên bên trong. 80% trường hợp, truy vấn phòng ban này chỉ cần truy cập thông tin của phòng ban là đủ. Truy vấn phòng ban trước, đồng thời cần truy cập nhân viên bên trong, thì lúc đó, chỉ khi bạn cần truy cập nhân viên bên trong mới đi cơ sở dữ liệu truy vấn 1000 nhân viên.

### Vấn đề bất nhất cache sơ cấp nhất và giải pháp

Vấn đề: cập nhật cơ sở dữ liệu trước, rồi xóa bộ nhớ đệm. Nếu xóa bộ nhớ đệm thất bại thì cơ sở dữ liệu là dữ liệu mới, bộ nhớ đệm là dữ liệu cũ, dữ liệu sẽ bị bất nhất.

![redis-junior-inconsistent](diagram:high-concurrency/redis-consistence/redis-junior-inconsistent)

Hướng giải quyết 1: xóa bộ nhớ đệm trước, rồi cập nhật cơ sở dữ liệu. Nếu cập nhật cơ sở dữ liệu thất bại thì cơ sở dữ liệu là dữ liệu cũ, bộ nhớ đệm rỗng, vậy dữ liệu sẽ không bất nhất. Vì khi đọc bộ nhớ đệm không có, nên đi đọc dữ liệu cũ trong cơ sở dữ liệu, rồi cập nhật vào bộ nhớ đệm.

Hướng giải quyết 2: xóa kép trễ (delayed double delete). Vẫn là cập nhật cơ sở dữ liệu trước rồi xóa bộ nhớ đệm, điểm khác duy nhất là chúng ta thực hiện thêm một lần thao tác xóa này sau một lúc nữa, ví dụ sau 5s.

```java
public void set(key, value) {
    putToDb(key, value);
    deleteFromRedis(key);

    // ... a few seconds later
    deleteFromRedis(key);
}
```

Thao tác xóa có thể có nhiều lựa chọn, ví dụ: 1. dùng `DelayQueue`, có rủi ro mất cập nhật khi tiến trình JVM chết; 2. đặt vào `MQ`, nhưng độ phức tạp của mã sẽ tăng. Tóm lại, chúng ta cần thiết kế dựa trên tổng hợp nhiều yếu tố, chọn một giải pháp hợp lý nhất.

### Phân tích vấn đề bất nhất dữ liệu khá phức tạp

Dữ liệu có thay đổi, đã xóa bộ nhớ đệm trước, rồi mới đi sửa cơ sở dữ liệu, lúc này còn chưa sửa. Một yêu cầu đến, đi đọc bộ nhớ đệm, thấy bộ nhớ đệm rỗng, đi truy vấn cơ sở dữ liệu, **truy vấn được dữ liệu cũ trước khi sửa**, đưa vào bộ nhớ đệm. Sau đó chương trình thay đổi dữ liệu hoàn tất việc sửa cơ sở dữ liệu. Thế là xong, dữ liệu trong cơ sở dữ liệu và bộ nhớ đệm khác nhau rồi...

**Tại sao trong kịch bản tải đồng thời cao với lưu lượng hàng trăm triệu, cache lại gặp vấn đề này?**

Chỉ khi một dữ liệu bị đọc ghi đồng thời thì mới có thể xuất hiện vấn đề này. Thực ra nếu mức đồng thời của bạn rất thấp, đặc biệt là đồng thời đọc rất thấp, mỗi ngày chỉ có 10 nghìn lượt truy cập, thì rất ít khi xảy ra kịch bản bất nhất như vừa mô tả. Nhưng vấn đề là, nếu mỗi ngày lưu lượng lên đến hàng trăm triệu, đồng thời đọc mỗi giây là hàng chục nghìn, thì mỗi giây chỉ cần có yêu cầu cập nhật dữ liệu là **có thể xuất hiện tình huống bất nhất cơ sở dữ liệu + bộ nhớ đệm nói trên**.

**Giải pháp như sau:**

Khi cập nhật dữ liệu, dựa vào **định danh duy nhất của dữ liệu**, định tuyến thao tác rồi gửi vào một hàng đợi bên trong jvm. Khi đọc dữ liệu, nếu phát hiện dữ liệu không có trong bộ nhớ đệm thì sẽ thực hiện lại thao tác "đọc dữ liệu + cập nhật bộ nhớ đệm", cũng dựa vào định danh duy nhất để định tuyến rồi gửi vào cùng một hàng đợi bên trong jvm.

Một hàng đợi ứng với một luồng làm việc, mỗi luồng làm việc lấy các thao tác tương ứng một cách **tuần tự**, rồi thực hiện từng cái một. Như vậy, một thao tác thay đổi dữ liệu, xóa bộ nhớ đệm trước, rồi mới đi cập nhật cơ sở dữ liệu, nhưng chưa cập nhật xong. Lúc này nếu có một yêu cầu đọc đến, không đọc được bộ nhớ đệm, thì có thể gửi yêu cầu cập nhật bộ nhớ đệm vào hàng đợi, lúc này nó sẽ tồn đọng trong hàng đợi, rồi chờ đồng bộ cho đến khi cập nhật bộ nhớ đệm xong.

Ở đây có một **điểm tối ưu**: trong một hàng đợi, thực ra **nhiều yêu cầu cập nhật bộ nhớ đệm nối đuôi nhau là vô nghĩa**, nên có thể lọc, nếu phát hiện trong hàng đợi đã có một yêu cầu cập nhật bộ nhớ đệm thì không cần đưa thêm một thao tác yêu cầu cập nhật vào nữa, chỉ cần chờ trực tiếp thao tác yêu cầu cập nhật phía trước hoàn tất.

Đợi luồng làm việc ứng với hàng đợi đó hoàn tất việc sửa cơ sở dữ liệu của thao tác trước, mới đi thực hiện thao tác tiếp theo, tức là thao tác cập nhật bộ nhớ đệm, lúc này sẽ đọc giá trị mới nhất từ cơ sở dữ liệu rồi ghi vào bộ nhớ đệm.

Nếu yêu cầu vẫn còn trong khoảng thời gian chờ, thăm dò liên tục thấy lấy được giá trị thì trả về ngay; nếu thời gian chờ của yêu cầu vượt quá một khoảng nhất định thì lần này đọc thẳng giá trị cũ hiện tại từ cơ sở dữ liệu.

Trong kịch bản tải đồng thời cao, những vấn đề cần chú ý của giải pháp này:

-   Yêu cầu đọc bị chặn lâu

Do yêu cầu đọc đã được bất đồng bộ hóa ở mức rất nhẹ, nên nhất định phải chú ý vấn đề hết thời gian chờ (timeout) khi đọc, mỗi yêu cầu đọc phải trả về trong khoảng thời gian timeout.

Rủi ro lớn nhất của giải pháp này là **có thể dữ liệu cập nhật rất thường xuyên**, khiến hàng đợi tồn đọng một lượng lớn thao tác cập nhật, rồi **yêu cầu đọc sẽ bị timeout hàng loạt**, cuối cùng khiến một lượng lớn yêu cầu đi thẳng vào cơ sở dữ liệu. Nhất định phải qua một số bài kiểm thử mô phỏng thực tế, xem tần suất cập nhật dữ liệu ra sao.

Một điểm nữa, vì trong một hàng đợi có thể tồn đọng các thao tác cập nhật nhắm vào nhiều mục dữ liệu, nên cần kiểm thử theo tình hình nghiệp vụ của bạn, có thể cần **triển khai nhiều dịch vụ**, mỗi dịch vụ chia sẻ một phần thao tác cập nhật dữ liệu. Nếu một hàng đợi trong bộ nhớ lại tồn đọng thao tác sửa tồn kho của 100 sản phẩm, mỗi thao tác sửa tồn kho mất 10ms để hoàn thành, thì yêu cầu đọc của sản phẩm cuối cùng có thể phải chờ 10 \* 100 = 1000ms = 1s mới có dữ liệu, lúc này dẫn đến **yêu cầu đọc bị chặn lâu**.

Nhất định phải dựa vào tình hình vận hành thực tế của hệ thống nghiệp vụ để thực hiện một số bài kiểm thử áp lực và mô phỏng môi trường trực tuyến, xem lúc bận rộn nhất, hàng đợi trong bộ nhớ có thể tồn đọng bao nhiêu thao tác cập nhật, có thể khiến yêu cầu đọc ứng với thao tác cập nhật cuối cùng bị hang bao lâu, nếu yêu cầu đọc trả về trong 200ms, và nếu bạn tính toán xong thấy dù lúc bận rộn nhất, tồn đọng 10 thao tác cập nhật, chờ tối đa 200ms, thì vẫn chấp nhận được.

**Nếu một hàng đợi trong bộ nhớ có thể tồn đọng đặc biệt nhiều thao tác cập nhật**, thì bạn phải **thêm máy**, để mỗi instance dịch vụ triển khai trên mỗi máy xử lý ít dữ liệu hơn, thì thao tác cập nhật tồn đọng trong mỗi hàng đợi bộ nhớ sẽ ít hơn.

Thực ra theo kinh nghiệm dự án trước đây, nói chung tần suất ghi dữ liệu rất thấp, nên trên thực tế bình thường, thao tác cập nhật tồn đọng trong hàng đợi phải rất ít. Với những dự án kiểu tải đồng thời đọc cao, kiến trúc đọc cache như vậy, nói chung yêu cầu ghi rất ít, QPS mỗi giây đạt vài trăm là tốt rồi.

Chúng ta thử **tính toán sơ bộ thực tế**.

Nếu một giây có 500 thao tác ghi, chia thành 5 lát thời gian, mỗi 200ms có 100 thao tác ghi, đặt vào 20 hàng đợi trong bộ nhớ, mỗi hàng đợi bộ nhớ có thể tồn đọng 5 thao tác ghi. Mỗi thao tác ghi sau kiểm thử hiệu năng nói chung hoàn thành trong khoảng 20ms, thì yêu cầu đọc dữ liệu nhắm vào mỗi hàng đợi bộ nhớ cũng chỉ hang một lúc, chắc chắn trả về được trong vòng 200ms.

Qua phép tính đơn giản vừa rồi, chúng ta biết, trên một máy chống đỡ được QPS ghi ở mức vài trăm là không vấn đề, nếu QPS ghi tăng gấp 10 lần thì mở rộng máy, mở rộng gấp 10 lần số máy, mỗi máy 20 hàng đợi.

-   Mức đồng thời yêu cầu đọc quá cao

Ở đây cũng phải làm tốt kiểm thử áp lực, đảm bảo khi vừa đúng gặp tình huống trên, còn có một rủi ro nữa, là đột nhiên một lượng lớn yêu cầu đọc sẽ bị hang trên dịch vụ với độ trễ vài chục mili giây, xem dịch vụ có chịu nổi không, cần bao nhiêu máy mới chịu được đỉnh của tình huống cực hạn lớn nhất.

Nhưng vì không phải mọi dữ liệu đều được cập nhật cùng lúc, bộ nhớ đệm cũng không hết hiệu lực cùng lúc, nên mỗi lần có thể chỉ là cache của một số ít dữ liệu hết hiệu lực, rồi yêu cầu đọc ứng với những dữ liệu đó đến, mức đồng thời chắc cũng không đặc biệt lớn.

-   Định tuyến yêu cầu khi triển khai nhiều instance dịch vụ

Có thể dịch vụ này được triển khai nhiều instance, thì nhất định phải **đảm bảo** rằng các yêu cầu thực hiện thao tác cập nhật dữ liệu và thao tác cập nhật bộ nhớ đệm đều được **định tuyến đến cùng một instance dịch vụ** thông qua máy chủ Nginx.

Ví dụ, các yêu cầu đọc ghi đối với cùng một sản phẩm đều được định tuyến đến cùng một máy. Có thể tự làm định tuyến hash giữa các dịch vụ theo một tham số yêu cầu nào đó, cũng có thể dùng chức năng định tuyến hash của Nginx, v.v.

-   Vấn đề định tuyến của sản phẩm nóng, dẫn đến yêu cầu bị lệch

Nếu yêu cầu đọc ghi của một sản phẩm nào đó đặc biệt cao, đều đánh vào cùng một hàng đợi của cùng một máy, có thể gây áp lực quá lớn lên một máy nào đó. Tức là, vì chỉ khi dữ liệu sản phẩm được cập nhật mới xóa bộ nhớ đệm, rồi mới dẫn đến đọc ghi đồng thời, nên thực ra phải xem xét theo hệ thống nghiệp vụ, nếu tần suất cập nhật không quá cao thì ảnh hưởng của vấn đề này không đặc biệt lớn, nhưng quả thực có thể tải của một số máy sẽ cao hơn.

---

Về thảo luận chi tiết cho câu hỏi phỏng vấn này, xem [#54](https://github.com/doocs/advanced-java/issues/54).
