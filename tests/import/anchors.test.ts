import { describe, expect, it } from 'vitest';
import { lenientKey, remapFragment } from '../../scripts/import/anchors';

const headings = [
  { index: 1, text: 'Half-Open' },
  { index: 2, text: 'circuitBreaker.sleepWindowInMilliseconds' },
  { index: 3, text: 'circuitBreaker.errorThresholdPercentage' },
];

describe('anchor remap', () => {
  it('normalizes case and punctuation', () => {
    expect(lenientKey('circuitBreaker.sleepWindowInMilliseconds')).toBe('circuitbreakersleepwindowinmilliseconds');
  });
  it('maps the upstream fragment to a heading index', () => {
    expect(remapFragment('circuitBreaker.sleepWindowInMilliseconds', headings)).toBe(2);
    expect(remapFragment('circuitbreaker-sleepwindowinmilliseconds', headings)).toBe(2);
  });
  it('decodes percent-encoded fragments', () => {
    expect(remapFragment('%E6%B6%88%E6%81%AF', [{ index: 7, text: '消息' }])).toBe(7);
  });
  it('throws on no match', () => {
    expect(() => remapFragment('nope', headings)).toThrow(/matches 0 headings/);
  });
  it('throws on an ambiguous match', () => {
    expect(() => remapFragment('same', [{ index: 1, text: 'Same' }, { index: 2, text: 'same!' }])).toThrow(
      /matches 2 headings/,
    );
  });
});
