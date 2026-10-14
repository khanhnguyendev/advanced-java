---
source:
  locale: zh
  slug: dubbo-operating-principle
  hash: 'sha256:v1:6d880021d6b82d8915339933efc6bc36fccb10276bd820e806023eb123109eb9'
status: machine
translatedAt: '2026-10-14'
---
# How Dubbo Works

## Interview question

Explain how Dubbo works. Can communication continue if the service registry goes down? Describe the flow of one RPC request.

## Interviewer psychology

For MQ, ES, Redis, and Dubbo, the interviewer starts with some **thinking questions** and **principles**, such as the principle of Kafka's high availability architecture, the principle of ES's distributed architecture, the principle of Redis's threading model, and the principle of how Dubbo works. After that come problems you may run into in a production environment, because every technology can cause some problems in production once introduced. Then something more comprehensive, namely system design, such as asking you to design an MQ, a search engine, a cache, or an RPC framework.

Since we have started talking about distributed systems, naturally the focus is first on Dubbo. After all, Dubbo is in fact the RPC framework standard for the distributed systems of most companies today, and a whole microservices architecture can also be built on Dubbo, although it takes a lot of development on your own.

Of course, Spring Cloud became very hot starting last year, and many companies are now switching to Spring Cloud, which is, after all, an all-in-one bundle for the microservices architecture. But many companies are still using Dubbo, so Dubbo will certainly remain a focus of interviews for now. What is more, Dubbo has now resumed open-source community maintenance and has been donated to Apache, so it should still have a certain market and standing in the future.

Since we are talking about Dubbo, we naturally start with how Dubbo works: first describe the architecture with which Dubbo supports RPC distributed calls, and then describe how Dubbo completes one RPC request for you, right?

## Answer analysis

### How Dubbo works

-   Layer 1: the service layer, the API layer, implemented by service providers and consumers
-   Layer 2: the config layer, the configuration layer, mainly for all kinds of Dubbo configuration
-   Layer 3: the proxy layer, the service proxy layer. For both consumer and provider, Dubbo generates a proxy for you, and the proxies communicate over the network
-   Layer 4: the registry layer, the service registration layer, responsible for service registration and discovery
-   Layer 5: the cluster layer, which encapsulates the routing and load balancing of multiple service providers and combines multiple instances into one service
-   Layer 6: the monitor layer, the monitoring layer, which monitors the call count and call time of RPC APIs
-   Layer 7: the protocal layer, the remote call layer, which encapsulates RPC calls
-   Layer 8: the exchange layer, the information exchange layer, which encapsulates the request-response pattern and turns synchronous into asynchronous
-   Layer 9: the transport layer, the network transport layer, which abstracts mina and netty into a unified API
-   Layer 10: the serialize layer, the data serialization layer

### Workflow

-   Step 1: the provider registers with the service registry
-   Step 2: the consumer subscribes to the service from the service registry, and the service registry notifies the consumer of the registered service
-   Step 3: the consumer calls the provider
-   Step 4: both the consumer and the provider notify the monitoring center asynchronously

![dubbo-operating-principle](diagram:distributed-system/dubbo-operating-principle/dubbo-operating-principle)

### Can communication continue if the service registry goes down?

Yes, because when initialization first starts, the consumer **pulls the provider's address and other information into a local cache**, so communication can continue even if the service registry goes down.
