---
source:
  locale: zh
  slug: redis-cas
  hash: 'sha256:v1:3b3a3f0784326ae472fb87db96f0807e18436038e798253015f05196d6a0f897'
status: machine
translatedAt: '2026-10-14'
---
# Vấn đề tranh chấp đồng thời của Redis

## Câu hỏi phỏng vấn

Vấn đề tranh chấp đồng thời của Redis là gì? Giải quyết vấn đề này như thế nào? Bạn có biết phương án CAS của giao dịch Redis không?

## Tâm lý người phỏng vấn

Đây cũng là một vấn đề rất thường gặp trên môi trường trực tuyến, đó là **nhiều client cùng ghi đồng thời** một key, dữ liệu lẽ ra đến trước lại đến sau, khiến phiên bản dữ liệu bị sai; hoặc nhiều client cùng lấy một key, sửa giá trị rồi ghi ngược lại, chỉ cần sai thứ tự là dữ liệu sai.

Hơn nữa bản thân Redis đã có sẵn phương án khóa lạc quan kiểu CAS để giải quyết vấn đề này một cách tự nhiên.

## Phân tích câu trả lời

Tại một thời điểm nào đó, nhiều instance hệ thống cùng đi cập nhật một key. Có thể dựa vào zookeeper để hiện thực khóa phân tán. Mỗi hệ thống lấy khóa phân tán qua zookeeper, đảm bảo tại cùng một thời điểm chỉ có một instance hệ thống thao tác một key nào đó, những instance khác không được phép đọc và ghi.

![zookeeper-distributed-lock](asset:high-concurrency/redis-cas/zookeeper-distributed-lock.png)

Dữ liệu bạn cần ghi vào bộ nhớ đệm đều được truy vấn từ mysql ra, đều phải ghi vào mysql, khi ghi vào mysql thì bắt buộc phải lưu một timestamp, khi truy vấn từ mysql ra thì timestamp cũng được truy vấn ra.

Mỗi lần **trước khi ghi, hãy kiểm tra** xem timestamp của value hiện tại này có mới hơn timestamp của value trong bộ nhớ đệm hay không. Nếu đúng thì có thể ghi, nếu không thì không thể dùng dữ liệu cũ để ghi đè dữ liệu mới.
