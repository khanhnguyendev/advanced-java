import { describe, expect, it } from 'vitest';
import { projectCost } from '@/scripts/translate/cost';

describe('projectCost', () => {
  it('projects tokens from measured tokens per zh character', () => {
    const r = projectCost({
      pilot: [
        { slug: 'a', zhChars: 4000, outputTokens: 6000 },
        { slug: 'b', zhChars: 6000, outputTokens: 9000 },
      ],
      remainingZhChars: 100000,
    });
    expect(r.tokensPerZhChar).toBeCloseTo(1.5, 5);
    expect(r.projectedOutputTokens).toBe(150000);
  });
  it('rejects an empty pilot', () => {
    expect(() => projectCost({ pilot: [], remainingZhChars: 1 })).toThrow(/pilot/);
  });
});
