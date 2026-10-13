import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCollection } from '@/lib/content/collection';
import { buildNav, flatDocs } from '@/lib/nav';

const root = path.resolve(__dirname, '../fixtures/content');
const c = loadCollection(root, 'demo');

describe('buildNav', () => {
  it('lists sections, groups and docs with catalog ids and locale-prefixed hrefs', () => {
    const nav = buildNav(root, c, 'en');
    expect(nav[0].id).toBe('alpha');
    const docs = flatDocs(nav);
    expect(docs.map((d) => d.catalogId)).toEqual(['AL-01', 'AL-02', 'AL-03']);
    expect(docs[0].href).toBe('/en/demo/alpha/intro');
  });
  it('uses the localized nav title when present and falls back to the slug', () => {
    const docs = flatDocs(buildNav(root, c, 'en'));
    expect(docs[0].title).toBe('Intro');
    expect(docs[1].title).toBe('second');
  });
  it('marks status: translated/machine/fallback', () => {
    const en = Object.fromEntries(flatDocs(buildNav(root, c, 'en')).map((d) => [d.slug, d.status]));
    expect(en).toEqual({ intro: 'machine', second: 'fallback', third: 'fallback' });
    const zh = Object.fromEntries(flatDocs(buildNav(root, c, 'zh')).map((d) => [d.slug, d.status]));
    expect(zh).toEqual({ intro: 'translated', second: 'translated', third: 'translated' });
  });
});
