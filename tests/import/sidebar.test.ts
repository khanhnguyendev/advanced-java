import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadSidebar, placeUnlisted, planFromSidebar, readmeOrder } from '../../scripts/import/sidebar';

const CONFIG = `import { defineConfig } from "vitepress";

export default defineConfig({
  title: "t",
  themeConfig: {
    footer: { copyright: \`Copyright \${new Date().getFullYear()}\` },
    sidebar: [
      { text: "Alpha", collapsed: true, items: [
        { text: "Queue", link: "/alpha/queue-lead.md", collapsed: true, items: [
          { text: "Why", link: "/alpha/why.md" },
          { text: "What's", link: "/alpha/what's-this.md" },
        ]},
        { text: "Single", link: "/alpha/single.md" },
        { text: "Repo", link: "https://github.com/doocs/advanced-java" },
      ]},
    ],
  },
  vite: { build: { chunkSizeWarningLimit: 1000 } },
});
`;

function writeConfig() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'sb-'));
  const f = path.join(dir, 'config.mts');
  writeFileSync(f, CONFIG);
  return f;
}

describe('sidebar', () => {
  it('evaluates the VitePress config and plans sections, groups and leads', () => {
    const plan = planFromSidebar(loadSidebar(writeConfig()));
    expect(plan.sections.map((s) => s.id)).toEqual(['alpha']);
    const groups = plan.sections[0].groups;
    expect(groups[0]).toMatchObject({ title: 'Queue', lead: 'queue-lead', docs: ['queue-lead', 'why', 'whats-this'] });
    expect(groups[1].docs).toEqual(['single']);
    expect(plan.docs['whats-this']).toMatchObject({
      section: 'alpha',
      navTitle: "What's",
      upstreamFile: "docs/alpha/what's-this.md",
    });
    expect(plan.external).toEqual(['https://github.com/doocs/advanced-java']);
  });

  it('parses the root README order', () => {
    const md = '# t\n\n## A\n\n-   [Why](/docs/alpha/why.md)\n-   [Unlisted](/docs/alpha/unlisted.md)\n-   [Single](/docs/alpha/single.md)\n';
    expect(readmeOrder(md)).toEqual([
      { file: 'docs/alpha/why.md', title: 'Why' },
      { file: 'docs/alpha/unlisted.md', title: 'Unlisted' },
      { file: 'docs/alpha/single.md', title: 'Single' },
    ]);
  });

  it('places an unlisted doc right after its README predecessor', () => {
    const plan = planFromSidebar(loadSidebar(writeConfig()));
    const readme = readmeOrder('-   [Why](/docs/alpha/why.md)\n-   [Unlisted](/docs/alpha/unlisted.md)\n');
    const placed = placeUnlisted(plan, readme, ['docs/alpha/unlisted.md']);
    expect(placed.sections[0].groups[0].docs).toEqual(['queue-lead', 'why', 'unlisted', 'whats-this']);
    expect(placed.docs.unlisted.navTitle).toBe('Unlisted');
  });

  it('throws when an unlisted doc is not in the README', () => {
    const plan = planFromSidebar(loadSidebar(writeConfig()));
    expect(() => placeUnlisted(plan, [], ['docs/alpha/ghost.md'])).toThrow(/ghost\.md/);
  });
});

describe.skipIf(!existsSync('ref/docs/.vitepress/config.mts'))('real upstream sidebar', () => {
  it('plans 5 sections and 78 docs with no external sidebar links', () => {
    const plan = planFromSidebar(loadSidebar('ref/docs/.vitepress/config.mts'));
    expect(plan.sections.map((s) => s.id)).toEqual([
      'high-concurrency',
      'distributed-system',
      'high-availability',
      'micro-services',
      'big-data',
    ]);
    expect(Object.keys(plan.docs)).toHaveLength(78);
    expect(plan.external).toHaveLength(0);
    expect(plan.docs['whats-microservice-how-to-communicate'].upstreamFile).toBe(
      "docs/micro-services/what's-microservice-how-to-communicate.md",
    );
  });
});
