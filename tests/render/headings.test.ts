import { describe, expect, it } from 'vitest';
import { extractHeadings, firstH1, headingId, readableSlug } from '@/lib/render/headings';

const FENCE = '```';

describe('readableSlug / headingId', () => {
  it('slugifies Latin text', () => {
    expect(readableSlug('Why use a Message Queue?')).toBe('why-use-a-message-queue');
  });
  it('keeps CJK letters', () => {
    expect(readableSlug('为什么使用消息队列？')).toBe('为什么使用消息队列');
  });
  it('strips Vietnamese combining marks but keeps đ', () => {
    expect(readableSlug('Độ trễ của hàng đợi')).toBe('đo-tre-cua-hang-đoi');
  });
  it('truncates long slugs to 48 characters without a trailing hyphen', () => {
    const s = readableSlug('a '.repeat(60));
    expect(s.length).toBeLessThanOrEqual(48);
    expect(s.endsWith('-')).toBe(false);
  });
  it('produces h<index> when the slug is empty (emoji or punctuation only)', () => {
    expect(headingId(3, '🔥🔥')).toBe('h3');
    expect(headingId(4, '？？')).toBe('h4');
  });
  it('produces h<index>-<slug> otherwise', () => {
    expect(headingId(3, 'Why MQ')).toBe('h3-why-mq');
  });
});

describe('extractHeadings', () => {
  const md = [
    '# Title',
    '',
    '## Same',
    '',
    '### `inline code only`',
    '',
    '## Same',
    '',
    FENCE,
    '## not a heading',
    FENCE,
    '',
    '##### Deep',
    '',
  ].join('\n');

  it('indexes h2–h6 in document order, skipping h1 and code', () => {
    const hs = extractHeadings(md);
    expect(hs.map((h) => [h.index, h.depth, h.text])).toEqual([
      [1, 2, 'Same'],
      [2, 3, 'inline code only'],
      [3, 2, 'Same'],
      [4, 5, 'Deep'],
    ]);
  });
  it('keeps ids unique even when heading text repeats', () => {
    const ids = extractHeadings(md).map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['h1-same', 'h2-inline-code-only', 'h3-same', 'h4-deep']);
  });
  it('uses link text, not the url, for a heading that is a link', () => {
    const hs = extractHeadings('## [circuitBreaker.sleepWindowInMilliseconds](https://example.com/x)\n');
    expect(hs[0].text).toBe('circuitBreaker.sleepWindowInMilliseconds');
  });
  it('extracts the first h1', () => {
    expect(firstH1(md)).toBe('Title');
    expect(firstH1('## only h2\n')).toBeUndefined();
  });
});
