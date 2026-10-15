import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { OG_ALT, OG_LOCALE, pageMetadata } from '@/lib/page-metadata';

const input = {
  title: 'T',
  description: 'D',
  canonical: '/zh/c/s/x',
  languages: { 'zh-Hans': '/zh/c/s/x' },
  locale: 'zh' as const,
  type: 'article' as const,
  routeLocale: 'en' as const,
};

describe('pageMetadata', () => {
  it('og:url equals the canonical path', () => {
    const m = pageMetadata(input);
    expect((m.openGraph as { url: string }).url).toBe(m.alternates!.canonical);
  });
  it('alternateLocale excludes the served locale', () => {
    const m = pageMetadata(input);
    expect((m.openGraph as { alternateLocale: string[] }).alternateLocale).toEqual([OG_LOCALE.en, OG_LOCALE.vi]);
  });
  it('alternateLocale lists only locales that exist', () => {
    const m = pageMetadata({ ...input, available: ['zh', 'en'] });
    expect((m.openGraph as { alternateLocale: string[] }).alternateLocale).toEqual([OG_LOCALE.en]);
  });
  it('uses the route locale share image', () => {
    const m = pageMetadata(input);
    expect((m.openGraph as { images: { url: string }[] }).images[0].url).toBe('/en/opengraph-image');
  });
});

describe('OG_ALT', () => {
  it('equals the alt export of the opengraph-image route', () => {
    const src = readFileSync(path.resolve(__dirname, '../../app/[locale]/opengraph-image.tsx'), 'utf8');
    const m = /export const alt = '([^']*)';/.exec(src);
    expect(m?.[1]).toBe(OG_ALT);
  });
});
