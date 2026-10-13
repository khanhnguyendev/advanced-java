import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from '@/app/robots';

describe('robots', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('allows all and points at the sitemap', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://a.example');
    expect(robots()).toEqual({
      rules: { userAgent: '*', allow: '/' },
      sitemap: 'https://a.example/sitemap.xml',
    });
  });
});
