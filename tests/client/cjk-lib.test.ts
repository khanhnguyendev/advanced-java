import { describe, expect, it } from 'vitest';
import { needsCjkFont } from '@/lib/cjk';

describe('needsCjkFont', () => {
  it('is true for en page with zh-Hans content', () => expect(needsCjkFont('en', 'zh-Hans', 'en')).toBe(true));
  it('is true for vi page with only a zh-Hans title', () => expect(needsCjkFont('vi', 'vi', 'zh-Hans')).toBe(true));
  it('is false when content and title are not zh-Hans', () => expect(needsCjkFont('en', 'en', 'en')).toBe(false));
  it('is false on zh pages regardless', () => {
    expect(needsCjkFont('zh', 'zh-Hans', 'zh-Hans')).toBe(false);
    expect(needsCjkFont('zh', 'en', 'en')).toBe(false);
  });
});
