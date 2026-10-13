export interface FlagRecord {
  headingIndex: number;
  headingText: string;
  headingCount: number;
  zhHash: string;
  savedAt: number;
}

export function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const s = window.localStorage;
    s.setItem('__probe', '1');
    s.removeItem('__probe');
    return s;
  } catch {
    return null;
  }
}

export const flagKey = (collection: string, catalogId: string) => `flag:${collection}:${catalogId}`;
export const asideKey = (collection: string) => `aside:${collection}`;

export function saveFlag(store: Storage | null, key: string, rec: FlagRecord): boolean {
  try {
    if (!store) return false;
    store.setItem(key, JSON.stringify(rec));
    return true;
  } catch {
    return false;
  }
}

const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

export function restoreFlag(
  store: Storage | null,
  key: string,
  current: { headings: { index: number; text: string }[]; zhHash: string },
): { index: number; changed: boolean } | null {
  let rec: FlagRecord;
  try {
    const raw = store?.getItem(key);
    if (!raw) return null;
    rec = JSON.parse(raw) as FlagRecord;
  } catch {
    return null;
  }
  const count = current.headings.length;
  if (!count || typeof rec.headingIndex !== 'number') return null;

  if (rec.zhHash === current.zhHash) {
    return { index: clamp(rec.headingIndex, 1, count), changed: false };
  }
  const same = current.headings.filter((h) => norm(h.text) === norm(rec.headingText));
  if (same.length) {
    const nearest = same.reduce((a, b) =>
      Math.abs(a.index - rec.headingIndex) <= Math.abs(b.index - rec.headingIndex) ? a : b,
    );
    return { index: nearest.index, changed: true };
  }
  const scaled = Math.round((rec.headingIndex * count) / Math.max(rec.headingCount || 1, 1));
  return { index: clamp(scaled, 1, count), changed: true };
}

export function readAside(store: Storage | null, key: string): string[] {
  try {
    const raw = store?.getItem(key);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleAside(store: Storage | null, key: string, catalogId: string): string[] {
  const list = readAside(store, key);
  const next = list.includes(catalogId) ? list.filter((x) => x !== catalogId) : [...list, catalogId];
  try {
    store?.setItem(key, JSON.stringify(next));
  } catch {
    return list;
  }
  return store ? next : [];
}
