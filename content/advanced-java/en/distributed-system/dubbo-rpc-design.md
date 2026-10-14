---
source:
  locale: zh
  slug: dubbo-rpc-design
  hash: 'sha256:v1:c4a46b71bb0958cd1bdaf7585f866269a6172d53df9d78d21b9bc3ce7021c3ca'
status: machine
translatedAt: '2026-10-14'
---
# Designing an RPC Framework Similar to Dubbo

## Interview question

How would you design an RPC framework similar to Dubbo yourself?

## Interviewer psychology

Honestly, this question works on the same principle as asking how to design an MQ yourself. It tests only two things:

-   Whether you have a very deep understanding of how some RPC framework works.
-   Whether you can think from the overall perspective about how to design an RPC framework, which tests your system design ability.

## Answer analysis

If you get asked this question, you at least must not give in, because this is general knowledge. I cannot go deep into things like Kafka source code analysis or Dubbo source code analysis here, and even if I did, it would take you at least a month or so to really digest, understand, and absorb it.

So my suggestion is that when you meet this kind of question, start at least from the principles of similar frameworks you know and say how you would design it with reference to how Dubbo works. For example, does Dubbo not have all those layers? Do you roughly know what each layer does? Then talk it through along those lines. At the very least you must not freeze, and you will do better than people who go blank straight away and cannot say anything.

Here is an example. Let me give you the simplest line of answer:

-   First, your service has to register with the service registry, right? So you need a service registry that keeps the information of each service, which can be built with zookeeper, right?
-   Then your consumer needs to fetch the corresponding service information from the service registry, right? And each service may exist on multiple machines.
-   Next you issue a request. How? Of course based on a dynamic proxy. Programming to the interface, you get a dynamic proxy, which is a local proxy of the interface, and this proxy finds the machine addresses corresponding to the service.
-   Then which machine do you send the request to? There must be a load balancing algorithm, and the simplest one can be random or round-robin, right?
-   Once a machine is found, you can send it the request. The first question is how to send: you can say netty, in nio mode. The second question is what data format to send: you can say the hessian serialization protocol, or something else, right? Then the request goes out.
-   The server side is the same: it needs to generate a dynamic proxy for your own service, listen on some network port, and proxy your local service code. When a request is received, it calls the corresponding service code, right?

This is the idea of the most basic RPC framework. Never mind how impressive your technical foundation is, can you at least give this simplest idea first?
