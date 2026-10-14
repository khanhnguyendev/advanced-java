import { describe, expect, it } from 'vitest';
import { checkDiagram } from '@/lib/diagrams/gate';
import { rectsOverlap, segmentHitsRect, shrinkRect } from '@/lib/diagrams/geometry';
import type { DiagramScene, LabelsByLocale } from '@/lib/diagrams/types';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const lf = (locale: 'zh' | 'en' | 'vi', labels: Record<string, string>) => ({
  meta: { locale, status: locale === 'zh' ? 'source' : 'machine', source_lang: 'zh' },
  labels,
  sha256: 'x',
});
const LABELS = {
  A: 'Alpha',
  B: 'Beta',
  C: 'Gamma',
  G: 'Group',
  e1: 'link',
  t1: 'note',
  t2: 'other',
  _title: 't',
  _desc: 'd',
};
const labels = (extra: Record<string, string> = {}): LabelsByLocale => ({
  zh: lf('zh', { ...LABELS, ...extra }),
  en: lf('en', { ...LABELS, ...extra }),
  vi: lf('vi', { ...LABELS, ...extra }),
});

const base: DiagramScene = {
  id: 'x/y/z',
  source: { upstream: 'a.png', commit: 'c' },
  size: { w: 400, h: 240 },
  nodes: [
    { id: 'A', shape: 'box', x: 20, y: 60, w: 100, h: 40, label: { key: 'A' } },
    { id: 'B', shape: 'box', x: 220, y: 60, w: 100, h: 40, label: { key: 'B' } },
  ],
  edges: [
    { points: [[120, 80], [220, 80]], arrow: 'end', style: 'solid', label: { key: 'e1', at: [170, 60], anchor: 'middle' } },
  ],
  texts: [{ key: 't1', x: 20, y: 200, anchor: 'start' }],
  title_key: '_title',
  desc_key: '_desc',
};

const hits = (scene: DiagramScene, l: LabelsByLocale = labels()) =>
  checkDiagram(scene, l).errors.filter((e) => e.code === 'TEXT_COLLISION');

describe('geometry helpers', () => {
  const r = { x0: 0, y0: 0, x1: 10, y1: 10 };
  it('rectsOverlap is strict (touching does not overlap)', () => {
    expect(rectsOverlap(r, { x0: 5, y0: 5, x1: 15, y1: 15 })).toBe(true);
    expect(rectsOverlap(r, { x0: 10, y0: 0, x1: 20, y1: 10 })).toBe(false);
  });
  it('segmentHitsRect handles crossing, inside and miss', () => {
    expect(segmentHitsRect([-5, 5], [15, 5], r)).toBe(true);
    expect(segmentHitsRect([2, 2], [3, 3], r)).toBe(true);
    expect(segmentHitsRect([-5, 11], [15, 11], r)).toBe(false);
    expect(segmentHitsRect([-5, -5], [-1, 20], r)).toBe(false);
  });
  it('shrinkRect shrinks on every side', () => {
    expect(shrinkRect(r, 1)).toEqual({ x0: 1, y0: 1, x1: 9, y1: 9 });
  });
});

describe('TEXT_COLLISION', () => {
  it('base scene is clean', () => {
    expect(hits(base)).toEqual([]);
  });

  it('(a) text vs text', () => {
    const s = clone(base);
    s.texts.push({ key: 't2', x: 20, y: 200, anchor: 'start' });
    const l = labels();
    const bad = hits(s, l);
    expect(bad.length).toBeGreaterThan(0);
    expect(bad[0]!.message).toContain('t1');
    expect(bad[0]!.message).toContain('t2');
    expect(bad[0]!.locale).toBeDefined();
    const ok = clone(s);
    ok.texts[1]!.y = 224;
    expect(hits(ok, l)).toEqual([]);
  });

  it('(b) text vs a foreign node rect', () => {
    const s = clone(base);
    s.texts[0] = { key: 't1', x: 200, y: 80, anchor: 'start' };
    const bad = hits(s);
    expect(bad.some((e) => e.message.includes('node B'))).toBe(true);
    const ok = clone(base);
    ok.texts[0] = { key: 't1', x: 20, y: 140, anchor: 'start' };
    expect(hits(ok)).toEqual([]);
  });

  it('(b) a node label does not collide with its own node; a text wholly inside a group passes', () => {
    const s = clone(base);
    s.nodes.unshift({ id: 'G', shape: 'group', x: 5, y: 5, w: 380, h: 200, label: { key: 'G' } });
    s.texts[0] = { key: 't1', x: 20, y: 150, anchor: 'start' };
    expect(hits(s)).toEqual([]);
    // but not over the group's own label block
    const bad = clone(s);
    bad.texts[0] = { key: 't1', x: 13, y: 19, anchor: 'start' };
    expect(hits(bad).some((e) => e.message.includes('node G') || e.message.includes('group'))).toBe(true);
  });

  it('(c) text vs edge segment, including its own edge', () => {
    const s = clone(base);
    s.edges[0]!.label = { key: 'e1', at: [170, 80], anchor: 'middle' };
    const bad = hits(s);
    expect(bad.some((e) => e.message.includes('edge 0'))).toBe(true);
    expect(hits(base)).toEqual([]);
    // a foreign edge through a node label
    const s2 = clone(base);
    s2.edges.push({ points: [[70, 20], [70, 120]], arrow: 'none', style: 'solid' });
    expect(hits(s2).some((e) => e.message.includes('node A') && e.message.includes('edge 1'))).toBe(true);
  });

  it('(c) edges that end on a node boundary do not hit its own label', () => {
    expect(hits(base)).toEqual([]);
  });

  it('is evaluated per locale and names it', () => {
    const l = labels();
    l.vi!.labels.t1 = 'a very long note that runs on and on and on and on and on and on and on';
    const s = clone(base);
    s.texts[0] = { key: 't1', x: 20, y: 140, anchor: 'start' };
    s.texts.push({ key: 't2', x: 250, y: 140, anchor: 'start' });
    s.edges = [];
    const bad = checkDiagram(s, l).errors.filter((e) => e.code === 'TEXT_COLLISION');
    expect(bad.every((e) => e.locale === 'vi')).toBe(true);
    expect(bad.length).toBeGreaterThan(0);
    expect(bad[0]!.message).toContain('vi');
  });
});
