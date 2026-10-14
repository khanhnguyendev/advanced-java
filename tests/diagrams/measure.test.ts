import { describe, expect, it } from 'vitest';
import { FONT_SIZE, hasHan, segWidth, splitSegments, stripLiterals, textWidth, wrapText } from '@/lib/diagrams/measure';

const em = (n: number) => n * FONT_SIZE * 1.08;

describe('measure', () => {
  it('estimates widths per script with the 8% margin', () => {
    expect(segWidth({ text: '数据', mono: false })).toBeCloseTo(em(2));
    expect(segWidth({ text: 'abc', mono: false })).toBeCloseTo(em(0.56 * 3));
    expect(segWidth({ text: 'AB', mono: false })).toBeCloseTo(em(0.68 * 2));
    expect(segWidth({ text: '12', mono: false })).toBeCloseTo(em(0.58 * 2));
    expect(segWidth({ text: 'ab', mono: true })).toBeCloseTo(em(0.62 * 2));
    expect(segWidth({ text: '，', mono: false })).toBeCloseTo(em(1));
  });

  it('splits literals into mono segments', () => {
    expect(splitSegments('查询 productId=1 完', ['productId=1'])).toEqual([
      { text: '查询 ', mono: false },
      { text: 'productId=1', mono: true },
      { text: ' 完', mono: false },
    ]);
    expect(stripLiterals('a productId=1 b', ['productId=1'])).toBe('a  b');
    expect(hasHan('abc')).toBe(false);
    expect(hasHan('a数')).toBe(true);
  });

  it('wraps Latin at spaces, Han between characters, honours hard breaks', () => {
    const words = wrapText('alpha beta gamma', [], em(0.56 * 10));
    expect(words.map((l) => l.segs.map((s) => s.text).join(''))).toEqual(['alpha beta', 'gamma']);
    const han = wrapText('数据库数据库', [], em(3));
    expect(han.map((l) => l.segs[0]!.text)).toEqual(['数据库', '数据库']);
    expect(wrapText('a\nb', [], 1000)).toHaveLength(2);
  });

  it('never breaks inside a literal and keeps an over-wide word on its own line', () => {
    const lines = wrapText('go productId=12345 now', ['productId=12345'], em(0.62 * 8));
    const texts = lines.map((l) => l.segs.map((s) => s.text).join(''));
    expect(texts).toContain('productId=12345');
    const widest = lines.find((l) => l.segs.some((s) => s.mono))!;
    expect(widest.width).toBeCloseTo(textWidth(widest.segs));
  });
});
