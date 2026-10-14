---
source:
  locale: zh
  slug: migrating-from-a-monolithic-architecture-to-a-microservices-architecture
  hash: 'sha256:v1:ae97d9fc511e42d08f7d344b0fbefcd7bd67c1d1c1e5f3a0617b5c99122386a2'
status: machine
translatedAt: '2026-10-14'
---
# Tổng quan về việc chuyển sang microservices

Di chuyển một ứng dụng nguyên khối (monolith) sang kiến trúc microservices là một dạng hiện đại hóa ứng dụng, khá giống với những gì nhiều thế hệ lập trình viên vẫn làm. Thực tế, khi di chuyển, ta có thể tái sử dụng một số ý tưởng đó.

Một chiến lược là: không viết lại toàn bộ mã nguồn theo kiểu big bang (chỉ nên viết lại khi bạn đảm nhận xây dựng một ứng dụng mới hoàn toàn dựa trên microservices). Viết lại nghe có vẻ hấp dẫn, nhưng thực tế đầy rủi ro và rất có thể thất bại, như Martin Fowler từng nói:

> “the only thing a Big Bang rewrite guarantees is a Big Bang!”

Thay vào đó, nên di chuyển ứng dụng nguyên khối theo từng bước: dần dần xây dựng các ứng dụng mới dưới dạng microservices và tích hợp chúng với ứng dụng nguyên khối cũ. Theo thời gian, tỷ trọng của ứng dụng nguyên khối trong toàn bộ kiến trúc giảm dần cho đến khi biến mất hoặc trở thành một phần của kiến trúc microservices. Chiến lược này giống như bảo dưỡng một chiếc xe trong khi vẫn chạy trên đường cao tốc với tốc độ giới hạn 70 dặm một giờ: tuy có thách thức, nhưng rủi ro thấp hơn nhiều so với viết lại.

Martin Fowler gọi chiến lược hiện đại hóa này là ứng dụng Strangler, tên gọi bắt nguồn từ dây leo bóp cổ (strangler vine), còn gọi là sung bóp cổ (strangler fig) trong rừng mưa. Để leo lên tới đỉnh rừng, dây leo bóp cổ quấn quanh thân cây lớn mà phát triển; sau một thời gian cây chết đi, chỉ còn lại dây leo mang hình dáng của cây. Mẫu ứng dụng này cũng dùng cùng một cách: các ứng dụng microservices mới được phát triển xung quanh ứng dụng cũ, và ứng dụng cũ dần rời khỏi sân khấu.

Hãy xem các chiến lược khả thi khác.

## Chiến lược 1: Ngừng đào

Law of Holes nói rằng khi đã rơi xuống hố thì nên ngừng đào. Đây là lời khuyên tốt nhất khi ứng dụng nguyên khối đã trở nên không thể quản lý. Nói cách khác, nên ngừng làm cho ứng dụng nguyên khối lớn thêm: khi phát triển chức năng mới, không nên thêm mã mới vào ứng dụng nguyên khối cũ; cách tốt nhất là phát triển chức năng mới thành một microservice độc lập. Như hình dưới đây:

![1](diagram:micro-services/migrating-from-a-monolithic-architecture-to-a-microservices-architecture/law-of-holes)

Ngoài dịch vụ mới và ứng dụng cũ, còn có hai module nữa. Module thứ nhất là bộ định tuyến yêu cầu (request router), chịu trách nhiệm xử lý các yêu cầu (HTTP) đi vào, hơi giống API gateway đã nhắc ở phần trước. Bộ định tuyến chuyển các yêu cầu cho chức năng mới tới dịch vụ mới phát triển, còn các yêu cầu cũ vẫn chuyển cho ứng dụng nguyên khối.

Module còn lại là mã keo (glue code), dùng để tích hợp microservice với ứng dụng nguyên khối. Microservice hiếm khi tồn tại độc lập và thường phải truy cập dữ liệu của ứng dụng nguyên khối. Mã keo, có thể nằm trong ứng dụng nguyên khối, trong dịch vụ hoặc ở cả hai, chịu trách nhiệm tích hợp dữ liệu. Microservice đọc và ghi dữ liệu của ứng dụng nguyên khối thông qua mã keo.

Microservice có ba cách truy cập dữ liệu của ứng dụng nguyên khối:

-   Gọi API từ xa do ứng dụng nguyên khối cung cấp
-   Truy cập trực tiếp cơ sở dữ liệu của ứng dụng nguyên khối
-   Tự duy trì một bản dữ liệu được đồng bộ từ ứng dụng nguyên khối

Mã keo còn được gọi là lớp chống hư hại (anti-corruption layer), vì mã keo bảo vệ mô hình miền hoàn toàn mới của microservice khỏi bị mô hình miền của ứng dụng nguyên khối cũ làm ô nhiễm. Mã keo đảm nhiệm việc chuyển đổi giữa hai mô hình này. Thuật ngữ anti-corruption layer lần đầu xuất hiện trong cuốn sách bắt buộc phải đọc _Domain Driven Design_ của Eric Evans, sau đó được đúc kết thành một sách trắng. Việc xây dựng lớp chống hư hại có vẻ không quan trọng lắm, nhưng lại là phần cần thiết để tránh sa vào vũng lầy nguyên khối.

Triển khai chức năng mới dưới dạng microservice nhẹ có nhiều ưu điểm, chẳng hạn ngăn ứng dụng nguyên khối trở nên khó quản lý hơn. Bản thân microservice có thể được phát triển, triển khai và mở rộng độc lập. Áp dụng kiến trúc microservices mang lại cho lập trình viên những trải nghiệm thực tế khác biệt.

Tuy nhiên, cách này không giải quyết bất kỳ vấn đề nào của chính ứng dụng nguyên khối. Để giải quyết chúng, phải đi sâu vào ứng dụng nguyên khối và thực hiện thay đổi. Hãy xem các chiến lược để làm việc đó.

## Chiến lược 2: Tách frontend và backend

Một chiến lược để giảm độ phức tạp của ứng dụng nguyên khối là tách tầng trình bày khỏi tầng logic nghiệp vụ và tầng truy cập dữ liệu. Một ứng dụng doanh nghiệp điển hình có ít nhất ba thành phần khác nhau:

1. Tầng trình bày: xử lý các yêu cầu HTTP, hoặc phản hồi một yêu cầu REST API, hoặc cung cấp giao diện đồ họa dựa trên HTML. Với ứng dụng có giao diện người dùng phức tạp, tầng trình bày thường chiếm một phần mã đáng kể.

2. Tầng logic nghiệp vụ: phần lõi của ứng dụng, thực hiện logic nghiệp vụ.

3. Tầng truy cập dữ liệu: truy cập các thành phần hạ tầng như cơ sở dữ liệu và message broker.

Giữa tầng trình bày và các tầng nghiệp vụ, truy cập dữ liệu có ranh giới tách biệt rõ ràng. Tầng nghiệp vụ có một API hạt thô (coarse-grained) gồm nhiều khía cạnh, bên trong chứa các thành phần logic nghiệp vụ. API này là ranh giới tự nhiên để chia ứng dụng nguyên khối thành hai ứng dụng nhỏ hơn: một là tầng trình bày, một là logic nghiệp vụ và truy cập dữ liệu. Sau khi chia, ứng dụng trình bày gọi từ xa ứng dụng logic nghiệp vụ. Hình dưới thể hiện sự khác biệt về kiến trúc trước và sau khi di chuyển:

![2](diagram:micro-services/migrating-from-a-monolithic-architecture-to-a-microservices-architecture/before-and-after-migration)

Chia ứng dụng nguyên khối theo cách này có hai lợi ích. Thứ nhất, hai phần của ứng dụng có thể được phát triển, triển khai và mở rộng độc lập; đặc biệt, cho phép lập trình viên tầng trình bày nhanh chóng thử nghiệm trên giao diện người dùng, chạy A/B testing. Thứ hai, một số API từ xa có thể được các microservices gọi tới.

Tuy nhiên, chiến lược này chỉ là giải pháp một phần. Rất có thể một trong hai phần của ứng dụng, hoặc cả hai, vẫn không thể quản lý, nên cần dùng chiến lược thứ ba để loại bỏ phần kiến trúc nguyên khối còn lại.

## Chiến lược 3: Tách dịch vụ ra

Chiến lược di chuyển thứ ba là tách một số module từ ứng dụng nguyên khối thành các microservices độc lập. Mỗi khi tách một module thành microservice, ứng dụng nguyên khối lại đơn giản hơn một chút; khi đã chuyển đổi đủ nhiều module, bản thân ứng dụng nguyên khối không còn là vấn đề nữa: hoặc nó biến mất, hoặc đủ đơn giản để trở thành một dịch vụ.

### Sắp xếp thứ tự module nào nên được chuyển thành microservice

Một ứng dụng nguyên khối khổng lồ và phức tạp gồm hàng chục, hàng trăm module, mỗi module đều là đối tượng có thể tách ra. Quyết định module đầu tiên cần tách thường là một thách thức; nhìn chung tốt nhất là bắt đầu từ module dễ tách nhất, giúp lập trình viên tích lũy đủ kinh nghiệm, và kinh nghiệm đó mang lại lợi ích lớn cho các đợt module hóa sau.

Chuyển đổi một module thành microservice thường tốn nhiều thời gian, nên có thể sắp xếp thứ tự theo mức độ lợi ích; thường bắt đầu từ các module hay thay đổi sẽ thu được lợi ích lớn nhất. Một khi module đã được chuyển thành microservice, có thể phát triển và triển khai nó như một module độc lập, từ đó đẩy nhanh tiến trình phát triển.

Tách trước các module tiêu thụ nhiều tài nguyên cũng là một tiêu chí sắp xếp. Ví dụ, tách cơ sở dữ liệu trong bộ nhớ thành một microservice rất hữu ích, vì có thể triển khai nó trên máy chủ có bộ nhớ lớn. Tương tự, tách các ứng dụng thuật toán nhạy cảm với tài nguyên tính toán cũng rất có lợi, vì dịch vụ như vậy có thể được triển khai trên máy chủ có nhiều CPU. Chuyển các module tiêu tốn tài nguyên thành microservices giúp ứng dụng dễ mở rộng hơn.

Tìm các ranh giới hạt thô sẵn có để quyết định module nào nên tách cũng rất hữu ích, giúp công việc di chuyển dễ dàng và đơn giản hơn. Ví dụ, một module chỉ trao đổi thông điệp bất đồng bộ với phần còn lại của ứng dụng là một ranh giới rõ ràng và có thể chuyển thành microservice một cách đơn giản, dễ dàng.

### Cách tách một module

Bước đầu tiên để tách một module là định nghĩa API hạt thô giữa module và ứng dụng nguyên khối. Vì ứng dụng nguyên khối cần dữ liệu của microservice và ngược lại, nên nó giống một API hai chiều hơn. Phát triển loại API này là thách thức, vì phải cân bằng giữa các quan hệ phụ thuộc và mẫu API hạt mịn (fine-grained). Điều này đặc biệt khó với tầng logic nghiệp vụ dùng mẫu domain model, nên thường phải sửa mã để giải quyết vấn đề phụ thuộc, như hình dưới:

Khi đã có API hạt thô, module được chuyển thành microservice độc lập. Để làm được, phải viết mã để ứng dụng nguyên khối và microservice trao đổi thông tin qua các API sử dụng cơ chế giao tiếp liên tiến trình (IPC). Hình dưới so sánh trước và sau khi di chuyển:

![3](diagram:micro-services/migrating-from-a-monolithic-architecture-to-a-microservices-architecture/30103116_zccm)

Trong ví dụ này, module Z đang dùng module Y là ứng viên để tách, các thành phần của nó đang được module X sử dụng. Bước đầu của việc di chuyển là định nghĩa một tập API hạt thô: API thứ nhất là API nội bộ do module X dùng để kích hoạt module Z; API thứ hai là API ngoại do module Z dùng để kích hoạt module Y.

Bước thứ hai của việc di chuyển là chuyển module thành dịch vụ độc lập. Cả API nội và ngoại đều dùng mã dựa trên cơ chế IPC; thường sẽ tích hợp module Z vào một framework hạ tầng microservices để xử lý các vấn đề phát sinh trong quá trình chuyển đổi, chẳng hạn khám phá dịch vụ (service discovery).

Sau khi tách module, có thể phát triển, triển khai và mở rộng một dịch vụ khác độc lập với ứng dụng nguyên khối và các dịch vụ còn lại. Cũng có thể viết dịch vụ từ đầu; trong trường hợp đó, mã API tích hợp dịch vụ với ứng dụng nguyên khối được gọi là lớp chống hư hại, thực hiện công việc chuyển đổi giữa hai mô hình miền. Mỗi dịch vụ được tách ra là một bước tiến tới microservices. Theo thời gian, ứng dụng nguyên khối sẽ ngày càng đơn giản, và người dùng có thể thêm nhiều microservices độc lập hơn.
Việc di chuyển ứng dụng hiện có sang ứng dụng hiện đại theo kiến trúc microservices không nên thực hiện bằng cách viết lại mã từ đầu; thay vào đó nên di chuyển từng bước. Có ba chiến lược để cân nhắc: triển khai chức năng mới dưới dạng microservices; tách tầng trình bày khỏi tầng nghiệp vụ và truy cập dữ liệu; tách các module hiện có thành microservices. Theo thời gian, số lượng microservices sẽ tăng lên, và tính linh hoạt cùng hiệu quả của đội phát triển sẽ được nâng cao đáng kể.
