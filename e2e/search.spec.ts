import { expect, test } from '@playwright/test';
import { PILOT, sectionOf } from './helpers';

test('zh query finds the expected doc', async ({ page }) => {
  await page.goto('/zh/advanced-java');
  await page.getByRole('searchbox').fill('为什么使用消息队列');
  await expect(page.locator(`.search-results a[href$="/${sectionOf(PILOT)}/${PILOT}"]`).first()).toBeVisible();
});

test('vi query without diacritics finds the translated pilot doc by title', async ({ page, request }) => {
  const title = (await (await request.get(`/vi/advanced-java/${sectionOf(PILOT)}/${PILOT}`)).text()).match(/<h1[^>]*>([^<]+)<\/h1>/)![1];
  const folded = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  expect(folded).not.toBe(title);
  await page.goto('/vi/advanced-java');
  await page.getByRole('searchbox').fill(folded);
  await expect(page.locator(`.search-results a[href$="/${PILOT}"]`).first()).toBeVisible();
});

test('en query finds the translated pilot doc by a word from its title', async ({ page, request }) => {
  const title = (await (await request.get(`/en/advanced-java/${sectionOf(PILOT)}/${PILOT}`)).text()).match(/<h1[^>]*>([^<]+)<\/h1>/)![1];
  const word = title.split(/\s+/).sort((a, b) => b.length - a.length)[0].replace(/[^\p{L}\p{N}]/gu, '');
  await page.goto('/en/advanced-java');
  await page.getByRole('searchbox').fill(word);
  await expect(page.locator(`.search-results a[href$="/${PILOT}"]`).first()).toBeVisible();
});

for (const path of ['/en', '/en/about']) {
  test(`search from ${path} (no collection) finds a doc by a word from its title`, async ({ page, request }) => {
    const title = (await (await request.get(`/en/advanced-java/${sectionOf(PILOT)}/${PILOT}`)).text()).match(/<h1[^>]*>([^<]+)<\/h1>/)![1];
    const word = title.split(/\s+/).sort((a, b) => b.length - a.length)[0].replace(/[^\p{L}\p{N}]/gu, '');
    await page.goto(path);
    await page.getByRole('searchbox').fill(word);
    await expect(page.locator(`.search-results a[href$="/${PILOT}"]`).first()).toBeVisible();
  });
}
