---
source:
  locale: zh
  slug: distributed-system-request-sequence
  hash: 'sha256:v1:c9ba198723c9a1755684b3fd007e3f2ce0853fb35479162c051a774ff6f2e234'
status: machine
translatedAt: '2026-10-14'
---
# How to Ensure Ordering of Distributed Service API Requests?

## Interview question

How do you ensure the ordering of requests to a distributed service API?

## Interviewer psychology

The order in which APIs of a distributed system are called is also a problem. Generally speaking, ordering does not need to be guaranteed. But **sometimes** you may genuinely need **strict ordering**. Here is an example. Your service A calls service B: first insert, then delete. Both requests are sent and land on different machines. The insert request may be executed more slowly for some reason, so the delete request executes first. At that moment there is no data, so it has no effect. Then the insert request arrives and the data is inserted. Awkward.

It should have been "first insert -> then delete", leaving the data gone, but now it is "first delete -> then insert" and the data still exists. In the end you cannot figure out for the life of you what happened.

So these are all very common problems of distributed systems.

## Answer analysis

First, my personal suggestion is that the system you design from the business logic had better not need this kind of ordering guarantee, because once you introduce an ordering guarantee, for example by using a **distributed lock**, it **raises system complexity** and brings problems such as **low efficiency** and excessive pressure on hot data.

Let me give a solution we have used. In short, first you use Dubbo's consistent hash load balancing strategy to dispatch, for example, all the requests for a given order id to one machine. Then on that machine, since execution may still be concurrent across multiple threads, you may need to immediately throw the requests for that order id into an **in-memory queue**, forcing them to queue, so that their ordering is guaranteed.

![distributed-system-request-sequence](asset:distributed-system/distributed-system-request-sequence/distributed-system-request-sequence.png)

But this causes many follow-up problems. For example, what if the requests for some order are especially numerous and make one machine a **hotspot**? Solving these problems opens up a whole series of further complex technical solutions... Problems like this once gave us endless headaches, so what do I still recommend?

Ideally, for something like the case above, can the insert and delete operations of an order be merged into one operation, say a single delete or something else, to avoid this problem in the first place?
