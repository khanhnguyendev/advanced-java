'use client';

import { useEffect } from 'react';

const SKIP = '[rel~=nofollow], [data-no-prefetch], .lang-switcher a, a[download], a[target=_blank]';
const NON_PAGE = /^\/(_content|diagram-svg|pagefind)\//;

interface Conn {
  saveData?: boolean;
  effectiveType?: string;
}

/**
 * Fallback for browsers without Speculation Rules: same-origin links get one `<link rel=prefetch>` on
 * intent (pointerenter / pointerdown), and the doc's prev/next links on idle. Returns a cleanup.
 */
export function installPrefetch(doc: Document = document): () => void {
  const win = doc.defaultView;
  if (!win) return () => {};
  if (typeof win.HTMLScriptElement?.supports === 'function' && win.HTMLScriptElement.supports('speculationrules')) return () => {};
  const seen = new Set<string>();
  const add = (href: string) => {
    const c = (win.navigator as Navigator & { connection?: Conn }).connection;
    if (c && (c.saveData || (c.effectiveType ?? '').includes('2g'))) return;
    let u: URL;
    try {
      u = new URL(href, doc.baseURI);
    } catch {
      return;
    }
    if (u.origin !== win.location.origin || !/^https?:$/.test(u.protocol)) return;
    if (/\/review(\/|$)/.test(u.pathname) || NON_PAGE.test(u.pathname)) return;
    u.hash = '';
    const here = new URL(win.location.href);
    here.hash = '';
    if (u.href === here.href || seen.has(u.href)) return;
    seen.add(u.href);
    const link = doc.createElement('link');
    link.rel = 'prefetch';
    link.href = u.href;
    doc.head.appendChild(link);
  };
  const onIntent = (e: Event) => {
    const t = e.target;
    const a = t instanceof win.Element ? t.closest('a[href]') : null;
    if (a && !a.matches(SKIP)) add((a as HTMLAnchorElement).href);
  };
  const opts = { capture: true, passive: true } as const;
  const types = ['pointerenter', 'pointerdown'];
  for (const t of types) doc.addEventListener(t, onIntent, opts);
  const idle = () =>
    doc.querySelectorAll<HTMLAnchorElement>('a[rel~=next][href], a[rel~=prev][href]').forEach((a) => add(a.href));
  const w = win as unknown as { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
  const ric = w.requestIdleCallback;
  const timer = ric ? ric.call(w, idle) : win.setTimeout(idle, 1500);
  return () => {
    for (const t of types) doc.removeEventListener(t, onIntent, opts);
    if (ric) w.cancelIdleCallback?.call(w, timer);
    else win.clearTimeout(timer);
  };
}

export function PrefetchLinks() {
  useEffect(() => installPrefetch(document), []);
  return null;
}
