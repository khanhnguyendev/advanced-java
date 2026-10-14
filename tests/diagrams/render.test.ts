import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderDiagram } from '@/lib/diagrams/render';
import { listDiagrams } from '@/lib/diagrams/load';

const root = path.join(__dirname, '..', 'fixtures', 'diagrams', 'content');
const d = listDiagrams(root)[0]!;

describe('renderDiagram', () => {
  it('is byte-identical across runs for every locale', () => {
    for (const loc of ['zh', 'en', 'vi'] as const) {
      const a = renderDiagram(d.scene, d.labels[loc]!.labels, loc);
      const b = renderDiagram(JSON.parse(JSON.stringify(d.scene)), { ...d.labels[loc]!.labels }, loc);
      expect(a).toBe(b);
    }
  });

  it('emits an accessible svg with node groups, markers and palette vars only', () => {
    const svg = renderDiagram(d.scene, d.labels.en!.labels, 'en');
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('viewBox="0 0 560 200"');
    expect(svg).toContain('width="100%"');
    expect(svg).toContain('>Toy diagram</title>');
    expect(svg).toContain('>A toy diagram with three nodes</desc>');
    for (const id of ['n1', 'n2', 'n3']) expect(svg).toContain(`<g data-node="${id}">`);
    expect(svg).toMatch(/<marker id="[0-9a-f]{8}-m-ie"/);
    expect(svg).toContain('stroke-width="1.25"');
    expect(svg).toContain('var(--font-mono, ui-monospace)');
    expect(svg).not.toMatch(/#[0-9a-fA-F]{3,6}(?![^<]*\))/); // hex colours only as var() fallbacks
  });

  it('differs per locale and uses a scene-specific marker prefix', () => {
    const zh = renderDiagram(d.scene, d.labels.zh!.labels, 'zh');
    const en = renderDiagram(d.scene, d.labels.en!.labels, 'en');
    expect(zh).not.toBe(en);
    const other = renderDiagram({ ...d.scene, id: 'demo/toy/other' }, d.labels.en!.labels, 'en');
    expect(other.match(/marker id="([0-9a-f]{8})/)![1]).not.toBe(en.match(/marker id="([0-9a-f]{8})/)![1]);
    expect(readFileSync(d.file, 'utf8')).toContain('"demo/toy/toy"');
  });
});
