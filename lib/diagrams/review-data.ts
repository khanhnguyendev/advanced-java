import { listDiagrams } from './load';
import { renderDiagram } from './render';
import { gateLoaded } from './run';
import type { DiagramLocale, GateError } from './types';
import { DIAGRAM_LOCALES } from './types';

/** Widths (px) at which each locale is shown on the review page. */
export const REVIEW_WIDTHS = [720, 360] as const;

export interface ReviewEntry {
  id: string;
  /** first path segment of the id (the section) */
  className: string;
  collection: string;
  license: string;
  upstream: string;
  /** public URL of the upstream image */
  imageUrl: string;
  /** inline SVG per locale and width, each rendered with its own id prefix so ids stay unique on the page; null when the locale cannot be rendered */
  svgsByWidth: Record<DiagramLocale, Record<number, string> | null>;
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
  const entries: ReviewEntry[] = listDiagrams(root).map((d) => {
    const gateErrors = gateLoaded(d);
    const svgsByWidth = {} as Record<DiagramLocale, Record<number, string> | null>;
    const renderErrors: GateError[] = [];
    for (const loc of DIAGRAM_LOCALES) {
      const l = d.labels[loc];
      svgsByWidth[loc] = null;
      if (!l) continue;
      try {
        const byWidth: Record<number, string> = {};
        for (const w of REVIEW_WIDTHS) byWidth[w] = renderDiagram(d.scene, l.labels, loc, `${loc}-${w}`);
        svgsByWidth[loc] = byWidth;
      } catch (e) {
        renderErrors.push({ code: 'META_INVALID', message: `render failed: ${(e as Error).message}`, locale: loc });
      }
    }
    const upstream = d.scene.source?.upstream ?? '';
    return {
      id: d.id,
      className: d.id.split('/')[0] ?? '',
      collection: d.collection,
      license: d.scene.license ?? 'derived',
      upstream,
      imageUrl: `/_content/${d.collection}/${upstream}`,
      svgsByWidth,
      errors: [...gateErrors, ...renderErrors],
    };
  });
  return {
    count: entries.length,
    errorCount: entries.reduce((n, e) => n + e.errors.length, 0),
    buildDate,
    entries,
  };
}
