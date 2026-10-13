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

const rejectJs = () => {
  throw new Error('js frontmatter is not allowed');
};

function parse(raw: string) {
  return matter(raw, { engines: { js: rejectJs, javascript: rejectJs } });
}

function normalizeFrontmatter(data: Record<string, unknown>): DocFrontmatter | undefined {
  if (!data || typeof data.source !== 'object' || data.source === null) return undefined;
  const fm = { ...data } as Record<string, unknown>;
  if (fm.translatedAt instanceof Date) fm.translatedAt = fm.translatedAt.toISOString().slice(0, 10);
  return fm as unknown as DocFrontmatter;
}

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
    const parsed = parse(readFileSync(file, 'utf8'));
    const isSource = served === c.sourceLocale;
    return {
      requested: locale,
      served,
      fallback: served !== locale,
      file,
      frontmatter: isSource ? undefined : normalizeFrontmatter(parsed.data),
      body: parsed.content.replace(/^(?:\r?\n)+/, ''),
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
  return canonicalHash(parse(readFileSync(file, 'utf8')).content);
}
