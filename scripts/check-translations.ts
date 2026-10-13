import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { contentRoot, loadCollection } from '../lib/content/collection';
import { LOCALES } from '../lib/content/types';
import type { Locale } from '../lib/content/types';
import { checkCollection, markReviewed, restampTranslation } from '../lib/check/compare';

// lib/content/collection.ts has no listCollections; a collection is any content/<id>/collection.json.
function listCollections(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(path.join(root, e.name, 'collection.json')))
    .map((e) => e.name)
    .sort();
}

const USAGE = [
  'usage: pnpm check:translations                                  check all collections',
  '       pnpm check:translations --restamp <collection>/<locale>/<slug>',
  '       pnpm check:translations --mark-reviewed <collection>/<locale>/<slug>   (OWNER-ONLY)',
].join('\n');

if (path.basename(process.argv[1] ?? '') === 'check-translations.ts') {
  const root = contentRoot();
  const args = process.argv.slice(2);
  const flag = ['--restamp', '--mark-reviewed'].find((f) => args.includes(f));
  if (flag) {
    const parts = (args[args.indexOf(flag) + 1] ?? '').split('/');
    const usage = (why: string) => {
      console.error(`${why}\n${USAGE}`);
      process.exit(2);
    };
    if (parts.length !== 3 || parts.some((p) => p === '')) usage('expected <collection>/<locale>/<slug>');
    const [collection, locale, slug] = parts as [string, Locale, string];
    if (!(LOCALES as readonly string[]).includes(locale)) usage(`unknown locale "${locale}"`);
    if (!listCollections(root).includes(collection)) usage(`unknown collection "${collection}"`);
    if (loadCollection(root, collection).sourceLocale === locale) usage('locale must not be the source locale');
    if (flag === '--restamp') restampTranslation(root, collection, locale, slug);
    else markReviewed(root, collection, locale, slug);
    console.log(`${flag === '--restamp' ? 'restamped' : 'marked reviewed'} ${collection}/${locale}/${slug}`);
    process.exit(0);
  }
  let failed = false;
  for (const id of listCollections(root)) {
    const r = checkCollection(root, id);
    console.log(`${id}: checked ${r.checked} translation(s); ${r.errors.length} error(s), ${r.warnings.length} warning(s), ${r.stale.length} stale, ${r.reviewedChanged.length} reviewed-changed`);
    for (const e of r.errors) console.error('  ERROR ' + e);
    for (const w of r.warnings) console.warn('  warn  ' + w);
    for (const s of r.stale) console.warn('  stale ' + s);
    for (const s of r.sampled) console.log('  sampled ' + s);
    if (r.errors.length) failed = true;
  }
  process.exit(failed ? 1 : 0);
}
