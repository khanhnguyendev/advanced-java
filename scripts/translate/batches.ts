import { existsSync } from 'node:fs';
import { docFile, listDocs, loadCollection } from '../../lib/content/collection';
import { isHeld, loadPolicy } from '../../lib/content/policy';

export function pendingBatches(
  root: string,
  collection: string,
  locale: 'en' | 'vi',
  size: number,
): { section: string; slugs: string[] }[] {
  if (!Number.isInteger(size) || size < 1) throw new Error(`batch size must be an integer >= 1 (got ${size})`);
  const c = loadCollection(root, collection);
  const policy = loadPolicy(root, collection);
  const bySection = new Map<string, string[]>();
  for (const d of listDocs(c)) {
    if (isHeld(policy, d.section, d.slug, locale)) continue;
    if (existsSync(docFile(root, collection, locale, d.section, d.slug))) continue;
    bySection.set(d.section, [...(bySection.get(d.section) ?? []), d.slug]);
  }
  const out: { section: string; slugs: string[] }[] = [];
  for (const [section, slugs] of bySection) {
    for (let i = 0; i < slugs.length; i += size) out.push({ section, slugs: slugs.slice(i, i + size) });
  }
  return out;
}
