import { existsSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { checkDiagram } from './gate';
import type { LoadedDiagram } from './load';
import { findConflicts, loadGlossaries } from './glossary';
import { listDiagrams } from './load';
import type { GateError, GlossaryEntry } from './types';

/** Gate one loaded diagram: load errors + gate errors, asset existence confined to the collection's `_assets`. */
export function gateLoaded(d: LoadedDiagram, glossary?: GlossaryEntry[]): GateError[] {
  if (d.unreadable) return [...d.loadErrors];
  const assetsDir = path.resolve(d.assetsDir);
  try {
    const { errors } = checkDiagram(d.scene, d.labels, {
      ...(glossary ? { glossary } : {}),
      assetExists: (up) => {
        if (path.isAbsolute(up)) return false;
        const p = path.resolve(assetsDir, up);
        if (!p.startsWith(assetsDir + path.sep)) return false;
        if (!existsSync(p)) return false;
        const real = realpathSync(p);
        if (!real.startsWith(realpathSync(assetsDir) + path.sep)) return false;
        return statSync(real).isFile();
      },
    });
    return [...d.loadErrors, ...errors];
  } catch (e) {
    return [...d.loadErrors, { code: 'META_INVALID', message: `gate failed: ${(e as Error).message}` }];
  }
}

export interface GateResult {
  id: string;
  errors: GateError[];
  /** the requested `--id` matched no diagram; not counted as a diagram */
  notFound?: true;
}

/** Id of the pseudo-result that carries glossary conflicts. */
export const GLOSSARY_ID = 'glossary';

/**
 * Gate every diagram under `root` (or only `opts.id`). The glossary is enforced for every collection that has at
 * least one diagram (a missing glossary file means every label is GLOSSARY_MISSING). Conflicts, if any, come back once as an extra result with id `glossary`.
 */
export function gateAll(root: string, opts: { id?: string } = {}): GateResult[] {
  const all = listDiagrams(root);
  const gl = loadGlossaries(root, all);
  const picked = opts.id === undefined ? all : all.filter((d) => d.id === opts.id);
  const results: GateResult[] = picked.map((d) => {
    const g = gl.get(d.collection);
    const errs = gateLoaded(d, g?.entries);
    return { id: d.id, errors: g ? [...errs, ...g.errors] : errs };
  });
  if (opts.id !== undefined && picked.length === 0) {
    results.push({ id: opts.id, errors: [{ code: 'META_INVALID', message: `diagram "${opts.id}" not found` }], notFound: true });
  }
  const conflicts: GateError[] = [];
  for (const g of gl.values()) conflicts.push(...findConflicts(g.entries));
  if (conflicts.length) results.push({ id: GLOSSARY_ID, errors: conflicts });
  return results;
}
