import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const PATH = 'advanced-java/micro-services/microservices-introduction';
const HREF = 'https://martinfowler.com/articles/microservices.html';

test('en: microservices-introduction is not shipped in English; /en falls back to the zh source with a zh canonical', async ({ page }) => {
  await page.goto(`/en/${PATH}`);
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'zh-Hans');
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toContain(`/zh/${PATH}`);
  const hreflangs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => e.getAttribute('hreflang')));
  expect(hreflangs).not.toContain('en');
  const credit = page.locator('.source-credit');
  await expect(credit).toHaveAttribute('lang', 'en');
  await expect(credit).toContainText('Original source: “Microservices” by Martin Fowler and James Lewis');
  await expect(credit).toContainText('This text is a Chinese translation');
  await expect(credit).not.toContainText('machine translation');
  await expect(credit.getByRole('link')).toHaveAttribute('href', HREF);
  await expect(credit.locator('cite')).toHaveAttribute('lang', 'en');
});

test('en: a translated credited doc says machine translation of a Chinese translation', async ({ page }) => {
  await page.goto('/en/advanced-java/micro-services/advantages-and-disadvantages-of-microservice');
  const credit = page.locator('.source-credit');
  await expect(credit).toContainText('machine translation of a Chinese translation');
  await expect(credit.getByRole('link')).toHaveAttribute('href', 'https://www.f5.com/company/blog/nginx/introduction-to-microservices');
});

test('vi: credit is in Vietnamese with the title tagged en', async ({ page }) => {
  await page.goto(`/vi/${PATH}`);
  const credit = page.locator('.source-credit');
  await expect(credit).toHaveAttribute('lang', 'vi');
  await expect(credit).toContainText('Nguồn gốc');
  await expect(credit).toContainText('bản dịch máy');
  await expect(credit.getByRole('link')).toHaveAttribute('href', HREF);
  await expect(credit.locator('cite')).toHaveAttribute('lang', 'en');
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'vi');
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

const EUREKA = 'advanced-java/micro-services/how-eureka-enable-service-discovery-and-service-registration';
const F5 = 'https://www.f5.com/company/blog/nginx/service-discovery-in-a-microservices-architecture';

test('en: eureka shows the derived credit in the translated wording, with the F5 link and no whole-page authorship claim', async ({ page }) => {
  await page.goto(`/en/${EUREKA}`);
  const credit = page.locator('.source-credit');
  await expect(credit).toHaveAttribute('lang', 'en');
  await expect(credit).toContainText('machine translation of a Chinese article of unknown authorship');
  await expect(credit).toContainText('Its introduction draws on “Service Discovery in a Microservices Architecture” by Chris Richardson');
  await expect(credit).toContainText('the rest is not part of that work');
  await expect(credit).not.toContainText('translation of that work');
  await expect(page.locator('.attribution')).toContainText('Chinese article published upstream by Doocs contributors under CC-BY-SA-4.0');
  await expect(page.locator('.attribution')).not.toContainText('Chinese translation published upstream');
  await expect(credit).not.toContainText('Original source');
  await expect(credit.getByRole('link')).toHaveAttribute('href', F5);
  await expect(credit.locator('cite')).toHaveAttribute('lang', 'en');
});

test('vi: eureka shows the derived credit in Vietnamese with the F5 link', async ({ page }) => {
  await page.goto(`/vi/${EUREKA}`);
  const credit = page.locator('.source-credit');
  await expect(credit).toHaveAttribute('lang', 'vi');
  await expect(credit).toContainText('bản dịch máy của một bài viết tiếng Trung không rõ tác giả');
  await expect(credit).toContainText('Phần giới thiệu của bài dựa trên');
  await expect(page.locator('.attribution')).toContainText('Bài viết tiếng Trung do những người đóng góp của Doocs');
  await expect(page.locator('.attribution')).not.toContainText('Bản dịch tiếng Trung do');
  await expect(credit).not.toContainText('Nguồn gốc');
  await expect(credit.getByRole('link')).toHaveAttribute('href', F5);
});

test('zh: eureka shows the derived credit (unknown author, introduction only)', async ({ page }) => {
  await page.goto(`/zh/${EUREKA}`);
  const credit = page.locator('.source-credit');
  await expect(credit).toHaveAttribute('lang', 'zh-Hans');
  await expect(credit).toContainText('本文作者不详');
  await expect(credit).toContainText('引言部分');
  await expect(page.locator('.attribution')).toContainText('中文文章由 Doocs 贡献者在上游以 CC-BY-SA-4.0 许可发布');
  await expect(page.locator('.attribution')).not.toContainText('中文译文由');
  await expect(credit).not.toContainText('原文出处');
  await expect(credit.getByRole('link')).toHaveAttribute('href', F5);
});
