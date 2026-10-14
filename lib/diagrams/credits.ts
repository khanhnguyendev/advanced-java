import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { upstreamBlobHref, upstreamDocPath } from '../assets';
import type { CollectionConfig } from '../content/types';
import { attributionOf, creditOf } from './load';
import type { DiagramAttribution } from './types';

export interface DiagramCredit {
  id: string;
  /** Key under `content/<collection>/_assets/`. */
  upstream: string;
  /** Upstream docs path, e.g. `docs/<section>/images/<file>`. */
  path: string;
  href: string;
  license: string;
  /** third-party diagrams only: who the figure belongs to (from source-credits.json) */
  attribution?: DiagramAttribution;
}

function walk(dir: string, out: string[]) {
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.diagram.json')) out.push(full);
  }
}

/** Diagrams under `content/<id>/_diagrams`, sorted by id. Unreadable files are skipped. */
export function listDiagramCredits(root: string, c: CollectionConfig): DiagramCredit[] {
  const base = path.join(root, c.id, '_diagrams');
  if (!existsSync(base)) return [];
  const files: string[] = [];
  walk(base, files);
  const out: DiagramCredit[] = [];
  for (const f of files) {
    try {
      const d = JSON.parse(readFileSync(f, 'utf8')) as { id?: string; source?: { upstream?: string }; license?: string };
      if (!d.id || !d.source?.upstream) continue;
      const p = upstreamDocPath(d.source.upstream);
      const license = d.license ?? 'derived';
      const cr = license === 'third-party' ? creditOf(root, c.id, d.source.upstream) : undefined;
      out.push({
        id: d.id,
        upstream: d.source.upstream,
        path: p,
        href: upstreamBlobHref(c, p),
        license,
        ...(cr ? { attribution: attributionOf(cr) } : {}),
      });
    } catch {
      /* skip */
    }
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Set of `_assets` keys replaced by a diagram. */
export function replacedRasters(root: string, collection: string): Set<string> {
  const base = path.join(root, collection, '_diagrams');
  const files: string[] = [];
  if (existsSync(base)) walk(base, files);
  const keys = new Set<string>();
  for (const f of files) {
    try {
      const d = JSON.parse(readFileSync(f, 'utf8')) as { source?: { upstream?: string } };
      if (d.source?.upstream) keys.add(d.source.upstream);
    } catch {
      /* skip */
    }
  }
  return keys;
}
