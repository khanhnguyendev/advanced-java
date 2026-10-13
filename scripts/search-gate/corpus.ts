import matter from 'gray-matter';
import { toString } from 'mdast-util-to-string';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { listDocs, loadCollection, loadMeta } from '../../lib/content/collection';
import { resolveDoc } from '../../lib/content/fallback';
import type { Locale } from '../../lib/content/types';

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
