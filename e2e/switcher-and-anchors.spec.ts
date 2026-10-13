import { expect, test } from '@playwright/test';
import { PILOT, sectionOf } from './helpers';

const url = (l: string) => `/${l}/advanced-java/${sectionOf(PILOT)}/${PILOT}`;

test('a stale slug in the hash still lands on the right heading', async ({ page }) => {
  await page.goto(url('en') + '#h3-this-slug-is-long-gone');
  const id = await page.locator('[data-hi="3"]').first().getAttribute('id');
  await expect.poll(async () => page.evaluate(() => location.hash)).toBe('#' + id);
});

test('a hash beyond the heading count lands on the last heading', async ({ page }) => {
  await page.goto(url('en') + '#h9999');
  const last = await page.locator('[data-hi]').last().getAttribute('id');
  await expect.poll(async () => page.evaluate(() => location.hash)).toBe('#' + last);
});

test('switching language keeps the heading position', async ({ page }) => {
  await page.goto(url('en'));
  const target = page.locator('[data-hi="3"]').first();
  // Put heading 3 at the very top so it is unambiguously the current heading.
  await target.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, 5));
  await page.getByRole('link', { name: /Tiếng Việt/ }).first().click();
  await expect(page).toHaveURL(/\/vi\/.*#h3(-|$)/);
});
