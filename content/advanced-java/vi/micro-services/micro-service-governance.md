---
source:
  locale: zh
  slug: micro-service-governance
  hash: 'sha256:v1:19aa4ba3251ba7c6f0002dc23f23f5e946bf5917f9c5975a30c25359446a874e'
status: machine
translatedAt: '2026-10-14'
---
# Chiến lược quản trị microservices

## Đăng ký và khám phá dịch vụ

Vấn đề cần giải quyết: quản lý tập trung các dịch vụ

Giải pháp:

-   Eureka
-   Zookeeper

## Cân bằng tải

Vấn đề cần giải quyết: giảm áp lực lên phần cứng của server

Giải pháp:

-   Nginx
-   Ribbon

## Giao tiếp

Vấn đề cần giải quyết: cầu nối liên lạc giữa các dịch vụ

Giải pháp:

-   REST (đồng bộ)
-   RPC (đồng bộ)
-   MQ (bất đồng bộ)

## Quản lý cấu hình

Vấn đề cần giải quyết: số dịch vụ tăng lên thì cấu hình cũng tăng theo, làm sao quản lý cấu hình của từng dịch vụ.

Giải pháp:

-   Nacos
-   Spring Cloud Config
-   Apollo

## Chịu lỗi và suy giảm dịch vụ

Vấn đề cần giải quyết: trong microservices, một yêu cầu thường phải gọi tới vài dịch vụ; nếu một dịch vụ nào đó không khả dụng mà không có cơ chế chịu lỗi cho dịch vụ, rất dễ gây ra một chuỗi dịch vụ không khả dụng, đó chính là hiệu ứng tuyết lở (avalanche effect).

Giải pháp:

-   Hystrix

## Quan hệ phụ thuộc giữa các dịch vụ

Vấn đề cần giải quyết: nhiều dịch vụ phụ thuộc qua lại lẫn nhau, thứ tự khởi động không rõ ràng.

Giải pháp: phân tầng ứng dụng.

## Tài liệu dịch vụ

Vấn đề cần giải quyết: giảm chi phí giao tiếp

Giải pháp:

-   Swagger
-   Java doc

## Vấn đề bảo mật dịch vụ

Vấn đề cần giải quyết: tính an toàn của dữ liệu nhạy cảm

Giải pháp:

-   Oauth
-   Shiro
-   Spring Security

## Kiểm soát lưu lượng

Vấn đề cần giải quyết: tránh việc lưu lượng quá lớn trên một dịch vụ làm sập cả hệ thống dịch vụ

Giải pháp:

-   Hystrix

## Kiểm thử tự động

Vấn đề cần giải quyết: dự đoán trước các bất thường, xác định dịch vụ có khả dụng hay không

Giải pháp:

-   junit

## Quy trình đưa dịch vụ lên và gỡ dịch vụ xuống

Vấn đề cần giải quyết: tránh việc dịch vụ bị đưa lên, gỡ xuống tùy tiện

Giải pháp: dịch vụ mới đưa lên cần được người quản lý duyệt; khi gỡ dịch vụ xuống cần thông báo cho các bên gọi để họ sửa đổi, chỉ khi không còn ai gọi dịch vụ đó thì mới được gỡ xuống.

## Tính tương thích

Vấn đề cần giải quyết: việc phát triển dịch vụ diễn ra liên tục thì làm sao đảm bảo tính tương thích.

Giải pháp: quản lý bằng số phiên bản, sửa đổi xong thì tiến hành kiểm thử hồi quy.

## Điều phối dịch vụ

Vấn đề cần giải quyết: một cách để giải quyết vấn đề phụ thuộc giữa các dịch vụ

Giải pháp:

-   Docker
-   K8s

## Điều độ tài nguyên

Vấn đề cần giải quyết: mỗi dịch vụ chiếm dụng lượng tài nguyên khác nhau, phân bổ như thế nào

Giải pháp:

-   Cô lập JVM
-   Cô lập Classload
-   Cô lập phần cứng

## Hoạch định dung lượng

Vấn đề cần giải quyết: theo thời gian, lượng lời gọi tăng dần, khi nào thì thêm máy.

Giải pháp: thống kê lượng gọi mỗi ngày và thời gian phản hồi, đặt ngưỡng dựa trên tình hình máy, vượt ngưỡng thì có thể thêm máy.
