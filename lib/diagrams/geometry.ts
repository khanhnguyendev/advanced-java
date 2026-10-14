import { FONT_SIZE, LINE_HEIGHT, NODE_PAD, textMaxWidth, wrapText } from './measure';
import type { Line } from './measure';
import type { Anchor, DiagramNode, DiagramScene } from './types';

/** One shared source of text-block geometry for the renderer and the gate. */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export type Pt = readonly [number, number];

const LH = FONT_SIZE * LINE_HEIGHT;

/**
 * Calibrated against the browser's getBBox() of every pilot text (en/zh/vi, 360 and 1280px): the real
 * box is the font's line box, 15.4..18.1 user units high and centred on the text y (half <= 9.05, worst
 * case mono + Vietnamese diacritics). TEXT_HALF_H is that worst half (9.05) plus a 1px margin and rounding slack.
 */
export const TEXT_HALF_H = 10.1;
/** Horizontal margin added each side of the estimated width (absorbs rounding of glyph advances). */
export const TEXT_PAD_X = 1.5;

/** Strict interior overlap; touching edges do not overlap. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

export function rectContains(outer: Rect, inner: Rect): boolean {
  return outer.x0 <= inner.x0 && outer.y0 <= inner.y0 && outer.x1 >= inner.x1 && outer.y1 >= inner.y1;
}

export function shrinkRect(r: Rect, d: number): Rect {
  return { x0: r.x0 + d, y0: r.y0 + d, x1: r.x1 - d, y1: r.y1 - d };
}

/** Closed segment against closed rect (Liang-Barsky). */
export function segmentHitsRect(p: Pt, q: Pt, r: Rect): boolean {
  if (r.x0 > r.x1 || r.y0 > r.y1) return false;
  let t0 = 0;
  let t1 = 1;
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
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
  return (
    clip(-dx, p[0] - r.x0) && clip(dx, r.x1 - p[0]) && clip(-dy, p[1] - r.y0) && clip(dy, r.y1 - p[1])
  );
}

/** The four border segments of a rect (a group outline). */
export function rectBorder(r: Rect): [Pt, Pt][] {
  return [
    [[r.x0, r.y0], [r.x1, r.y0]],
    [[r.x1, r.y0], [r.x1, r.y1]],
    [[r.x1, r.y1], [r.x0, r.y1]],
    [[r.x0, r.y1], [r.x0, r.y0]],
  ];
}

/** Arrow markers are 8 user units: the head reaches 6.4 back from the tip and 3.2 to each side. */
export const ARROW_LEN = 6.4;
export const ARROW_HALF = 3.2;

export type Tri = [Pt, Pt, Pt];

/** Head triangle (tip, base corner, base corner) at `tip`, pointing away from `from`; null for a zero-length segment. */
export function arrowTriangle(tip: Pt, from: Pt): Tri | null {
  const dx = tip[0] - from[0];
  const dy = tip[1] - from[1];
  const len = Math.hypot(dx, dy);
  if (!(len > 0)) return null;
  const ux = dx / len;
  const uy = dy / len;
  const bx = tip[0] - ux * ARROW_LEN;
  const by = tip[1] - uy * ARROW_LEN;
  return [tip, [bx - uy * ARROW_HALF, by + ux * ARROW_HALF], [bx + uy * ARROW_HALF, by - ux * ARROW_HALF]];
}

/** Head triangles of an edge: end for `end`, both ends for `both`. Uses the last / first non-degenerate segment. */
export function edgeArrowheads(e: { points: [number, number][]; arrow: string }): { which: 'end' | 'start'; tri: Tri }[] {
  const out: { which: 'end' | 'start'; tri: Tri }[] = [];
  const p = e.points;
  if (p.length < 2) return out;
  if (e.arrow === 'end' || e.arrow === 'both') {
    for (let i = p.length - 2; i >= 0; i--) {
      const t = arrowTriangle(p[p.length - 1]!, p[i]!);
      if (t) {
        out.push({ which: 'end', tri: t });
        break;
      }
    }
  }
  if (e.arrow === 'both') {
    for (let i = 1; i < p.length; i++) {
      const t = arrowTriangle(p[0]!, p[i]!);
      if (t) {
        out.push({ which: 'start', tri: t });
        break;
      }
    }
  }
  return out;
}

/** Closed triangle against closed rect. */
export function triangleHitsRect(t: Tri, r: Rect): boolean {
  if (r.x0 > r.x1 || r.y0 > r.y1) return false;
  for (let i = 0; i < 3; i++) if (segmentHitsRect(t[i]!, t[(i + 1) % 3]!, r)) return true;
  // rect wholly inside the triangle
  const [a, b, c] = t;
  const cross = (p: Pt, q: Pt, s: Pt) => (q[0] - p[0]) * (s[1] - p[1]) - (q[1] - p[1]) * (s[0] - p[0]);
  const c0: Pt = [r.x0, r.y0];
  const d1 = cross(a, b, c0);
  const d2 = cross(b, c, c0);
  const d3 = cross(c, a, c0);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

export function nodeRect(n: { x: number; y: number; w: number; h: number }): Rect {
  return { x0: n.x, y0: n.y, x1: n.x + n.w, y1: n.y + n.h };
}

export interface TextLayout {
  lines: Line[];
  x: number;
  /** y of the first line's centre (dominant-baseline central) */
  yFirst: number;
  anchor: Anchor;
}

/** Where the renderer draws a node's (or group's) label. */
export function nodeTextLayout(
  n: Pick<DiagramNode, 'shape' | 'x' | 'y' | 'w' | 'h'>,
  text: string,
  literals: string[] = [],
): TextLayout {
  const lines = wrapText(text, literals, Math.max(textMaxWidth(n), 1));
  if (n.shape === 'group') {
    return { lines, x: n.x + NODE_PAD, yFirst: n.y + NODE_PAD + FONT_SIZE / 2, anchor: 'start' };
  }
  return { lines, x: n.x + n.w / 2, yFirst: n.y + n.h / 2 - ((lines.length - 1) * LH) / 2, anchor: 'middle' };
}

/** Free text and edge labels break only at hard newlines. */
export function freeTextLayout(text: string, literals: string[], x: number, y: number, anchor: Anchor): TextLayout {
  return { lines: wrapText(text, literals, Infinity), x, yFirst: y, anchor };
}

export function layoutRect(l: TextLayout): Rect {
  const w = Math.max(0, ...l.lines.map((ln) => ln.width));
  const x0 = l.anchor === 'start' ? l.x : l.anchor === 'end' ? l.x - w : l.x - w / 2;
  return {
    x0: x0 - TEXT_PAD_X,
    y0: l.yFirst - TEXT_HALF_H,
    x1: x0 + w + TEXT_PAD_X,
    y1: l.yFirst + (l.lines.length - 1) * LH + TEXT_HALF_H,
  };
}

export type TextKind = 'node' | 'group' | 'edge' | 'text';

export interface TextBlock {
  /** human name used in gate messages */
  name: string;
  kind: TextKind;
  /** node id for node/group labels */
  nodeId?: string;
  /** edge index for edge labels */
  edge?: number;
  rect: Rect;
}

const labelOf = (labels: Record<string, string>, key: string): string =>
  Object.hasOwn(labels, key) && typeof labels[key] === 'string' ? labels[key] : '';

/** Every non-blank text block of a scene for one locale's labels. */
export function sceneTextBlocks(scene: DiagramScene, labels: Record<string, string>): TextBlock[] {
  const out: TextBlock[] = [];
  for (const n of scene.nodes) {
    const t = labelOf(labels, n.label.key);
    if (t.trim() === '') continue;
    const kind: TextKind = n.shape === 'group' ? 'group' : 'node';
    out.push({
      name: `${kind === 'group' ? 'group' : 'node'} ${n.id} label`,
      kind,
      nodeId: n.id,
      rect: layoutRect(nodeTextLayout(n, t, n.label.literals ?? [])),
    });
  }
  scene.edges.forEach((e, i) => {
    if (!e.label) return;
    const t = labelOf(labels, e.label.key);
    if (t.trim() === '') return;
    out.push({
      name: `edge ${i} label`,
      kind: 'edge',
      edge: i,
      rect: layoutRect(freeTextLayout(t, e.label.literals ?? [], e.label.at[0], e.label.at[1], e.label.anchor)),
    });
  });
  for (const tx of scene.texts) {
    const t = labelOf(labels, tx.key);
    if (t.trim() === '') continue;
    out.push({
      name: `text ${tx.key}`,
      kind: 'text',
      rect: layoutRect(freeTextLayout(t, tx.literals ?? [], tx.x, tx.y, tx.anchor)),
    });
  }
  return out;
}
