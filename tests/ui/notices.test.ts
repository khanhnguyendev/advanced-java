import { describe, expect, it } from 'vitest';
import { computeNotices } from '@/lib/notices';

const base = { sourceLocale: 'zh' as const, zhHash: 'h1' };

describe('computeNotices', () => {
  it('shows nothing for the source locale', () => {
    expect(computeNotices({ ...base, requested: 'zh', served: 'zh' })).toEqual([]);
  });
  it('fallback only: vi served zh', () => {
    expect(computeNotices({ ...base, requested: 'vi', served: 'zh' })).toEqual(['fallback']);
  });
  it('fallback + machine: vi served a machine en', () => {
    expect(
      computeNotices({ ...base, requested: 'vi', served: 'en', status: 'machine', sourceHash: 'h1' }),
    ).toEqual(['fallback', 'machine']);
  });
  it('machine only', () => {
    expect(computeNotices({ ...base, requested: 'vi', served: 'vi', status: 'machine', sourceHash: 'h1' })).toEqual([
      'machine',
    ]);
  });
  it('stale when the zh hash changed, even for reviewed', () => {
    expect(computeNotices({ ...base, requested: 'vi', served: 'vi', status: 'reviewed', sourceHash: 'old' })).toEqual([
      'stale',
    ]);
  });
  it('machine + stale together', () => {
    expect(computeNotices({ ...base, requested: 'en', served: 'en', status: 'machine', sourceHash: 'old' })).toEqual([
      'machine',
      'stale',
    ]);
  });
});
