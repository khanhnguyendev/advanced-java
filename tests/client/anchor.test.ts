// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { currentHeadingIndex, findHeadingElement, parseHeadingHash, resolveHashInDocument } from '@/lib/anchor';

function mount(count: number) {
  document.body.innerHTML = Array.from(
    { length: count },
    (_, i) => `<h2 id="h${i + 1}-slug-${i + 1}" data-hi="${i + 1}">T${i + 1}</h2>`,
  ).join('');
}

describe('parseHeadingHash', () => {
  it('reads the index and ignores the slug', () => {
    expect(parseHeadingHash('#h3-old-slug')).toBe(3);
    expect(parseHeadingHash('#h12')).toBe(12);
    expect(parseHeadingHash('h4-x')).toBe(4);
  });
  it('returns null for non-heading hashes', () => {
    expect(parseHeadingHash('#intro')).toBeNull();
    expect(parseHeadingHash('#hello')).toBeNull();
    expect(parseHeadingHash('')).toBeNull();
  });
});

describe('heading resolution', () => {
  beforeEach(() => mount(3));
  it('resolves a stale slug on the right heading', () => {
    expect(resolveHashInDocument(document, '#h2-totally-old-slug')?.id).toBe('h2-slug-2');
  });
  it('resolves an index beyond the count to the last heading, never null', () => {
    expect(resolveHashInDocument(document, '#h99')?.id).toBe('h3-slug-3');
  });
  it('resolves index 0 to the first heading', () => {
    expect(findHeadingElement(document, 0)?.id).toBe('h1-slug-1');
  });
  it('returns null when the page has no indexed headings', () => {
    document.body.innerHTML = '<p>none</p>';
    expect(resolveHashInDocument(document, '#h1')).toBeNull();
  });
});

describe('currentHeadingIndex', () => {
  it('returns the last heading whose top is at or above the offset', () => {
    mount(3);
    const tops = [-300, 40, 500];
    document.querySelectorAll('[data-hi]').forEach((el, i) => {
      (el as HTMLElement).getBoundingClientRect = () => ({ top: tops[i] }) as DOMRect;
    });
    expect(currentHeadingIndex(document, 96)).toBe(2);
  });
  it('returns null before the first heading', () => {
    mount(2);
    document.querySelectorAll('[data-hi]').forEach((el) => {
      (el as HTMLElement).getBoundingClientRect = () => ({ top: 400 }) as DOMRect;
    });
    expect(currentHeadingIndex(document, 96)).toBeNull();
  });
});
