---
source:
  locale: zh
  slug: distributed-system-cap
  hash: 'sha256:v1:9854fa09d8b0628aa763d21e02004baae8d54564524b42ac3bc44fc03633dbae'
status: machine
translatedAt: '2026-10-14'
---
# The CAP Theorem in Distributed Systems

## What Does P Mean in the CAP Theorem for Distributed Systems

When I first read about the CAP theorem, I had a big doubt. The CAP theorem states that a distributed system can satisfy only two of the three properties, which would imply that distributed CA systems exist. I read many CAP articles online. Although their explanations of P vary widely, most of them boil down to the view that P is indispensable, meaning a distributed system can only be AP or CP. This contradicts what I had previously understood (that distributed CA systems exist), and that is the source of my doubt.

> This theorem originated as a conjecture by Eric Brewer, a computer scientist at the University of California, Berkeley, presented at the Symposium on Principles of Distributed Computing (PODC) in 2000. In 2002, Seth Gilbert and Nancy Lynch of the Massachusetts Institute of Technology (MIT) published a proof of Brewer's conjecture, making it a theorem.

### What Is the CAP Theorem

In theoretical computer science, the CAP theorem, also called Brewer's theorem, states that it is impossible for a distributed computing system to satisfy all three of the following at the same time:

-   Consistency (equivalent to all nodes accessing the same, latest copy of the data)
-   Availability (every request receives a non-error response, but there is no guarantee that the data returned is the latest)
-   Partition tolerance (in practical terms, a partition amounts to a time limit on communication. If the system cannot reach data consistency within the time limit, a partition has occurred, and a choice must be made between C and A for the current operation.)

### Partition Tolerance

The simplest way to understand the CAP theorem is to imagine two nodes on opposite sides of a partition. Allowing at least one node to update state leads to data inconsistency, which loses the C property. If, to preserve consistency, the nodes on one side of the partition are made unavailable, the A property is lost instead. Only if the two nodes can communicate with each other can both C and A be guaranteed, but that would lose the P property.

-   P refers to partition tolerance. After a partition occurs, fault tolerance is needed, and fault tolerance here means choosing between A and C. If a distributed system has no partitions (no inconsistency or unavailability occurs), then it has no partition to begin with, and so there is certainly no partition tolerance P either.
-   Whether the system I design is an AP or a CP system, if no inconsistency or unavailability occurs, the system is in a CA state.
-   P can only manifest when partitions exist.

> Source: [Wikipedia: CAP theorem](https://zh.wikipedia.org/wiki/CAP%E5%AE%9A%E7%90%86)

## Comparison of Several Common CAP Frameworks

| Framework | Category |
| --------- | -------- |
| Eureka    | AP       |
| Zookeeper | CP       |
| Consul    | CP       |

### Eureka

> Eureka guarantees availability and achieves eventual consistency.

All Eureka nodes are equal and hold the same data, and Eureka nodes can register with each other in a cross-registration fashion.  
The Eureka client registers using a built-in round-robin load balancer. There is a check interval, and a node's registration information is removed only if no heartbeat is received within a certain time. If a client finds the current Eureka unavailable, it switches to another node. If all Eureka nodes are down, the Eureka client uses the last data as its local cache. Every one of these designs means it does not offer the property of `一致性` (consistency).

Note: because of Eureka's AP nature and its interval-based synchronization mechanism, when updating a service you normally set the current service status to `offline` manually through Eureka's API, then wait for 2 synchronization intervals before restarting. This limits the impact of the node being updated on the system as a whole.

### Zookeeper

> Strong consistency

Zookeeper stops serving while electing a leader, and can serve only after a leader is successfully elected, so election takes a long time. Internally it uses the paxos election and voting mechanism: a node becomes leader only if it gets more than half of the votes, otherwise voting restarts. So when deploying, it is best to have an odd number of cluster nodes, no fewer than 3 (but who can guarantee that the number of nodes is still odd after some go down?). Zookeeper health checks generally use long-lived TCP connections, so they become unavailable during internal network jitter or when the corresponding node is blocked, which is rather dangerous.

### Consul

Like Zookeeper, its data model is CP.

During registration, Consul considers the registration successful only when more than half of the nodes have written successfully. When the leader goes down, the entire Consul is unavailable during re-election, which guarantees strong consistency at the expense of availability.  
Many blogs say Consul is AP, but the official documentation has confirmed it as a CP mechanism. Original source: https://developer.hashicorp.com/consul/docs/concept/consensus
