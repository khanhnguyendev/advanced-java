import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCollection } from '@/lib/content/collection';
import { availableLocales, chainFor, resolveDoc, zhHashOf } from '@/lib/content/fallback';
import { canonicalHash } from '@/lib/content/hash';
import { __resetHeadingsMemo, headingsFor } from '@/lib/content/headings-index';

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

  it('guard: section that normalises to an existing file is rejected', () => {
    // path.join normalises 'x/../alpha' to 'alpha', so only the guard can yield null
    expect(resolveDoc(root, c, 'zh', 'x/../alpha', 'intro')).toBeNull();
    expect(availableLocales(root, c, 'x/../alpha', 'intro')).toEqual([]);
    expect(() => zhHashOf(root, c, 'x/../alpha', 'intro')).toThrow(/invalid section\/slug/);
  });

  it('guard: traversal and uppercase slugs are rejected', () => {
    expect(resolveDoc(root, c, 'zh', 'alpha', '../x')).toBeNull();
    expect(resolveDoc(root, c, 'zh', 'alpha', 'Intro')).toBeNull();
  });

  it('frontmatter is undefined when a translated file has no source; Date coerced to string', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'fm-'));
    const d = path.join(tmp, 'demo');
    mkdirSync(path.join(d, 'en', 'alpha'), { recursive: true });
    mkdirSync(path.join(d, 'zh', 'alpha'), { recursive: true });
    writeFileSync(path.join(d, 'collection.json'), JSON.stringify(c));
    writeFileSync(path.join(d, 'zh', 'alpha', 'intro.md'), '# 介绍\n');
    writeFileSync(path.join(d, 'en', 'alpha', 'intro.md'), '---\ntitle: x\n---\n\n# Hi\n');
    expect(resolveDoc(tmp, c, 'en', 'alpha', 'intro')!.frontmatter).toBeUndefined();
    const withDate = resolveDoc(root, c, 'en', 'alpha', 'intro')!;
    expect(withDate.frontmatter!.translatedAt).toBe('2026-10-13');
  });

  it('rejects js frontmatter', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'js-'));
    const d = path.join(tmp, 'demo');
    mkdirSync(path.join(d, 'en', 'alpha'), { recursive: true });
    writeFileSync(path.join(d, 'en', 'alpha', 'intro.md'), '---js\n({a: 1})\n---\n\n# Hi\n');
    expect(() => resolveDoc(tmp, c, 'en', 'alpha', 'intro')).toThrow(/js frontmatter is not allowed/);
  });

  it('strips leading CRLF from the body', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'crlf-'));
    const d = path.join(tmp, 'demo');
    mkdirSync(path.join(d, 'en', 'alpha'), { recursive: true });
    writeFileSync(
      path.join(d, 'en', 'alpha', 'intro.md'),
      '---\r\nsource:\r\n  locale: zh\r\n  slug: intro\r\n  hash: h\r\nstatus: machine\r\ntranslatedAt: 2026-10-13\r\n---\r\n\r\n# Hi\r\n',
    );
    const r = resolveDoc(tmp, c, 'en', 'alpha', 'intro')!;
    expect(r.body.startsWith('# Hi')).toBe(true);
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
  it('does not memoize outside production', () => {
    __resetHeadingsMemo();
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'hm-'));
    const d = path.join(tmp, 'demo');
    mkdirSync(path.join(d, 'zh', 'alpha'), { recursive: true });
    const f = path.join(d, 'zh', 'alpha', 'intro.md');
    writeFileSync(f, '# T\n\n## One\n');
    expect(headingsFor(tmp, c, 'zh', 'alpha', 'intro')!.map((h) => h.text)).toEqual(['One']);
    writeFileSync(f, '# T\n\n## Two\n');
    expect(headingsFor(tmp, c, 'zh', 'alpha', 'intro')!.map((h) => h.text)).toEqual(['Two']);
  });
});
