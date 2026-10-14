import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../content/advanced-java');
const LOCALES = ['zh', 'en', 'vi'] as const;

/** Diagram ids intentionally not referenced by any doc (none at cutover time). */
const UNREFERENCED: string[] = [];

function walk(dir: string, ext: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (n.endsWith(ext)) out.push(p);
  }
  return out;
}

const diagrams = walk(path.join(ROOT, '_diagrams'), '.diagram.json').map((f) => {
  const d = JSON.parse(readFileSync(f, 'utf8')) as { id: string; source: { upstream: string } };
  return { id: d.id, upstream: d.source.upstream, file: f };
});
const docs = LOCALES.flatMap((loc) =>
  walk(path.join(ROOT, loc), '.md').map((f) => ({ loc, f, text: readFileSync(f, 'utf8') })),
);
const refs = (re: RegExp) => docs.flatMap((d) => [...d.text.matchAll(re)].map((m) => ({ ...d, ref: m[1]! })));

describe('diagram cutover', () => {
  it('has diagrams and docs', () => {
    expect(diagrams.length).toBeGreaterThan(0);
    expect(docs.length).toBeGreaterThan(0);
  });

  it('no doc still references the raster of a redrawn diagram', () => {
    const upstream = new Set(diagrams.map((d) => d.upstream));
    const left = refs(/\(asset:([^)\s]+)/g).filter((r) => upstream.has(r.ref));
    expect(left.map((r) => `${r.loc}: ${path.basename(r.f)} -> ${r.ref}`)).toEqual([]);
  });

  it('every diagram: reference resolves to a diagram with zh/en/vi labels', () => {
    const bad: string[] = [];
    for (const r of refs(/\(diagram:([^)\s]+)/g)) {
      const base = path.join(ROOT, '_diagrams', r.ref);
      const ok =
        existsSync(`${base}.diagram.json`) && LOCALES.every((l) => existsSync(`${base}.labels.${l}.json`));
      if (!ok) bad.push(`${r.loc}: ${path.basename(r.f)} -> ${r.ref}`);
    }
    expect(bad).toEqual([]);
  });

  it('every diagram is referenced by a doc unless allow-listed', () => {
    const used = new Set(refs(/\(diagram:([^)\s]+)/g).map((r) => r.ref));
    const unref = diagrams.map((d) => d.id).filter((id) => !used.has(id) && !UNREFERENCED.includes(id));
    expect(unref).toEqual([]);
  });
});
