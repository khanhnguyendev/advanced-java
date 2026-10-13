// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import { AboutContent } from '@/components/AboutContent';
import { Attribution } from '@/components/Attribution';
import { DocList } from '@/components/DocList';
import { SectionCount } from '@/components/SectionCount';
import { Shelf } from '@/components/Shelf';
import { listImageCredits } from '@/lib/assets';
import { loadCollection } from '@/lib/content/collection';
import type { CollectionConfig } from '@/lib/content/types';
import { buildNav } from '@/lib/nav';
import type { NavGroup } from '@/lib/nav';
import en from '../../messages/en.json';

const wrap = (ui: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={en}>
    {ui}
  </NextIntlClientProvider>
);

describe('DocList status labels', () => {
  it('renders a visible label per doc status', () => {
    const groups: NavGroup[] = [
      {
        id: 'g',
        title: 'G',
        docs: [
          { slug: 'a', catalogId: 'X-1', title: 'A', status: 'translated', href: '/en/c/s/a' },
          { slug: 'b', catalogId: 'X-2', title: 'B', status: 'machine', href: '/en/c/s/b' },
          { slug: 'c', catalogId: 'X-3', title: 'C', status: 'fallback', href: '/en/c/s/c' },
        ],
      },
    ];
    render(wrap(<DocList groups={groups} />));
    expect(screen.getByText(en.doc.translated)).toBeTruthy();
    expect(screen.getByText(en.doc.machineStatus)).toBeTruthy();
    expect(screen.getByText(en.doc.fallback)).toBeTruthy();
  });
});

describe('Attribution on index pages', () => {
  afterEach(cleanup);
  it('shows license, credit and About link without an upstream file link', () => {
    render(wrap(<Attribution aboutHref="/en/about" />));
    expect(screen.getByRole('link', { name: en.attribution.license })).toBeTruthy();
    expect(screen.getByText(new RegExp(en.attribution.credit))).toBeTruthy();
    expect(screen.getByRole('link', { name: en.attribution.aboutLink }).getAttribute('href')).toBe('/en/about');
    expect(screen.queryByRole('link', { name: en.attribution.sourceFile })).toBeNull();
    expect(screen.queryByText(en.attribution.changesZh)).toBeNull();
  });
  it('keeps the upstream file link and change note on document pages', () => {
    render(wrap(<Attribution kind="translated" fileUrl="https://example.com/f.md" aboutHref="/en/about" />));
    expect(screen.getByRole('link', { name: en.attribution.sourceFile }).getAttribute('href')).toBe('https://example.com/f.md');
    expect(screen.getByText(new RegExp(en.attribution.changesTranslated))).toBeTruthy();
  });
  it('is rendered by the shelf', () => {
    render(wrap(<Shelf locale="en" items={[]} />));
    expect(screen.getByRole('link', { name: en.attribution.license })).toBeTruthy();
  });
});

describe('Shelf locale labels', () => {
  it('marks the zh label with lang zh-Hans', () => {
    const { container } = render(
      wrap(
        <Shelf
          locale="en"
          items={[{ collection: 'c', title: 'c', tabColor: '#000', total: 1, perLocale: { en: 1, vi: 0, zh: 1 } }]}
        />,
      ),
    );
    expect(container.querySelector('dt[lang="zh-Hans"]')).toBeTruthy();
    expect(container.querySelectorAll('main').length).toBe(1);
  });
});

describe('About', () => {
  const commit = '1a35221';
  const collections = [
    {
      id: 'demo',
      repo: 'https://github.com/doocs/advanced-java',
      commit,
      images: [
        { path: 'docs/a/images/x.png', href: `https://github.com/doocs/advanced-java/blob/${commit}/docs/a/images/x.png` },
        { path: 'docs/a/images/y.png', href: `https://github.com/doocs/advanced-java/blob/${commit}/docs/a/images/y.png` },
      ],
    },
  ];

  it('states both licenses and a /tree/<commit> link', () => {
    const { container } = render(wrap(<AboutContent collections={collections} />));
    expect(screen.getByText('MIT')).toBeTruthy();
    expect(screen.getByText('CC-BY-SA-4.0')).toBeTruthy();
    expect(container.querySelector(`a[href$="/tree/${commit}"]`)).toBeTruthy();
    expect(container.querySelectorAll('main').length).toBe(1);
  });

  it('lists one link per image, each pointing at the commit', () => {
    const { container } = render(wrap(<AboutContent collections={collections} />));
    const links = container.querySelectorAll('details a');
    expect(links.length).toBe(2);
    links.forEach((l) => expect(l.getAttribute('href')).toContain(commit));
  });
});

describe('listImageCredits', () => {
  let root = '';
  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });
  it('maps _assets/<section>/<slug>/<file> to the upstream docs/<section>/images path', () => {
    root = mkdtempSync(path.join(tmpdir(), 'assets-'));
    for (const [sec, slug, file] of [['hc', 's1', 'a.png'], ['hc', 's2', 'a.png'], ['hc', 's2', 'b.png']]) {
      mkdirSync(path.join(root, 'c', '_assets', sec, slug), { recursive: true });
      writeFileSync(path.join(root, 'c', '_assets', sec, slug, file), 'x');
    }
    const c = { id: 'c', upstream: { repo: 'https://r', commit: 'abc' } } as unknown as CollectionConfig;
    const out = listImageCredits(root, c);
    expect(out.map((o) => o.path)).toEqual(['docs/hc/images/a.png', 'docs/hc/images/b.png']);
    expect(out[0].href).toBe('https://r/blob/abc/docs/hc/images/a.png');
  });
});

describe('SectionCount', () => {
  it('shows a visible label and counts only translated docs', () => {
    const fx = path.resolve(__dirname, '../fixtures/content');
    const nav = buildNav(fx, loadCollection(fx, 'demo'), 'en');
    const groups = nav.flatMap((s) => s.groups);
    // fixture demo/en: three docs, none reviewed-translated, one machine-translated (intro)
    const { container } = render(wrap(<SectionCount groups={groups} />));
    expect(screen.getByText(`${en.doc.translated}:`)).toBeTruthy();
    expect(container.textContent).toContain('0 / 3');
    expect(container.textContent).toContain(`${en.doc.machineStatus}: 1`);
  });
});
