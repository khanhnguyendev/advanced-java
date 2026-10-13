import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '@/lib/content/fallback';
import { renderMarkdown } from '@/lib/render/pipeline';

const ctx = { collection: 'demo', routeLocale: 'zh' as const, headingsOf: () => null, assetExists: () => true, sectionExists: () => true };
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
  it('drops the title H1 even when prose precedes it', async () => {
    const { html } = await renderMarkdown('intro\n\n# T\n\n## A\n', ctx);
    expect(h1s(html)).toBe(0);
    expect(html).toContain('intro');
  });
  it('keeps a later H1 when another heading comes first', async () => {
    const { html } = await renderMarkdown('## A\n\n# Part\n\n## B\n', ctx);
    expect(h1s(html)).toBe(1);
    expect(html).toContain('Part');
  });
});
