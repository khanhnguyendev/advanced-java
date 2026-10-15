import { listCollections, listDocs, loadCollection } from '../content/collection';
import { resolveDoc } from '../content/fallback';
import { LOCALES } from '../content/types';
import { diagramEntriesOf } from '../render/pipeline';
import { diagramSvgFile, diagramSvgMarkup } from './asset-path';
import { fsDiagramSource } from './source';

const memo = new Map<string, Map<string, string>>();

/**
 * Every diagram SVG any document embeds, keyed by content-hashed file name. Walks the same
 * docs/locales/entries as the page renders (same body locale, same `doc:<index>` instance id), so the
 * files are byte-identical to what `rehypeDiagrams` links to.
 */
export function collectDiagramSvgs(root: string): Map<string, string> {
  const cache = process.env.NODE_ENV === 'production';
  const hit = cache ? memo.get(root) : undefined;
  if (hit) return hit;
  const out = new Map<string, string>();
  for (const collection of listCollections(root)) {
    const c = loadCollection(root, collection);
    const source = fsDiagramSource(root, collection);
    const seen = new Set<string>();
    for (const d of listDocs(c)) {
      for (const loc of LOCALES) {
        const doc = resolveDoc(root, c, loc, d.section, d.slug);
        if (!doc) continue;
        const key = `${d.section}/${d.slug}/${doc.served}`;
        if (seen.has(key)) continue;
        seen.add(key);
        for (const e of diagramEntriesOf(doc.body, source)) {
          const loaded = source.load(e.id);
          const labels = loaded?.labels[doc.served];
          if (!loaded || !labels) throw new Error(`diagram not found: ${e.id}`);
          const svg = diagramSvgMarkup(loaded.scene, labels, doc.served, e.index);
          out.set(diagramSvgFile(svg), svg);
        }
      }
    }
  }
  if (cache) memo.set(root, out);
  return out;
}
