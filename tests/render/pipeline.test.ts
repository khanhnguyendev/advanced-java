import { describe, expect, it } from 'vitest';
import { extractHeadings } from '@/lib/render/headings';
import type { LinkContext } from '@/lib/render/links';
import { assertHeadingParity, renderMarkdown } from '@/lib/render/pipeline';

const FENCE = '```';
const md = [
  '# Title',
  '',
  '## Hello World',
  '',
  FENCE + 'java',
  'public class A { Map<String, Object> m = new HashMap<>(); }',
  FENCE,
  '',
  'Prose generics Map<String, Object>, braces {} and a < b && c > d stay literal.',
  '',
  'Line one<br>line two, H<sub>2</sub>O and x<sup>2</sup>.',
  '',
  '| a | b |',
  '| - | - |',
  '| 1 | 2 |',
  '',
  '<script>alert(1)</script>',
  '',
  '<iframe src="https://example.com"></iframe>',
  '',
  '[bad](javascript:alert(1))',
  '',
  '[to second](doc:demo/alpha/second#h3) and [up](#h1)',
  '',
  '![ok](asset:alpha/intro/d.png) and <img src="https://evil.example/x.png" alt="evil">',
  '',
].join('\n');

const ctx: LinkContext = {
  collection: 'demo',
  routeLocale: 'vi',
  currentHeadings: extractHeadings(md),
  headingsOf: (c, s, slug) =>
    c === 'demo' && s === 'alpha' && slug === 'second'
      ? [{ index: 3, depth: 2, text: 'Third part', id: 'h3-third-part' }]
      : null,
};

const decode = (s: string) =>
  s.replace(/&#x3C;|&lt;/g, '<').replace(/&#x3E;|&gt;/g, '>').replace(/&#x26;|&amp;/g, '&');

describe('renderMarkdown', () => {
  it('renders heading ids exactly as the scheme defines (no user-content prefix)', async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toContain('<h2 id="h1-hello-world" data-hi="1">Hello World</h2>');
    expect(html).not.toContain('user-content');
  });

  it('keeps highlighting markup after sanitize', async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toMatch(/<pre[^>]*data-language="java"/);
    expect(html).toMatch(/<span[^>]*style="[^"]*--shiki/);
  });

  it('keeps br, sub, sup and tables', async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toContain('<br>');
    expect(html).toContain('<sub>2</sub>');
    expect(html).toContain('<sup>2</sup>');
    expect(html).toContain('<table>');
  });

  it('strips scripts, iframes and javascript: urls', async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('javascript:');
  });

  it('resolves neutral links and restricts images', async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toContain('href="/vi/demo/alpha/second#h3-third-part"');
    expect(html).toContain('href="#h1-hello-world"');
    expect(html).toContain('src="/_content/demo/alpha/intro/d.png"');
    expect(html).not.toContain('evil.example');
  });

  it('renders prose angle brackets and braces literally', async () => {
    const { html } = await renderMarkdown(md, ctx);
    const text = decode(html);
    expect(text).toContain('Prose generics Map<String, Object>, braces {} and a < b && c > d stay literal.');
  });

  it('returns the heading list of the document', async () => {
    const { headings } = await renderMarkdown(md, ctx);
    expect(headings.map((h) => h.id)).toEqual(['h1-hello-world']);
  });

  it('emits exactly one data-hi per extracted heading', async () => {
    const doc = '# T\n\n## A\n\ntext\n\n### B\n\n## C\n';
    const { html, headings } = await renderMarkdown(doc, { ...ctx, currentHeadings: extractHeadings(doc) });
    expect(headings).toHaveLength(3);
    expect(html.match(/data-hi="/g)).toHaveLength(3);
  });

  it('names the document in link errors when docRef is given', async () => {
    const bad = '## A\n\n[x](doc:demo/alpha/missing)\n';
    await expect(renderMarkdown(bad, ctx, { docRef: 'demo/alpha/first' })).rejects.toThrow(
      /^\(in demo\/alpha\/first\) .*doc link target not found/,
    );
  });
});

describe('renderMarkdown hardening', () => {
  const r = (src: string) => renderMarkdown(src, ctx).then((x) => x.html);

  it('drops picture/source and srcset', async () => {
    const html = await r('<picture><source srcset="https://tracker/x.png"><img src="/_content/a.png"></picture>\n');
    expect(html).not.toContain('srcset');
    expect(html).not.toContain('tracker');
    expect(html).not.toContain('<picture');
    expect(html).not.toContain('<source');
  });

  it('strips name attributes (DOM clobbering)', async () => {
    const html = await r('<img src="/_content/x.png" name="getElementById">\n');
    expect(html).toContain('src="/_content/x.png"');
    expect(html).not.toContain('name=');
  });

  it('renders unknown-tag-looking prose literally', async () => {
    const html = await r('Use List<String> and Class<T> here.\n');
    expect(decode(html)).toContain('Use List<String> and Class<T> here.');
  });

  it('renders block <div> as literal text, not an element', async () => {
    const html = await r('<div>x</div>\n');
    expect(html).not.toContain('<div');
    expect(decode(html)).toContain('<div>x</div>');
  });

  it('keeps br, sub, sup and tables as elements and drops comments', async () => {
    const html = await r('a<br>b H<sub>2</sub>O x<sup>2</sup> <!-- secret -->\n\n<!-- block secret -->\n\n| a | b |\n| - | - |\n| 1 | 2 |\n');
    expect(html).toContain('<br>');
    expect(html).toContain('<sub>2</sub>');
    expect(html).toContain('<sup>2</sup>');
    expect(html).toContain('<table>');
    expect(html).not.toContain('secret');
  });

  it('raw heading becomes literal text and parity holds', async () => {
    const { html, headings } = await renderMarkdown('## A\n\n<h3>raw</h3>\n', ctx);
    expect(headings).toHaveLength(1);
    expect(html).not.toContain('<h3');
    expect(decode(html)).toContain('<h3>raw</h3>');
  });

  it('ignores stale caller currentHeadings', async () => {
    const { html } = await renderMarkdown('## A\n\n[up](#h1)\n', { ...ctx, currentHeadings: [] });
    expect(html).toContain('href="#h1-a"');
  });
});

describe('assertHeadingParity', () => {
  it('passes when counts match', () => {
    expect(() => assertHeadingParity('<h2 data-hi="1">a</h2><h3 data-hi="2">b</h3>', 2)).not.toThrow();
  });
  it('throws a clear error on mismatch', () => {
    expect(() => assertHeadingParity('<h2 data-hi="1">a</h2>', 2)).toThrow(/heading parity.*1.*2/i);
  });
});
