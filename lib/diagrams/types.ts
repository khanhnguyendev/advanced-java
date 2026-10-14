export const DIAGRAM_LOCALES = ['zh', 'en', 'vi'] as const;
export type DiagramLocale = (typeof DIAGRAM_LOCALES)[number];

export type NodeShape = 'box' | 'round' | 'pill' | 'circle' | 'group';
export type NodeRole = 'default' | 'accent' | 'muted';
export type Anchor = 'start' | 'middle' | 'end';

export interface LabelRef {
  key: string;
  literals?: string[];
}

export interface DiagramNode {
  id: string;
  shape: NodeShape;
  x: number;
  y: number;
  w: number;
  h: number;
  label: LabelRef;
  role?: NodeRole;
}

export interface EdgeLabel extends LabelRef {
  at: [number, number];
  anchor: Anchor;
}

export interface DiagramEdge {
  points: [number, number][];
  arrow: 'end' | 'both' | 'none';
  style: 'solid' | 'dashed' | 'accent';
  label?: EdgeLabel;
}

export interface DiagramText extends LabelRef {
  x: number;
  y: number;
  anchor: Anchor;
}

export interface DiagramScene {
  id: string;
  source: { upstream: string; commit: string };
  license?: string;
  size: { w: number; h: number };
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  texts: DiagramText[];
  title_key: string;
  desc_key: string;
}

export interface LabelsMeta {
  locale: string;
  status: string;
  from?: string;
  source_lang?: string;
}

export interface LabelsFile {
  meta: LabelsMeta;
  labels: Record<string, string>;
}

/** A parsed labels file plus the sha256 (hex) of its raw bytes. */
export interface LocaleLabels extends LabelsFile {
  sha256: string;
}

export type LabelsByLocale = Partial<Record<DiagramLocale, LocaleLabels>>;

export type GateCode =
  | 'KEY_MISSING'
  | 'KEY_ORPHAN'
  | 'HAN_IN_LATIN'
  | 'LITERAL_MISSING'
  | 'OVERFLOW'
  | 'OUT_OF_VIEWBOX'
  | 'NODE_OVERLAP'
  | 'HASH_STALE'
  | 'LICENSE_INVALID'
  | 'SOURCE_MISSING'
  | 'META_INVALID'
  | 'TEXT_COLLISION'
  | 'GLOSSARY_MISSING'
  | 'GLOSSARY_MISMATCH'
  | 'GLOSSARY_CONFLICT';

export interface GateError {
  code: GateCode;
  message: string;
  locale?: DiagramLocale;
}

/** One whole-label glossary entry. Lookup is by the reference-locale text (zh, or en for source_lang en). */
export interface GlossaryEntry {
  zh: string;
  en: string;
  vi: string;
  /** diagram id the entry was first used in (global file only) */
  source?: string;
}
