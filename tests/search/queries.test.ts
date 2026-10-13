import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import queries from '../../scripts/search-gate/queries.json';

const zhDir = 'content/advanced-java/zh';
function zhBody(slug: string): string | null {
  const sections = ['high-concurrency', 'distributed-system', 'high-availability', 'micro-services', 'big-data'];
  for (const s of sections) {
    const f = path.join(zhDir, s, `${slug}.md`);
    if (existsSync(f)) return readFileSync(f, 'utf8');
  }
  return null;
}

describe.skipIf(!existsSync(zhDir))('search gate fixture queries', () => {
  for (const q of queries.zh) {
    it(`zh query "${q.q}" is answerable by its expected docs`, () => {
      const bodies = q.anyOf.map(zhBody);
      expect(bodies.every((b) => b !== null), `unknown slug in ${q.anyOf.join(',')}`).toBe(true);
      expect(bodies.some((b) => b!.toLowerCase().includes(q.q.toLowerCase()))).toBe(true);
    });
  }
});
