import { listCollections, listDocs, loadCollection } from './content/collection';
import { availableLocales, chainFor } from './content/fallback';
import type { CollectionConfig, Locale } from './content/types';

export const HREFLANG: Record<Locale, string> = { en: 'en', vi: 'vi', zh: 'zh-Hans' };

export interface DocAlternates { canonical: string; languages: Record<string, string> }

export function docAlternates(
  root: string,
  c: CollectionConfig,
  requested: Locale,
  section: string,
  slug: string,
): DocAlternates {
  const have = availableLocales(root, c, section, slug);
  const path = (l: Locale) => `/${l}/${c.id}/${section}/${slug}`;
  const served = chainFor(c, requested).find((l) => have.includes(l)) ?? c.sourceLocale;
  const languages: Record<string, string> = {};
  for (const l of have) languages[HREFLANG[l]] = path(l);
  const def = have.includes('en') ? 'en' : c.sourceLocale;
  languages['x-default'] = path(def as Locale);
  return { canonical: path(served), languages };
}

export interface SitemapEntry { path: string; alternates: Record<string, string> }

export function sitemapEntries(root: string): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  for (const id of listCollections(root)) {
    const c = loadCollection(root, id);
    for (const d of listDocs(c)) {
      const have = availableLocales(root, c, d.section, d.slug);
      const alternates: Record<string, string> = {};
      for (const l of have) alternates[HREFLANG[l]] = `/${l}/${id}/${d.section}/${d.slug}`;
      const def = have.includes('en') ? 'en' : c.sourceLocale;
      alternates['x-default'] = `/${def}/${id}/${d.section}/${d.slug}`;
      for (const l of have) out.push({ path: `/${l}/${id}/${d.section}/${d.slug}`, alternates });
    }
  }
  return out;
}

export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000');
  return raw.replace(/\/+$/, '');
}
