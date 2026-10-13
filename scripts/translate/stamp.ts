import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { compareTranslation, loadExceptions, type Issue } from '../../lib/check/compare';
import { docFile, loadCollection } from '../../lib/content/collection';
import { parse } from '../../lib/content/fallback';
import { canonicalHash } from '../../lib/content/hash';

export function stampTranslation(i: {
  root: string;
  collection: string;
  locale: 'en' | 'vi';
  section: string;
  slug: string;
  translatedBody: string;
  today: string;
}): { written: boolean; file: string; issues: Issue[] } {
  const c = loadCollection(i.root, i.collection);
  const zhFile = docFile(i.root, i.collection, c.sourceLocale, i.section, i.slug);
  const zhBody = parse(readFileSync(zhFile, 'utf8')).content;
  // drop any frontmatter the model added; the stamp is the only source of frontmatter
  const body = parse(i.translatedBody).content.replace(/^\n+/, '');
  const exceptions = loadExceptions(i.root, i.collection);
  const tag = `${i.locale}/${i.section}/${i.slug}`;

  const issues = compareTranslation(zhBody, body, {
    exceptions: (exceptions[tag] ?? []).map((e) => e.code),
    locale: i.locale,
  });
  const file = docFile(i.root, i.collection, i.locale, i.section, i.slug);
  if (issues.some((x) => x.level === 'error')) return { written: false, file, issues };

  // status is always 'machine'; reviewed/reviewedHash are owner-only (markReviewed)
  const data = {
    source: { locale: c.sourceLocale, slug: i.slug, hash: canonicalHash(zhBody) },
    status: 'machine',
    translatedAt: i.today,
  };
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, matter.stringify(body, data));
  return { written: true, file, issues };
}
