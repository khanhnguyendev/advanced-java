import { describe, expect, it } from 'vitest';
import { foldDiacritics } from '@/lib/search/fold';

describe('foldDiacritics', () => {
  it('removes Vietnamese diacritics including đ', () => {
    expect(foldDiacritics('Độ trễ của hàng đợi')).toBe('Do tre cua hang doi');
    expect(foldDiacritics('Đ')).toBe('D');
  });
  it('leaves Latin and Han text unchanged', () => {
    expect(foldDiacritics('message queue')).toBe('message queue');
    expect(foldDiacritics('消息队列')).toBe('消息队列');
  });
});
