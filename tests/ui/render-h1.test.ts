import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '@/lib/content/fallback';
import { renderMarkdown } from '@/lib/render/pipeline';

const ctx = { collection: 'demo', routeLocale: 'zh' as const, headingsOf: () => null };
const h1s = (html: string) => (html.match(/<h1[\s>]/g) ?? []).length;

describe('doc body H1', () => {
  it('is dropped so the header title is the only h1 (fixture doc)', async () => {
    const file = path.resolve(__dirname, '../fixtures/content/demo/zh/alpha/intro.md');
    const body = parse(readFileSync(file, 'utf8')).content;
    expect(body).toMatch(/^\s*# /m);
    const { html, headings } = await renderMarkdown(body, ctx);
    expect(h1s(html)).toBe(0);
    expect(headings.length).toBeGreaterThan(0);
  });
  it('leaves a doc without an h1 alone and keeps h1-looking lines in code fences', async () => {
    const { html } = await renderMarkdown('## A\n\ntext\n\n```md\n# not a heading\n```\n', ctx);
    expect(h1s(html)).toBe(0);
    expect(html).toContain('not a heading');
  });
});
