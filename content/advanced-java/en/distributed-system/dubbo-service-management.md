---
source:
  locale: zh
  slug: dubbo-service-management
  hash: 'sha256:v1:b4ab9a80ecfc2407c23b6dbff678cd47ace0de3dc758f83381902b7fd7d5193d'
status: machine
translatedAt: '2026-10-14'
---
# How to Perform Service Governance with Dubbo

## Interview question

How do you do service governance, service degradation (fallback), failure retry, and timeout retry based on Dubbo?

## Interviewer psychology

If you are asked about service governance, the interviewer is really checking whether you have the idea of **service governance**, because it is a problem that anyone who has worked on complex microservices will certainly run into.

**Service degradation** is a must-have topic in complex distributed systems. Distributed systems call each other back and forth, so if any one system fails and you do not degrade, does the whole thing collapse outright? That would be terrible.

**Failure retry**: network requests are so frequent in a distributed system that if one fails by accident because of a network problem, should it be retried?

**Timeout retry**: same as above. If the network is a little slow by accident and the call times out, how do you retry?

## Answer analysis

### Service governance

#### 1. Automatic generation of call chains

Take a large distributed system, or, in terms of the popular microservices architecture today, a system in which **a distributed system is made up of a large number of services**. How do these services call each other? What is the call chain? Honestly, eventually nobody can figure it out, because there are simply too many services, perhaps hundreds or even thousands.

So in a distributed system built on Dubbo, the calls between services need to be recorded automatically, and then **the dependencies and call chains between services are generated** automatically and drawn as a diagram, so that everyone can see them, right?

![dubbo-service-invoke-road](diagram:distributed-system/dubbo-service-management/dubbo-service-invoke-road)

#### 2. Service access pressure and duration statistics

You need to automatically count **the number of calls and the access latency between APIs and between services**, at two levels.

-   One level is API granularity: how many times each API of each service is called per day, and what the request latency is at the three tiers TP50/TP90/TP99.
-   The second level starts from the source entry point: a complete request chain passes through dozens of services to complete one request, how many times the full chain runs per day, and what the full-chain request latency is at TP50/TP90/TP99.

Once these are all in place, you can then see where the pressure on the current system mainly lies, and how to scale out and optimize.

#### 3. Others

-   Service layering (avoiding circular dependencies)
-   Failure monitoring and alerting for call chains
-   Service authentication
-   Availability monitoring of each service (API call success rate? How many 9s? 99.99%, 99.9%, 99%)

### Service degradation

For example, service A calls service B, but service B goes down. Service A retries calling service B a few times and it still fails, so it degrades directly, takes a backup logic, and returns a response to the user.

Here is an example. We have an interface `HelloService`. `HelloServiceImpl` has the concrete implementation of this interface.

```java
public interface HelloService {
   void sayHello();
}

public class HelloServiceImpl implements HelloService {
    public void sayHello() {
        System.out.println("hello world......");
    }
}
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:dubbo="http://code.alibabatech.com/schema/dubbo"
    xsi:schemaLocation="http://www.springframework.org/schema/beans        http://www.springframework.org/schema/beans/spring-beans.xsd        http://code.alibabatech.com/schema/dubbo        http://code.alibabatech.com/schema/dubbo/dubbo.xsd">

    <dubbo:application name="dubbo-provider" />
    <dubbo:registry address="zookeeper://127.0.0.1:2181" />
    <dubbo:protocol name="dubbo" port="20880" />
    <dubbo:service interface="com.zhss.service.HelloService" ref="helloServiceImpl" timeout="10000" />
    <bean id="helloServiceImpl" class="com.zhss.service.HelloServiceImpl" />

</beans>

<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:dubbo="http://code.alibabatech.com/schema/dubbo"
    xsi:schemaLocation="http://www.springframework.org/schema/beans        http://www.springframework.org/schema/beans/spring-beans.xsd        http://code.alibabatech.com/schema/dubbo        http://code.alibabatech.com/schema/dubbo/dubbo.xsd">

    <dubbo:application name="dubbo-consumer"  />

    <dubbo:registry address="zookeeper://127.0.0.1:2181" />

    <dubbo:reference id="fooService" interface="com.test.service.FooService"  timeout="10000" check="false" mock="return null">
    </dubbo:reference>

</beans>

```

When our call to the interface fails, we can use `mock` to uniformly return null.

The value of mock can also be changed to true, and then you implement a Mock class under the same path as the interface, named by the rule "interface name + `Mock`" suffix. Then you implement your own degradation logic in the Mock class.

```java
public class HelloServiceMock implements HelloService {
    public void sayHello() {
        // degradation (fallback) logic
    }
}
```

### Failure retry and timeout retry

Failure retry means that if the consumer's call to the provider fails, for example by throwing an exception, it should be possible to retry; a call that times out can be retried too. The configuration is as follows:

```xml
<dubbo:reference id="xxxx" interface="xx" check="true" async="false" retries="3" timeout="2000"/>
```

Here is an example.

An API of some service takes 5s, and you cannot just wait idly on your side. After you configure timeout, you wait 2s, and if there is still no response, you simply withdraw and do not wait for it any longer.

You can describe how you set these parameters, combined with the concrete scenarios of your company:

-   `timeout`: generally set to `200ms`; we consider that a call must not go beyond `200ms` without returning.
-   `retries`: set retries, generally for read requests. For example, when you query some data, you can set retries, and if the first read gets nothing and errors, it retries the specified number of times and tries to read again.
