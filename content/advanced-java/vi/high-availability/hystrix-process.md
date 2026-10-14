---
source:
  locale: zh
  slug: hystrix-process
  hash: 'sha256:v1:1a09a0d5375edeb278fb7f7a2573623a6e374d103efab79be5d5490ece5cf1db'
status: machine
translatedAt: '2026-10-14'
---
# Tìm hiểu sâu nguyên lý nội bộ khi Hystrix thực thi

Trước đây chúng ta đã tìm hiểu kỹ thuật cơ bản nhất của Hystrix để hỗ trợ tính sẵn sàng cao: **cô lập tài nguyên** (isolation) + **giới hạn lưu lượng** (rate limiting).

-   Tạo command;
-   Thực thi command này;
-   Cấu hình group và thread pool (nhóm luồng) tương ứng của command này.

Ở đây, chúng ta sẽ nói về việc khi bạn bắt đầu thực thi command này, sau khi gọi phương thức execute() của command, thì luồng thực thi, các bước và nguyên lý bên dưới của Hystrix là gì.

Trong quá trình giải thích luồng này, tôi sẽ nhắc đến một số chức năng cốt lõi và quan trọng khác của Hystrix.

Đây là sơ đồ luồng của toàn bộ 8 bước lớn, tôi sẽ giải thích chi tiết từng bước. Trong quá trình học, đối chiếu với sơ đồ luồng này, tin rằng mạch suy nghĩ sẽ rõ ràng hơn.

![hystrix-process](asset:high-availability/hystrix-process/new-hystrix-process.jpg)

## Bước một: Tạo command

Một đối tượng HystrixCommand hoặc HystrixObservableCommand đại diện cho một yêu cầu hoặc lời gọi tới một dịch vụ phụ thuộc nào đó. Khi tạo, có thể truyền vào constructor bất kỳ tham số cần thiết nào.

-   HystrixCommand chủ yếu dùng cho các lời gọi chỉ trả về một kết quả.
-   HystrixObservableCommand chủ yếu dùng cho các lời gọi có thể trả về nhiều kết quả.

```java
// Tạo HystrixCommand
HystrixCommand hystrixCommand = new HystrixCommand(arg1, arg2);

// Tạo HystrixObservableCommand
HystrixObservableCommand hystrixObservableCommand = new HystrixObservableCommand(arg1, arg2);
```

## Bước hai: Gọi phương thức thực thi của command

Thực thi command là có thể phát ra một lời gọi tới dịch vụ phụ thuộc.

Để thực thi command, có thể chọn một trong 4 phương thức: execute(), queue(), observe(), toObservable().

Trong đó execute() và queue() chỉ áp dụng cho HystrixCommand.

-   execute(): sau khi gọi sẽ block luôn, thuộc loại gọi đồng bộ, cho đến khi dịch vụ phụ thuộc trả về một kết quả hoặc ném ra ngoại lệ.
-   queue(): trả về một Future, thuộc loại gọi bất đồng bộ, sau đó có thể lấy một kết quả thông qua Future.
-   observe(): đăng ký (subscribe) một đối tượng Observable, Observable đại diện cho kết quả mà dịch vụ phụ thuộc trả về, và nhận được một bản sao của đối tượng Observable đại diện cho kết quả đó.
-   toObservable(): trả về một đối tượng Observable, nếu chúng ta đăng ký đối tượng này thì sẽ thực thi command và lấy kết quả trả về.

```java
K             value    = hystrixCommand.execute();
Future<K>     fValue   = hystrixCommand.queue();
Observable<K> oValue   = hystrixObservableCommand.observe();
Observable<K> toOValue = hystrixObservableCommand.toObservable();
```

execute() thực tế sẽ gọi phương thức queue().get(), có thể xem mã nguồn Hystrix.

```java
public R execute() {
    try {
        return queue().get();
    } catch (Exception e) {
        throw Exceptions.sneakyThrow(decomposeException(e));
    }
}
```

Còn trong phương thức queue(), sẽ gọi toObservable().toBlocking().toFuture().

```java
final Future<R> delegate = toObservable().toBlocking().toFuture();
```

Nghĩa là, trước tiên lấy đối tượng Future thông qua toObservable(), rồi gọi phương thức get() của Future. Như vậy, thực ra dù thực thi command bằng cách nào, cuối cùng đều dựa vào toObservable() để thực thi.

## Bước ba: Kiểm tra có bật bộ nhớ đệm hay không (ít dùng)

Từ bước này, chúng ta đi vào nguyên lý chạy bên dưới của Hystrix, xem một số chức năng và đặc tính cao cấp hơn của Hystrix.

Nếu command này đã bật bộ nhớ đệm yêu cầu (cache) Request Cache, và kết quả của lời gọi này tồn tại trong bộ nhớ đệm, thì trả về kết quả trực tiếp từ bộ nhớ đệm. Nếu không, tiếp tục các bước sau.

## Bước bốn: Kiểm tra có bật circuit breaker hay không

Kiểm tra xem dịch vụ phụ thuộc tương ứng của command này có bật circuit breaker (bộ ngắt mạch) hay không. Nếu circuit breaker đã mở, thì Hystrix sẽ không thực thi command này, mà thực thi trực tiếp cơ chế suy giảm dịch vụ (fallback), trả về kết quả suy giảm dịch vụ.

## Bước năm: Kiểm tra thread pool/hàng đợi/semaphore đã đầy hay chưa

Nếu thread pool và hàng đợi của command này đã đầy, hoặc semaphore đã đầy, thì cũng không thực thi command, mà gọi trực tiếp cơ chế suy giảm dịch vụ, đồng thời gửi thông tin reject cho circuit breaker để thống kê.

## Bước sáu: Thực thi command

Gọi phương thức construct() của đối tượng HystrixObservableCommand, hoặc phương thức run() của HystrixCommand để thực sự thực thi command này.

-   HystrixCommand.run() trả về một kết quả, hoặc ném ra ngoại lệ.

```java
// Thực thi qua command, lấy một bản ghi dữ liệu sản phẩm mới nhất
ProductInfo productInfo = getProductInfoCommand.execute();
```

-   HystrixObservableCommand.construct() trả về một đối tượng Observable, có thể lấy nhiều kết quả.

```java
Observable<ProductInfo> observable = getProductInfosCommand.observe();

// Đăng ký để lấy nhiều kết quả
observable.subscribe(new Observer<ProductInfo>() {
    @Override
    public void onCompleted() {
        System.out.println("获取完了所有的商品数据");
    }

    @Override
    public void onError(Throwable e) {
        e.printStackTrace();
    }

    /**
     * Mỗi khi lấy xong một bản ghi dữ liệu, phương thức này được callback một lần
     *
     * @param productInfo thông tin sản phẩm
     */
    @Override
    public void onNext(ProductInfo productInfo) {
        System.out.println(productInfo);
    }
});
```

Nếu dùng cách thread pool, và thời gian thực thi của HystrixCommand.run() hoặc HystrixObservableCommand.construct() vượt quá thời lượng hết thời gian chờ (timeout), thì luồng chứa command sẽ ném ra một TimeoutException; lúc này sẽ thực thi cơ chế suy giảm dịch vụ, và không quan tâm đến giá trị mà run() hay construct() trả về nữa. Một trường hợp khác, nếu command thực thi bị lỗi và ném ra ngoại lệ khác, thì cũng đi theo suy giảm dịch vụ. Trong hai trường hợp này, Hystrix đều gửi sự kiện ngoại lệ cho circuit breaker để thống kê.

**Lưu ý**, chúng ta không thể nào chấm dứt được luồng của một dịch vụ phụ thuộc có độ trễ nghiêm trọng, chỉ có thể ném ra cho bạn một TimeoutException.

Nếu không có timeout, và thực thi bình thường, thì luồng gọi sẽ nhận được kết quả có được từ việc gọi dịch vụ phụ thuộc, sau đó Hystrix cũng sẽ ghi một số bản ghi logging và thống kê đo lường metric.

## Bước bảy: Kiểm tra sức khỏe của circuit breaker

Hystrix sẽ gửi các sự kiện như thành công, thất bại, Reject, Timeout của mỗi lời gọi dịch vụ phụ thuộc cho circuit breaker (bộ ngắt mạch). Circuit breaker sẽ thống kê số lần của các sự kiện này, dựa vào tỷ lệ xảy ra sự kiện ngoại lệ để quyết định có ngắt mạch (circuit breaking) hay không. Nếu circuit breaker đã mở, thì trong khoảng thời gian tiếp theo, sẽ ngắt mạch trực tiếp, trả về kết quả suy giảm dịch vụ.

Nếu sau đó, circuit breaker thử thực thi command, lời gọi không có lỗi, trả về kết quả bình thường, thì Hystrix sẽ đóng circuit breaker lại.

## Bước tám: Gọi cơ chế suy giảm dịch vụ

Trong các trường hợp sau, Hystrix sẽ gọi cơ chế suy giảm dịch vụ.

-   Circuit breaker đang ở trạng thái mở;
-   thread pool/hàng đợi/semaphore đã đầy;
-   command thực thi hết thời gian chờ;
-   run() hoặc construct() ném ra ngoại lệ.

Nói chung, trong cơ chế suy giảm dịch vụ, khuyến nghị đưa ra một số giá trị trả về mặc định, chẳng hạn một số logic code tĩnh, hoặc lấy một số dữ liệu từ bộ nhớ đệm trong bộ nhớ; ở đây cố gắng đừng thực hiện yêu cầu mạng nữa.

Trong suy giảm dịch vụ, nếu nhất định phải thực hiện lời gọi mạng, thì cũng nên đặt lời gọi đó vào một HystrixCommand để cô lập.

-   Trong HystrixCommand, cài đặt phương thức getFallback() có thể cung cấp cơ chế suy giảm dịch vụ.
-   Trong HystrixObservableCommand, cài đặt phương thức resumeWithFallback(), trả về một đối tượng Observable, có thể cung cấp kết quả suy giảm dịch vụ.

Nếu không cài đặt suy giảm dịch vụ, hoặc phần này ném ra ngoại lệ, Hystrix sẽ trả về một Observable, nhưng sẽ không trả về dữ liệu nào.

Các cách thực thi command khác nhau, kết quả trả về khi phần suy giảm dịch vụ rỗng hoặc có ngoại lệ cũng khác nhau.

-   Với execute(), ném ngoại lệ trực tiếp.
-   Với queue(), trả về một Future, khi gọi get() thì ném ngoại lệ.
-   Với observe(), trả về một đối tượng Observable, nhưng khi gọi phương thức subscribe() để đăng ký nó, sẽ lập tức ném cho phương thức onError() của bên gọi.
-   Với toObservable(), trả về một đối tượng Observable, nhưng khi gọi phương thức subscribe() để đăng ký nó, sẽ lập tức ném cho phương thức onError() của bên gọi.

## Các cách thực thi khác nhau

-   execute(), lấy một Future.get(), rồi nhận được một kết quả đơn.
-   queue(), trả về một Future.
-   observe(), đăng ký Observable ngay lập tức, sau đó khởi động 8 bước thực thi lớn, trả về một Observable bản sao, khi đăng ký sẽ callback kết quả cho bạn ngay.
-   toObservable(), trả về một Observable gốc, phải đăng ký thủ công thì mới thực thi 8 bước lớn.
