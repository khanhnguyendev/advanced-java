// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResumeFlag } from '@/components/ResumeFlag';
import { flagKey } from '@/lib/resume';
import en from '../../messages/en.json';

const headings = [
  { index: 1, text: 'One' },
  { index: 2, text: 'Two' },
  { index: 3, text: 'Three' },
];
const key = flagKey('c', 'HC-01');

function ui(zhHash = 'h1') {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <ResumeFlag collection="c" catalogId="HC-01" zhHash={zhHash} headings={headings} />
    </NextIntlClientProvider>
  );
}

// jsdom has no layout: fake tops so headings with index <= `at` are above the offset.
function placeHeadings(at: number) {
  document.body.innerHTML = headings
    .map((h) => `<h2 data-hi="${h.index}">${h.text}</h2>`)
    .join('');
  document.querySelectorAll('[data-hi]').forEach((el) => {
    const i = Number(el.getAttribute('data-hi'));
    el.getBoundingClientRect = () => ({ top: i <= at ? 0 : 500 }) as DOMRect;
  });
}

describe('ResumeFlag', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    localStorage.clear();
    window.location.hash = '';
    Element.prototype.scrollIntoView = vi.fn();
    placeHeadings(2);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('saves the current heading on unmount after 8s of dwell', () => {
    const { unmount } = render(ui());
    vi.advanceTimersByTime(8100);
    unmount();
    const rec = JSON.parse(localStorage.getItem(key)!);
    expect(rec.headingIndex).toBe(2);
    expect(rec.headingText).toBe('Two');
    expect(rec.zhHash).toBe('h1');
  });

  it('stores nothing on unmount before 8s', () => {
    const { unmount } = render(ui());
    vi.advanceTimersByTime(3000);
    unmount();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('saves on visibilitychange to hidden after dwell', () => {
    render(ui());
    vi.advanceTimersByTime(9000);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    expect(JSON.parse(localStorage.getItem(key)!).headingIndex).toBe(2);
  });

  it('skips restore when the URL has a hash', () => {
    localStorage.setItem(
      key,
      JSON.stringify({ headingIndex: 3, headingText: 'Three', headingCount: 3, zhHash: 'h1', savedAt: 1 }),
    );
    window.location.hash = '#h2-two';
    render(ui());
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('restores and shows the updated note only when the hash changed', () => {
    localStorage.setItem(
      key,
      JSON.stringify({ headingIndex: 3, headingText: 'Three', headingCount: 3, zhHash: 'h1', savedAt: 1 }),
    );
    const same = render(ui('h1'));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('note')).toBeNull();
    same.unmount();
    localStorage.setItem(
      key,
      JSON.stringify({ headingIndex: 3, headingText: 'Three', headingCount: 3, zhHash: 'h1', savedAt: 1 }),
    );
    render(ui('h2'));
    expect(screen.getByRole('note').textContent).toBe(en.resume.updated);
  });
});
