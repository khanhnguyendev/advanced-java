---
source:
  locale: zh
  slug: micro-services-technology-stack
  hash: 'sha256:v1:41e97a60f74cb09a02298727eba86ebf6ce2ca522412a1b01d094f5285fe25b8'
status: machine
translatedAt: '2026-10-14'
---
# Microservices Technology Stack

## Technology Stack

### Microservice development

Purpose: develop services quickly.

-   Spring
-   Spring MVC
-   Spring Boot

[Spring](https://spring.io/) is currently an indispensable framework for Java web developers. Spring Boot simplifies the configuration of Spring development and is also the mainstream development framework in the industry today.

### Microservice registration and Discovery

Purpose: discover services, register services, and manage services centrally.

#### Eureka

-   Eureka Server: provides the service registration service. After each node starts, it registers itself with Eureka Server.
-   Eureka Client: simplifies interaction with Eureka Server.
-   Spring Cloud Netflix: [GitHub](https://github.com/spring-cloud/spring-cloud-netflix), [documentation](https://cloud.spring.io/spring-cloud-netflix/reference/html/)

#### Zookeeper

> ZooKeeper is a centralized service for maintaining configuration information, naming, providing distributed synchronization, and providing group services.

[Zookeeper](https://github.com/apache/zookeeper) is a centralized service used to maintain configuration information, naming, distributed synchronization, and group services.

#### Differences between Zookeeper and Eureka

Zookeeper guarantees CP, while Eureka guarantees AP:

-   C: data consistency;
-   A: service availability;
-   P: the service's fault tolerance to network partition failures. These three properties cannot all be satisfied at the same time in any distributed system; at most two can be satisfied together.

### Microservice configuration management

Purpose: manage the configuration information of one or more services in a unified, centralized way.

#### [Disconf](https://github.com/knightliao/disconf)

Distributed Configuration Management Platform. It is a general-purpose component/platform focused on configuration management for all kinds of distributed systems, providing a unified configuration management service, and is a complete distributed configuration solution based on zookeeper.

#### [SpringCloudConfig](https://github.com/spring-cloud/spring-cloud-config)

#### [Apollo](https://github.com/ctripcorp/apollo)

Apollo is a distributed configuration center developed by Ctrip's framework department. It can centrally manage the configuration of an application across different environments and clusters, pushes configuration changes to the application in real time, and provides features such as standardized permissions and process governance. It is used in microservice configuration management scenarios.

### Authorization and Authentication

Purpose: according to the security rules or security policies set in the system, a user can access, and can only access, the resources they have been authorized for, no more and no less.

#### [Spring Security](https://spring.io/projects/spring-security)

#### [Apache Shiro](http://shiro.apache.org/)

> Apache Shiro™ is a powerful and easy-to-use Java security framework that performs authentication, authorization, cryptography, and session management. With Shiro’s easy-to-understand API, you can quickly and easily secure any application – from the smallest mobile applications to the largest web and enterprise applications.

### Batch processing

Purpose: process data or tasks of the same type in bulk

#### [Spring Batch](https://spring.io/projects/spring-batch)

### Scheduled Tasks

> Purpose: do something on a schedule.

#### [Quartz](http://www.quartz-scheduler.org/)

### Microservice Invocation (Protocols)

> Communication protocols

#### Rest

-   Exchange data by sending Rest requests over HTTP/HTTPS

#### RPC

-   Remote Procedure Call
-   It is a protocol for requesting a service from a program on a remote computer over the network, without needing to understand the underlying network technology. RPC does not depend on a specific network transport protocol; tcp, udp and others all work.

#### [gRPC](https://www.grpc.io/)

> A high-performance, open-source universal RPC framework

An RPC (remote procedure call) framework is in effect a mechanism that lets applications communicate with each other, and it also follows the server/client model. When using it, the client calls the API provided by the server just as if it were calling a local function.

#### RMI

-   Remote Method Invocation
-   Pure Java invocation

### Service API Invocation

> Purpose: communication between multiple services

#### [Feign(HTTP)](https://github.com/OpenFeign/feign)

The microservices of Spring Cloud Netflix are all exposed as HTTP APIs, so they can be called with Apache's HttpClient or Spring's RestTemplate. Feign is an HTTP client that is more convenient to use: calling a remote method feels just like calling a method in your own project.

### Circuit breaking

> Purpose: stop further requests once the number of requests reaches a certain threshold.

#### [Hystrix](https://github.com/Netflix/Hystrix)

> Hystrix is a latency and fault tolerance library designed to isolate points of access to remote systems, services and 3rd party libraries, stop cascading failure and enable resilience in complex distributed systems where failure is inevitable.

#### [Sentinel](https://github.com/alibaba/Sentinel)

> A lightweight powerful flow control component enabling reliability and monitoring for microservices. (A lightweight Java library for flow control, circuit breaking and degradation (fallback))

### Service load balancing

> Purpose: reduce the load on services and increase throughput

#### [Ribbon](https://github.com/Netflix/ribbon)

> Spring Cloud Ribbon is a client-side load balancing tool based on HTTP and TCP, built on Netflix Ribbon

#### [Nginx](https://github.com/nginx/nginx)

Nginx (engine x) is a high-performance HTTP and reverse proxy web server that also provides IMAP/POP3/SMTP services

#### Differences between Nginx and Ribbon

Nginx is server-side load balancing, while Ribbon is client-side load balancing. Nginx acts on Tomcat, while Ribbon acts on calls between services (RPC).

### Message queue

> Purpose: decouple business logic and process data asynchronously

#### [Kafka](http://kafka.apache.org/)

#### [RabbitMQ](https://www.rabbitmq.com/)

#### [RocketMQ](http://rocketmq.apache.org/)

#### [activeMQ](http://activemq.apache.org/)

### Log collection (elk)

> Purpose: collect the logs of each service to support log analysis, user profiling and so on

#### [Elasticsearch](https://github.com/elastic/elasticsearch)

#### [Logstash](https://github.com/elastic/logstash)

#### [Kibana](https://github.com/elastic/kibana)

### API gateway

> Purpose: external requests are intercepted and processed by the API gateway, then forwarded to the actual services

#### [Zuul](https://github.com/Netflix/zuul)

> Zuul is a gateway service that provides dynamic routing, monitoring, resiliency, security, and more.

### Service monitoring

> Purpose: show the running status of each service (CPU, memory, traffic and so on) in a visual or non-visual form

#### [Zabbix](https://github.com/jjmartres/Zabbix)

#### [Nagios](https://www.nagios.org/)

#### [Metrics](https://metrics.dropwizard.io)

### Service Tracing

> Purpose: make the call relationships between services clear

#### [Zipkin](https://github.com/openzipkin/zipkin)

#### [Brave](https://github.com/openzipkin/brave)

### Data storage

> Purpose: store data

#### Relational databases

##### [MySql](https://www.mysql.com/)

##### [Oracle](https://www.oracle.com/index.html)

##### [MsSQL](https://docs.microsoft.com/zh-cn/sql/?view=sql-server-ver15)

##### [PostgreSql](https://www.postgresql.org/)

#### Non-Relational databases

##### [Mongodb](https://www.mongodb.com/)

##### [Elasticsearch](https://github.com/elastic/elasticsearch)

### Cache

> Purpose: store data

#### [redis](https://redis.io/)

### Database and table Sharding

> Purpose: solutions for database and table sharding.

#### [ShardingSphere](http://shardingsphere.apache.org/)

#### [Mycat](http://www.mycat.io/)

### Service deployment

> Purpose: deploy projects quickly, take them online, and support continuous integration.

#### [Docker](http://www.docker.com/)

#### [Jenkins](https://jenkins.io/zh/)

#### [Kubernetes(K8s)](https://kubernetes.io/)

#### [Mesos](http://mesos.apache.org/)
