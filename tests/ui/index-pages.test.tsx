// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { AboutContent } from '@/components/AboutContent';
import { DocList } from '@/components/DocList';
import { Shelf } from '@/components/Shelf';
import { listImageCredits } from '@/lib/assets';
import type { CollectionConfig } from '@/lib/content/types';
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
  it('maps _assets/<section>/<slug>/<file> to the upstream docs/<section>/images path', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'assets-'));
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
