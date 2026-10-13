import { describe, expect, it } from 'vitest';
import { classifyLink, rewriteLinkTargets, type LinkEnv } from '../../scripts/import/links';

const env: LinkEnv = {
  collection: 'c',
  sourceFile: 'docs/alpha/why.md',
  slugByUpstream: new Map([
    ['docs/alpha/why.md', { section: 'alpha', slug: 'why' }],
    ['docs/alpha/what\'s-this.md', { section: 'alpha', slug: 'whats-this' }],
    ['docs/beta/other.md', { section: 'beta', slug: 'other' }],
  ]),
  sectionReadmes: new Map([['docs/alpha/README.md', 'alpha']]),
  promos: new Set(['docs/extra-page/offer.md']),
  assetFor: (src, rel) => (rel === './images/d.png' ? 'asset:alpha/why/d.png' : undefined),
};

describe('classifyLink', () => {
  it('leaves external, mailto and already-neutral urls alone', () => {
    expect(classifyLink('https://example.com/a.md', env)).toBeNull();
    expect(classifyLink('mailto:a@b.c', env)).toBeNull();
    expect(classifyLink('doc:c/alpha/why', env)).toBeNull();
  });
  it('rewrites a relative doc link', () => {
    expect(classifyLink("./what's-this.md", env)).toBe('doc:c/alpha/whats-this');
  });
  it('rewrites an absolute /docs/ link and a cross-section relative link', () => {
    expect(classifyLink('/docs/beta/other.md', env)).toBe('doc:c/beta/other');
    expect(classifyLink('../beta/other.md', env)).toBe('doc:c/beta/other');
  });
  it('rewrites a section README link to section:', () => {
    expect(classifyLink('./README.md', env)).toBe('section:c/alpha');
  });
  it('rewrites index.md to home:', () => {
    expect(classifyLink('../index.md', env)).toBe('home:');
  });
  it('unwraps a promo link', () => {
    expect(classifyLink('../extra-page/offer.md', env)).toEqual({ unwrap: true });
  });
  it('rewrites an image to asset:', () => {
    expect(classifyLink('./images/d.png', env)).toBe('asset:alpha/why/d.png');
  });
  it('fails on an unresolved internal doc link', () => {
    expect(classifyLink('./missing.md', env)).toEqual({ fail: expect.stringContaining('missing.md') });
  });
  it('fails on an image with no source file', () => {
    expect(classifyLink('./images/nope.png', env)).toEqual({ fail: expect.stringContaining('nope.png') });
  });
  it('keeps a fragment on a doc link', () => {
    expect(classifyLink('./why.md#h2', env)).toBe('doc:c/alpha/why#h2');
  });
});

describe('rewriteLinkTargets', () => {
  it('rewrites link and image destinations in place without reformatting the rest', () => {
    const md = 'Intro  text  with   spacing.\n\nSee [a](./x.md) and ![i](./images/d.png "t").\n';
    const { text, unlocatable } = rewriteLinkTargets(md, (url, kind) =>
      kind === 'image' ? 'asset:alpha/why/d.png' : url === './x.md' ? 'doc:c/alpha/x' : null,
    );
    expect(text).toBe('Intro  text  with   spacing.\n\nSee [a](doc:c/alpha/x) and ![i](asset:alpha/why/d.png "t").\n');
    expect(unlocatable).toEqual([]);
  });
  it('unwraps a link to its label', () => {
    const { text } = rewriteLinkTargets('A [the **promo**](./offer.md) here.\n', () => ({ unwrap: true }));
    expect(text).toBe('A the **promo** here.\n');
  });
  it('does not touch fenced code', () => {
    const md = '```md\n[a](./x.md)\n```\n';
    const { text } = rewriteLinkTargets(md, () => 'doc:c/a/x');
    expect(text).toBe(md);
  });
  it('reports a rewritable link whose destination cannot be located in the source', () => {
    const md = '[a](<./sp ace.md>)\n';
    const { unlocatable } = rewriteLinkTargets(md, () => 'doc:c/a/x');
    expect(unlocatable).toEqual(['./sp ace.md']);
  });
});
