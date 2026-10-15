import { listCollections, listDocs, loadCollection } from './content/collection';
import { availableLocales, chainFor, resolveDoc } from './content/fallback';
import { LOCALES, type CollectionConfig, type Locale } from './content/types';
import { validDate } from './jsonld';

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

/** Canonical + hreflang for a locale-agnostic index page (home '', '/about', '/<collection>', '/<collection>/<section>'). */
export function indexAlternates(locale: Locale, suffix: string): DocAlternates {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[HREFLANG[l]] = `/${l}${suffix}`;
  languages['x-default'] = `/en${suffix}`;
  return { canonical: `/${locale}${suffix}`, languages };
}

export interface SitemapEntry { path: string; alternates: Record<string, string>; lastModified?: string }

export function sitemapEntries(root: string): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  const indexEntry = (suffix: string) => {
    const { languages: alternates } = indexAlternates('en', suffix);
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
      for (const l of have) {
        const stamp = resolveDoc(root, c, l, d.section, d.slug)?.frontmatter?.translatedAt;
        const entry: SitemapEntry = { path: `/${l}/${id}/${d.section}/${d.slug}`, alternates };
        if (validDate(stamp)) entry.lastModified = stamp;
        out.push(entry);
      }
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
