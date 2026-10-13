import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { contentRoot } from '../lib/content/collection';
import type { Locale } from '../lib/content/types';
import { checkCollection, restampTranslation } from '../lib/check/compare';

// lib/content/collection.ts has no listCollections; a collection is any content/<id>/collection.json.
function listCollections(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(path.join(root, e.name, 'collection.json')))
    .map((e) => e.name)
    .sort();
}

if (path.basename(process.argv[1] ?? '') === 'check-translations.ts') {
  const root = contentRoot();
  const args = process.argv.slice(2);
  const restamp = args.indexOf('--restamp');
  if (restamp !== -1) {
    const [collection, locale, slug] = args[restamp + 1].split('/') as [string, Locale, string];
    restampTranslation(root, collection, locale, slug);
    console.log(`restamped ${collection}/${locale}/${slug}`);
    process.exit(0);
  }
  let failed = false;
  for (const id of listCollections(root)) {
    const r = checkCollection(root, id);
    console.log(`${id}: checked ${r.checked} translation(s); ${r.errors.length} error(s), ${r.warnings.length} warning(s), ${r.stale.length} stale`);
    for (const e of r.errors) console.error('  ERROR ' + e);
    for (const w of r.warnings) console.warn('  warn  ' + w);
    for (const s of r.stale) console.warn('  stale ' + s);
    if (r.errors.length) failed = true;
  }
  process.exit(failed ? 1 : 0);
}
