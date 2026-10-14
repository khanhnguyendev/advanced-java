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

describe('DocList', () => {
  it('renders each doc as a link with no status label', () => {
    const groups: NavGroup[] = [
      {
        id: 'g',
        title: 'G',
        docs: [
          { slug: 'a', catalogId: 'X-1', title: 'A', href: '/en/c/s/a' },
          { slug: 'b', catalogId: 'X-2', title: 'B', href: '/en/c/s/b' },
        ],
      },
    ];
    const { container } = render(wrap(<DocList groups={groups} />));
    expect(container.querySelectorAll('li a')).toHaveLength(2);
    expect(container.querySelector('.doc-status, [data-status]')).toBeNull();
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
  it('renders a source credit with a plain link, only for credited docs', () => {
    const credit = { title: 'Microservices', author: 'Martin Fowler and James Lewis', publisher: 'martinfowler.com', url: 'https://martinfowler.com/articles/microservices.html', year: 2014 };
    const { container } = render(wrap(<Attribution kind="zh" aboutHref="/en/about" credit={credit} creditLang="en" />));
    const block = container.querySelector('.source-credit')!;
    expect(block.getAttribute('lang')).toBe('en');
    expect(block.textContent).toContain('Original source: “Microservices” by Martin Fowler and James Lewis, martinfowler.com');
    const a = screen.getByRole('link', { name: 'Read the original' });
    expect(a.getAttribute('href')).toBe(credit.url);
    expect(a.getAttribute('target')).toBeNull();
    cleanup();
    const plain = render(wrap(<Attribution kind="zh" aboutHref="/en/about" />));
    expect(plain.container.querySelector('.source-credit')).toBeNull();
  });
  it('does not claim CC-BY-SA over the original when credited', () => {
    const credit = { title: 'T', author: 'A', publisher: 'P', url: 'https://example.com', year: 2015 };
    render(wrap(<Attribution aboutHref="/en/about" credit={credit} served="zh" />));
    expect(screen.getByText(new RegExp(en.attribution.licenseCredited))).toBeTruthy();
    expect(screen.queryByRole('link', { name: en.attribution.license })).toBeNull();
    expect(screen.queryByText(new RegExp(en.attribution.credit))).toBeNull();
  });
  it('picks the credit sentence by served locale and language-tags the title', () => {
    const credit = { title: 'Microservices', author: 'A', publisher: 'P', url: 'https://example.com', year: 2015 };
    const zhServed = render(wrap(<Attribution aboutHref="/en/about" credit={credit} served="zh" />));
    expect(zhServed.container.textContent).toContain('Chinese translation of that work, reproduced here');
    expect(zhServed.container.textContent).not.toContain('machine translation');
    expect(zhServed.container.querySelector('cite')!.getAttribute('lang')).toBe('en');
    cleanup();
    const enServed = render(wrap(<Attribution aboutHref="/en/about" credit={credit} served="en" />));
    expect(enServed.container.textContent).toContain('machine translation of a Chinese translation');
  });
  it('renders the adaptation credit with a license link, in each served variant and locale', () => {
    const credit = {
      kind: 'adaptation' as const, title: 'Sentinel 与 Hystrix 的对比', author: 'Sentinel contributors', publisher: 'alibaba/Sentinel wiki',
      url: 'https://github.com/alibaba/Sentinel/wiki/x', license: { name: 'Apache-2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0' },
    };
    const zh = render(wrap(<Attribution aboutHref="/en/about" credit={credit} served="zh" />));
    const block = zh.container.querySelector('.source-credit')!;
    expect(block.textContent).toContain('Adapted from “Sentinel 与 Hystrix 的对比” by Sentinel contributors, alibaba/Sentinel wiki.');
    expect(block.textContent).toContain('it is not the original');
    expect(block.textContent).toContain('The original is licensed under Apache-2.0.');
    expect(block.querySelector('cite')!.getAttribute('lang')).toBe('en');
    const links = [...block.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([credit.url, credit.license.url]);
    expect(links[1].textContent).toBe('Apache-2.0');
    zh.unmount();
    const en = render(wrap(<Attribution aboutHref="/en/about" credit={credit} served="en" />));
    expect(en.container.querySelector('.source-credit')!.textContent).toContain('machine translation of a Chinese adaptation');
    en.unmount();
    const noLic = render(wrap(<Attribution aboutHref="/en/about" credit={{ ...credit, license: undefined }} served="zh" />));
    expect(noLic.container.querySelector('.source-credit')!.textContent).not.toContain('licensed under');
    expect(noLic.container.querySelectorAll('.source-credit a')).toHaveLength(1);
  });
  it('renders the derived credit (unknown authorship, introduction only) for served zh and served en/vi, with no license line', () => {
    const credit = {
      kind: 'derived' as const, title: 'Service Discovery in a Microservices Architecture', author: 'Chris Richardson',
      publisher: 'NGINX blog (now hosted by F5)', url: 'https://www.f5.com/company/blog/nginx/service-discovery-in-a-microservices-architecture',
    };
    const zh = render(wrap(<Attribution aboutHref="/en/about" credit={credit} served="zh" />));
    const block = zh.container.querySelector('.source-credit')!;
    expect(block.textContent).toContain('This Chinese article is of unknown authorship. Its introduction draws on “Service Discovery in a Microservices Architecture” by Chris Richardson, NGINX blog (now hosted by F5); the rest is not part of that work.');
    expect(block.textContent).not.toContain('Original source');
    expect(block.textContent).not.toContain('licensed under');
    expect(zh.container.textContent).not.toContain('Chinese translation published upstream');
    expect(zh.container.textContent).toContain(en.attribution.licenseDerived);
    expect([...block.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([credit.url]);
    expect(block.querySelector('cite')!.getAttribute('lang')).toBe('en');
    zh.unmount();
    for (const served of ['en', 'vi'] as const) {
      const r = render(wrap(<Attribution aboutHref="/en/about" credit={credit} served={served} />));
      const b = r.container.querySelector('.source-credit')!;
      expect(b.textContent).toContain('This page is a machine translation of a Chinese article of unknown authorship.');
      expect(b.textContent).not.toContain('licensed under');
      expect(b.querySelectorAll('a')).toHaveLength(1);
      r.unmount();
    }
    const noYear = render(wrap(<Attribution aboutHref="/en/about" credit={{ ...credit, license: undefined }} served="zh" />));
    expect(noYear.container.textContent).not.toMatch(/undefined|NaN/);
  });
  it('carries the UI locale on the credit block', () => {
    const credit = { title: 'T', author: 'A', publisher: 'P', url: 'https://example.com', year: 2015 };
    const { container } = render(wrap(<Attribution aboutHref="/zh/about" credit={credit} creditLang="zh-Hans" />));
    expect(container.querySelector('.source-credit')!.getAttribute('lang')).toBe('zh-Hans');
  });
  it('is rendered by the shelf', () => {
    render(wrap(<Shelf locale="en" items={[]} />));
    expect(screen.getByRole('link', { name: en.attribution.license })).toBeTruthy();
  });
});

describe('Shelf', () => {
  it('shows no per-locale translation counts', () => {
    const { container } = render(
      wrap(
        <Shelf
          locale="en"
          items={[{ collection: 'c', title: 'c', tabColor: '#000' }]}
        />,
      ),
    );
    expect(container.querySelector('dt[lang="zh-Hans"]')).toBeNull();
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

  it('states the image provenance and no longer disclaims relicensing', () => {
    const { container } = render(wrap(<AboutContent collections={collections} />));
    const text = container.textContent!;
    expect(text).toContain("2 images are served, from the upstream repository doocs/advanced-java at commit 1a35221, and are included under that repository's license, CC-BY-SA-4.0. Their original authorship is not documented upstream.");
    expect(text).not.toMatch(/relicensed|original terms|third-party/);
  });

  it('omits the image credits block when no raster is served', () => {
    const { container } = render(wrap(<AboutContent collections={collections.map((c) => ({ ...c, images: [] }))} />));
    expect(container.textContent).not.toContain('Image credits');
    expect(container.textContent).not.toContain('images are served');
  });

  it('lists one link per image, each pointing at the commit', () => {
    const { container } = render(wrap(<AboutContent collections={collections} />));
    const links = container.querySelectorAll('details a');
    expect(links.length).toBe(2);
    links.forEach((l) => expect(l.getAttribute('href')).toContain(commit));
  });
});

describe('About redrawn diagrams', () => {
  const d = (id: string, license = 'derived') => ({
    id, upstream: 'a/b/x.png', path: 'docs/a/images/x.png', href: 'https://github.com/doocs/advanced-java/blob/1a35221/docs/a/images/x.png', license,
  });
  const base = { id: 'demo', repo: 'https://github.com/doocs/advanced-java', commit: '1a35221', images: [] };

  it('lists a credit per diagram with count and no original line for derived', () => {
    const { container } = render(wrap(<AboutContent collections={[{ ...base, diagrams: [d('a/b/x'), d('a/b/y')] }]} />));
    const text = container.textContent!;
    expect(text).toContain('2 diagrams were redrawn');
    expect(text).toContain('Redrawn from the upstream image docs/a/images/x.png at commit 1a35221 (doocs/advanced-java), CC-BY-SA-4.0. Original authorship not documented upstream.');
    expect(text).not.toContain('Original drawing');
    expect(container.querySelectorAll('.diagram-credits a').length).toBe(2);
  });
  it('adds an Original drawing line for license original', () => {
    const { container } = render(wrap(<AboutContent collections={[{ ...base, diagrams: [d('a/b/x', 'original')] }]} />));
    expect(container.textContent).toContain('Original drawing');
  });
  it('lists third-party figures separately, without the CC-BY-SA wording, counts from data', () => {
    const tp = (id: string, licenseName?: string) => ({
      ...d(id, 'third-party'),
      attribution: {
        author: 'Ann Author',
        title: 'The Article',
        url: 'https://x.example/article',
        ...(licenseName ? { licenseName, licenseUrl: 'https://lic.example/l' } : {}),
      },
    });
    const dd = [d('a/b/x'), d('a/b/y'), tp('a/c/p'), tp('a/c/q', 'Apache-2.0'), tp('a/c/r')];
    const { container } = render(wrap(<AboutContent collections={[{ ...base, diagrams: dd }]} />));
    const text = container.textContent!;
    expect(text).toContain('2 diagrams were redrawn from upstream images');
    expect(text).toContain(en.about.thirdPartyCredits);
    expect(text).toContain('3 diagrams were redrawn from figures made by other authors');
    const list = container.querySelector('.third-party-credits')!;
    expect(list.querySelectorAll('li')).toHaveLength(3);
    expect(list.textContent).not.toContain('CC-BY-SA');
    expect(list.textContent).toContain('Redrawn from a figure in The Article by Ann Author, upstream image docs/a/images/x.png. Rights remain with the author; not relicensed here.');
    expect(list.textContent).toContain('License: Apache-2.0.');
    const hrefs = [...list.querySelectorAll('li:first-child a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['https://x.example/article', dd[2]!.href]);
    expect(list.querySelector('a[href="https://lic.example/l"]')).not.toBeNull();
    // derived list unchanged: only the two derived ids
    expect(container.querySelectorAll('.diagram-credits:not(.third-party-credits) li')).toHaveLength(2);
  });
  it('omits the third-party section when there are none', () => {
    const { container } = render(wrap(<AboutContent collections={[{ ...base, diagrams: [d('a/b/x')] }]} />));
    expect(container.textContent).not.toContain(en.about.thirdPartyCredits);
  });
  it('omits the section when there are no diagrams', () => {
    const { container } = render(wrap(<AboutContent collections={[base]} />));
    expect(container.textContent).not.toContain(en.about.diagramCredits);
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
    expect(listImageCredits(root, c, new Set(['hc/s1/a.png', 'hc/s2/a.png'])).map((o) => o.path)).toEqual(['docs/hc/images/b.png']);
  });
});
