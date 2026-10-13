import type { HeadingInfo } from './render/headings';

export type DocShape = 'qa' | 'plain';
const QA = ['面试题', '面试官心理分析', '面试题剖析'];

export function docShape(zhHeadings: { depth: number; text: string }[]): DocShape {
  const h2 = zhHeadings.filter((h) => h.depth === 2).map((h) => h.text.trim());
  return QA.every((t, i) => h2[i] === t) ? 'qa' : 'plain';
}

export interface Step {
  number: number;
  labelKey: 'question' | 'psychology' | 'answer' | null;
  text: string;
  id: string;
}

export function stepsFor(headings: HeadingInfo[], shape: DocShape): Step[] {
  const keys = ['question', 'psychology', 'answer'] as const;
  return headings
    .filter((h) => h.depth === 2)
    .map((h, i) => ({
      number: i + 1,
      labelKey: shape === 'qa' && i < 3 ? keys[i] : null,
      text: h.text,
      id: h.id,
    }));
}
