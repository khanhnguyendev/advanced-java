---
source:
  locale: zh
  slug: redis-production-environment
  hash: 'sha256:v1:a846849cdf769a9665b06bfa2c29e1dc70a15ae7568d8162b70a51263da802eb'
status: machine
translatedAt: '2026-10-14'
---
# Redis Production Deployment Plan

## Interview question

How is Redis deployed in a production environment?

## Interviewer psychology

The interviewer wants to see whether you understand the deployment architecture of your company's production Redis cluster. If you do not, you are truly negligent. Is your Redis a master/replica architecture? A cluster architecture? Which cluster solution is used? Is there a high availability guarantee? Is persistence enabled to make data recovery possible? How many GB of memory is given to online Redis? Which parameters are set? After stress testing, how much QPS can your Redis cluster carry?

Buddy, you must know all of this inside out, otherwise you clearly have not thought it through properly.

## Answer analysis

Redis cluster, 10 machines: 5 machines run Redis master instances and the other 5 run Redis replica instances, with each master instance having one replica instance attached. The 5 nodes provide read and write service externally. The peak read/write QPS of each node may reach 50,000 per second, so the 5 machines can handle at most 250,000 read and write requests per second.

What is the machine configuration? 32G of memory + 8-core CPU + 1T of disk, but only 10g of memory is allocated to the Redis process. In a typical online production environment, try not to let Redis memory exceed 10g, because more than 10g may cause problems.

The 5 machines providing read and write service have 50g of memory in total.

Because each master instance has a replica instance attached, the setup is highly available. If any master instance crashes, failover happens automatically and the Redis replica instance automatically becomes the master instance and continues to provide read and write service.

What data do you write into memory? How large is each record? Product data, 10kb per record. 100 records are 1mb, and 100,000 records are 1g. The product data resident in memory is 2,000,000 records, occupying 20g of memory, which is less than 50% of the total memory. The current peak is around 3,500 requests per second.

In fact, large companies have an infrastructure team responsible for operating and maintaining the cache cluster.
