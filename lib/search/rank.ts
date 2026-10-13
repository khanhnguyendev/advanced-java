import type { SearchHit } from './types';

export function rankHits(hits: SearchHit[]): SearchHit[] {
  return hits
    .map((h, i) => ({ h, i }))
    .sort((a, b) => b.h.score - a.h.score || Number(a.h.fallback) - Number(b.h.fallback) || a.i - b.i)
    .map((x) => x.h);
}
