import { createHash } from 'node:crypto';
import type { Anchor, DiagramEdge, DiagramLocale, DiagramNode, DiagramScene } from './types';
import { FONT_SIZE, LINE_HEIGHT, NODE_PAD, textMaxWidth, wrapText } from './measure';
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

function lineMarkup(line: Line): string {
  return line.segs
    .map((s) =>
      s.mono
        ? `<tspan style="font-family:${esc(MONO_FONT)}">${esc(s.text)}</tspan>`
        : `<tspan>${esc(s.text)}</tspan>`,
    )
    .join('');
}

function textBlock(
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
        `<text x="${num(x)}" y="${round(num(yFirst) + i * lh)}" text-anchor="${esc(String(anchor))}" dominant-baseline="central" ` +
        `font-size="${FONT_SIZE}" fill="${fill}" style="font-family:${esc(UI_FONT)};white-space:pre"${extra}>` +
        `${lineMarkup(ln)}</text>`,
    )
    .join('');
}

function round(n: number): number {
  return Math.round(num(n) * 100) / 100;
}

function nodeColors(role: DiagramNode['role']): { stroke: string; fill: string; text: string } {
  if (role === 'accent') return { stroke: C.accent, fill: C.paper, text: C.accent };
  if (role === 'muted') return { stroke: C.rule, fill: C.grid, text: C.muted };
  return { stroke: C.ink, fill: C.paper, text: C.ink };
}

function dataLabel(n: DiagramNode, text: string): string {
  return text.trim() === '' ? '' : ` data-label="${esc(String(n.label.key))}"`;
}

function renderNode(n0: DiagramNode, text: string): string {
  const n = { ...n0, x: num(n0.x), y: num(n0.y), w: num(n0.w), h: num(n0.h) };
  const col = nodeColors(n.role);
  const lits = n.label.literals ?? [];
  if (n.shape === 'group') {
    const lines = wrapText(text, lits, Math.max(textMaxWidth(n), 1));
    return (
      `<g data-node="${esc(String(n.id))}"${dataLabel(n, text)}>` +
      `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="2" fill="none" stroke="${C.rule}" ` +
      `stroke-width="${SW}" stroke-dasharray="1.5 4" stroke-linecap="round"/>` +
      textBlock(lines, n.x + NODE_PAD, n.y + NODE_PAD + FONT_SIZE / 2, 'start', C.muted) +
      `</g>`
    );
  }
  let shape: string;
  if (n.shape === 'circle') {
    shape = `<ellipse cx="${n.x + n.w / 2}" cy="${n.y + n.h / 2}" rx="${n.w / 2}" ry="${n.h / 2}"`;
  } else {
    const rx = n.shape === 'round' ? 10 : n.shape === 'pill' ? n.h / 2 : 2;
    shape = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${rx}"`;
  }
  shape += ` fill="${col.fill}" stroke="${col.stroke}" stroke-width="${SW}"/>`;
  const lines = wrapText(text, lits, Math.max(textMaxWidth(n), 1));
  const lh = FONT_SIZE * LINE_HEIGHT;
  const top = n.y + n.h / 2 - ((lines.length - 1) * lh) / 2;
  return `<g data-node="${esc(String(n.id))}"${dataLabel(n, text)}>${shape}${textBlock(lines, n.x + n.w / 2, top, 'middle', col.text)}</g>`;
}

function markerId(h: string, style: DiagramEdge['style'], end: 'e' | 's'): string {
  return `${h}-m-${style === 'accent' ? 'a' : 'i'}${end}`;
}

function renderEdge(e: DiagramEdge, h: string, labels: Record<string, string>): string {
  const color = e.style === 'accent' ? C.accent : C.ink;
  const pts = e.points.map((p) => `${num(p[0])},${num(p[1])}`).join(' ');
  const dash = e.style === 'dashed' ? ' stroke-dasharray="5 4"' : '';
  const mEnd = e.arrow === 'end' || e.arrow === 'both' ? ` marker-end="url(#${markerId(h, e.style, 'e')})"` : '';
  const mStart = e.arrow === 'both' ? ` marker-start="url(#${markerId(h, e.style, 's')})"` : '';
  let out =
    `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${SW}"${dash}` +
    ` stroke-linejoin="round" stroke-linecap="round"${mStart}${mEnd}/>`;
  if (e.label) {
    const lines = wrapText(labelText(labels, e.label.key), e.label.literals ?? [], Infinity);
    out += textBlock(lines, num(e.label.at[0]), num(e.label.at[1]), e.label.anchor, color);
  }
  return out;
}

function markers(h: string): string {
  const mk = (id: string, color: string) =>
    `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" ` +
    `markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9 Z" fill="${color}"/></marker>`;
  return (
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
  const t = `${h}-title`;
  const d = `${h}-desc`;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" lang="${esc(String(locale))}" viewBox="0 0 ${num(scene.size.w)} ${num(scene.size.h)}" ` +
      `width="100%" aria-labelledby="${t} ${d}" stroke-width="${SW}">`,
  );
  parts.push(`<title id="${t}">${esc(labelText(labels, scene.title_key))}</title>`);
  parts.push(`<desc id="${d}">${esc(labelText(labels, scene.desc_key))}</desc>`);
  parts.push(markers(h));
  // groups first so they sit behind everything
  const ordered = [...scene.nodes.filter((n) => n.shape === 'group'), ...scene.nodes.filter((n) => n.shape !== 'group')];
  for (const n of ordered) parts.push(renderNode(n, labelText(labels, n.label.key)));
  for (const e of scene.edges) parts.push(renderEdge(e, h, labels));
  for (const tx of scene.texts) {
    const lines = wrapText(labelText(labels, tx.key), tx.literals ?? [], Infinity);
    parts.push(textBlock(lines, tx.x, tx.y, tx.anchor, C.ink));
  }
  parts.push('</svg>');
  return parts.join('');
}

