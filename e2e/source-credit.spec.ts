import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const PATH = 'advanced-java/micro-services/microservices-introduction';
const HREF = 'https://martinfowler.com/articles/microservices.html';

test('en: held doc shows the source credit and a canonical to zh', async ({ page }) => {
  await page.goto(`/en/${PATH}`);
  await expect(page.getByText(/is not translated into English yet/)).toHaveCount(0);
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

test('zh: an adapted doc shows the adaptation credit with the Apache-2.0 license link', async ({ page }) => {
  await page.goto('/zh/advanced-java/high-availability/sentinel-vs-hystrix');
  const credit = page.locator('.source-credit');
  await expect(credit).toHaveAttribute('lang', 'zh-Hans');
  await expect(credit).toContainText('改编自');
  await expect(credit).toContainText('Apache-2.0');
  await expect(credit.getByRole('link', { name: 'Apache-2.0' })).toHaveAttribute('href', 'https://www.apache.org/licenses/LICENSE-2.0');
  await expect(credit.getByRole('link', { name: '阅读原文' })).toHaveAttribute('href', /github\.com\/alibaba\/Sentinel\/wiki/);
});

test('en: the translated variant says machine translation of an adaptation (once translated)', async ({ page }) => {
  const exists = existsSync(path.join('content', 'advanced-java', 'en', 'high-availability', 'sentinel-vs-hystrix.md'));
  test.skip(!exists, 'en translation of sentinel-vs-hystrix not present yet');
  await page.goto('/en/advanced-java/high-availability/sentinel-vs-hystrix');
  const credit = page.locator('.source-credit');
  await expect(credit).toContainText('machine translation of a Chinese adaptation');
  await expect(credit.getByRole('link', { name: 'Apache-2.0' })).toHaveAttribute('href', 'https://www.apache.org/licenses/LICENSE-2.0');
});
