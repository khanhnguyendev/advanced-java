import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import type { CollectionConfig } from './content/types';

export interface ImageCredit { path: string; href: string }

/**
 * Images shipped under `content/<id>/_assets/<section>/<slug>/<file>`, mapped to their upstream location
 * `docs/<section>/images/<file>` at the pinned commit. Deduplicated by upstream path, sorted.
 */
export function listImageCredits(root: string, c: CollectionConfig): ImageCredit[] {
  const base = path.join(root, c.id, '_assets');
  if (!existsSync(base)) return [];
  const seen = new Set<string>();
  const walk = (dir: string, rel: string[]) => {
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full, [...rel, name]);
      else if (rel.length >= 1) seen.add(`docs/${rel[0]}/images/${name}`);
    }
  };
  walk(base, []);
  return [...seen].sort().map((p) => ({
    path: p,
    href: `${c.upstream.repo}/blob/${c.upstream.commit}/${encodeURI(p).replace(/'/g, '%27')}`,
  }));
}
