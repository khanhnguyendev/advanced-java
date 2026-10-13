import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { CollectionConfig } from '@/lib/content/types';
import { docTitleOf } from '@/lib/content/title';

const root = mkdtempSync(path.join(os.tmpdir(), 'title-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const meta = (loc: string, docs: Record<string, { title: string }>) => {
  mkdirSync(path.join(root, 'c', loc), { recursive: true });
  writeFileSync(path.join(root, 'c', loc, 'meta.json'), JSON.stringify({ sections: {}, groups: {}, docs }));
};
meta('en', { a: { title: 'English A' } });
meta('zh', { a: { title: '中文 A' }, b: { title: '中文 B' } });
const c = { id: 'c', sourceLocale: 'zh' } as unknown as CollectionConfig;

describe('docTitleOf', () => {
  it('uses the served locale meta and its language', () => {
    expect(docTitleOf(root, c, 'en', 'a')).toEqual({ title: 'English A', lang: 'en' });
  });
  it('labels a zh title zh-Hans', () => {
    expect(docTitleOf(root, c, 'zh', 'a')).toEqual({ title: '中文 A', lang: 'zh-Hans' });
  });
  it('falls back to the zh meta and labels it zh-Hans, not the served locale', () => {
    expect(docTitleOf(root, c, 'en', 'b')).toEqual({ title: '中文 B', lang: 'zh-Hans' });
  });
  it('falls back to the slug with no language', () => {
    expect(docTitleOf(root, c, 'en', 'zzz')).toEqual({ title: 'zzz', lang: undefined });
  });
});
