import { expect, test } from '@playwright/test';

test.skip(process.env.DIAGRAM_REVIEW !== '1', 'set DIAGRAM_REVIEW=1 (build-time) to run');

const URL = '/en/review/diagrams';

for (const width of [1280, 360]) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`diagram review at ${width}px ${scheme}: no overflow, node text inside node`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(URL);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);

      const m = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth,
      }));
      expect(m.sw, `scrollWidth ${m.sw} vs innerWidth ${m.iw}`).toBeLessThanOrEqual(m.iw);

      const bad = await page.evaluate(() => {
        const out: string[] = [];
        const tol = 0.5;
        for (const g of Array.from(document.querySelectorAll('g[data-node]'))) {
          const shape = g.querySelector('rect, circle, ellipse');
          const text = g.querySelector('text');
          if (!shape || !text) continue;
          const r = shape.getBoundingClientRect();
          const t = text.getBoundingClientRect();
          if (t.left < r.left - tol || t.right > r.right + tol || t.top < r.top - tol || t.bottom > r.bottom + tol) {
            const svg = g.closest('svg');
            const id = svg?.closest('[data-diagram]')?.getAttribute('data-diagram') ?? '?';
            out.push(`${id}#${g.getAttribute('data-node')}`);
          }
        }
        return out;
      });
      expect(bad, `text outside node: ${bad.join(', ')}`).toEqual([]);
    });
  }
}
