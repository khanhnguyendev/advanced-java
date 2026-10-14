---
source:
  locale: zh
  slug: why-dubbo
  hash: 'sha256:v1:85a241de0071f701c3a941dae95303474c1e6b66bfa08c0b43affb0a5e5cf680'
status: machine
translatedAt: '2026-10-14'
---
# Why Split a System?

## Interview question

Why split a system? How do you split it? Can you do without Dubbo after the split?

## Interviewer psychology

The distributed system part of the interview starts with this question. Distributed systems have become standard in interviews today; there is hardly a company that will not ask you about them. If you know nothing about distributed systems, your resume is almost unreadable and nobody will invite you to interview.

Why has it come to this? It is because of how technology developed across the whole industry.

In the early years, around the start of 2010 as I recall, very few people in the IT industry talked about distributed systems, let alone microservices. Many large companies such as BAT had adopted distributed architectures early on because of their systems' complexity, with large numbers of services, but their microservices were mostly built on frameworks they had developed themselves.

But in that era everyone really cared about ssh2. Most small and mid-sized companies played with struts2, spring, and hibernate, and somewhat later moved on to the combination of spring mvc, spring, and mybatis. That was simply the technical level of the industry then. Oracle was hot, Oracle administrators were in demand, and Oracle performance tuning was the killer skill of the IT guy. Nobody even mentioned big data, and certification training institutes for OCP and OCM were booming.

But as time went on, many companies gradually began to accept the distributed system architecture. Of decisive influence on the industry was Alibaba's Dubbo, and **to some extent, Alibaba pushed the industry's technology forward here**.

It is precisely because of Alibaba's Dubbo that many small and mid-sized companies could split their systems into many services based on Dubbo: each person is responsible for one service, nobody's code conflicts with anyone else's, services are autonomous and can use whatever technology they choose, and if a release changes only one service, you just release that one service. There is no need for everyone to integrate and debug together on every release, with hundreds of thousands or even millions of lines of code each time.

To this day, I am glad to see distributed systems become standard in industry interviews. Any ordinary programmer should master this, which is progress for the industry and technical progress for every IT coder. Since distributed systems are standard, the interviewer will naturally ask about them: many companies now use distributed, microservices architectures, so of course the interviewer has to test you on it.

## Answer analysis

### Why split a system?

Search online and the answers are extremely scattered, complicated, and trivial, with a whole heap of reasons. But here is an intuitive feel for it:

If you **do not split**, a large system has hundreds of thousands of lines of code and 20 people maintain one code base, which is simply a tragedy. Code often conflicts as people edit it, and handling all the code conflicts and merges consumes a great deal of time. Often I change my code, you call mine, and so your code has to be retested too, which is a terrible hassle. Then every release publishes the whole system of hundreds of thousands of lines at once, and everyone has to prepare for going live in fear and trembling. Going live with hundreds of thousands of lines of code may require many checks and the handling of many abnormal problems each time, which is both troublesome and painful. And if I want to upgrade the technology to the latest spring version, I cannot, because it might make your code throw errors, so I dare not change the technology casually.

Suppose a system has 200,000 lines of code, and A has changed 1,000 lines of it, but the release publishes the whole 200,000-line system together. That means the 200,000 lines of code may change in all kinds of ways online. All 20 people have to wait anxiously in front of their computers, and after going live, check the logs to see whether the part they are responsible for has any problems.

A checks only the functions corresponding to the 10,000 lines of code A is responsible for, confirms they are ok, and leaves. Unluckily, A accidentally changed some configuration on the online machines during the release, which made some functions corresponding to the 20,000 lines of code B and C are responsible for fail.

Dozens of people maintain a monolithic application of hundreds of thousands of lines of code, and each release takes several weeks of preparation: go live, deploy, then check the functions you are responsible for.

**After splitting**, the whole world is clean. A system of hundreds of thousands of lines of code is split into 20 services, each averaging 10,000 to 20,000 lines of code, and each service is deployed on its own machines. There are 20 projects, 20 git repositories, and 20 developers, and each person only has to maintain their own service. It is your own independent code and has nothing to do with anyone else. No more code conflicts, great. Each time you only test your own code, great. Each time you only release your own small service, great. You can upgrade the technology however you like as long as the API stays unchanged, truly great.

So in a word: for a mid-sized or large project with hundreds of thousands of lines of code and dozens of people on the team, if you do not split the system, **development efficiency is extremely low** and there are many problems. After splitting, each person is responsible only for their own small part and can do whatever they like with it. Splitting a distributed system can greatly improve the development efficiency of a large team working on a complex system.

At the same time, **note** that once a system is split into a distributed system, a large number of distributed system problems follow one after another, so the questions that come after this one all revolve around **the complex technical challenges that distributed systems bring**.

### How do you split a system?

This question can be very large, stretching to domain-driven design, or very small. I do not want to give an overly academic answer, because you cannot memorize one anyway and should just say it when you get there. Let me keep it simple, and you will know how to answer when the time comes.

Splitting a system into a distributed system, into multiple services, into a microservices architecture, takes many rounds. It is not that an architect splits it once at the start and it never needs splitting again.

First round: the team keeps growing. A service that was split off initially had 1 person maintaining 10,000 lines of code; later the business system became more and more complex, and this service grew to 100,000 lines of code and 5 people. Second round: 1 service becomes 5 services of 20,000 lines of code each, with each person responsible for one service.

When several people maintain one service, in the ideal case, with dozens of people, each person is responsible for 1 service or 2 to 3 services. When a service's workload grows and its code keeps increasing, say one person is responsible for a service whose code has become 100,000 lines and is overwhelmed, he splits it into 5 services, still carried by 1 person responsible for 5 services. Then you hire 2 more people to be led by that person, so 3 people are responsible for 5 services, where 2 people each handle 2 services and 1 person handles 1 service.

My personal suggestion is that a service should not have too much code: around 10,000 lines, and 20,000 to 30,000 at the very most.

Most systems need **multiple rounds of splitting**. The first split may just separate the multiple modules that existed before, for example splitting an e-commerce system into an order system, a product system, a procurement system, a warehouse system, a user system, and so on.

But later each system may become more and more complex. For example, the procurement system splits further into a supplier management system and a purchase order management system, and the order system splits into a shopping cart system, a pricing system, and an order management system.

Going deeper gets really deep, so here is an example for you to get a feel for it. **The core idea is to split one round according to the situation, and keep splitting later if the system becomes more complex**. Just think it over with the system you are responsible for as the example.

### Can you do without Dubbo after the split?

Of course you can. At worst, the systems communicate with each other directly over pure http APIs based on spring mvc, and that is all. But that certainly has problems, because the maintenance cost of http API communication is very high: you have to consider all kinds of messy problems such as **timeout retry** and **load balancing**. For example, your order system calls the product system, and the product system is deployed on 5 machines. How do you spread the requests evenly across those 5 machines? Is that not load balancing? It is fine if you build all of it yourself, but it really is painful.

So Dubbo, put plainly, is an RPC framework. Locally you just make an API call, but Dubbo proxies the call request, communicates with the remote machine over the network, and handles load balancing, automatic awareness of service instances going online and offline, timeout retry, and all those messy problems for you. You do not have to do them yourself; just use Dubbo.
