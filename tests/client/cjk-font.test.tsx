// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { createElement } from 'react';

vi.mock('@/app/fonts-cjk', () => ({ cjk: { style: { fontFamily: "'X'" } } }));

afterEach(() => {
  cleanup();
  document.documentElement.style.removeProperty('--font-cjk');
});

describe('CjkFont', () => {
  it('sets --font-cjk on <html> once the font module resolves', async () => {
    const { default: CjkFont } = await import('@/components/CjkFont');
    render(createElement(CjkFont));
    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--font-cjk')).toBe("'X'"));
  });
});

describe('CjkFont eager branch', () => {
  it('starts the fonts-cjk import at module load on zh pages, before render', async () => {
    const prev = document.documentElement.lang;
    try {
      document.documentElement.lang = 'zh';
      vi.resetModules();
      const factory = vi.fn(() => ({ cjk: { style: { fontFamily: "'Z'" } } }));
      vi.doMock('@/app/fonts-cjk', factory);
      await import('@/components/CjkFont');
      await waitFor(() => expect(factory).toHaveBeenCalled());
    } finally {
      document.documentElement.lang = prev;
      vi.doUnmock('@/app/fonts-cjk');
      vi.resetModules();
    }
  });
});
