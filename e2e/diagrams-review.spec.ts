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
const DIAGRAMS_DIR = path.join(
  process.env.CONTENT_ROOT ?? path.join(process.cwd(), 'content'),
  'advanced-java',
  '_diagrams',
);
const LOCALE_IDS = ['zh', 'en', 'vi'] as const;
type Scene = { nodes: { label?: { key?: string } }[]; edges: unknown[] };
const SCENES = diagramFiles(DIAGRAMS_DIR).map((f) => {
  const scene = JSON.parse(readFileSync(f, 'utf8')) as Scene;
  // A node with a blank label text in a locale renders no data-label; count the non-blank ones per locale.
  const base = f.replace(/\.diagram\.json$/, '');
  let labelled = 0;
  for (const loc of LOCALE_IDS) {
    const labels = (JSON.parse(readFileSync(`${base}.labels.${loc}.json`, 'utf8')) as { labels: Record<string, string> })
      .labels;
    labelled += scene.nodes.filter((n) => (labels[n.label?.key ?? ''] ?? '').trim() !== '').length;
  }
  return { ...scene, labelled };
});
const EXPECTED_DIAGRAMS = SCENES.length;
const NODES_IN_DIAGRAMS = SCENES.reduce((n, s) => n + s.nodes.length, 0);
const EDGES_IN_DIAGRAMS = SCENES.reduce((n, s) => n + s.edges.length, 0);
const LABELLED_NODES = SCENES.reduce((n, s) => n + s.labelled, 0); // summed over the 3 locales
const EXPECTED_SVGS = EXPECTED_DIAGRAMS * LOCALES * WIDTHS;
const EXPECTED_NODE_GROUPS = NODES_IN_DIAGRAMS * LOCALES * WIDTHS;
const EXPECTED_EDGES = EDGES_IN_DIAGRAMS * LOCALES * WIDTHS;

test('the review page is checked against a non-empty expectation', () => {
  expect(EXPECTED_DIAGRAMS, 'no scene files found: every count below would be vacuous').toBeGreaterThan(0);
});

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
      const edgeCount = await page.locator('[data-diagram] svg polyline[data-edge]').count();
      expect(edgeCount, `found ${edgeCount} polyline[data-edge]`).toBe(EXPECTED_EDGES);
      const count = await page.locator('g[data-node]').count();
      expect(count, `found ${count} g[data-node] groups`).toBe(EXPECTED_NODE_GROUPS);
      const labelled = await page.locator('g[data-node][data-label]').count();
      expect(labelled, `found ${labelled} labelled node groups`).toBe(LABELLED_NODES * WIDTHS);
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

      // Matching: no text bbox touches another text, a foreign node, a group border, an edge or an arrowhead (real fonts).
      const result = await page.evaluate(() => {
        type Box = { x0: number; y0: number; x1: number; y1: number };
        type P = { x: number; y: number };
        const out: string[] = [];
        const problems: string[] = [];
        let texts = 0;
        const hit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
        const inside = (o: Box, i: Box) => o.x0 <= i.x0 && o.y0 <= i.y0 && o.x1 >= i.x1 && o.y1 >= i.y1;
        const box = (el: SVGGraphicsElement): Box => {
          const r = el.getBBox();
          return { x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height };
        };
        // exact closed segment against closed rect (Liang-Barsky)
        const segRect = (p: P, q: P, r: Box): boolean => {
          let t0 = 0;
          let t1 = 1;
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const clip = (pp: number, qq: number): boolean => {
            if (pp === 0) return qq >= 0;
            const t = qq / pp;
            if (pp < 0) {
              if (t > t1) return false;
              if (t > t0) t0 = t;
            } else {
              if (t < t0) return false;
              if (t < t1) t1 = t;
            }
            return true;
          };
          return clip(-dx, p.x - r.x0) && clip(dx, r.x1 - p.x) && clip(-dy, p.y - r.y0) && clip(dy, r.y1 - p.y);
        };
        // marker is 8 units: head 6.4 back from the tip, +-3.2 sideways
        const head = (tip: P, from: P): [P, P, P] | null => {
          const dx = tip.x - from.x;
          const dy = tip.y - from.y;
          const len = Math.hypot(dx, dy);
          if (!(len > 0)) return null;
          const ux = dx / len;
          const uy = dy / len;
          const bx = tip.x - ux * 6.4;
          const by = tip.y - uy * 6.4;
          return [tip, { x: bx - uy * 3.2, y: by + ux * 3.2 }, { x: bx + uy * 3.2, y: by - ux * 3.2 }];
        };
        const triHitsRect = (t: [P, P, P], r: Box): boolean => {
          for (let i = 0; i < 3; i++) if (segRect(t[i]!, t[(i + 1) % 3]!, r)) return true;
          const cr = (p: P, q: P, s: P) => (q.x - p.x) * (s.y - p.y) - (q.y - p.y) * (s.x - p.x);
          const c: P = { x: r.x0, y: r.y0 };
          const d = [cr(t[0], t[1], c), cr(t[1], t[2], c), cr(t[2], t[0], c)];
          return !(d.some((v) => v < 0) && d.some((v) => v > 0));
        };
        for (const svg of Array.from(document.querySelectorAll('[data-diagram] svg[role=img]'))) {
          const diagram = svg.closest('[data-diagram]')?.getAttribute('data-diagram') ?? '?';
          const loc = svg.closest('[data-locale]')?.getAttribute('data-locale') ?? '?';
          const width = svg.closest('[data-width]')?.getAttribute('data-width') ?? '?';
          const where = `${diagram} [${loc} ${width}px]`;
          const allTexts = Array.from(svg.querySelectorAll<SVGTextElement>('text'));
          if (allTexts.length === 0) problems.push(`${where}: svg has no text elements`);
          for (const el of allTexts) {
            if (!el.hasAttribute('data-text-owner')) problems.push(`${where}: text "${(el.textContent ?? '').trim()}" has no data-text-owner`);
          }
          const tx = allTexts
            .filter((t) => t.hasAttribute('data-text-owner') && (t.textContent ?? '').trim() !== '')
            .map((el) => ({ owner: el.getAttribute('data-text-owner') ?? '?', label: (el.textContent ?? '').trim(), b: box(el) }));
          texts += tx.length;
          const nodes: { id: string; b: Box }[] = [];
          const groups: { id: string; b: Box }[] = [];
          for (const g of Array.from(svg.querySelectorAll('g[data-node]'))) {
            const shape = g.querySelector<SVGGraphicsElement>('rect, ellipse');
            if (!shape) continue;
            const id = g.getAttribute('data-node') ?? '?';
            (shape.hasAttribute('data-group') ? groups : nodes).push({ id, b: box(shape) });
          }
          const edges = Array.from(svg.querySelectorAll<SVGPolylineElement>('polyline[data-edge]')).map((el) => {
            const pts: P[] = [];
            for (let i = 0; i < el.points.length; i++) pts.push({ x: el.points[i]!.x, y: el.points[i]!.y });
            const heads: { which: string; tri: [P, P, P] }[] = [];
            if (pts.length >= 2) {
              if (el.hasAttribute('marker-end')) {
                for (let i = pts.length - 2; i >= 0; i--) {
                  const t = head(pts[pts.length - 1]!, pts[i]!);
                  if (t) {
                    heads.push({ which: 'end', tri: t });
                    break;
                  }
                }
              }
              if (el.hasAttribute('marker-start')) {
                for (let i = 1; i < pts.length; i++) {
                  const t = head(pts[0]!, pts[i]!);
                  if (t) {
                    heads.push({ which: 'start', tri: t });
                    break;
                  }
                }
              }
            }
            return { id: el.getAttribute('data-edge') ?? '?', pts, heads };
          });
          for (let i = 0; i < tx.length; i++) {
            const t = tx[i]!;
            // lines of one label share an owner and are exempt from each other
            for (let j = i + 1; j < tx.length; j++) {
              const u = tx[j]!;
              if (t.owner !== u.owner && hit(t.b, u.b)) out.push(`${where}: "${t.label}" overlaps "${u.label}"`);
            }
            for (const n of nodes) {
              if (t.owner === `node:${n.id}`) continue;
              if (!t.owner.startsWith('node:') && inside(n.b, t.b)) continue;
              if (hit(t.b, n.b)) out.push(`${where}: "${t.label}" overlaps node ${n.id}`);
            }
            for (const g of groups) {
              // wholly inside (own container) or wholly outside passes; anything else crosses the border
              if (hit(t.b, g.b) && !inside(g.b, t.b)) out.push(`${where}: "${t.label}" crosses group ${g.id} border`);
            }
            const own = t.owner.startsWith('node:') ? groups.find((g) => `node:${g.id}` === t.owner) : undefined;
            if (own) {
              for (const g of groups) {
                if (g.id === own.id || inside(g.b, own.b)) continue;
                if (hit(t.b, g.b)) out.push(`${where}: group ${g.id} sits over group ${own.id} label "${t.label}"`);
              }
            }
            const grown = { x0: t.b.x0 - 1, y0: t.b.y0 - 1, x1: t.b.x1 + 1, y1: t.b.y1 + 1 };
            for (const e of edges) {
              for (let k = 0; k + 1 < e.pts.length; k++) {
                if (segRect(e.pts[k]!, e.pts[k + 1]!, grown)) {
                  out.push(`${where}: "${t.label}" crosses edge ${e.id}`);
                  break;
                }
              }
              for (const h of e.heads) {
                if (triHitsRect(h.tri, grown)) out.push(`${where}: "${t.label}" touches the ${h.which} arrowhead of edge ${e.id}`);
              }
            }
          }
        }
        return { collisions: Array.from(new Set(out)), problems, texts };
      });
      expect(result.problems, `text elements without owner:\n${result.problems.join('\n')}`).toEqual([]);
      expect(result.texts, 'no text with an owner was inspected').toBeGreaterThan(0);
      const collisions = result.collisions;
      expect(collisions, `text collisions:\n${collisions.join('\n')}`).toEqual([]);
    });
  }
}
