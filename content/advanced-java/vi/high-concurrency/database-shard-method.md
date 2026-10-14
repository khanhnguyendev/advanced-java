---
source:
  locale: zh
  slug: database-shard-method
  hash: 'sha256:v1:27eafefb7e592f0e06afb623564b3bdffc96a0446eb4a84c4bb85c564eb1c796'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để chuyển đổi sang sharding một cách mượt mà?

## Câu hỏi phỏng vấn

Hiện có một hệ thống chưa sharding, tương lai sẽ sharding, thiết kế như thế nào để hệ thống có thể **chuyển đổi động** từ chưa sharding sang sharding?

## Tâm lý người phỏng vấn

Bạn xem, bây giờ bạn đã hiểu tại sao cần sharding, cũng biết các middleware sharding thường dùng, bạn cũng đã thiết kế xong phương án sharding của các bạn (tách ngang, tách dọc, tách bảng), vậy câu hỏi đặt ra là, tiếp theo bạn sẽ làm thế nào để di chuyển hệ thống một cơ sở dữ liệu một bảng đó sang sharding?

Vì vậy những thứ này đều là một mắt xích nối tiếp mắt xích, tức là xem bạn có từng trải qua toàn bộ quy trình này hay chưa.

## Phân tích câu trả lời

Cái này thực ra từ "low" đến "cao cấp" có mấy phương án, chúng tôi đều đã làm qua, tôi sẽ nói cho bạn hết.

### Phương án di chuyển có ngừng hệ thống

Trước hết tôi nói cho bạn một phương án "low" nhất, rất đơn giản, mọi người bắt đầu bảo trì từ 12 giờ đêm, website hoặc app đăng một thông báo, nói rằng từ 0 giờ đến 6 giờ sáng bảo trì, không thể truy cập.

Tiếp đó đến 0 giờ ngừng hệ thống, hệ thống dừng lại, không còn lưu lượng ghi vào, lúc này cơ sở dữ liệu một cơ sở dữ liệu một bảng cũ đứng yên. Rồi trước đó bạn phải viết sẵn một **công cụ nhập dữ liệu chạy một lần**, lúc này chạy thẳng lên, rồi đọc dữ liệu của cơ sở dữ liệu đơn bảng đơn ra ào ào, ghi vào sharding.

Nhập dữ liệu xong thì ok, sửa cấu hình kết nối cơ sở dữ liệu của hệ thống, có thể cả mã và SQL cũng có sửa đổi, thì bạn dùng mã mới nhất, rồi khởi động trực tiếp kết nối vào sharding mới.

Kiểm tra một chút, ok, hoàn hảo, mọi người vươn vai, ngắm cảnh đêm Bắc Kinh lúc 4 giờ sáng, gọi xe Didi về nhà thôi.

Nhưng phương án này khá "low", ai cũng làm được, chúng ta xem phương án cao cấp hơn một chút.

![database-shard-method-1](diagram:high-concurrency/database-shard-method/database-shard-method-1)

### Phương án di chuyển ghi kép

Đây là một phương án di chuyển chúng tôi hay dùng, đáng tin hơn một chút, không cần ngừng hệ thống, không cần ngắm cảnh Bắc Kinh lúc 4 giờ sáng.

Nói đơn giản là, trong hệ thống trực tuyến, tất cả những chỗ ghi cơ sở dữ liệu trước đây, thao tác thêm, xóa, sửa, **ngoài thêm xóa sửa vào cơ sở dữ liệu cũ, đều thêm thao tác thêm xóa sửa vào cơ sở dữ liệu mới**, đây chính là cái gọi là **ghi kép**, ghi đồng thời hai cơ sở dữ liệu, cơ sở dữ liệu cũ và cơ sở dữ liệu mới.

Sau đó, sau khi **triển khai hệ thống**, dữ liệu cơ sở dữ liệu mới còn chênh lệch quá xa, dùng công cụ nhập dữ liệu nói trước đó, chạy lên đọc dữ liệu cơ sở dữ liệu cũ rồi ghi vào cơ sở dữ liệu mới, khi ghi phải dựa vào trường như gmt_modified để xác định thời điểm sửa đổi cuối cùng của bản ghi này, chỉ khi dữ liệu đọc ra không có trong cơ sở dữ liệu mới, hoặc mới hơn dữ liệu của cơ sở dữ liệu mới thì mới ghi. Nói đơn giản là không cho phép dùng dữ liệu cũ ghi đè dữ liệu mới.

Sau khi nhập xong một vòng, có thể dữ liệu vẫn còn bất nhất, thì chương trình tự động chạy một vòng kiểm tra, so sánh từng bản ghi của từng bảng giữa cơ sở dữ liệu cũ và mới, tiếp đó nếu có chỗ khác nhau, thì với những chỗ khác nhau đó, đọc dữ liệu từ cơ sở dữ liệu cũ ghi lại lần nữa. Lặp đi lặp lại, cho đến khi dữ liệu của từng bảng ở hai cơ sở dữ liệu hoàn toàn nhất quán.

Tiếp đó khi dữ liệu đã hoàn toàn nhất quán thì ok, dựa vào mã mới nhất chỉ dùng sharding, triển khai lại một lần, chẳng phải là chỉ thao tác trên sharding rồi sao, mà còn không có thời gian ngừng hệ thống mấy tiếng, rất ổn. Vì vậy hiện nay về cơ bản làm di chuyển dữ liệu đều làm như vậy.

![database-shard-method-2](diagram:high-concurrency/database-shard-method/database-shard-method-2)
