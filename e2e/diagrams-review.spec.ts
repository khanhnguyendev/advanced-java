import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test.skip(process.env.DIAGRAM_REVIEW !== '1', 'set DIAGRAM_REVIEW=1 (build-time) to run');

const URL = '/en/review/diagrams';
const LOCALES = 3;
const WIDTHS = 2;

function diagramFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) diagramFiles(p, out);
    else if (name.endsWith('.diagram.json')) out.push(p);
  }
  return out;
}

// Expected counts come from the scene files themselves, so adding a diagram needs no edit here.
const SCENES = diagramFiles(path.join(process.cwd(), 'content', 'advanced-java', '_diagrams')).map(
  (f) => JSON.parse(readFileSync(f, 'utf8')) as { nodes: unknown[] },
);
const EXPECTED_DIAGRAMS = SCENES.length;
const NODES_IN_DIAGRAMS = SCENES.reduce((n, s) => n + s.nodes.length, 0);
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
      const gloss = await page.getByTestId('glossary-status').allTextContents();
      expect(gloss.length, 'one glossary-status per diagram').toBe(EXPECTED_DIAGRAMS);
      for (const g of gloss) expect(g).toContain('Glossary: OK');

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

      // Matching: no text bbox touches another text, a foreign node, or any edge path (real fonts).
      const collisions = await page.evaluate(() => {
        type Box = { x0: number; y0: number; x1: number; y1: number };
        const out: string[] = [];
        const hit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
        const inside = (o: Box, i: Box) => o.x0 <= i.x0 && o.y0 <= i.y0 && o.x1 >= i.x1 && o.y1 >= i.y1;
        const box = (el: SVGGraphicsElement): Box => {
          const r = el.getBBox();
          return { x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height };
        };
        for (const svg of Array.from(document.querySelectorAll('[data-diagram] svg[role=img]'))) {
          const diagram = svg.closest('[data-diagram]')?.getAttribute('data-diagram') ?? '?';
          const loc = svg.closest('[data-locale]')?.getAttribute('data-locale') ?? '?';
          const width = svg.closest('[data-width]')?.getAttribute('data-width') ?? '?';
          const where = `${diagram} [${loc} ${width}px]`;
          const texts = Array.from(svg.querySelectorAll<SVGTextElement>('text[data-text-owner]'))
            .filter((t) => (t.textContent ?? '').trim() !== '')
            .map((el) => ({ owner: el.getAttribute('data-text-owner') ?? '?', label: (el.textContent ?? '').trim(), b: box(el) }));
          const nodes = Array.from(svg.querySelectorAll('g[data-node]')).flatMap((g) => {
            const shape = g.querySelector<SVGGraphicsElement>('rect, ellipse');
            if (!shape || shape.hasAttribute('data-group')) return [];
            return [{ id: g.getAttribute('data-node') ?? '?', b: box(shape) }];
          });
          const edges = Array.from(svg.querySelectorAll<SVGGeometryElement>('polyline[data-edge]')).map((el) => {
            const len = el.getTotalLength();
            const pts: { x: number; y: number }[] = [];
            for (let d = 0; d < len; d += 3) pts.push(el.getPointAtLength(d));
            pts.push(el.getPointAtLength(len));
            return { id: el.getAttribute('data-edge') ?? '?', pts };
          });
          for (let i = 0; i < texts.length; i++) {
            const t = texts[i]!;
            for (let j = i + 1; j < texts.length; j++) {
              const u = texts[j]!;
              if (t.owner !== u.owner && hit(t.b, u.b)) out.push(`${where}: "${t.label}" overlaps "${u.label}"`);
            }
            for (const n of nodes) {
              if (t.owner === `node:${n.id}`) continue;
              if (!t.owner.startsWith('node:') && inside(n.b, t.b)) continue;
              if (hit(t.b, n.b)) out.push(`${where}: "${t.label}" overlaps node ${n.id}`);
            }
            const grown = { x0: t.b.x0 - 1, y0: t.b.y0 - 1, x1: t.b.x1 + 1, y1: t.b.y1 + 1 };
            for (const e of edges) {
              if (e.pts.some((p) => p.x >= grown.x0 && p.x <= grown.x1 && p.y >= grown.y0 && p.y <= grown.y1)) {
                out.push(`${where}: "${t.label}" crosses edge ${e.id}`);
              }
            }
          }
        }
        return Array.from(new Set(out));
      });
      expect(collisions, `text collisions:\n${collisions.join('\n')}`).toEqual([]);
    });
  }
}
