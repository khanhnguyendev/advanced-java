---
source:
  locale: zh
  slug: mysql-read-write-separation
  hash: 'sha256:v1:e84d7e40d9c85bc2723de9211e2a34e2321e8f2094aa7b1f9b97132b71bf35a1'
status: machine
translatedAt: '2026-10-14'
---
# Làm thế nào để thực hiện tách đọc/ghi?

## Câu hỏi phỏng vấn

Các bạn đã từng làm tách đọc/ghi cho MySQL chưa? Làm thế nào để thực hiện tách đọc/ghi cho MySQL? Nguyên lý sao chép master/replica (master-slave) của MySQL là gì? Làm thế nào để giải quyết vấn đề độ trễ khi đồng bộ master/replica trong MySQL?

## Tâm lý người phỏng vấn

Ở giai đoạn tải đồng thời cao (high concurrency), chắc chắn cần phải làm tách đọc/ghi. Nghĩa là gì? Vì trên thực tế, phần lớn các công ty internet, một số website hay app đều là đọc nhiều ghi ít. Do đó, với tình huống này, người ta dùng một master để ghi, nhưng gắn nhiều replica vào master, rồi đọc từ nhiều replica đó, như vậy chẳng phải có thể chịu được áp lực đọc đồng thời cao hơn sao?

## Phân tích câu trả lời

### Làm thế nào để thực hiện tách đọc/ghi cho MySQL?

Thực ra rất đơn giản, dựa trên kiến trúc sao chép master/replica: nói ngắn gọn là dựng một master, gắn nhiều replica, sau đó chúng ta chỉ ghi vào master, và master sẽ tự động đồng bộ dữ liệu sang các replica.

### Nguyên lý sao chép master/replica của MySQL là gì?

Master ghi các thay đổi vào nhật ký binlog; sau khi replica kết nối đến master, replica có một luồng IO sao chép nhật ký binlog của master về máy cục bộ và ghi vào một nhật ký trung chuyển relay log. Tiếp theo, trong replica có một luồng SQL đọc binlog từ relay log rồi thực thi nội dung trong nhật ký binlog, tức là thực thi lại các câu SQL đó một lần nữa trên máy cục bộ, nhờ vậy đảm bảo dữ liệu của replica giống với master.

![mysql-master-slave](asset:high-concurrency/mysql-read-write-separation/mysql-master-slave.png)

Có một điểm vô cùng quan trọng: quá trình replica đồng bộ dữ liệu từ master là tuần tự, nghĩa là các thao tác chạy song song trên master sẽ được thực thi tuần tự trên replica. Đây chính là một điểm rất quan trọng: do đặc điểm replica sao chép nhật ký từ master và thực thi SQL tuần tự, trong kịch bản tải đồng thời cao, dữ liệu trên replica chắc chắn chậm hơn master một chút, tức là **có độ trễ**. Vì vậy thường xảy ra tình huống dữ liệu vừa ghi vào master có thể chưa đọc được, phải mất vài chục mili giây, thậm chí vài trăm mili giây mới đọc được.

Ngoài ra còn một vấn đề khác: nếu master đột ngột sập, đúng lúc dữ liệu chưa kịp đồng bộ sang replica, thì một số dữ liệu có thể không có trên replica, tức là một số dữ liệu có thể bị mất.

Vì vậy, thực tế MySQL có hai cơ chế cho phần này: một là **sao chép bán đồng bộ**, dùng để giải quyết vấn đề mất dữ liệu của master; hai là **sao chép song song**, dùng để giải quyết vấn đề độ trễ đồng bộ master/replica.

**Sao chép bán đồng bộ** (còn gọi là sao chép `semi-sync`) nghĩa là sau khi master ghi nhật ký binlog, nó sẽ **bắt buộc** đồng bộ dữ liệu sang replica ngay lập tức; replica ghi nhật ký vào relay log cục bộ của mình rồi trả về một ack cho master; master nhận được ack từ **ít nhất một replica** thì mới coi thao tác ghi là hoàn tất.

**Sao chép song song** nghĩa là replica mở nhiều luồng, đọc song song nhật ký của các cơ sở dữ liệu khác nhau trong relay log, rồi **phát lại song song nhật ký của các cơ sở dữ liệu khác nhau**; đây là song song ở mức cơ sở dữ liệu.

### Vấn đề độ trễ đồng bộ master/replica của MySQL (phần tinh túy)

Trước đây trên môi trường production, chúng tôi đã xử lý một lỗi thực sự do độ trễ đồng bộ master/replica gây ra, thuộc loại sự cố production nhỏ.

Kịch bản như sau. Có một bạn viết logic code theo cách: chèn một bản ghi, truy vấn nó ra, rồi cập nhật bản ghi đó. Vào giờ cao điểm trên production, lượng ghi đồng thời đạt 2000/s, lúc này độ trễ sao chép master/replica khoảng vài chục mili giây. Trên production sẽ thấy mỗi ngày luôn có một số dữ liệu mà chúng ta mong muốn cập nhật trạng thái quan trọng nhưng vào giờ cao điểm lại không được cập nhật. Người dùng phản hồi với bộ phận chăm sóc khách hàng, và bộ phận này sẽ phản hồi lại cho chúng tôi.

Chúng tôi dùng lệnh MySQL:

```sql
show slave status
```

để xem `Seconds_Behind_Master`, có thể thấy replica sao chép dữ liệu của master chậm vài ms.

Nói chung, nếu độ trễ master/replica khá nghiêm trọng thì có các giải pháp sau:

-   Phân cơ sở dữ liệu (sharding), tách một master thành nhiều master, mỗi master có lượng ghi đồng thời giảm đi vài lần, khi đó độ trễ master/replica có thể bỏ qua.
-   Bật sao chép song song mà MySQL hỗ trợ, sao chép song song nhiều cơ sở dữ liệu. Nếu lượng ghi đồng thời của một cơ sở dữ liệu vốn đã đặc biệt cao, ví dụ đạt 2000/s trên một cơ sở dữ liệu, thì sao chép song song vẫn vô nghĩa.
-   Viết lại code: người viết code cần cẩn trọng, vì chèn dữ liệu xong truy vấn ngay có thể không tìm thấy.
-   Nếu thực sự có trường hợp bắt buộc phải chèn trước rồi truy vấn thấy ngay, sau đó lập tức làm ngược lại một số thao tác, thì với truy vấn này hãy **đặt kết nối thẳng đến master**. **Không khuyến nghị** cách này, vì nếu làm vậy thì ý nghĩa của tách đọc/ghi sẽ mất.
