import { expect, test, type Page } from '@playwright/test';
import { PILOT, sectionOf } from './helpers';

const url = (l: string) => `/${l}/advanced-java/${sectionOf(PILOT)}/${PILOT}`;

async function expectClearOfBar(page: Page, selector: string) {
  await expect
    .poll(
      () =>
        page.evaluate((sel) => {
          const top = document.querySelector(sel)!.getBoundingClientRect().top;
          const barBottom = document.querySelector('.topbar-slot')!.getBoundingClientRect().bottom;
          const vh = innerHeight;
          return { top, barBottom, vh, ok: top >= barBottom - 1 && top < vh };
        }, selector),
      { message: `${selector} below the sticky bar and inside the viewport` },
    )
    .toMatchObject({ ok: true });
}

for (const width of [1280, 375]) {
  test(`top bar height at ${width}px is measured and headings land below it`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(url('en') + '#h3-this-slug-is-long-gone');
    const h = await page.locator('.topbar-slot').evaluate((e) => (e as HTMLElement).offsetHeight);
    info.annotations.push({ type: 'topbar-height', description: `${width}px: ${h}px` });
    await expect.poll(async () => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await expectClearOfBar(page, '[data-hi="3"]');
  });
}

test('a stale slug in the hash still lands on the right heading', async ({ page }) => {
  await page.goto(url('en') + '#h3-this-slug-is-long-gone');
  const id = await page.locator('[data-hi="3"]').first().getAttribute('id');
  await expect.poll(async () => page.evaluate(() => location.hash)).toBe('#' + id);
  await expectClearOfBar(page, '[data-hi="3"]');
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
  await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#h3-/);
  await expect(page.locator('article.prose')).toHaveAttribute('lang', 'vi');
  await expectClearOfBar(page, '[data-hi="3"]');
});
