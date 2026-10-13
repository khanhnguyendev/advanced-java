import { expect, test } from '@playwright/test';
import { cjkFontUrls, firstUntranslated, PILOT, sectionOf } from './helpers';

test('vi page with a real translation downloads zero CJK font bytes', async ({ page }) => {
  const cjk = new Set(cjkFontUrls());
  expect(cjk.size).toBeGreaterThan(0);
  const requested: string[] = [];
  page.on('request', (r) => {
    const name = r.url().split('/').pop() ?? '';
    if (cjk.has(name)) requested.push(name);
  });
  await page.goto(`/vi/advanced-java/${sectionOf(PILOT)}/${PILOT}`, { waitUntil: 'networkidle' });
  expect(requested).toEqual([]);
  const loaded = await page.evaluate(
    () => [...document.fonts].filter((f) => /Noto.?Serif.?SC/i.test(f.family) && f.status === 'loaded').length,
  );
  expect(loaded).toBe(0);
});

test('fallback page rendering zh requests some, but not all, CJK slices', async ({ page }) => {
  const slug = firstUntranslated('vi');
  test.skip(!slug, 'every doc is translated to vi');
  const cjk = new Set(cjkFontUrls());
  const requested = new Set<string>();
  page.on('request', (r) => {
    const name = r.url().split('/').pop() ?? '';
    if (cjk.has(name)) requested.add(name);
  });
  await page.goto(`/vi/advanced-java/${sectionOf(slug!)}/${slug}`, { waitUntil: 'networkidle' });
  expect(requested.size).toBeGreaterThan(0);
  expect(requested.size).toBeLessThan(cjk.size);
});
