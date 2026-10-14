---
source:
  locale: zh
  slug: dubbo-serialization-protocol
  hash: 'sha256:v1:13b508c4f37ff00beee59d422250cef2061fc4a5f6b2ac9c19f7e465c6e76366'
status: machine
translatedAt: '2026-10-14'
---
# Dubbo Serialization Protocols

## Interview question

Which communication protocols does Dubbo support? Which serialization protocols does it support? Explain the data structure of Hessian. Do you know PB? Why is PB the most efficient?

## Interviewer psychology

The previous question, explaining Dubbo's basic working principle, is something you must know: at least which layers Dubbo is divided into, and how you normally initiate an RPC request. Registration, discovery, and invocation are the basics.

After that the interviewer can dig into the lower level, for example starting with the serialization protocol: how does a normal RPC go over the wire?

## Answer analysis

**Serialization** is the process of converting a data structure or an object into a binary string, and **deserialization** is the process of converting the binary string generated during serialization back into a data structure or an object.

![serialize-deserialize](asset:distributed-system/dubbo-serialization-protocol/serialize-deserialize.png)

### Dubbo supports different communication protocols

-   dubbo protocol `dubbo://`

The **default** is the dubbo protocol: a single long connection with NIO asynchronous communication, using hessian as the serialization protocol. It is used when the data volume per transfer is small (within 100kb per request) but concurrency is very high, and when the number of service consumer machines is far greater than the number of service provider machines.

To support high-concurrency scenarios, there are usually only a few service provider machines but hundreds of service consumers, and the daily call volume may reach hundreds of millions. A long connection is the most suitable here: maintain one long connection with each service consumer, which may come to only 100 connections in total. After that, NIO asynchronous communication directly over the long connections can support high-concurrency requests.

A long connection, put simply, means that after the connection is established you can keep sending requests without establishing a connection again.

![dubbo-keep-connection](asset:distributed-system/dubbo-serialization-protocol/dubbo-keep-connection.png)

A short connection, on the other hand, has to be re-established every time before a request is sent.

![dubbo-not-keep-connection](asset:distributed-system/dubbo-serialization-protocol/dubbo-not-keep-connection.png)

-   rmi protocol `rmi://`

The RMI protocol is implemented with the JDK-standard java.rmi.\*, using blocking short connections and the JDK-standard serialization. With multiple short connections, it suits the case where the numbers of consumers and providers are about equal and is suitable for file transfer, but it is rarely used.

-   hessian protocol `hessian://`

The Hessian 1 protocol is used to integrate Hessian services. Hessian communicates over Http underneath and exposes services through a Servlet, and Dubbo embeds Jetty as the server implementation by default. It uses the hessian serialization protocol with multiple short connections, suits the case where there are more providers than consumers, and is suitable for file transfer, but it is rarely used.

-   http protocol `http://`

A remote call protocol based on HTTP forms, implemented with Spring's HttpInvoker. It uses form serialization.

-   thrift protocol `thrift://`

The thrift protocol currently supported by Dubbo is an extension of the native thrift protocol, adding some extra header information on top of it, such as service name and magic number.

-   webservice `webservice://`

A remote call protocol based on WebService, implemented on Apache CXF's frontend-simple and transports-http. It uses SOAP text serialization.

-   memcached protocol `memcached://`

An RPC protocol implemented on memcached.

-   redis protocol `redis://`

An RPC protocol implemented on Redis.

-   rest protocol `rest://`

REST call support implemented on the standard Java REST API, JAX-RS 2.0 (short for Java API for RESTful Web Services).

-   gPRC protocol `grpc://`

Dubbo has supported the gRPC protocol since version 2.7.5. Developers who plan to communicate over HTTP/2, or who want the Stream, back pressure, and Reactive programming capabilities that gRPC brings, can consider enabling the gRPC protocol.

### Serialization protocols supported by Dubbo

Dubbo supports several serialization protocols: hession, Java binary serialization, json, and SOAP text serialization. But hessian is its default serialization protocol.

### Explain the data structure of Hessian

Hessian's object serialization mechanism has 8 primitive types:

-   raw binary data
-   boolean
-   64-bit date (a date as a 64-bit millisecond value)
-   64-bit double
-   32-bit int
-   64-bit long
-   null
-   UTF-8 encoded string

It also includes 3 recursive types:

-   list for lists and arrays
-   map for maps and dictionaries
-   object for objects

And one special type:

-   ref: used to represent a reference to a shared object.

### Why is PB the most efficient?

PB performs so well mainly because of two things. **First**, it uses the proto compiler to serialize and deserialize automatically, which is very fast, probably `20~100` times faster than `XML` and `JSON`. **Second**, its data compression is good, meaning the data volume after serialization is small. Because the volume is small, there are optimizations in bandwidth and speed during transfer.
