import { existsSync } from 'node:fs';
import path from 'node:path';
import { contentRoot, docFile, listCollections, listDocs, loadCollection } from '../lib/content/collection';
import { LOCALES } from '../lib/content/types';
import type { Locale } from '../lib/content/types';
import { checkCollection, markReviewed, restampTranslation } from '../lib/check/compare';

const USAGE = [
  'usage: pnpm check:translations                                  check all collections',
  '       pnpm check:translations --restamp <collection>/<locale>/<slug>',
  '       pnpm check:translations --mark-reviewed <collection>/<locale>/<slug>   (OWNER-ONLY)',
].join('\n');

if (path.basename(process.argv[1] ?? '') === 'check-translations.ts') {
  const root = contentRoot();
  const args = process.argv.slice(2);
  const flags = ['--restamp', '--mark-reviewed'].filter((f) => args.includes(f));
  const usage = (why: string): never => {
    console.error(`${why}\n${USAGE}`);
    process.exit(2);
  };
  if (flags.length > 1) usage('--restamp and --mark-reviewed cannot be combined');
  const flag = flags[0];
  if (flag) {
    const parts = (args[args.indexOf(flag) + 1] ?? '').split('/');
    if (parts.length !== 3 || parts.some((p) => p === '')) usage('expected <collection>/<locale>/<slug>');
    const [collection, locale, slug] = parts as [string, Locale, string];
    if (!(LOCALES as readonly string[]).includes(locale)) usage(`unknown locale "${locale}"`);
    if (!listCollections(root).includes(collection)) usage(`unknown collection "${collection}"`);
    if (loadCollection(root, collection).sourceLocale === locale) usage('locale must not be the source locale');
    const doc = listDocs(loadCollection(root, collection)).find((d) => d.slug === slug);
    if (!doc) usage(`unknown slug "${slug}" in collection "${collection}"`);
    else if (!existsSync(docFile(root, collection, locale, doc.section, slug))) {
      usage(`no ${locale} translation file for ${collection}/${slug}`);
    }
    if (flag === '--restamp') restampTranslation(root, collection, locale, slug);
    else markReviewed(root, collection, locale, slug);
    console.log(`${flag === '--restamp' ? 'restamped' : 'marked reviewed'} ${collection}/${locale}/${slug}`);
    process.exit(0);
  }
  let failed = false;
  for (const id of listCollections(root)) {
    let r: ReturnType<typeof checkCollection>;
    try {
      r = checkCollection(root, id);
    } catch (e) {
      console.error('  ERROR ' + (e instanceof Error ? e.message : String(e)));
      process.exit(1);
    }
    console.log(`${id}: checked ${r.checked} translation(s); ${r.errors.length} error(s), ${r.warnings.length} warning(s), ${r.stale.length} stale, ${r.reviewedChanged.length} reviewed-changed`);
    for (const e of r.errors) console.error('  ERROR ' + e);
    for (const w of r.warnings) console.warn('  warn  ' + w);
    for (const s of r.stale) console.warn('  stale ' + s);
    for (const s of r.sampled) console.log('  sampled ' + s);
    if (r.errors.length) failed = true;
  }
  process.exit(failed ? 1 : 0);
}
