import { findConflicts, loadGlossaries } from './glossary';
import { attributionOf, creditOf, listDiagrams } from './load';
import { renderDiagram } from './render';
import { gateLoaded } from './run';
import type { DiagramAttribution, DiagramLocale, GateError } from './types';
import { DIAGRAM_LOCALES } from './types';

/** Widths (px) at which each locale is shown on the review page. */
export const REVIEW_WIDTHS = [720, 360] as const;

export interface ReviewEntry {
  id: string;
  /** first path segment of the id (the section) */
  className: string;
  collection: string;
  license: string;
  /** third-party diagrams: the attribution from source-credits.json (undefined when missing) */
  attribution?: DiagramAttribution;
  /** credit line shown under the entry; CC-BY-SA wording only for derived and original diagrams */
  creditLine: string;
  upstream: string;
  /** public URL of the upstream image */
  imageUrl: string;
  /** inline SVG per locale and width, each rendered with its own id prefix so ids stay unique on the page; null when the locale cannot be rendered */
  svgsByWidth: Record<DiagramLocale, Record<number, string> | null>;
  errors: GateError[];
  /** distinct GLOSSARY_* codes among `errors`; empty means glossary OK */
  glossaryCodes: string[];
}

export interface ReviewData {
  count: number;
  errorCount: number;
  /** GLOSSARY_CONFLICT errors (shared by all diagrams) */
  glossaryConflicts: GateError[];
  buildDate: string;
  entries: ReviewEntry[];
}

export const CREDIT_LINE =
  'Redrawn from the upstream image at commit 1a35221 (doocs/advanced-java), CC-BY-SA-4.0. Original authorship not documented upstream.';

export function thirdPartyCreditLine(a: DiagramAttribution | undefined): string {
  if (!a) return 'Third-party figure: attribution missing from source-credits.json.';
  const base = `Redrawn from a figure in “${a.title}” by ${a.author}`;
  return a.licenseName ? `${base} (${a.licenseName}).` : `${base}. Rights remain with the author; not relicensed here.`;
}

export function buildReviewData(root: string, buildDate: string = new Date().toISOString().slice(0, 10)): ReviewData {
  const diagrams = listDiagrams(root);
  const gl = loadGlossaries(root, diagrams);
  const entries: ReviewEntry[] = diagrams.map((d) => {
    const g = gl.get(d.collection);
    const gateErrors = [...gateLoaded(d, g?.entries), ...(g ? g.errors : [])];
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
    const errors = [...gateErrors, ...renderErrors];
    const license = d.scene.license ?? 'derived';
    const cr = license === 'third-party' ? creditOf(d.root, d.collection, upstream) : undefined;
    const attribution = cr ? attributionOf(cr) : undefined;
    return {
      id: d.id,
      className: d.id.split('/')[0] ?? '',
      collection: d.collection,
      license,
      ...(attribution ? { attribution } : {}),
      creditLine: license === 'third-party' ? thirdPartyCreditLine(attribution) : CREDIT_LINE,
      upstream,
      imageUrl: `/_content/${d.collection}/${upstream}`,
      svgsByWidth,
      errors,
      glossaryCodes: [...new Set(errors.filter((e) => e.code.startsWith('GLOSSARY_')).map((e) => e.code))],
    };
  });
  const glossaryConflicts: GateError[] = [];
  for (const g of gl.values()) glossaryConflicts.push(...findConflicts(g.entries));
  return {
    count: entries.length,
    errorCount: entries.reduce((n, e) => n + e.errors.length, 0) + glossaryConflicts.length,
    glossaryConflicts,
    buildDate,
    entries,
  };
}
