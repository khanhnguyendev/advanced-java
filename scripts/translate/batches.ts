import { existsSync } from 'node:fs';
import { docFile, listDocs, loadCollection } from '../../lib/content/collection';

export function pendingBatches(
  root: string,
  collection: string,
  locale: 'en' | 'vi',
  size: number,
): { section: string; slugs: string[] }[] {
  const c = loadCollection(root, collection);
  const bySection = new Map<string, string[]>();
  for (const d of listDocs(c)) {
    if (existsSync(docFile(root, collection, locale, d.section, d.slug))) continue;
    bySection.set(d.section, [...(bySection.get(d.section) ?? []), d.slug]);
  }
  const out: { section: string; slugs: string[] }[] = [];
  for (const [section, slugs] of bySection) {
    for (let i = 0; i < slugs.length; i += size) out.push({ section, slugs: slugs.slice(i, i + size) });
  }
  return out;
}
