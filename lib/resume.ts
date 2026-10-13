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
  const count = current.headings.length;
  if (!count) return null;
  let rec: FlagRecord;
  try {
    const raw = store?.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object') return null;
    const o = v as Record<string, unknown>;
    if (typeof o.headingIndex !== 'number' || !Number.isFinite(o.headingIndex)) return null;
    rec = {
      headingIndex: o.headingIndex,
      headingText: typeof o.headingText === 'string' ? o.headingText : '',
      headingCount:
        typeof o.headingCount === 'number' && Number.isFinite(o.headingCount) && o.headingCount > 0
          ? o.headingCount
          : count,
      zhHash: typeof o.zhHash === 'string' ? o.zhHash : '',
      savedAt: typeof o.savedAt === 'number' ? o.savedAt : 0,
    };
  } catch {
    return null;
  }

  if (rec.zhHash === current.zhHash) {
    return { index: clamp(Math.round(rec.headingIndex), 1, count), changed: false };
  }
  const text = norm(rec.headingText);
  const same = text ? current.headings.filter((h) => norm(h.text) === text) : [];
  if (same.length) {
    const nearest = same.reduce((a, b) =>
      Math.abs(a.index - rec.headingIndex) <= Math.abs(b.index - rec.headingIndex) ? a : b,
    );
    return { index: clamp(Math.round(nearest.index), 1, count), changed: true };
  }
  const scaled = Math.round((rec.headingIndex * count) / rec.headingCount);
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
