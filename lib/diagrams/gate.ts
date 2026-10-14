import type {
  DiagramLocale,
  DiagramScene,
  GateError,
  LabelRef,
  LabelsByLocale,
} from './types';
import { DIAGRAM_LOCALES } from './types';
import { FONT_SIZE, LINE_HEIGHT, NODE_PAD, stripLiterals, hasHan, wrapText, splitSegments, textWidth, textMaxWidth } from './measure';

export interface GateOptions {
  /** Whether `source.upstream` exists as a file under the collection's `_assets`. Omit to skip SOURCE_MISSING. */
  assetExists?: (upstream: string) => boolean;
}

const LICENSES = ['derived', 'original'];
const STATUSES = ['source', 'machine'];
const PAD = NODE_PAD;
const LH = FONT_SIZE * LINE_HEIGHT;
const HALF = FONT_SIZE / 2;

const isBlank = (v: unknown): boolean => typeof v !== 'string' || v.trim() === '';

const SHAPES = ['box', 'round', 'pill', 'circle', 'group'];
const ROLES = ['default', 'accent', 'muted'];
const ARROWS = ['end', 'both', 'none'];
const STYLES = ['solid', 'dashed', 'accent'];
const ANCHORS = ['start', 'middle', 'end'];

function validateScene(
  scene: DiagramScene,
  labelsByLocale: LabelsByLocale,
  bad: (msg: string) => void,
  badLocale: (loc: DiagramLocale, msg: string) => void,
): void {
  const fin = (v: unknown, name: string, positive = false) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) bad(`${name} is not a finite number`);
    else if (positive && v <= 0) bad(`${name} must be > 0`);
  };
  const oneOf = (v: unknown, set: string[], name: string, optional = false) => {
    if (v === undefined && optional) return;
    if (typeof v !== 'string' || !set.includes(v)) bad(`${name} "${String(v)}" is not one of ${set.join('|')}`);
  };
  fin(scene.size?.w, 'size.w', true);
  fin(scene.size?.h, 'size.h', true);
  for (const k of ['nodes', 'edges', 'texts'] as const) {
    if (!Array.isArray(scene[k])) bad(`${k} is not an array`);
  }
  if (typeof scene.title_key !== 'string' || scene.title_key === '') bad('title_key is not a non-empty string');
  if (typeof scene.desc_key !== 'string' || scene.desc_key === '') bad('desc_key is not a non-empty string');
  if (typeof scene.source?.upstream !== 'string') bad('source.upstream is not a string');
  const keyOk = (r: unknown, p: string) => {
    const k = (r as { key?: unknown } | null | undefined)?.key;
    if (typeof k !== 'string' || k === '') bad(`${p} label.key is not a non-empty string`);
    const lits = (r as { literals?: unknown } | null | undefined)?.literals;
    if (lits !== undefined && (!Array.isArray(lits) || lits.some((l) => typeof l !== 'string'))) {
      bad(`${p} literals is not a string array`);
    }
  };
  for (const loc of DIAGRAM_LOCALES) {
    const f = labelsByLocale[loc];
    if (!f) continue;
    if (typeof f.labels !== 'object' || f.labels === null || Array.isArray(f.labels) || typeof f.meta !== 'object' || f.meta === null) {
      badLocale(loc, `${loc} labels file is malformed`);
      continue;
    }
    for (const [k, v] of Object.entries(f.labels)) {
      if (typeof v !== 'string') badLocale(loc, `${loc} label "${k}" is not a string`);
    }
  }
  for (const n of Array.isArray(scene.nodes) ? scene.nodes : []) {
    const p = `node ${n?.id}`;
    keyOk(n?.label, p);
    if (!n || typeof n !== 'object') continue;
    fin(n.x, `${p} x`);
    fin(n.y, `${p} y`);
    fin(n.w, `${p} w`, true);
    fin(n.h, `${p} h`, true);
    oneOf(n.shape, SHAPES, `${p} shape`);
    oneOf(n.role, ROLES, `${p} role`, true);
  }
  (Array.isArray(scene.edges) ? scene.edges : []).forEach((e, i) => {
    const p = `edge ${i}`;
    if (!e || typeof e !== 'object') {
      bad(`${p} is not an object`);
      return;
    }
    if (!Array.isArray(e.points)) bad(`${p} points is not an array`);
    else {
      e.points.forEach((pt, j) => {
        if (!Array.isArray(pt) || pt.length !== 2) bad(`${p} points[${j}] is not a pair`);
        else {
          fin(pt[0], `${p} points[${j}] x`);
          fin(pt[1], `${p} points[${j}] y`);
        }
      });
    }
    oneOf(e.arrow, ARROWS, `${p} arrow`);
    oneOf(e.style, STYLES, `${p} style`);
    if (e.label) {
      keyOk(e.label, `${p}`);
      if (!Array.isArray(e.label.at) || e.label.at.length !== 2) bad(`${p} label.at is not a pair`);
      fin(e.label.at?.[0], `${p} label x`);
      fin(e.label.at?.[1], `${p} label y`);
      oneOf(e.label.anchor, ANCHORS, `${p} label anchor`);
    }
  });
  for (const t of Array.isArray(scene.texts) ? scene.texts : []) {
    const p = `text ${t?.key}`;
    keyOk(t, p);
    if (!t || typeof t !== 'object') continue;
    fin(t.x, `${p} x`);
    fin(t.y, `${p} y`);
    oneOf(t.anchor, ANCHORS, `${p} anchor`);
  }
}

interface Ref {
  where: string;
  ref: LabelRef;
  kind: 'node' | 'group' | 'free';
  node?: { w: number; h: number };
  circle?: boolean;
  anchorX?: { x: number; y: number; anchor: 'start' | 'middle' | 'end' };
}

function collectRefs(scene: DiagramScene): Ref[] {
  const refs: Ref[] = [];
  for (const n of scene.nodes) {
    refs.push({ where: `node ${n.id}`, ref: n.label, kind: n.shape === 'group' ? 'group' : 'node', node: { w: n.w, h: n.h }, circle: n.shape === 'circle' });
  }
  scene.edges.forEach((e, i) => {
    if (e.label) refs.push({ where: `edge ${i}`, ref: e.label, kind: 'free', anchorX: { x: e.label.at[0], y: e.label.at[1], anchor: e.label.anchor } });
  });
  for (const t of scene.texts) {
    refs.push({ where: `text ${t.key}`, ref: t, kind: 'free', anchorX: { x: t.x, y: t.y, anchor: t.anchor } });
  }
  return refs;
}

export function checkDiagram(
  scene: DiagramScene,
  labelsByLocale: LabelsByLocale,
  opts: GateOptions = {},
): { errors: GateError[] } {
  const errors: GateError[] = [];
  const badLocales = new Set<DiagramLocale>();
  const add = (code: GateError['code'], message: string, locale?: DiagramLocale) =>
    errors.push(locale ? { code, message, locale } : { code, message });
  validateScene(
    scene,
    labelsByLocale,
    (m) => add('META_INVALID', m),
    (loc, m) => {
      badLocales.add(loc);
      add('META_INVALID', m, loc);
    },
  );
  // scene-structure errors stop everything; a bad label file only drops that locale
  if (errors.some((e) => !e.locale)) return { errors };
  if (badLocales.size > 0) {
    labelsByLocale = { ...labelsByLocale };
    for (const loc of badLocales) delete labelsByLocale[loc];
  }
  const refs = collectRefs(scene);

  // 8. license / source
  const license = scene.license ?? 'derived';
  if (!LICENSES.includes(license)) add('LICENSE_INVALID', `license "${license}" is not derived|original`);
  if (opts.assetExists && !opts.assetExists(scene.source.upstream)) {
    add('SOURCE_MISSING', `source.upstream "${scene.source.upstream}" not found under _assets`);
  }

  // 9. meta + 7. hash
  for (const loc of DIAGRAM_LOCALES) {
    const f = labelsByLocale[loc];
    if (!f) {
      if (!badLocales.has(loc)) add('META_INVALID', `labels file for ${loc} is missing`, loc);
      continue;
    }
    if (f.meta.locale !== loc) add('META_INVALID', `meta.locale "${f.meta.locale}" does not match file locale "${loc}"`, loc);
    if (!STATUSES.includes(f.meta.status)) add('META_INVALID', `meta.status "${f.meta.status}" is not source|machine`, loc);
    if (f.meta.source_lang !== undefined && f.meta.source_lang !== 'zh' && f.meta.source_lang !== 'en') {
      add('META_INVALID', `meta.source_lang "${f.meta.source_lang}" is not zh|en`, loc);
    }
  }
  const refLocale: DiagramLocale =
    labelsByLocale.en?.meta.source_lang === 'en' || labelsByLocale.zh?.meta.source_lang === 'en' ? 'en' : 'zh';
  const ref = labelsByLocale[refLocale];
  for (const loc of DIAGRAM_LOCALES) {
    const f = labelsByLocale[loc];
    if (!f || !STATUSES.includes(f.meta.status)) continue;
    const want = loc === refLocale ? 'source' : 'machine';
    if (f.meta.status !== want) {
      add('META_INVALID', `meta.status "${f.meta.status}" must be "${want}" for ${loc}`, loc);
    }
  }
  const langs = new Set(
    DIAGRAM_LOCALES.map((l) => labelsByLocale[l]?.meta.source_lang).filter((s): s is string => s !== undefined),
  );
  if (langs.size > 1) add('META_INVALID', `meta.source_lang differs across locales (${[...langs].join(', ')})`);
  if (ref) {
    for (const loc of DIAGRAM_LOCALES) {
      if (loc === refLocale) continue;
      const f = labelsByLocale[loc];
      if (f && f.meta.from !== ref.sha256) {
        add('HASH_STALE', `meta.from does not match sha256 of ${refLocale} labels (${ref.sha256.slice(0, 12)}...)`, loc);
      }
    }
  }

  // 1. keys
  const used = new Set<string>([scene.title_key, scene.desc_key, ...refs.map((r) => r.ref.key)]);
  for (const loc of DIAGRAM_LOCALES) {
    const f = labelsByLocale[loc];
    if (!f) continue;
    for (const k of used) {
      if (!Object.hasOwn(f.labels, k)) add('KEY_MISSING', `key "${k}" missing`, loc);
      else if (isBlank(f.labels[k]) && (k === scene.title_key || k === scene.desc_key)) {
        add('KEY_MISSING', `key "${k}" is empty`, loc);
      } else if (isBlank(f.labels[k]) && ref && Object.hasOwn(ref.labels, k) && !isBlank(ref.labels[k])) {
        add('KEY_MISSING', `key "${k}" is empty`, loc);
      }
    }
    for (const k of Object.keys(f.labels)) {
      if (!used.has(k)) add('KEY_ORPHAN', `key "${k}" is not referenced by the scene`, loc);
    }
  }

  // literals per key (union of declarations)
  const litsByKey = new Map<string, string[]>();
  for (const r of refs) litsByKey.set(r.ref.key, [...(litsByKey.get(r.ref.key) ?? []), ...(r.ref.literals ?? [])]);

  for (const loc of DIAGRAM_LOCALES) {
    const f = labelsByLocale[loc];
    if (!f) continue;
    // 2. Han in latin
    if (loc === 'en' || loc === 'vi') {
      for (const [k, v] of Object.entries(f.labels)) {
        if (hasHan(stripLiterals(v, litsByKey.get(k) ?? []))) add('HAN_IN_LATIN', `key "${k}" contains Han text`, loc);
      }
    }
    // 3. literals
    for (const r of refs) {
      const v = Object.hasOwn(f.labels, r.ref.key) ? f.labels[r.ref.key] : undefined;
      if (v === undefined) continue;
      for (const lit of r.ref.literals ?? []) {
        if (!v.includes(lit)) add('LITERAL_MISSING', `${r.where}: literal "${lit}" missing in key "${r.ref.key}"`, loc);
      }
    }
    // 4. overflow
    for (const r of refs) {
      const v = Object.hasOwn(f.labels, r.ref.key) ? f.labels[r.ref.key] : undefined;
      if (v === undefined) continue;
      const lits = r.ref.literals ?? [];
      if (r.node) {
        const maxW = textMaxWidth({ shape: r.circle ? 'circle' : 'box', w: r.node.w });
        const lines = wrapText(v, lits, maxW);
        const widest = Math.max(...lines.map((l) => l.width));
        if (widest > maxW) add('OVERFLOW', `${r.where}: line width ${widest.toFixed(1)} > ${maxW.toFixed(1)}`, loc);
        if (r.kind === 'node') {
          const hgt = lines.length * LH;
          const maxH = r.circle ? r.node.h * Math.SQRT1_2 : r.node.h - 2 * 4;
          if (hgt > maxH) add('OVERFLOW', `${r.where}: text height ${hgt.toFixed(1)} > ${maxH.toFixed(1)}`, loc);
        } else {
          // group label: top-left, first line centre at PAD + HALF
          const bottom = PAD + HALF + (lines.length - 1) * LH + HALF;
          if (bottom > r.node.h - PAD) {
            add('OVERFLOW', `${r.where}: label height ${bottom.toFixed(1)} > ${r.node.h - PAD}`, loc);
          }
        }
      } else if (r.anchorX) {
        const { x, y, anchor } = r.anchorX;
        const n = v.split('\n').length;
        const top = y - HALF;
        const bottom = y + (n - 1) * LH + HALF;
        if (top < 0 || bottom > scene.size.h) {
          add('OVERFLOW', `${r.where}: text block ${top.toFixed(1)}..${bottom.toFixed(1)} outside height ${scene.size.h}`, loc);
        }
        const room = anchor === 'start' ? scene.size.w - x : anchor === 'end' ? x : 2 * Math.min(x, scene.size.w - x);
        for (const para of v.split('\n')) {
          const w = textWidth(splitSegments(para, lits));
          if (w > room) add('OVERFLOW', `${r.where}: line width ${w.toFixed(1)} > ${room}`, loc);
        }
      }
    }
  }

  // 5. viewbox
  const { w: W, h: H } = scene.size;
  const out = (x: number, y: number) => x < 0 || y < 0 || x > W || y > H;
  for (const n of scene.nodes) {
    if (n.x < 0 || n.y < 0 || n.x + n.w > W || n.y + n.h > H) add('OUT_OF_VIEWBOX', `node ${n.id} outside ${W}x${H}`);
  }
  scene.edges.forEach((e, i) => {
    if (e.points.some(([x, y]) => out(x, y))) add('OUT_OF_VIEWBOX', `edge ${i} has a point outside ${W}x${H}`);
    if (e.label && out(e.label.at[0], e.label.at[1])) add('OUT_OF_VIEWBOX', `edge ${i} label outside ${W}x${H}`);
  });
  for (const t of scene.texts) if (out(t.x, t.y)) add('OUT_OF_VIEWBOX', `text ${t.key} outside ${W}x${H}`);

  // 6. overlap
  const solid = scene.nodes.filter((n) => n.shape !== 'group');
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      const a = solid[i]!;
      const b = solid[j]!;
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
        add('NODE_OVERLAP', `nodes ${a.id} and ${b.id} overlap`);
      }
    }
  }

  return { errors };
}
