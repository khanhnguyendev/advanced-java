import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const C = 'content/advanced-java';
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

export const PILOT = 'why-mq';

export function cjkFontUrls(): string[] {
  // Turbopack emits CSS under static/chunks; webpack under static/css.
  const files = ['.next/static/chunks', '.next/static/css'].flatMap((dir) =>
    existsSync(dir) ? readdirSync(dir).filter((x) => x.endsWith('.css')).map((x) => path.join(dir, x)) : [],
  );
  const urls: string[] = [];
  for (const file of files) {
    const css = readFileSync(file, 'utf8');
    for (const m of css.matchAll(/@font-face\s*{[^}]*font-family:\s*['"]?([^;'"]+)['"]?;[^}]*}/g)) {
      if (/Noto_Serif_SC|Noto Serif SC/.test(m[1])) {
        for (const u of m[0].matchAll(/url\(([^)]+)\)/g)) urls.push(u[1].replace(/['"]/g, '').split('/').pop()!);
      }
    }
  }
  return urls;
}
