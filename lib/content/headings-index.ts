import { extractHeadings, type HeadingInfo } from '../render/headings';
import { resolveDoc } from './fallback';
import type { CollectionConfig, Locale } from './types';

const memo = new Map<string, HeadingInfo[] | null>();

export function __resetHeadingsMemo(): void {
  memo.clear();
}

export function headingsFor(
  root: string,
  c: CollectionConfig,
  locale: Locale,
  section: string,
  slug: string,
): HeadingInfo[] | null {
  const key = `${root}|${c.id}|${locale}|${section}|${slug}`;
  const useMemo = process.env.NODE_ENV === 'production';
  if (useMemo && memo.has(key)) return memo.get(key)?.slice() ?? null;
  const doc = resolveDoc(root, c, locale, section, slug);
  const out = doc ? extractHeadings(doc.body) : null;
  if (useMemo) memo.set(key, out);
  return out?.slice() ?? null;
}
