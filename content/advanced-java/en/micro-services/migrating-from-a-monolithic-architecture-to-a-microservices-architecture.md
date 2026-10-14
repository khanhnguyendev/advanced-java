---
source:
  locale: zh
  slug: migrating-from-a-monolithic-architecture-to-a-microservices-architecture
  hash: 'sha256:v1:ae97d9fc511e42d08f7d344b0fbefcd7bd67c1d1c1e5f3a0617b5c99122386a2'
status: machine
translatedAt: '2026-10-14'
---
# Overview of Migrating to Microservices

Migrating a monolithic application to a microservices architecture is a form of application modernization, something much like what developers have been doing for generations. In fact, when migrating, we can reuse some of those ideas.

One strategy is this: do not do a big bang rewrite of the code (a rewrite is only an option when you are taking on building an entirely new microservices-based application). A rewrite sounds appealing, but in practice it is full of risk and may well end in failure. As Martin Fowler put it:

> “the only thing a Big Bang rewrite guarantees is a Big Bang!”

Instead, you should migrate the monolith incrementally. You gradually build new applications as microservices and integrate them with the old monolith. Over time, the share of the monolith in the overall architecture shrinks until it either disappears or becomes just another microservice. This strategy is a bit like servicing a car while driving it down the highway at 70 miles per hour: it is challenging, but far less risky than a rewrite.

Martin Fowler calls this modernization strategy the Strangler application, named after the strangler vine (also called the strangler fig) found in rainforests. To reach the top of the forest, a strangler vine winds itself around a tree as it grows. After some time the tree dies, leaving a tree-shaped vine behind. The application pattern works the same way: new microservice applications are built around the legacy application, and the legacy application gradually fades off the stage.

Let us look at some other viable strategies.

## Strategy 1: Stop Digging

The Law of Holes says that when you find yourself in a hole, you should stop digging. This is the best advice when a monolith has become unmanageable. In other words, you should stop making the monolith bigger. When developing new functionality, you should not add new code to the old monolith; the best approach is to implement the new functionality as an independent microservice. This is shown in the figure below:

![1](diagram:micro-services/migrating-from-a-monolithic-architecture-to-a-microservices-architecture/law-of-holes)

Besides the new service and the legacy application, there are two more modules. The first is a request router, which handles incoming (HTTP) requests and is a bit like the API gateway mentioned earlier. The router sends requests for new functionality to the newly developed service and sends legacy requests to the monolith.

The other is the glue code, which integrates the microservice with the monolith. A microservice rarely stands alone and often needs to access data in the monolith. The glue code, which may live in the monolith, in the service, or in both, is responsible for data integration. The microservice reads and writes monolith data through the glue code.

A microservice has three ways to access the monolith's data:

-   Calling a remote API provided by the monolith
-   Accessing the monolith's database directly
-   Maintaining its own copy of the data, synchronized from the monolith

The glue code is also called an anti-corruption layer, because it protects the microservice's brand-new domain model from being polluted by the legacy monolith's domain model. The glue code provides translation between the two models. The term anti-corruption layer first appeared in Eric Evans' must-read book _Domain Driven Design_ and was later distilled into a white paper. Building an anti-corruption layer may seem unimportant, but it is a necessary part of avoiding the monolithic quagmire.

Implementing new functionality as lightweight microservices has many advantages, for example it stops the monolith from becoming even more unmanageable. The microservice itself can be developed, deployed and scaled independently. Adopting a microservices architecture gives developers a very different first-hand experience.

However, this approach does not solve any of the monolith's own problems. To solve those, you have to dig into the monolith and make changes to it. Let us look at strategies for doing that.

## Strategy 2: Separate the Frontend from the Backend

One strategy for reducing the complexity of a monolith is to split the presentation layer from the business logic and data access layers. A typical enterprise application consists of at least three different elements:

1. Presentation layer: handles HTTP requests and either responds to a REST API request or serves an HTML-based graphical interface. For an application with a complex user interface, the presentation layer is often a significant part of the code.

2. Business logic layer: the core of the application, which carries out the business logic.

3. Data access layer: accesses infrastructure elements such as databases and message brokers.

There is a clear separation between the presentation layer and the business and data access layers. The business layer has a coarse-grained API made up of several facets, which encapsulates the business logic elements. That API is a natural boundary along which the monolith can be split into two smaller applications: one for the presentation layer, and the other for the business and data access logic. After the split, the presentation application calls the business logic application remotely. The figure below shows the architecture before and after the migration:

![2](diagram:micro-services/migrating-from-a-monolithic-architecture-to-a-microservices-architecture/before-and-after-migration)

Splitting the monolith this way has two benefits. First, the two parts of the application can be developed, deployed and scaled independently. In particular, it lets presentation-layer developers iterate quickly on the user interface and run A/B tests. Second, it exposes remote APIs that microservices can call.

However, this strategy is only a partial solution. It is quite possible that one or both parts of the application are still unmanageable, so you need the third strategy to eliminate the remaining monolithic architecture.

## Strategy 3: Extract Services

The third migration strategy is to extract certain modules from the monolith into independent microservices. Each time you extract a module into a microservice, the monolith gets simpler. Once enough modules have been converted, the monolith is no longer a problem: it either disappears or becomes simple enough to be just another service.

### Prioritizing Which Modules to Convert into Microservices

A huge, complex monolith consists of tens or even hundreds of modules, each of which is a candidate for extraction. Deciding which module to extract first is usually a challenge. It is generally best to start with the modules that are easiest to extract, which lets developers accumulate experience that pays off greatly in later modularization work.

Converting a module into a microservice is usually time-consuming, so modules can be ranked by the benefit they bring. Starting with the modules that change frequently typically gives the biggest benefit. Once a module has been converted into a microservice, it can be developed and deployed independently, which speeds up development.

Another ranking criterion is to extract the big resource consumers first. For example, extracting an in-memory database into a microservice is very useful, because it can then be deployed on a host with a lot of memory. Likewise, extracting algorithmic code that is sensitive to compute resources is also very beneficial, because such a service can be deployed on a host with many CPUs. Converting resource-hungry modules into microservices makes the application easier to scale.

It is also helpful to look for existing coarse-grained boundaries when deciding which module to extract, which makes the porting work easier and simpler. For example, a module that only exchanges asynchronous messages with the rest of the application is an obvious boundary and can easily be converted into a microservice.

### How to Extract a Module

The first step in extracting a module is to define a coarse-grained interface between the module and the monolith. Because the monolith needs data from the microservice and vice versa, it is more like a two-way API. Developing such an API is challenging, because you have to balance the dependencies against a fine-grained interface pattern. It is especially challenging for a business logic layer that uses the domain model pattern, so code often has to be changed to resolve the dependency issues, as shown in the figure:

Once the coarse-grained interface is in place, the module can be turned into an independent microservice. To do that, you must write code so that the monolith and the microservice exchange information through APIs that use an inter-process communication (IPC) mechanism. The figure shows the comparison before and after the migration:

![3](diagram:micro-services/migrating-from-a-monolithic-architecture-to-a-microservices-architecture/30103116_zccm)

In this example, module Z, which uses module Y, is the candidate for extraction, and its elements are used by module X. The first step of the migration is to define a set of coarse-grained APIs. The first interface is the internal interface used by module X to invoke module Z. The second is the external interface used by module Z to invoke module Y.

The second step of the migration is to convert the module into an independent service. Both the internal and external interfaces use IPC-based code. Module Z is generally integrated into a microservices infrastructure framework to handle problems that arise during the cutover, such as service discovery.

Once the module has been extracted, you can develop, deploy and scale another service that is independent of the monolith and of other services. You can also write the service from scratch; in that case, the API code that integrates the service with the monolith is called an anti-corruption layer, and it translates between the two domain models. Every service you extract is another step toward microservices. Over time, the monolith becomes simpler and simpler, and you can add more independent microservices.
Migrating an existing application to a modern microservices architecture should not be done by rewriting the code from scratch. Instead, it should be done through incremental migration. There are three strategies to consider: implement new functionality as microservices; separate the presentation layer from the business and data access layers; and extract existing modules into microservices. As time goes on, the number of microservices grows, and the agility and efficiency of the development team will improve greatly.
