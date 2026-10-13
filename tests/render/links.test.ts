import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import { describe, expect, it } from 'vitest';
import { rehypeResolveLinks, resolveHref, type LinkContext } from '@/lib/render/links';

const target = [
  { index: 1, depth: 2, text: 'One', id: 'h1-one' },
  { index: 3, depth: 2, text: 'Third part', id: 'h3-third-part' },
];
const ctx: LinkContext = {
  collection: 'demo',
  routeLocale: 'vi',
  currentHeadings: [{ index: 1, depth: 2, text: 'Hello World', id: 'h1-hello-world' }],
  headingsOf: (c, s, slug) => (c === 'demo' && s === 'alpha' && slug === 'second' ? target : null),
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
