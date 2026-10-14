---
source:
  locale: zh
  slug: how-eureka-enable-service-discovery-and-service-registration
  hash: 'sha256:v1:ddb0b069769848aeeafde5dffe2919895f279dd61942a57c6a014a7f312b8ccc'
status: machine
translatedAt: '2026-10-14'
---
# Main Call Flows of the Eureka Service Discovery Component

## Introduction

The now-popular microservices architecture is changing the way we build applications, moving from a single monolithic service to ever smaller, independently deployable services (called `微服务` (microservices)) that together make up our application. In any business operation, calls between multiple services are unavoidable. If service A wants to access service B deployed on another server, service A must know the IP address of the machine hosting service B and the port of the service. The simplest approach is to have service A maintain its own copy of service B's configuration (including the IP address, port and so on), but this approach has several obvious drawbacks: as the number of services we call grows, how do we maintain the configuration files; it lacks flexibility, because if service B changes its IP address or port, service A must also change its configuration files; and it is inconvenient to dynamically scale services out or in.
A better solution is `服务发现（Service Discovery）` (service discovery). It abstracts out a service registry: when a new service comes online, it registers its own IP and port with the registry, and the registry performs periodic heartbeat checks on registered services and, when a service is found to be unhealthy, removes it from the registry and takes it offline. Service A only needs to fetch service B's information from the registry, and even if service B's IP or port changes, service A needs no modification, which decouples the services to a certain degree. There are many open-source implementations of service discovery in the industry today, such as `apache`'s [zookeeper](https://github.com/apache/zookeeper), `Netflix`'s [eureka](https://github.com/Netflix/eureka), `hashicorp`'s [consul](https://github.com/hashicorp/consul) and `CoreOS`'s [etcd](https://github.com/etcd-io/etcd).

## What Is Eureka

`Eureka` is defined on [GitHub](https://github.com/Netflix/eureka) as

> Eureka is a REST (Representational State Transfer) based service that is primarily used in the AWS cloud for locating services for the purpose of load balancing and failover of middle-tier servers.

At Netflix, Eureka is used for the following purposes apart from playing a critical part in mid-tier load balancing.

`Eureka` was open-sourced by [Netflix](https://www.netflix.com). It is designed in a client/server model and is a service registration and discovery component built on the HTTP protocol with a RESTful API. It provides complete service registration and service discovery and integrates seamlessly with `Spring Cloud`. The server side plays the role of the service registry: it mainly provides the client side with functions such as service registration and discovery, maintains the clients' service registration information, and periodically performs heartbeat checks on registered services, removing them and taking them offline when they become unavailable. A client can obtain the registration information of the services it depends on through the server, and so complete calls between services. Unfortunately, as its official [github wiki](https://github.com/Netflix/eureka/wiki) shows, version 2.0 is no longer open source. But this does not stop us from studying it in depth: after all, service registration and service discovery are relatively basic and general, and the ideas behind other open-source frameworks are the same.

## Service Registry (Eureka Server)

We add the relevant dependencies of `Eureka Server` to the project and put the annotation `@EnableEurekaServer` on the startup class, and it can then serve as a registry. After starting the service, the page we get when visiting it is as follows:

![eureka-server-homepage.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-homepage)

We then add two modules, `service-provider` and `service-consumer`, put the annotation `@EnableEurekaClient` on their startup classes and point the registry address at the `Eureka Server` we just started. Visiting the page again shows that both services have been registered.

![eureka-instance-registered-currently.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-instance-registered-currently)

As you can see, `Eureka` is very simple to use: just a few annotations and a little configuration give us service registration and service discovery. Next, let us look at how it implements these functions.

### Service Registration (Register)

The registry provides a service registration API, which is called when a new service starts in order to register it, or to change the status of the corresponding service when a heartbeat check finds that its status is abnormal. Service registration sends a `POST` request carrying the current instance information to the `addInstance` method of the class `ApplicationResource`.

![eureka-server-applicationresource-addinstance.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-applicationresource-addinstance)

As you can see, the method calls the `register` method of the class `PeerAwareInstanceRegistryImpl`, which has two main steps:

1. Call the `register` method of the parent class `AbstractInstanceRegistry` to register the current service with the registry
2. Call the `replicateToPeers` method to synchronize the service registration information asynchronously to the other `Eureka Server` nodes

The service registration information is stored in a nested `map`, whose structure is as follows:

![eureka-server-registry-structure.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-registry-structure)

The `key` of the first-level `map` is the application name (corresponding to `SERVICE-PROVIDER` in the `Demo`), and the `key` of the second-level `map` is the corresponding instance name of the application (corresponding to `mghio-mbp:service-provider:9999` in the `Demo`). One application can have multiple instances. The main call flow is shown in the figure below:

![eureka-server-register-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-register-sequence-chart)

### Service Renewal (Renew)

Service renewal is called periodically by the service provider (such as `service-provider` in the `Demo`). It works like a heartbeat and tells the registry `Eureka Server` the provider's status, so that `Eureka Server` does not consider the service failed and remove it. Service renewal sends a `PUT` request carrying the current instance information to the `renewLease` method of the class `InstanceResource`.

![eureka-server-instanceresource-renew.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-instanceresource-renew)

Looking into the `renew` method of `PeerAwareInstanceRegistryImpl`, we can see that the renewal steps are broadly the same as service registration: it first updates the status on the current `Eureka Server` node, and after the renewal succeeds it synchronizes the status asynchronously to the other `Eureka Server` nodes. The main call flow is shown in the figure below:

![eureka-server-renew-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-renew-sequence-chart)

### Service Cancellation (Cancel)

When a service provider (such as `service-provider` in the `Demo`) stops, it sends a request telling the registry `Eureka Server` to remove it and take it offline, so that service consumers do not call a service that no longer exists. Service cancellation sends a `DELETE` request carrying the current instance information to the `cancelLease` method of the class `InstanceResource`.

![eureka-server-instanceresource-cancellease.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-instanceresource-cancellease)

Looking into the `cancel` method of `PeerAwareInstanceRegistryImpl`, we can see that the renewal steps are broadly the same as service registration: it first removes the service and takes it offline on the current `Eureka Server` node, and after the removal succeeds it synchronizes the status asynchronously to the other `Eureka Server` nodes. The main call flow is shown in the figure below:

![eureka-server-cancellease-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-cancellease-sequence-chart)

### Service Eviction (Eviction)

For service eviction, the registry `Eureka Server` starts a daemon thread `evictionTimer` at startup that periodically (every `60` seconds by default) checks services. The criterion is a service that has not performed a `Renew` for a certain time. The default expiry time is `90` seconds, which means that when a registered service has not renewed (Renew) with the registry `Eureka Server` within `90` seconds, it is removed from the registry and taken offline. The expiry time can be changed through the setting `eureka.instance.leaseExpirationDurationInSeconds`, and the interval of the periodic check can be changed through the setting `eureka.server.evictionIntervalTimerInMs`. The main call flow is shown in the figure below:

![eureka-server-evict-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-evict-sequence-chart)

## Service Provider

For the service provider (such as the `service-provider` service in the `Demo`), there are three main kinds of operations: `服务注册（Register）` (service registration), `服务续约（Renew）` (service renewal) and `服务下线（Cancel）` (service cancellation). Let us see how these three operations are implemented.

### Service Registration (Register)

For a service to serve others, it must first register its information with the registry `Eureka Server`. The precondition for this step is that you have configured `eureka.client.register-with-eureka=true`, whose default value is `true`. The registry itself does not need to register with itself, so set this setting to `false` there. This call is fairly simple, and the main call flow is shown in the figure below:

![eureka-service-provider-register-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-server-register-sequence-chart)

### Service Renewal (Renew)

Service renewal is a heartbeat that the service provider initiates periodically (every `30` seconds by default). It mainly tells the registry `Eureka Server` that the service is healthy and still alive, and the interval can be changed through the setting `eureka.instance.lease-renewal-interval-in-seconds`. Of course, the precondition for renewal is that `eureka.client.register-with-eureka=true` is configured, so that the service is registered with the registry. The main call flow is shown in the figure below:

![eureka-service-provider-renew-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-provider-renew-sequence-chart)

### Service Cancellation (Cancel)

When the service provider stops, it must send a `DELETE` request to tell the registry `Eureka Server` that it is offline, so that the registry removes it and prevents service consumers from obtaining an unavailable service from the registry. This process is fairly simple to implement: put the annotation `@PreDestroy` on the `shutdown` method of the class `DiscoveryClient`, and when the service stops, removal and offline handling is triggered automatically and the cancellation logic runs. The main call flow is shown in the figure below:

![eureka-service-provider-cancel-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-provider-cancel-sequence-chart)

## Service Consumer

If a service consumer does not need to be called by other services, it in fact involves only two operations: `获取服务列表（Fetch）` (fetching the service list) and `更新服务列表（Update）` (updating the service list) from the registry. If it also needs to register with the registry and serve others, the remaining processes are the same as those of the service provider described above and are not repeated here. Next, let us see how these two operations are implemented.

### Fetching the Service List (Fetch)

After a service consumer starts, it first has to fetch the list of available services from the registry `Eureka Server`, and a copy is also cached locally. This operation of fetching the service list is performed when the `DiscoverClient` class is instantiated after the service starts.

![eureka-service-consumer-fetchregistry.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-consumer-fetchregistry)

As you can see, the precondition for fetching the service list is that `eureka.client.fetch-registry=true` is configured, whose default value is `true`. The main call flow is shown in the figure below:

![eureka-service-consumer-fetch-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-consumer-fetch-sequence-chart)

### Updating the Service List (Update)

As the `获取服务列表（Fetch）` (fetching the service list) process above shows, a copy is also cached locally, so it must periodically go to the registry `Eureka Server` to get the latest service configuration and then compare it and update the local cache. The update interval can be changed through the setting `eureka.client.registry-fetch-interval-seconds` and defaults to `30` seconds. The precondition for this update step is that you have configured `eureka.client.register-with-eureka=true`, whose default value is `true`. The main call flow is shown in the figure below:

![eureka-service-consumer-update-sequence-chart.png](diagram:micro-services/how-eureka-enable-service-discovery-and-service-registration/eureka-service-consumer-update-sequence-chart)

## Summary

The project at work uses the `Spring Cloud` stack, which has a very complete set of open-source code for integrating `Eureka` and is very convenient to use. Before, I always just added annotations and changed a few configuration properties in one go, without studying the source code in depth. This article mainly describes the processes and implementation of service registration, service discovery and related operations, and gives a closer understanding of the `Eureka` service discovery component.

---

References

[Netflix Eureka](https://github.com/Netflix/eureka)

[Service Discovery in a Microservices Architecture](https://www.nginx.com/blog/service-discovery-in-a-microservices-architecture)
