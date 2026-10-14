import type {
  DiagramLocale,
  DiagramScene,
  GateError,
  LabelRef,
  LabelsByLocale,
} from './types';
import { DIAGRAM_LOCALES } from './types';
import { FONT_SIZE, LINE_HEIGHT, stripLiterals, hasHan, wrapText, splitSegments, textWidth } from './measure';

export interface GateOptions {
  /** Whether `source.upstream` exists as a file under the collection's `_assets`. Omit to skip SOURCE_MISSING. */
  assetExists?: (upstream: string) => boolean;
}

const LICENSES = ['derived', 'original'];
const STATUSES = ['source', 'machine'];
const PAD = 8;

interface Ref {
  where: string;
  ref: LabelRef;
  kind: 'node' | 'group' | 'free';
  node?: { w: number; h: number };
  anchorX?: { x: number; anchor: 'start' | 'middle' | 'end' };
}

function collectRefs(scene: DiagramScene): Ref[] {
  const refs: Ref[] = [];
  for (const n of scene.nodes) {
    refs.push({ where: `node ${n.id}`, ref: n.label, kind: n.shape === 'group' ? 'group' : 'node', node: { w: n.w, h: n.h } });
  }
  scene.edges.forEach((e, i) => {
    if (e.label) refs.push({ where: `edge ${i}`, ref: e.label, kind: 'free', anchorX: { x: e.label.at[0], anchor: e.label.anchor } });
  });
  for (const t of scene.texts) {
    refs.push({ where: `text ${t.key}`, ref: t, kind: 'free', anchorX: { x: t.x, anchor: t.anchor } });
  }
  return refs;
}

export function checkDiagram(
  scene: DiagramScene,
  labelsByLocale: LabelsByLocale,
  opts: GateOptions = {},
): { errors: GateError[] } {
  const errors: GateError[] = [];
  const add = (code: GateError['code'], message: string, locale?: DiagramLocale) =>
    errors.push(locale ? { code, message, locale } : { code, message });
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
      add('META_INVALID', `labels file for ${loc} is missing`, loc);
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
      if (!(k in f.labels)) add('KEY_MISSING', `key "${k}" missing`, loc);
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
      const v = f.labels[r.ref.key];
      if (v === undefined) continue;
      for (const lit of r.ref.literals ?? []) {
        if (!v.includes(lit)) add('LITERAL_MISSING', `${r.where}: literal "${lit}" missing in key "${r.ref.key}"`, loc);
      }
    }
    // 4. overflow
    for (const r of refs) {
      const v = f.labels[r.ref.key];
      if (v === undefined) continue;
      const lits = r.ref.literals ?? [];
      if (r.node) {
        const maxW = r.node.w - 2 * PAD;
        const lines = wrapText(v, lits, maxW);
        const widest = Math.max(...lines.map((l) => l.width));
        if (widest > maxW) add('OVERFLOW', `${r.where}: line width ${widest.toFixed(1)} > ${maxW}`, loc);
        const hgt = lines.length * FONT_SIZE * LINE_HEIGHT;
        if (r.kind === 'node' && hgt > r.node.h - 2 * 4) {
          add('OVERFLOW', `${r.where}: text height ${hgt.toFixed(1)} > ${r.node.h - 8}`, loc);
        }
      } else if (r.anchorX) {
        const { x, anchor } = r.anchorX;
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
