import type { DocStatus, Locale } from './content/types';

export type NoticeKind = 'fallback' | 'machine' | 'stale';

export function computeNotices(i: {
  requested: Locale;
  served: Locale;
  sourceLocale: Locale;
  status?: DocStatus;
  sourceHash?: string;
  zhHash: string;
}): NoticeKind[] {
  const out: NoticeKind[] = [];
  const translated = i.served !== i.sourceLocale;
  if (i.served !== i.requested) out.push('fallback');
  if (translated && i.status === 'machine') out.push('machine');
  if (translated && i.sourceHash && i.sourceHash !== i.zhHash) out.push('stale');
  return out;
}
