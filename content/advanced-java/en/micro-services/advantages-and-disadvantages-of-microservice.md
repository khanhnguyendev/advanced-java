---
source:
  locale: zh
  slug: advantages-and-disadvantages-of-microservice
  hash: 'sha256:v1:19fdaa2c11f64fa38c25e2d6b77a2004693767255279d05b88c4d47fd94595ca'
status: machine
translatedAt: '2026-10-14'
---
# Advantages and Disadvantages of Microservices Architecture

## Developing a Monolithic Application

Suppose you are about to develop a taxi-hailing application to compete with Uber and Hailo. After initial meetings and requirements analysis, you might start the new project by hand or with a generator based on Rails, Spring Boot, Play or Maven. Its hexagonal architecture is modular, as shown in the diagram below:

![monolithic-application-architecture-diagram](diagram:micro-services/advantages-and-disadvantages-of-microservice/monolithic-application-architecture-diagram)

At the core of the application is the business logic, implemented by modules that define services, domain objects and events. Surrounding the core are adapters that interface with the outside world. Adapters include database access components, messaging components that produce and handle messages, and web modules that expose an API or support a UI.

Although the logic is modular, the application is ultimately packaged and deployed as a monolith. The exact format depends on the application's language and framework. For example, many Java applications are packaged as WAR files and deployed on Tomcat or Jetty, while other Java applications are packaged as self-contained JARs. Likewise, Rails and Node.js applications are packaged as a hierarchical directory.

This style of application development is very common, because IDEs and other tools are good at building a single application. Such applications are also easy to debug: simply run the application and drive the UI with Selenium to do end-to-end testing. Monolithic applications are also easy to deploy: you just copy the packaged application to a server, and you can scale it easily by running multiple copies behind a load balancer. In the early days, applications like this worked well.

## Drawbacks of Monolithic Applications

Unfortunately, this simple approach has a big limitation. A simple application grows larger over time. In every sprint, the development team faces new "stories" and then writes a lot of new code. After a few years, the small and simple application has turned into a huge monster. Here is an example: I recently talked to a developer who was writing a tool to analyze the dependencies between the JAR files in one of their applications, which had millions of lines of code. I am quite sure this code is exactly the kind of monster that many developers produce through years of effort.

Once your application has become a large and complex monster, the development team is surely in pain. Agile development and deployment become very hard going. The main problem is that the application is so complex that no single developer can understand it. As a result, fixing bugs and adding new features correctly becomes very difficult and time-consuming. Team morale also declines: if the code is hard to understand, it cannot be modified correctly, and you end up in a huge, incomprehensible quagmire.

A monolith also slows down development. The larger the application, the longer the startup time. For example, a recent survey showed that application startup times sometimes exceeded 12 minutes. I have also heard of applications that need 40 minutes to start. If developers need to restart the application frequently, most of their time is spent waiting, and productivity suffers badly.

In addition, a complex and huge monolith is hostile to continuous development. Today it is the norm for SaaS applications to change many times a day, which is very hard for the monolithic model. Moreover, the impact of such changes is not well understood, so a lot of manual testing has to be done. Continuous deployment then becomes difficult as well.

A monolith is also very hard to scale when different modules have conflicting resource requirements. For example, one module that implements CPU-intensive logic should be deployed on AWS EC2 Compute Optimized instances, while another, an in-memory database module, is better suited to EC2 Memory-optimized instances. Because these modules are deployed together, however, you have to compromise on the hardware choice.

Another problem with monoliths is reliability. Because all modules run in a single process, a bug in any one module, such as a memory leak, can potentially bring down the entire process. Moreover, because all instances of the application are identical, this bug affects the reliability of the whole application.

Finally, monoliths make it very difficult to adopt new architectures and languages. For example, imagine you have two million lines of code written with the XYZ framework. Changing to the ABC framework would be very expensive in both time and cost, even if ABC is better. It is therefore an insurmountable gulf, and you have to bow to your initial choice.

To sum up: at the beginning you have a very successful, business-critical application, and later it turns into a huge, incomprehensible monster. Because it uses outdated, inefficient technology, it is hard to hire promising developers. The application cannot scale, its reliability is low, and in the end agile development and deployment become impossible.

So what can be done?

## The Microservices Architecture: Dealing with Complexity

Many companies, such as Amazon, eBay and Netflix, have solved the problems above by adopting the microservices architecture pattern. The idea is not to build one huge monolithic application, but to decompose the application into small, interconnected microservices.

A microservice generally implements a specific piece of functionality, such as order management or customer management. Each microservice is a miniature hexagonal application with its own business logic and adapters. Some microservices publish an API for other microservices and application clients to use. Others implement a web UI. At runtime, each instance may be a cloud VM or a Docker container.

For example, one possible decomposition of the system described earlier looks like this:

![deal-with-complex things-1](diagram:micro-services/advantages-and-disadvantages-of-microservice/deal-with-complex-things-1)

Each functional area of the application is implemented by a microservice. In addition, the web application is split into a series of simple web applications (for example, one for passengers and one for taxi drivers). Such a split makes it easier to deploy for different users, devices and specific use cases.

Each backend service exposes a REST API, and many services themselves consume APIs provided by other services. For example, driver management uses the notification service to tell a driver about a potential trip. The UI services invoke other services to update web pages. All services use asynchronous, message-based communication. The internal mechanisms of microservices will be discussed in later articles of the series.

Some REST APIs are also exposed to the mobile applications used by passengers and drivers. These applications do not access the backend services directly; instead, messages are relayed through an API Gateway. The API Gateway is responsible for tasks such as load balancing, caching, access control, and API metering and monitoring, and it can be conveniently implemented with NGINX. A later article will cover the API Gateway.

![deal-with-complex-things-2](diagram:micro-services/advantages-and-disadvantages-of-microservice/deal-with-complex-things-2)

The microservices architecture pattern corresponds to the Y axis of the Scale Cube, a three-dimensional scaling model described in the book _The Art of Scalability_. The other two scaling axes are the X axis, which consists of running multiple copies of the application behind a load balancer, and the Z axis, which routes requests to the relevant service.

An application can basically be described along these three dimensions. The Y axis represents decomposing the application into microservices. At runtime, the X axis represents running multiple instances behind a load balancer to provide throughput. Some applications may also use the Z axis to partition services. The diagram below shows how the trip management service is deployed on Docker running on AWS EC2.

![deal-with-complex-things-3](diagram:micro-services/advantages-and-disadvantages-of-microservice/deal-with-complex-things-3)

At runtime, the trip management service consists of multiple service instances. Each service instance is a Docker container. To ensure high availability, these containers generally run on multiple cloud VMs. In front of the service instances is a load balancer such as NGINX, which distributes requests among the instances. The load balancer may also handle other concerns, such as caching, access control, API metering and monitoring.

This microservices architecture pattern profoundly affects the relationship between the application and the database. **Rather than sharing a single database among many services as traditionally done, in a microservices architecture each service has its own database.** This approach also affects enterprise-level data models. It also means data is duplicated, but if you want the benefits microservices bring, a database per service is a must, because the architecture requires this loose coupling. The diagram below shows the database architecture of the example application.

![deal-with-complex-things-4](diagram:micro-services/advantages-and-disadvantages-of-microservice/deal-with-complex-things-4)

Every service has its own database, and each service can also use the type of database that suits it best, which is known as a polyglot persistence architecture. For example, driver management (finding which driver is closer to a passenger) must use a database that supports geospatial queries.

On the surface, the microservices architecture pattern looks a bit like SOA, in that both consist of multiple services. But you can look at it from another angle: the microservices architecture pattern is SOA without web services (WS-\*) and without an ESB. Microservice applications prefer simple, lightweight protocols such as REST over WS-\*, and avoid ESBs and ESB-like functionality inside microservices. The microservices architecture pattern also rejects SOA concepts such as the canonical schema.

## Benefits of the Microservices Architecture

The microservices architecture pattern has many benefits. First, it solves the complexity problem by decomposing a huge monolith into a set of services. With functionality unchanged, the application is broken into manageable pieces, or services. Each service has a well-defined boundary in the form of an RPC- or message-driven API. The microservices architecture pattern delivers a level of modularity that is extremely difficult to achieve with monolithic code, so individual services are much easier to develop, understand and maintain.

Second, this architecture allows each service to be developed by a dedicated team. Developers are free to choose their development technology and provide an API service. Of course, many companies try to avoid chaos by offering only certain technology choices. Nevertheless, this freedom means developers are not forced to use outdated technology adopted at the start of a project; they can choose current technology. Moreover, because services are relatively simple, even rewriting old code with current technology is not very hard.

Third, in the microservices architecture pattern each microservice is deployed independently. Developers no longer need to coordinate the effect of other services' deployments on their own service. This change speeds up deployment. A UI team can use A/B testing and quickly deploy changes. The microservices architecture pattern makes continuous deployment possible.

Finally, the microservices architecture pattern lets each service scale independently. You can deploy each service at the scale its demand requires, and you can even use hardware better suited to a service's resource needs. For example, you can deploy a CPU-intensive service on EC2 Compute Optimized instances and an in-memory database on EC2 memory-optimized instances.

## Drawbacks of the Microservices Architecture

Thirty years ago Fred Brooks wrote, "there are no silver bullets", and like any other technology, the microservices architecture has drawbacks. One of them resembles its name: the word "micro" emphasizes the size of the service, and in fact some developers advocate building somewhat larger groups of services of 10 to 100 LOC. Although small services are preferred, do not forget that this is only a means to an end, not the goal itself. The goal of microservices is to decompose the application effectively so as to achieve agile development and deployment.

Another major drawback is that a microservices application is a distributed system, which brings inherent complexity. Developers need to choose between RPC and messaging and implement an inter-process communication mechanism. Worse, they must write code to handle partial failures such as slow or unavailable message delivery. Of course this is not especially hard, but compared with language-level method calls or process calls in a monolith, the technique is somewhat more complex under microservices.

Another challenge of microservices comes from the partitioned database architecture. It is common in business transactions to update several business entities at the same time. Such transactions are easy in a monolith because there is only one database. In a microservices architecture application, you need to update the different databases used by different services. Using distributed transactions is not necessarily a good choice, not only because of the CAP theorem, but also because today's highly scalable NoSQL databases and messaging middleware do not support this requirement. In the end you have to use an eventual consistency approach, which places higher demands and challenges on developers.

Testing an application based on the microservices architecture is also a complex task. For example, with the popular Spring Boot framework, testing the REST API of a monolithic web application is easy. By contrast, testing the same service requires starting all the services related to it (or at least stubs of those services). Again, do not underestimate the complexity that adopting a microservices architecture brings.

Another challenge is that changes in an application built with the microservices architecture pattern ripple across multiple services. For example, suppose you are implementing a use case that requires changes to services A, B and C, where A depends on B and B depends on C. In a monolith, you just change the relevant modules, integrate the changes and deploy. By contrast, the microservices architecture pattern requires you to consider the effect of the change on different services. For example, you need to update service C first, then B, and only then A. Fortunately, many changes typically affect only one service, and changes that need to be coordinated across multiple services are rare.

Deploying a microservices application is also complex. A monolithic application simply deploys to servers behind a load balancer, with each application instance configured with infrastructure services such as a database and messaging middleware. A microservices application, by contrast, generally consists of a large number of services. For example, according to Adrian Cockcroft, Hailo consists of 160 different services and Netflix has about 600. Each service has multiple instances. This creates many parts that need to be configured, deployed, scaled and monitored. In addition, you also need to implement a service discovery mechanism (to be covered in a later article) to discover the addresses (server address and port) of the services it communicates with. Traditional approaches cannot solve problems this complex. Consequently, successfully deploying a microservices application requires developers to have good control over deployment methods and a high degree of automation.

One approach to automation is to use a PaaS such as Cloud Foundry. A PaaS gives developers a simple way to deploy and manage microservices, with all of these problems packaged and solved inside. At the same time, the system and network experts who configure the PaaS can apply best practices and policies to simplify these problems. Another approach to automatically deploying a microservices application is to build your own PaaS-like system. A typical starting point is to use a clustering solution such as Mesos or Kubernetes together with Docker. In later articles of the series we will look at how software-based deployment approaches such as NGINX can conveniently provide caching, access control, API metering and monitoring at the microservice level.

## Summary

Building complex applications is truly hard. The monolithic architecture suits lightweight, simple applications; if you use it to develop a complex application, things really will go badly. The microservices architecture pattern can be used to build complex applications, although of course this architecture model has its own drawbacks and challenges.
