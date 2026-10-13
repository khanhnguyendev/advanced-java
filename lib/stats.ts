import { existsSync } from 'node:fs';
import { docFile, listDocs } from './content/collection';
import { LOCALES, type CollectionConfig, type Locale } from './content/types';

export interface CollectionStats { collection: string; total: number; perLocale: Record<Locale, number> }

export function collectionStats(root: string, c: CollectionConfig): CollectionStats {
  const docs = listDocs(c);
  const perLocale = Object.fromEntries(LOCALES.map((l) => [l, 0])) as Record<Locale, number>;
  for (const l of LOCALES) {
    perLocale[l] = docs.filter((d) => existsSync(docFile(root, c.id, l, d.section, d.slug))).length;
  }
  return { collection: c.id, total: docs.length, perLocale };
}
