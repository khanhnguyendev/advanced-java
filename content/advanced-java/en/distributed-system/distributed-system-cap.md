---
source:
  locale: zh
  slug: distributed-system-cap
  hash: 'sha256:v1:9854fa09d8b0628aa763d21e02004baae8d54564524b42ac3bc44fc03633dbae'
status: machine
translatedAt: '2026-10-14'
---
# The CAP Theorem in Distributed Systems

## What Does P Mean in the CAP Theorem of Distributed Systems

When I first read about the CAP theorem, I was quite puzzled. The CAP theorem says that a distributed system can satisfy only two of the three properties, which implies that distributed CA systems exist. I read many articles about CAP online. Although they explain P in all sorts of ways, most of them boil down to the view that P is indispensable, meaning a distributed system can only be AP or CP. This conflicts with the theory I had known before (that distributed CA systems exist), and that is where my confusion came from.

> The theorem originated from a conjecture presented by the computer scientist Eric Brewer of the University of California, Berkeley at the 2000 Symposium on Principles of Distributed Computing (PODC). In 2002, Seth Gilbert and Nancy Lynch of the Massachusetts Institute of Technology (MIT) published a proof of Brewer's conjecture, making it a theorem.

### What Is the CAP Theorem

In theoretical computer science, the CAP theorem, also known as Brewer's theorem, states that a distributed computing system cannot satisfy all three of the following at the same time:

-   Consistency (equivalent to all nodes accessing the same, latest copy of the data)
-   Availability (every request receives a non-error response, but there is no guarantee that the data returned is the latest)
-   Partition tolerance (in practical terms, a partition is equivalent to a time limit on communication. If the system cannot reach data consistency within the time limit, a partition has occurred, and a choice must be made between C and A for the current operation.)

### Partition Tolerance

The simplest way to understand the CAP theory is to imagine two nodes on opposite sides of a partition. Allowing at least one node to update state leads to data inconsistency, which loses property C. If, to guarantee data consistency, the node on one side of the partition is made unavailable, property A is lost instead. Only if the two nodes can communicate with each other can both C and A be guaranteed, but that in turn loses property P.

-   P refers to partition tolerance. After a partition occurs, fault tolerance is needed, and fault tolerance here means choosing between A and C. If a distributed system has no partition (no inconsistency or unavailability appears), then there is no partition to begin with, and without a partition there is certainly no partition tolerance P.
-   Whether the system I design is AP or CP, if no inconsistency or unavailability occurs, the system is in a CA state.
-   The precondition for P to show itself is that a partition exists.

> Source: [Wikipedia: CAP theorem](https://zh.wikipedia.org/wiki/CAP%E5%AE%9A%E7%90%86)

## Comparison of Several Common CAP Frameworks

| Framework | Category |
| --------- | -------- |
| Eureka    | AP       |
| Zookeeper | CP       |
| Consul    | CP       |

### Eureka

> Eureka guarantees availability and achieves eventual consistency.

All Eureka nodes are equal and hold the same data, and Eureka instances can register with each other crosswise.  
The Eureka client registers using a built-in round-robin load balancing mechanism, with a detection interval: a node's registration information is removed only if no heartbeat is received within a certain time. If the client finds the current Eureka unavailable, it switches to another node, and if all Eureka nodes go down, the Eureka client uses the last data as its local cache. So each of the designs above means it does not offer the `一致性` (consistency) property.

Note: because of Eureka's AP characteristics and its interval-based synchronization mechanism, when updating a service one generally sets the current service's status to `offline` manually through Eureka's API and waits for 2 synchronization intervals before restarting. This limits the impact of the updated node on the whole system.

### Zookeeper

> Strong consistency

Zookeeper stops serving while electing a leader, and can serve again only after a leader is successfully elected, which takes quite a long time. Internally it uses the paxos election voting mechanism, and a node becomes leader only by obtaining more than half of the votes, otherwise voting restarts. So when deploying, it is best to use an odd number of cluster nodes, no fewer than 3 (but who can guarantee the number of nodes is still odd after some go down?). Zookeeper health checks generally use long-lived TCP connections, and during internal network jitter or when the corresponding node is blocked, the service becomes unavailable, which is rather dangerous.

### Consul

Like Zookeeper, its data is CP.

Consul considers a registration successful only when more than half of the nodes have written it successfully. When the leader goes down, the whole of Consul is unavailable during the re-election, which guarantees strong consistency but sacrifices availability.  
Many blogs say Consul is AP, but the official documentation has confirmed it as a CP mechanism. Original address: https://developer.hashicorp.com/consul/docs/concept/consensus
