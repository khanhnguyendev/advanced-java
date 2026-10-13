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
