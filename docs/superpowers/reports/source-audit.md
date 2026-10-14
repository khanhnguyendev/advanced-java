# Source audit: micro-services section and other translated-article candidates

Date: 2026-10-14. Requested by the owner (pilot report decision 3). Status: **no doc below is translated until the owner decides per doc.**

## Method and limits

- Scanned all 81 zh docs for credit/translation markers (翻译, 译, 原文, 转载, 转自, 摘自, 出自, 版权, nginx.com, martinfowler, infoq) and for long English quotations.
- Read the headings and opening/closing of every `micro-services` doc and compared their structure with the known source series.
- Searched the web and fetched what I could. The NGINX blog pages did not load (404/redirect) and the NGINX e-book PDF could not be rendered, so **I did not compare the zh text with the original paragraph by paragraph, and I could not read the original's copyright page.** "How closely" below is judged from section structure, section order and spot checks of terms, not from a diff.
- The upstream repo (doocs/advanced-java at commit 1a35221) carries no per-doc translator or license information. Where it names a source, I say so.
- I did **not** verify any original URL below from the live site; they come from the doc text or from my recollection of the NGINX blog and may redirect to f5.com.

## Audit table

| # | Doc (section `micro-services` unless noted) | Likely source and author | Upstream credits it? | How closely zh tracks the original | Rights picture | Recommendation |
|---|---|---|---|---|---|---|
| 1 | `microservices-introduction` (zh 33.6 KB, 15.6K chars) | "Microservices", Martin Fowler and James Lewis, martinfowler.com, 2014-03-25 | **Yes, in the first line**: "翻译自 Martin Fowler 网站 Microservices 一文". Translator not named; no license statement | A complete translation: same sections, same footnotes [1]–[15] (footnote text left in English), same examples (comparethemarket.com, Amazon "you build, you run it", Netflix, etc.) | martinfowler.com carries a copyright notice (© Martin Fowler); I know of no open license. Treat as all rights reserved. The zh translation's own license is unknown | **Exclude from translation** (default). Keep zh with fallback banner and a source credit. Remove the pilot en/vi translations from the served tree (done in this change; they remain in git history). Owner may instead ask Fowler/ThoughtWorks for permission or link out |
| 2 | `advantages-and-disadvantages-of-microservice` (15 KB) | "Introduction to Microservices", Chris Richardson, NGINX blog, May 2015, part 1 of the 7-part series later published as the e-book *Microservices: From Design to Deployment* (Richardson and Floyd Smith, NGINX) | **No.** No source line, no author | A full translation. Section order matches the original (monolith, monolithic hell, microservices tackling complexity, benefits, drawbacks, summary). Figures come with it (`_assets`: monolithic-application-architecture-diagram etc.) | NGINX/F5 copyright (e-book is free to read; I could not read its terms). A separate Chinese translation of the book by DocsHome is CC BY-NC-SA 4.0, but **this zh text is a different translation** (wording and numbering differ from DocsHome), so its own rights are unknown. The images are NGINX's | **Exclude** (default). Credit Richardson/NGINX on the page |
| 3 | `choose-microservice-deployment-strategy` (12 KB) | "Choosing a Deployment Strategy" (series part 6, NGINX blog), Chris Richardson | **No** | Full translation (multiple service instances per host, per VM, per container, serverless/AWS Lambda; same order) | As row 2 | **Exclude**; credit |
| 4 | `event-driven-data-management-for-microservices` (13.5 KB) | "Event-Driven Data Management for Microservices" (series part 5, NGINX blog), Chris Richardson | **No** | Full translation. Verified against the structure of the DocsHome translation of the same chapter: same sections (1.1 distributed data problem, 1.2 event-driven architecture, 1.3 achieving atomicity: local transaction publish, transaction-log mining, event sourcing, 1.4 summary). Wording differs, so it is not a copy of DocsHome | As row 2 | **Exclude**; credit |
| 5 | `migrating-from-a-monolithic-architecture-to-a-microservices-architecture` (8.9 KB) | "Refactoring a Monolith into Microservices" (series part 7, NGINX blog), Chris Richardson | **No** | Full translation (strategies 1–3: stop digging, split frontend and backend, extract services; Strangler application, anti-corruption layer) | As row 2 | **Exclude**; credit |
| 6 | `how-eureka-enable-service-discovery-and-service-registration` (13.5 KB) | Chinese original article on Eureka call flow (author unknown; probably a Chinese tech blog). Its intro paraphrases the service-discovery chapter of Richardson's series (series part 4) and it quotes the Netflix/Eureka README | **Partly.** Reference list at the end names Netflix Eureka and Richardson's "Service Discovery in a Microservices Architecture" | Mostly original Chinese commentary and code walk-through; only the introduction is derived | Author unknown, so the article's own license is unknown | **Hold** pending the owner. Probably acceptable to translate if the author is found or the intro is rewritten; otherwise exclude |
| 7 | `whats-microservice-how-to-communicate` (9 KB) | Chinese study notes, concept credited to Fowler's article with a link | Yes (link to Fowler) | Original notes with code samples | Upstream author's (石杉 project) | **Hold**, low risk; owner decides |
| 8 | `micro-service-governance` (2.3 KB) | Chinese outline of governance topics | n/a | Original | Upstream author's | **Hold**, low risk |
| 9 | `micro-services-technology-stack` (7.5 KB) | Chinese survey of tools; quotes the one-line descriptions from the tool projects' own READMEs (ZooKeeper, Hystrix, Sentinel, Zuul) | Links to each project | Original, with short quotations | Quoted descriptions come from Apache-2.0 / Netflix projects | **Hold**, low risk |
| 10 | `high-availability/sentinel-vs-hystrix` (13 KB) | Probably adapted from the Alibaba Sentinel wiki page comparing Sentinel and Hystrix (the long English quotation and the comparison table are the tell). **Not verified** | Partly (quoted English descriptions) | Unknown (not compared) | Sentinel is Apache-2.0; if adapted, the notice requirement is attribution | **Hold**. Needs a source check before any translation |

### Other docs checked, not held

| Doc | Observation | Action |
|---|---|---|
| `high-availability/hystrix-introduction` and the other 9 `hystrix-*` docs | Lecture notes that cite the Netflix Hystrix wiki ("参考 Hystrix Home"). Commentary and examples are original, structure follows the wiki | Not held; credit stays as the doc's own first line. The owner already included `hystrix-introduction` in the re-run |
| `distributed-system/distributed-system-cap` | One sentence cites a HashiCorp page ("原文地址") for a Consul claim | Not held |
| all other docs | No translation markers, no English quotation blocks beyond tool descriptions; they read as original Chinese lecture notes (the upstream project is a Chinese course's notes) | Not held |

The scan is heuristic: a doc that was translated without any marker and in a natural Chinese register would not be caught. The ten rows above are what the evidence supports.

## What was changed in the repo

- `content/advanced-java/translation-policy.json` lists the 10 held docs with the reason and `decision: "pending"`. Batching skips them, and `check:translations` fails if a translation file exists for one.
- `content/advanced-java/source-credits.json` carries a visible "Original source" credit (rows 1–5) rendered on the doc page in every locale.
- The pilot en/vi translations of row 1 are removed from the served tree (still in git history, commit before this change).
- Titles in the nav (`meta.json` titles tier) are navigation labels and are still translated for held docs; their pages open the zh text with the fallback banner. Tell me if you want held docs' titles left in zh instead.

## What I need from you, per doc

For rows 1–5: exclude (current default), or ask for permission/replace with a link, or translate anyway with a stated rationale.
For rows 6–10: translate, rewrite the derived part, or exclude. Row 10 first needs a source check; I can do that when you say so.

## Addendum 2026-10-14: verification run (owner decisions on pilot-report-2)

Credit URLs, fetched live:

| Credit | URL given | Result | Final URL used | Page title | Author / date |
|---|---|---|---|---|---|
| Fowler and Lewis | https://martinfowler.com/articles/microservices.html | 200, same URL | same | "Microservices" | James Lewis and Martin Fowler, 25 March 2014; footer "© Martin Fowler" |
| Richardson part 1 | https://www.nginx.com/blog/introduction-to-microservices/ | 301 to the generic https://www.f5.com/products/nginx page (not the article) | https://www.f5.com/company/blog/nginx/introduction-to-microservices | "Introduction to Microservices \| F5" | Chris Richardson, May 19, 2015; "©2026 F5, Inc. All Rights Reserved" |
| Richardson part 5 | https://www.nginx.com/blog/event-driven-data-management-microservices/ | 301 to the generic product page | https://www.f5.com/company/blog/nginx/event-driven-data-management-microservices | "Event-Driven Data Management for Microservices \| F5" | Chris Richardson, December 04, 2015; © F5 |
| Richardson part 6 | https://www.nginx.com/blog/deploying-microservices/ | 301 to the generic product page | https://www.f5.com/company/blog/nginx/deploying-microservices | "Choosing a Microservices Deployment Strategy" | Chris Richardson, February 10, 2016; © F5 |
| Richardson part 7 | https://www.nginx.com/blog/refactoring-a-monolith-into-microservices/ | 301 to the generic product page | https://www.f5.com/company/blog/nginx/refactoring-a-monolith-into-microservices | "Refactoring a Monolith into Microservices \| F5" | Chris Richardson, March 08, 2016; © F5 |

The four NGINX URLs from recollection are dead (they redirect to a product page); the f5.com URLs above are verified and are what `source-credits.json` now carries. All four Richardson pages are "©2026 F5, Inc. All Rights Reserved": no open license.

Row 6 (`how-eureka-enable-service-discovery-and-service-registration`): searched again with the doc's title and a distinctive sentence; no source found. **Unresolved, stays held.** Note that most Chinese Eureka tutorials share this structure, so the text may be a rewrite or a repost.

Row 10 (`high-availability/sentinel-vs-hystrix`): verified. It is adapted from the Sentinel wiki page "Sentinel 与 Hystrix 的对比" (github.com/alibaba/Sentinel/wiki/Sentinel-与-Hystrix-的对比): the opening paragraph and the 11-row comparison table match the wiki's. The doc adds a title, a project link and some sections. License: the repository alibaba/Sentinel declares Apache-2.0 and the wiki declares no separate license (GitHub footer only). Apache-2.0 attaches to the repository; whether it covers wiki pages is not stated, so the position is unclear. **Stays held**, as instructed.
