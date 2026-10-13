import { afterEach, describe, expect, it, vi } from 'vitest';
import { localeCookieString, writeLocaleCookie } from '@/lib/locale-cookie';

describe('locale cookie', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('adds secure on https only', () => {
    expect(localeCookieString('vi', true)).toBe('NEXT_LOCALE=vi; path=/; max-age=31536000; samesite=lax; secure');
    vi.stubGlobal('location', { protocol: 'https:' });
    expect(localeCookieString('vi')).toMatch(/; secure$/);
    vi.stubGlobal('location', { protocol: 'http:' });
    expect(localeCookieString('vi')).not.toMatch(/secure/);
  });
  it('has the exact attributes from the spec', () => {
    expect(localeCookieString('vi')).toBe('NEXT_LOCALE=vi; path=/; max-age=31536000; samesite=lax');
  });
  it('writes to the given document-like object', () => {
    const doc = { cookie: '' };
    writeLocaleCookie('zh', doc);
    expect(doc.cookie).toBe('NEXT_LOCALE=zh; path=/; max-age=31536000; samesite=lax');
  });
});
