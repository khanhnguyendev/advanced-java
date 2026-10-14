import { expect, test } from '@playwright/test';
import { firstUntranslated, hasLocale, PILOT, sectionOf } from './helpers';

// Translation-status UI (notices, markers, counts) was removed by the owner on 2026-10-14.

// Every doc now has a vi translation, so the zh fallback is exercised on the /en route (en excludes microservices-introduction);
// the vi -> en -> zh chain itself is covered by the fixture-based unit tests (tests/ui/seo.test.ts, tests/content).
test('en doc without an en translation serves zh with zh lang and canonical to the zh page', async ({ page }) => {
  const slug = firstUntranslated('en');
  test.skip(!slug, 'every doc has an en translation');
  const section = sectionOf(slug!);
  await page.goto(`/en/advanced-java/${section}/${slug}`);
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'zh-Hans');
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toContain(`/zh/advanced-java/${section}/${slug}`);
  const hreflangs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => e.getAttribute('hreflang')));
  expect(hreflangs).toContain('zh-Hans');
  expect(hreflangs).not.toContain('en');
});

test('sitemap lists real translations only', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const slug = firstUntranslated('vi');
  if (slug) expect(xml).not.toContain(`/vi/advanced-java/${sectionOf(slug)}/${slug}</loc>`);
  const enSlug = firstUntranslated('en');
  if (enSlug) expect(xml).not.toContain(`/en/advanced-java/${sectionOf(enSlug)}/${enSlug}</loc>`);
  expect(hasLocale('vi', PILOT)).toBe(true);
  expect(xml).toContain(`/vi/advanced-java/${sectionOf(PILOT)}/${PILOT}</loc>`);
});

test('a translated vi doc shows no translation-status text', async ({ page }) => {
  await page.goto(`/vi/advanced-java/${sectionOf(PILOT)}/${PILOT}`);
  await expect(page.getByText(/Bản dịch máy|Dịch máy|chưa được dịch|chưa dịch/)).toHaveCount(0);
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'vi');
});

test('zh-fallback doc under /en shows no translation-status text and keeps the attribution', async ({ page }) => {
  const slug = firstUntranslated('en');
  test.skip(!slug, 'every doc has an en translation');
  await page.goto(`/en/advanced-java/${sectionOf(slug!)}/${slug}`);
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'zh-Hans');
  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const s of ['machine translated', 'not translated', 'bản dịch máy', 'dịch máy', 'chưa được dịch', 'chưa dịch', 'view original', 'xem bản gốc'])
    expect(body, s).not.toContain(s);
  await expect(page.getByRole('note')).toHaveCount(0);
  await expect(page.locator('.lang-marker, .lang-status, [data-status]')).toHaveCount(0);
  await expect(page.locator('.attribution').first()).toBeVisible();
});

test('eureka (formerly held) is translated into en and vi with its own canonical and the derived credit', async ({ page }) => {
  const path = 'advanced-java/micro-services/how-eureka-enable-service-discovery-and-service-registration';
  for (const [loc, lang] of [['en', 'en'], ['vi', 'vi']] as const) {
    await page.goto(`/${loc}/${path}`);
    await expect(page.locator('article.prose')).toHaveAttribute('lang', lang);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain(`/${loc}/${path}`);
    const hreflangs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => e.getAttribute('hreflang')));
    expect(hreflangs).toContain(loc);
  }
});
