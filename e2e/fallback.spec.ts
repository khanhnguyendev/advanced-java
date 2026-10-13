import { expect, test } from '@playwright/test';
import { firstUntranslated, firstZhOnly, hasLocale, PILOT, sectionOf } from './helpers';

// The stale-translation note ("source updated after this translation") is covered by unit tests
// (tests/ui/notices.test.ts, tests/ui/doc-header.test.tsx): an e2e case would need a mutated fixture.

test('zh-only vi doc serves zh with the notice, zh lang and canonical to the real page', async ({ page }) => {
  const slug = firstZhOnly();
  test.skip(!slug, 'every doc has a vi or en translation');
  const section = sectionOf(slug!);
  await page.goto(`/vi/advanced-java/${section}/${slug}`);
  await expect(page.getByRole('note').first()).toContainText('chưa được dịch');
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'zh-Hans');
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toContain(`/zh/advanced-java/${section}/${slug}`);
  const hreflangs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => e.getAttribute('hreflang')));
  expect(hreflangs).toContain('zh-Hans');
  expect(hreflangs).not.toContain('vi');
});

test('sitemap lists real translations only', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const slug = firstUntranslated('vi');
  if (slug) expect(xml).not.toContain(`/vi/advanced-java/${sectionOf(slug)}/${slug}</loc>`);
  expect(hasLocale('vi', PILOT)).toBe(true);
  expect(xml).toContain(`/vi/advanced-java/${sectionOf(PILOT)}/${PILOT}</loc>`);
});

test('a translated vi doc shows the machine note and no fallback notice', async ({ page }) => {
  await page.goto(`/vi/advanced-java/${sectionOf(PILOT)}/${PILOT}`);
  await expect(page.getByRole('note').first()).toContainText('Bản dịch máy');
  await expect(page.getByText('chưa được dịch')).toHaveCount(0);
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'vi');
});
