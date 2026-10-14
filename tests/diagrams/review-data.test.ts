import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import * as render from '@/lib/diagrams/render';
import { buildReviewData, CREDIT_LINE } from '@/lib/diagrams/review-data';

const root = path.join(__dirname, '..', 'fixtures', 'diagrams', 'content');

describe('buildReviewData', () => {
  const a = buildReviewData(root, '2026-10-14');

  it('summarises the fixture', () => {
    expect(a.count).toBe(1);
    expect(a.errorCount).toBe(0);
    expect(a.buildDate).toBe('2026-10-14');
  });

  it('builds an entry with image url, license and three inline svgs', () => {
    const e = a.entries[0]!;
    expect(e.imageUrl).toBe(`/_content/${e.collection}/${e.upstream}`);
    expect(e.license).toBe('derived');
    for (const loc of ['zh', 'en', 'vi'] as const) expect(e.svgs[loc]).toMatch(/^<svg[\s>]/);
    expect(e.errors).toEqual([]);
  });

  it('renders per width with distinct ids and reports render exceptions as META_INVALID', () => {
    const e = a.entries[0]!;
    const ids = (s: string) => [...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]!);
    for (const loc of ['zh', 'en', 'vi'] as const) {
      const w = e.svgsByWidth[loc]!;
      expect(ids(w[720]!).some((i) => ids(w[360]!).includes(i))).toBe(false);
    }
    vi.spyOn(render, 'renderDiagram').mockImplementation(() => {
      throw new Error('boom');
    });
    const bad = buildReviewData(root, '2026-10-14');
    vi.restoreAllMocks();
    const err = bad.entries[0]!.errors.find((x) => x.code === 'META_INVALID');
    expect(err?.message).toContain('boom');
    expect(bad.entries[0]!.svgs.en).toBeNull();
  });

  it('is deterministic', () => {
    expect(buildReviewData(root, '2026-10-14')).toEqual(a);
  });

  it('returns empty data for a missing root', () => {
    const d = buildReviewData(path.join(root, 'nope'), '2026-10-14');
    expect(d.count).toBe(0);
    expect(d.errorCount).toBe(0);
  });

  it('carries the credit line', () => {
    expect(CREDIT_LINE).toContain('1a35221');
    expect(CREDIT_LINE).toContain('CC-BY-SA-4.0');
  });
});
