import { describe, expect, it } from 'vitest';
import { checkStaticBuild, type StaticCheckInput } from '../../scripts/assert-static-build';

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
