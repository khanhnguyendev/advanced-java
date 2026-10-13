import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runImport } from '../../scripts/import-upstream';

const FENCE = '```';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const CONFIG = `import { defineConfig } from "vitepress";
export default defineConfig({
  themeConfig: {
    sidebar: [
      { text: "Alpha", collapsed: true, items: [
        { text: "Queue", link: "/alpha/queue-lead.md", collapsed: true, items: [
          { text: "Why", link: "/alpha/why.md" },
          { text: "What's", link: "/alpha/what's-this.md" },
        ]},
        { text: "Single", link: "/alpha/single.md" },
      ]},
    ],
  },
});
`;

function write(root: string, rel: string, data: string | Buffer) {
  const f = path.join(root, rel);
  mkdirSync(path.dirname(f), { recursive: true });
  writeFileSync(f, data);
}

function makeUpstream(extra: Record<string, string> = {}) {
  const up = mkdtempSync(path.join(os.tmpdir(), 'up-'));
  write(up, 'docs/.vitepress/config.mts', CONFIG);
  write(up, 'README.md', '# t\n\n-   [Why](/docs/alpha/why.md)\n-   [Unlisted one](/docs/alpha/unlisted.md)\n-   [Single](/docs/alpha/single.md)\n');
  write(up, 'docs/index.md', '---\nlayout: home\n---\n');
  write(up, 'docs/alpha/README.md', '# Alpha\n\n- [Why](./why.md)\n');
  write(up, 'docs/alpha/queue-lead.md', [
    '# Queue lead', '', '## Part A', '',
    'See [why](./why.md), [readme](./README.md), [home](../index.md) and [promo](../extra-page/offer.md).', '',
    FENCE + 'text', 'x', FENCE, '',
  ].join('\n'));
  write(up, 'docs/alpha/why.md', [
    '# Why', '', '## Q', '',
    'Image ![d](./images/d.png)', '',
    "Go to [quirky](./what's-this.md) and [circuit](#circuit.breaker).", '',
    '## circuit.breaker', '', 'Text with <sub>x</sub> and a<br>b.', '',
  ].join('\n'));
  write(up, "docs/alpha/what's-this.md", '# Quirk\n\nBody.\n');
  write(up, 'docs/alpha/single.md', '# Single\n');
  write(up, 'docs/alpha/unlisted.md', '# Unlisted\n');
  write(up, 'docs/alpha/images/d.png', PNG);
  write(up, 'docs/extra-page/README.md', '# Extra\n');
  write(up, 'docs/extra-page/offer.md', '<p align="center">promo</p>\n');
  for (const [rel, data] of Object.entries(extra)) write(up, rel, data);
  return up;
}

const base = { collection: 'fixture', commit: 'a'.repeat(40), prefixes: { alpha: 'AL' } };

describe('runImport (fixture upstream)', () => {
  it('imports docs, rewrites links, copies assets and writes the collection', () => {
    const up = makeUpstream();
    const out = mkdtempSync(path.join(os.tmpdir(), 'out-'));
    const r = runImport({ upstreamRoot: up, outRoot: out, ...base });
    expect(r.docCount).toBe(5);

    const c = JSON.parse(readFileSync(path.join(out, 'fixture/collection.json'), 'utf8'));
    expect(c.sourceLocale).toBe('zh');
    expect(c.sections[0].groups[0]).toMatchObject({ lead: 'queue-lead', docs: ['queue-lead', 'why', 'unlisted', 'whats-this'] });
    expect(c.ids).toEqual({ 'queue-lead': 'AL-01', why: 'AL-02', unlisted: 'AL-03', 'whats-this': 'AL-04', single: 'AL-05' });
    expect(c.upstreamFiles['whats-this']).toBe("docs/alpha/what's-this.md");
    expect(c.upstream.commit).toBe('a'.repeat(40));

    const why = readFileSync(path.join(out, 'fixture/zh/alpha/why.md'), 'utf8');
    expect(why).toContain('![d](asset:alpha/why/d.png)');
    expect(why).toContain('(doc:fixture/alpha/whats-this)');
    expect(why).toContain('(#h2)');
    expect(why).toContain('<sub>x</sub>');

    const lead = readFileSync(path.join(out, 'fixture/zh/alpha/queue-lead.md'), 'utf8');
    expect(lead).toContain('(doc:fixture/alpha/why)');
    expect(lead).toContain('(section:fixture/alpha)');
    expect(lead).toContain('(home:)');
    expect(lead).toContain('and promo.');
    expect(lead).not.toContain('offer.md');

    expect(existsSync(path.join(out, 'fixture/_assets/alpha/why/d.png'))).toBe(true);
    expect(existsSync(path.join(out, 'fixture/zh/extra-page'))).toBe(false);

    const meta = JSON.parse(readFileSync(path.join(out, 'fixture/zh/meta.json'), 'utf8'));
    expect(meta.docs.why).toEqual({ title: 'Why', navTitle: 'Why' });
    expect(meta.docs['whats-this']).toEqual({ title: 'Quirk', navTitle: "What's" });
    expect(meta.groups['queue-lead']).toBe('Queue');
    expect(meta.sections.alpha).toBe('Alpha');

    const report = readFileSync(r.reportPath, 'utf8');
    expect(report).toContain("what's-this.md");
    expect(report).toContain('offer.md');
    expect(report).toContain('unlisted.md');
  });

  it('fails, writing nothing, on a disallowed raw HTML tag', () => {
    const up = makeUpstream({ 'docs/alpha/single.md': '# Single\n\n<div style="x">bad</div>\n' });
    const out = mkdtempSync(path.join(os.tmpdir(), 'out-'));
    expect(() => runImport({ upstreamRoot: up, outRoot: out, ...base })).toThrow(/single\.md.*div/s);
    expect(existsSync(path.join(out, 'fixture'))).toBe(false);
  });

  it('fails on an unresolved internal link', () => {
    const up = makeUpstream({ 'docs/alpha/single.md': '# Single\n\n[x](./missing.md)\n' });
    const out = mkdtempSync(path.join(os.tmpdir(), 'out-'));
    expect(() => runImport({ upstreamRoot: up, outRoot: out, ...base })).toThrow(/missing\.md/);
  });

  it('fails when an unlisted doc is not in the root README', () => {
    const up = makeUpstream({ 'docs/alpha/ghost.md': '# Ghost\n' });
    const out = mkdtempSync(path.join(os.tmpdir(), 'out-'));
    expect(() => runImport({ upstreamRoot: up, outRoot: out, ...base })).toThrow(/ghost\.md/);
  });

  it('fails when an in-page anchor matches no heading', () => {
    const up = makeUpstream({ 'docs/alpha/single.md': '# Single\n\n## Real\n\n[x](#nowhere)\n' });
    const out = mkdtempSync(path.join(os.tmpdir(), 'out-'));
    expect(() => runImport({ upstreamRoot: up, outRoot: out, ...base })).toThrow(/nowhere/);
  });

  it('refuses to re-run over an existing import unless forced', () => {
    const up = makeUpstream();
    const out = mkdtempSync(path.join(os.tmpdir(), 'out-'));
    runImport({ upstreamRoot: up, outRoot: out, ...base });
    const f = path.join(out, 'fixture/zh/alpha/why.md');
    writeFileSync(f, 'edited');
    expect(() => runImport({ upstreamRoot: up, outRoot: out, ...base })).toThrow(/already exists/);
    expect(readFileSync(f, 'utf8')).toBe('edited');
    expect(runImport({ upstreamRoot: up, outRoot: out, ...base, force: true }).docCount).toBe(5);
    expect(readFileSync(f, 'utf8')).not.toBe('edited');
  });

  it('reports placed unlisted docs and the promo section index separately', () => {
    const up = makeUpstream();
    const out = mkdtempSync(path.join(os.tmpdir(), 'out-'));
    const report = readFileSync(runImport({ upstreamRoot: up, outRoot: out, ...base }).reportPath, 'utf8');
    expect(report).toMatch(/## Unlisted docs placed via root README[^\n]*\n- docs\/alpha\/unlisted\.md \(placed after docs\/alpha\/why\.md\)/);
    expect(report).toContain('docs/extra-page/README.md: promo section index, not imported');
    expect(report).toContain('(1 image references)');
  });
});
