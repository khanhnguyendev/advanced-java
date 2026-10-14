---
source:
  locale: zh
  slug: redis-persistence
  hash: 'sha256:v1:431506fd7df137a1df008912e6fa3ea8bf00d08bccb430c5d5e2a5179d16798f'
status: machine
translatedAt: '2026-10-14'
---
# Cơ chế lưu trữ bền vững của Redis

## Câu hỏi phỏng vấn

Redis có những cách lưu trữ bền vững (persistence) nào? Ưu nhược điểm của các cơ chế lưu trữ bền vững khác nhau là gì? Tầng dưới của cơ chế lưu trữ bền vững được cài đặt cụ thể như thế nào?

## Tâm lý người phỏng vấn

Nếu Redis chỉ lưu đệm dữ liệu trong bộ nhớ, khi Redis sập rồi khởi động lại thì dữ liệu trong bộ nhớ sẽ mất hết. Bạn buộc phải dùng cơ chế lưu trữ bền vững của Redis, vừa ghi dữ liệu vào bộ nhớ, vừa ghi dữ liệu một cách bất đồng bộ, từ từ vào tệp trên đĩa để lưu trữ bền vững.

Nếu Redis sập rồi khởi động lại, chỉ cần tự động nạp từ đĩa một số dữ liệu đã được lưu trữ bền vững trước đó là được, có thể mất một ít dữ liệu, nhưng ít nhất sẽ không mất hết toàn bộ dữ liệu.

Thực ra cũng như vậy, đều nhằm vào một số vấn đề có thể gặp trên môi trường production của Redis: nếu Redis sập rồi khởi động lại, dữ liệu trong bộ nhớ chẳng phải mất sạch sao? Có thể khôi phục dữ liệu khi khởi động lại không?

## Phân tích câu trả lời

Lưu trữ bền vững chủ yếu để khôi phục thảm họa, khôi phục dữ liệu, cũng có thể xếp vào một khâu của tính sẵn sàng cao. Ví dụ toàn bộ Redis của bạn sập, rồi Redis không khả dụng, việc bạn cần làm là làm cho Redis khả dụng trở lại, càng nhanh càng tốt.

Khởi động lại Redis, cố gắng nhanh chóng để nó cung cấp dịch vụ ra bên ngoài. Nếu chưa sao lưu dữ liệu thì lúc này Redis khởi động lên cũng không khả dụng, vì dữ liệu mất hết rồi.

Rất có thể là lượng lớn request đến, bộ nhớ đệm (cache) hoàn toàn không trúng, hoàn toàn không tìm thấy dữ liệu trong Redis, lúc này chết chắc, xảy ra vấn đề **cache avalanche (tuyết lở bộ nhớ đệm)**. Tất cả request không trúng trong Redis sẽ đi tìm ở nguồn dữ liệu như cơ sở dữ liệu mysql, bỗng chốc mysql phải gánh tải đồng thời cao (high concurrency), rồi sập...

Nếu bạn làm tốt lưu trữ bền vững của Redis, làm phương án sao lưu và khôi phục đạt mức doanh nghiệp, thì ngay cả khi Redis của bạn gặp sự cố, cũng có thể khôi phục nhanh thông qua dữ liệu sao lưu, một khi khôi phục xong là cung cấp dịch vụ ra bên ngoài ngay.

### Hai cách lưu trữ bền vững của Redis

-   RDB: cơ chế lưu trữ bền vững RDB là thực hiện lưu trữ bền vững **định kỳ** đối với dữ liệu trong Redis.
-   AOF: cơ chế AOF coi mỗi lệnh ghi như một dòng log, ghi vào một tệp log theo chế độ `append-only` , khi Redis khởi động lại, có thể xây dựng lại toàn bộ tập dữ liệu bằng cách **phát lại** các lệnh ghi trong log AOF.

Thông qua RDB hoặc AOF đều có thể lưu trữ bền vững dữ liệu trong bộ nhớ Redis xuống đĩa, sau đó có thể sao lưu những dữ liệu này đến nơi khác, ví dụ các dịch vụ đám mây như Alibaba Cloud.

Nếu Redis sập, dữ liệu trong bộ nhớ và trên đĩa của máy chủ đều mất, có thể sao chép lại dữ liệu trước đó từ dịch vụ đám mây về, đặt vào thư mục chỉ định, rồi khởi động lại Redis, Redis sẽ tự động dựa vào dữ liệu trong tệp dữ liệu lưu trữ bền vững để khôi phục dữ liệu trong bộ nhớ, tiếp tục cung cấp dịch vụ ra bên ngoài.

Nếu dùng đồng thời cả hai cơ chế lưu trữ bền vững RDB và AOF, thì khi Redis khởi động lại sẽ dùng **AOF** để xây dựng lại dữ liệu, vì **dữ liệu trong AOF đầy đủ hơn**.

#### Ưu nhược điểm của RDB

-   RDB tạo ra nhiều tệp dữ liệu, mỗi tệp dữ liệu đại diện cho dữ liệu của Redis tại một thời điểm nào đó. Cách nhiều tệp dữ liệu này **rất phù hợp để sao lưu lạnh**, có thể gửi các tệp dữ liệu đầy đủ này đến một số nơi lưu trữ an toàn từ xa, ví dụ dịch vụ đám mây S3 của Amazon, ở Trung Quốc có thể là lưu trữ phân tán ODPS của Alibaba Cloud, để sao lưu định kỳ dữ liệu trong Redis theo chiến lược sao lưu đã định.
-   RDB ảnh hưởng rất nhỏ đến dịch vụ đọc ghi mà Redis cung cấp ra bên ngoài, có thể giúp Redis **giữ hiệu năng cao**, vì tiến trình chính của Redis chỉ cần fork một tiến trình con, để tiến trình con thực hiện thao tác IO đĩa nhằm lưu trữ bền vững RDB.
-   So với cơ chế lưu trữ bền vững AOF, khởi động lại và khôi phục tiến trình Redis trực tiếp dựa trên tệp dữ liệu RDB nhanh hơn.
-   Nếu muốn mất ít dữ liệu nhất có thể khi Redis gặp sự cố thì RDB không tốt bằng AOF. Nhìn chung, tệp snapshot dữ liệu RDB đều được tạo cứ mỗi 5 phút, hoặc thời gian dài hơn một lần, lúc này phải chấp nhận rằng một khi tiến trình Redis sập thì sẽ mất dữ liệu của 5 phút gần nhất (thậm chí thời gian dài hơn).
-   Mỗi lần RDB fork tiến trình con để tạo tệp dữ liệu snapshot RDB, nếu tệp dữ liệu đặc biệt lớn thì có thể khiến dịch vụ cung cấp cho client bị tạm dừng vài mili giây, hoặc thậm chí vài giây.

#### Ưu nhược điểm của AOF

-   AOF bảo vệ dữ liệu không bị mất tốt hơn, thường AOF cứ mỗi 1 giây sẽ thực hiện một thao tác `fsync` qua một luồng nền, tối đa mất dữ liệu của 1 giây.
-   Tệp log AOF được ghi theo chế độ `append-only` , nên không có chi phí tìm kiếm trên đĩa, hiệu năng ghi rất cao, tệp cũng không dễ bị hỏng, kể cả khi phần đuôi tệp bị hỏng cũng rất dễ sửa chữa.
-   Ngay cả khi tệp log AOF quá lớn, xuất hiện thao tác ghi lại ở nền thì cũng không ảnh hưởng đến đọc ghi của client. Vì khi `rewrite` log, các lệnh trong đó sẽ được nén lại, tạo ra một bản log nhỏ nhất cần để khôi phục dữ liệu. Khi tạo tệp log mới, tệp log cũ vẫn được ghi như bình thường. Khi tệp log mới sau merge đã ready, thì hoán đổi tệp log mới và cũ là xong.
-   Các lệnh trong tệp log AOF được ghi lại theo cách khá dễ đọc, đặc tính này **rất phù hợp để khôi phục khẩn cấp khi lỡ xóa nhầm mang tính thảm họa**. Ví dụ ai đó lỡ dùng lệnh `flushall` xóa sạch toàn bộ dữ liệu, chỉ cần lúc này `rewrite` nền chưa xảy ra, thì có thể sao chép ngay tệp AOF, xóa lệnh `flushall` cuối cùng, rồi đặt lại tệp `AOF` đó, là có thể tự động khôi phục toàn bộ dữ liệu thông qua cơ chế khôi phục.
-   Với cùng một bộ dữ liệu, tệp log AOF thường lớn hơn tệp snapshot dữ liệu RDB.
-   Sau khi bật AOF, QPS ghi được hỗ trợ sẽ thấp hơn QPS ghi mà RDB hỗ trợ, vì AOF thường được cấu hình `fsync` tệp log mỗi giây một lần, tất nhiên, mỗi giây một lần `fsync` thì hiệu năng vẫn rất cao. (Nếu ghi theo thời gian thực thì QPS sẽ giảm mạnh, hiệu năng Redis sẽ giảm rất nhiều)
-   Trước đây AOF từng có bug: khi khôi phục dữ liệu bằng log do AOF ghi lại, không khôi phục ra dữ liệu giống y hệt. Vì vậy, cách dựa trên `merge` phát lại log lệnh khá phức tạp như AOF dễ mong manh hơn, dễ có bug hơn so với cách RDB mỗi lần lưu trữ bền vững một tệp snapshot dữ liệu đầy đủ. Tuy nhiên AOF chính là để tránh bug trong quá trình rewrite, nên mỗi lần rewrite không dựa vào log lệnh cũ để merge, mà **dựa trên dữ liệu trong bộ nhớ lúc đó để xây dựng lại các lệnh**, như vậy tính vững chắc sẽ tốt hơn nhiều.

### Rốt cuộc nên chọn RDB hay AOF

-   Đừng chỉ dùng RDB, vì như vậy bạn sẽ mất rất nhiều dữ liệu;
-   Cũng đừng chỉ dùng AOF, vì như vậy có hai vấn đề: thứ nhất, bạn dùng AOF để sao lưu lạnh thì tốc độ khôi phục không nhanh bằng dùng RDB để sao lưu lạnh; thứ hai, RDB mỗi lần tạo snapshot dữ liệu một cách đơn giản thô bạo, vững chắc hơn, có thể tránh bug của cơ chế sao lưu và khôi phục phức tạp như AOF;
-   Redis hỗ trợ bật đồng thời hai cách lưu trữ bền vững, chúng ta có thể dùng kết hợp cả hai cơ chế AOF và RDB: dùng AOF để đảm bảo dữ liệu không mất, làm lựa chọn đầu tiên để khôi phục dữ liệu; dùng RDB để sao lưu lạnh ở các mức độ khác nhau, khi tệp AOF đều bị mất hoặc hỏng không khả dụng, vẫn có thể dùng RDB để khôi phục dữ liệu nhanh.
