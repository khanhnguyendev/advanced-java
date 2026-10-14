import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { normLabel } from './glossary-norm';
import type { LoadedDiagram } from './load';
import { listDiagrams } from './load';
import type { GateError, GlossaryEntry } from './types';

export const GLOSSARY_FILE = 'glossary.diagram-labels.json';
export const SIDECAR_SUFFIX = '.glossary.json';
const META = {
  note: 'Diagram label glossary. Read by the label translator; every diagram label text needs an entry. _title and _desc are exempt.',
  case: 'compared case-insensitively',
};

export interface GlossaryFile {
  _meta?: unknown;
  terms: Record<string, { en?: string; vi?: string }>;
  labels: GlossaryEntry[];
}

export function isEntry(v: unknown): v is GlossaryEntry {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return typeof e.zh === 'string' && typeof e.en === 'string' && typeof e.vi === 'string';
}

/** Conflict: same zh text (normalised) with a different en or vi text. One error per zh text. */
export function findConflicts(entries: GlossaryEntry[]): GateError[] {
  const by = new Map<string, GlossaryEntry[]>();
  for (const e of entries) by.set(normLabel(e.zh), [...(by.get(normLabel(e.zh)) ?? []), e]);
  const out: GateError[] = [];
  for (const group of by.values()) {
    const first = group[0]!;
    const differing = group.filter((g) => normLabel(g.en) !== normLabel(first.en) || normLabel(g.vi) !== normLabel(first.vi));
    if (differing.length === 0) continue;
    const show = (g: GlossaryEntry) => `${g.source ?? '?'}: en "${g.en.replace(/\n/g, ' ')}", vi "${g.vi.replace(/\n/g, ' ')}"`;
    out.push({
      code: 'GLOSSARY_CONFLICT',
      message: `"${first.zh.replace(/\n/g, ' ')}" has conflicting entries: ${[first, ...differing].map(show).join(' | ')}`,
    });
  }
  return out;
}

export interface CollectionGlossary {
  collection: string;
  file: string;
  /** the global file exists, or at least one sidecar does */
  enforced: boolean;
  global: GlossaryFile | null;
  /** global labels then sidecar entries (sidecar entries carry source = diagram id) */
  entries: GlossaryEntry[];
  errors: GateError[];
}

export function readGlobal(file: string): { glossary: GlossaryFile | null; errors: GateError[] } {
  if (!existsSync(file)) return { glossary: null, errors: [] };
  try {
    const p = JSON.parse(readFileSync(file, 'utf8')) as Partial<GlossaryFile>;
    if (typeof p !== 'object' || p === null || !Array.isArray(p.labels)) throw new Error('"labels" is not an array');
    const labels = p.labels.filter(isEntry);
    const bad = p.labels.length - labels.length;
    const errors: GateError[] = bad
      ? [{ code: 'META_INVALID', message: `${path.basename(file)}: ${bad} label entries lack string zh/en/vi` }]
      : [];
    const terms = typeof p.terms === 'object' && p.terms !== null && !Array.isArray(p.terms) ? p.terms : {};
    return { glossary: { _meta: p._meta, terms, labels }, errors };
  } catch (e) {
    return { glossary: null, errors: [{ code: 'META_INVALID', message: `cannot parse ${path.basename(file)}: ${(e as Error).message}` }] };
  }
}

/** Glossary state per collection (collections that have diagrams). */
export function loadGlossaries(root: string, diagrams: LoadedDiagram[]): Map<string, CollectionGlossary> {
  const out = new Map<string, CollectionGlossary>();
  for (const d of diagrams) {
    if (out.has(d.collection)) continue;
    const file = path.join(root, d.collection, GLOSSARY_FILE);
    const { glossary, errors } = readGlobal(file);
    const own = diagrams.filter((x) => x.collection === d.collection);
    const side = own.flatMap((x) => x.sidecar ?? []);
    out.set(d.collection, {
      collection: d.collection,
      file,
      enforced: existsSync(file) || own.some((x) => x.sidecarFile !== undefined),
      global: glossary,
      entries: [...(glossary?.labels ?? []), ...side],
      errors,
    });
  }
  return out;
}

export interface MergeResult {
  conflicts: GateError[];
  errors: GateError[];
  /** files written / deleted */
  written: string[];
  deleted: string[];
}

/** Merge every sidecar into its collection's global glossary. Writes nothing when any conflict or error exists. */
export function mergeGlossaries(root: string): MergeResult {
  const diagrams = listDiagrams(root);
  const gl = loadGlossaries(root, diagrams);
  const result: MergeResult = { conflicts: [], errors: [], written: [], deleted: [] };
  const plans: { file: string; text: string; sidecars: string[] }[] = [];
  for (const g of gl.values()) {
    const own = diagrams.filter((d) => d.collection === g.collection);
    for (const d of own) result.errors.push(...d.loadErrors.filter((e) => e.message.includes('glossary')));
    result.errors.push(...g.errors);
    const sidecars = own.filter((d) => d.sidecarFile !== undefined);
    if (sidecars.length === 0) continue;
    const conflicts = findConflicts(g.entries);
    if (conflicts.length) {
      result.conflicts.push(...conflicts);
      continue;
    }
    const seen = new Set<string>();
    const merged: GlossaryEntry[] = [];
    for (const e of g.entries) {
      const k = normLabel(e.zh);
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push({ zh: e.zh, en: e.en, vi: e.vi, source: e.source });
    }
    merged.sort((a, b) => (a.zh < b.zh ? -1 : a.zh > b.zh ? 1 : 0));
    const body = {
      _meta: g.global?._meta ?? META,
      terms: g.global?.terms ?? {},
      labels: merged.map((e) => (e.source === undefined ? { zh: e.zh, en: e.en, vi: e.vi } : e)),
    };
    plans.push({ file: g.file, text: `${JSON.stringify(body, null, 2)}\n`, sidecars: sidecars.map((d) => d.sidecarFile!) });
  }
  if (result.conflicts.length || result.errors.length) return result;
  for (const p of plans) {
    writeFileSync(p.file, p.text);
    result.written.push(p.file);
    for (const s of p.sidecars) {
      unlinkSync(s);
      result.deleted.push(s);
    }
  }
  return result;
}
