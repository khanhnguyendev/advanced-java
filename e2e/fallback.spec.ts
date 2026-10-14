import { expect, test } from '@playwright/test';
import { firstUntranslated, firstZhOnly, hasLocale, PILOT, sectionOf } from './helpers';

// Translation-status UI (notices, markers, counts) was removed by the owner on 2026-10-14.

test('zh-only vi doc serves zh with zh lang and canonical to the real page', async ({ page }) => {
  const slug = firstZhOnly();
  test.skip(!slug, 'every doc has a vi or en translation');
  const section = sectionOf(slug!);
  await page.goto(`/vi/advanced-java/${section}/${slug}`);
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

test('a translated vi doc shows no translation-status text', async ({ page }) => {
  await page.goto(`/vi/advanced-java/${sectionOf(PILOT)}/${PILOT}`);
  await expect(page.getByText(/Bản dịch máy|Dịch máy|chưa được dịch|chưa dịch/)).toHaveCount(0);
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'vi');
});

test('zh-fallback doc under /vi shows no translation-status text and keeps the attribution', async ({ page }) => {
  const slug = firstZhOnly();
  test.skip(!slug, 'every doc has a vi or en translation');
  await page.goto(`/vi/advanced-java/${sectionOf(slug!)}/${slug}`);
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'zh-Hans');
  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const s of ['machine translated', 'not translated', 'bản dịch máy', 'dịch máy', 'chưa được dịch', 'chưa dịch', 'view original', 'xem bản gốc'])
    expect(body, s).not.toContain(s);
  await expect(page.getByRole('note')).toHaveCount(0);
  await expect(page.locator('.lang-marker, .lang-status, [data-status]')).toHaveCount(0);
  await expect(page.locator('.attribution').first()).toBeVisible();
});
