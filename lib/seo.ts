import { listCollections, listDocs, loadCollection } from './content/collection';
import { availableLocales, chainFor } from './content/fallback';
import { LOCALES, type CollectionConfig, type Locale } from './content/types';

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
  const indexEntry = (suffix: string) => {
    const alternates: Record<string, string> = {};
    for (const l of LOCALES) alternates[HREFLANG[l]] = `/${l}${suffix}`;
    alternates['x-default'] = `/en${suffix}`;
    for (const l of LOCALES) out.push({ path: `/${l}${suffix}`, alternates });
  };
  indexEntry('');
  indexEntry('/about');
  for (const id of listCollections(root)) {
    const c = loadCollection(root, id);
    indexEntry(`/${id}`);
    for (const s of c.sections) indexEntry(`/${id}/${s.id}`);
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

let warnedSiteUrl = false;

/** Test hook: lets the one-time warning fire again. */
export function resetSiteUrlWarning(): void {
  warnedSiteUrl = false;
}

export function siteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  if (!fromEnv && !process.env.VERCEL && process.env.NODE_ENV === 'production' && !warnedSiteUrl) {
    warnedSiteUrl = true;
    console.warn(
      'siteUrl: NEXT_PUBLIC_SITE_URL and VERCEL_PROJECT_PRODUCTION_URL are unset; using http://localhost:3000 for canonical and sitemap URLs.',
    );
  }
  const raw = fromEnv || 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}
