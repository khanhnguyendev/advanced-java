'use client';

import { useEffect } from 'react';
import { resolveHashInDocument } from '@/lib/anchor';

const SLOT = '.diagram-scroll[data-diagram-src]';
const PENDING = `${SLOT}:not([data-state])`;
const files = new Map<string, Promise<string>>();

function fetchSvg(src: string): Promise<string> {
  let p = files.get(src);
  if (!p) {
    p = fetch(src).then((r) => {
      if (!r.ok) throw new Error(`diagram ${src}: ${r.status}`);
      return r.text();
    });
    p.catch(() => files.delete(src));
    files.set(src, p);
  }
  return p;
}

/** Fills one placeholder with the inline SVG (so CSS variables and dark mode apply); on failure falls back to an <img>. */
export async function loadDiagram(el: HTMLElement): Promise<void> {
  const src = el.dataset.diagramSrc;
  if (!src || el.dataset.state) return;
  el.dataset.state = 'loading';
  el.setAttribute('aria-busy', 'true');
  const name = el.getAttribute('aria-label') ?? '';
  try {
    const text = await fetchSvg(src);
    if (!text.trimStart().startsWith('<svg')) throw new Error('not an svg');
    el.innerHTML = text;
    el.dataset.state = 'loaded';
  } catch {
    const img = document.createElement('img');
    img.src = src;
    img.alt = name;
    // the slot's inline style carries `aspect-ratio: W / H` (scene size); the svg floors at 0.7w
    const w = /aspect-ratio:\s*(\d+(?:\.\d+)?)\s*\//.exec(el.getAttribute('style') ?? '')?.[1];
    if (w) img.style.minWidth = `${Math.round(0.7 * Number(w))}px`;
    el.replaceChildren(img);
    el.dataset.state = 'error';
  }
  for (const a of ['aria-busy', 'role', 'aria-label', 'style']) el.removeAttribute(a);
  window.dispatchEvent(new Event('diagrams:loaded'));
}

const BATCH = 4;

interface Conn {
  saveData?: boolean;
  effectiveType?: string;
}

/** Loads every slot not yet loaded, a few at a time, so print and find-in-page see all diagrams. */
async function prefill(cancelled: () => boolean): Promise<void> {
  for (;;) {
    const batch = Array.from(document.querySelectorAll<HTMLElement>(PENDING)).slice(0, BATCH);
    if (batch.length === 0 || cancelled()) return;
    await Promise.all(batch.map((el) => loadDiagram(el)));
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
    const all = () => pending().forEach((el) => void loadDiagram(el));
    if (typeof IntersectionObserver === 'undefined') {
      all();
      return;
    }
    const byFigure = new Map<Element, HTMLElement>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = byFigure.get(e.target);
          io.unobserve(e.target);
          byFigure.delete(e.target);
          if (el) void loadDiagram(el);
        }
      },
      { rootMargin: '1200px 0px' },
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
    window.addEventListener('beforeprint', all);
    const mq = window.matchMedia?.('print');
    const onPrint = (e: MediaQueryListEvent) => {
      if (e.matches) all();
    };
    mq?.addEventListener?.('change', onPrint);

    // background prefill once the page is settled; never on data-saver or 2g connections
    let stopped = false;
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
      window.removeEventListener('load', onLoad);
      if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      if (timerId !== undefined) clearTimeout(timerId);
      io.disconnect();
      window.removeEventListener('hashchange', toHash);
      window.removeEventListener('beforeprint', all);
      mq?.removeEventListener?.('change', onPrint);
    };
  }, []);
  return null;
}
