# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Confirmed by user: Next.js 16 (latest), deployed on Vercel, full static generation (no ISR). Content as markdown/MDX in repo. Locales: vi, en, zh (source).

## Users
Inferred, not yet confirmed: software engineers (Vietnamese- and English-speaking first, Chinese readers via the source locale) studying Java backend/distributed-systems architecture, mostly for technical interviews. They read long prose at a desk or on a phone, often side by side with code or notes, in multi-hour study sessions.

## Product Purpose
A multilingual reading site for the doocs/advanced-java corpus (81 Chinese docs on high concurrency, distributed systems, high availability, microservices, big-data problems), translated to en and vi, built to take more doc collections (DSA, Python, ...) later without a rewrite. Success: a reader finds a topic, reads it comfortably in their language, and moves to the next one without friction.

## Positioning
The only place this corpus exists in clean Vietnamese and English, with the original Chinese one switch away, and a collection model that lets new subjects join the same reading experience.

## Operating Context
Docs are interview-style Q&A: "interview question", "interviewer psychology", then a long explained answer with diagrams (~190 images). Content is organized into 5 sections with ordered sub-topics. Translation can be partial for future collections: a doc missing in a locale falls back to the source with a visible notice.

## Capabilities and Constraints
- Locales vi, en, zh with per-doc fallback and a "not translated yet" notice.
- Collection-based content model; adding a collection is config plus a content folder.
- Search, sidebar/TOC wayfinding, prev/next, light/dark. Comments (giscus in the original): **deferred**, out of v1, mount point reserved.
- Content license CC-BY-SA-4.0 for everything under `content/`: attribution to Doocs and 中华石杉 required, share-alike applies, a statement of changes on every page. Application code is MIT-licensed (owner decision). README and /about state the split.
- vi and en are each translated directly from zh, never from each other; status `machine` or `reviewed`, only the owner sets `reviewed`.
- Deploy: Vercel Git integration preferred (no token on disk); a token in `.env.local` is the fallback and is never printed. Production only on the owner's explicit promotion.
- Deferred: comments. Undecided: analytics, custom domain.

## Brand Commitments
Name "advanced-java" and Doocs attribution stay. Logo/icon asset at ref/docs/public/icon.png. No other binding visual commitments; user delegated the visual direction to Impeccable.

## Evidence on Hand
Real content: ref/docs/**/*.md (92 files, of which 81 are docs; the rest are section indexes, promos and home), ref/docs/**/images (~190 diagrams), ref/docs/public icons. No testimonials, metrics, or usage data; none to be invented.

## Product Principles
1. Reading comfort over chrome: long-form CJK, Vietnamese and Latin text must all set well.
2. The language switch is always one step away and never loses the reader's place.
3. Untranslated is visible, never silent.
4. A new collection must feel native on day one, not bolted on.
5. Credit the source honestly.

## Accessibility & Inclusion
Vietnamese diacritics and CJK glyph coverage in the type stack; WCAG AA contrast in light and dark; keyboard navigable sidebar, search and language switcher; respects reduced motion.
