---
source:
  locale: zh
  slug: e-commerce-website-detail-page-architecture
  hash: 'sha256:v1:cfdfe29dfe206dfd2ee1134e7ebaaa2944a73b747deb62dfc98f70aa1b89cb23'
status: machine
translatedAt: '2026-10-14'
---
# Product Detail Page System Architecture of an E-Commerce Website

## Product Detail Page System Architecture of a Small E-Commerce Website

A small e-commerce website displays its pages by fully statically generating every page. The database holds all product information; a page static-generation system fills the data into static templates to produce static pages and pushes them to an Nginx server. When a user browses a page, the site simply returns a ready-made static html page, with no business logic involved at all.

![e-commerce-website-detail-page-architecture-1](asset:high-availability/e-commerce-website-detail-page-architecture/e-commerce-website-detail-page-architecture-1.png)

Below is a simple demo of a page template.

```html
<html>
    <body>
        商品名称：#{productName}<br />
        商品价格：#{productPrice}<br />
        商品描述：#{productDesc}
    </body>
</html>
```

The **advantage** of this approach is that each time a user views a page, there is no interaction with the database and no code to execute; the site just returns an html page, so speed and performance are very high.

For a small site with few pages, this is very practical and simple. In Java you can use velocity, freemarker, thymeleaf and the like, and then build a CMS (content management system) for pages; when a template changes, you click a button or let the system automatically re-render everything.

The **disadvantage** is that it only suits small sites, with page counts ranging from a few dozen to a few tens of thousands. For a large e-commerce site with hundreds of millions of pages, can you really statically regenerate that many pages every time a page template changes? If each render takes several days, the whole site is ruined.

## Product Detail Page System Architecture of a Large E-Commerce Website

In the system design of a large e-commerce website's product detail page, when product data changes, a change message is pushed into a message queue (MQ). When the **cache service** consumes this message from the queue, it learns that data has changed, calls the data service API to fetch the updated data, and then pushes the assembled data into Redis. The data cached locally in Nginx has a time limit, say 10 minutes; once the data expires, Nginx fetches the latest cached data from Redis and caches it locally again.

When a user browses a page, the Nginx local data is dynamically rendered into the local html template and returned to the user.

![e-commerce-website-detail-page-architecture-2](asset:high-availability/e-commerce-website-detail-page-architecture/e-commerce-website-detail-page-architecture-2.png)

It is not as fast as returning an html page directly, but because the data is cached locally it is still fast; the cost is really just the performance of dynamically rendering an html page. If the html template changes, there is no need to statically regenerate all pages and no need to send requests, so there is no network overhead: the data is simply rendered into the latest html template and returned.

Under this architecture, we need to **ensure the high availability of the system**.

Suppose traffic is very high, the Nginx local cache has expired, and the cache in Redis has also been evicted by the LRU algorithm. A large volume of requests then flows from the cache service to the product service. If the product service API fails at this point and calls become slow, all the threads of the cache service get exhausted by calls to the product service API. Each thread hangs for a long time when it calls the product service API, and the many requests that arrive afterwards pile up there. The cache service then has no spare threads to call other services' APIs, so a large number of product detail pages cannot be displayed properly.

This is in fact a case where a failure of the product API service exhausts the resources of the cache service.
