import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface SourceCredit {
  title: string;
  author: string;
  publisher: string;
  url: string;
  /** required for kind 'translation'; optional for an adaptation */
  year?: number;
  /** 'translation' (default): the zh text is a translation of the original; 'adaptation': an adaptation of it */
  kind?: 'translation' | 'adaptation';
  license?: { name: string; url: string };
}
export type SourceCredits = Record<string, SourceCredit>;

/** Loads per-doc source credits. URLs are never fetched or verified here. */
export function loadCredits(root: string, collection: string): SourceCredits {
  const file = path.join(root, collection, 'source-credits.json');
  if (!existsSync(file)) return {};
  const bad = (why: string) => new Error(`${file}: ${why}`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw bad(`invalid JSON (${(e as Error).message})`);
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw bad('expected an object keyed by "<section>/<slug>"');
  const out: SourceCredits = {};
  for (const [key, v] of Object.entries(raw)) {
    if (typeof v !== 'object' || v === null) throw bad(`"${key}" must be an object`);
    const r = v as Record<string, unknown>;
    for (const f of ['title', 'author', 'publisher', 'url'] as const) {
      if (typeof r[f] !== 'string' || (r[f] as string).trim() === '') throw bad(`"${key}".${f} must be a non-empty string`);
    }
    if (!/^https?:\/\//i.test(r.url as string)) throw bad(`"${key}".url must be an http(s) URL`);
    if (r.kind !== undefined && r.kind !== 'translation' && r.kind !== 'adaptation') throw bad(`"${key}".kind must be "translation" or "adaptation"`);
    const kind = (r.kind as 'translation' | 'adaptation' | undefined) ?? 'translation';
    if (r.year !== undefined) {
      if (typeof r.year !== 'number' || !Number.isInteger(r.year)) throw bad(`"${key}".year must be an integer`);
    } else if (kind === 'translation') throw bad(`"${key}".year must be an integer`);
    const credit: SourceCredit = { title: r.title as string, author: r.author as string, publisher: r.publisher as string, url: r.url as string };
    if (r.year !== undefined) credit.year = r.year as number;
    if (r.kind !== undefined) credit.kind = kind;
    if (r.license !== undefined) {
      const l = r.license as Record<string, unknown> | null;
      if (typeof l !== 'object' || l === null || Array.isArray(l)) throw bad(`"${key}".license must be an object`);
      for (const f of ['name', 'url'] as const) {
        if (typeof l[f] !== 'string' || (l[f] as string).trim() === '') throw bad(`"${key}".license.${f} must be a non-empty string`);
      }
      if (!/^https?:\/\//i.test(l.url as string)) throw bad(`"${key}".license.url must be an http(s) URL`);
      credit.license = { name: l.name as string, url: l.url as string };
    }
    out[key] = credit;
  }
  return out;
}

export function creditFor(credits: SourceCredits, section: string, slug: string): SourceCredit | undefined {
  return credits[`${section}/${slug}`];
}
