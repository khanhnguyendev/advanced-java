// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CollectionIndex, type IndexSection } from '@/components/CollectionIndex';
import { newestFlag } from '@/components/PrimaryAction';
import en from '../../messages/en.json';

const counts = (translated: number, machine: number, total: number) => ({
  total,
  translated,
  machine,
  fallback: total - translated - machine,
});
const sections: IndexSection[] = [
  {
    id: 'high-concurrency',
    title: 'High concurrency',
    href: '/en/advanced-java/high-concurrency',
    idRange: 'HC-01 – HC-28',
    total: 28,
    perLocale: { en: counts(20, 5, 28), vi: counts(0, 0, 28), zh: counts(28, 0, 28) },
  },
  {
    id: 'big-data',
    title: 'Big data',
    href: '/en/advanced-java/big-data',
    idRange: 'BD-01 – BD-02',
    total: 2,
    perLocale: { en: counts(2, 0, 2), vi: counts(1, 0, 2), zh: counts(2, 0, 2) },
  },
];
const docs = [
  { catalogId: 'HC-01', title: 'Why MQ', href: '/en/advanced-java/high-concurrency/why-mq' },
  { catalogId: 'HC-02', title: 'Second', href: '/en/advanced-java/high-concurrency/second' },
];
const ui = () => (
  <NextIntlClientProvider locale="en" messages={en}>
    <CollectionIndex locale="en" sourceLocale="zh" collection="advanced-java" sections={sections} docs={docs} />
  </NextIntlClientProvider>
);

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe('CollectionIndex', () => {
  it('has one h1, a Start link to the first doc and one whole-row link per section', () => {
    render(ui());
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const start = document.querySelector('[data-primary="start"]') as HTMLAnchorElement;
    expect(start.getAttribute('href')).toBe(docs[0].href);
    expect(start.textContent).toContain('HC-01');
    const rows = document.querySelectorAll('a.index-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].getAttribute('href')).toBe('/en/advanced-java/high-concurrency');
    expect(rows[0].textContent).toContain('HC-01 – HC-28');
  });
  it('labels the counts with language names', () => {
    render(ui());
    const row = document.querySelectorAll('a.index-row')[0] as HTMLElement;
    const langs = Array.from(row.querySelectorAll('.index-lang'));
    expect(langs.map((e) => e.textContent)).toEqual([
      'English: 25 of 28 available, 5 machine translated, 3 not translated',
      'Tiếng Việt: 0 of 28 available, 28 not translated',
      '中文: original, 28 docs',
    ]);
    expect(langs.map((e) => e.querySelector('[lang]')?.getAttribute('lang'))).toEqual(['en', 'vi', 'zh-Hans']);
  });
});

describe('newestFlag', () => {
  const rec = (savedAt: number) => JSON.stringify({ headingIndex: 2, headingText: 'x', headingCount: 5, zhHash: 'h', savedAt });
  it('returns null with no stored flags', () => {
    expect(newestFlag(window.localStorage, 'advanced-java', docs)).toBeNull();
    expect(newestFlag(null, 'advanced-java', docs)).toBeNull();
  });
  it('picks the most recently saved flag', () => {
    window.localStorage.setItem('flag:advanced-java:HC-01', rec(100));
    window.localStorage.setItem('flag:advanced-java:HC-02', rec(200));
    expect(newestFlag(window.localStorage, 'advanced-java', docs)?.catalogId).toBe('HC-02');
  });
  it('ignores corrupt records', () => {
    window.localStorage.setItem('flag:advanced-java:HC-01', '{nope');
    expect(newestFlag(window.localStorage, 'advanced-java', docs)).toBeNull();
  });
});
