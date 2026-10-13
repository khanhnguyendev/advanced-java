import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { pendingBatches } from '@/scripts/translate/batches';

const root = path.resolve(__dirname, '../fixtures/content');

describe('pendingBatches', () => {
  it('lists docs with no translation in that locale, grouped by section, in batches of the given size', () => {
    expect(pendingBatches(root, 'demo', 'en', 10)).toEqual([{ section: 'alpha', slugs: ['second', 'third'] }]);
    expect(pendingBatches(root, 'demo', 'vi', 2)).toEqual([
      { section: 'alpha', slugs: ['intro', 'second'] },
      { section: 'alpha', slugs: ['third'] },
    ]);
  });
});
