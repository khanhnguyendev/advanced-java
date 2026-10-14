import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { pendingBatches } from '@/scripts/translate/batches';

const root = path.resolve(__dirname, '../fixtures/content');

describe('pendingBatches', () => {
  it('lists docs with no translation in that locale, grouped by section, in batches of the given size', () => {
    expect(pendingBatches(root, 'demo', 'en', 10)).toEqual([{ section: 'alpha', slugs: ['second', 'third'] }]);
    expect(pendingBatches(root, 'demo', 'vi', 2)).toEqual([
      { section: 'alpha', slugs: ['intro', 'second'] },
      { section: 'alpha', slugs: ['third'] },
    ]);
  });
  it('rejects invalid batch sizes', () => {
    for (const n of [0, -1, 1.5, Number.NaN]) expect(() => pendingBatches(root, 'demo', 'en', n)).toThrow(/size/);
  });
  it('groups per section when one section is partly translated', () => {
    const r = mkdtempSync(path.join(os.tmpdir(), 'batch-'));
    const w = (rel: string) => {
      mkdirSync(path.dirname(path.join(r, rel)), { recursive: true });
      writeFileSync(path.join(r, rel), 'x');
    };
    mkdirSync(path.join(r, 'c'), { recursive: true });
    writeFileSync(
      path.join(r, 'c/collection.json'),
      JSON.stringify({
        id: 'c', sourceLocale: 'zh', tabColor: '#000000', fallback: { vi: ['zh'], en: ['zh'], zh: ['zh'] },
        sections: [
          { id: 's1', prefix: 'A', groups: [{ id: 'g1', docs: ['a', 'b', 'c'] }] },
          { id: 's2', prefix: 'B', groups: [{ id: 'g2', docs: ['d', 'e'] }] },
        ],
        ids: { a: 'A-1', b: 'A-2', c: 'A-3', d: 'B-1', e: 'B-2' },
        upstream: { repo: 'r', commit: 'c' }, upstreamFiles: {},
      }),
    );
    w('c/en/s1/b.md');
    w('c/en/s2/d.md');
    expect(pendingBatches(r, 'c', 'en', 1)).toEqual([
      { section: 's1', slugs: ['a'] },
      { section: 's1', slugs: ['c'] },
      { section: 's2', slugs: ['e'] },
    ]);
  });
});

describe('pendingBatches with a translation policy', () => {
  function held(decision: string) {
    const r = mkdtempSync(path.join(os.tmpdir(), 'batch-pol-'));
    mkdirSync(path.join(r, 'c'), { recursive: true });
    writeFileSync(
      path.join(r, 'c/collection.json'),
      JSON.stringify({
        id: 'c', sourceLocale: 'zh', tabColor: '#000000', fallback: { vi: ['zh'], en: ['zh'], zh: ['zh'] },
        sections: [{ id: 's', prefix: 'A', groups: [{ id: 'g', docs: ['a', 'b'] }] }],
        ids: { a: 'A-1', b: 'A-2' }, upstream: { repo: 'r', commit: 'c' }, upstreamFiles: {},
      }),
    );
    writeFileSync(path.join(r, 'c/translation-policy.json'), JSON.stringify({ hold: { 's/a': { reason: 'r', decision } } }));
    return r;
  }
  it('skips docs held as pending or exclude', () => {
    for (const d of ['pending', 'exclude']) {
      expect(pendingBatches(held(d), 'c', 'en', 10)).toEqual([{ section: 's', slugs: ['b'] }]);
    }
  });
  it('includes a held doc once its decision is translate', () => {
    expect(pendingBatches(held('translate'), 'c', 'en', 10)).toEqual([{ section: 's', slugs: ['a', 'b'] }]);
  });
});

