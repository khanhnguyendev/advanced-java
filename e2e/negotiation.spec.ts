import { expect, test } from '@playwright/test';
import { PILOT, sectionOf } from './helpers';

const path = `/advanced-java/${sectionOf(PILOT)}/${PILOT}`;

test('Accept-Language: vi redirects an unprefixed path to /vi (307)', async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: 'http://localhost:4010', extraHTTPHeaders: { 'accept-language': 'vi' } });
  const r = await ctx.get(path, { maxRedirects: 0 });
  expect(r.status()).toBe(307);
  expect(r.headers()['location']).toContain(`/vi${path}`);
});

test('neither cookie nor header: redirects to /en', async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: 'http://localhost:4010' });
  const r = await ctx.get(path, { maxRedirects: 0 });
  expect(r.status()).toBe(307);
  expect(r.headers()['location']).toContain(`/en${path}`);
});

test('cookie written by the language switcher wins over Accept-Language', async ({ page }) => {
  await page.goto(`/en${path}`);
  await page.getByRole('link', { name: /Tiếng Việt/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`/vi${path}`));
  const r = await page.context().request.get(path, { maxRedirects: 0, headers: { 'accept-language': 'en' } });
  expect(r.status()).toBe(307);
  expect(r.headers()['location']).toContain(`/vi${path}`);
});

test('unknown unprefixed path redirects then 404s with the localized page', async ({ page }) => {
  await page.goto('/foo/bar');
  await expect(page).toHaveURL(/\/en\/foo\/bar/);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('unknown path under a locale shows the localized 404 via the catch-all', async ({ page }) => {
  await page.goto('/vi/foo/bar');
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
});
