import type { GlossaryEntry } from './types';

/** Glossary comparison key: NFC, whitespace and newlines collapse to one space, trimmed, lowercased. */
export function normLabel(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Reference locale of an entry (zh when unset). */
export function entryRef(e: Pick<GlossaryEntry, 'ref'>): 'zh' | 'en' {
  return e.ref === 'en' ? 'en' : 'zh';
}

/** Lookup / dedupe key: reference locale plus the normalised reference text. */
export function entryKey(e: GlossaryEntry): string {
  const r = entryRef(e);
  return `${r}\u0000${normLabel(e[r])}`;
}
