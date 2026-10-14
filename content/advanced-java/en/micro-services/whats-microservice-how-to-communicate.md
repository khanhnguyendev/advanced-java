---
source:
  locale: zh
  slug: whats-microservice-how-to-communicate
  hash: 'sha256:v1:4b9facd0485623132201efb75020e0c5135639d6418db63ce9fddc3d3f6bc42a'
status: machine
translatedAt: '2026-10-14'
---
# What Is a Microservice? How Do Microservices Communicate Independently?

## What is a Microservice

-   A microservices architecture is a distributed system that is divided into separate service units along business lines, solving the performance and other shortcomings of a monolithic system.
-   Microservices are an architectural style in which a large software application is made up of multiple service units. The service units in the system can be deployed independently, and they are loosely coupled to each other.

> Origin of the microservices concept: [Microservices](https://martinfowler.com/articles/microservices.html)

## How do microservices communicate Independently

### Synchronous

#### REST over the HTTP Protocol

REST requests are the most common way for microservices to communicate, and they rely on the HTTP/HTTPS protocol. The characteristics of RESTful are:

1. Each URI represents one resource.
2. The client uses four verbs that denote operations, GET, POST, PUT and DELETE, to operate on server resources: GET retrieves a resource, POST creates a resource (and can also be used to update one), PUT updates a resource, and DELETE deletes a resource.
3. Resources are operated on through their representations.
4. The representation of a resource is XML or HTML.
5. The interaction between client and server is stateless across requests: every request from the client to the server must contain the information needed to understand the request.

For example, suppose a service provider exposes the following API:

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

Another service needs to call this API; the caller only has to send a request according to the API documentation to get the result.

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

This is how communication between services can be achieved.

#### RPC over the TCP Protocol

RPC (Remote Procedure Call) simply means that one node requests a service provided by another node. Its workflow is as follows:

1. The client executes the call statement and passes the arguments.
2. The local system is invoked to send a network message.
3. The message is transmitted to the remote host.
4. The server receives the message and obtains the arguments.
5. The remote procedure (service) is executed according to the call request and the arguments.
6. When execution finishes, the result is returned to the server handle.
7. The server handle returns the result and calls the network service of the remote host's system to send it.
8. The message is sent back to the local host.
9. The client handle receives the message through the network service of the local host.
10. The client receives the result data returned by the call statement.

Here is an example.

First, a server is needed:

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
 * RPC server: registers the interfaces and implementation classes of remote methods
 */
public class RPCServer {
    private static ExecutorService executor = Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors());

    private static final ConcurrentHashMap<String, Class> serviceRegister = new ConcurrentHashMap<>();

    /**
     * Register a method
     * @param service
     * @param impl
     */
    public void register(Class service, Class impl) {
        serviceRegister.put(service.getSimpleName(), impl);
    }

    /**
     * Start the server
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
                // Read the content sent by the peer, in order
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
                    // The output != null check before closing is omitted here
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

Second, a client is needed:

```java
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.net.InetSocketAddress;
import java.net.Socket;

/**
 * RPC client
 */
public class RPCclient<T> {
    /**
     * Send the arguments to RPCServer through a dynamic proxy; this method turns the result returned by RPCserver into the correct entity
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

                    // Send the entity class and arguments to the remote callee
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

Then a remote method for testing:

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

The test code is as follows:

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

The output is `send message rpc 测试用例` (the test case string).

### Asynchronous

#### Messaging middleware

Common messaging middleware includes Kafka, ActiveMQ, RabbitMQ and RocketMQ, and common protocols include AMQP, MQTTP, STOMP and XMPP. The message queue is not covered further here; for how to use them, please refer to the official websites.
