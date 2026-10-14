import { readFileSync } from 'node:fs';
import path from 'node:path';
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

describe('real diagram glossary', () => {
  it('exists, has entries and no conflicts', () => {
    const f = path.join(contentRoot(), 'advanced-java', 'glossary.diagram-labels.json');
    const g = JSON.parse(readFileSync(f, 'utf8')) as { terms: object; labels: unknown[] };
    expect(Object.keys(g.terms).length).toBeGreaterThan(0);
    expect(g.labels.length).toBeGreaterThan(0);
    expect(runGate(contentRoot()).some((r) => r.id === 'glossary')).toBe(false);
  });
});
