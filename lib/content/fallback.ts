import { existsSync, readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { docFile } from './collection';
import { canonicalHash } from './hash';
import { LOCALES } from './types';
import type { CollectionConfig, DocFrontmatter, Locale } from './types';

export interface ResolvedDoc {
  requested: Locale;
  served: Locale;
  fallback: boolean;
  file: string;
  frontmatter?: DocFrontmatter;
  body: string;
}

const SAFE = /^[a-z0-9-]+$/;

export function chainFor(c: CollectionConfig, locale: Locale): Locale[] {
  return Array.from(new Set<Locale>([locale, ...(c.fallback[locale] ?? [])]));
}

export function resolveDoc(
  root: string,
  c: CollectionConfig,
  locale: Locale,
  section: string,
  slug: string,
): ResolvedDoc | null {
  if (!SAFE.test(section) || !SAFE.test(slug)) return null;
  for (const served of chainFor(c, locale)) {
    const file = docFile(root, c.id, served, section, slug);
    if (!existsSync(file)) continue;
    const parsed = matter(readFileSync(file, 'utf8'));
    const isSource = served === c.sourceLocale;
    return {
      requested: locale,
      served,
      fallback: served !== locale,
      file,
      frontmatter: isSource ? undefined : (parsed.data as DocFrontmatter),
      body: parsed.content.replace(/^\n+/, ''),
    };
  }
  return null;
}

export function availableLocales(root: string, c: CollectionConfig, section: string, slug: string): Locale[] {
  if (!SAFE.test(section) || !SAFE.test(slug)) return [];
  return LOCALES.filter((l) => existsSync(docFile(root, c.id, l, section, slug)));
}

export function zhHashOf(root: string, c: CollectionConfig, section: string, slug: string): string {
  if (!SAFE.test(section) || !SAFE.test(slug)) throw new Error(`invalid section/slug: ${section}/${slug}`);
  const file = docFile(root, c.id, c.sourceLocale, section, slug);
  return canonicalHash(matter(readFileSync(file, 'utf8')).content);
}
