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
const ric = Object.getOwnPropertyDescriptor(window, 'requestIdleCallback');
const vis = Object.getOwnPropertyDescriptor(document, 'visibilityState');
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (ric) Object.defineProperty(window, 'requestIdleCallback', ric);
  else delete (window as { requestIdleCallback?: unknown }).requestIdleCallback;
  if (vis) Object.defineProperty(document, 'visibilityState', vis);
  else delete (document as { visibilityState?: unknown }).visibilityState;
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

describe('injection and timeouts', () => {
  const el0 = () => document.querySelector<HTMLElement>('.diagram-scroll')!;

  it('injects in a hidden tab even though rAF never fires', async () => {
    const { loadDiagram } = await load();
    stubFetch({ ok: true, status: 200, body: SVG });
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const el = el0();
    await loadDiagram(el);
    expect(el.dataset.state).toBe('loaded');
  });

  it('falls back to a 100ms timer when rAF never fires while visible', async () => {
    vi.useFakeTimers();
    const { loadDiagram } = await load();
    stubFetch({ ok: true, status: 200, body: SVG });
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    const el = el0();
    const p = loadDiagram(el);
    await vi.advanceTimersByTimeAsync(0);
    expect(el.dataset.state).toBe('loading');
    await vi.advanceTimersByTimeAsync(100);
    await p;
    expect(el.dataset.state).toBe('loaded');
  });

  it.each(['TimeoutError', 'AbortError'])('falls back to <img> on a %s', async (name) => {
    const { loadDiagram } = await load();
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new DOMException('timed out', name);
    }));
    const el = el0();
    const events = vi.fn();
    window.addEventListener('diagrams:loaded', events);
    await loadDiagram(el);
    expect(el.dataset.state).toBe('error');
    expect(el.querySelector('img')).not.toBeNull();
    for (const a of ['role', 'aria-label', 'aria-busy', 'style']) expect(el.hasAttribute(a)).toBe(false);
    expect(events).toHaveBeenCalledTimes(1);
    window.removeEventListener('diagrams:loaded', events);
  });

  it('printing makes a pending-frame injection happen at once', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    const { LazyDiagrams: C, loadDiagram } = await load();
    stubFetch({ ok: true, status: 200, body: SVG });
    render(createElement(C));
    const el = el0();
    const p = loadDiagram(el);
    await vi.advanceTimersByTimeAsync(0);
    expect(el.dataset.state).toBe('loading');
    window.dispatchEvent(new Event('beforeprint'));
    await p;
    expect(el.dataset.state).toBe('loaded');
    // while printing, a new load skips the frame wait entirely
    document.body.innerHTML = slot(777);
    const el2 = el0();
    await loadDiagram(el2);
    expect(el2.dataset.state).toBe('loaded');
    window.dispatchEvent(new Event('afterprint'));
  });

  it('beforeprint injects synchronously after the fetch, with no frame wait', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    const { LazyDiagrams: C } = await load();
    stubFetch({ ok: true, status: 200, body: SVG });
    render(createElement(C));
    window.dispatchEvent(new Event('beforeprint'));
    await vi.advanceTimersByTimeAsync(0);
    expect(el0().dataset.state).toBe('loaded');
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});

describe('hardening', () => {
  const el0 = () => document.querySelector<HTMLElement>('.diagram-scroll')!;

  it('falls back to <img> when the svg injection throws inside the frame callback', async () => {
    const { loadDiagram } = await load();
    stubFetch({ ok: true, status: 200, body: SVG });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
    const el = el0();
    const real = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')!;
    Object.defineProperty(el, 'innerHTML', {
      configurable: true,
      set() {
        throw new Error('boom');
      },
      get: () => real.get!.call(el),
    });
    await loadDiagram(el);
    expect(el.dataset.state).toBe('error');
    expect(el.querySelector('img')).not.toBeNull();
  });

  it('cancels pending frame callbacks on unmount and leaves the slot pending', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
    const raf = vi.fn(() => 7);
    const caf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', caf);
    const { LazyDiagrams: C, loadDiagram } = await load();
    stubFetch({ ok: true, status: 200, body: SVG });
    const r = render(createElement(C));
    const el = el0();
    const p = loadDiagram(el);
    await vi.advanceTimersByTimeAsync(0);
    expect(el.dataset.state).toBe('loading');
    r.unmount();
    await p;
    expect(caf).toHaveBeenCalledWith(7);
    await vi.advanceTimersByTimeAsync(500);
    expect(el.querySelector('svg')).toBeNull();
    expect(el.dataset.state).toBeUndefined();
  });

  it('cancels a pending idle gap on unmount', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
    document.body.innerHTML = slot(201) + slot(202);
    const rs = Object.getOwnPropertyDescriptor(document, 'readyState');
    const cic = Object.getOwnPropertyDescriptor(window, 'cancelIdleCallback');
    try {
      Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
      const cancelIdle = vi.fn();
      let next = 100;
      let first = true;
      const idle = vi.fn((cb: () => void) => {
        if (first) {
          first = false;
          cb();
          return 1;
        }
        return next++;
      });
      Object.defineProperty(window, 'requestIdleCallback', { value: idle, configurable: true });
      Object.defineProperty(window, 'cancelIdleCallback', { value: cancelIdle, configurable: true });
      const { LazyDiagrams: C } = await load();
      const f = stubFetch({ ok: true, status: 200, body: SVG });
      const r = render(createElement(C));
      await vi.advanceTimersByTimeAsync(200);
      // prefill loaded both slots and is parked in idleGap, whose requestIdleCallback returned 100
      expect(f).toHaveBeenCalledTimes(2);
      expect(idle).toHaveBeenCalledTimes(2);
      expect(idle.mock.results[1].value).toBe(100);
      r.unmount();
      expect(cancelIdle).toHaveBeenCalledWith(100);
      await vi.advanceTimersByTimeAsync(500);
      expect(f).toHaveBeenCalledTimes(2);
    } finally {
      if (rs) Object.defineProperty(document, 'readyState', rs);
      else delete (document as { readyState?: unknown }).readyState;
      if (cic) Object.defineProperty(window, 'cancelIdleCallback', cic);
      else delete (window as { cancelIdleCallback?: unknown }).cancelIdleCallback;
    }
  });

  it('uses an AbortController + 15s timer when AbortSignal.timeout is unavailable', async () => {
    vi.useFakeTimers();
    const orig = AbortSignal.timeout;
    // @ts-expect-error simulate an older engine
    delete AbortSignal.timeout;
    try {
      const { loadDiagram } = await load();
      let signal: AbortSignal | undefined;
      vi.stubGlobal('fetch', vi.fn((_u: string, init: RequestInit) => {
        signal = init.signal ?? undefined;
        return new Promise((_res, rej) => signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))));
      }));
      const el = el0();
      const p = loadDiagram(el);
      await vi.advanceTimersByTimeAsync(14999);
      expect(signal).toBeDefined();
      expect(signal!.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(2);
      await p;
      expect(signal!.aborted).toBe(true);
      expect(el.dataset.state).toBe('error');
    } finally {
      AbortSignal.timeout = orig;
    }
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

  it('marks empty-src slots as error and finishes', async () => {
    vi.useFakeTimers();
    const { LazyDiagrams: C } = await load();
    many();
    const empty = document.querySelector<HTMLElement>('.diagram-scroll')!;
    empty.setAttribute('data-diagram-src', '');
    stubFetch({ ok: true, status: 200, body: SVG });
    render(createElement(C));
    await vi.advanceTimersByTimeAsync(2100);
    await vi.advanceTimersByTimeAsync(500);
    expect(empty.dataset.state).toBe('error');
    for (const a of ['role', 'aria-label', 'style', 'aria-busy']) expect(empty.hasAttribute(a)).toBe(false);
    expect(document.querySelectorAll('.diagram-scroll[data-state="loaded"]')).toHaveLength(8);
  });

  it('prefill fetches with priority low and a signal', async () => {
    vi.useFakeTimers();
    const { LazyDiagrams: C } = await load();
    many();
    const fetchFn = stubFetch({ ok: true, status: 200, body: SVG });
    render(createElement(C));
    await vi.advanceTimersByTimeAsync(2100);
    const init = (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.priority).toBe('low');
    expect(init.signal).toBeDefined();
  });

  it('a direct load has no priority', async () => {
    const { loadDiagram } = await load();
    const fetchFn = stubFetch({ ok: true, status: 200, body: SVG });
    document.body.innerHTML = slot(999);
    await loadDiagram(document.querySelector<HTMLElement>('.diagram-scroll')!);
    const init = (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.priority).toBeUndefined();
  });

  it('continues past a timed-out slot and loads the rest', async () => {
    vi.useFakeTimers();
    const { LazyDiagrams: C } = await load();
    many();
    const fn = vi.fn(async (src: string) => {
      if (src.endsWith('/f101.svg')) throw new DOMException('timed out', 'TimeoutError');
      return { ok: true, status: 200, text: async () => SVG };
    });
    vi.stubGlobal('fetch', fn);
    render(createElement(C));
    await vi.advanceTimersByTimeAsync(2100);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fn).toHaveBeenCalledTimes(9);
    expect(document.querySelectorAll('.diagram-scroll[data-state="loaded"]')).toHaveLength(8);
    expect(document.querySelectorAll('.diagram-scroll[data-state="error"]')).toHaveLength(1);
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
