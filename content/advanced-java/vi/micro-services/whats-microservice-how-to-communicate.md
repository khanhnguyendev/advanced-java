---
source:
  locale: zh
  slug: whats-microservice-how-to-communicate
  hash: 'sha256:v1:4b9facd0485623132201efb75020e0c5135639d6418db63ce9fddc3d3f6bc42a'
status: machine
translatedAt: '2026-10-14'
---
# Microservices là gì? Các microservices giao tiếp độc lập với nhau như thế nào?

## Microservices là gì

-   Kiến trúc microservices là một hệ thống phân tán, được chia thành các đơn vị dịch vụ khác nhau theo nghiệp vụ, nhằm giải quyết những hạn chế về hiệu năng v.v. của hệ thống nguyên khối (monolith).
-   Microservices là một phong cách kiến trúc, trong đó một ứng dụng phần mềm lớn được tạo thành từ nhiều đơn vị dịch vụ. Các đơn vị dịch vụ trong hệ thống có thể được triển khai riêng biệt, và giữa chúng là liên kết lỏng (loose coupling).

> Nguồn gốc của khái niệm microservices: [Microservices](https://martinfowler.com/articles/microservices.html)

## Các microservices giao tiếp độc lập với nhau như thế nào

### Đồng bộ

#### Giao thức REST HTTP

Yêu cầu REST là cách giao tiếp được dùng phổ biến nhất trong microservices, nó dựa trên giao thức HTTP\HTTPS. Đặc điểm của RESTFUL là:

1. Mỗi URI đại diện cho 1 loại tài nguyên
2. Client dùng 4 động từ biểu thị cách thao tác là GET, POST, PUT, DELETE để thao tác với tài nguyên phía server: GET dùng để lấy tài nguyên, POST dùng để tạo mới tài nguyên (cũng có thể dùng để cập nhật tài nguyên), PUT dùng để cập nhật tài nguyên, DELETE dùng để xóa tài nguyên
3. Thao tác tài nguyên thông qua việc thao tác dạng biểu diễn của tài nguyên
4. Dạng biểu diễn của tài nguyên là XML hoặc HTML
5. Tương tác giữa client và server là phi trạng thái (stateless) giữa các yêu cầu: mỗi yêu cầu từ client gửi tới server đều phải chứa đầy đủ thông tin cần thiết để hiểu yêu cầu đó

Ví dụ, một bên cung cấp dịch vụ đưa ra API như sau:

```java
@RestController
@RequestMapping("/communication")
public class RestControllerDemo {
    @GetMapping("/hello")
    public String s() {
        return "hello";
    }
}
```

Một dịch vụ khác cần gọi API đó; bên gọi chỉ cần gửi yêu cầu theo tài liệu API là có thể nhận được kết quả trả về.

```java
@RestController
@RequestMapping("/demo")
public class RestDemo{
    @Autowired
    RestTemplate restTemplate;

    @GetMapping("/hello2")
    public String s2() {
        String forObject = restTemplate.getForObject("http://localhost:9013/communication/hello", String.class);
        return forObject;
    }
}
```

Bằng cách này có thể thực hiện giao tiếp giữa các dịch vụ.

#### Giao thức RPC TCP

RPC (Remote Procedure Call), tức lời gọi thủ tục từ xa, hiểu đơn giản là một nút yêu cầu dịch vụ do một nút khác cung cấp. Quy trình hoạt động của nó như sau:

1. Thực thi câu lệnh gọi ở phía client, truyền tham số
2. Gọi hệ thống cục bộ để gửi thông điệp mạng
3. Thông điệp được truyền tới máy chủ từ xa
4. Server nhận thông điệp và lấy ra tham số
5. Thực thi thủ tục từ xa (dịch vụ) theo yêu cầu gọi và tham số
6. Thực thi xong, trả kết quả về cho server handle
7. Server handle trả kết quả, gọi dịch vụ mạng của hệ thống trên máy từ xa để gửi kết quả
8. Thông điệp được truyền ngược về máy cục bộ
9. Client handle nhận thông điệp qua dịch vụ mạng của máy cục bộ
10. Client nhận được dữ liệu kết quả mà câu lệnh gọi trả về

Lấy một ví dụ.

Trước hết cần một server:

```java
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.lang.reflect.Method;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Máy chủ RPC dùng để đăng ký interface và lớp triển khai của các phương thức từ xa
 */
public class RPCServer {
    private static ExecutorService executor = Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors());

    private static final ConcurrentHashMap<String, Class> serviceRegister = new ConcurrentHashMap<>();

    /**
     * Phương thức đăng ký
     * @param service
     * @param impl
     */
    public void register(Class service, Class impl) {
        serviceRegister.put(service.getSimpleName(), impl);
    }

    /**
     * Phương thức khởi động
     * @param port
     */
    public void start(int port) {
        ServerSocket socket = null;
        try {
            socket = new ServerSocket();
            socket.bind(new InetSocketAddress(port));
            System.out.println("服务启动");
            System.out.println(serviceRegister);
            while (true) {
                executor.execute(new Task(socket.accept()));
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (socket != null) {
                try {
                    socket.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }

    private static class Task implements Runnable {
        Socket client = null;

        public Task(Socket client) {
            this.client = client;
        }

        @Override
        public void run() {
            ObjectInputStream input = null;
            ObjectOutputStream output = null;
            try {
                input = new ObjectInputStream(client.getInputStream());
                // Đọc lần lượt nội dung do phía bên kia ghi sang
                String serviceName = input.readUTF();
                String methodName = input.readUTF();
                Class<?>[] parameterTypes = (Class<?>[]) input.readObject();
                Object[] arguments = (Object[]) input.readObject();
                Class serviceClass = serviceRegister.get(serviceName);
                if (serviceClass == null) {
                    throw new ClassNotFoundException(serviceName + " 没有找到!");
                }
                Method method = serviceClass.getMethod(methodName, parameterTypes);
                Object result = method.invoke(serviceClass.newInstance(), arguments);

                output = new ObjectOutputStream(client.getOutputStream());
                output.writeObject(result);
            } catch (Exception e) {
                e.printStackTrace();

            } finally {
                try {
                    // Ở đây không viết logic chỉ đóng khi output != null
                    output.close();
                    input.close();
                    client.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }

            }
        }
    }

}

```

Tiếp theo cần một client:

```java
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.net.InetSocketAddress;
import java.net.Socket;

/**
 * Máy khách RPC
 */
public class RPCclient<T> {
    /**
     * Gửi tham số tới RPCServer thông qua dynamic proxy; phương thức này xử lý kết quả RPCServer trả về thành thực thể đúng
     */
    public static <T> T getRemoteProxyObj(final Class<T> service, final InetSocketAddress addr) {

        return (T) Proxy.newProxyInstance(service.getClassLoader(), new Class<?>[]{service}, new InvocationHandler() {
            @Override
            public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {

                Socket socket = null;
                ObjectOutputStream out = null;
                ObjectInputStream input = null;
                try {
                    socket = new Socket();
                    socket.connect(addr);

                    // Gửi lớp thực thể và tham số cho bên được gọi từ xa
                    out = new ObjectOutputStream(socket.getOutputStream());
                    out.writeUTF(service.getSimpleName());
                    out.writeUTF(method.getName());
                    out.writeObject(method.getParameterTypes());
                    out.writeObject(args);

                    input = new ObjectInputStream(socket.getInputStream());
                    return input.readObject();
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    out.close();
                    input.close();
                    socket.close();
                }
                return null;
            }
        });

    }

}

```

Thêm một phương thức từ xa để kiểm thử.

```java
public interface Tinterface {
    String send(String msg);
}

public class TinterfaceImpl implements Tinterface {
    @Override
    public String send(String msg) {
        return "send message " + msg;
    }
}

```

Mã kiểm thử như sau:

```java
import java.net.InetSocketAddress;


public class RunTest {
    public static void main(String[] args) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                RPCServer rpcServer = new RPCServer();
                rpcServer.register(Tinterface.class, TinterfaceImpl.class);
                rpcServer.start(10000);
            }
        }).start();
        Tinterface tinterface = RPCclient.getRemoteProxyObj(Tinterface.class, new InetSocketAddress("localhost", 10000));
        System.out.println(tinterface.send("rpc 测试用例"));

    }
}

```

Kết quả in ra `send message rpc 测试用例` (send message rpc test case).

### Bất đồng bộ

#### Message middleware

Các message middleware phổ biến có Kafka, ActiveMQ, RabbitMQ, RocketMQ; các giao thức phổ biến có AMQP, MQTTP, STOMP, XMPP. Ở đây không mở rộng về hàng đợi thông điệp (message queue), cách sử dụng cụ thể xin xem trên trang chủ chính thức.
