import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkDiagram } from '@/lib/diagrams/gate';
import { findConflicts, mergeGlossaries } from '@/lib/diagrams/glossary';
import { normLabel } from '@/lib/diagrams/glossary-norm';
import { listDiagrams } from '@/lib/diagrams/load';
import { buildReviewData } from '@/lib/diagrams/review-data';
import type { GlossaryEntry, LabelsByLocale } from '@/lib/diagrams/types';
import { runGate } from '@/scripts/check-diagrams';

const fixtures = path.join(__dirname, '..', 'fixtures', 'diagrams', 'content');
const good = listDiagrams(fixtures)[0]!;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function entriesOf(labels: LabelsByLocale): GlossaryEntry[] {
  const out: GlossaryEntry[] = [];
  for (const k of Object.keys(labels.zh!.labels)) {
    if (k.startsWith('_')) continue;
    out.push({ zh: labels.zh!.labels[k]!, en: labels.en!.labels[k]!, vi: labels.vi!.labels[k]! });
  }
  return out;
}
const codes = (labels: LabelsByLocale, glossary: GlossaryEntry[]) =>
  checkDiagram(good.scene, labels, { glossary }).errors.filter((e) => e.code.startsWith('GLOSSARY_'));

describe('normLabel', () => {
  it('collapses whitespace and newlines, trims, lowercases', () => {
    expect(normLabel('  Foo\n  Bar \t')).toBe('foo bar');
  });
});

describe('glossary gate', () => {
  it('passes when every label has a matching entry; title and desc are exempt', () => {
    expect(codes(good.labels, entriesOf(good.labels))).toEqual([]);
  });

  it('GLOSSARY_MISSING when a reference text has no entry', () => {
    const g = entriesOf(good.labels).slice(1);
    const errs = codes(good.labels, g);
    expect(errs.map((e) => e.code)).toEqual(['GLOSSARY_MISSING']);
    expect(errs[0]!.message).toContain('n1');
  });

  it('GLOSSARY_MISMATCH when another locale differs, naming the locale', () => {
    const l = clone(good.labels);
    l.vi!.labels.n3 = 'Kho dữ liệu';
    const errs = codes(l, entriesOf(good.labels));
    expect(errs.map((e) => e.code)).toEqual(['GLOSSARY_MISMATCH']);
    expect(errs[0]!.locale).toBe('vi');
  });

  it('matches case-insensitively and across whitespace and newlines', () => {
    const l = clone(good.labels);
    l.en!.labels.n2 = 'TRANSACTION\nmanager';
    expect(codes(l, entriesOf(good.labels))).toEqual([]);
    const g = entriesOf(good.labels).map((e) => ({ ...e, zh: `  ${e.zh}  `.toUpperCase() }));
    expect(codes(good.labels, g)).toEqual([]);
  });

  it('looks up by the en text when the diagram is en-sourced', () => {
    const l = clone(good.labels);
    l.en!.meta = { locale: 'en', status: 'source', source_lang: 'en' };
    l.zh!.meta = { locale: 'zh', status: 'machine', source_lang: 'en' };
    l.vi!.meta = { locale: 'vi', status: 'machine', source_lang: 'en' };
    // entries are keyed by en here; zh text is only a translation
    const g = entriesOf(l);
    expect(codes(l, g)).toEqual([]);
    expect(codes(l, g.slice(1)).map((e) => e.code)).toEqual(['GLOSSARY_MISSING']);
  });

  it('is skipped when no glossary is supplied', () => {
    expect(checkDiagram(good.scene, good.labels).errors.some((e) => e.code.startsWith('GLOSSARY_'))).toBe(false);
  });
});

describe('findConflicts', () => {
  it('flags the same reference text with different en or vi, ignoring case/whitespace', () => {
    const a: GlossaryEntry = { zh: '缓存', en: 'Cache', vi: 'Bộ nhớ đệm', source: 'a' };
    expect(findConflicts([a, { ...a, source: 'b', en: ' cache ' }])).toEqual([]);
    const c = findConflicts([a, { ...a, source: 'b', en: 'Buffer' }]);
    expect(c).toHaveLength(1);
    expect(c[0]!.code).toBe('GLOSSARY_CONFLICT');
    expect(c[0]!.message).toContain('缓存');
    expect(findConflicts([a, { ...a, source: 'b', vi: 'Đệm' }])).toHaveLength(1);
  });
});

describe('glossary on disk (tmp dir)', () => {
  const tmps: string[] = [];
  afterEach(() => {
    for (const t of tmps.splice(0)) rmSync(t, { recursive: true, force: true });
  });

  function setup(global: object | null, sidecar: object | null): string {
    const root = mkdtempSync(path.join(os.tmpdir(), 'gloss-'));
    tmps.push(root);
    cpSync(fixtures, root, { recursive: true });
    if (global) writeFileSync(path.join(root, 'toy', 'glossary.diagram-labels.json'), JSON.stringify(global, null, 2));
    if (sidecar) {
      writeFileSync(path.join(root, 'toy', '_diagrams', 'demo', 'toy', 'toy.glossary.json'), JSON.stringify(sidecar, null, 2));
    }
    return root;
  }
  const all = entriesOf(good.labels);

  it('runGate: global + sidecar entries satisfy the gate, a missing one fails', () => {
    const none = setup({ terms: {}, labels: [] }, null);
    const r = runGate(none)[0]!;
    expect(r.errors.filter((e) => e.code === 'GLOSSARY_MISSING')).toHaveLength(all.length);
    const split = setup({ terms: {}, labels: all.slice(0, 2) }, { labels: all.slice(2) });
    expect(runGate(split)).toEqual([{ id: 'demo/toy/toy', errors: [] }]);
  });

  it('runGate: glossary enforcement is off when no glossary file or sidecar exists', () => {
    expect(runGate(fixtures)).toEqual([{ id: 'demo/toy/toy', errors: [] }]);
  });

  it('runGate: a conflict is reported once against the pseudo id "glossary"', () => {
    const root = setup({ terms: {}, labels: all }, { labels: [{ ...all[0]!, en: 'Different' }] });
    const res = runGate(root);
    const g = res.filter((r) => r.id === 'glossary');
    expect(g).toHaveLength(1);
    expect(g[0]!.errors.map((e) => e.code)).toEqual(['GLOSSARY_CONFLICT']);
  });

  it('runGate with { id } gates only that diagram but still reports conflicts; unknown id is an error', () => {
    const root = setup({ terms: {}, labels: all }, { labels: [{ ...all[0]!, en: 'Different' }] });
    const only = runGate(root, { id: 'demo/toy/toy' });
    expect(only.map((r) => r.id)).toEqual(['demo/toy/toy', 'glossary']);
    const unknown = runGate(root, { id: 'nope' });
    expect(unknown.some((r) => r.id === 'nope' && r.errors.length > 0)).toBe(true);
  });

  const cli = (script: string, root: string, args: string[] = []) => {
    try {
      const out = execFileSync('node_modules/.bin/tsx', [script, ...args], {
        cwd: path.join(__dirname, '..', '..'),
        env: { ...process.env, CONTENT_ROOT: root },
        encoding: 'utf8',
      });
      return { status: 0, out };
    } catch (e) {
      const err = e as { status: number; stdout: string };
      return { status: err.status, out: err.stdout };
    }
  };

  it('check-diagrams CLI: --id works, "--" is ignored, conflicts fail even with --id', () => {
    const ok = setup({ terms: {}, labels: all }, null);
    expect(cli('scripts/check-diagrams.ts', ok, ['--', '--id', 'demo/toy/toy']).status).toBe(0);
    expect(cli('scripts/check-diagrams.ts', ok, ['--id', 'nope']).status).not.toBe(0);
    const bad = setup({ terms: {}, labels: all }, { labels: [{ ...all[0]!, vi: 'Khác' }] });
    const r = cli('scripts/check-diagrams.ts', bad, ['--id', 'demo/toy/toy']);
    expect(r.status).not.toBe(0);
    expect(r.out).toContain('GLOSSARY_CONFLICT');
  });

  it('mergeGlossaries merges sidecars sorted by zh with source = diagram id, deletes them, is idempotent', () => {
    const root = setup({ terms: { 缓存: { en: 'cache' } }, labels: all.slice(0, 1) }, { labels: all.slice(1) });
    const gfile = path.join(root, 'toy', 'glossary.diagram-labels.json');
    const side = path.join(root, 'toy', '_diagrams', 'demo', 'toy', 'toy.glossary.json');
    const r1 = mergeGlossaries(root);
    expect(r1.conflicts).toEqual([]);
    expect(existsSync(side)).toBe(false);
    const written = JSON.parse(readFileSync(gfile, 'utf8')) as { terms: object; labels: GlossaryEntry[] };
    expect(written.terms).toEqual({ 缓存: { en: 'cache' } });
    expect(written.labels).toHaveLength(all.length);
    const zhs = written.labels.map((l) => l.zh);
    expect([...zhs].sort()).toEqual(zhs);
    expect(written.labels.some((l) => l.source === 'demo/toy/toy')).toBe(true);
    const before = readFileSync(gfile, 'utf8');
    mergeGlossaries(root);
    expect(readFileSync(gfile, 'utf8')).toBe(before);
    expect(runGate(root)).toEqual([{ id: 'demo/toy/toy', errors: [] }]);
  });

  it('mergeGlossaries writes nothing and deletes nothing on conflict', () => {
    const root = setup({ terms: {}, labels: all }, { labels: [{ ...all[0]!, en: 'Different' }] });
    const gfile = path.join(root, 'toy', 'glossary.diagram-labels.json');
    const side = path.join(root, 'toy', '_diagrams', 'demo', 'toy', 'toy.glossary.json');
    const before = readFileSync(gfile, 'utf8');
    const r = mergeGlossaries(root);
    expect(r.conflicts.length).toBeGreaterThan(0);
    expect(readFileSync(gfile, 'utf8')).toBe(before);
    expect(existsSync(side)).toBe(true);
  });

  it('diagrams:glossary CLI exits non-zero on conflicts and zero otherwise', () => {
    const ok = setup({ terms: {}, labels: all.slice(0, 2) }, { labels: all.slice(2) });
    expect(cli('scripts/diagrams-glossary.ts', ok).status).toBe(0);
    const bad = setup({ terms: {}, labels: all }, { labels: [{ ...all[0]!, en: 'Different' }] });
    expect(cli('scripts/diagrams-glossary.ts', bad).status).not.toBe(0);
  });

  it('review data lists glossary status per diagram', () => {
    const okRoot = setup({ terms: {}, labels: all }, null);
    expect(buildReviewData(okRoot, 'd').entries[0]!.glossaryCodes).toEqual([]);
    const missRoot = setup({ terms: {}, labels: [] }, null);
    expect(buildReviewData(missRoot, 'd').entries[0]!.glossaryCodes).toEqual(['GLOSSARY_MISSING']);
  });
});
