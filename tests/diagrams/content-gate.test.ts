import { describe, expect, it } from 'vitest';
import { contentRoot } from '@/lib/content/collection';
import { runGate } from '@/scripts/check-diagrams';

describe('real diagram content', () => {
  it('passes the gate with zero errors', () => {
    const results = runGate(contentRoot());
    expect(results.length).toBeGreaterThan(0);
    const errors = results.flatMap((r) => r.errors.map((e) => `${r.id}: ${e.code} ${e.message}`));
    expect(errors).toEqual([]);
  });
});
