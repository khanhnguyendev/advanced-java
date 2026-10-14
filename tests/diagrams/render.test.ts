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
    for (const id of ['n1', 'n2', 'n3']) expect(svg).toContain(`<g data-node="${id}" data-label="${id}">`);
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

  it('uses different title and marker ids per locale and per instance, deterministic for equal args', () => {
    const zh = renderDiagram(d.scene, d.labels.zh!.labels, 'zh');
    const en = renderDiagram(d.scene, d.labels.en!.labels, 'en');
    const idsOf = (s: string) => [...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]!);
    const zhIds = new Set(idsOf(zh));
    for (const id of idsOf(en)) expect(zhIds.has(id)).toBe(false);
    const a = renderDiagram(d.scene, d.labels.en!.labels, 'en', 'en-720');
    const b = renderDiagram(d.scene, d.labels.en!.labels, 'en', 'en-360');
    expect(a).not.toBe(b);
    expect(idsOf(a).some((id) => idsOf(b).includes(id))).toBe(false);
    expect(renderDiagram(d.scene, d.labels.en!.labels, 'en', 'en-720')).toBe(a);
  });

  it('is inert for a scene that skipped the gate (attribute injection)', () => {
    const s = JSON.parse(JSON.stringify(d.scene)) as typeof d.scene;
    s.texts = [{ key: 't1', x: 10, y: 10, anchor: 'start' }];
    (s.texts[0] as { anchor: string }).anchor = 'middle" onload="alert(1)';
    (s.texts[0] as { x: unknown }).x = '1" onclick="alert(2)';
    (s.nodes[0] as { x: unknown }).x = '0" onmouseover="alert(3)';
    const svg = renderDiagram(s, d.labels.en!.labels, 'en');
    expect(svg).not.toMatch(/ on[a-z]+="/);
    expect(svg).not.toContain('<script');
  });

  it('reads only own string label values and omits data-label for blank text', () => {
    const s = JSON.parse(JSON.stringify(d.scene)) as typeof d.scene;
    s.nodes[0]!.label.key = 'constructor';
    const svg = renderDiagram(s, d.labels.en!.labels, 'en');
    expect(svg).not.toContain('function');
    expect(svg).not.toContain('data-label="constructor"');
    expect(svg).toContain(`<g data-node="${s.nodes[0]!.id}">`);
    expect(svg).toContain('data-label="n2"');
  });

  it('renders group borders dotted by default and solid on request, deterministically', () => {
    const s = JSON.parse(JSON.stringify(d.scene)) as typeof d.scene;
    s.nodes[0]!.shape = 'group';
    const dotted = renderDiagram(s, d.labels.en!.labels, 'en');
    expect(dotted).toContain('stroke-dasharray="1.5 4"');
    s.nodes[0]!.border = 'solid';
    const solid = renderDiagram(s, d.labels.en!.labels, 'en');
    expect(solid).not.toContain('stroke-dasharray="1.5 4"');
    expect(solid).toContain('data-group="1"');
    expect(renderDiagram(JSON.parse(JSON.stringify(s)), d.labels.en!.labels, 'en')).toBe(solid);
  });

  it('gives free texts an index-based owner so equal keys stay distinct', () => {
    const s = JSON.parse(JSON.stringify(d.scene)) as typeof d.scene;
    s.texts = [
      { key: 't1', x: 10, y: 20, anchor: 'start' },
      { key: 't1', x: 10, y: 60, anchor: 'start' },
    ];
    const svg = renderDiagram(s, d.labels.en!.labels, 'en');
    expect(svg).toContain('data-text-owner="text:0"');
    expect(svg).toContain('data-text-owner="text:1"');
    expect(svg).not.toContain('data-text-owner="text:t1"');
  });
});
