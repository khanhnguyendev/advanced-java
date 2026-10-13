import { expect, test } from '@playwright/test';

test('first Tab focuses the skip link and activating it moves focus into main', async ({ page }) => {
  await page.goto('/en');
  await page.keyboard.press('Tab');
  const skip = page.locator('a.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
  const inMain = await page.evaluate(() => {
    const main = document.getElementById('main-content');
    const a = document.activeElement;
    return !!main && (a === main || main.contains(a));
  });
  expect(inMain).toBe(true);
});
