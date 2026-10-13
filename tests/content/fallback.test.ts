import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCollection } from '@/lib/content/collection';
import { availableLocales, chainFor, resolveDoc, zhHashOf } from '@/lib/content/fallback';
import { canonicalHash } from '@/lib/content/hash';
import { headingsFor } from '@/lib/content/headings-index';

const root = path.resolve(__dirname, '../fixtures/content');
const c = loadCollection(root, 'demo');

describe('fallback chain', () => {
  it('builds the configured chain without duplicates', () => {
    expect(chainFor(c, 'vi')).toEqual(['vi', 'en', 'zh']);
    expect(chainFor(c, 'en')).toEqual(['en', 'zh']);
    expect(chainFor(c, 'zh')).toEqual(['zh']);
  });

  it('serves the requested locale when it exists', () => {
    const r = resolveDoc(root, c, 'en', 'alpha', 'intro')!;
    expect(r).toMatchObject({ requested: 'en', served: 'en', fallback: false });
    expect(r.frontmatter).toMatchObject({ status: 'machine', source: { locale: 'zh', slug: 'intro' } });
    expect(r.body).toContain('# Introduction');
    expect(r.body).not.toContain('status: machine');
  });

  it('vi falls back to en when en exists', () => {
    const r = resolveDoc(root, c, 'vi', 'alpha', 'intro')!;
    expect(r).toMatchObject({ requested: 'vi', served: 'en', fallback: true });
  });

  it('vi skips a missing en and lands on zh', () => {
    const r = resolveDoc(root, c, 'vi', 'alpha', 'second')!;
    expect(r).toMatchObject({ requested: 'vi', served: 'zh', fallback: true });
    expect(r.frontmatter).toBeUndefined();
  });

  it('en falls back to zh; zh serves zh without a fallback flag', () => {
    expect(resolveDoc(root, c, 'en', 'alpha', 'third')).toMatchObject({ served: 'zh', fallback: true });
    expect(resolveDoc(root, c, 'zh', 'alpha', 'third')).toMatchObject({ served: 'zh', fallback: false });
  });

  it('returns null for a doc that exists in no locale', () => {
    expect(resolveDoc(root, c, 'vi', 'alpha', 'nope')).toBeNull();
  });

  it('returns null for unsafe section or slug without touching files', () => {
    expect(resolveDoc(root, c, 'zh', 'alpha', '../x')).toBeNull();
    expect(resolveDoc(root, c, 'zh', '../alpha', 'intro')).toBeNull();
    expect(resolveDoc(root, c, 'zh', 'alpha', 'Intro')).toBeNull();
  });

  it('lists available locales', () => {
    expect(availableLocales(root, c, 'alpha', 'intro').sort()).toEqual(['en', 'zh']);
    expect(availableLocales(root, c, 'alpha', 'second')).toEqual(['zh']);
  });

  it('computes the zh canonical hash', () => {
    const zh = resolveDoc(root, c, 'zh', 'alpha', 'intro')!;
    expect(zhHashOf(root, c, 'alpha', 'intro')).toBe(canonicalHash(zh.body));
  });
});

describe('headingsFor', () => {
  it('returns the headings of the language that will be served', () => {
    expect(headingsFor(root, c, 'vi', 'alpha', 'intro')!.map((h) => h.id)).toEqual(['h1-first']);
    expect(headingsFor(root, c, 'zh', 'alpha', 'intro')!.map((h) => h.id)).toEqual(['h1-第一节']);
    expect(headingsFor(root, c, 'vi', 'alpha', 'second')!.map((h) => h.index)).toEqual([1, 2, 3]);
  });
  it('returns null for a missing doc', () => {
    expect(headingsFor(root, c, 'vi', 'alpha', 'nope')).toBeNull();
  });
});
