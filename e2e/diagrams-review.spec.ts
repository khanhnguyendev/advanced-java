import { expect, test } from '@playwright/test';

test.skip(process.env.DIAGRAM_REVIEW !== '1', 'set DIAGRAM_REVIEW=1 (build-time) to run');

const URL = '/en/review/diagrams';
const EXPECTED_DIAGRAMS = 5;
const LOCALES = 3;
const WIDTHS = 2;
// Total nodes across the 5 diagrams. If the diagram set changes, update this in the same commit.
const NODES_IN_DIAGRAMS = 50;
const EXPECTED_SVGS = EXPECTED_DIAGRAMS * LOCALES * WIDTHS;
const EXPECTED_NODE_GROUPS = NODES_IN_DIAGRAMS * LOCALES * WIDTHS;

for (const width of [1280, 360]) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`diagram review at ${width}px ${scheme}: no overflow, node text inside node`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      const res = await page.goto(URL);
      expect(res?.status(), `GET ${URL} returned ${res?.status()} (404 means the page was built without DIAGRAM_REVIEW=1)`).toBe(200);
      await expect(page.getByTestId('diagram-review')).toBeVisible();
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);

      const svgCount = await page.locator('[data-diagram] svg[role=img]').count();
      expect(svgCount, `found ${svgCount} diagram svgs`).toBe(EXPECTED_SVGS);
      const count = await page.locator('g[data-node]').count();
      expect(count, `found ${count} g[data-node] groups`).toBe(EXPECTED_NODE_GROUPS);
      const labelled = await page.locator('g[data-node][data-label]').count();
      expect(labelled, `found ${labelled} labelled node groups`).toBe(count);
      await expect(page.getByText(/No rendering for/)).toHaveCount(0);
      const statuses = await page.getByTestId('gate-status').allTextContents();
      expect(statuses.length, 'one gate-status per diagram').toBe(EXPECTED_DIAGRAMS);
      for (const st of statuses) expect(st).toContain('0 errors');

      const m = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth,
      }));
      expect(m.sw, `scrollWidth ${m.sw} vs innerWidth ${m.iw}`).toBeLessThanOrEqual(m.iw);

      const bad = await page.evaluate(() => {
        const out: string[] = [];
        const tol = 0.5;
        for (const g of Array.from(document.querySelectorAll('g[data-node]'))) {
          const svg = g.closest('svg');
          const diagram = svg?.closest('[data-diagram]')?.getAttribute('data-diagram') ?? '?';
          const name = `${diagram}#${g.getAttribute('data-node')}`;
          const shape = g.querySelector('rect, circle, ellipse');
          const texts = Array.from(g.querySelectorAll('text'));
          // the renderer emits data-label only when the resolved text is non-blank
          const hasLabel = g.hasAttribute('data-label');
          if (!shape) {
            out.push(`${name} (no shape)`);
            continue;
          }
          if (texts.length === 0 || texts.every((t) => (t.textContent ?? '').trim() === '')) {
            if (hasLabel) out.push(`${name} (no text)`);
            continue;
          }
          const r = shape.getBoundingClientRect();
          for (const text of texts) {
            const t = text.getBoundingClientRect();
            if (t.left < r.left - tol || t.right > r.right + tol || t.top < r.top - tol || t.bottom > r.bottom + tol) {
              out.push(name);
              break;
            }
          }
        }
        return out;
      });
      expect(bad, `text outside node or missing: ${bad.join(', ')}`).toEqual([]);
    });
  }
}
