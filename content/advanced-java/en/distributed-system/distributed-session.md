---
source:
  locale: zh
  slug: distributed-session
  hash: 'sha256:v1:b209c76c073320513e15b846e34fceb488972bed6eb658f82422807c0c64e649'
status: machine
translatedAt: '2026-10-14'
---
# How to Implement a Distributed Session?

## Interview Question

How do you implement a distributed session when deploying in a cluster?

## Interviewer Psychology

The interviewer asked you a pile of questions about how Dubbo works. Once you can use Dubbo, you can turn a monolithic system into a distributed one, and after that a pile of problems follows. The biggest ones are **distributed transactions**, **API idempotency**, **distributed locks**, and finally the **distributed session**.

Of course, the problems in distributed systems go far beyond these. There are very many and the complexity is high. Here we only cover a few common ones, which are also the ones frequently asked in interviews.

## Answer Analysis

What is a session? The browser has a cookie that exists for a period of time, and every request carries a special `jsessionid cookie`. Based on it, the server can maintain a corresponding session scope in which some data can be stored.

Generally, as long as you do not close the browser, the cookie is still there, so the corresponding session is still there; but if the cookie is gone, the session is gone too. It is common in things like shopping carts and login state.

I will not say more about this; anyone who knows Java should know it.

Using a session this way is fine in a monolithic system, but in a distributed system with so many services, where is the session state maintained?

There are many methods, but the common ones are the following:

### Do Not Use a Session at All

Use a JWT token to store the user identity, and then fetch other information from the database or a cache. That way it does not matter which server a request is routed to.

### Tomcat + Redis

This is actually quite convenient. The code that uses the session stays the same as before, still relying on Tomcat's native session support. You then use something called `Tomcat RedisSessionManager`, so that all the Tomcat instances we deploy store session data in Redis.

Configure it in the Tomcat configuration file:

```xml
<Valve className="com.orangefunction.tomcat.redissessions.RedisSessionHandlerValve" />

<Manager className="com.orangefunction.tomcat.redissessions.RedisSessionManager"
         host="{redis.host}"
         port="{redis.port}"
         database="{redis.dbnum}"
         maxInactiveInterval="60"/>
```

Then specify the Redis host and port, and that is it.

```xml
<Valve className="com.orangefunction.tomcat.redissessions.RedisSessionHandlerValve" />
<Manager className="com.orangefunction.tomcat.redissessions.RedisSessionManager"
	 sentinelMaster="mymaster"
	 sentinels="<sentinel1-ip>:26379,<sentinel2-ip>:26379,<sentinel3-ip>:26379"
	 maxInactiveInterval="60"/>
```

You can also use the form above to save session data on a highly available Redis cluster backed by Redis Sentinel; that works too.

### Spring Session + Redis

The second approach above is tightly coupled to the Tomcat container. If I want to migrate the web container to Jetty, do I have to configure everything for Jetty all over again?

The Tomcat + Redis approach works well, but it **depends heavily on the web container**, which makes it hard to port the code to another web container, especially if you change the technology stack. What if you move to Spring Cloud or Spring Boot?

So the better option now is the one-stop Java solution, which is Spring. Spring basically covers most of the frameworks we need: Spring Cloud for microservices and Spring Boot for scaffolding, so using Spring Session is a good choice.

Configure it in pom.xml:

```xml
<dependency>
  <groupId>org.springframework.session</groupId>
  <artifactId>spring-session-data-redis</artifactId>
  <version>1.2.1.RELEASE</version>
</dependency>
<dependency>
  <groupId>redis.clients</groupId>
  <artifactId>jedis</artifactId>
  <version>2.8.1</version>
</dependency>
```

Configure it in the Spring configuration file:

```xml
<bean id="redisHttpSessionConfiguration"
     class="org.springframework.session.data.redis.config.annotation.web.http.RedisHttpSessionConfiguration">
    <property name="maxInactiveIntervalInSeconds" value="600"/>
</bean>

<bean id="jedisPoolConfig" class="redis.clients.jedis.JedisPoolConfig">
    <property name="maxTotal" value="100" />
    <property name="maxIdle" value="10" />
</bean>

<bean id="jedisConnectionFactory"
      class="org.springframework.data.redis.connection.jedis.JedisConnectionFactory" destroy-method="destroy">
    <property name="hostName" value="${redis_hostname}"/>
    <property name="port" value="${redis_port}"/>
    <property name="password" value="${redis_pwd}" />
    <property name="timeout" value="3000"/>
    <property name="usePool" value="true"/>
    <property name="poolConfig" ref="jedisPoolConfig"/>
</bean>
```

Configure it in web.xml:

```xml
<filter>
    <filter-name>springSessionRepositoryFilter</filter-name>
    <filter-class>org.springframework.web.filter.DelegatingFilterProxy</filter-class>
</filter>
<filter-mapping>
    <filter-name>springSessionRepositoryFilter</filter-name>
    <url-pattern>/*</url-pattern>
</filter-mapping>
```

Sample code:

```java
@RestController
@RequestMapping("/test")
public class TestController {

    @RequestMapping("/putIntoSession")
    public String putIntoSession(HttpServletRequest request, String username) {
        request.getSession().setAttribute("name",  "leo");
        return "ok";
    }

    @RequestMapping("/getFromSession")
    public String getFromSession(HttpServletRequest request, Model model){
        String name = request.getSession().getAttribute("name");
        return name;
    }
}
```

The code above works. Spring Session is configured to store session data in Redis, and a Spring Session filter is configured, so all session-related operations are handled by Spring Session. In the code you then use the native session operations, which fetch data from Redis through Spring Session.

There are many ways to implement a distributed session, and what I described are only a few common ones. Tomcat + Redis was commonly used in the early days, but it is tightly coupled to Tomcat; in recent years, Spring Session has been used.
