import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { compareTranslationDetailed, loadExceptions, type Issue } from '../../lib/check/compare';
import { docFile, loadCollection } from '../../lib/content/collection';
import { parse } from '../../lib/content/fallback';
import { canonicalHash } from '../../lib/content/hash';
import { heldMessage, loadPolicy } from '../../lib/content/policy';

export function stampTranslation(i: {
  root: string;
  collection: string;
  locale: 'en' | 'vi';
  section: string;
  slug: string;
  translatedBody: string;
  today: string;
  force?: boolean;
}): { written: boolean; file: string; issues: Issue[]; waived: (Issue & { reason: string })[] } {
  if (!/^[a-z0-9-]+$/.test(i.section) || !/^[a-z0-9-]+$/.test(i.slug)) {
    throw new Error(`invalid section/slug: ${i.section}/${i.slug}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.today)) throw new Error(`today must be YYYY-MM-DD (got "${i.today}")`);
  const c = loadCollection(i.root, i.collection);
  const held = heldMessage(loadPolicy(i.root, i.collection), i.section, i.slug, i.locale);
  if (held) {
    const f = docFile(i.root, i.collection, i.locale, i.section, i.slug);
    return { written: false, file: f, issues: [{ level: 'error', code: 'held-doc', message: held }], waived: [] };
  }
  const zhFile = docFile(i.root, i.collection, c.sourceLocale, i.section, i.slug);
  const zhBody = parse(readFileSync(zhFile, 'utf8')).content;
  // drop any frontmatter the model added; the stamp is the only source of frontmatter
  const body = parse(i.translatedBody).content.replace(/^\n+/, '');
  const exceptions = loadExceptions(i.root, i.collection);
  const tag = `${i.locale}/${i.section}/${i.slug}`;

  const entries = exceptions[tag] ?? [];
  const r = compareTranslationDetailed(zhBody, body, { exceptions: entries.map((e) => e.code), locale: i.locale });
  const issues = [...r.issues];
  const waived = r.waived.map((w) => ({ ...w, reason: entries.find((e) => e.code === w.code)?.reason ?? '' }));
  const file = docFile(i.root, i.collection, i.locale, i.section, i.slug);
  if (issues.some((x) => x.level === 'error')) return { written: false, file, issues, waived };

  if (existsSync(file) && i.force !== true) {
    const existing = parse(readFileSync(file, 'utf8')).data as { status?: string };
    if (existing.status === 'reviewed') {
      issues.push({
        level: 'error',
        code: 'would-overwrite-reviewed',
        message: 'refusing to overwrite a reviewed translation',
      });
      return { written: false, file, issues, waived };
    }
  }

  // status is always 'machine'; reviewed/reviewedHash are owner-only (markReviewed)
  const data = {
    source: { locale: c.sourceLocale, slug: i.slug, hash: canonicalHash(zhBody) },
    status: 'machine',
    translatedAt: i.today,
  };
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, matter.stringify(body, data));
  return { written: true, file, issues, waived };
}
