import { createHash } from 'node:crypto';
import type { Anchor, DiagramEdge, DiagramLocale, DiagramNode, DiagramScene } from './types';
import { FONT_SIZE, LINE_HEIGHT, NODE_PAD } from './measure';
import { freeTextLayout, nodeTextLayout } from './geometry';
import type { Line } from './measure';

export { NODE_PAD };
const SW = 1.25;
const UI_FONT = `var(--font-ui, system-ui), system-ui, 'PingFang SC', 'Noto Sans SC', sans-serif`;
const MONO_FONT = `var(--font-mono, ui-monospace), ui-monospace, Menlo, monospace`;
const C = {
  ink: 'var(--ink, #10151f)',
  paper: 'var(--paper, #f4f8fc)',
  muted: 'var(--ink-muted, #46526a)',
  grid: 'var(--grid, #cfdbea)',
  rule: 'var(--rule, #b9c7da)',
  accent: 'var(--accent, #1f4fd8)',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function labelText(labels: Record<string, string>, key: string): string {
  return Object.hasOwn(labels, key) && typeof labels[key] === 'string' ? labels[key] : '';
}

function lineMarkup(line: Line, h: string): string {
  return line.segs
    .map((s) =>
      s.mono
        ? `<tspan class="${h}m">${esc(s.text)}</tspan>`
        : `<tspan>${esc(s.text)}</tspan>`,
    )
    .join('');
}

function textBlock(
  h: string,
  lines: Line[],
  x: number,
  yFirst: number,
  anchor: Anchor,
  fill: string,
  extra = '',
): string {
  const lh = FONT_SIZE * LINE_HEIGHT;
  return lines
    .map(
      (ln, i) =>
        `<text class="${h}t" x="${round(x)}" y="${round(num(yFirst) + i * lh)}" text-anchor="${esc(String(anchor))}" ` +
        `fill="${fill}"${extra}>` +
        `${lineMarkup(ln, h)}</text>`,
    )
    .join('');
}

/** Attribute naming the scene element a `<text>` belongs to (used by the browser matching check). */
function owner(v: string): string {
  return ` data-text-owner="${esc(v)}"`;
}

/** emitted coordinates are kept to one decimal: a 0.05px shift is not visible, and it trims every number */
function round(n: number): number {
  return Math.round(num(n) * 10) / 10;
}

function nodeColors(role: DiagramNode['role']): { stroke: string; fill: string; text: string } {
  if (role === 'accent') return { stroke: C.accent, fill: C.paper, text: C.accent };
  if (role === 'muted') return { stroke: C.rule, fill: C.grid, text: C.muted };
  return { stroke: C.ink, fill: C.paper, text: C.ink };
}

function dataLabel(n: DiagramNode, text: string): string {
  return text.trim() === '' ? '' : ` data-label="${esc(String(n.label.key))}"`;
}

function renderNode(n0: DiagramNode, text: string, h: string): string {
  const n = { ...n0, x: num(n0.x), y: num(n0.y), w: num(n0.w), h: num(n0.h) };
  const col = nodeColors(n.role);
  const lits = n.label.literals ?? [];
  if (n.shape === 'group') {
    const tl = nodeTextLayout(n, text, lits);
    const outline =
      n.border === 'solid'
        ? `stroke="${C.muted}"`
        : `stroke="${C.rule}" stroke-dasharray="1.5 4" stroke-linecap="round"`;
    return (
      `<g data-node="${esc(String(n.id))}"${dataLabel(n, text)}>` +
      `<rect data-group="1" x="${round(n.x)}" y="${round(n.y)}" width="${round(n.w)}" height="${round(n.h)}" rx="2" fill="none" ${outline}/>` +
      textBlock(h, tl.lines, tl.x, tl.yFirst, tl.anchor, C.muted, owner(`node:${n.id}`)) +
      `</g>`
    );
  }
  let shape: string;
  if (n.shape === 'circle') {
    shape = `<ellipse cx="${round(n.x + n.w / 2)}" cy="${round(n.y + n.h / 2)}" rx="${round(n.w / 2)}" ry="${round(n.h / 2)}"`;
  } else {
    const rx = n.shape === 'round' ? 10 : n.shape === 'pill' ? round(n.h / 2) : 2;
    shape = `<rect x="${round(n.x)}" y="${round(n.y)}" width="${round(n.w)}" height="${round(n.h)}" rx="${rx}"`;
  }
  shape += ` fill="${col.fill}" stroke="${col.stroke}"/>`;
  const tl = nodeTextLayout(n, text, lits);
  return `<g data-node="${esc(String(n.id))}"${dataLabel(n, text)}>${shape}${textBlock(h, tl.lines, tl.x, tl.yFirst, tl.anchor, col.text, owner(`node:${n.id}`))}</g>`;
}

function markerId(h: string, style: DiagramEdge['style'], end: 'e' | 's'): string {
  return `${h}-m-${style === 'accent' ? 'a' : 'i'}${end}`;
}

function renderEdge(e: DiagramEdge, i: number, h: string, k: string, labels: Record<string, string>): string {
  const color = e.style === 'accent' ? C.accent : C.ink;
  const pts = e.points.map((p) => `${round(p[0])},${round(p[1])}`).join(' ');
  const dash = e.style === 'dashed' ? ' stroke-dasharray="5 4"' : '';
  const mEnd = e.arrow === 'end' || e.arrow === 'both' ? ` marker-end="url(#${markerId(h, e.style, 'e')})"` : '';
  const mStart = e.arrow === 'both' ? ` marker-start="url(#${markerId(h, e.style, 's')})"` : '';
  let out =
    `<polyline class="${k}e" data-edge="${i}" points="${pts}" stroke="${color}"${dash}${mStart}${mEnd}/>`;
  if (e.label) {
    const tl = freeTextLayout(labelText(labels, e.label.key), e.label.literals ?? [], num(e.label.at[0]), num(e.label.at[1]), e.label.anchor);
    out += textBlock(k, tl.lines, tl.x, tl.yFirst, tl.anchor, color, owner(`edge:${i}`));
  }
  return out;
}

function markers(h: string, k: string): string {
  const mk = (id: string, color: string) =>
    `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" ` +
    `markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9 Z" fill="${color}"/></marker>`;
  return (
    `<style>` +
    `.${k}t{font-size:${FONT_SIZE}px;dominant-baseline:central;white-space:pre;font-family:${UI_FONT}}` +
    `.${k}m{font-family:${MONO_FONT}}` +
    `.${k}e{fill:none;stroke-linejoin:round;stroke-linecap:round}` +
    `</style>` +
    `<defs>` +
    mk(`${h}-m-ie`, C.ink) +
    mk(`${h}-m-is`, C.ink) +
    mk(`${h}-m-ae`, C.accent) +
    mk(`${h}-m-as`, C.accent) +
    `</defs>`
  );
}

/**
 * Pure, deterministic. Returns one `<svg>` string. `locale` is recorded in `lang`; scene id, locale and
 * `instance` are hashed into the id prefix so several renderings can share one page.
 */
export function renderDiagram(
  scene: DiagramScene,
  labels: Record<string, string>,
  locale: DiagramLocale,
  instance = '',
): string {
  const h = createHash('sha256').update(`${scene.id}\u0000${locale}\u0000${instance}`).digest('hex').slice(0, 8);
  // class names must not start with a digit (invalid selector): letter-prefixed key; ids may use the bare hash
  const k = `d${h}`;
  const t = `${h}-title`;
  const d = `${h}-desc`;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" lang="${esc(String(locale))}" viewBox="0 0 ${num(scene.size.w)} ${num(scene.size.h)}" ` +
      `width="100%" aria-labelledby="${t} ${d}" stroke-width="${SW}">`,
  );
  parts.push(`<title id="${t}">${esc(labelText(labels, scene.title_key))}</title>`);
  parts.push(`<desc id="${d}">${esc(labelText(labels, scene.desc_key))}</desc>`);
  parts.push(markers(h, k));
  // groups first so they sit behind everything
  const ordered = [...scene.nodes.filter((n) => n.shape === 'group'), ...scene.nodes.filter((n) => n.shape !== 'group')];
  for (const n of ordered) parts.push(renderNode(n, labelText(labels, n.label.key), k));
  scene.edges.forEach((e, i) => parts.push(renderEdge(e, i, h, k, labels)));
  scene.texts.forEach((tx, i) => {
    const tl = freeTextLayout(labelText(labels, tx.key), tx.literals ?? [], num(tx.x), num(tx.y), tx.anchor);
    parts.push(textBlock(k, tl.lines, tl.x, tl.yFirst, tl.anchor, C.ink, owner(`text:${i}`)));
  });
  parts.push('</svg>');
  return parts.join('');
}

