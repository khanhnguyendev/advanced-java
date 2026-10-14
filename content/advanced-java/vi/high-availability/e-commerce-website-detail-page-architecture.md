---
source:
  locale: zh
  slug: e-commerce-website-detail-page-architecture
  hash: 'sha256:v1:cfdfe29dfe206dfd2ee1134e7ebaaa2944a73b747deb62dfc98f70aa1b89cb23'
status: machine
translatedAt: '2026-10-14'
---
# Kiến trúc hệ thống trang chi tiết sản phẩm của website thương mại điện tử

## Kiến trúc hệ thống trang chi tiết sản phẩm của website thương mại điện tử nhỏ

Website thương mại điện tử nhỏ hiển thị trang theo tư tưởng tĩnh hóa toàn bộ trang. Cơ sở dữ liệu lưu toàn bộ thông tin sản phẩm, hệ thống tĩnh hóa trang sẽ điền dữ liệu vào các mẫu tĩnh để tạo ra các trang đã tĩnh hóa, rồi đẩy lên máy chủ Nginx. Khi người dùng duyệt trang, hệ thống lấy một trang html đã được tĩnh hóa sẵn và trả về trực tiếp, không liên quan đến bất kỳ xử lý logic nghiệp vụ nào.

![e-commerce-website-detail-page-architecture-1](asset:high-availability/e-commerce-website-detail-page-architecture/e-commerce-website-detail-page-architecture-1.png)

Dưới đây là một Demo đơn giản về mẫu trang.

```html
<html>
    <body>
        商品名称：#{productName}<br />
        商品价格：#{productPrice}<br />
        商品描述：#{productDesc}
    </body>
</html>
```

**Ưu điểm** của cách làm này là mỗi lần người dùng duyệt một trang, không cần thực hiện bất kỳ logic tương tác nào với cơ sở dữ liệu, cũng không cần thực thi bất kỳ đoạn code nào, chỉ cần trả về trực tiếp một trang html, nên tốc độ và hiệu năng rất cao.

Với website nhỏ, số trang ít, cách này rất thực dụng và cực kỳ đơn giản. Trong Java có thể dùng velocity, freemarker, thymeleaf, v.v., sau đó xây dựng một hệ thống quản lý nội dung trang cms; khi mẫu thay đổi, nhấn nút hoặc để hệ thống tự động render lại toàn bộ.

**Nhược điểm** là chỉ phù hợp với một số website nhỏ, chẳng hạn quy mô trang từ vài chục đến vài chục nghìn. Với các website thương mại điện tử lớn, số lượng trang lên đến hàng trăm triệu, mỗi lần sửa mẫu trang đều phải tĩnh hóa lại toàn bộ chừng ấy trang thì có đáng tin cậy không? Mỗi lần render mất cả mấy ngày, thì cả website coi như bỏ đi.

## Kiến trúc hệ thống trang chi tiết sản phẩm của website thương mại điện tử lớn

Trong thiết kế hệ thống trang chi tiết sản phẩm của website thương mại điện tử lớn, khi dữ liệu sản phẩm thay đổi, thông điệp thay đổi sẽ được đẩy vào hàng đợi thông điệp MQ (message queue). **Dịch vụ bộ nhớ đệm (cache)** tiêu thụ thông điệp này từ hàng đợi thông điệp, nhận biết có dữ liệu thay đổi, liền gọi API của dịch vụ dữ liệu để lấy dữ liệu sau thay đổi, rồi đẩy dữ liệu đã được tổng hợp vào redis. Dữ liệu trong bộ nhớ đệm cục bộ của Nginx có thời hạn nhất định, chẳng hạn 10 phút; khi dữ liệu hết hạn, nó sẽ lấy dữ liệu bộ nhớ đệm mới nhất từ redis và lưu vào bộ nhớ đệm cục bộ của chính mình.

Khi người dùng duyệt trang, dữ liệu cục bộ của Nginx được render động vào mẫu html cục bộ rồi trả về cho người dùng.

![e-commerce-website-detail-page-architecture-2](asset:high-availability/e-commerce-website-detail-page-architecture/e-commerce-website-detail-page-architecture-2.png)

Tuy không nhanh bằng việc trả về thẳng trang html, nhưng do dữ liệu nằm trong bộ nhớ đệm cục bộ nên vẫn rất nhanh, chi phí thực chất chỉ là hiệu năng của việc render động một trang html. Nếu mẫu html thay đổi, không cần tĩnh hóa lại toàn bộ các trang, cũng không cần gửi yêu cầu, không có chi phí của yêu cầu mạng, chỉ cần render trực tiếp dữ liệu vào mẫu html mới nhất rồi phản hồi.

Với kiến trúc này, chúng ta cần **đảm bảo tính sẵn sàng cao của hệ thống**.

Nếu lưu lượng truy cập hệ thống rất cao, bộ nhớ đệm cục bộ của Nginx đã hết hạn, bộ nhớ đệm trong redis cũng bị thuật toán LRU dọn đi, thì lượng truy cập cao sẽ đổ vào việc gọi dịch vụ sản phẩm từ dịch vụ bộ nhớ đệm. Nhưng nếu lúc này API của dịch vụ sản phẩm gặp sự cố, việc gọi bị trễ, toàn bộ luồng của dịch vụ bộ nhớ đệm đều bị cạn kiệt bởi việc gọi API dịch vụ sản phẩm này, mỗi luồng khi gọi API dịch vụ sản phẩm đều bị kẹt rất lâu, thì hàng loạt yêu cầu đến sau cũng sẽ bị kẹt ở đó. Lúc này dịch vụ bộ nhớ đệm không còn đủ luồng để gọi API của các dịch vụ khác, dẫn đến việc rất nhiều trang chi tiết sản phẩm không thể hiển thị bình thường.

Đây thực chất là hiện tượng sự cố của API dịch vụ sản phẩm làm cạn kiệt tài nguyên của dịch vụ bộ nhớ đệm.
