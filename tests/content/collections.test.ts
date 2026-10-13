import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { listCollections } from '@/lib/content/collection';

describe('listCollections', () => {
  it('lists folders that contain collection.json', () => {
    expect(listCollections(path.resolve(__dirname, '../fixtures/content'))).toEqual(['demo']);
  });
  it('returns [] for a missing root', () => {
    expect(listCollections('/nonexistent-root')).toEqual([]);
  });
});
