---
source:
  locale: zh
  slug: distributed-system-idempotency
  hash: 'sha256:v1:d46b3704a0e2ce1759ca554f785e39031c06c7edb9cd6c88e277ab6f03a29c9c'
status: machine
translatedAt: '2026-10-14'
---
# How to Design Idempotency for Distributed Service APIs?

## Interview question

How do you design idempotency for a distributed service API (for example, so that a payment is never deducted twice)?

## Interviewer psychology

Starting with this question, the interviewer has entered an interview about **real production problems**.

How do you guarantee idempotency for an API in a distributed system? This is a production-environment technical problem you must consider when building a distributed system. What does it mean?

Look: suppose you have a service that provides some APIs for external calls, and the service is deployed on 5 machines. One of the APIs is the **payment API**. When a user operates on the front end, for whatever reason, an order **accidentally initiates two payment requests**, and these two requests land on different machines of the service. The result: one order is charged twice.

Or the order system calls the payment system to pay, but accidentally hits a **network timeout**, and then the order system goes through the retry mechanism we saw earlier and retries on the spot. Now the payment system receives the same payment request twice, and because of the load balancing algorithm they land on different machines. Awkward...

So you must know about this, or the distributed system you build is likely to be full of traps.

## Answer analysis

This is not a purely technical problem, and there is no universal method. Idempotency should be guaranteed **in combination with the business**.

So-called **idempotency** means that when the same request is issued to an API multiple times, the API must guarantee that the result is correct: it must not deduct payment more than once, insert one more piece of data, or add 1 too many to a statistic. That is idempotency.

Guaranteeing idempotency really comes down to three points:

-   Every request must have a unique identifier. For example, an order payment request must contain the order id, and one order id can be paid at most once, right?
-   After each request is processed, there must be a record marking that this request has been processed. A common approach is to record a status or the like in mysql, for example recording a payment flow record for this order before payment.
-   Every time a request is received, a check must be made as to whether it has been processed before. For example, if an order has already been paid, there is already a payment flow record, so if the request is sent again, inserting the payment flow record first fails: orderId already exists, the unique key constraint takes effect, and an error is reported because the insert cannot go through. Then you do not need to deduct the payment again.

In actual operation, you must combine this with your own business, for example using Redis with orderId as the unique key. Only after the payment flow record is successfully inserted can the actual payment deduction be executed.

The requirement is that paying an order must insert one payment flow record, with a unique key `unique key` on order_id. Before paying an order, you first insert a payment flow record, and then order_id is already in. You can then write a flag into Redis, `set order_id payed`. When a repeated request arrives next time, first check the value corresponding to order_id in Redis; if it is `payed`, the order has already been paid, and you should not pay again.
