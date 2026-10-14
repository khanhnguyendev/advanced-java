import { expect, test } from '@playwright/test';

const URL = '/en/advanced-java/micro-services/microservices-introduction';

test('held doc shows the source credit, the fallback notice and a canonical to zh', async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole('note').first()).toBeVisible();
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'zh-Hans');
  const credit = page.locator('.source-credit');
  await expect(credit).toContainText('Original source: “Microservices” by Martin Fowler and James Lewis');
  await expect(credit.getByRole('link')).toHaveAttribute('href', 'https://martinfowler.com/articles/microservices.html');
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toContain('/zh/advanced-java/micro-services/microservices-introduction');
});

test('an uncredited doc has no source credit', async ({ page }) => {
  await page.goto('/en/advanced-java/distributed-system/distributed-system-cap');
  await expect(page.locator('.source-credit')).toHaveCount(0);
});
