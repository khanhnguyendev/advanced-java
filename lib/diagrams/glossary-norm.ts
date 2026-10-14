/** Glossary comparison key: whitespace and newlines collapse to one space, trimmed, lowercased. */
export function normLabel(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}
