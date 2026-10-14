import { describe, expect, it } from 'vitest';
import { FONT_SIZE, HAN_EM, MONO_EM, SAFETY, UNKNOWN_EM, hasHan, segWidth, splitSegments, stripLiterals, textWidth, wrapText } from '@/lib/diagrams/measure';

import { TEXT_PAD_X } from '@/lib/diagrams/geometry';

const em = (n: number) => n * FONT_SIZE * SAFETY;

describe('measure', () => {
  it('treats CJK Extension B+ as Han', () => {
    expect(hasHan('a\u{20000}b')).toBe(true);
    expect(segWidth({ text: '\u{20000}', mono: false })).toBeCloseTo(em(HAN_EM));
  });

  it('pins the calibrated constants', () => {
    expect(SAFETY).toBe(1.04);
    expect(FONT_SIZE).toBe(13);
    expect(HAN_EM).toBe(1.02);
    expect(MONO_EM).toBe(0.62);
    expect(UNKNOWN_EM).toBe(1.0);
  });

  it('estimates widths per script from the measured UI font table', () => {
    expect(segWidth({ text: '数据', mono: false })).toBeCloseTo(em(HAN_EM * 2));
    expect(segWidth({ text: '，', mono: false })).toBeCloseTo(em(HAN_EM));
    expect(segWidth({ text: 'ab', mono: true })).toBeCloseTo(em(MONO_EM * 2));
    // table entries: a 0.642, m 0.893, i 0.265, rounded up to 0.01em
    expect(segWidth({ text: 'a', mono: false })).toBeCloseTo(em(0.65));
    expect(segWidth({ text: 'm', mono: false })).toBeCloseTo(em(0.9));
    expect(segWidth({ text: 'i', mono: false })).toBeCloseTo(em(0.27));
    expect(segWidth({ text: ' ', mono: false })).toBeCloseTo(em(0.28));
    // Vietnamese: base letter + 0.03em; unknown symbols fall back to UNKNOWN_EM
    expect(segWidth({ text: 'ế', mono: false })).toBeCloseTo(em(0.6 + 0.03));
    expect(segWidth({ text: '→', mono: false })).toBeCloseTo(em(UNKNOWN_EM));
    expect(segWidth({ text: '—', mono: false })).toBeCloseTo(em(1.0));
    // d with stroke has no decomposition: explicit table entries
    expect(segWidth({ text: 'đ', mono: false })).toBeCloseTo(em(0.69));
    expect(segWidth({ text: 'Đ', mono: false })).toBeCloseTo(em(0.76));
  });

  // Browser measurements (getComputedTextLength / getBBox width, 13px, Be Vietnam Pro + JetBrains Mono),
  // recorded 2026-10 from the pilot review page. The estimate must never be below the real width.
  it.each([
    ['Request 2: orderId=1', ['orderId=1'], 139.7],
    ['Yêu cầu 2: orderId=1', ['orderId=1'], 137.7],
    ['请求2:orderId=1', ['orderId=1'], 108.8],
    ['In-memory', [], 70.7],
    ['MQ', [], 21.8],
    ['m', [], 11.6],
    ['manager', [], 56.7],
    ['Giai đoạn hai: thực thi', [], 138.6],
    ['用户', [], 26.5],
  ] as [string, string[], number][])('estimate of %j is at least the measured %f', (text, lits, real) => {
    const est = wrapText(text, lits, Infinity)[0]!.width;
    // layoutRect adds TEXT_PAD_X each side; the real box must sit >= 1px inside it
    expect(est + 2 * TEXT_PAD_X).toBeGreaterThanOrEqual(real + 2);
    expect(est).toBeLessThanOrEqual(real * 1.2 + 4);
  });

  describe('literal token boundaries', () => {
    const mono = (t: string, l: string[]) => splitSegments(t, l).filter((s) => s.mono).map((s) => s.text);
    it('does not split inside a longer word', () => {
      expect(mono('configuration', ['config'])).toEqual([]);
      expect(splitSegments('configuration', ['config'])).toEqual([{ text: 'configuration', mono: false }]);
    });
    it('splits a whole-word occurrence', () => {
      expect(mono('the config file', ['config'])).toEqual(['config']);
    });
    it('treats Han neighbours as boundaries', () => {
      expect(mono('zk锁', ['zk'])).toEqual(['zk']);
      expect(mono('请求1:orderId=1', ['orderId=1'])).toEqual(['orderId=1']);
    });
    it('matches at text edges and inside punctuation', () => {
      expect(mono('MQ', ['MQ'])).toEqual(['MQ']);
      expect(mono('(MQ)', ['MQ'])).toEqual(['MQ']);
    });
    it('treats Vietnamese letters as word characters', () => {
      expect(mono('đồng bộ', ['bộ'])).toEqual(['bộ']);
      expect(mono('đồng bộhóa', ['bộ'])).toEqual([]);
      expect(mono('xđồng bộ', ['đồng bộ'])).toEqual([]);
      expect(mono('mã đồng bộ.', ['đồng bộ'])).toEqual(['đồng bộ']);
    });
    it('keeps punctuation edges unchecked and marks all occurrences', () => {
      expect(mono('x(10 y', ['(10'])).toEqual(['(10']);
      expect(mono('ip 192.168.0.1 ok', ['192.168.0.1'])).toEqual(['192.168.0.1']);
      expect(mono('a MQ b MQ', ['MQ'])).toEqual(['MQ', 'MQ']);
    });
    it('is deterministic', () => {
      const a = JSON.stringify(splitSegments('zk锁 config configuration', ['zk', 'config']));
      expect(JSON.stringify(splitSegments('zk锁 config configuration', ['zk', 'config']))).toBe(a);
    });
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
    const han = wrapText('数据库数据库', [], em(3 * HAN_EM));
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
