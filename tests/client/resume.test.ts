import { describe, expect, it } from 'vitest';
import {
  asideKey, flagKey, readAside, restoreFlag, safeStorage, saveFlag, toggleAside, type FlagRecord,
} from '@/lib/resume';

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}
class ThrowingStorage extends MemoryStorage {
  getItem(): string | null { throw new Error('blocked'); }
  setItem(): void { throw new Error('blocked'); }
}

const heads = (...texts: string[]) => texts.map((text, i) => ({ index: i + 1, text }));
const rec = (over: Partial<FlagRecord> = {}): FlagRecord => ({
  headingIndex: 3, headingText: 'Third', headingCount: 5, zhHash: 'h1', savedAt: 1, ...over,
});

describe('resume flag', () => {
  const key = flagKey('c', 'HC-03');

  it('restores the saved index when the zh hash is unchanged', () => {
    const s = new MemoryStorage();
    saveFlag(s, key, rec());
    expect(restoreFlag(s, key, { headings: heads('A', 'B', 'Third', 'D', 'E'), zhHash: 'h1' })).toEqual({
      index: 3,
      changed: false,
    });
  });

  it('after a heading is inserted before it, finds the same text at its new index', () => {
    const s = new MemoryStorage();
    saveFlag(s, key, rec());
    const r = restoreFlag(s, key, { headings: heads('New', 'A', 'B', 'Third', 'D', 'E'), zhHash: 'h2' });
    expect(r).toEqual({ index: 4, changed: true });
  });

  it('after the saved heading is removed, scales to the nearest existing heading, never 0', () => {
    const s = new MemoryStorage();
    saveFlag(s, key, rec({ headingIndex: 5, headingText: 'Gone', headingCount: 5 }));
    const r = restoreFlag(s, key, { headings: heads('A', 'B'), zhHash: 'h2' })!;
    expect(r.changed).toBe(true);
    expect(r.index).toBeGreaterThanOrEqual(1);
    expect(r.index).toBeLessThanOrEqual(2);
  });

  it('clamps an out-of-range index when the hash matches', () => {
    const s = new MemoryStorage();
    saveFlag(s, key, rec({ headingIndex: 99 }));
    expect(restoreFlag(s, key, { headings: heads('A', 'B'), zhHash: 'h1' })).toEqual({ index: 2, changed: false });
  });

  it('prefers the duplicate-text heading nearest the saved index', () => {
    const s = new MemoryStorage();
    saveFlag(s, key, rec({ headingIndex: 6, headingText: 'Same', headingCount: 6 }));
    const r = restoreFlag(s, key, { headings: heads('Same', 'x', 'y', 'Same', 'z', 'w'), zhHash: 'h2' });
    expect(r).toEqual({ index: 4, changed: true });
  });

  it('returns null with no record, corrupted json, or no headings', () => {
    const s = new MemoryStorage();
    expect(restoreFlag(s, key, { headings: heads('A'), zhHash: 'h1' })).toBeNull();
    s.setItem(key, '{not json');
    expect(restoreFlag(s, key, { headings: heads('A'), zhHash: 'h1' })).toBeNull();
    saveFlag(s, key, rec());
    expect(restoreFlag(s, key, { headings: [], zhHash: 'h1' })).toBeNull();
  });
});

describe('storage failures (Review Focus 4)', () => {
  it('never throws when storage is null or throws', () => {
    const t = new ThrowingStorage();
    expect(saveFlag(null, 'k', rec())).toBe(false);
    expect(saveFlag(t, 'k', rec())).toBe(false);
    expect(restoreFlag(t, 'k', { headings: heads('A'), zhHash: 'h' })).toBeNull();
    expect(readAside(t, 'k')).toEqual([]);
    expect(toggleAside(t, 'k', 'HC-01')).toEqual([]);
  });
  it('safeStorage returns null outside a browser', () => {
    expect(safeStorage()).toBeNull();
  });
});

describe('set aside', () => {
  it('toggles an id in and out, keeping order and uniqueness', () => {
    const s = new MemoryStorage();
    const k = asideKey('c');
    expect(toggleAside(s, k, 'HC-01')).toEqual(['HC-01']);
    expect(toggleAside(s, k, 'HC-02')).toEqual(['HC-01', 'HC-02']);
    expect(toggleAside(s, k, 'HC-01')).toEqual(['HC-02']);
    expect(readAside(s, k)).toEqual(['HC-02']);
  });
});

describe('restoreFlag tolerates malformed stored JSON', () => {
  const key = flagKey('c', 'HC-03');
  const cur = { headings: heads('A', 'B', 'C', 'D'), zhHash: 'h2' };
  const run = (raw: string) => {
    const s = new MemoryStorage();
    s.setItem(key, raw);
    return restoreFlag(s, key, cur);
  };
  it('returns null for non-object or non-numeric index', () => {
    expect(run('null')).toBeNull();
    expect(run('42')).toBeNull();
    expect(run('"x"')).toBeNull();
    expect(run('{"headingIndex":"x"}')).toBeNull();
    expect(run('{"headingIndex":null}')).toBeNull();
    expect(run('{}')).toBeNull();
  });
  it('defaults missing/invalid text and count, always an integer in range', () => {
    expect(run('{"headingIndex":2}')).toEqual({ index: 2, changed: true });
    expect(run('{"headingIndex":2,"headingCount":{}}')).toEqual({ index: 2, changed: true });
    expect(run('{"headingIndex":2,"headingCount":0,"headingText":5}')).toEqual({ index: 2, changed: true });
    const r = run('{"headingIndex":1e999,"headingCount":-3,"headingText":""}');
    expect(r).toBeNull();
    const r2 = run('{"headingIndex":2.6,"headingCount":"NaN","zhHash":7}')!;
    expect(Number.isInteger(r2.index)).toBe(true);
    expect(r2.index).toBeGreaterThanOrEqual(1);
    expect(r2.index).toBeLessThanOrEqual(4);
  });
});
