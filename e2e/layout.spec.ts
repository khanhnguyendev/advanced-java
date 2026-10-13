import { expect, test } from '@playwright/test';
import { PILOT, sectionOf } from './helpers';

const C = '/en/advanced-java';
const pages: [string, string][] = [
  ['shelf', '/en'],
  ['collection', C],
  ['section', `${C}/${sectionOf(PILOT)}`],
  ['doc', `${C}/${sectionOf(PILOT)}/${PILOT}`],
  ['doc with table', `${C}/${sectionOf('distributed-system-cap')}/distributed-system-cap`],
  ['doc with code', `${C}/${sectionOf('hystrix-introduction')}/hystrix-introduction`],
  ['about', '/en/about'],
  ['vi doc', `/vi/advanced-java/${sectionOf(PILOT)}/${PILOT}`],
];

for (const width of [320, 375, 390, 768]) {
  for (const [name, url] of pages) {
    test(`${name} has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(url);
      const m = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth,
        bodyW: document.body.scrollWidth,
      }));
      expect(m.sw, `scrollWidth ${m.sw} vs innerWidth ${m.iw}`).toBeLessThanOrEqual(m.iw);
      expect(m.bodyW).toBeLessThanOrEqual(m.iw);
    });
  }
}
