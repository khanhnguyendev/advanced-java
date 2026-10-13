import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PILOT, ROOT, sectionOf } from './helpers';

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

test('section page title is the localized section title', async ({ page }) => {
  const meta = JSON.parse(readFileSync(path.join(ROOT, 'content/advanced-java/en/meta.json'), 'utf8'));
  await page.goto(`/en/advanced-java/${sectionOf(PILOT)}`);
  await expect(page).toHaveTitle(meta.sections[sectionOf(PILOT)]);
});
