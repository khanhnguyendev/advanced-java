import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(__dirname, '..');
const C = path.join(ROOT, 'content/advanced-java');
export const SECTIONS = ['high-concurrency', 'distributed-system', 'high-availability', 'micro-services', 'big-data'];

export function sectionOf(slug: string): string {
  for (const s of SECTIONS) if (existsSync(path.join(C, 'zh', s, `${slug}.md`))) return s;
  throw new Error(`no section for ${slug}`);
}

export function hasLocale(locale: 'en' | 'vi', slug: string): boolean {
  return existsSync(path.join(C, locale, sectionOf(slug), `${slug}.md`));
}

export function allSlugs(): string[] {
  return SECTIONS.flatMap((s) =>
    readdirSync(path.join(C, 'zh', s))
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.slice(0, -3)),
  );
}

export function firstUntranslated(locale: 'en' | 'vi'): string | undefined {
  return allSlugs().find((s) => !hasLocale(locale, s));
}

/** First slug with neither a vi nor an en file: the vi chain (vi -> en -> zh) renders zh for it. */
export function firstZhOnly(): string | undefined {
  return allSlugs().find((s) => !hasLocale('vi', s) && !hasLocale('en', s));
}

export const PILOT = 'why-mq';

/** CJK font file names grouped by font-weight (each weight has its own set of unicode-range slices). */
export function cjkFontUrlsByWeight(): Map<string, string[]> {
  // Turbopack emits CSS under static/chunks; webpack under static/css.
  const files = ['.next/static/chunks', '.next/static/css'].flatMap((rel) => {
    const dir = path.join(ROOT, rel);
    return existsSync(dir) ? readdirSync(dir).filter((x) => x.endsWith('.css')).map((x) => path.join(dir, x)) : [];
  });
  const byWeight = new Map<string, string[]>();
  for (const file of files) {
    const css = readFileSync(file, 'utf8');
    for (const m of css.matchAll(/@font-face\s*{[^}]*font-family:\s*['"]?([^;'"]+)['"]?;[^}]*}/g)) {
      if (!/Noto_Serif_SC|Noto Serif SC/.test(m[1])) continue;
      const weight = /font-weight:\s*([^;}]+)/.exec(m[0])?.[1].trim() ?? 'normal';
      for (const u of m[0].matchAll(/url\(([^)]+)\)/g)) {
        const list = byWeight.get(weight) ?? [];
        list.push(u[1].replace(/['"]/g, '').split('/').pop()!);
        byWeight.set(weight, list);
      }
    }
  }
  return byWeight;
}

export function cjkFontUrls(): string[] {
  return [...cjkFontUrlsByWeight().values()].flat();
}
