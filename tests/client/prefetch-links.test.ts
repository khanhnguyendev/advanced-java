// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installPrefetch } from '@/components/PrefetchLinks';

const links = () => Array.from(document.head.querySelectorAll('link[rel=prefetch]')).map((l) => (l as HTMLLinkElement).href);

function fire(el: Element, type: string) {
  el.dispatchEvent(new Event(type, { bubbles: type !== 'pointerenter' }));
}

let stop: () => void = () => {};
beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = `
    <a id="a" href="/en/advanced-java/x">x</a>
    <a id="b" href="https://example.com/y">cross</a>
    <a id="c" href="/en/review/diagrams">review</a>
    <a id="d" rel="nofollow" href="/en/z">nofollow</a>
    <div class="lang-switcher"><a id="e" href="/vi/x">vi</a></div>
    <a id="f" download href="/en/file.pdf">dl</a>
    <a id="t" target="_blank" href="/en/blank">blank</a>
    <a id="g" href="/_content/c/a/b.png">asset</a>
    <a id="h" href="/diagram-svg/abc.svg">svg</a>
    <a id="i" href="/pagefind/pagefind.js">pf</a>
    <a id="n" rel="next" href="/en/next">next</a>
    <a id="p" rel="prev" href="/en/prev">prev</a>`;
});
afterEach(() => {
  stop();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'connection', { value: undefined, configurable: true });
});

describe('installPrefetch fallback', () => {
  it('adds one prefetch link per same-origin URL and dedupes', () => {
    stop = installPrefetch(document);
    const a = document.getElementById('a')!;
    fire(a, 'pointerenter');
    fire(a, 'pointerdown');
    expect(links()).toEqual([`${location.origin}/en/advanced-java/x`]);
  });

  it('skips cross-origin, review, nofollow and language-switcher links', () => {
    stop = installPrefetch(document);
    for (const id of ['b', 'c', 'd', 'e']) fire(document.getElementById(id)!, 'pointerenter');
    expect(links()).toEqual([]);
  });

  it('skips downloads, new-tab links and non-page prefixes; ignores focusin and touchstart', () => {
    stop = installPrefetch(document);
    for (const id of ['f', 't', 'g', 'h', 'i']) fire(document.getElementById(id)!, 'pointerenter');
    fire(document.getElementById('a')!, 'focusin');
    fire(document.getElementById('a')!, 'touchstart');
    expect(links()).toEqual([]);
  });

  it('cancels the idle callback on cleanup', () => {
    const cancel = vi.fn();
    vi.stubGlobal('requestIdleCallback', () => 7);
    vi.stubGlobal('cancelIdleCallback', cancel);
    Object.assign(window, { requestIdleCallback: () => 7, cancelIdleCallback: cancel });
    installPrefetch(document)();
    expect(cancel).toHaveBeenCalledWith(7);
    delete (window as { requestIdleCallback?: unknown }).requestIdleCallback;
    delete (window as { cancelIdleCallback?: unknown }).cancelIdleCallback;
  });

  it('skips when saveData or a 2g connection is reported', () => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
    stop = installPrefetch(document);
    fire(document.getElementById('a')!, 'pointerenter');
    expect(links()).toEqual([]);
    Object.defineProperty(navigator, 'connection', { value: { effectiveType: 'slow-2g' }, configurable: true });
    fire(document.getElementById('a')!, 'pointerenter');
    expect(links()).toEqual([]);
  });

  it('does nothing when speculation rules are supported', () => {
    const supports = vi.fn(() => true);
    vi.stubGlobal('HTMLScriptElement', Object.assign(function () {}, { supports }));
    Object.defineProperty(window, 'HTMLScriptElement', { value: (globalThis as { HTMLScriptElement: unknown }).HTMLScriptElement, configurable: true });
    stop = installPrefetch(document);
    fire(document.getElementById('a')!, 'pointerenter');
    expect(links()).toEqual([]);
  });

  it('prefetches prev/next on idle', async () => {
    vi.useFakeTimers();
    stop = installPrefetch(document);
    vi.advanceTimersByTime(2000);
    vi.useRealTimers();
    expect(links().sort()).toEqual([`${location.origin}/en/next`, `${location.origin}/en/prev`]);
  });
});
