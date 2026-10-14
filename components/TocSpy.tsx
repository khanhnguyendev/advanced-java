'use client';

import { useEffect } from 'react';

const SELECTORS = ['.toc', '.margin-steps'];

function targetId(a: HTMLAnchorElement): string {
  const raw = (a.getAttribute('href') ?? '').slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Marks the TOC link and the margin step for the heading being read with aria-current="location". */
export function TocSpy() {
  useEffect(() => {
    const prose = document.querySelector('.prose');
    if (!prose) return;
    if (!prose.querySelector('h2[id], h3[id], h4[id]')) return;

    // link -> target element, built once; links without a target in the prose are skipped
    const lists = SELECTORS.map((sel) =>
      Array.from(document.querySelectorAll<HTMLAnchorElement>(`${sel} a[href^="#"]`)).flatMap((a) => {
        const el = document.getElementById(targetId(a));
        return el ? [{ a, el }] : [];
      }),
    );
    const topbar = () => {
      const slot = document.querySelector('.topbar-slot');
      return slot ? slot.getBoundingClientRect().height : 56;
    };
    let frame = 0;

    const apply = () => {
      frame = 0;
      const line = topbar() + 24;
      for (const list of lists) {
        let active = list[0]?.el;
        for (const { el } of list) if (el.getBoundingClientRect().top <= line) active = el;
        for (const { a, el } of list) {
          if (el === active) {
            if (a.getAttribute('aria-current') !== 'location') a.setAttribute('aria-current', 'location');
          } else if (a.hasAttribute('aria-current')) {
            a.removeAttribute('aria-current');
          }
        }
      }
      // keep the active item visible inside the sticky right rail
      const rail = document.querySelector<HTMLElement>('.shell > .toc-rail');
      const current = rail?.querySelector<HTMLElement>('[aria-current="location"]');
      if (rail && current) {
        const ar = current.getBoundingClientRect();
        const rr = rail.getBoundingClientRect();
        if (rr.height > 0 && (ar.top < rr.top || ar.bottom > rr.bottom)) {
          rail.scrollTop += ar.top < rr.top ? ar.top - rr.top : ar.bottom - rr.bottom;
        }
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('hashchange', schedule);
    window.addEventListener('resize', schedule);
    apply();
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('hashchange', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
