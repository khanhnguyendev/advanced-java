import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCollection } from '@/lib/content/collection';
import { docAlternates, indexAlternates, resetSiteUrlWarning, sitemapEntries, siteUrl } from '@/lib/seo';

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
    const paths = sitemapEntries(root).map((e) => e.path).filter((p) => p.split('/').length === 5).sort();
    expect(paths).toEqual([
      '/en/demo/alpha/intro',
      '/zh/demo/alpha/intro',
      '/zh/demo/alpha/second',
      '/zh/demo/alpha/third',
    ]);
  });
  it('lists the index pages with all three locales and x-default en', () => {
    const entries = sitemapEntries(root);
    const paths = entries.map((e) => e.path);
    for (const p of ['/en', '/vi', '/zh', '/en/about', '/zh/about', '/vi/demo', '/en/demo/alpha', '/zh/demo/alpha']) {
      expect(paths).toContain(p);
    }
    const home = entries.find((e) => e.path === '/vi')!;
    expect(home.alternates).toEqual({ en: '/en', vi: '/vi', 'zh-Hans': '/zh', 'x-default': '/en' });
    const sec = entries.find((e) => e.path === '/zh/demo/alpha')!;
    expect(sec.alternates).toEqual({
      en: '/en/demo/alpha',
      vi: '/vi/demo/alpha',
      'zh-Hans': '/zh/demo/alpha',
      'x-default': '/en/demo/alpha',
    });
  });
  it('carries alternates among real translations only', () => {
    const e = sitemapEntries(root).find((x) => x.path === '/en/demo/alpha/intro')!;
    expect(Object.keys(e.alternates).sort()).toEqual(['en', 'x-default', 'zh-Hans']);
    expect(e.alternates['x-default']).toBe('/en/demo/alpha/intro');
  });
});

describe('siteUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  it('warns once, without throwing, when production has no site URL', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resetSiteUrlWarning();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(siteUrl()).toBe('http://localhost:3000');
    expect(siteUrl()).toBe('http://localhost:3000');
    expect(warn).toHaveBeenCalledTimes(1);
  });
  it('does not warn on Vercel or outside production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resetSiteUrlWarning();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('NODE_ENV', 'production');
    siteUrl();
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('NODE_ENV', 'development');
    siteUrl();
    expect(warn).not.toHaveBeenCalled();
  });
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

describe('indexAlternates', () => {
  it('canonical is the page itself; all locales plus x-default en', () => {
    const a = indexAlternates('vi', '/about');
    expect(a.canonical).toBe('/vi/about');
    expect(a.languages).toEqual({ en: '/en/about', vi: '/vi/about', 'zh-Hans': '/zh/about', 'x-default': '/en/about' });
  });
  it('home has an empty suffix', () => {
    expect(indexAlternates('zh', '').canonical).toBe('/zh');
    expect(indexAlternates('zh', '').languages['x-default']).toBe('/en');
  });
});

describe('sitemap lastModified', () => {
  it('uses translatedAt for translated docs and omits it for the source', () => {
    const e = sitemapEntries(root);
    const en = e.find((x) => x.path === '/en/demo/alpha/intro')!;
    const zh = e.find((x) => x.path === '/zh/demo/alpha/intro')!;
    expect(zh.lastModified).toBeUndefined();
    expect(en.lastModified).toBe('2026-10-13');
  });
});
