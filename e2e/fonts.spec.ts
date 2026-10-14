import { expect, test } from '@playwright/test';
import { cjkFontUrls, cjkFontUrlsByWeight, firstUntranslated, PILOT, sectionOf } from './helpers';

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

// No doc is zh-only under /vi any more; the zh-served page is the /en fallback of a doc excluded from en.
test('zh-served page requests some, but not all, CJK slices per weight', async ({ page }) => {
  const slug = firstUntranslated('en');
  test.skip(!slug, 'every doc has an en translation');
  const byWeight = cjkFontUrlsByWeight();
  expect(byWeight.size).toBeGreaterThan(0);
  const cjk = new Set(cjkFontUrls());
  const requested = new Set<string>();
  page.on('request', (r) => {
    const name = r.url().split('/').pop() ?? '';
    if (cjk.has(name)) requested.add(name);
  });
  await page.goto(`/en/advanced-java/${sectionOf(slug!)}/${slug}`, { waitUntil: 'networkidle' });
  expect(requested.size).toBeGreaterThan(0);
  for (const [weight, files] of byWeight) {
    const got = new Set(files.filter((f) => requested.has(f))).size;
    expect(got, `weight ${weight}`).toBeLessThan(new Set(files).size);
  }
});
