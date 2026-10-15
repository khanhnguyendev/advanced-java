import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { replacedRasterProblems, checkStaticBuild, strictManifestProblems, type StaticCheckInput } from '../../scripts/assert-static-build';

const good: StaticCheckInput = {
  prerenderedRoutes: {
    '/en/c/a/x': { initialRevalidateSeconds: false },
    '/vi/c/a/x': { initialRevalidateSeconds: false },
  },
  prerenderedPatterns: {
    '/[locale]/[collection]/[section]/[slug]': { fallback: false },
  },
  appPatterns: ['/[locale]/[collection]/[section]/[slug]', '/[locale]/[...rest]'],
  expectedDocRoutes: ['/en/c/a/x', '/vi/c/a/x'],
  allowDynamic: ['/[locale]/[...rest]'],
};

describe('checkStaticBuild', () => {
  it('passes when every doc route is prerendered and only the catch-all is dynamic', () => {
    expect(checkStaticBuild(good)).toEqual([]);
  });
  it('fails when an expected doc route is not prerendered', () => {
    const r = checkStaticBuild({ ...good, expectedDocRoutes: [...good.expectedDocRoutes, '/zh/c/a/x'] });
    expect(r.join('\n')).toMatch(/\/zh\/c\/a\/x/);
  });
  it('fails when a prerendered route has a revalidate value', () => {
    const r = checkStaticBuild({
      ...good,
      prerenderedRoutes: { ...good.prerenderedRoutes, '/en/c/a/x': { initialRevalidateSeconds: 60 } },
    });
    expect(r.join('\n')).toMatch(/revalidate/i);
  });
  it('fails when an app route under /[locale] is dynamic and not allow-listed', () => {
    const r = checkStaticBuild({ ...good, appPatterns: [...good.appPatterns, '/[locale]/[collection]/live'] });
    expect(r.join('\n')).toMatch(/\/\[locale\]\/\[collection\]\/live/);
  });
  it('fails when a prerendered pattern allows on-demand params', () => {
    const r = checkStaticBuild({
      ...good,
      prerenderedPatterns: { '/[locale]/[collection]/[section]/[slug]': { fallback: null } },
    });
    expect(r.join('\n')).toMatch(/dynamicParams|fallback/i);
  });
});

describe('strictManifestProblems', () => {
  const ok = { '/en/c/a/x': { initialRevalidateSeconds: false as const, initialStatus: 200 } };
  it('passes a clean manifest', () => {
    expect(strictManifestProblems(['/en/c/a/x'], ok)).toEqual([]);
  });
  it('fails when no doc routes are expected', () => {
    expect(strictManifestProblems([], ok).join('\n')).toMatch(/content root empty/);
  });
  it('fails when initialRevalidateSeconds is missing', () => {
    expect(strictManifestProblems(['/en/c/a/x'], { '/en/c/a/x': {} }).join('\n')).toMatch(/initialRevalidateSeconds/);
  });
  it('fails when an expected route has a non-200 initialStatus', () => {
    const r = strictManifestProblems(['/en/c/a/x'], {
      '/en/c/a/x': { initialRevalidateSeconds: false, initialStatus: 404 },
    });
    expect(r.join('\n')).toMatch(/404/);
  });
  it('accepts an absent initialStatus', () => {
    expect(strictManifestProblems(['/en/c/a/x'], { '/en/c/a/x': { initialRevalidateSeconds: false } })).toEqual([]);
  });
});

describe('replacedRasterProblems', () => {
  it('flags an img pointing at a replaced raster and ignores others', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'sb-'));
    mkdirSync(path.join(root, 'en'), { recursive: true });
    writeFileSync(path.join(root, 'en/bad.html'), '<p><img src="/_content/c/a/b/d.png" alt=""></p>');
    writeFileSync(path.join(root, 'en/ok.html'), '<img src="/_content/c/a/b/e.png"><a href="/_content/c/a/b/d.png">x</a>');
    const out = replacedRasterProblems(root, { c: ['a/b/d.png'] });
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('bad.html');
    expect(replacedRasterProblems(path.join(root, 'missing'), { c: ['a/b/d.png'] })).toEqual([]);
  });
});

describe('diagramAssetProblems', () => {
  it('flags a missing or non-static route and unprerendered references', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const path = await import('node:path');
    const { diagramAssetProblems } = await import('../../scripts/assert-static-build');
    const dir = mkdtempSync(path.join(tmpdir(), 'dg-'));
    mkdirSync(path.join(dir, 'en'));
    writeFileSync(path.join(dir, 'en', 'a.html'), '<div data-diagram-src="/diagram-svg/ok.svg"></div><div data-diagram-src="/diagram-svg/gone.svg"></div>');
    const routes = { '/diagram-svg/ok.svg': {} };
    expect(diagramAssetProblems(dir, routes, { '/diagram-svg/[file]': { fallback: false } })).toEqual([
      'built html references /diagram-svg/gone.svg but it is not prerendered',
    ]);
    expect(diagramAssetProblems(dir, routes, {})[0]).toContain('not statically generated');
    expect(diagramAssetProblems(dir, routes, { '/diagram-svg/[file]': { fallback: null } })[0]).toContain('fallback=null');
  });
});
