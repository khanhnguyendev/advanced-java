import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCollection } from '@/lib/content/collection';
import { collectionStats } from '@/lib/stats';

const root = path.resolve(__dirname, '../fixtures/content');

describe('collectionStats', () => {
  it('counts real files per locale, not fallbacks', () => {
    const s = collectionStats(root, loadCollection(root, 'demo'));
    expect(s).toEqual({ collection: 'demo', total: 3, perLocale: { en: 1, vi: 0, zh: 3 } });
  });
});
