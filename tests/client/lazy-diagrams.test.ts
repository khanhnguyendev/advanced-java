// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { createElement } from 'react';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>t</title></svg>';

function slot(i: number, label = `Diagram ${i}`) {
  return `<figure><div class="diagram-scroll" data-diagram-src="/diagram-svg/f${i}.svg" role="img" aria-label="${label}" style="aspect-ratio: 1000 / 400; min-height: 280px"></div></figure>`;
}

function stubFetch(res: { ok: boolean; status: number; body: string }) {
  const fn = vi.fn(async () => ({ ok: res.ok, status: res.status, text: async () => res.body }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

let n = 0;
/** Fresh module per test: the file cache is module-level. */
async function load() {
  vi.resetModules();
  return import('@/components/LazyDiagrams');
}

beforeEach(() => {
  document.body.innerHTML = `<div id="host">${slot(++n)}</div>`;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'connection', { value: undefined, configurable: true });
});

describe('loadDiagram', () => {
  it.each([
    ['a 500 response', { ok: false, status: 500, body: '' }],
    ['a non-svg body', { ok: true, status: 200, body: '<html>' }],
  ])('falls back to an <img> on %s', async (_n, res) => {
    const { loadDiagram } = await load();
    stubFetch(res);
    const el = document.querySelector<HTMLElement>('.diagram-scroll')!;
    const events = vi.fn();
    window.addEventListener('diagrams:loaded', events);
    await loadDiagram(el);
    expect(el.dataset.state).toBe('error');
    const img = el.querySelector('img')!;
    expect(img.getAttribute('alt')).toBe(`Diagram ${n}`);
    expect(img.getAttribute('src')).toBe(`/diagram-svg/f${n}.svg`);
    expect(img.style.minWidth).toBe('700px');
    for (const a of ['role', 'aria-label', 'aria-busy', 'style']) expect(el.hasAttribute(a)).toBe(false);
    expect(events).toHaveBeenCalledTimes(1);
    window.removeEventListener('diagrams:loaded', events);
  });

  it('inlines a valid svg, fires one event per load, and is a no-op the second time', async () => {
    const { loadDiagram } = await load();
    const fetchFn = stubFetch({ ok: true, status: 200, body: SVG });
    const el = document.querySelector<HTMLElement>('.diagram-scroll')!;
    const events = vi.fn();
    window.addEventListener('diagrams:loaded', events);
    await loadDiagram(el);
    await loadDiagram(el);
    expect(el.dataset.state).toBe('loaded');
    expect(el.querySelector('svg')).not.toBeNull();
    for (const a of ['role', 'aria-label', 'aria-busy', 'style']) expect(el.hasAttribute(a)).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(events).toHaveBeenCalledTimes(1);
    window.removeEventListener('diagrams:loaded', events);
  });
});

describe('background prefill', () => {
  const many = () => {
    document.body.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => slot(100 + i)).join('');
  };

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
    Object.defineProperty(window, 'requestIdleCallback', { value: undefined, configurable: true });
  });
  afterEach(() => {
    delete (document as { readyState?: unknown }).readyState;
  });

  it('loads every slot after the idle delay', async () => {
    vi.useFakeTimers();
    const { LazyDiagrams: C } = await load();
    many();
    const fetchFn = stubFetch({ ok: true, status: 200, body: SVG });
    render(createElement(C));
    expect(fetchFn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2100);
    await vi.advanceTimersByTimeAsync(100);
    expect(document.querySelectorAll('.diagram-scroll[data-state="loaded"]')).toHaveLength(9);
    expect(fetchFn).toHaveBeenCalledTimes(9);
  });

  it('is skipped under saveData', async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
    const { LazyDiagrams: C } = await load();
    many();
    const fetchFn = stubFetch({ ok: true, status: 200, body: SVG });
    render(createElement(C));
    await vi.advanceTimersByTimeAsync(6000);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('cancels the pending timer on unmount', async () => {
    vi.useFakeTimers();
    const { LazyDiagrams: C } = await load();
    many();
    const fetchFn = stubFetch({ ok: true, status: 200, body: SVG });
    const r = render(createElement(C));
    r.unmount();
    await vi.advanceTimersByTimeAsync(6000);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
