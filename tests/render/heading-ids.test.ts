import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { describe, expect, it } from 'vitest';
import { rehypeHeadingIds } from '@/lib/render/heading-ids';
import { extractHeadings } from '@/lib/render/headings';

const FENCE = '```';
async function render(md: string): Promise<string> {
  const f = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeHeadingIds)
    .use(rehypeStringify)
    .process(md);
  return String(f);
}

const md = [
  '# Title',
  '',
  '## Hello World',
  '',
  '### `Map<String, Object>` generics',
  '',
  '## 🔥',
  '',
  FENCE,
  '## fenced, not a heading',
  FENCE,
  '',
  '## Hello World',
  '',
  '###### Deepest',
  '',
].join('\n');

describe('rehypeHeadingIds', () => {
  it('assigns id and data-hi to h2–h6 only', async () => {
    const html = await render(md);
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<h2 id="h1-hello-world" data-hi="1">Hello World</h2>');
    expect(html).toContain('data-hi="2"');
    expect(html).toContain('<h2 id="h3" data-hi="3">🔥</h2>');
    expect(html).toContain('<h2 id="h4-hello-world" data-hi="4">Hello World</h2>');
    expect(html).toContain('<h6 id="h5-deepest" data-hi="5">Deepest</h6>');
  });

  it('produces exactly the ids that extractHeadings predicts (parity)', async () => {
    const html = await render(md);
    const rendered = [...html.matchAll(/<h[2-6] id="([^"]+)" data-hi="(\d+)"/g)].map((m) => m[1]);
    expect(rendered).toEqual(extractHeadings(md).map((h) => h.id));
  });

  it('keeps ids unique when text repeats', async () => {
    const html = await render(md);
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ignores the GFM footnote heading and keeps real heading indices intact', async () => {
    const fmd = ['## One', '', 'Text[^1] here.', '', '## Two', '', '[^1]: A note.', ''].join('\n');
    const html = await render(fmd);
    expect(html).toContain('id="footnote-label"');
    expect(html).not.toMatch(/<h2[^>]*id="h\d+-footnotes"/);
    expect(html).not.toMatch(/id="footnote-label"[^>]*data-hi/);
    expect(html).not.toMatch(/data-hi="[^"]*"[^>]*id="footnote-label"/);
    const rendered = [...html.matchAll(/<h[2-6] id="([^"]+)" data-hi="(\d+)"/g)].map((m) => m[1]);
    expect(rendered).toEqual(['h1-one', 'h2-two']);
    expect(rendered).toEqual(extractHeadings(fmd).map((h) => h.id));
  });
});
