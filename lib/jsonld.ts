export type JsonLd = Record<string, unknown>;

export const CC_BY_SA = 'https://creativecommons.org/licenses/by-sa/4.0/';

/** Serializes for an inline <script type="application/ld+json">: "<" is escaped so "</script>" cannot appear. */
export function serializeJsonLd(data: JsonLd): string {
  // separators are built from char codes: a literal in the source is emitted raw by the bundler and breaks the chunk
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .split(String.fromCharCode(0x2028)).join('\\u2028')
    .split(String.fromCharCode(0x2029)).join('\\u2029');
}

export function websiteLd(o: { name: string; url: string; inLanguage: string; description: string }): JsonLd {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: o.name, url: o.url, inLanguage: o.inLanguage, description: o.description };
}

export interface CreditInput {
  kind?: 'translation' | 'adaptation' | 'derived';
  title: string;
  author: string;
  url: string;
  license?: { name: string; url: string };
}

export interface TechArticleInput {
  headline: string;
  description: string;
  /** BCP-47 tag of the language actually served */
  inLanguage: string;
  url: string;
  siteName: string;
  siteUrl: string;
  /** the credit text the page shows; for a credited doc it must be the visible attribution text */
  creditText: string;
  /** frontmatter translatedAt; omitted from the output when absent or not an ISO date */
  dateModified?: string;
  /** third-party original, when the doc itself credits one; replaces the site's CC-BY-SA license claim */
  credit?: CreditInput;
}

const ORG_NAME = /contributors|project|blog/i;

export function agentLd(name: string): JsonLd {
  return { '@type': ORG_NAME.test(name) ? 'Organization' : 'Person', name };
}

export function validDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s);
}

export function techArticleLd(o: TechArticleInput): JsonLd {
  const out: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: o.headline,
    description: o.description,
    inLanguage: o.inLanguage,
    url: o.url,
    isPartOf: { '@type': 'WebSite', name: o.siteName, url: o.siteUrl },
  };
  if (!o.credit) out.license = CC_BY_SA;
  out.creditText = o.creditText;
  if (validDate(o.dateModified)) out.dateModified = o.dateModified;
  const c = o.credit;
  if (c) {
    const work: JsonLd = { '@type': 'CreativeWork', name: c.title, author: agentLd(c.author), url: c.url };
    const kind = c.kind ?? 'translation';
    if (kind === 'translation') out.translationOfWork = work;
    else if (kind === 'adaptation') out.isBasedOn = c.license ? { ...work, license: c.license.url } : work;
    else out.citation = work;
  }
  return out;
}

/** Consecutive crumbs with the same name collapse to one (the later one is kept only when it is the current page). */
export function dedupeCrumbs<T extends { name: string }>(items: T[]): T[] {
  const out: T[] = [];
  items.forEach((it, i) => {
    const prev = out[out.length - 1];
    if (prev && prev.name === it.name) {
      if (i === items.length - 1) out[out.length - 1] = it;
      return;
    }
    out.push(it);
  });
  return out;
}

export function breadcrumbLd(items: { name: string; url: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: dedupeCrumbs(items).map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}
