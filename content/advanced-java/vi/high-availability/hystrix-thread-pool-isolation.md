---
source:
  locale: zh
  slug: hystrix-thread-pool-isolation
  hash: 'sha256:v1:2af51689979c0c9d225595673a0152d3bea4b15a048bb88bf37b3f65e669c0fc'
status: machine
translatedAt: '2026-10-14'
---
# Cô lập tài nguyên dựa trên kỹ thuật thread pool của Hystrix

[Bài trước](doc:advanced-java/high-availability/e-commerce-website-detail-page-architecture) đã đề cập rằng, nếu tính từ Nginx, bộ nhớ đệm đều mất hiệu lực, Nginx sẽ gọi dịch vụ sản phẩm trực tiếp qua dịch vụ bộ nhớ đệm để lấy dữ liệu sản phẩm mới nhất (chúng ta thảo luận dựa trên một dự án thương mại điện tử), và có thể xảy ra tình huống độ trễ khi gọi làm cạn kiệt tài nguyên của dịch vụ bộ nhớ đệm. Ở đây, chúng ta sẽ nói về cách dùng kỹ thuật thread pool (nhóm luồng) của Hystrix để cô lập (isolation) tài nguyên.

Cô lập tài nguyên nghĩa là nếu bạn muốn đưa toàn bộ các yêu cầu gọi tới một dịch vụ phụ thuộc nào đó vào cùng một nhóm tài nguyên, không dùng tới các tài nguyên khác, thì đó gọi là cô lập tài nguyên. Giả sử với dịch vụ phụ thuộc này, chẳng hạn dịch vụ sản phẩm, lượng gọi đồng thời hiện tại đã lên tới 1000, nhưng thread pool được cấp cho dịch vụ sản phẩm chỉ có 10 luồng, thì tối đa cũng chỉ dùng 10 luồng này để thực thi. Độ trễ khi gọi dịch vụ sản phẩm sẽ không làm cạn kiệt toàn bộ tài nguyên luồng bên trong Tomcat.

Hystrix thực hiện cô lập tài nguyên thực chất bằng cách cung cấp một lớp trừu tượng gọi là Command. Đây cũng là kỹ thuật cô lập tài nguyên cơ bản nhất của Hystrix.

## Dùng HystrixCommand để lấy một bản ghi dữ liệu

Chúng ta đóng gói thao tác gọi dịch vụ sản phẩm vào HystrixCommand, giới hạn bằng một key, chẳng hạn `GetProductInfoCommandGroup` bên dưới; ở đây có thể tạm coi đó là một thread pool, mỗi lần gọi dịch vụ sản phẩm chỉ dùng tài nguyên trong thread pool này, không dùng tài nguyên luồng khác nữa.

```java
public class GetProductInfoCommand extends HystrixCommand<ProductInfo> {

    private Long productId;

    public GetProductInfoCommand(Long productId) {
        super(HystrixCommandGroupKey.Factory.asKey("GetProductInfoCommandGroup"));
        this.productId = productId;
    }

    @Override
    protected ProductInfo run() {
        String url = "http://localhost:8081/getProductInfo?productId=" + productId;
        // Gọi API của dịch vụ sản phẩm
        String response = HttpClientUtils.sendGetRequest(url);
        return JSONObject.parseObject(response, ProductInfo.class);
    }
}
```

Trong API của dịch vụ bộ nhớ đệm, chúng ta tạo Command theo productId và thực thi để lấy dữ liệu sản phẩm.

```java
@RequestMapping("/getProductInfo")
@ResponseBody
public String getProductInfo(Long productId) {
    HystrixCommand<ProductInfo> getProductInfoCommand = new GetProductInfoCommand(productId);

    // Thực thi qua command để lấy dữ liệu sản phẩm mới nhất
    ProductInfo productInfo = getProductInfoCommand.execute();
    System.out.println(productInfo);
    return "success";
}
```

Phương thức được thực thi ở trên là execute(), thực chất là đồng bộ. Cũng có thể gọi phương thức queue() trên command; nó chỉ đưa command vào một hàng đợi chờ của thread pool rồi trả về ngay, nhận được một đối tượng Future, sau đó có thể tiếp tục làm những việc khác, rồi một lúc sau gọi phương thức get() trên Future để lấy dữ liệu. Đây là bất đồng bộ.

## Dùng HystrixObservableCommand để lấy dữ liệu hàng loạt

Mọi việc lấy dữ liệu sản phẩm đều được gắn vào cùng một thread pool; chúng ta dùng một luồng của HystrixObservableCommand để thực thi, và trong luồng này, kéo về hàng loạt productInfo của nhiều productId.

```java
public class GetProductInfosCommand extends HystrixObservableCommand<ProductInfo> {

    private String[] productIds;

    public GetProductInfosCommand(String[] productIds) {
        // Vẫn gắn vào cùng một thread pool
        super(HystrixCommandGroupKey.Factory.asKey("GetProductInfoGroup"));
        this.productIds = productIds;
    }

    @Override
    protected Observable<ProductInfo> construct() {
        return Observable.unsafeCreate((Observable.OnSubscribe<ProductInfo>) subscriber -> {

            for (String productId : productIds) {
                // Lấy dữ liệu sản phẩm hàng loạt
                String url = "http://localhost:8081/getProductInfo?productId=" + productId;
                String response = HttpClientUtils.sendGetRequest(url);
                ProductInfo productInfo = JSONObject.parseObject(response, ProductInfo.class);
                subscriber.onNext(productInfo);
            }
            subscriber.onCompleted();

        }).subscribeOn(Schedulers.io());
    }
}
```

Trong API của dịch vụ bộ nhớ đệm, dựa trên danh sách id được truyền vào, chẳng hạn chuỗi id phân tách bằng `,`, chúng ta dùng HystrixObservableCommand ở trên, thực thi một số phương thức API của Hystrix để lấy toàn bộ dữ liệu sản phẩm.

```java
public String getProductInfos(String productIds) {
    String[] productIdArray = productIds.split(",");
    HystrixObservableCommand<ProductInfo> getProductInfosCommand = new GetProductInfosCommand(productIdArray);
    Observable<ProductInfo> observable = getProductInfosCommand.observe();

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
         * @param productInfo
         */
        @Override
        public void onNext(ProductInfo productInfo) {
            System.out.println(productInfo);
        }
    });
    return "success";
}
```

Hãy quay lại xem kỹ thuật thread pool của Hystrix thực hiện cô lập tài nguyên như thế nào.

![hystrix-thread-pool-isolation](diagram:high-availability/hystrix-thread-pool-isolation/hystrix-thread-pool-isolation)

Tính từ Nginx, bộ nhớ đệm đều mất hiệu lực, thì Nginx gọi dịch vụ sản phẩm thông qua dịch vụ bộ nhớ đệm. Kích thước luồng mặc định của dịch vụ bộ nhớ đệm là 10, nghĩa là tối đa chỉ có 10 luồng gọi API của dịch vụ sản phẩm. Dù API của dịch vụ sản phẩm gặp sự cố, tối đa cũng chỉ có 10 luồng bị treo trên đường gọi API của dịch vụ sản phẩm, các luồng còn lại trong Tomcat của dịch vụ bộ nhớ đệm vẫn có thể dùng để gọi các dịch vụ khác, làm những việc khác.
