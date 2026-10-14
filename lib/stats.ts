import { existsSync } from 'node:fs';
import { docFile, listDocs } from './content/collection';
import { switcherStatus } from './nav';
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

export type DocStatusKind = 'translated' | 'machine' | 'fallback';
export interface StatusCounts { total: number; translated: number; machine: number; fallback: number }

/** Counts statuses with the semantics of switcherStatus: translated = source or reviewed, machine, fallback = not translated. */
export function countStatuses(statuses: readonly DocStatusKind[]): StatusCounts {
  const out: StatusCounts = { total: statuses.length, translated: 0, machine: 0, fallback: 0 };
  for (const s of statuses) out[s] += 1;
  return out;
}

export interface SectionStats {
  id: string;
  total: number;
  perLocale: Record<Locale, StatusCounts>;
}

/** Per section, per locale status counts; uses switcherStatus so the home rows and SectionCount agree. */
export function sectionStats(root: string, c: CollectionConfig): SectionStats[] {
  return c.sections.map((s) => {
    const slugs = s.groups.flatMap((g) => g.docs);
    const perLocale = Object.fromEntries(
      LOCALES.map((l) => [l, countStatuses(slugs.map((slug) => switcherStatus(root, c, l, s.id, slug)))]),
    ) as Record<Locale, StatusCounts>;
    return { id: s.id, total: slugs.length, perLocale };
  });
}
