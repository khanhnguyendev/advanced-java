import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface SourceCredit { title: string; author: string; publisher: string; url: string; year: number }
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
    if (typeof r.year !== 'number' || !Number.isInteger(r.year)) throw bad(`"${key}".year must be an integer`);
    out[key] = { title: r.title as string, author: r.author as string, publisher: r.publisher as string, url: r.url as string, year: r.year };
  }
  return out;
}

export function creditFor(credits: SourceCredits, section: string, slug: string): SourceCredit | undefined {
  return credits[`${section}/${slug}`];
}
