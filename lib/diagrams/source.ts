import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Locale } from '../content/types';
import type { DiagramSource } from '../render/diagrams';
import { attributionOf, creditOf, loadDiagram } from './load';

const cache = new Map<string, ReturnType<DiagramSource['load']>>();

/** File-system diagram source for `diagram:<section>/<slug>/<name>`; cached per process. */
export function fsDiagramSource(root: string, collection: string): DiagramSource {
  return {
    load(id) {
      if (id.split(/[\\/]/).includes('..')) return null;
      const key = `${root}\u0000${collection}\u0000${id}`;
      if (cache.has(key)) return cache.get(key)!;
      const base = path.resolve(root, collection, '_diagrams');
      const file = path.resolve(base, `${id}.diagram.json`);
      let out: ReturnType<DiagramSource['load']> = null;
      if (file.startsWith(base + path.sep) && existsSync(file)) {
        const d = loadDiagram(file, collection, root);
        if (!d.unreadable && d.loadErrors.length === 0) {
          const labels: Partial<Record<Locale, Record<string, string>>> = {};
          for (const [loc, l] of Object.entries(d.labels)) labels[loc as Locale] = l.labels;
          const cr = d.scene.license === 'third-party' ? creditOf(root, collection, d.scene.source.upstream) : undefined;
          out = { scene: d.scene, labels, ...(cr ? { attribution: attributionOf(cr) } : {}) };
        }
      }
      cache.set(key, out);
      return out;
    },
  };
}
