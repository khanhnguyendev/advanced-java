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

describe('classifyLink fragments on section/home', () => {
  it('fails on a fragment after a section README or index link', () => {
    expect(classifyLink('./README.md#top', env)).toEqual({ fail: expect.stringContaining('README.md#top') });
    expect(classifyLink('../index.md#top', env)).toEqual({ fail: expect.stringContaining('index.md#top') });
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
  it('unwraps a link that wraps a rewritten image without corrupting output', () => {
    const { text } = rewriteLinkTargets('A [![i](./images/d.png)](./offer.md) B\n', (url, kind) =>
      kind === 'image' ? 'asset:x/y/d.png' : { unwrap: true },
    );
    expect(text).toBe('A ![i](asset:x/y/d.png) B\n');
  });
  it('rewrites several links on one line, including the same url twice', () => {
    const { text } = rewriteLinkTargets('[a](./x.md) and [b](./x.md) and [c](./y.md)\n', (url) =>
      url === './x.md' ? 'doc:c/a/x' : 'doc:c/a/y',
    );
    expect(text).toBe('[a](doc:c/a/x) and [b](doc:c/a/x) and [c](doc:c/a/y)\n');
  });
  it('rewrites links inside a table cell and a list item', () => {
    const md = '| h | i |\n| - | - |\n| [a](./x.md) | b |\n\n- item [c](./x.md)\n';
    const { text, unlocatable } = rewriteLinkTargets(md, () => 'doc:c/a/x');
    expect(text).toBe('| h | i |\n| - | - |\n| [a](doc:c/a/x) | b |\n\n- item [c](doc:c/a/x)\n');
    expect(unlocatable).toEqual([]);
  });
  it('reports a destination containing an entity as unlocatable', () => {
    const { text, unlocatable } = rewriteLinkTargets('[a](./a&amp;b.md)\n', () => 'doc:c/a/x');
    expect(unlocatable).toEqual(['./a&b.md']);
    expect(text).toBe('[a](./a&amp;b.md)\n');
  });
  it('leaves a percent-encoded external url untouched', () => {
    const md = '[a](https://example.com/a%20b.md)\n';
    const { text, unlocatable } = rewriteLinkTargets(md, (url) => (url.startsWith('http') ? null : 'doc:c/a/x'));
    expect(text).toBe(md);
    expect(unlocatable).toEqual([]);
  });
  it('reports an unwrapped image or reference definition as unlocatable', () => {
    const img = rewriteLinkTargets('![i](./offer.md)\n', () => ({ unwrap: true }));
    expect(img.unlocatable).toEqual(['./offer.md']);
    expect(img.text).toBe('![i](./offer.md)\n');
    const def = rewriteLinkTargets('[r]: ./offer.md\n\n[x][r]\n', (url) => (url === './offer.md' ? { unwrap: true } : null));
    expect(def.unlocatable).toContain('./offer.md');
  });
  it('rewrites a reference-style definition destination', () => {
    const { text } = rewriteLinkTargets('[x][r]\n\n[r]: ./x.md "t"\n', () => 'doc:c/a/x');
    expect(text).toBe('[x][r]\n\n[r]: doc:c/a/x "t"\n');
  });
  it('does not mistake a url repeated inside the title for the destination', () => {
    const md = '[a](./x.md "](./x.md")\n';
    const { text, unlocatable } = rewriteLinkTargets(md, () => 'doc:c/a/x');
    expect(unlocatable).toEqual([]);
    expect(text).toBe('[a](doc:c/a/x "](./x.md")\n');
  });
  it('reports a destination whose decoded form differs from the raw source as unlocatable', () => {
    const r = rewriteLinkTargets('[a](./a\\_b.md)\n', () => 'doc:c/a/x');
    expect(r.unlocatable).toEqual(['./a_b.md']);
  });
});
