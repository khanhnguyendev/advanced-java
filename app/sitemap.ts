import type { MetadataRoute } from 'next';
import { contentRoot } from '@/lib/content/collection';
import { sitemapEntries, siteUrl } from '@/lib/seo';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return sitemapEntries(contentRoot()).map((e) => ({
    url: base + e.path,
    ...(e.lastModified ? { lastModified: e.lastModified } : {}),
    alternates: { languages: Object.fromEntries(Object.entries(e.alternates).map(([k, v]) => [k, base + v])) },
  }));
}
