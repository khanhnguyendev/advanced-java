import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fsDiagramSource } from '@/lib/diagrams/source';
import { extractHeadings } from '@/lib/render/headings';
import type { LinkContext } from '@/lib/render/links';
import type { DiagramSource } from '@/lib/render/diagrams';
import { renderMarkdown } from '@/lib/render/pipeline';

const root = path.resolve(__dirname, '../fixtures/diagrams/content');
const diagrams = fsDiagramSource(root, 'toy');
const ID = 'demo/toy/toy';

const base = (md: string): LinkContext => ({
  collection: 'toy',
  routeLocale: 'en',
  currentHeadings: extractHeadings(md),
  headingsOf: () => null,
  assetExists: () => true,
  sectionExists: () => true,
});

const render = (md: string, bodyLocale: 'en' | 'zh' | 'vi' = 'en') =>
  renderMarkdown(md, { ...base(md), bodyLocale, diagrams, diagramCredit: 'Credit line' });

describe('diagram: images', () => {
  it('renders an inline svg figure with scroll wrapper, min-width and credit', async () => {
    const md = `# T\n\n## A\n\n![alt](diagram:${ID})\n\ntext\n`;
    const { html, headings } = await render(md);
    expect(html).toMatch(/<figure class="diagram" data-diagram="demo\/toy\/toy" style="contain-intrinsic-block-size: auto 264px"><div class="diagram-scroll"><svg[^>]*role="img"/);
    expect(html).toContain('style="min-width: 392px"');
    expect(html).toContain('width="100%"');
    expect(html).toContain('<figcaption class="diagram-credit">Credit line</figcaption>');
    expect(html).not.toContain('diagram:');
    expect(html).not.toContain('data-dg');
    expect(html).not.toContain('<p><figure');
    expect(headings).toHaveLength(1);
  });

  it('third-party figure: attribution caption with linked title, no derived credit', async () => {
    const att = { author: 'Ann Author', title: 'The Article', url: 'https://x.example/a?b=1&c=2' };
    const third = (a: typeof att & { licenseName?: string }): DiagramSource => ({
      load(id) {
        const l = diagrams.load(id);
        return l ? { ...l, scene: { ...l.scene, license: 'third-party' }, attribution: a } : null;
      },
    });
    const fmt = (a: { title: string; author: string; licenseName?: string }) =>
      a.licenseName ? `Redrawn from “${a.title}” by ${a.author} (${a.licenseName}).` : `Redrawn from “${a.title}” by ${a.author}. Rights remain.`;
    const md = `![a](diagram:${ID})\n`;
    const run = (src: DiagramSource) =>
      renderMarkdown(md, { ...base(md), bodyLocale: 'en', diagrams: src, diagramCredit: 'Credit line', diagramCreditThirdParty: fmt });
    const plain = (await run(third(att))).html;
    expect(plain).toContain(
      '<figcaption class="diagram-credit">Redrawn from “<a href="https://x.example/a?b=1&#x26;c=2" rel="noopener noreferrer">The Article</a>” by Ann Author. Rights remain.</figcaption>',
    );
    expect(plain).not.toContain('Credit line');
    const lic = (await run(third({ ...att, licenseName: 'Apache-2.0' }))).html;
    expect(lic).toContain('by Ann Author (Apache-2.0).</figcaption>');
    expect(lic).not.toContain('Rights remain');
    await expect(run({ load: (id) => ({ ...diagrams.load(id)!, scene: { ...diagrams.load(id)!.scene, license: 'third-party' } }) })).rejects.toThrow('attribution');
  });

  it('uses the body locale labels', async () => {
    const md = `![a](diagram:${ID})\n`;
    const zh = (await render(md, 'zh')).html;
    const en = (await render(md, 'en')).html;
    expect(zh).toContain('lang="zh"');
    expect(en).toContain('lang="en"');
    expect(zh).not.toBe(en);
    expect(/[一-鿿]/.test(zh)).toBe(true);
    expect(/[一-鿿]/.test(en)).toBe(false);
  });

  it('keeps ids distinct for two diagrams in one doc', async () => {
    const md = `![a](diagram:${ID})\n\n![b](diagram:${ID})\n`;
    const { html } = await render(md);
    const ids = Array.from(html.matchAll(/<title id="([^"]+)"/g), (m) => m[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('throws on unknown id, missing locale file and ".."', async () => {
    await expect(render('![a](diagram:demo/toy/nope)\n')).rejects.toThrow('diagram not found: demo/toy/nope');
    await expect(render('![a](diagram:../x)\n')).rejects.toThrow('diagram not found: ../x');
    await expect(
      renderMarkdown('![a](diagram:x/y/z)\n', {
        ...base(''),
        bodyLocale: 'vi',
        diagrams: { load: () => ({ scene: {} as never, labels: {} }) },
      }),
    ).rejects.toThrow('diagram not found: x/y/z');
  });

  it('strips an authored figure placeholder with no matching image node', async () => {
    const md = '## A\n\n<figure data-dg="0"></figure>\n\n<figure data-dg="7">x</figure>\n';
    const { html } = await render(md);
    expect(html).not.toContain('<svg');
    expect(html).not.toMatch(/<figure[\s>]/);
    expect(html).not.toContain('<div class="diagram-scroll"');
  });

  it('ignores an authored placeholder index that is not in the doc image list', async () => {
    const md = `<figure data-dg="7"></figure>\n\n![a](diagram:${ID})\n`;
    const { html } = await render(md);
    expect(html.match(/<svg/g)).toHaveLength(1);
    expect(html.match(/<figure/g)).toHaveLength(1);
  });

  it('is deterministic', async () => {
    const md = `## A\n\n![a](diagram:${ID})\n`;
    expect((await render(md)).html).toBe((await render(md)).html);
  });
});
