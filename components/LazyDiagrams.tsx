'use client';

import { useEffect } from 'react';
import { resolveHashInDocument } from '@/lib/anchor';

const SLOT = '.diagram-scroll[data-diagram-src]';
const PENDING = `${SLOT}:not([data-state])`;
const FETCH_TIMEOUT_MS = 15000;
const files = new Map<string, Promise<string>>();

function fetchSvg(src: string, low: boolean): Promise<string> {
  let p = files.get(src);
  if (!p) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let signal: AbortSignal | undefined;
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
    else if (typeof AbortController === 'function') {
      // AbortSignal.timeout is missing (older Safari/webviews): same 15s budget by hand
      const ctl = new AbortController();
      timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
      signal = ctl.signal;
    }
    const init = { ...(signal ? { signal } : {}), ...(low ? { priority: 'low' } : {}) } as RequestInit;
    p = fetch(src, init)
      .then((r) => {
        if (!r.ok) throw new Error(`diagram ${src}: ${r.status}`);
        return r.text();
      })
      .finally(() => {
        if (timer !== undefined) clearTimeout(timer);
      });
    p.catch(() => files.delete(src));
    files.set(src, p);
  }
  return p;
}

/** True between beforeprint (or print media matching) and afterprint: injections run at once. */
let printing = false;
const waiting = new Set<() => void>();
/** Cancels for frame callbacks and idle gaps still pending; run on unmount. */
const cancellers = new Set<() => void>();

/** Drops every pending frame callback and idle gap (their awaiting loads resume without injecting). */
function cancelPending(): void {
  for (const c of Array.from(cancellers)) c();
}

/** Runs every injection still waiting for a frame (print must not wait on rAF). */
function flushFrames(): void {
  for (const run of Array.from(waiting)) run();
}

/** Runs fn on the next frame, but never hangs: hidden tabs and missing rAF run it now, else a 100ms timer backs it up. */
function nextFrame(fn: () => void, onCancel: () => void = () => {}): void {
  if (printing || typeof requestAnimationFrame !== 'function' || document.visibilityState === 'hidden') {
    fn();
    return;
  }
  let done = false;
  let raf: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settle = () => {
    done = true;
    waiting.delete(run);
    cancellers.delete(cancel);
    if (timer !== undefined) clearTimeout(timer);
    if (raf !== undefined && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
  };
  function run() {
    if (done) return;
    settle();
    fn();
  }
  function cancel() {
    if (done) return;
    settle();
    onCancel();
  }
  waiting.add(run);
  cancellers.add(cancel);
  raf = requestAnimationFrame(run);
  timer = setTimeout(run, 100);
}

const CLEANUP = ['aria-busy', 'role', 'aria-label', 'style'];

/** Fills one placeholder with the inline SVG (so CSS variables and dark mode apply); on failure falls back to an <img>. */
export async function loadDiagram(el: HTMLElement, low = false, immediate = false): Promise<void> {
  const src = el.dataset.diagramSrc;
  if (el.dataset.state) return;
  if (!src) {
    for (const a of CLEANUP) el.removeAttribute(a);
    el.dataset.state = 'error';
    return;
  }
  el.dataset.state = 'loading';
  el.setAttribute('aria-busy', 'true');
  const label = el.getAttribute('aria-label') ?? '';
  try {
    const text = await fetchSvg(src, low);
    if (!text.trimStart().startsWith('<svg')) throw new Error('not an svg');
    // inject inside a frame callback so it never lands mid-frame during scroll
    const inject = () => {
      el.innerHTML = text;
      el.dataset.state = 'loaded';
    };
    if (immediate) inject();
    else {
      const injected = await new Promise<boolean>((resolve, reject) =>
        nextFrame(
          () => {
            // a throw here must reject (-> <img> fallback), not leave the awaiting batch pending forever
            try {
              inject();
              resolve(true);
            } catch (e) {
              reject(e);
            }
          },
          () => resolve(false),
        ),
      );
      if (!injected) {
        // cancelled by unmount: leave the slot pending for a remount
        delete el.dataset.state;
        el.removeAttribute('aria-busy');
        return;
      }
    }
  } catch {
    const img = document.createElement('img');
    img.src = src;
    img.alt = label;
    // the slot's inline style carries `aspect-ratio: W / H` (scene size); the svg floors at 0.7w
    const w = /aspect-ratio:\s*(\d+(?:\.\d+)?)\s*\//.exec(el.getAttribute('style') ?? '')?.[1];
    if (w) img.style.minWidth = `${Math.round(0.7 * Number(w))}px`;
    el.replaceChildren(img);
    el.dataset.state = 'error';
  }
  for (const a of CLEANUP) el.removeAttribute(a);
  window.dispatchEvent(new Event('diagrams:loaded'));
}

const BATCH = 4;

interface Conn {
  saveData?: boolean;
  effectiveType?: string;
}

function idleGap(): Promise<void> {
  return new Promise((resolve) => {
    let id: number | ReturnType<typeof setTimeout>;
    const done = () => {
      cancellers.delete(cancel);
      resolve();
    };
    const useIdle = typeof window.requestIdleCallback === 'function';
    const cancel = () => {
      if (useIdle && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(id as number);
      else clearTimeout(id as ReturnType<typeof setTimeout>);
      done();
    };
    cancellers.add(cancel);
    id = useIdle ? window.requestIdleCallback(done, { timeout: 1000 }) : setTimeout(done, 50);
  });
}

/** Loads every slot not yet loaded, a few at a time, so print and find-in-page see all diagrams. */
async function prefill(cancelled: () => boolean): Promise<void> {
  for (;;) {
    const batch = Array.from(document.querySelectorAll<HTMLElement>(PENDING)).slice(0, BATCH);
    if (batch.length === 0 || cancelled()) return;
    await Promise.all(batch.map((el) => loadDiagram(el, true)));
    await idleGap();
  }
}

/**
 * Diagram SVGs are static files; each `.diagram-scroll[data-diagram-src]` slot is filled when its figure
 * nears the viewport, on print, and when a heading jump lands right before it. ScrollRegions re-labels
 * after every fill (`diagrams:loaded`).
 */
export function LazyDiagrams() {
  useEffect(() => {
    const pending = () => Array.from(document.querySelectorAll<HTMLElement>(PENDING));
    const all = (immediate = false) => pending().forEach((el) => void loadDiagram(el, false, immediate));
    if (typeof IntersectionObserver === 'undefined') {
      all();
      return;
    }
    let stopped = false;
    const byFigure = new Map<Element, HTMLElement>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const host = e.target;
          const el = byFigure.get(host);
          io.unobserve(host);
          byFigure.delete(host);
          if (!el) continue;
          void loadDiagram(el);
        }
      },
      { rootMargin: '2000px 0px' },
    );
    // observe the figure (the slot's parent), not the slot itself
    for (const el of pending()) {
      const host = el.closest('figure') ?? el;
      byFigure.set(host, el);
      io.observe(host);
    }
    const toHash = () => {
      const hash = window.location.hash;
      if (!hash) return;
      let target: Element | null = resolveHashInDocument(document, hash);
      if (!target) {
        try {
          target = document.getElementById(decodeURIComponent(hash.slice(1)));
        } catch {
          target = null;
        }
      }
      if (!target) return;
      const own = target.closest(SLOT);
      if (own instanceof HTMLElement) void loadDiagram(own);
      let n = 0;
      for (const el of pending()) {
        if (target.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING && n++ < 2) void loadDiagram(el);
      }
    };
    toHash();
    window.addEventListener('hashchange', toHash);
    const onBeforePrint = () => {
      printing = true;
      flushFrames();
      all(true);
    };
    const onAfterPrint = () => {
      printing = false;
    };
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    const mq = window.matchMedia?.('print');
    const onPrint = (e: MediaQueryListEvent) => {
      printing = e.matches;
      if (e.matches) {
        flushFrames();
        all(true);
      }
    };
    mq?.addEventListener?.('change', onPrint);

    // background prefill once the page is settled; never on data-saver or 2g connections
    let idleId: number | undefined;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    const conn = (navigator as Navigator & { connection?: Conn }).connection;
    const frugal = !!conn && (conn.saveData === true || /2g/.test(conn.effectiveType ?? ''));
    const schedule = () => {
      if (stopped) return;
      const run = () => void prefill(() => stopped);
      if (typeof window.requestIdleCallback === 'function') idleId = window.requestIdleCallback(run, { timeout: 5000 });
      else timerId = setTimeout(run, 2000);
    };
    const onLoad = () => schedule();
    if (!frugal) {
      if (document.readyState === 'complete') schedule();
      else window.addEventListener('load', onLoad, { once: true });
    }
    return () => {
      stopped = true;
      printing = false;
      cancelPending();
      window.removeEventListener('load', onLoad);
      window.removeEventListener('afterprint', onAfterPrint);
      if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      if (timerId !== undefined) clearTimeout(timerId);
      io.disconnect();
      window.removeEventListener('hashchange', toHash);
      window.removeEventListener('beforeprint', onBeforePrint);
      mq?.removeEventListener?.('change', onPrint);
    };
  }, []);
  return null;
}
