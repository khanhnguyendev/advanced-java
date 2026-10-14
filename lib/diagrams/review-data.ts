import { runGate } from '../../scripts/check-diagrams';
import { listDiagrams } from './load';
import { renderDiagram } from './render';
import type { DiagramLocale, GateError } from './types';
import { DIAGRAM_LOCALES } from './types';

export interface ReviewEntry {
  id: string;
  /** first path segment of the id (the section) */
  className: string;
  collection: string;
  license: string;
  upstream: string;
  /** public URL of the upstream image */
  imageUrl: string;
  /** inline SVG per locale (output of renderDiagram), null when the locale cannot be rendered */
  svgs: Record<DiagramLocale, string | null>;
  errors: GateError[];
}

export interface ReviewData {
  count: number;
  errorCount: number;
  buildDate: string;
  entries: ReviewEntry[];
}

export const CREDIT_LINE =
  'Redrawn from the upstream image at commit 1a35221 (doocs/advanced-java), CC-BY-SA-4.0. Original authorship not documented upstream.';

export function buildReviewData(root: string, buildDate: string = new Date().toISOString().slice(0, 10)): ReviewData {
  const gate = new Map(runGate(root).map((r) => [r.id, r.errors]));
  const entries: ReviewEntry[] = listDiagrams(root).map((d) => {
    const svgs = {} as Record<DiagramLocale, string | null>;
    for (const loc of DIAGRAM_LOCALES) {
      const l = d.labels[loc];
      try {
        svgs[loc] = l ? renderDiagram(d.scene, l.labels, loc) : null;
      } catch {
        svgs[loc] = null;
      }
    }
    return {
      id: d.id,
      className: d.id.split('/')[0] ?? '',
      collection: d.collection,
      license: d.scene.license ?? 'derived',
      upstream: d.scene.source.upstream,
      imageUrl: `/_content/${d.collection}/${d.scene.source.upstream}`,
      svgs,
      errors: gate.get(d.id) ?? [],
    };
  });
  return {
    count: entries.length,
    errorCount: entries.reduce((n, e) => n + e.errors.length, 0),
    buildDate,
    entries,
  };
}
