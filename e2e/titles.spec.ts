import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PILOT, ROOT, sectionOf } from './helpers';

test('section page title is the localized section title', async ({ page }) => {
  const meta = JSON.parse(readFileSync(path.join(ROOT, 'content/advanced-java/en/meta.json'), 'utf8'));
  await page.goto(`/en/advanced-java/${sectionOf(PILOT)}`);
  await expect(page).toHaveTitle(meta.sections[sectionOf(PILOT)]);
});
