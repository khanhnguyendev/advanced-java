import { describe, expect, it } from 'vitest';
import { localeCookieString, writeLocaleCookie } from '@/lib/locale-cookie';

describe('locale cookie', () => {
  it('has the exact attributes from the spec', () => {
    expect(localeCookieString('vi')).toBe('NEXT_LOCALE=vi; path=/; max-age=31536000; samesite=lax');
  });
  it('writes to the given document-like object', () => {
    const doc = { cookie: '' };
    writeLocaleCookie('zh', doc);
    expect(doc.cookie).toBe('NEXT_LOCALE=zh; path=/; max-age=31536000; samesite=lax');
  });
});
