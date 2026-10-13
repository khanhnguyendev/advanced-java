import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCollection } from '@/lib/content/collection';
import { docAlternates, sitemapEntries, siteUrl } from '@/lib/seo';

const root = path.resolve(__dirname, '../fixtures/content');
const c = loadCollection(root, 'demo');

describe('docAlternates', () => {
  it('real translation: canonical is itself; hreflang only for real translations', () => {
    const a = docAlternates(root, c, 'en', 'alpha', 'intro');
    expect(a.canonical).toBe('/en/demo/alpha/intro');
    expect(a.languages).toEqual({
      en: '/en/demo/alpha/intro',
      'zh-Hans': '/zh/demo/alpha/intro',
      'x-default': '/en/demo/alpha/intro',
    });
  });
  it('fallback page: canonical points at the real-language page, vi is not an alternate', () => {
    const a = docAlternates(root, c, 'vi', 'alpha', 'intro');
    expect(a.canonical).toBe('/en/demo/alpha/intro');
    expect(a.languages.vi).toBeUndefined();
  });
  it('zh-only doc requested in en: canonical is the zh page', () => {
    const a = docAlternates(root, c, 'en', 'alpha', 'second');
    expect(a.canonical).toBe('/zh/demo/alpha/second');
    expect(a.languages).toEqual({ 'zh-Hans': '/zh/demo/alpha/second', 'x-default': '/zh/demo/alpha/second' });
  });
  it('zh-only doc requested in vi (chain skips en): canonical is the zh page', () => {
    const a = docAlternates(root, c, 'vi', 'alpha', 'second');
    expect(a.canonical).toBe('/zh/demo/alpha/second');
  });
});

describe('sitemapEntries', () => {
  it('lists real translations only, never fallback pages', () => {
    const paths = sitemapEntries(root).map((e) => e.path).sort();
    expect(paths).toEqual([
      '/en/demo/alpha/intro',
      '/zh/demo/alpha/intro',
      '/zh/demo/alpha/second',
      '/zh/demo/alpha/third',
    ]);
  });
  it('carries alternates among real translations only', () => {
    const e = sitemapEntries(root).find((x) => x.path === '/en/demo/alpha/intro')!;
    expect(Object.keys(e.alternates).sort()).toEqual(['en', 'x-default', 'zh-Hans']);
    expect(e.alternates['x-default']).toBe('/en/demo/alpha/intro');
  });
});

describe('siteUrl', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('prefers NEXT_PUBLIC_SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://a.example');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'b.example');
    expect(siteUrl()).toBe('https://a.example');
  });
  it('falls back to the Vercel production URL with https', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'b.example');
    expect(siteUrl()).toBe('https://b.example');
  });
  it('defaults to localhost', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
    expect(siteUrl()).toBe('http://localhost:3000');
  });
  it('strips trailing slashes', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://a.example//');
    expect(siteUrl()).toBe('https://a.example');
  });
});
