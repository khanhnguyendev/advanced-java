import path from 'node:path';
import { describe, expect, it } from 'vitest';
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
