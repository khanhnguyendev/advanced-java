import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deepMerge } from '@/lib/messages';

function keys(o: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}
const load = (l: string) => JSON.parse(readFileSync(`messages/${l}.json`, 'utf8'));

describe('deepMerge', () => {
  it('overrides leaves and keeps missing keys from the base', () => {
    const base = { a: { x: 'en-x', y: 'en-y' }, b: 'en-b' };
    expect(deepMerge(base, { a: { x: 'vi-x' } } as never)).toEqual({ a: { x: 'vi-x', y: 'en-y' }, b: 'en-b' });
  });
});

describe('message catalogs', () => {
  it('vi and zh define every key that en defines', () => {
    const en = keys(load('en')).sort();
    expect(keys(load('vi')).sort()).toEqual(en);
    expect(keys(load('zh')).sort()).toEqual(en);
  });
  it('the fallback notice names both languages', () => {
    for (const l of ['en', 'vi', 'zh']) {
      const m = load(l).doc.fallbackNotice as string;
      expect(m).toContain('{requested}');
      expect(m).toContain('{served}');
    }
  });
});
