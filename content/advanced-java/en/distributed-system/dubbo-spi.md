---
source:
  locale: zh
  slug: dubbo-spi
  hash: 'sha256:v1:18bfee42f8f7346cd6b11a5b83c157d96074611a483902029d6de8ef04a9df76'
status: machine
translatedAt: '2026-10-14'
---
# Dubbo's SPI Mechanism

## Interview question

What is the idea behind Dubbo's SPI?

## Interviewer psychology

The interviewer keeps digging. Having finished asking the basics and confirmed that you are fine on them and understand the fundamentals of Dubbo, the interviewer asks a slightly harder question, SPI: first what SPI is, then how Dubbo's SPI is implemented.

It is really a check on how well you have mastered Dubbo.

## Answer analysis

### What is SPI?

SPI, simply put, is `service provider interface`. What does that mean in plain words? Say you have an interface and it now has 3 implementation classes. When the system runs, which implementation class should be chosen for this interface? That is where SPI is needed: **according to a specified configuration** or **the default configuration**, it **finds the corresponding implementation class**, loads it, and then uses an instance of that implementation class.

Here is an example.

You have an interface A. A1/A2/A3 are different implementations of interface A. You configure `接口 A = 实现 A2` (interface A = implementation A2), and when the system actually runs, it loads your configuration and instantiates an object of implementation A2 to provide the service.

Where is the SPI mechanism generally used? In **plugin extension scenarios**. For example, if you develop an open-source framework for others to use and you want people to write their own plugin and plug it into your framework to extend some feature, the SPI idea comes into play.

### How the Java SPI idea shows up

A classic embodiment of SPI is something everyone uses every day, such as jdbc.

Java defines a set of jdbc interfaces, but Java does not provide the implementation classes of jdbc.

But when the project actually runs, which implementation classes of the jdbc interfaces should be used? Generally, we **depend on the database we use**: for mysql you bring in `mysql-jdbc-connector.jar`, and for oracle you bring in `oracle-jdbc-connector.jar`.

When the system runs and meets your use of the jdbc interfaces, it uses underneath the implementation classes provided in the jar you brought in.

### Dubbo's SPI idea

Dubbo also uses the SPI idea, but not the JDK's SPI mechanism; it implements a set of SPI mechanism of its own.

```java
Protocol protocol = ExtensionLoader.getExtensionLoader(Protocol.class).getAdaptiveExtension();
```

For the Protocol interface, when the system runs, Dubbo decides which implementation class of the Protocol interface should be used to instantiate the object.

It looks for a Protocol that you configured, loads the Protocol implementation class you configured into the jvm, instantiates the object, and then simply uses your Protocol implementation class.

The line of code above is used heavily in Dubbo: for many components, one interface and multiple implementations are kept, and when the system runs the corresponding implementation class is found dynamically according to configuration. If you did not configure anything, the default implementation is used, no problem.

```java
@SPI("dubbo")
public interface Protocol {

    int getDefaultPort();

    @Adaptive
    <T> Exporter<T> export(Invoker<T> invoker) throws RpcException;

    @Adaptive
    <T> Invoker<T> refer(Class<T> type, URL url) throws RpcException;

    void destroy();

}
```

In Dubbo's own jar, in the file `/META_INF/dubbo/internal/com.alibaba.dubbo.rpc.Protocol`:

```xml
dubbo=com.alibaba.dubbo.rpc.protocol.dubbo.DubboProtocol
http=com.alibaba.dubbo.rpc.protocol.http.HttpProtocol
hessian=com.alibaba.dubbo.rpc.protocol.hessian.HessianProtocol
```

So now you can see how Dubbo's SPI mechanism works by default. For the Protocol interface, `@SPI("dubbo")` says that implementation classes are provided through the SPI mechanism, and they are found in the configuration file using dubbo as the default key. The configuration file has the same name as the fully qualified name of the interface, and using dubbo as the key finds the default implementation class `com.alibaba.dubbo.rpc.protocol.dubbo.DubboProtocol` .

If you want to dynamically replace the default implementation class, you need to use the `@Adaptive` annotation. In the Protocol interface, two methods carry the `@Adaptive` annotation, which means those two methods will be implemented by a proxy.

What does that mean?

For example, the Protocol interface has two methods marked with the `@Adaptive` annotation. At runtime a proxy class is generated for Protocol, and the two methods of that proxy class contain proxy code. At runtime, the proxy code dynamically gets the key from the protocol in the url. The default is dubbo, and you can also specify your own. If you specify another key, an instance of another implementation class is obtained.

### How to extend components in Dubbo yourself

Next, let us look at how to extend Dubbo's components yourself.

Write a project of your own, one that can be packaged into a jar. Under its `src/main/resources` directory, create a `META-INF/services` directory, and put in a file named `com.alibaba.dubbo.rpc.Protocol`. In the file, add `my=com.bingo.MyProtocol`. Then push the jar to your own nexus private repository.

Then create a `dubbo provider` project, have it depend on the jar you made, and add a configuration in the spring configuration file:

```xml
<dubbo:protocol name=”my” port=”20000” />
```

When the provider starts, it loads the line `my=com.bingo.MyProtocol` from the configuration in our jar, and then uses the MyProtocol you defined according to your configuration. This is just a simple illustration: in the way above, you can replace a large number of Dubbo's internal components by dropping in your own jar and adding some configuration.

![dubbo-spi](diagram:distributed-system/dubbo-spi/dubbo-spi)

Dubbo provides a large number of extension points like the one above. That is, if you want to extend something, you just write a jar yourself, make your consumer or provider project depend on that jar, and in your jar configure, in the specified directory, a file named after the interface, containing `key=实现类` (key=implementation class).

Then for the corresponding component, such as `<dubbo:protocol>`, the implementation class corresponding to your key is used to implement an interface. You can extend Dubbo's various functions yourself and provide your own implementations.
