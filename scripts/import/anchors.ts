export function lenientKey(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

export function remapFragment(fragment: string, headings: { index: number; text: string }[]): number {
  let frag = fragment.replace(/^#/, '');
  try {
    frag = decodeURIComponent(frag);
  } catch {
    /* keep the raw fragment */
  }
  const key = lenientKey(frag);
  const hits = headings.filter((h) => lenientKey(h.text) === key);
  if (hits.length !== 1) {
    throw new Error(`anchor "${fragment}" matches ${hits.length} headings`);
  }
  return hits[0].index;
}
