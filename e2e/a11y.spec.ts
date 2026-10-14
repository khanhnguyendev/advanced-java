import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PILOT, sectionOf } from './helpers';

for (const [name, url] of [
  ['shelf', '/en'],
  ['collection', '/en/advanced-java'],
  ['section', `/en/advanced-java/${sectionOf(PILOT)}`],
  ['doc', `/en/advanced-java/${sectionOf(PILOT)}/${PILOT}`],
  ['about', '/en/about'],
] as const) {
  test(`axe: ${name} has no serious or critical violations`, async ({ page }) => {
    await page.goto(url);
    const r = await new AxeBuilder({ page }).analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}

test('axe: search overlay with results has no serious or critical violations', async ({ page }) => {
  await page.goto('/en/advanced-java');
  await page.getByRole('searchbox').fill('queue');
  await page.locator('.search-results').first().waitFor();
  await expect(page.locator('.search-results a').first()).toBeVisible();
  const r = await new AxeBuilder({ page }).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test.describe('mobile 390x844 dialogs', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  const serious = async (page: import('@playwright/test').Page) => {
    const r = await new AxeBuilder({ page }).analyze();
    return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.help}`);
  };

  test('axe: /en and its language dialog', async ({ page }) => {
    await page.goto('/en');
    expect(await serious(page)).toEqual([]);
    await page.getByRole('button', { name: /EN, Language/ }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(1);
    expect(await serious(page)).toEqual([]);
  });

  for (const [name, button] of [
    ['drawer', 'Menu'],
    ['sheet', 'Contents'],
    ['language dialog', 'Language'],
  ] as const) {
    test(`axe: doc page with the ${name} open`, async ({ page }) => {
      await page.goto(`/en/advanced-java/${sectionOf(PILOT)}/${PILOT}`);
      await page.locator('.dock').getByRole('button', { name: button }).click();
      await expect(page.locator('dialog[open]')).toHaveCount(1);
      expect(await serious(page)).toEqual([]);
    });
  }
});
