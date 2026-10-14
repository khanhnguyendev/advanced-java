import { expect, test } from '@playwright/test';

const PATH = 'advanced-java/micro-services/microservices-introduction';
const HREF = 'https://martinfowler.com/articles/microservices.html';

test('en: held doc shows the source credit, the fallback notice and a canonical to zh', async ({ page }) => {
  await page.goto(`/en/${PATH}`);
  await expect(page.getByRole('note').first()).toContainText(/is not translated into English yet/);
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'zh-Hans');
  const credit = page.locator('.source-credit');
  await expect(credit).toHaveAttribute('lang', 'en');
  await expect(credit).toContainText('Original source: “Microservices” by Martin Fowler and James Lewis');
  await expect(credit.getByRole('link')).toHaveAttribute('href', HREF);
  await expect(credit.locator('cite')).toHaveAttribute('lang', 'en');
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toContain(`/zh/${PATH}`);
});

test('vi: credit is in Vietnamese with the title tagged en', async ({ page }) => {
  await page.goto(`/vi/${PATH}`);
  const credit = page.locator('.source-credit');
  await expect(credit).toHaveAttribute('lang', 'vi');
  await expect(credit).toContainText('Nguồn gốc');
  await expect(credit.getByRole('link')).toHaveAttribute('href', HREF);
  await expect(credit.locator('cite')).toHaveAttribute('lang', 'en');
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'zh-Hans');
});

test('zh: credit is in Chinese', async ({ page }) => {
  await page.goto(`/zh/${PATH}`);
  const credit = page.locator('.source-credit');
  await expect(credit).toHaveAttribute('lang', 'zh-Hans');
  await expect(credit).toContainText('原文出处');
  await expect(credit.getByRole('link')).toHaveAttribute('href', HREF);
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'zh-Hans');
});

test('an uncredited doc has no source credit', async ({ page }) => {
  await page.goto('/en/advanced-java/distributed-system/distributed-system-cap');
  await expect(page.locator('.source-credit')).toHaveCount(0);
});
