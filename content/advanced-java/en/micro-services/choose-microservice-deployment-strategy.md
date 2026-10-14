---
source:
  locale: zh
  slug: choose-microservice-deployment-strategy
  hash: 'sha256:v1:2519b18314c84f277d64c25b1f82e2da8393e8b6d787812b7114a399d65d0b31'
status: machine
translatedAt: '2026-10-14'
---
# Choosing a Microservice Deployment Strategy

## Introduction

Deploying a monolithic application means running multiple copies of one large application, typically on a number (N) of servers (physical or virtual), with a number (M) of application instances running. Deploying a monolith is not entirely straightforward, but it is certainly simpler than deploying a microservices application.

A microservices application consists of hundreds of services, which can be written in different languages and frameworks. Each service is a mini application of its own, with its own deployment, resource, scaling and monitoring requirements. For example, you can run a number of instances of a service depending on its demand, and in addition each instance must have its own CPU, memory and I/O resources. Complicated as that is, the greater challenge is that service deployment must be fast, reliable and cost-effective.

There are several microservice deployment patterns. Let us first discuss the multiple-service-instances-per-host pattern.

## Multiple Service Instances per Host Pattern

One way to deploy microservices is the multiple-service-instances-per-host pattern. With this pattern, you provision one or more physical or virtual machines and run several service instances on each of them. In many situations, this is the traditional approach to application deployment. Each service instance runs on a well-known port of one or more hosts, and the hosts can be thought of as pets.

The following figure shows this architecture:

![deployment-strategy-1](diagram:micro-services/choose-microservice-deployment-strategy/deployment-strategy-1)

This pattern has a few variants. One variant is how many processes each service instance consists of. For example, you might need to deploy a Java service instance as a web application on an Apache Tomcat Server. A Node.js service instance might consist of a parent process and several child processes.

Another variant defines how many service instances run within the same process group. For example, you can run multiple Java web applications on the same Apache Tomcat Server, or run multiple OSGi bundle instances in the same OSGi container.

The multiple-service-instances-per-host pattern has both advantages and drawbacks. The main advantage is efficient resource utilization. Multiple service instances share the server and the operating system, and it is even more efficient if a process group runs multiple service instances, for example when several web applications share the same Apache Tomcat Server and JVM.

Another advantage is that deploying a service instance is fast. You simply copy the service to the host and start it. If the service is written in Java, you only need to copy a JAR or WAR file. For other languages, such as Node.js or Ruby, you copy the source code. In other words, the network overhead is very low.

Because there is not much overhead, starting a service is fast. If the service is a self-contained process, you just start it. Otherwise, if it is a service instance running inside a container process group, you need to dynamically deploy it into the container, or restart the container.

Besides these advantages, the multiple-service-instances-per-host pattern also has drawbacks. One major drawback is that there is little or no isolation between service instances, unless each service instance is a separate process. If you want to precisely monitor the resource usage of each service instance, you cannot limit the resources each instance uses. As a result, a badly behaving service instance may consume all the memory or CPU of the host.

There is no isolation at all among multiple service instances in the same process. All instances may, for example, share the same JVM heap. A badly behaving service instance can easily attack other services in the same process; worse, you may not be able to monitor the resources each service instance uses.

Another serious problem is that the operations team must know the detailed steps of how to deploy. Services can be written in different languages and frameworks, so the development team certainly has a lot to communicate to the operations team. This complexity increases the chance of errors during deployment.

As you can see, although it is familiar, the multiple-service-instances-per-host pattern has some serious drawbacks. Let us see whether there are other ways to deploy microservices that avoid these problems.

## Single Service Instance per Host Pattern

Another way to deploy microservices is the single-service-instance-per-host pattern. With this pattern, the service instances on each host are independent of each other. There are two different implementations: service instance per virtual machine and service instance per container.

### Service Instance per Virtual Machine Pattern

With the service-instance-per-virtual-machine pattern, you generally package the service as a virtual machine image, for example an Amazon EC2 AMI. Each service instance is a VM (for example, an EC2 instance) launched from that image. The following figure shows this architecture:

![deployment-strategy-2](diagram:micro-services/choose-microservice-deployment-strategy/deployment-strategy-2)

Netflix uses this architecture to deploy its video streaming service. Netflix uses Aminator to package each service as an EC2 AMI, and each running service instance is an EC2 instance.

There are many tools you can use to build your own VMs. You can configure a continuous integration (CI) server (for example, Jenkins) to invoke Aminator and package the service as an EC2 AMI. packer.io is another option for automated virtual machine image creation. Unlike Aminator, it supports a range of virtualization technologies, such as EC2, DigitalOcean, VirtualBox and VMware.

The company Boxfuse has an innovative way of creating virtual machine images that overcomes the drawbacks described below. Boxfuse packages a Java application as a minimal virtual machine image. These images are quick to build and quick to boot, and more secure because they expose a smaller surface of service interfaces.

The company CloudNative has a SaaS application for creating EC2 AMIs called Bakery. After your microservices architecture passes its tests, you can configure your own CI server to invoke Bakery. Bakery packages the service as an AMI. Using a SaaS application such as Bakery means you do not need to waste time setting up your own AMI creation infrastructure.

The service-instance-per-VM pattern has many advantages. The main VM advantage is that each service instance runs in complete isolation, with its own CPU and memory that cannot be taken over by other services.

Another benefit is that you can use mature cloud infrastructure, such as that provided by AWS, whose cloud services offer useful features like load balancing and scalability.

A further benefit is that the service's implementation technology is encapsulated. Once a service is packaged as a VM it becomes a black box. The VM's management API becomes the API for deploying the service, which makes deployment a very simple and reliable affair.

The service-instance-per-VM pattern also has drawbacks. One drawback is inefficient resource utilization. Each service instance takes up the resources of an entire VM, including the operating system. Moreover, in a typical public IaaS environment, VM sizes are standardized, so they may be underutilized.

In addition, a public IaaS charges per VM whether or not the VM is busy. For example, AWS provides auto scaling, but it lacks a quick response to on-demand needs, forcing you to deploy extra VMs and so increasing deployment costs.

Another drawback is that deploying a new version of a service is slow. Because of their size, VM images are slow to build; for the same reason, VMs are slow to initialize, and the operating system also takes time to boot. This is not always the case, however: some lightweight VMs, such as those built with Boxfuse, are fast.

A third drawback is that the operations team is responsible for a lot of customization work. Unless you use a tool such as Boxfuse to relieve much of the work of building and managing VMs, a great deal of time will be spent on work that has little to do with the core business.

So let us look at another way to deploy microservices that still has the characteristics of a virtual machine but is more lightweight.

## Service Instance per Container Pattern

With this pattern, each service instance runs in its own container. A container is a virtualization mechanism at the operating system level. A container consists of one or more processes running in a sandbox. From the process's point of view, it has its own namespace and root file system; a container's memory and CPU resources can be limited. Some containers also have I/O limits. Container technologies of this kind include Docker and Solaris Zones.

The following figure shows this pattern:

![deployment-strategy-3](diagram:micro-services/choose-microservice-deployment-strategy/deployment-strategy-3)

To use this pattern you need to package the service as a container image. A container image is a file system containing the libraries and applications required to run the service. Some container images consist of a complete Linux root file system, while others are lightweight. For example, to deploy a Java service, you create a container image containing the Java runtime, possibly the Apache Tomcat server, and the compiled Java application.

Once the service is packaged as a container image, you need to launch a number of containers. Typically you run multiple containers on one physical or virtual machine, and you may need a cluster management system, such as Kubernetes or Marathon, to manage them. A cluster management system treats the hosts as a pool of resources and, according to each container's resource requirements, decides which host to schedule the container on.

The service-instance-per-container pattern also has both advantages and drawbacks. The advantages of containers are very similar to those of VMs: service instances are completely isolated from each other, and it is easy to monitor the resources each container consumes. Like VMs, containers use isolation to deploy services. The container management API can also serve as the API for managing services.

Unlike VMs, however, containers are a lightweight technology. Container images are quick to build. For example, on a laptop, packaging a Spring Boot application as a container image takes only 5 seconds. Containers also start quickly, because there is no operating system boot mechanism; when a container starts, the service in it is up.

Containers also have some drawbacks. Although container infrastructure is developing rapidly, it is still not as mature as VM infrastructure. And because containers share the host OS kernel, they are not as secure as VMs.

In addition, container technology places many customization demands on managing container images. Unless you use something like Google Container Engine or Amazon EC2 Container Service (ECS), you will need to manage the container infrastructure as well as the VM infrastructure.

Third, containers are often deployed on infrastructure that is billed per VM, so customers will obviously also incur extra deployment costs to cope with growing load.

Interestingly, the difference between containers and VMs is becoming increasingly blurred. As mentioned earlier, Boxfuse VMs are fast to build and start, and Clear Containers technology aims at creating lightweight VMs. Unikernel technology has also attracted attention, and Docker recently acquired Unikernel Systems.

Beyond these, serverless deployment technology, which avoids the drawbacks of the container and VM technologies described above, is attracting more and more attention. Let us take a look.

## Serverless Deployment

AWS Lambda is an example of serverless deployment technology. It supports Java, Node.js and Python services; to deploy a service, you package it as a ZIP file and upload it to AWS Lambda. You can supply metadata, including the name of the function that handles a request (an event). AWS Lambda automatically runs enough instances of the microservice to handle the requests, and you are billed only for run time and the amount of memory consumed. Of course, the devil is in the details, and AWS Lambda has its limitations. But not having to worry about any aspect of servers, virtual machines or containers is absolutely appealing.

A Lambda function is a stateless service. It generally handles requests by invoking AWS services. For example, when an image is uploaded to an S3 bucket and triggers a Lambda function, the function can insert an entry into a DynamoDB image table and publish a message to a Kinesis stream, triggering image processing. A Lambda function can also be invoked through third-party web services.

There are four ways to invoke a Lambda function:

-   Directly, using a web service request
-   Automatically, in response to events generated by, for example, AWS S3, DynamoDB, Kinesis or Simple Email Service
-   Automatically, through AWS API Gateway, which handles HTTP requests from application clients
-   On a schedule, through cron, which is much like a timer

As you can see, AWS Lambda is a very convenient way to deploy microservices. Request-based billing means you only pay for the load that your own business actually processes; in addition, because you do not need to know about the underlying infrastructure, you only need to develop your own application.

There are still quite a few limitations, however. It is not meant for deploying long-running services, such as those that consume messages forwarded from a third-party broker. Requests must complete within 300 seconds. Services must be stateless, because in theory AWS Lambda creates a separate instance for each request. They must be written in one of the supported languages, and services must start quickly, otherwise they will be stopped because of a timeout.
Deploying a microservices application is also a challenge. There are hundreds or thousands of services written in a variety of languages and frameworks. Each service is a mini application with its own unique deployment, resource, scaling and monitoring requirements. There are several microservice deployment patterns, including service instance per VM and service instance per container. Another option is AWS Lambda, a serverless approach.
