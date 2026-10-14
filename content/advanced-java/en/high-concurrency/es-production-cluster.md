---
source:
  locale: zh
  slug: es-production-cluster
  hash: 'sha256:v1:63aeee3c133123fd25f6f6a2b4baf98f0bbec6fd58bd50dfaab00774d9151bdd'
status: machine
translatedAt: '2026-10-14'
---
# ES Production Cluster Architecture

## Interview question

What is the deployment architecture of your production ES cluster? Roughly how much data does each index hold? Roughly how many shards does each index have?

## Interviewer Psychology

This question, like the Redis ones that follow, comes up in every interview that touches on ES, Redis, MySQL database and table sharding and similar technologies. How did you deploy it in production? Put bluntly, the question has little technical depth; the interviewer simply wants to see whether you have actually done this in a real production environment.

Some candidates may never have worked in production: they have never deployed an ES cluster on real online machines, never actually played with one, and never imported tens of millions or even hundreds of millions of documents into an ES cluster, so they may not know the details of production projects.

If you have only played with demos and never touched a real ES cluster, you may be stumped at this point. Do not panic. You must answer this question calmly, showing that you really have done it.

## Answer analysis

This question is really nothing special. If you have actually worked with ES, you certainly know the real situation of your production ES cluster: how many machines were deployed, how many indexes there are, how much data each index holds, and how many shards each index was given. You must know!

But if you really have not done it, do not be nervous either. Here is a basic version that you can simply recite.

-   We deployed 5 machines for the production ES cluster, each with 6 cores and 64G, so the cluster has 320G of memory in total.
-   The daily incremental data in our ES cluster is about 20 million documents, roughly 500MB per day, and the monthly increment is about 600 million documents, 15G. The system has been running for a few months, and the total data in the ES cluster is now about 100G.
-   There are currently 5 indexes online (adapt this to your own business and see which of your data can go into ES), and each index holds about 20G of data. Given that volume, we allocated 8 shards to each index, 3 more than the default of 5 shards.

Saying roughly this is enough.
