/**
 * One-off cutover (2026-10-14, owner-approved): switch doc image references from the
 * upstream rasters to the redrawn diagrams.
 *   ![alt](asset:<source.upstream>)  ->  ![alt](diagram:<id>)
 * Only exact, case-sensitive full-path matches of a diagram's `source.upstream` are replaced;
 * alt text and the rest of the line are untouched. Idempotent. Run: pnpm tsx scripts/diagrams-cutover.ts
 * Kept in the repo as a record; the staleness hashes are restamped separately with
 * `pnpm check:translations --restamp`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', 'content', 'advanced-java');
const LOCALES = ['zh', 'en', 'vi'];

function walk(dir: string, ext: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (n.endsWith(ext)) out.push(p);
  }
  return out;
}

const map = new Map<string, string>(); // upstream -> id
for (const f of walk(path.join(ROOT, '_diagrams'), '.diagram.json')) {
  const d = JSON.parse(readFileSync(f, 'utf8')) as { id: string; source: { upstream: string } };
  map.set(d.source.upstream, d.id);
}

const used = new Set<string>();
const changed: Record<string, string[]> = { zh: [], en: [], vi: [] };
for (const loc of LOCALES) {
  for (const f of walk(path.join(ROOT, loc), '.md')) {
    const src = readFileSync(f, 'utf8');
    const out = src.replace(/\(asset:([^)\s]+)/g, (m, up: string) => {
      const id = map.get(up);
      if (!id) return m;
      used.add(up);
      return `(diagram:${id}`;
    });
    if (out !== src) {
      writeFileSync(f, out);
      changed[loc]!.push(path.relative(ROOT, f));
    }
  }
}
console.log(`mapped diagrams: ${map.size}`);
for (const loc of LOCALES) console.log(`${loc}: ${changed[loc]!.length} docs changed`);
const unref = [...map.keys()].filter((u) => !used.has(u));
console.log(`diagrams with no doc reference in this run: ${unref.length}`);
for (const u of unref) console.log(`  ${u}`);
console.log('changed zh docs:\n' + changed.zh!.join('\n'));
