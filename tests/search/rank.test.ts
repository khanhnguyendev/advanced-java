import { describe, expect, it } from 'vitest';
import { rankHits } from '@/lib/search/rank';
import type { SearchHit } from '@/lib/search/types';

const hit = (slug: string, score: number, fallback: boolean): SearchHit => ({
  slug, section: 's', title: slug, excerpt: '', lang: fallback ? 'zh' : 'vi', fallback, href: `/vi/c/s/${slug}`, score,
});

describe('rankHits', () => {
  it('orders by score descending', () => {
    expect(rankHits([hit('a', 1, false), hit('b', 3, false)]).map((h) => h.slug)).toEqual(['b', 'a']);
  });
  it('puts native-language hits before fallback hits at equal score', () => {
    expect(rankHits([hit('f', 2, true), hit('n', 2, false)]).map((h) => h.slug)).toEqual(['n', 'f']);
  });
  it('is stable for full ties', () => {
    expect(rankHits([hit('x', 1, false), hit('y', 1, false), hit('z', 1, false)]).map((h) => h.slug)).toEqual(['x', 'y', 'z']);
  });
});
