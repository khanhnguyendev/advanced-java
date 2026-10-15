// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { createElement } from 'react';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => (k === 'scrollCode' ? 'Code' : 'Diagram'),
}));

let queue: FrameRequestCallback[] = [];
const flush = () => {
  const q = queue;
  queue = [];
  q.forEach((cb) => cb(0));
};

function stubWidths(el: Element, scrollWidth: number, clientWidth: number) {
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true });
}

beforeEach(() => {
  queue = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => queue.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  document.body.innerHTML =
    '<div class="prose"><pre id="c1"></pre><div class="diagram-scroll" id="d1"></div><pre id="c2"></pre><div class="diagram-scroll" id="d2"></div></div>';
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ScrollRegions batching', () => {
  it('N diagrams:loaded events in one tick produce exactly one pass with correct labels', async () => {
    const { ScrollRegions } = await import('@/components/ScrollRegions');
    stubWidths(document.getElementById('c1')!, 100, 100);
    stubWidths(document.getElementById('c2')!, 300, 100);
    stubWidths(document.getElementById('d1')!, 100, 100);
    stubWidths(document.getElementById('d2')!, 300, 100);
    const prose = document.querySelector('.prose')!;
    render(createElement(ScrollRegions));
    const spy = vi.spyOn(prose, 'querySelectorAll');
    for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('diagrams:loaded'));
    expect(queue).toHaveLength(1);
    expect(spy).not.toHaveBeenCalled();
    flush();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(document.getElementById('c1')!.hasAttribute('role')).toBe(false);
    expect(document.getElementById('d1')!.hasAttribute('role')).toBe(false);
    expect(document.getElementById('c2')!.getAttribute('aria-label')).toBe('Code 2');
    expect(document.getElementById('c2')!.getAttribute('tabindex')).toBe('0');
    expect(document.getElementById('d2')!.getAttribute('aria-label')).toBe('Diagram 2');
    // after the pass a new event schedules again
    window.dispatchEvent(new Event('diagrams:loaded'));
    expect(queue).toHaveLength(1);
  });

  it('removes the region role when a block stops overflowing', async () => {
    const { ScrollRegions } = await import('@/components/ScrollRegions');
    const d2 = document.getElementById('d2')!;
    stubWidths(d2, 300, 100);
    render(createElement(ScrollRegions));
    expect(d2.getAttribute('role')).toBe('region');
    stubWidths(d2, 100, 100);
    window.dispatchEvent(new Event('diagrams:loaded'));
    flush();
    expect(d2.hasAttribute('role')).toBe(false);
    expect(d2.hasAttribute('tabindex')).toBe(false);
  });

  it('cancels the queued frame on unmount', async () => {
    const { ScrollRegions } = await import('@/components/ScrollRegions');
    const r = render(createElement(ScrollRegions));
    window.dispatchEvent(new Event('diagrams:loaded'));
    expect(queue).toHaveLength(1);
    r.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(queue.length);
  });
});
