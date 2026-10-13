import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { listDocs, loadCollection, loadMeta, docFile, sectionOf } from '@/lib/content/collection';

const root = path.resolve(__dirname, '../fixtures/content');

describe('collection loader', () => {
  it('loads and lists docs in order with catalog ids', () => {
    const c = loadCollection(root, 'demo');
    const docs = listDocs(c);
    expect(docs.map((d) => d.slug)).toEqual(['intro', 'second', 'third']);
    expect(docs.map((d) => d.catalogId)).toEqual(['AL-01', 'AL-02', 'AL-03']);
    expect(docs[0]).toMatchObject({ collection: 'demo', section: 'alpha', group: 'g1' });
  });

  it('finds the section of a slug', () => {
    const c = loadCollection(root, 'demo');
    expect(sectionOf(c, 'third')).toBe('alpha');
    expect(sectionOf(c, 'nope')).toBeUndefined();
  });

  it('rejects a doc with no catalog id', () => {
    const c = loadCollection(root, 'demo');
    delete c.ids.second;
    expect(() => listDocs(c)).toThrow(/catalog id.*second/i);
  });

  it('returns empty meta for a locale with no meta.json', () => {
    expect(loadMeta(root, 'demo', 'vi')).toEqual({ sections: {}, groups: {}, docs: {} });
  });

  it('reads localized meta', () => {
    expect(loadMeta(root, 'demo', 'en').docs.intro.title).toBe('Introduction');
  });

  it('builds the doc file path', () => {
    expect(docFile('/r', 'demo', 'vi', 'alpha', 'intro')).toBe('/r/demo/vi/alpha/intro.md');
  });
});
