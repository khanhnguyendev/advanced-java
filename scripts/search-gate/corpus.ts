import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { toString } from 'mdast-util-to-string';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { listDocs, loadCollection, loadMeta } from '../../lib/content/collection';
import { resolveDoc } from '../../lib/content/fallback';
import type { Locale } from '../../lib/content/types';
import { foldDiacritics } from '../../lib/search/fold';

export interface CorpusDoc {
  slug: string;
  section: string;
  title: string;
  body: string;
  lang: Locale;
  fallback: boolean;
  href: string;
}

export function plainText(md: string): string {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(matter(md).content);
  return toString(tree, { includeHtml: false });
}

export function buildCorpus(root: string, collection: string, locale: Locale): CorpusDoc[] {
  const c = loadCollection(root, collection);
  const own = loadMeta(root, collection, locale);
  const src = loadMeta(root, collection, c.sourceLocale);
  const out: CorpusDoc[] = [];
  for (const d of listDocs(c)) {
    const r = resolveDoc(root, c, locale, d.section, d.slug);
    if (!r) continue;
    out.push({
      slug: d.slug,
      section: d.section,
      title: own.docs[d.slug]?.title ?? src.docs[d.slug]?.title ?? d.slug,
      body: plainText(r.body),
      lang: r.served,
      fallback: r.fallback,
      href: `/${locale}/${collection}/${d.section}/${d.slug}`,
    });
  }
  return out;
}

export const escHtml = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Static HTML for one doc as indexed by Pagefind (shared by the gate runner and the build script). */
export function searchPageHtml(d: CorpusDoc, locale: Locale, collection: string): string {
  const folded = locale === 'vi' ? foldDiacritics(`${d.title} ${d.body}`) : '';
  const dup = folded && folded !== `${d.title} ${d.body}` ? `<p data-pagefind-weight="0.5">${escHtml(folded)}</p>` : '';
  const meta = (k: string, v: string) => `<span hidden data-pagefind-meta="${k}:${escHtml(v.replace(/,/g, '%2C'))}"></span>`;
  return (
    `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${escHtml(d.title)}</title></head>` +
    `<body data-pagefind-body data-pagefind-filter="collection:${escHtml(collection)}">` +
    `<h1>${escHtml(d.title)}</h1>` +
    meta('slug', d.slug) + meta('section', d.section) + meta('lang', d.lang) + meta('fallback', String(d.fallback)) + meta('href', d.href) +
    `<p>${escHtml(d.body)}</p>${dup}</body></html>`
  );
}

/** Write `<siteDir>/<locale>/<section>/<slug>.html` for every doc. Returns the file count. */
export function writeSearchSite(corpus: Record<Locale, CorpusDoc[]>, siteDir: string, collection: string): number {
  let n = 0;
  for (const locale of Object.keys(corpus) as Locale[]) {
    for (const d of corpus[locale]) {
      const dir = path.join(siteDir, locale, d.section);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, `${d.slug}.html`), searchPageHtml(d, locale, collection));
      n += 1;
    }
  }
  return n;
}
