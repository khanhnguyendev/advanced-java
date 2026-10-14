---
source:
  locale: zh
  slug: distributed-system-cap
  hash: 'sha256:v1:9854fa09d8b0628aa763d21e02004baae8d54564524b42ac3bc44fc03633dbae'
status: machine
translatedAt: '2026-10-14'
---
# The CAP Theorem in Distributed Systems

## What Does the P in the CAP Theorem Mean for a Distributed System

When I first read about the CAP theorem, I was quite confused. The CAP theorem states that in a distributed system only two of the three properties can be satisfied, which implies that distributed CA systems exist. I read many articles about CAP online. Their explanations of P vary widely, but most of them boil down to the view that P is indispensable, meaning that a distributed system can only be AP or CP. This contradicts what I previously understood (that distributed CA systems exist), hence my confusion.

> This theorem originated as a conjecture put forward by Eric Brewer, a computer scientist at the University of California, Berkeley, at the Symposium on Principles of Distributed Computing (PODC) in 2000. In 2002, Seth Gilbert and Nancy Lynch of the Massachusetts Institute of Technology (MIT) published a proof of Brewer's conjecture, making it a theorem.

### What Is the CAP Theorem

In theoretical computer science, the CAP theorem, also known as Brewer's theorem, states that a distributed computing system cannot satisfy all of the following three properties at the same time:

-   Consistency (equivalent to all nodes accessing the same, most recent copy of the data)
-   Availability (every request receives a non-error response, but with no guarantee that the returned data is the most recent)
-   Partition tolerance (in practical terms, a partition amounts to a time limit on communication. If the system cannot reach data consistency within the time limit, a partition has occurred, and a choice must be made between C and A for the current operation.)

### Partition Tolerance

The easiest way to understand the CAP theorem is to imagine two nodes on opposite sides of a partition. Allowing at least one node to update its state leads to data inconsistency, so the C property is lost. If, to guarantee data consistency, the node on one side of the partition is made unavailable, then the A property is lost. Only if the two nodes can communicate with each other can both C and A be guaranteed, which in turn means P is lost.

-   P refers to partition tolerance. Once a partition occurs, fault tolerance is needed, and that fault tolerance means choosing between A and C. If a distributed system has no partition (no inconsistency or unavailability appears), then there is no partition to begin with, and without a partition there is certainly no partition tolerance P.
-   Whether the system I design is an AP or a CP system, if no inconsistency or unavailability occurs, the system is in a CA state.
-   P only manifests on the premise that a partition exists.

> Source: [Wikipedia, CAP theorem](https://zh.wikipedia.org/wiki/CAP%E5%AE%9A%E7%90%86)

## Comparison of Several Common CAP Frameworks

| Framework | Type |
| --------- | ---- |
| Eureka    | AP   |
| Zookeeper | CP   |
| Consul    | CP   |

### Eureka

> Eureka guarantees availability and achieves eventual consistency.

All Eureka nodes are equal and hold the same data, and Eureka instances can register with each other in a cross-registration fashion.  
The Eureka client registers using a built-in round-robin load balancer, with a detection interval. A node's registration information is removed only if no heartbeat is received within a certain time. If a client finds the current Eureka instance unavailable, it switches to another node. If all Eureka instances are down, the Eureka client uses the last data as a local cache. So every one of the designs above means it lacks the `一致性` (consistency) property.

Note: because of Eureka's AP characteristics and its interval-based synchronization mechanism, when updating a service you generally set the current service status to `offline` manually through Eureka's API, and restart it after waiting for 2 synchronization intervals. This limits the impact of the node being updated on the overall system.

### Zookeeper

> Strong consistency

Zookeeper stops serving while electing a leader, and can serve only after a leader is elected successfully; the election takes quite long. Internally it uses the Paxos election and voting mechanism: a node becomes leader only by winning more than half of the votes, otherwise voting restarts. So when deploying, it is best to have an odd number of cluster nodes, no fewer than 3 (but who can guarantee the number of nodes is still odd after some go down?). Zookeeper health checks generally use long-lived TCP connections, which become unavailable during internal network jitter or when the corresponding node is blocked, and this is rather risky.

### Consul

Like Zookeeper, Consul is CP.

Consul considers a registration successful only when more than half of the nodes have written it successfully. When the leader goes down, the whole of Consul is unavailable during the re-election, which guarantees strong consistency but sacrifices availability.  
Many blogs say Consul is AP, but the official documentation has confirmed it as a CP mechanism. Original source: https://developer.hashicorp.com/consul/docs/concept/consensus
