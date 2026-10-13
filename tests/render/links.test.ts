import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import { describe, expect, it } from 'vitest';
import { fsLinkTargets, rehypeResolveLinks, resolveHref, type LinkContext } from '@/lib/render/links';

const target = [
  { index: 1, depth: 2, text: 'One', id: 'h1-one' },
  { index: 3, depth: 2, text: 'Third part', id: 'h3-third-part' },
];
const ctx: LinkContext = {
  collection: 'demo',
  routeLocale: 'vi',
  currentHeadings: [{ index: 1, depth: 2, text: 'Hello World', id: 'h1-hello-world' }],
  headingsOf: (c, s, slug) => (c === 'demo' && s === 'alpha' && slug === 'second' ? target : null),
  assetExists: (c, rel) => c === 'demo' && rel === 'alpha/intro/d.png',
  sectionExists: (c, s) => c === 'demo' && s === 'alpha',
};

describe('resolveHref', () => {
  it('resolves doc: to the route locale', () => {
    expect(resolveHref('doc:demo/alpha/second', ctx)).toBe('/vi/demo/alpha/second');
  });
  it('resolves doc:…#hN to the full heading id of the target', () => {
    expect(resolveHref('doc:demo/alpha/second#h3', ctx)).toBe('/vi/demo/alpha/second#h3-third-part');
  });
  it('resolves section: and home:', () => {
    expect(resolveHref('section:demo/alpha', ctx)).toBe('/vi/demo/alpha');
    expect(resolveHref('home:', ctx)).toBe('/vi');
  });
  it('resolves asset: to /_content', () => {
    expect(resolveHref('asset:alpha/intro/d.png', ctx)).toBe('/_content/demo/alpha/intro/d.png');
  });
  it('throws on an asset: target that does not exist', () => {
    expect(() => resolveHref('asset:alpha/intro/nope.png', ctx)).toThrow(/asset link target not found/);
  });
  it('throws on an asset: target with a .. segment', () => {
    expect(() => resolveHref('asset:alpha/../../etc/passwd', ctx)).toThrow(/\.\./);
  });
  it('throws on a section: target that does not exist', () => {
    expect(() => resolveHref('section:demo/nope', ctx)).toThrow(/section link target not found/);
    expect(() => resolveHref('section:other/alpha', ctx)).toThrow(/section link target not found/);
  });
  it('resolves a same-document #hN to the full id', () => {
    expect(resolveHref('#h1', ctx)).toBe('#h1-hello-world');
  });
  it('leaves external and other fragments alone', () => {
    expect(resolveHref('https://example.com/a', ctx)).toBe('https://example.com/a');
    expect(resolveHref('#custom', ctx)).toBe('#custom');
  });
  it('throws when the doc does not exist', () => {
    expect(() => resolveHref('doc:demo/alpha/missing', ctx)).toThrow(/missing/);
  });
  it('throws when the heading index does not exist in the target', () => {
    expect(() => resolveHref('doc:demo/alpha/second#h2', ctx)).toThrow(/h2/);
  });
  it('throws on a same-document #hN beyond the heading count', () => {
    expect(() => resolveHref('#h9', ctx)).toThrow(/h9/);
  });
});

describe('rehypeResolveLinks', () => {
  it('rewrites a[href] and img[src] in raw html too', async () => {
    const html = String(
      await unified()
        .use(rehypeParse, { fragment: true })
        .use(rehypeResolveLinks, ctx)
        .use(rehypeStringify)
        .process('<p><a href="doc:demo/alpha/second#h3">x</a><img src="asset:alpha/intro/d.png" alt=""></p>'),
    );
    expect(html).toContain('href="/vi/demo/alpha/second#h3-third-part"');
    expect(html).toContain('src="/_content/demo/alpha/intro/d.png"');
  });
});

describe('fsLinkTargets', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'links-'));
  mkdirSync(path.join(root, 'c1', '_assets', 's', 'd'), { recursive: true });
  writeFileSync(path.join(root, 'c1', '_assets', 's', 'd', 'a.png'), 'x');
  writeFileSync(path.join(root, 'c1', 'collection.json'), JSON.stringify({
    id: 'c1', sourceLocale: 'zh', locales: ['zh'], tabColor: '#000', ids: {}, upstream: { repo: 'r', commit: 'c' }, upstreamFiles: {},
    sections: [{ id: 'sec', prefix: 'S', groups: [] }],
  }));
  writeFileSync(path.join(root, 'c1', 'sibling.png'), 'x');
  const t = fsLinkTargets(root);
  it('accepts existing assets and rejects missing, escaping or directory targets', () => {
    expect(t.assetExists('c1', 's/d/a.png')).toBe(true);
    expect(t.assetExists('c1', 's/d/missing.png')).toBe(false);
    expect(t.assetExists('c1', '../sibling.png')).toBe(false);
    expect(t.assetExists('c1', 's/d')).toBe(false);
    expect(t.assetExists('nope', 's/d/a.png')).toBe(false);
  });
  it('checks sections against the collection config', () => {
    expect(t.sectionExists('c1', 'sec')).toBe(true);
    expect(t.sectionExists('c1', 'other')).toBe(false);
    expect(t.sectionExists('nope', 'sec')).toBe(false);
  });
});
