---
source:
  locale: zh
  slug: event-driven-data-management-for-microservices
  hash: 'sha256:v1:8282c603281ab570084c941917f5d2b0715c75b1c1b6ad6d1d90caf2b72edb5e'
status: machine
translatedAt: '2026-10-14'
---
# Event-Driven Data Management for Microservices

## 1.1 Microservices and the Problem of Distributed Data Management

A monolithic application generally has a single relational database. The benefit is that the application can use ACID transactions, which bring some important operational properties:

1. Atomicity: any change is atomic
2. Consistency: the database state is always consistent
3. Isolation: even if transactions execute concurrently, they appear to run serially
4. Durable: once a transaction is committed, it cannot be rolled back

Given these properties, an application can be simplified to: begin a transaction, change (insert, delete, update) many rows, and then commit the transaction.

Another advantage of using a relational database is its SQL support (a powerful, declarative, table-oriented query language). You can very easily combine data from multiple tables with a query, and the RDBMS query scheduler decides the best way to execute it, so you do not need to worry about low-level concerns such as how the database is accessed. In addition, because all of the application's data is in one database, it is easy to query.

With a microservices architecture, however, data access becomes much more complex, because data is private to each microservice and the only way to access it is through its API. This encapsulated data access keeps microservices loosely coupled and independent of each other. If multiple services accessed the same data, schema updates would require access-time changes and coordination across all the services.

Furthermore, different microservices often use different databases. An application generates all kinds of data, and a relational database is not necessarily the best choice. In some scenarios, a NoSQL database may offer a more convenient data model with better performance and scalability. For example, an application that generates and queries text strings uses a text search engine such as Elasticsearch. Likewise, an application that generates social graph data can use a graph database such as Neo4j. So a microservices-based application generally uses a mix of SQL and NoSQL databases, an approach known as polyglot persistence.

A partitioned, polyglot-persistent architecture for storing data has many advantages, including loosely coupled services and better performance and scalability. What comes with it, however, are the challenges of distributed data management.

The first challenge is how to complete a transaction while maintaining data consistency across multiple services. To see why, take an online B2B store as an example. The customer service maintains various customer information, such as credit lines. The order service manages orders and must verify that a new order does not conflict with the customer's credit limit. In a monolithic application, the order service can simply use an ACID transaction to check the available credit and create the order.

In a microservices architecture, by contrast, the order and customer tables are each private to their corresponding service, as shown in the figure below:

![service table](diagram:micro-services/event-driven-data-management-for-microservices/private-table-of-the-corresponding-service)

The order service cannot access the customer table directly; it can only do so through the API published by the customer service. The order service could also use distributed transactions, better known as two-phase commit (2PC). However, 2PC is not a viable option in modern applications. According to the CAP theorem, you must choose between availability and ACID consistency, and availability is generally the better choice. Moreover, many modern technologies, such as many NoSQL databases, do not support 2PC. Maintaining data consistency across services and databases is a fundamental requirement, so we need to find another solution.

The second challenge is how to retrieve data from multiple services. For example, imagine the application needs to display a customer and their orders. If the order service provides an API to retrieve a customer's orders, you can receive the data with an application-side join. The application gets the customer information from the customer service and that customer's orders from the order service. Suppose, however, that the order service only supports looking up orders by their primary key (perhaps because it uses a NoSQL database that only supports primary-key-based retrieval). In that case there is no suitable way to retrieve the required data.

## 1.2 Event-Driven Architecture

For many applications, the solution is to use an event-driven architecture. In this architecture, a microservice publishes an event when something significant happens, such as updating a business entity. When a microservice subscribed to these events receives one, it can update its own business entities, which may in turn lead to more events being published.

Events can be used to implement business transactions that span multiple services. A transaction generally consists of a series of steps, where each step consists of a microservice updating a business entity and publishing an event that triggers the next step. The following figure shows how an event-driven approach can be used to check credit availability when an order is created, with microservices exchanging events through a message broker.

1. The order service creates an Order in the NEW state and publishes an "Order Created Event".

![Order-Created-Event](diagram:micro-services/event-driven-data-management-for-microservices/order-created-event)

2. The customer service consumes the Order Created Event, reserves credit for the order, and publishes a "Credit Reserved Event".

![Credit-Reserved-Event](diagram:micro-services/event-driven-data-management-for-microservices/credit-reserved-event)

3. The order service consumes the Credit Reserved Event and changes the order's status to OPEN.

![Status-is-OPEN](diagram:micro-services/event-driven-data-management-for-microservices/status-is-open)

More complex scenarios can introduce more steps, such as reserving inventory while the customer's credit is being checked.

Given that (a) each service atomically updates its database and publishes an event, and (b) the message broker ensures events are delivered at least once, a business transaction can be completed across multiple services (this transaction is not an ACID transaction). This pattern provides weak guarantees, such as eventual consistency. This type of transaction is called the BASE model.

Events can also be used to maintain materialized views that pre-join data owned by different microservices. The service that maintains such a view subscribes to the relevant events and updates the view. For example, the customer order view updater service (which maintains the customer order view) subscribes to events published by the customer service and the order service.

![pre-join](diagram:micro-services/event-driven-data-management-for-microservices/pre-join)

When the customer order view updater service receives a customer or order event, it updates the customer order view dataset. The customer order view can be implemented with a document database such as MongoDB, storing one document per customer. The customer order view query service is responsible for answering queries for a customer and their recent orders (by querying the customer order view dataset).

The event-driven architecture has both advantages and disadvantages. This architecture enables transactions that span multiple services while providing eventual consistency, and it lets an application maintain materialized views. The disadvantage is that the programming model is more complex than that of ACID transactions: to recover from application-level failures, compensating transactions are also needed, for example canceling the order if the credit check fails. In addition, the application must cope with inconsistent data, because changes made by in-flight transactions are visible, and data inconsistency is also encountered when the application reads a materialized view that has not yet been updated. Another disadvantage is that subscribers must detect and ignore redundant events.

## 1.3 Achieving Atomicity

An event-driven architecture also runs into the problem of atomically updating the database and publishing an event. For example, the order service must insert a row into the ORDER table and then publish an Order Created event, and these two operations must be atomic. If the service crashes after updating the database and the event is never published, the system ends up in an inconsistent state. The standard way to ensure atomicity is to use a distributed transaction that includes both the database and the message broker. However, based on the CAP theorem described above, this is not what we want.

### 1.3.1 Publishing Events Using Local Transactions

One way to achieve atomicity is for the application that publishes events to use a multi-step process involving only local transactions. The trick is an EVENT table, which acts as a message list in the database that stores the business entities. The application starts a (local) database transaction, updates the state of the business entity, inserts an event into the EVENT table, and commits the transaction. Another, separate application process or thread queries the EVENT table, publishes the events to the message broker, and then uses a local transaction to mark the events as published, as shown in the following figure:

![multi-step process](diagram:micro-services/event-driven-data-management-for-microservices/multi-step-process)

The order service inserts a row into the ORDER table and then inserts an Order Created event into the EVENT table. The event publisher thread or process queries the EVENT table for unpublished events, publishes them, and then updates the EVENT table to mark the events as published.

This approach also has both advantages and disadvantages. The advantage is that it ensures events are published without depending on 2PC, and that the application publishes business-level events without having to infer what happened to them. The disadvantage is that the approach is error-prone, because developers must remember to publish events. In addition, the approach is a challenge for some applications that use NoSQL databases, because NoSQL databases have limited transaction and query capabilities.

This approach needs no 2PC because the application uses local transactions to update state and publish events. Now let us look at another approach that achieves atomicity with a simple state update by the application.

### 1.3.2 Mining the Database Transaction Log

Another way for a thread or process to publish events atomically without 2PC is to mine the database's transaction or commit log. The application updates the database, which produces changes in the database transaction log. A transaction log mining process or thread reads these transaction logs and publishes them to the message broker. This is shown in the following figure:

![No-2PC-required](diagram:micro-services/event-driven-data-management-for-microservices/no-2pc-required)

One example of this approach is the LinkedIn Databus project. Databus mines the Oracle transaction log and publishes events based on the changes. LinkedIn uses Databus to ensure consistency among the various records within its systems.

Another example is the streams mechanism in AWS DynamoDB, a managed NoSQL database. A DynamoDB stream consists of the time-ordered changes (create, update and delete operations) made to a database table over the past 24 hours. An application can read these changes from the stream and publish them as events.

Transaction log mining also has both advantages and disadvantages. The advantage is that it ensures an event is published for every update without depending on 2PC. Transaction log mining can be simplified by separating event publishing from the application's business logic. The main disadvantage is that the transaction log has a different format for different databases, and even for different versions of a database; it is also hard to translate from the low-level transaction log update records into high-level business events.

The transaction log mining approach lets the application update the database directly without involving 2PC. Next, let us look at a completely different approach: one that does not update state and relies only on events.

### 1.3.3 Using Event Sourcing

Event sourcing achieves atomicity without 2PC, and guarantees the consistency of business entities, by using a fundamentally different, event-centric approach. Such an application stores a series of state-changing events for a business entity, rather than storing the entity's current state. The application can rebuild the entity's current state by replaying the events. Whenever the business entity changes, a new event is appended to the timeline. Because saving an event is a single operation, it is certainly atomic.

To understand how event sourcing works, consider the order entity as an example. In the traditional approach, each order maps to a row in the ORDER table and, for example, rows in the ORDER_LINE_ITEM table. With event sourcing, however, the order service stores an order as a series of state-changing events: created, approved, shipped, cancelled. Each event contains enough data to rebuild the order's state.

![Event-sourcing](diagram:micro-services/event-driven-data-management-for-microservices/event-sourcing)

Events are persisted in an event store, which provides an API to add and retrieve an entity's events. The event store is similar to the message broker described earlier, and provides an API for subscribing to events. The event store delivers events to all interested subscribers, and it is the backbone of an event-driven microservices architecture.

The event sourcing approach has many advantages. It solves a key problem of the event-driven architecture, making it possible to reliably publish an event whenever state changes, which in turn solves the data consistency problem in a microservices architecture. In addition, because events rather than objects are persisted, it avoids the object-relational impedance mismatch problem.

The event sourcing approach provides a 100% reliable audit log of changes to business entities, making it possible to obtain an entity's state at any point in time. Moreover, event sourcing lets business logic be composed of loosely coupled business entities that exchange events. These advantages make migrating a monolithic application to a microservices architecture relatively easy.

The event sourcing approach also has quite a few disadvantages. Because it uses a different and unfamiliar programming model, it is not easy to learn. The event store only supports primary-key lookup of business entities, so Command Query Responsibility Segregation (CQRS) must be used to handle queries, and the application must therefore deal with eventually consistent data.

## 1.4 Summary

In a microservices architecture, each microservice has its own private dataset. Different microservices may use different SQL or NoSQL databases. Although this database architecture has strong advantages, it also faces the challenges of distributed data management. The first challenge is how to maintain business transaction consistency across multiple services; the second is how to retrieve consistent data from a multi-service environment.

The best solution is to adopt an event-driven architecture. One challenge encountered along the way is how to atomically update state and publish events. There are several ways to solve this problem, including treating the database as a message queue, transaction log mining, and event sourcing.
